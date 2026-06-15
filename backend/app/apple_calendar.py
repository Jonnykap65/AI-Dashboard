import json
import logging
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any

import caldav
from fastapi import HTTPException
from icalendar import Calendar
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .calendar_reminders import auto_complete_past_calendar_reminders, delete_synced_calendar_reminders, upsert_calendar_reminder
from .database import BASE_DIR
from .models import CalendarItem


CONFIG_DIR = BASE_DIR / "config"
CONFIG_FILE = CONFIG_DIR / "apple-calendar.json"
DEFAULT_CALDAV_URL = "https://caldav.icloud.com"
logger = logging.getLogger("ai_home_dashboard")


def apple_calendar_status() -> dict[str, Any]:
    config = load_config(required=False)
    return {
        "configured": CONFIG_FILE.exists() and bool(config.get("apple_id")) and bool(config.get("app_specific_password")),
        "connected": False,
        "config_path": str(CONFIG_FILE),
        "url": config.get("url", DEFAULT_CALDAV_URL),
        "calendar_name": config.get("calendar_name"),
    }


def apple_calendar_config() -> dict[str, Any]:
    config = load_config(required=False)
    return {
        "apple_id": config.get("apple_id", ""),
        "app_specific_password_saved": bool(config.get("app_specific_password")),
        "url": config.get("url", DEFAULT_CALDAV_URL),
        "calendar_name": config.get("calendar_name", ""),
        "config_path": str(CONFIG_FILE),
    }


def save_apple_calendar_config(payload: Any) -> dict[str, Any]:
    CONFIG_DIR.mkdir(exist_ok=True)
    existing = load_config(required=False)
    password = payload.app_specific_password or existing.get("app_specific_password")
    password = "".join(str(password).split()) if password else ""
    if not password:
        raise HTTPException(status_code=400, detail="App-specific password is required the first time you save Apple Calendar settings")
    config = {
        "apple_id": payload.apple_id.strip(),
        "app_specific_password": password,
        "url": (payload.url or DEFAULT_CALDAV_URL).strip(),
        "calendar_name": (payload.calendar_name or "").strip(),
    }
    CONFIG_FILE.write_text(json.dumps(config, indent=2), encoding="utf-8")
    return apple_calendar_config()


def load_config(required: bool = True) -> dict[str, Any]:
    if not CONFIG_FILE.exists():
        if required:
            raise HTTPException(status_code=400, detail=f"Missing Apple Calendar config file: {CONFIG_FILE}")
        return {}
    try:
        config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Apple Calendar config is not valid JSON: {exc}") from exc
    if required and (not config.get("apple_id") or not config.get("app_specific_password")):
        raise HTTPException(status_code=400, detail="Apple Calendar config must include apple_id and app_specific_password")
    return config


def get_principal():
    config = load_config()
    client = caldav.DAVClient(
        url=config.get("url", DEFAULT_CALDAV_URL),
        username=config["apple_id"],
        password=config["app_specific_password"],
    )
    return client.principal()


def apple_connection_error(exc: Exception) -> HTTPException:
    message = str(exc)
    if "Unauthorized" in message or "AuthorizationError" in message:
        logger.exception("Apple Calendar authentication failed")
        return HTTPException(
            status_code=401,
            detail=(
                "Apple rejected the CalDAV login. Re-enter your full Apple ID email and a fresh Apple app-specific "
                "password. Do not use your normal Apple ID password."
            ),
        )
    logger.exception("Could not connect to Apple Calendar via CalDAV")
    return HTTPException(status_code=409, detail="Could not connect to Apple Calendar via CalDAV")


def list_apple_calendars() -> dict[str, Any]:
    try:
        calendars = get_principal().calendars()
    except HTTPException:
        raise
    except Exception as exc:
        raise apple_connection_error(exc) from exc
    return {"calendars": [{"name": cal.name, "url": str(cal.url)} for cal in calendars]}


def as_date_and_time(value: Any) -> tuple[str, str | None, bool]:
    if isinstance(value, datetime):
        return value.date().isoformat(), value.strftime("%H:%M"), False
    if isinstance(value, date):
        return value.isoformat(), None, True
    return date.today().isoformat(), None, False


def inclusive_ical_end_date(start_date: str, end_date: str, all_day: bool) -> str:
    if not all_day:
        return end_date
    parsed_end = date.fromisoformat(end_date)
    parsed_start = date.fromisoformat(start_date)
    inclusive_end = max(parsed_start, parsed_end - timedelta(days=1))
    return inclusive_end.isoformat()


def clean_ical_value(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def calendar_component_to_payload(component: Any, calendar_name: str) -> dict[str, Any] | None:
    uid = clean_ical_value(component.get("uid"))
    dtstart = component.get("dtstart")
    if not uid or not dtstart:
        return None

    start_value = dtstart.dt
    end_value = component.get("dtend").dt if component.get("dtend") else None
    event_date, start_time, start_all_day = as_date_and_time(start_value)
    raw_end_date, end_time, end_all_day = as_date_and_time(end_value) if end_value else (event_date, None, start_all_day)
    end_date = inclusive_ical_end_date(event_date, raw_end_date, start_all_day and end_all_day)
    external_id = f"{uid}:{event_date}:{start_time or 'all-day'}"
    last_modified = component.get("last-modified")

    return {
        "title": clean_ical_value(component.get("summary")) or "(No title)",
        "date": event_date,
        "end_date": end_date,
        "start_time": start_time,
        "end_time": end_time,
        "location": clean_ical_value(component.get("location")),
        "notes": clean_ical_value(component.get("description")),
        "category": f"Apple Calendar: {calendar_name}",
        "source": "apple",
        "external_id": external_id,
        "source_calendar_id": calendar_name,
        "source_updated_at": clean_ical_value(last_modified.dt.isoformat() if last_modified else component.get("dtstamp")),
    }


def prune_stale_apple_calendar_items(
    db: Session,
    synced_calendars: list[str],
    synced_external_ids: set[str],
    start_date: date,
    end_date: date,
) -> tuple[int, int]:
    if not synced_calendars:
        return 0, 0

    stale_items = db.scalars(
        select(CalendarItem).where(
            CalendarItem.source == "apple",
            CalendarItem.source_calendar_id.in_(synced_calendars),
            CalendarItem.date.between(start_date.isoformat(), end_date.isoformat()),
            CalendarItem.external_id.not_in(synced_external_ids),
        )
    ).all()
    stale_external_ids = {item.external_id for item in stale_items if item.external_id}
    for item in stale_items:
        db.delete(item)
    reminders_deleted = delete_synced_calendar_reminders(db, "apple", stale_external_ids)
    return len(stale_items), reminders_deleted


def sync_apple_calendar(db: Session, calendar_name: str | None, days_back: int, days_forward: int) -> dict[str, Any]:
    config = load_config()
    selected_name = calendar_name or config.get("calendar_name")
    start = datetime.combine(date.today() - timedelta(days=days_back), time.min, tzinfo=timezone.utc)
    end = datetime.combine(date.today() + timedelta(days=days_forward), time.max, tzinfo=timezone.utc)

    try:
        calendars = get_principal().calendars()
    except HTTPException:
        raise
    except Exception as exc:
        raise apple_connection_error(exc) from exc

    if selected_name:
        calendars = [cal for cal in calendars if cal.name.lower() == selected_name.lower()]
        if not calendars:
            raise HTTPException(status_code=404, detail=f"Apple calendar not found: {selected_name}")

    fetched = 0
    created = 0
    updated = 0
    reminders_created = 0
    reminders_updated = 0
    skipped_duplicates = 0
    synced_calendars: list[str] = []
    synced_external_ids: set[str] = set()
    seen_unique_keys: set[tuple[str, str, str | None]] = set()

    for calendar in calendars:
        synced_calendars.append(calendar.name)
        try:
            events = calendar.date_search(start=start, end=end, expand=True)
        except Exception as exc:
            logger.exception("Could not read Apple calendar %s", calendar.name)
            raise HTTPException(status_code=409, detail=f"Could not read Apple calendar '{calendar.name}'") from exc

        for event in events:
            ical = Calendar.from_ical(event.data)
            for component in ical.walk("VEVENT"):
                payload = calendar_component_to_payload(component, calendar.name)
                if not payload:
                    continue
                fetched += 1
                synced_external_ids.add(payload["external_id"])
                unique_key = (payload["title"], payload["date"], payload["start_time"])
                if unique_key in seen_unique_keys:
                    skipped_duplicates += 1
                    continue
                seen_unique_keys.add(unique_key)
                existing = db.scalars(
                    select(CalendarItem).where(
                        or_(
                            (CalendarItem.source == "apple") & (CalendarItem.external_id == payload["external_id"]),
                            (CalendarItem.title == payload["title"])
                            & (CalendarItem.date == payload["date"])
                            & (CalendarItem.start_time == payload["start_time"]),
                        )
                    )
                ).first()
                if existing:
                    for key, value in payload.items():
                        setattr(existing, key, value)
                    updated += 1
                else:
                    db.add(CalendarItem(**payload))
                    created += 1
                reminder_result = upsert_calendar_reminder(db, payload)
                if reminder_result == "created":
                    reminders_created += 1
                elif reminder_result == "updated":
                    reminders_updated += 1

    deleted, reminders_deleted = prune_stale_apple_calendar_items(
        db,
        synced_calendars,
        synced_external_ids,
        start.date(),
        end.date(),
    )

    reminders_auto_completed = auto_complete_past_calendar_reminders(db)
    db.commit()
    return {
        "calendars": synced_calendars,
        "fetched": fetched,
        "created": created,
        "updated": updated,
        "deleted": deleted,
        "reminders_created": reminders_created,
        "reminders_updated": reminders_updated,
        "reminders_deleted": reminders_deleted,
        "reminders_auto_completed": reminders_auto_completed,
        "skipped_duplicates": skipped_duplicates,
        "time_min": start.isoformat(),
        "time_max": end.isoformat(),
    }

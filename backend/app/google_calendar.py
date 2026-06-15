import html
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.orm import Session

from .calendar_reminders import auto_complete_past_calendar_reminders, upsert_calendar_reminder
from .database import DATA_DIR
from .google_oauth_config import LEGACY_CALENDAR_CLIENT_SECRET_FILE, resolve_google_client_secret
from .models import CalendarItem


SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
TOKEN_FILE = DATA_DIR / "google-calendar-token.json"


def google_calendar_status() -> dict[str, Any]:
    client_secret_file = resolve_google_client_secret(LEGACY_CALENDAR_CLIENT_SECRET_FILE)
    return {
        "configured": client_secret_file.exists(),
        "connected": TOKEN_FILE.exists(),
        "client_secret_path": str(client_secret_file),
        "token_path": str(TOKEN_FILE),
        "scope": SCOPES[0],
    }


def get_credentials(interactive: bool = False) -> Credentials:
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds or not creds.valid:
        if not interactive:
            raise HTTPException(status_code=409, detail="Google Calendar is not connected. Add the OAuth client secret file and connect first.")
        client_secret_file = resolve_google_client_secret(LEGACY_CALENDAR_CLIENT_SECRET_FILE)
        if not client_secret_file.exists():
            raise HTTPException(status_code=400, detail=f"Missing Google OAuth client secret file: {client_secret_file}")
        flow = InstalledAppFlow.from_client_secrets_file(str(client_secret_file), SCOPES)
        try:
            creds = flow.run_local_server(host="127.0.0.1", port=0, open_browser=True)
        except OSError as exc:
            raise HTTPException(status_code=409, detail=f"Could not start the local Google OAuth callback server: {exc}") from exc
    TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    return creds


def connect_google_calendar() -> dict[str, Any]:
    get_credentials(interactive=True)
    return google_calendar_status()


def strip_html(value: str | None) -> str | None:
    if not value:
        return None
    text = re.sub(r"<[^>]+>", " ", value)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip() or None


def parse_google_time(value: dict[str, str]) -> tuple[str, str | None, bool]:
    if "date" in value:
        return value["date"], None, True
    raw = value.get("dateTime")
    if not raw:
        return datetime.now().date().isoformat(), None, False
    normalized = raw.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    return parsed.date().isoformat(), parsed.strftime("%H:%M"), False


def inclusive_google_end_date(start_date: str, end_date: str, all_day: bool) -> str:
    if not all_day:
        return end_date
    parsed_end = datetime.fromisoformat(end_date).date()
    parsed_start = datetime.fromisoformat(start_date).date()
    inclusive_end = max(parsed_start, parsed_end - timedelta(days=1))
    return inclusive_end.isoformat()


def sync_google_calendar(db: Session, calendar_id: str, days_back: int, days_forward: int) -> dict[str, Any]:
    creds = get_credentials(interactive=False)
    service = build("calendar", "v3", credentials=creds)
    now = datetime.now(timezone.utc)
    time_min = (now - timedelta(days=days_back)).isoformat()
    time_max = (now + timedelta(days=days_forward)).isoformat()

    events_result = (
        service.events()
        .list(
            calendarId=calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
            maxResults=2500,
        )
        .execute()
    )
    events = events_result.get("items", [])
    created = 0
    updated = 0
    reminders_created = 0
    reminders_updated = 0

    for event in events:
        external_id = event.get("id")
        if not external_id:
            continue
        start_date, start_time, start_all_day = parse_google_time(event.get("start", {}))
        raw_end_date, end_time, end_all_day = parse_google_time(event.get("end", {}))
        end_date = inclusive_google_end_date(start_date, raw_end_date, start_all_day and end_all_day)
        existing = db.scalars(
            select(CalendarItem).where(
                CalendarItem.source == "google",
                CalendarItem.external_id == external_id,
            )
        ).first()
        payload = {
            "title": event.get("summary") or "(No title)",
            "date": start_date,
            "end_date": end_date,
            "start_time": start_time,
            "end_time": end_time,
            "location": event.get("location"),
            "notes": strip_html(event.get("description")),
            "category": "Google Calendar",
            "source": "google",
            "external_id": external_id,
            "source_calendar_id": calendar_id,
            "source_updated_at": event.get("updated"),
        }
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

    reminders_auto_completed = auto_complete_past_calendar_reminders(db)
    db.commit()
    return {
        "calendar_id": calendar_id,
        "fetched": len(events),
        "created": created,
        "updated": updated,
        "reminders_created": reminders_created,
        "reminders_updated": reminders_updated,
        "reminders_auto_completed": reminders_auto_completed,
        "time_min": time_min,
        "time_max": time_max,
    }

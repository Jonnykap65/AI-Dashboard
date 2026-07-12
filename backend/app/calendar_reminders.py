from typing import Any

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import CalendarItem, Reminder


def calendar_payload_to_reminder_payload(payload: dict[str, Any]) -> dict[str, Any]:
    notes = []
    if payload.get("category"):
        notes.append(f"Calendar: {payload['category']}")
    if payload.get("location"):
        notes.append(f"Location: {payload['location']}")
    if payload.get("notes"):
        notes.append(str(payload["notes"]))

    return {
        "title": payload["title"],
        "due_date": payload["date"],
        "due_time": payload.get("start_time"),
        "priority": "medium",
        "notes": "\n\n".join(notes) or None,
        "source": payload["source"],
        "external_id": payload.get("external_id"),
        "source_calendar_id": payload.get("source_calendar_id"),
        "source_updated_at": payload.get("source_updated_at"),
    }


def is_past_calendar_date(due_date: str | None, today: date | None = None) -> bool:
    return bool(due_date and due_date < (today or date.today()).isoformat())


def auto_complete_past_calendar_reminders(db: Session, today: date | None = None, commit: bool = False) -> int:
    cutoff = (today or date.today()).isoformat()
    reminders = db.scalars(
        select(Reminder).where(
            Reminder.source.in_(["google", "apple"]),
            Reminder.status == "open",
            Reminder.due_date.is_not(None),
            Reminder.due_date < cutoff,
        )
    ).all()
    for reminder in reminders:
        reminder.status = "completed"
    if commit and reminders:
        db.commit()
    return len(reminders)


def upsert_calendar_reminder(db: Session, payload: dict[str, Any]) -> str:
    if payload.get("source") not in {"google", "apple"} or not payload.get("external_id"):
        return "skipped"

    reminder_payload = calendar_payload_to_reminder_payload(payload)
    existing = db.scalars(
        select(Reminder).where(
            Reminder.source == reminder_payload["source"],
            Reminder.external_id == reminder_payload["external_id"],
        )
    ).first()

    if existing:
        for key, value in reminder_payload.items():
            setattr(existing, key, value)
        return "updated"

    status = "completed" if is_past_calendar_date(reminder_payload["due_date"]) else "open"
    db.add(Reminder(**reminder_payload, status=status))
    return "created"


def delete_synced_calendar_reminders(db: Session, source: str, external_ids: set[str]) -> int:
    if source not in {"google", "apple"} or not external_ids:
        return 0

    reminders = db.scalars(
        select(Reminder).where(
            Reminder.source == source,
            Reminder.external_id.in_(external_ids),
        )
    ).all()
    for reminder in reminders:
        db.delete(reminder)
    return len(reminders)


def clear_synced_calendar_entries(db: Session) -> dict[str, int]:
    sources = ["google", "apple"]
    items = db.scalars(select(CalendarItem).where(CalendarItem.source.in_(sources))).all()
    reminders = db.scalars(select(Reminder).where(Reminder.source.in_(sources))).all()
    for item in items:
        db.delete(item)
    for reminder in reminders:
        db.delete(reminder)
    db.commit()
    return {"calendar_items_removed": len(items), "reminders_removed": len(reminders)}


def backfill_calendar_reminders(db: Session) -> dict[str, int]:
    created = 0
    updated = 0
    skipped = 0
    items = db.scalars(select(CalendarItem).where(CalendarItem.source.in_(["google", "apple"]))).all()
    for item in items:
        payload = {
            "title": item.title,
            "date": item.date,
            "end_date": item.end_date,
            "start_time": item.start_time,
            "location": item.location,
            "notes": item.notes,
            "category": item.category,
            "source": item.source,
            "external_id": item.external_id,
            "source_calendar_id": item.source_calendar_id,
            "source_updated_at": item.source_updated_at,
        }
        result = upsert_calendar_reminder(db, payload)
        if result == "created":
            created += 1
        elif result == "updated":
            updated += 1
        else:
            skipped += 1
    auto_completed = auto_complete_past_calendar_reminders(db)
    db.commit()
    return {"created": created, "updated": updated, "skipped": skipped, "auto_completed": auto_completed}

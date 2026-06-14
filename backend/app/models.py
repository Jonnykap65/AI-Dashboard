from datetime import datetime

from sqlalchemy import Boolean, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class TimestampMixin:
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[str] = mapped_column(String(32), default=lambda: datetime.now().isoformat(timespec="seconds"))
    updated_at: Mapped[str] = mapped_column(
        String(32),
        default=lambda: datetime.now().isoformat(timespec="seconds"),
        onupdate=lambda: datetime.now().isoformat(timespec="seconds"),
    )


class CalendarItem(TimestampMixin, Base):
    __tablename__ = "calendar_items"

    title: Mapped[str] = mapped_column(String(160), index=True)
    date: Mapped[str] = mapped_column(String(10), index=True)
    start_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    location: Mapped[str | None] = mapped_column(String(220), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    source: Mapped[str] = mapped_column(String(40), default="manual", index=True)
    external_id: Mapped[str | None] = mapped_column(String(240), nullable=True, index=True)
    source_calendar_id: Mapped[str | None] = mapped_column(String(240), nullable=True)
    source_updated_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    inbox_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("title", "date", "start_time", name="uq_calendar_title_date_start"),
        UniqueConstraint("source", "external_id", name="uq_calendar_source_external_id"),
    )


class Reminder(TimestampMixin, Base):
    __tablename__ = "reminders"

    title: Mapped[str] = mapped_column(String(160), index=True)
    due_date: Mapped[str | None] = mapped_column(String(10), index=True, nullable=True)
    due_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    priority: Mapped[str] = mapped_column(String(12), default="medium")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open")
    source: Mapped[str] = mapped_column(String(40), default="manual", index=True)
    external_id: Mapped[str | None] = mapped_column(String(240), nullable=True, index=True)
    source_calendar_id: Mapped[str | None] = mapped_column(String(240), nullable=True)
    source_updated_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    inbox_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (UniqueConstraint("source", "external_id", name="uq_reminder_source_external_id"),)


class Bill(TimestampMixin, Base):
    __tablename__ = "bills"

    name: Mapped[str] = mapped_column(String(160), index=True)
    amount: Mapped[float] = mapped_column(Float, default=0)
    due_date: Mapped[str] = mapped_column(String(10), index=True)
    billing_cycle: Mapped[str] = mapped_column(String(30), default="monthly")
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    autopay: Mapped[bool] = mapped_column(Boolean, default=False)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    source: Mapped[str] = mapped_column(String(40), default="manual", index=True)
    external_id: Mapped[str | None] = mapped_column(String(240), nullable=True, index=True)
    source_updated_at: Mapped[str | None] = mapped_column(String(64), nullable=True)

    __table_args__ = (UniqueConstraint("name", "due_date", name="uq_bill_name_due"),)


class Chore(TimestampMixin, Base):
    __tablename__ = "chores"

    title: Mapped[str] = mapped_column(String(160), index=True)
    room: Mapped[str | None] = mapped_column(String(80), nullable=True)
    recurrence: Mapped[str] = mapped_column(String(20), default="one-time")
    due_date: Mapped[str | None] = mapped_column(String(10), index=True, nullable=True)
    priority: Mapped[str] = mapped_column(String(12), default="medium")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open")


class Note(TimestampMixin, Base):
    __tablename__ = "notes"

    title: Mapped[str] = mapped_column(String(160), index=True)
    body: Mapped[str] = mapped_column(Text, default="")
    note_type: Mapped[str] = mapped_column(String(40), default="note", index=True)
    tags: Mapped[str | None] = mapped_column(String(300), nullable=True)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    inbox_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Asset(TimestampMixin, Base):
    __tablename__ = "assets"

    name: Mapped[str] = mapped_column(String(160), index=True)
    type: Mapped[str] = mapped_column(String(40), default="other", index=True)
    role: Mapped[str | None] = mapped_column(String(160), nullable=True)
    hostname: Mapped[str | None] = mapped_column(String(240), nullable=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    platform: Mapped[str | None] = mapped_column(String(120), nullable=True)
    environment: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), default="unknown", index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class SpeedTestResult(TimestampMixin, Base):
    __tablename__ = "speed_test_results"

    download_mbps: Mapped[float | None] = mapped_column(Float, nullable=True)
    upload_mbps: Mapped[float | None] = mapped_column(Float, nullable=True)
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    jitter_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    test_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    method: Mapped[str] = mapped_column(String(80), default="approximate_http")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    tested_at: Mapped[str] = mapped_column(String(32), default=lambda: datetime.now().isoformat(timespec="seconds"), index=True)


class SecurityRecord(TimestampMixin, Base):
    __tablename__ = "security_records"

    name: Mapped[str] = mapped_column(String(160), index=True)
    type: Mapped[str] = mapped_column(String(60), default="other", index=True)
    provider: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), default="unknown", index=True)
    risk_level: Mapped[str] = mapped_column(String(20), default="medium", index=True)
    last_reviewed: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)
    next_review_date: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)
    expiration_date: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)
    storage_reference: Mapped[str | None] = mapped_column(String(300), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class QuickLink(TimestampMixin, Base):
    __tablename__ = "quick_links"

    name: Mapped[str] = mapped_column(String(120), index=True)
    url: Mapped[str] = mapped_column(String(500))
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    environment: Mapped[str] = mapped_column(String(40), default="personal", index=True)
    tags: Mapped[str | None] = mapped_column(String(300), nullable=True)
    last_opened_at: Mapped[str | None] = mapped_column(String(32), nullable=True)
    open_count: Mapped[int] = mapped_column(Integer, default=0)
    inbox_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (UniqueConstraint("name", "url", name="uq_quick_link_name_url"),)


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(160), index=True)
    category: Mapped[str] = mapped_column(String(40), default="codex", index=True)
    status: Mapped[str] = mapped_column(String(40), default="active")
    priority: Mapped[str] = mapped_column(String(12), default="medium")
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_action: Mapped[str | None] = mapped_column(String(300), nullable=True)
    blocker: Mapped[str | None] = mapped_column(Text, nullable=True)
    local_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    repo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    frontend_command: Mapped[str | None] = mapped_column(String(300), nullable=True)
    backend_command: Mapped[str | None] = mapped_column(String(300), nullable=True)
    last_worked_at: Mapped[str | None] = mapped_column(String(10), index=True, nullable=True)
    due_date: Mapped[str | None] = mapped_column(String(10), index=True, nullable=True)
    codex_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(String(300), nullable=True)
    codex_workspace_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    repository_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_step: Mapped[str | None] = mapped_column(String(300), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    inbox_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (UniqueConstraint("name", "codex_workspace_path", name="uq_project_name_workspace"),)


class ProjectTask(TimestampMixin, Base):
    __tablename__ = "project_tasks"

    title: Mapped[str] = mapped_column(String(160), index=True)
    project_name: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    due_date: Mapped[str | None] = mapped_column(String(10), index=True, nullable=True)
    due_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    priority: Mapped[str] = mapped_column(String(12), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="open")
    codex_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    inbox_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)


class InboxItem(TimestampMixin, Base):
    __tablename__ = "inbox_items"

    raw_text: Mapped[str] = mapped_column(Text)
    suggested_type: Mapped[str] = mapped_column(String(40), default="note", index=True)
    status: Mapped[str] = mapped_column(String(30), default="new", index=True)
    priority: Mapped[str] = mapped_column(String(12), default="medium")
    tags: Mapped[str | None] = mapped_column(String(300), nullable=True)
    processed_at: Mapped[str | None] = mapped_column(String(32), nullable=True)


class DailyPlan(TimestampMixin, Base):
    __tablename__ = "daily_plans"

    date: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    main_focus: Mapped[str | None] = mapped_column(String(300), nullable=True)
    top_action_1: Mapped[str | None] = mapped_column(String(300), nullable=True)
    top_action_2: Mapped[str | None] = mapped_column(String(300), nullable=True)
    top_action_3: Mapped[str | None] = mapped_column(String(300), nullable=True)
    end_of_day_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    tomorrow_first_action: Mapped[str | None] = mapped_column(String(300), nullable=True)
    completed_at: Mapped[str | None] = mapped_column(String(32), nullable=True)


class Settings(TimestampMixin, Base):
    __tablename__ = "settings"

    display_name: Mapped[str] = mapped_column(String(120), default="Home")
    enabled_sections: Mapped[str] = mapped_column(
        Text,
        default="weather,agenda,reminders,bills,chores,projects,notes,links,focus,ai",
    )
    time_format: Mapped[str] = mapped_column(String(8), default="12h")
    theme: Mapped[str] = mapped_column(String(32), default="system")

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


DateString = str
TimeString = str
Priority = Literal["low", "medium", "high"]
InboxType = Literal["reminder", "note", "project task", "calendar item", "link", "idea"]
InboxStatus = Literal["new", "processed", "archived"]
ProjectCategory = Literal[
    "general",
    "codex",
    "software",
    "personal",
    "work",
    "home",
    "learning",
    "maintenance",
    "event",
    "finance",
    "health",
    "creative",
    "other",
]
ProjectStatus = Literal["active", "in_progress", "completed", "archived"]
NoteType = Literal["note", "runbook", "troubleshooting", "script", "codex_prompt", "decision", "reference", "how_to", "other"]
LinkEnvironment = Literal["local", "personal", "work", "public", "other"]
AssetType = Literal["workstation", "laptop", "server", "router", "storage", "cloud_service", "application", "mobile_device", "other"]
AssetStatus = Literal["healthy", "needs_attention", "offline", "retired", "unknown"]
SecurityType = Literal[
    "account",
    "admin_account",
    "service_account",
    "mfa_review",
    "oauth_app",
    "app_password_reference",
    "api_key_reference",
    "certificate",
    "domain",
    "recovery_method",
    "other",
]
SecurityStatus = Literal["healthy", "review_needed", "expiring_soon", "expired", "disabled", "unknown"]
RiskLevel = Literal["low", "medium", "high", "critical"]


def normalize_project_status(value: str | None) -> str | None:
    if value is None:
        return value
    legacy = {
        "planned": "in_progress",
        "blocked": "in_progress",
        "inactive": "in_progress",
        "shipped": "completed",
    }
    return legacy.get(value, value)
DnsRecordType = Literal["A", "AAAA", "CNAME", "MX", "TXT", "NS", "ALL"]


def validate_date(value: str | None) -> str | None:
    if value in (None, ""):
        return None
    parts = value.split("-")
    if len(parts) != 3 or len(parts[0]) != 4 or len(parts[1]) != 2 or len(parts[2]) != 2:
        raise ValueError("Use YYYY-MM-DD date format")
    return value


def validate_time(value: str | None) -> str | None:
    if value in (None, ""):
        return None
    parts = value.split(":")
    if len(parts) != 2:
        raise ValueError("Use HH:MM time format")
    hour, minute = int(parts[0]), int(parts[1])
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError("Time must be between 00:00 and 23:59")
    return value


def validate_url(value: str | None) -> str | None:
    if value in (None, ""):
        return None
    if not value.startswith(("http://", "https://")):
        raise ValueError("URL must start with http:// or https://")
    return value


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CalendarBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    date: DateString
    end_date: DateString | None = None
    start_time: TimeString | None = None
    end_time: TimeString | None = None
    location: str | None = Field(default=None, max_length=220)
    notes: str | None = None
    category: str | None = Field(default=None, max_length=80)
    source: Literal["manual", "google", "apple"] = "manual"
    external_id: str | None = Field(default=None, max_length=240)
    source_calendar_id: str | None = Field(default=None, max_length=240)
    source_updated_at: str | None = Field(default=None, max_length=64)
    inbox_item_id: int | None = None

    _date = field_validator("date")(validate_date)
    _end_date = field_validator("end_date")(validate_date)
    _start = field_validator("start_time")(validate_time)
    _end = field_validator("end_time")(validate_time)


class CalendarCreate(CalendarBase):
    pass


class CalendarUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    date: DateString | None = None
    end_date: DateString | None = None
    start_time: TimeString | None = None
    end_time: TimeString | None = None
    location: str | None = Field(default=None, max_length=220)
    notes: str | None = None
    category: str | None = Field(default=None, max_length=80)
    source: Literal["manual", "google", "apple"] | None = None
    external_id: str | None = Field(default=None, max_length=240)
    source_calendar_id: str | None = Field(default=None, max_length=240)
    source_updated_at: str | None = Field(default=None, max_length=64)
    inbox_item_id: int | None = None

    _date = field_validator("date")(validate_date)
    _end_date = field_validator("end_date")(validate_date)
    _start = field_validator("start_time")(validate_time)
    _end = field_validator("end_time")(validate_time)


class CalendarOut(CalendarBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class ReminderBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    due_date: DateString | None = None
    due_time: TimeString | None = None
    priority: Priority = "medium"
    notes: str | None = None
    status: Literal["open", "completed"] = "open"
    source: Literal["manual", "google", "apple"] = "manual"
    external_id: str | None = Field(default=None, max_length=240)
    source_calendar_id: str | None = Field(default=None, max_length=240)
    source_updated_at: str | None = Field(default=None, max_length=64)
    inbox_item_id: int | None = None

    _date = field_validator("due_date")(validate_date)
    _time = field_validator("due_time")(validate_time)


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    due_date: DateString | None = None
    due_time: TimeString | None = None
    priority: Priority | None = None
    notes: str | None = None
    status: Literal["open", "completed"] | None = None
    source: Literal["manual", "google", "apple"] | None = None
    external_id: str | None = Field(default=None, max_length=240)
    source_calendar_id: str | None = Field(default=None, max_length=240)
    source_updated_at: str | None = Field(default=None, max_length=64)
    inbox_item_id: int | None = None

    _date = field_validator("due_date")(validate_date)
    _time = field_validator("due_time")(validate_time)


class ReminderOut(ReminderBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class BillBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    amount: float = Field(ge=0)
    due_date: DateString
    billing_cycle: Literal["weekly", "monthly", "quarterly", "yearly", "one-time"] = "monthly"
    category: str | None = Field(default=None, max_length=80)
    autopay: bool = False
    url: str | None = None
    notes: str | None = None
    status: Literal["active", "paused", "cancelled", "review"] = "active"
    source: Literal["manual", "gmail"] = "manual"
    external_id: str | None = Field(default=None, max_length=240)
    source_updated_at: str | None = Field(default=None, max_length=64)

    _date = field_validator("due_date")(validate_date)
    _url = field_validator("url")(validate_url)


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    amount: float | None = Field(default=None, ge=0)
    due_date: DateString | None = None
    billing_cycle: Literal["weekly", "monthly", "quarterly", "yearly", "one-time"] | None = None
    category: str | None = Field(default=None, max_length=80)
    autopay: bool | None = None
    url: str | None = None
    notes: str | None = None
    status: Literal["active", "paused", "cancelled", "review"] | None = None
    source: Literal["manual", "gmail"] | None = None
    external_id: str | None = Field(default=None, max_length=240)
    source_updated_at: str | None = Field(default=None, max_length=64)

    _date = field_validator("due_date")(validate_date)
    _url = field_validator("url")(validate_url)


class BillOut(BillBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class ChoreBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    room: str | None = Field(default=None, max_length=80)
    recurrence: Literal["one-time", "daily", "weekly", "monthly"] = "one-time"
    due_date: DateString | None = None
    priority: Priority = "medium"
    notes: str | None = None
    status: Literal["open", "completed"] = "open"

    _date = field_validator("due_date")(validate_date)


class ChoreCreate(ChoreBase):
    pass


class ChoreUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    room: str | None = Field(default=None, max_length=80)
    recurrence: Literal["one-time", "daily", "weekly", "monthly"] | None = None
    due_date: DateString | None = None
    priority: Priority | None = None
    notes: str | None = None
    status: Literal["open", "completed"] | None = None

    _date = field_validator("due_date")(validate_date)


class ChoreOut(ChoreBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class NoteBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    body: str = ""
    note_type: NoteType = "note"
    tags: str | None = Field(default=None, max_length=300)
    pinned: bool = False
    inbox_item_id: int | None = None


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    body: str | None = None
    note_type: NoteType | None = None
    tags: str | None = Field(default=None, max_length=300)
    pinned: bool | None = None
    inbox_item_id: int | None = None


class NoteOut(NoteBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class AssetBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    type: AssetType = "other"
    role: str | None = Field(default=None, max_length=160)
    hostname: str | None = Field(default=None, max_length=240)
    ip_address: str | None = Field(default=None, max_length=80, alias="ipAddress")
    platform: str | None = Field(default=None, max_length=120)
    environment: str | None = Field(default=None, max_length=80)
    status: AssetStatus = "unknown"
    notes: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    type: AssetType | None = None
    role: str | None = Field(default=None, max_length=160)
    hostname: str | None = Field(default=None, max_length=240)
    ip_address: str | None = Field(default=None, max_length=80, alias="ipAddress")
    platform: str | None = Field(default=None, max_length=120)
    environment: str | None = Field(default=None, max_length=80)
    status: AssetStatus | None = None
    notes: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class AssetOut(AssetBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class SpeedTestResultBase(BaseModel):
    download_mbps: float | None = Field(default=None, ge=0)
    upload_mbps: float | None = Field(default=None, ge=0)
    latency_ms: float | None = Field(default=None, ge=0)
    jitter_ms: float | None = Field(default=None, ge=0)
    test_url: str | None = Field(default=None, max_length=500)
    method: str = Field(default="approximate_http", max_length=80)
    notes: str | None = None
    tested_at: str | None = Field(default=None, max_length=32)

    _url = field_validator("test_url")(validate_url)


class SpeedTestResultCreate(SpeedTestResultBase):
    pass


class SpeedTestResultUpdate(BaseModel):
    notes: str | None = None


class SpeedTestResultOut(SpeedTestResultBase, ORMBase):
    id: int
    created_at: str
    updated_at: str
    tested_at: str


class SpeedTestRequest(BaseModel):
    test_url: str | None = Field(default=None, max_length=500)
    upload_test_url: str | None = Field(default=None, max_length=500)

    _url = field_validator("test_url")(validate_url)
    _upload_url = field_validator("upload_test_url")(validate_url)


class PingRequest(BaseModel):
    host: str = Field(min_length=1, max_length=253)


class DnsLookupRequest(BaseModel):
    domain: str = Field(min_length=1, max_length=253)
    record_type: DnsRecordType = "ALL"


class PortCheckRequest(BaseModel):
    host: str = Field(min_length=1, max_length=253)
    port: int = Field(ge=1, le=65535)


class CertificateCheckRequest(BaseModel):
    domain: str = Field(min_length=1, max_length=253)
    port: int = Field(default=443, ge=1, le=65535)


class SecurityRecordBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    type: SecurityType = "other"
    provider: str | None = Field(default=None, max_length=120)
    status: SecurityStatus = "unknown"
    risk_level: RiskLevel = Field(default="medium", alias="riskLevel")
    last_reviewed: DateString | None = Field(default=None, alias="lastReviewed")
    next_review_date: DateString | None = Field(default=None, alias="nextReviewDate")
    expiration_date: DateString | None = Field(default=None, alias="expirationDate")
    storage_reference: str | None = Field(default=None, max_length=300, alias="storageReference")
    notes: str | None = None

    model_config = ConfigDict(populate_by_name=True)

    _last_reviewed = field_validator("last_reviewed")(validate_date)
    _next_review = field_validator("next_review_date")(validate_date)
    _expiration = field_validator("expiration_date")(validate_date)


class SecurityRecordCreate(SecurityRecordBase):
    pass


class SecurityRecordUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    type: SecurityType | None = None
    provider: str | None = Field(default=None, max_length=120)
    status: SecurityStatus | None = None
    risk_level: RiskLevel | None = Field(default=None, alias="riskLevel")
    last_reviewed: DateString | None = Field(default=None, alias="lastReviewed")
    next_review_date: DateString | None = Field(default=None, alias="nextReviewDate")
    expiration_date: DateString | None = Field(default=None, alias="expirationDate")
    storage_reference: str | None = Field(default=None, max_length=300, alias="storageReference")
    notes: str | None = None

    model_config = ConfigDict(populate_by_name=True)

    _last_reviewed = field_validator("last_reviewed")(validate_date)
    _next_review = field_validator("next_review_date")(validate_date)
    _expiration = field_validator("expiration_date")(validate_date)


class SecurityRecordOut(SecurityRecordBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class QuickLinkBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    url: str
    category: str | None = Field(default=None, max_length=80)
    notes: str | None = None
    favorite: bool = False
    environment: LinkEnvironment = "personal"
    tags: str | None = Field(default=None, max_length=300)
    last_opened_at: str | None = Field(default=None, max_length=32)
    open_count: int = Field(default=0, ge=0)
    inbox_item_id: int | None = None

    _url = field_validator("url")(validate_url)


class QuickLinkCreate(QuickLinkBase):
    pass


class QuickLinkUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    url: str | None = None
    category: str | None = Field(default=None, max_length=80)
    notes: str | None = None
    favorite: bool | None = None
    environment: LinkEnvironment | None = None
    tags: str | None = Field(default=None, max_length=300)
    last_opened_at: str | None = Field(default=None, max_length=32)
    open_count: int | None = Field(default=None, ge=0)
    inbox_item_id: int | None = None

    _url = field_validator("url")(validate_url)


class QuickLinkOut(QuickLinkBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category: ProjectCategory = "general"
    status: ProjectStatus = "active"
    priority: Priority = "medium"
    goal: str | None = None
    next_action: str | None = Field(default=None, max_length=300)
    blocker: str | None = None
    local_path: str | None = Field(default=None, max_length=500)
    repo_url: str | None = None
    frontend_command: str | None = Field(default=None, max_length=300)
    backend_command: str | None = Field(default=None, max_length=300)
    last_worked_at: DateString | None = None
    due_date: DateString | None = None
    codex_prompt: str | None = None
    tags: str | None = Field(default=None, max_length=300)
    codex_workspace_path: str | None = Field(default=None, max_length=500)
    repository_url: str | None = None
    description: str | None = None
    next_step: str | None = Field(default=None, max_length=300)
    notes: str | None = None
    inbox_item_id: int | None = None

    _last_worked = field_validator("last_worked_at")(validate_date)
    _date = field_validator("due_date")(validate_date)
    _url = field_validator("repository_url")(validate_url)
    _repo_url = field_validator("repo_url")(validate_url)
    _status = field_validator("status", mode="before")(normalize_project_status)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    category: ProjectCategory | None = None
    status: ProjectStatus | None = None
    priority: Priority | None = None
    goal: str | None = None
    next_action: str | None = Field(default=None, max_length=300)
    blocker: str | None = None
    local_path: str | None = Field(default=None, max_length=500)
    repo_url: str | None = None
    frontend_command: str | None = Field(default=None, max_length=300)
    backend_command: str | None = Field(default=None, max_length=300)
    last_worked_at: DateString | None = None
    due_date: DateString | None = None
    codex_prompt: str | None = None
    tags: str | None = Field(default=None, max_length=300)
    codex_workspace_path: str | None = Field(default=None, max_length=500)
    repository_url: str | None = None
    description: str | None = None
    next_step: str | None = Field(default=None, max_length=300)
    notes: str | None = None
    inbox_item_id: int | None = None

    _last_worked = field_validator("last_worked_at")(validate_date)
    _date = field_validator("due_date")(validate_date)
    _url = field_validator("repository_url")(validate_url)
    _repo_url = field_validator("repo_url")(validate_url)
    _status = field_validator("status", mode="before")(normalize_project_status)


class ProjectOut(ProjectBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class ProjectTaskBase(BaseModel):
    title: str = Field(default="Project task", min_length=1, max_length=160)
    project_name: str | None = Field(default=None, max_length=160)
    due_date: DateString | None = None
    due_time: TimeString | None = None
    priority: Priority = "medium"
    status: Literal["open", "completed"] = "open"
    codex_prompt: str | None = None
    notes: str | None = None
    inbox_item_id: int | None = None

    _date = field_validator("due_date")(validate_date)
    _time = field_validator("due_time")(validate_time)


class ProjectTaskCreate(ProjectTaskBase):
    pass


class ProjectTaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    project_name: str | None = Field(default=None, max_length=160)
    due_date: DateString | None = None
    due_time: TimeString | None = None
    priority: Priority | None = None
    status: Literal["open", "completed"] | None = None
    codex_prompt: str | None = None
    notes: str | None = None
    inbox_item_id: int | None = None

    _date = field_validator("due_date")(validate_date)
    _time = field_validator("due_time")(validate_time)


class ProjectTaskOut(ProjectTaskBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class SettingsBase(BaseModel):
    display_name: str = Field(default="Home", min_length=1, max_length=120)
    enabled_sections: str = "weather,agenda,reminders,bills,chores,projects,notes,links,focus,ai"
    time_format: Literal["12h", "24h"] = "12h"
    theme: Literal[
        "system",
        "light",
        "dark",
        "classic-light",
        "classic-dark",
        "void-light",
        "ocean-light",
        "synthwave-light",
        "forest-light",
        "ember-light",
        "void-dark",
        "ocean-dark",
        "synthwave-dark",
        "forest-dark",
        "ember-dark",
    ] = "system"


class InboxBase(BaseModel):
    raw_text: str = Field(min_length=1, max_length=5000)
    suggested_type: InboxType = "note"
    status: InboxStatus = "new"
    priority: Priority = "medium"
    tags: str | None = Field(default=None, max_length=300)
    processed_at: str | None = Field(default=None, max_length=32)


class InboxCreate(BaseModel):
    raw_text: str = Field(min_length=1, max_length=5000)
    priority: Priority | None = None
    tags: str | None = Field(default=None, max_length=300)


class InboxUpdate(BaseModel):
    raw_text: str | None = Field(default=None, min_length=1, max_length=5000)
    suggested_type: InboxType | None = None
    status: InboxStatus | None = None
    priority: Priority | None = None
    tags: str | None = Field(default=None, max_length=300)
    processed_at: str | None = Field(default=None, max_length=32)


class InboxOut(InboxBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class InboxConvertRequest(BaseModel):
    target_type: Literal["reminder", "note", "project task", "calendar item", "link"]
    project_name: str | None = Field(default=None, max_length=160)
    due_date: DateString | None = None
    date: DateString | None = None
    url: str | None = None

    _due_date = field_validator("due_date")(validate_date)
    _date = field_validator("date")(validate_date)
    _url = field_validator("url")(validate_url)


class DailyPlanBase(BaseModel):
    date: DateString
    main_focus: str | None = Field(default=None, max_length=300)
    top_action_1: str | None = Field(default=None, max_length=300)
    top_action_2: str | None = Field(default=None, max_length=300)
    top_action_3: str | None = Field(default=None, max_length=300)
    end_of_day_note: str | None = None
    tomorrow_first_action: str | None = Field(default=None, max_length=300)
    completed_at: str | None = Field(default=None, max_length=32)

    _date = field_validator("date")(validate_date)


class DailyPlanCreate(DailyPlanBase):
    pass


class DailyPlanUpdate(BaseModel):
    date: DateString | None = None
    main_focus: str | None = Field(default=None, max_length=300)
    top_action_1: str | None = Field(default=None, max_length=300)
    top_action_2: str | None = Field(default=None, max_length=300)
    top_action_3: str | None = Field(default=None, max_length=300)
    end_of_day_note: str | None = None
    tomorrow_first_action: str | None = Field(default=None, max_length=300)
    completed_at: str | None = Field(default=None, max_length=32)

    _date = field_validator("date")(validate_date)


class DailyPlanOut(DailyPlanBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class ProjectNextActionUpdate(BaseModel):
    next_action: str = Field(min_length=1, max_length=300)


class DailyPlanEndRequest(BaseModel):
    main_focus: str | None = Field(default=None, max_length=300)
    top_action_1: str | None = Field(default=None, max_length=300)
    top_action_2: str | None = Field(default=None, max_length=300)
    top_action_3: str | None = Field(default=None, max_length=300)
    end_of_day_note: str | None = None
    tomorrow_first_action: str | None = Field(default=None, max_length=300)


class SearchActionRequest(BaseModel):
    result_type: str = Field(min_length=1, max_length=40)
    result_id: int
    project_id: int | None = None


class SettingsOut(SettingsBase, ORMBase):
    id: int
    created_at: str
    updated_at: str


class ImportPayload(BaseModel):
    calendar_items: list[CalendarCreate] = []
    reminders: list[ReminderCreate] = []
    bills: list[BillCreate] = []
    chores: list[ChoreCreate] = []
    notes: list[NoteCreate] = []
    assets: list[AssetCreate] = []
    speed_test_results: list[SpeedTestResultCreate] = []
    security_records: list[SecurityRecordCreate] = []
    quick_links: list[QuickLinkCreate] = []
    projects: list[ProjectCreate] = []
    project_tasks: list[ProjectTaskCreate] = []
    inbox_items: list[InboxCreate] = []
    daily_plans: list[DailyPlanCreate] = []
    settings: SettingsBase | None = None


class GoogleCalendarSyncRequest(BaseModel):
    calendar_id: str = Field(default="primary", min_length=1, max_length=240)
    days_back: int = Field(default=1, ge=0, le=365)
    days_forward: int = Field(default=30, ge=1, le=730)


class AppleCalendarSyncRequest(BaseModel):
    calendar_name: str | None = Field(default=None, max_length=160)
    days_back: int = Field(default=1, ge=0, le=365)
    days_forward: int = Field(default=30, ge=1, le=730)


class AppleCalendarConfigUpdate(BaseModel):
    apple_id: str = Field(min_length=3, max_length=240)
    app_specific_password: str | None = Field(default=None, max_length=80)
    url: str = Field(default="https://caldav.icloud.com", min_length=8, max_length=500)
    calendar_name: str | None = Field(default=None, max_length=160)


class GmailBillScanRequest(BaseModel):
    query: str = Field(
        default='newer_than:120d (bill OR invoice OR statement OR payment OR "amount due" OR "due date")',
        min_length=1,
        max_length=500,
    )
    max_messages: int = Field(default=25, ge=1, le=100)
    keyword_filter: str | None = Field(default=None, max_length=200)


class GoogleOAuthConfigUpdate(BaseModel):
    client_secret_json: str = Field(min_length=20, max_length=20000)

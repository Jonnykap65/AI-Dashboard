import json
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from .database import BASE_DIR


CONFIG_DIR = BASE_DIR / "config"
SHARED_CLIENT_SECRET_FILE = CONFIG_DIR / "google-client-secret.json"
LEGACY_CALENDAR_CLIENT_SECRET_FILE = CONFIG_DIR / "google-calendar-client-secret.json"
LEGACY_GMAIL_CLIENT_SECRET_FILE = CONFIG_DIR / "gmail-client-secret.json"


def resolve_google_client_secret(preferred_legacy: Path | None = None) -> Path:
    if SHARED_CLIENT_SECRET_FILE.exists():
        return SHARED_CLIENT_SECRET_FILE
    if preferred_legacy and preferred_legacy.exists():
        return preferred_legacy
    return SHARED_CLIENT_SECRET_FILE


def google_oauth_config_status() -> dict[str, Any]:
    active_path = resolve_google_client_secret()
    return {
        "configured": active_path.exists(),
        "shared_path": str(SHARED_CLIENT_SECRET_FILE),
        "active_path": str(active_path),
        "using_shared_file": active_path == SHARED_CLIENT_SECRET_FILE and active_path.exists(),
        "legacy_calendar_exists": LEGACY_CALENDAR_CLIENT_SECRET_FILE.exists(),
        "legacy_gmail_exists": LEGACY_GMAIL_CLIENT_SECRET_FILE.exists(),
    }


def validate_google_client_secret(payload: dict[str, Any]) -> None:
    client = payload.get("installed") or payload.get("web")
    if not isinstance(client, dict):
        raise HTTPException(status_code=400, detail="Google OAuth JSON must contain an installed or web client object")
    missing = [key for key in ["client_id", "client_secret", "auth_uri", "token_uri"] if not client.get(key)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Google OAuth JSON is missing required field(s): {', '.join(missing)}")


def save_google_oauth_config(raw_json: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Google OAuth JSON is not valid JSON: {exc}") from exc
    validate_google_client_secret(payload)
    CONFIG_DIR.mkdir(exist_ok=True)
    SHARED_CLIENT_SECRET_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return google_oauth_config_status()


import base64
import html
import re
from datetime import date, datetime
from email.utils import parseaddr
from typing import Any

from fastapi import HTTPException
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import DATA_DIR
from .google_oauth_config import LEGACY_GMAIL_CLIENT_SECRET_FILE, resolve_google_client_secret
from .models import Bill


SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
TOKEN_FILE = DATA_DIR / "gmail-token.json"

MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}


def gmail_status() -> dict[str, Any]:
    client_secret_file = resolve_google_client_secret(LEGACY_GMAIL_CLIENT_SECRET_FILE)
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
            raise HTTPException(status_code=409, detail="Gmail is not connected. Add the OAuth client secret file and connect first.")
        client_secret_file = resolve_google_client_secret(LEGACY_GMAIL_CLIENT_SECRET_FILE)
        if not client_secret_file.exists():
            raise HTTPException(status_code=400, detail=f"Missing Gmail OAuth client secret file: {client_secret_file}")
        flow = InstalledAppFlow.from_client_secrets_file(str(client_secret_file), SCOPES)
        try:
            creds = flow.run_local_server(host="127.0.0.1", port=0, open_browser=True)
        except OSError as exc:
            raise HTTPException(status_code=409, detail=f"Could not start the local Gmail OAuth callback server: {exc}") from exc
    TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    return creds


def connect_gmail() -> dict[str, Any]:
    get_credentials(interactive=True)
    return gmail_status()


def header_value(message: dict[str, Any], name: str) -> str:
    headers = message.get("payload", {}).get("headers", [])
    for header in headers:
        if header.get("name", "").lower() == name.lower():
            return header.get("value", "")
    return ""


def decode_body_data(data: str | None) -> str:
    if not data:
        return ""
    padded = data + "=" * (-len(data) % 4)
    try:
        return base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8", errors="ignore")
    except Exception:
        return ""


def collect_text_parts(payload: dict[str, Any]) -> list[str]:
    mime_type = payload.get("mimeType", "")
    body = payload.get("body", {})
    parts = payload.get("parts", [])
    if mime_type in {"text/plain", "text/html"}:
        return [decode_body_data(body.get("data"))]
    text: list[str] = []
    for part in parts:
        text.extend(collect_text_parts(part))
    return text


def clean_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def normalize_due_date(month: int, day: int, year: int | None) -> str | None:
    today = date.today()
    candidate_year = year or today.year
    try:
        candidate = date(candidate_year, month, day)
    except ValueError:
        return None
    if year is None and candidate < today:
        try:
            candidate = date(candidate_year + 1, month, day)
        except ValueError:
            return None
    return candidate.isoformat()


def extract_due_date(text: str) -> str | None:
    context_patterns = [
        r"(?:due|payment due|pay by|autopay(?:ment)? scheduled(?: for)?|will be paid on|scheduled for)\s*(?:date)?[:\s,]*(.{0,45})",
        r"(.{0,45})\s*(?:due|payment due)",
    ]
    candidates: list[str] = []
    for pattern in context_patterns:
        candidates.extend(match.group(1) for match in re.finditer(pattern, text, flags=re.IGNORECASE))
    candidates.append(text[:600])

    numeric = re.compile(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b")
    named = re.compile(
        r"\b("
        + "|".join(MONTHS.keys())
        + r")\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?\b",
        flags=re.IGNORECASE,
    )

    for candidate in candidates:
        for match in named.finditer(candidate):
            month = MONTHS[match.group(1).lower().rstrip(".")]
            day = int(match.group(2))
            year = int(match.group(3)) if match.group(3) else None
            parsed = normalize_due_date(month, day, year)
            if parsed:
                return parsed
        for match in numeric.finditer(candidate):
            month = int(match.group(1))
            day = int(match.group(2))
            year_raw = match.group(3)
            year = None
            if year_raw:
                year = int(year_raw)
                year = 2000 + year if year < 100 else year
            parsed = normalize_due_date(month, day, year)
            if parsed:
                return parsed
    return None


def extract_amount(text: str) -> float | None:
    patterns = [
        r"(?:amount due|balance due|payment amount|total due|autopay amount)[:\s]*\$?\s*([0-9][0-9,]*\.\d{2})",
        r"\$\s*([0-9][0-9,]*\.\d{2})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return float(match.group(1).replace(",", ""))
    return None


def infer_bill_name(subject: str, from_header: str) -> str:
    sender_name, sender_email = parseaddr(from_header)
    base = sender_name or sender_email.split("@")[0] or subject
    base = re.sub(r"\b(billing|bill|invoice|statement|payment|notification|customer service|no[- ]?reply)\b", " ", base, flags=re.IGNORECASE)
    base = re.sub(r"\s+", " ", base).strip(" -:_")
    if not base:
        base = re.sub(r"\b(your|monthly|statement|bill|invoice|payment|is|ready|due)\b", " ", subject, flags=re.IGNORECASE)
        base = re.sub(r"\s+", " ", base).strip(" -:_")
    return (base or "Email bill").title()[:160]


def message_search_text(message: dict[str, Any]) -> str:
    subject = header_value(message, "Subject")
    snippet = message.get("snippet", "")
    text_parts = collect_text_parts(message.get("payload", {}))
    body_text = clean_text(" ".join(text_parts))
    return clean_text(f"{subject} {snippet} {body_text[:4000]}")


def build_bill_candidate(message: dict[str, Any], searchable: str) -> dict[str, Any] | None:
    subject = header_value(message, "Subject")
    from_header = header_value(message, "From")
    snippet = message.get("snippet", "")
    due_date = extract_due_date(searchable)
    amount = extract_amount(searchable)
    if not due_date:
        return None
    name = infer_bill_name(subject, from_header)
    message_id = message.get("id")
    return {
        "name": name,
        "amount": amount or 0,
        "due_date": due_date,
        "billing_cycle": "monthly",
        "category": "Email",
        "autopay": bool(re.search(r"\b(auto[- ]?pay|autopay|automatic payment)\b", searchable, flags=re.IGNORECASE)),
        "url": f"https://mail.google.com/mail/u/0/#all/{message.get('threadId')}" if message.get("threadId") else None,
        "notes": f"Imported from Gmail for review. Subject: {subject}. Snippet: {snippet}",
        "status": "review",
        "source": "gmail",
        "external_id": message_id,
        "source_updated_at": message.get("internalDate"),
    }


def scan_gmail_for_bills(db: Session, query: str, max_messages: int, keyword_filter: str | None) -> dict[str, Any]:
    creds = get_credentials(interactive=False)
    service = build("gmail", "v1", credentials=creds)
    list_result = service.users().messages().list(userId="me", q=query, maxResults=max_messages).execute()
    messages = list_result.get("messages", [])
    imported = 0
    skipped_duplicates = 0
    skipped_keyword = 0
    skipped_unparsed = 0
    candidates: list[dict[str, Any]] = []
    keywords = [part.strip().lower() for part in re.split(r"[,;]", keyword_filter or "") if part.strip()]

    for ref in messages:
        message = service.users().messages().get(userId="me", id=ref["id"], format="full").execute()
        searchable = message_search_text(message)
        if keywords and not any(keyword in searchable.lower() for keyword in keywords):
            skipped_keyword += 1
            continue
        candidate = build_bill_candidate(message, searchable)
        if not candidate:
            skipped_unparsed += 1
            continue
        exists_by_message = db.scalars(
            select(Bill).where(
                (Bill.source == "gmail") & (Bill.external_id == candidate["external_id"])
            )
        ).first()
        exists_by_bill = db.scalars(
            select(Bill).where(
                (Bill.name == candidate["name"]) & (Bill.due_date == candidate["due_date"])
            )
        ).first()
        if exists_by_message or exists_by_bill:
            skipped_duplicates += 1
            continue
        db.add(Bill(**candidate))
        imported += 1
        candidates.append(candidate)

    db.commit()
    return {
        "query": query,
        "scanned": len(messages),
        "imported": imported,
        "skipped_duplicates": skipped_duplicates,
        "skipped_keyword": skipped_keyword,
        "skipped_unparsed": skipped_unparsed,
        "bills": candidates,
    }

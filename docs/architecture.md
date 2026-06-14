# Architecture

## Backend

FastAPI serves a local REST API over SQLite. SQLAlchemy models live in `backend/app/models.py`, validation schemas in `backend/app/schemas.py`, and route registration in `backend/app/main.py`.

Tables are created on startup through `Base.metadata.create_all`. This keeps the MVP simple while leaving room for Alembic migrations later.

## Frontend

React + Vite provides a sidebar dashboard app. Reusable UI primitives live under `frontend/src/components`, entity field definitions live in `frontend/src/lib/config.js`, and CRUD pages reuse a generic `EntityPage`.

## AI Helper

The MVP AI helper is rule-based and reads local dashboard data only. The route shape is intentionally provider-friendly so a future OpenAI-backed provider can be added without replacing the dashboard UI.

## Google Calendar

Google Calendar sync is an optional provider in `backend/app/google_calendar.py`. It uses Google's installed-app OAuth flow, stores the OAuth client secret under `backend/config`, stores the local token under `backend/data`, and imports events with read-only access.

Synced events are local calendar rows with source metadata. Manual rows remain `source = "manual"` and are not deleted by sync.

## Apple Calendar

Apple Calendar sync is an optional CalDAV provider in `backend/app/apple_calendar.py`. It reads ignored local config from `backend/config/apple-calendar.json`, connects to iCloud CalDAV, and imports matching events as local rows with `source = "apple"`.

Apple credentials are not stored in SQLite.

## Gmail Bill Discovery

Gmail bill discovery is an optional provider in `backend/app/gmail_bills.py`. It uses read-only Gmail access, scans likely billing messages, and imports conservative due-date matches as local bill rows with `status = "review"` and `source = "gmail"`.

The scanner is intentionally a review queue, not an autopay ledger. Email formats vary, so imported records should be checked before relying on them.

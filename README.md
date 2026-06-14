# AI Home Dashboard

Local-first personal operations dashboard for daily planning, Codex projects, notes, reminders, links, and simple manual bill tracking. The app stores data in SQLite and provides a React + Vite frontend backed by a Python FastAPI REST API.

## Features

- Dashboard for today’s date/time, agenda, reminders, manual bills, Codex-friendly project momentum, pinned notes, favorite/recent links, daily focus, quick capture, and rule-based helper summaries.
- Universal Inbox for quick capture with local rule-based type suggestions and conversion into reminders, notes, project tasks, calendar items, or links.
- Project Momentum hub with categories, priority, goal, next action, blocker, local path, repo URL, frontend/backend commands, Codex prompt, tags, last-worked tracking, archive, and copy actions.
- Daily Plan workflow with Start Day and End Day actions for main focus, top 3 actions, end-of-day notes, and tomorrow’s first action.
- Manual CRUD for calendar items, reminders, bills/subscriptions, chores, notes, quick links, project records, project tasks, inbox items, and daily plans.
- SQLite local storage by default.
- Global search across calendar, reminders, projects, notes, links, inbox items, and daily plans with quick actions.
- Settings for display name, dashboard sections, time format, and theme.
- JSON import/export, bills CSV export, and notes Markdown export.
- Optional read-only Google Calendar sync into local calendar records.
- Optional read-only Apple/iCloud Calendar sync through CalDAV.
- Optional read-only Gmail bill scan remains available, but bills stay a simple manual/review list in the dashboard.
- Sample seed data and a migration/initialization path through SQLAlchemy table creation.

## Windows Setup

Prerequisites:

- Python 3.11 or newer: <https://www.python.org/downloads/windows/>
- Node.js 20 or newer: <https://nodejs.org/en/download>
- PowerShell 5.1 or PowerShell 7.

From the project root:

```powershell
cd path\to\AI-Dashboard
```

Create and activate a backend virtual environment:

```powershell
py -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
```

Initialize the SQLite database with sample data:

```powershell
python -m backend.app.seed
```

Run the backend on localhost:

```powershell
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

In a second PowerShell window, install and run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:5174>.

## Windows Installer

Build a Windows installer executable that contains the dashboard launcher, compiled frontend, and backend helper:

```powershell
cd path\to\AI-Dashboard
.\backend\.venv\Scripts\python.exe -m pip install -r .\backend\requirements-build.txt
.\scripts\Build-WindowsExe.ps1
```

The build output is:

```text
dist\AIHomeDashboardInstaller.exe
```

Run `dist\AIHomeDashboardInstaller.exe` to choose:

- Install for current user, which defaults to `%LOCALAPPDATA%\Programs\AIHomeDashboard` and does not require admin.
- Install for all users, which defaults to `%ProgramFiles%\AIHomeDashboard` and requires running the installer as Administrator.
- A custom install folder.
- Start Menu and desktop shortcut creation.

After installing, run the packaged app from the shortcut or directly from the selected install folder:

```powershell
& "$env:LOCALAPPDATA\Programs\AIHomeDashboard\AIHomeDashboard.exe"
```

The executable opens the dashboard in its own desktop window and starts the local API server as a hidden helper process. It binds internally to `127.0.0.1` on the first available port starting at `8765`. The packaged folder keeps writable app data outside the executable under:

```text
<install directory>\backend\data
<install directory>\backend\config
```

Existing files under `backend\data` and `backend\config` are preserved during reinstall/update. `AIHomeDashboard.exe` is the launcher, and the adjacent `.dll` files plus the `backend` folder are required runtime files.

## Data Location

The SQLite database is created at:

```text
backend\data\dashboard.db
```

## API

The backend exposes REST endpoints under `/api`:

- `/api/calendar`
- `/api/reminders`
- `/api/bills`
- `/api/chores`
- `/api/notes`
- `/api/links`
- `/api/projects`
- `/api/project-tasks`
- `/api/inbox`
- `/api/inbox/{id}/convert`
- `/api/daily-plans`
- `/api/daily-plans/start`
- `/api/daily-plans/end`
- `/api/settings`
- `/api/dashboard`
- `/api/search?q=term`
- `/api/search/actions/create-reminder`
- `/api/search/actions/attach-to-project`
- `/api/export`
- `/api/import`
- `/api/ai-helper/{prompt_key}`
- `/api/integrations/google/config`
- `/api/integrations/google-calendar/status`
- `/api/integrations/google-calendar/connect`
- `/api/integrations/google-calendar/sync`
- `/api/integrations/apple-calendar/status`
- `/api/integrations/apple-calendar/calendars`
- `/api/integrations/apple-calendar/sync`
- `/api/integrations/gmail/status`
- `/api/integrations/gmail/connect`
- `/api/integrations/gmail/scan-bills`

OpenAPI docs are available while the backend is running:

```text
http://127.0.0.1:8000/docs
```

## Import / Export

Use the Settings page to export or import JSON. Imports are validated by Pydantic schemas before records are written to SQLite. Duplicate records with protected unique fields are rejected by the API.

The Settings import box is only for dashboard data JSON exported from this app, such as calendar items, reminders, bills, chores, notes, quick links, projects, project tasks, inbox items, daily plans, and settings. Google OAuth client JSON belongs in **Settings -> Google APIs**, not the data import box.

## Daily Operations Workflow

Use **Quick Capture** on the dashboard or the **Inbox** tab to capture raw text without deciding where it belongs. The backend suggests one of these local types using simple rules: reminder, note, project task, calendar item, link, or idea. Convert inbox items when ready; converted records keep the original `inbox_item_id` for traceability.

Use **Start Day** on the dashboard to review today’s calendar, due reminders, active project next actions, and new inbox items. Save or edit the generated daily plan fields as needed. Use **End Day** to record end-of-day notes and tomorrow’s first action.

Use **Projects** as the Codex/project operations hub. Keep `local_path`, `repo_url`, `frontend_command`, `backend_command`, and `codex_prompt` current so common project startup and handoff actions are one click away.

Use **Search** to find operational context across calendar, reminders, projects, notes, links, inbox, and daily plans. Search results can open the relevant page, copy a link, create a reminder, or attach applicable context to a project as a project task.

Optional exports:

- Bills CSV: `/api/export/bills.csv`
- Notes Markdown: `/api/export/notes.md`

## Optional Google APIs Setup

Google Calendar and Gmail use the shared **Settings -> Google APIs** OAuth Desktop app client JSON.

Setup:

1. In Google Cloud Console, create or select a project.
2. Enable the APIs you want:
   - Google Calendar API
   - Gmail API
3. Configure an OAuth consent screen for a desktop/testing app.
4. Add your Google account as a test user.
5. Create OAuth client credentials for a **Desktop app**.
6. Download the client secret JSON.
7. Open **Settings** in the dashboard.
8. Find **Google APIs**.
9. Paste the downloaded JSON into **Google OAuth client JSON**.
10. Click **Save Google OAuth JSON**.
11. After the JSON is saved, click **Connect Calendar** and **Connect Gmail** in the same **Google APIs** section for the Google features you use.

The app writes this ignored local file for you:

```text
backend\config\google-client-secret.json
```

This one file is used by both Google Calendar and Gmail. Existing older files still work as fallback during migration:

```text
backend\config\google-calendar-client-secret.json
backend\config\gmail-client-secret.json
```

Tokens remain separate by feature:

```text
backend\data\google-calendar-token.json
backend\data\gmail-token.json
```

## Optional Google Calendar Sync

Google Calendar is optional and read-only. Manual calendar items stay local. Synced Google events are copied into the local SQLite `calendar_items` table with `source = "google"` and are updated on later syncs by Google event ID.

After saving the shared Google OAuth JSON in **Settings -> Google APIs**, connect Calendar from that same section, then use the Calendar page:

1. Click **Connect Calendar** in **Settings -> Google APIs**.
2. Complete the browser consent flow.
3. Open **Calendar** and click **Sync**.

The token is stored at:

```text
backend\data\google-calendar-token.json
```

The requested OAuth scope is read-only:

```text
https://www.googleapis.com/auth/calendar.readonly
```

### Calendar OAuth Blocked Troubleshooting

If Google shows **OAuth blocked**, **Access blocked**, or **This app has not completed the Google verification process**, check these items first:

1. Confirm the JSON file is an OAuth **Desktop app** client, not a Web app client.
2. In Google Cloud Console, open the same project that created the JSON file.
3. Open **APIs & Services** -> **OAuth consent screen** or **Google Auth Platform**.
4. Keep **Publishing status** as **Testing** for local personal use.
5. Add the Google account you are signing in with as a **Test user**.
6. Confirm the Google Calendar API is enabled in that same project.
7. Try connecting again from the Calendar page.

Do not switch the app to Production for this local MVP unless you plan to complete Google's OAuth verification. Calendar scopes are treated as sensitive, and unverified production apps can be blocked.

If you use a managed Google Workspace account, your Workspace administrator may also need to allow the OAuth app or API access.

## Optional Apple Calendar Sync

Apple does not provide a Google-style Calendar REST API for personal iCloud calendars. This app uses read-only CalDAV sync with an Apple Account app-specific password.

Prerequisites:

- iCloud Calendar enabled for your Apple Account.
- Two-factor authentication enabled for your Apple Account.
- An Apple app-specific password generated for this app.

Configure it in the app:

1. Open **Settings**.
2. Find **Apple Calendar**.
3. Enter your Apple ID.
4. Enter an Apple app-specific password, not your main Apple ID password.
5. Leave **CalDAV URL** as `https://caldav.icloud.com`.
6. Optionally enter a default calendar name, or leave it blank to sync all calendars.
7. Click **Save Apple Calendar**.
8. Click **Test connection** to list available calendars.

Then use the Calendar page:

1. In **Apple Calendar Sync**, leave **Calendar name** blank to sync all configured calendars, or enter the exact iCloud calendar name.
2. Set **Days forward**.
3. Click **Sync Apple**.

Synced Apple events are copied into local calendar rows with `source = "apple"`. Manual calendar items are not deleted or overwritten.

The app writes this ignored local file for you:

```text
backend\config\apple-calendar.json
```

This file contains the Apple app-specific password. It is ignored by Git and should not be committed.

## Optional Gmail OAuth JSON

Gmail bill discovery is optional and read-only. It uses the same shared **Settings -> Google APIs** OAuth client JSON as Google Calendar. Do not use an API key or service account for personal Gmail access.

Start with the narrowest useful Gmail scope when the integration is added:
The app uses this read-only scope:

```text
https://www.googleapis.com/auth/gmail.readonly
```

The token is stored at:

```text
backend\data\gmail-token.json
```

Then restart the backend, connect Gmail from Settings, and use the Bills page:

1. Open **Settings -> Google APIs**.
2. Confirm the Google OAuth client JSON is saved. Connect Calendar there if you use Google Calendar, then click **Connect Gmail** for Gmail bill discovery.
3. Complete the browser consent flow.
4. Open **Bills** and optionally enter comma-separated keywords such as `apple, paypal, utility`.
5. Click **Search and import**.
6. Review imported bills in the bills table.

Imported email bills are marked with `status = "review"` and `source = "gmail"`. The scanner skips duplicate Gmail message IDs on later scans. It uses conservative rules against the message subject, snippet, and plain text/html body:

- Looks for likely billing emails with a Gmail search query.
- Applies the optional keyword filter before importing.
- Extracts due dates from phrases such as `due`, `payment due`, `pay by`, or `autopay scheduled`.
- Extracts common dollar amounts when present.
- Leaves amount as `0` when a due date is found but the amount cannot be parsed.

Because email formats vary, treat Gmail imports as review candidates. Edit or delete anything that was parsed incorrectly.

Use broader scopes only when a specific future feature requires them, such as draft creation or sending.

## Future Integration Points

- Google Calendar: current sync is read-only and manual. Future work can add recurring background sync, calendar selection, and conflict handling.
- Apple Calendar: current sync uses CalDAV and is manual. Future work can add calendar picker UI and recurring background sync.
- Gmail: current bill scan is read-only and manual. Keep bill records simple and review-driven.
- Project automation: add local Codex project status checks, repo health summaries, and next-task reminders without storing secrets in the app database.
- OpenAI API: optional future helper integrations should stay behind a provider interface. Keep API keys in environment variables such as `OPENAI_API_KEY`; do not store them in SQLite or source code.

## Security

- The API has no authentication and must stay bound to `127.0.0.1`. Never bind it to `0.0.0.0`, a LAN address, or expose it through a public reverse proxy without first adding authentication.
- The `/api/tools/*` endpoints for ping, port-check, DNS, certificate checks, and speed tests make outbound requests to caller-supplied hosts or URLs. On loopback this only touches the local machine. If the API is ever exposed, these endpoints become an SSRF and internal-network-scan surface. Add authentication and restrict outbound targets before any non-local deployment.
- Secrets, including Google OAuth client JSON, Apple app-specific passwords, and OAuth tokens, are stored as local files under `backend/config` and `backend/data`. These paths are git-ignored and must not be committed.

## Notes

- The backend is intended for local use and binds to `127.0.0.1` in the setup commands.
- There is no authentication in the MVP.
- Notes render as plain React text, not raw HTML.
- Docker is not required.

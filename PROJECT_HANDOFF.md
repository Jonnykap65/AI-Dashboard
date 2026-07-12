# Project Handoff

## Current State

Local-first AI Home Dashboard with a FastAPI backend and Vite frontend. Development services use `127.0.0.1:8000` and `127.0.0.1:5174`. The Windows installer is a branded WPF setup wizard with welcome, options, progress, and completion pages; the current packaged executable is `dist/AIHomeDashboardInstaller.exe`.

## Last Session Summary

Reworked the Windows installer wrapper into a conventional setup wizard, retained install scope/location/shortcut choices and update data preservation, added executable metadata, and rebuilt the packaged installer.

## Pending Tasks

None recorded.

## Active Risks / Constraints

Keep the API loopback-bound; local credentials and application data must not be committed.

## Recent Session Notes

### 2026-07-12 - Presentable Windows setup wizard

- Goal: Make the installer wrapper behave and present more like a conventional Windows executable installer.
- Changes made: Added branded welcome, installation options, progress, and finish pages; moved app launch to the finish action; added Windows executable product/version metadata; rebuilt the installer; documented the unsigned executable warning and code-signing recommendation.
- Files modified: `desktop/AIHomeDashboard.Installer/MainWindow.xaml`, `desktop/AIHomeDashboard.Installer/MainWindow.xaml.cs`, `desktop/AIHomeDashboard.Installer/AIHomeDashboard.Installer.csproj`, `README.md`, `dist/AIHomeDashboardInstaller.exe`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Installer project Release build, frontend production build, full `scripts/Build-WindowsExe.ps1` packaging pipeline, executable metadata/hash inspection, launch/responsiveness smoke test, `git diff --check`.
- Result: `dist/AIHomeDashboardInstaller.exe` opens a responsive, multi-step setup wizard and retains current-user/all-users paths, custom location, shortcuts, existing data/config preservation, and optional post-install launch.
- Risks/incomplete work: Installer is not code-signed; Windows may show an unknown-publisher warning. The all-users path still requires the installer to be started as Administrator.
- Next step: Optionally code-sign the installer for trusted distribution.

### 2026-07-12 - Reorder Tools navigation

- Goal: Move Tools below Search in the sidebar.
- Changes made: Reordered the sidebar item list.
- Files modified: `frontend/src/components/Sidebar.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live navigation-order check.
- Result: Bottom navigation order is Search, Tools, System, Settings.
- Risks/incomplete work: None identified.
- Next step: None.

### 2026-07-12 - Consolidate Knowledge Base transfers

- Goal: Combine Link and Article import/export into one bubble while keeping separate collapsible sections.
- Changes made: Wrapped both existing accordions in one Import / Export card and removed the duplicate outer cards.
- Files modified: `frontend/src/pages/KnowledgeBasePage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live DOM review, independent accordion expansion test.
- Result: One outer card contains two independently collapsible transfer sections.
- Risks/incomplete work: None identified.
- Next step: None.

### 2026-07-12 - Partial project tile revert

- Goal: Revert the latest project-tile changes except removal of No next action.
- Changes made: Restored the prior project-name class and `lg` three-column breakpoint; kept the subtitle removed.
- Files modified: `frontend/src/pages/Dashboard.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, source search.
- Result: Only the No next action removal remains from the preceding tile cleanup.
- Risks/incomplete work: None identified.
- Next step: None.

### 2026-07-12 - Responsive project tile cleanup

- Goal: Remove next-action text from dashboard tiles and keep the board clean in smaller windows.
- Changes made: Removed the tile subtitle, made project names block-truncate correctly, and changed the board to one/two/three responsive columns.
- Files modified: `frontend/src/pages/Dashboard.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live 1146 px viewport layout and overflow check.
- Result: The tested window uses two 390.5 px columns; project name is unclipped and next-action text is absent.
- Risks/incomplete work: None identified.
- Next step: None.

### 2026-07-12 - Enlarge project drop zones

- Goal: Make empty status-column drop targets easier to hit.
- Changes made: Increased column minimum height and made the dashed empty target fill the available column body.
- Files modified: `frontend/src/pages/Dashboard.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live element-dimension check.
- Result: Empty columns are 256 px tall with 194 px visible drop targets at the tested viewport.
- Risks/incomplete work: None identified.
- Next step: None.

### 2026-07-12 - Restore native project dragging

- Goal: Keep Move to while restoring project card drag-and-drop.
- Changes made: Restored native whole-card dragging and column drop handlers; kept the grip cue, prevented link-specific dragging, and retained optimistic save/rollback plus Move to.
- Files modified: `frontend/src/pages/Dashboard.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, source contract search, live DOM verification of `draggable=true`, non-draggable project link, and Move to presence.
- Result: Both card dragging and Move to are available through the same persistence path.
- Risks/incomplete work: Browser automation cannot reliably synthesize HTML5 drag/drop; live DOM and persistence contracts were verified.
- Next step: None.

### 2026-07-12 - Project status movement reliability

- Goal: Diagnose and fix rough or unreliable project drag-and-drop behavior.
- Changes made: Replaced card-wide native dragging with a dedicated pointer-captured handle, added column hit-testing and a floating preview, made status moves optimistic with rollback, and added a compact Move to fallback.
- Files modified: `frontend/src/pages/Dashboard.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live board inspection, reversible Completed-to-Active-to-Completed UI/API persistence test.
- Result: Status changes move immediately and persist; the test project was restored to Completed.
- Risks/incomplete work: Browser automation does not synthesize the human pointer-drag gesture reliably; the verified Move to control covers mouse, touch, and keyboard fallback.
- Next step: None.

### 2026-07-12 - Reorder System navigation

- Goal: Move System below Search and above Settings in the sidebar.
- Changes made: Reordered the sidebar item list.
- Files modified: `frontend/src/components/Sidebar.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live navigation-order check.
- Result: Sidebar order is Tools, Search, System, Settings at the bottom.
- Risks/incomplete work: None identified.
- Next step: None.

### 2026-07-12 - Remove settings helper text

- Goal: Remove unnecessary save-behavior copy from Preferences and Appearance.
- Changes made: Removed both helper paragraphs without changing automatic persistence.
- Files modified: `frontend/src/pages/SettingsPage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, source search, live browser text/control check.
- Result: Both lines are absent and the settings controls remain intact.
- Risks/incomplete work: None identified.
- Next step: None.

### 2026-07-12 - Local System Info visual cleanup

- Goal: Make the Local System Info view cleaner and more presentable.
- Changes made: Replaced redundant host/OS tiles with a device identity header, formatted refresh time, aligned uptime/processor/CPU/memory summaries, and folded Dashboard Data into Storage.
- Files modified: `frontend/src/pages/SystemsToolsPage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live DOM review, full-page browser visual review.
- Result: The view has a clearer hierarchy and less card fragmentation with all metrics preserved.
- Risks/incomplete work: None identified.
- Next step: None.

### 2026-07-12 - Remove quick next-action button

- Goal: Remove the Update next action button from expanded project cards.
- Changes made: Removed the button and its unused prompt-based handler.
- Files modified: `frontend/src/pages/ProjectsPage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, source search, live expanded-card browser check.
- Result: Update next action is absent; Add task and the remaining project actions are intact.
- Risks/incomplete work: Next action remains editable through Edit project.
- Next step: None.

### 2026-07-12 - Automatic settings persistence

- Goal: Verify whether the Preferences and Appearance save buttons are necessary.
- Changes made: Theme and time-format selections now persist immediately; display name persists on blur; removed both redundant save buttons and added accurate helper text.
- Files modified: `frontend/src/pages/SettingsPage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live browser button counts, automatic-save confirmations, reversible time-format persistence test.
- Result: Both settings sections save automatically without manual save buttons; test values were restored.
- Risks/incomplete work: None identified.
- Next step: None.

### 2026-07-12 - Consolidated dashboard layout

- Goal: Consolidate the highlighted dashboard card pairs and layer them cleanly with the rest of the page.
- Changes made: Combined health/storage into System Overview, calendar/bills into Upcoming, and articles/links into Pinned Resources; added consistent internal panel styling and responsive 2-to-1 lower layout.
- Files modified: `frontend/src/pages/Dashboard.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live DOM check, full-page browser visual review.
- Result: Dashboard now has three clear layers beneath the header with aligned, consolidated cards.
- Risks/incomplete work: None identified.
- Next step: None.

### 2026-07-12 - Collapsible project cards

- Goal: Collapse Projects-page cards by default and separate expansion from record actions.
- Changes made: Added independent card expansion state, a top-right Expand/Collapse button, and moved project action buttons into a lower expanded-content row.
- Files modified: `frontend/src/pages/ProjectsPage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live browser checks of collapsed and expanded states.
- Result: Cards default collapsed; expanded cards expose details, actions, and tasks in the requested layout.
- Risks/incomplete work: Expansion state is intentionally session-local and resets on page reload.
- Next step: None.

### 2026-07-12 - Draggable Project Status Dashboard

- Goal: Make dashboard projects a full-width three-column status board with drag-to-update behavior.
- Changes made: Added Active, In progress, and Completed columns; persisted drops through the project API; renamed canonical inactive status to in progress with legacy compatibility; added completed projects to the dashboard payload.
- Files modified: `backend/app/main.py`, `backend/app/schemas.py`, `frontend/src/lib/config.js`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/ProjectsPage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, Python compile check, dashboard API payload check, reversible active-to-in-progress API transition, `git diff --check`, live browser layout check.
- Result: Board renders full width above the remaining dashboard and status changes persist; test project restored to active after validation.
- Risks/incomplete work: Native drag-and-drop is pointer-oriented; status remains editable from the Projects page as a non-drag fallback.
- Next step: None.

### 2026-07-12 - Project target dates in Calendar

- Goal: Show projects in Calendar separately from synced events and link both views.
- Changes made: Added virtual `project` agenda entries, distinct calendar styling, and bidirectional hash deep links.
- Files modified: `backend/app/main.py`, `frontend/src/App.jsx`, `frontend/src/pages/CalendarPage.jsx`, `frontend/src/pages/ProjectsPage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, backend health/agenda API checks, `git diff --check`, live browser navigation in both directions.
- Result: The existing July 31 test project appears in July Calendar and both links resolve correctly.
- Risks/incomplete work: Completed/archived projects are intentionally omitted from Calendar; no automated backend test suite was present at the expected path.
- Next step: None.

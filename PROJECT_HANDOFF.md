# Project Handoff

## Current State

Local-first AI Home Dashboard with a FastAPI backend and Vite frontend. Development services use `127.0.0.1:8000` and `127.0.0.1:5174`. Frontend disclosures share full-card, nested-panel, and record-detail controls; Settings keeps Google APIs, Apple Calendar, and Data Import / Export collapsed by default. Projects and the Project Status Dashboard use an information-first metadata and quiet-action hierarchy. The Windows installer is a branded WPF setup wizard; the current packaged executable is `dist/AIHomeDashboardInstaller.exe`.

## Last Session Summary

Rebuilt and smoke-tested the Windows installer with the completed disclosure and project UI improvements, audited the packaged payload, and prepared the tracked source changes for publication on `main`.

## Pending Tasks

None recorded.

## Active Risks / Constraints

Keep the API loopback-bound; local credentials and application data must not be committed.

## Recent Session Notes

### 2026-07-14 - Refresh installer with disclosure and project UI updates

- Goal: Rebuild the Windows installer, validate the release artifact, and publish the completed UI changes.
- Changes made: Rebuilt the Vite frontend, PyInstaller backend, WPF desktop payload, and final installer; audited the source, staged payload, and `dist` output; verified metadata, signature state, hash, window title, responsiveness, and cleanup.
- Files modified: Existing pending frontend UI changes, `dist/AIHomeDashboardInstaller.exe`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `scripts/Build-WindowsExe.ps1`, local-first source/artifact audits, payload ZIP inspection, Windows release manifest, installer lifecycle smoke test, hidden-window title/responsiveness check, `git diff --check`.
- Result: `dist/AIHomeDashboardInstaller.exe` is refreshed at 53,021,882 bytes with SHA-256 `1424543C1FAE6E855EF88680F92EDE0708D5CEC129B1FC9E1E52A1F0ADBEFE11`; the payload has an empty data directory, safe example configs only, and no credential/database findings.
- Risks/incomplete work: The installer is unsigned and may show an unknown-publisher warning. No actual install, upgrade, all-users elevation, shortcut, or uninstall flow was run during this smoke pass.
- Next step: Commit and push the tracked UI and handoff files to `main`.

### 2026-07-14 - Collapse Settings integrations and data tools

- Goal: Make Google APIs, Apple Calendar, and Data Import / Export collapsible on Settings.
- Changes made: Reused the shared full-card disclosure component for all three sections and added explicit default-closed state without changing forms, persistence, connection handlers, or import/export actions.
- Files modified: `frontend/src/pages/SettingsPage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, live default-state check, expand/collapse checks for all three sections, form-state retention check, dark-theme visual review, browser console check.
- Result: All three cards start collapsed, remove their controls from the DOM while closed, and restore existing values when reopened.
- Risks/incomplete work: Expansion state is session-local by design; no connection, credential, import, or export mutation was triggered during validation.
- Next step: None.

### 2026-07-14 - Shared disclosures and quiet project UI

- Goal: Standardize all collapsible menus and clean up Projects plus the Project Status Dashboard tiles.
- Changes made: Added shared full-card, nested-panel, and record-detail disclosure controls; removed collapsed filler; replaced repeated project-card button clusters with metadata-first layouts and quiet action rows; simplified dashboard project tiles while preserving drag-and-drop and status selection.
- Files modified: `frontend/src/components/ui.jsx`, `frontend/src/pages/BillsPage.jsx`, `frontend/src/pages/CalendarPage.jsx`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/KnowledgeBasePage.jsx`, `frontend/src/pages/ProjectsPage.jsx`, `frontend/src/pages/SettingsPage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Frontend production build, `git diff --check`, disclosure source inventory, live expand-collapse cycles, dark-theme visual review, 390 px responsive overflow check, browser console check.
- Result: All explicit disclosures now share accessible Expand/Collapse text, chevrons, focus styling, `aria-expanded`, controlled regions, and unmounted collapsed content; project actions and status tiles are calmer and retain all prior behavior.
- Risks/incomplete work: Expansion state remains session-local by design; native project drag-and-drop was preserved but not mutation-tested during this formatting-only pass.
- Next step: None.

### 2026-07-12 - Refresh installer with consolidated app changes

- Goal: Update the Windows installer with all currently documented AI-Dashboard changes, then publish the source on the consolidated `main` branch.
- Changes made: Rebuilt the frontend, packaged backend helper, desktop launcher, embedded installer payload, and final setup executable; verified the pending source set contains no embedded secrets.
- Files modified: Existing pending backend/frontend source changes, `dist/AIHomeDashboardInstaller.exe`, `PROJECT_HANDOFF.md`.
- Commands/tests run: `git diff --check`, sensitive-pattern scan, full `scripts/Build-WindowsExe.ps1` pipeline, executable metadata/hash inspection, installer launch/responsiveness smoke test.
- Result: `dist/AIHomeDashboardInstaller.exe` is refreshed, 50.56 MB, opens as AI Home Dashboard Setup, and is responsive.
- Risks/incomplete work: The installer remains unsigned and `dist/` remains intentionally excluded from Git; rebuild locally for distribution.
- Next step: None.

### 2026-07-12 - Clear locally synced calendar entries

- Goal: Allow clearing synced entries from the dashboard calendar without deleting provider events.
- Changes made: Added a source-restricted backend clear helper/endpoint and a confirmed Calendar Sync action with explicit safety copy.
- Files modified: `backend/app/calendar_reminders.py`, `backend/app/main.py`, `frontend/src/pages/CalendarPage.jsx`, `PROJECT_HANDOFF.md`.
- Commands/tests run: Python compile check, isolated in-memory deletion test, frontend production build, `git diff --check`, backend restart/health/OpenAPI check, live control and safety-copy check.
- Result: Only local Google/Apple calendar rows and generated reminders are removed; manual rows remain and provider APIs are not called.
- Risks/incomplete work: A later sync intentionally restores provider copies. The live clear action was not triggered against user data.
- Next step: None.

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

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


CALENDAR_COLUMNS = {
    "end_date": "VARCHAR(10)",
    "source": "VARCHAR(40) DEFAULT 'manual'",
    "external_id": "VARCHAR(240)",
    "source_calendar_id": "VARCHAR(240)",
    "source_updated_at": "VARCHAR(64)",
    "inbox_item_id": "INTEGER",
}

BILL_COLUMNS = {
    "source": "VARCHAR(40) DEFAULT 'manual'",
    "external_id": "VARCHAR(240)",
    "source_updated_at": "VARCHAR(64)",
}

REMINDER_COLUMNS = {
    "source": "VARCHAR(40) DEFAULT 'manual'",
    "external_id": "VARCHAR(240)",
    "source_calendar_id": "VARCHAR(240)",
    "source_updated_at": "VARCHAR(64)",
    "inbox_item_id": "INTEGER",
}

NOTE_COLUMNS = {
    "note_type": "VARCHAR(40) DEFAULT 'note'",
    "inbox_item_id": "INTEGER",
}

LINK_COLUMNS = {
    "favorite": "BOOLEAN DEFAULT 0",
    "environment": "VARCHAR(40) DEFAULT 'personal'",
    "tags": "VARCHAR(300)",
    "last_opened_at": "VARCHAR(32)",
    "open_count": "INTEGER DEFAULT 0",
    "inbox_item_id": "INTEGER",
}

PROJECT_COLUMNS = {
    "category": "VARCHAR(40) DEFAULT 'general'",
    "goal": "TEXT",
    "next_action": "VARCHAR(300)",
    "blocker": "TEXT",
    "local_path": "VARCHAR(500)",
    "repo_url": "VARCHAR(500)",
    "frontend_command": "VARCHAR(300)",
    "backend_command": "VARCHAR(300)",
    "last_worked_at": "VARCHAR(10)",
    "codex_prompt": "TEXT",
    "tags": "VARCHAR(300)",
    "inbox_item_id": "INTEGER",
}

PROJECT_TASK_COLUMNS = {
    "inbox_item_id": "INTEGER",
}


def ensure_schema(engine: Engine):
    """Small SQLite migration bridge until the project adopts Alembic."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "calendar_items" not in tables and "bills" not in tables:
        return

    with engine.begin() as conn:
        if "calendar_items" in tables:
            existing = {column["name"] for column in inspector.get_columns("calendar_items")}
            for name, ddl in CALENDAR_COLUMNS.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE calendar_items ADD COLUMN {name} {ddl}"))
            conn.execute(text("UPDATE calendar_items SET source = 'manual' WHERE source IS NULL OR source = ''"))
            conn.execute(text("UPDATE calendar_items SET end_date = date WHERE end_date IS NULL OR end_date = ''"))

        if "bills" in tables:
            existing = {column["name"] for column in inspector.get_columns("bills")}
            for name, ddl in BILL_COLUMNS.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE bills ADD COLUMN {name} {ddl}"))
            conn.execute(text("UPDATE bills SET source = 'manual' WHERE source IS NULL OR source = ''"))

        if "reminders" in tables:
            existing = {column["name"] for column in inspector.get_columns("reminders")}
            for name, ddl in REMINDER_COLUMNS.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE reminders ADD COLUMN {name} {ddl}"))
            conn.execute(text("UPDATE reminders SET source = 'manual' WHERE source IS NULL OR source = ''"))

        if "notes" in tables:
            existing = {column["name"] for column in inspector.get_columns("notes")}
            for name, ddl in NOTE_COLUMNS.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE notes ADD COLUMN {name} {ddl}"))
            conn.execute(text("UPDATE notes SET note_type = 'note' WHERE note_type IS NULL OR note_type = '' OR note_type IN ('general', 'idea', 'home', 'work', 'learning')"))
            conn.execute(text("UPDATE notes SET note_type = 'codex_prompt' WHERE note_type = 'codex'"))

        if "quick_links" in tables:
            existing = {column["name"] for column in inspector.get_columns("quick_links")}
            for name, ddl in LINK_COLUMNS.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE quick_links ADD COLUMN {name} {ddl}"))
            conn.execute(text("UPDATE quick_links SET environment = 'personal' WHERE environment IS NULL OR environment = ''"))
            conn.execute(text("UPDATE quick_links SET open_count = 0 WHERE open_count IS NULL"))

        if "projects" in tables:
            existing = {column["name"] for column in inspector.get_columns("projects")}
            for name, ddl in PROJECT_COLUMNS.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE projects ADD COLUMN {name} {ddl}"))
            conn.execute(text("UPDATE projects SET category = 'general' WHERE category IS NULL OR category = ''"))
            conn.execute(text("UPDATE projects SET local_path = codex_workspace_path WHERE (local_path IS NULL OR local_path = '') AND codex_workspace_path IS NOT NULL"))
            conn.execute(text("UPDATE projects SET repo_url = repository_url WHERE (repo_url IS NULL OR repo_url = '') AND repository_url IS NOT NULL"))
            conn.execute(text("UPDATE projects SET next_action = next_step WHERE (next_action IS NULL OR next_action = '') AND next_step IS NOT NULL"))

        if "project_tasks" in tables:
            existing = {column["name"] for column in inspector.get_columns("project_tasks")}
            for name, ddl in PROJECT_TASK_COLUMNS.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE project_tasks ADD COLUMN {name} {ddl}"))

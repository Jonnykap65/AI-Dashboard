from datetime import date, timedelta

from .database import Base, SessionLocal, engine
from .models import Bill, CalendarItem, Chore, Note, Project, ProjectTask, QuickLink, Reminder, Settings


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(CalendarItem).first():
            print("Database already has data; seed skipped.")
            return
        today = date.today()
        db.add(Settings(display_name="Home", time_format="12h", theme="system"))
        db.add_all(
            [
                CalendarItem(title="Morning planning", date=today.isoformat(), start_time="08:30", end_time="08:45", category="Personal", notes="Review dashboard."),
                CalendarItem(title="Project check-in", date=(today + timedelta(days=1)).isoformat(), start_time="14:00", end_time="14:30", category="Work"),
                Reminder(title="Submit expense receipt", due_date=today.isoformat(), due_time="17:00", priority="high", notes="Attach PDF receipt."),
                Reminder(title="Call pharmacy", due_date=(today + timedelta(days=3)).isoformat(), priority="medium"),
                Bill(name="Internet", amount=79.99, due_date=(today + timedelta(days=5)).isoformat(), billing_cycle="monthly", category="Utilities", autopay=True, status="active"),
                Bill(name="Streaming Bundle", amount=24.99, due_date=(today + timedelta(days=12)).isoformat(), billing_cycle="monthly", category="Subscriptions", status="review"),
                Chore(title="Kitchen reset", room="Kitchen", recurrence="daily", due_date=today.isoformat(), priority="medium"),
                Chore(title="Change HVAC filter", room="Utility", recurrence="monthly", due_date=(today + timedelta(days=6)).isoformat(), priority="high"),
                Note(title="Dinner ideas", body="Tacos, stir fry, sheet-pan chicken.", tags="home,food", pinned=True),
                Note(title="Gift list", body="Track birthdays and holiday ideas here.", tags="family", pinned=False),
                QuickLink(name="Router admin", url="http://example.local", category="Home IT", notes="Local network only."),
                QuickLink(name="Bank", url="https://example.com", category="Finance"),
                Project(
                    name="AI Home Dashboard",
                    status="active",
                    priority="high",
                    due_date=(today + timedelta(days=7)).isoformat(),
                    codex_workspace_path=r"C:\Projects\AI-Dashboard",
                    repository_url="https://github.com/example/ai-home-dashboard",
                    description="Local-first dashboard built with Codex.",
                    next_step="Review MVP workflows and tighten project tracking.",
                ),
                ProjectTask(
                    title="Review project task template",
                    project_name="AI Home Dashboard",
                    due_date=(today + timedelta(days=2)).isoformat(),
                    due_time="16:00",
                    priority="high",
                    status="open",
                    codex_prompt="Verify the Projects page supports local project tasks without calendar linkage.",
                    notes="Modeled after reminders but scoped to Codex project work.",
                ),
            ]
        )
        db.commit()
        print("Seed data inserted.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

import { useEffect, useMemo, useState } from 'react';
import { CalendarSync, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Badge, Card, ErrorBox, Loading } from '../components/ui.jsx';
import { api } from '../lib/api.js';

function dateKey(value) {
  return value.toISOString().slice(0, 10);
}

function monthTitle(value) {
  return value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function weekTitle(days) {
  const first = days[0];
  const last = days[days.length - 1];
  const sameMonth = first.getMonth() === last.getMonth();
  const sameYear = first.getFullYear() === last.getFullYear();
  if (sameMonth && sameYear) {
    return `${first.toLocaleDateString(undefined, { month: 'long' })} ${first.getDate()}-${last.getDate()}, ${first.getFullYear()}`;
  }
  if (sameYear) {
    return `${first.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return `${first.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - ${last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function buildMonthDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function buildWeekDays(anchorDate) {
  const start = new Date(anchorDate);
  start.setDate(anchorDate.getDate() - anchorDate.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function sourceTone(source) {
  if (source === 'google') return 'low';
  if (source === 'apple') return 'medium';
  if (source === 'reminder') return 'high';
  return 'muted';
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hour, minute] = value.split(':').map((part) => Number(part));
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  return hour * 60 + minute;
}

function groupItemsByDate(items) {
  const map = {};
  for (const item of items) {
    map[item.date] = map[item.date] || [];
    map[item.date].push(item);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'));
  }
  return map;
}

function CalendarControls({ mode, setMode, onPrev, onNext, onToday, periodLabel }) {
  const unit = mode === 'week' ? 'week' : 'month';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex rounded-md border border-line bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
        {['month', 'week'].map((nextMode) => (
          <button
            key={nextMode}
            className={`rounded px-3 py-1.5 text-sm font-medium capitalize ${mode === nextMode ? 'bg-white text-ink shadow-sm dark:bg-slate-800 dark:text-slate-100' : 'text-slate-600 hover:text-ink dark:text-slate-300 dark:hover:text-white'}`}
            onClick={() => setMode(nextMode)}
          >
            {nextMode}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button className="btn" onClick={onPrev} title={`Previous ${unit}`} aria-label={`Previous ${unit}`}><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn" onClick={onToday}>Today</button>
        <button className="btn" onClick={onNext} title={`Next ${unit}`} aria-label={`Next ${unit}`}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <span className="sr-only">{periodLabel}</span>
    </div>
  );
}

function EventChip({ item }) {
  const range = item.spans_multiple_days && item.start_date && item.end_date ? `${item.start_date} to ${item.end_date}` : '';
  return (
    <div className="overflow-hidden rounded-md border border-line bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-950">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span className="min-w-0 truncate font-semibold">{item.title}</span>
        <span className="shrink-0">
          <Badge tone={sourceTone(item.source)}>{item.source}</Badge>
        </span>
      </div>
      <p className="mt-1 truncate text-slate-500">
        {item.start_time || 'All day'}{item.end_time ? `-${item.end_time}` : ''}{item.location ? ` · ${item.location}` : ''}
      </p>
      {range && <p className="mt-1 truncate text-slate-500">{range}</p>}
    </div>
  );
}

function CalendarMonth({ items, monthDate, controls }) {
  const today = dateKey(new Date());
  const days = useMemo(() => buildMonthDays(monthDate), [monthDate]);
  const grouped = useMemo(() => groupItemsByDate(items), [items]);

  return (
    <Card
      title={monthTitle(monthDate)}
      action={controls}
    >
      <div className="grid grid-cols-7 border-l border-t border-line text-sm dark:border-slate-800">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
          <div key={label} className="border-b border-r border-line bg-slate-50 p-2 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">{label}</div>
        ))}
        {days.map((day) => {
          const key = dateKey(day);
          const isCurrentMonth = day.getMonth() === monthDate.getMonth();
          const dayItems = grouped[key] || [];
          return (
            <div key={key} className={`min-h-32 border-b border-r border-line p-2 dark:border-slate-800 ${isCurrentMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-600'}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${key === today ? 'bg-pine text-white' : ''}`}>{day.getDate()}</span>
                {dayItems.length > 3 && <span className="text-xs text-slate-500">{dayItems.length}</span>}
              </div>
              <div className="grid gap-1">
                {dayItems.slice(0, 3).map((item) => (
                  <EventChip key={`${item.source || 'local'}-${item.id}`} item={item} />
                ))}
                {dayItems.length > 3 && <p className="text-xs text-slate-500">+{dayItems.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CalendarWeek({ items, anchorDate, controls }) {
  const today = dateKey(new Date());
  const days = useMemo(() => buildWeekDays(anchorDate), [anchorDate]);
  const grouped = useMemo(() => groupItemsByDate(items), [items]);
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  function hourLabel(hour) {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }

  return (
    <Card title={weekTitle(days)} action={controls}>
      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[4.5rem_repeat(7,minmax(7rem,1fr))] border-l border-t border-line text-sm dark:border-slate-800">
            <div className="border-b border-r border-line bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950" />
            {days.map((day) => {
              const key = dateKey(day);
              return (
                <div key={key} className={`border-b border-r border-line p-2 text-center dark:border-slate-800 ${key === today ? 'bg-emerald-50 text-pine dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-50 dark:bg-slate-950'}`}>
                  <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{day.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                  <p className="mt-1 font-semibold">{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                </div>
              );
            })}
            <div className="border-b border-r border-line bg-slate-50 p-2 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">All day</div>
            {days.map((day) => {
              const key = dateKey(day);
              const dayItems = (grouped[key] || []).filter((item) => !item.start_time);
              return (
                <div key={`all-${key}`} className="min-h-20 border-b border-r border-line p-2 dark:border-slate-800">
                  <div className="grid gap-1">
                    {dayItems.map((item) => <EventChip key={`${item.source || 'local'}-${item.id}`} item={item} />)}
                  </div>
                </div>
              );
            })}
            {hours.map((hour) => (
              <div key={`hour-${hour}`} className="contents">
                <div className="min-h-24 border-b border-r border-line bg-slate-50 p-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">{hourLabel(hour)}</div>
                {days.map((day) => {
                  const key = dateKey(day);
                  const hourItems = (grouped[key] || []).filter((item) => {
                    if (!item.start_time) return false;
                    const startMinutes = timeToMinutes(item.start_time);
                    const endMinutes = timeToMinutes(item.end_time) ?? (startMinutes === null ? null : startMinutes + 60);
                    if (startMinutes === null || endMinutes === null) return false;
                    const hourStart = hour * 60;
                    const hourEnd = hourStart + 60;
                    return startMinutes < hourEnd && endMinutes > hourStart;
                  });
                  return (
                    <div key={`${key}-${hour}`} className="min-h-24 border-b border-r border-line p-2 dark:border-slate-800">
                      <div className="grid gap-1">
                        {hourItems.map((item) => <EventChip key={`${item.source || 'local'}-${item.id}`} item={item} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function CalendarPage() {
  const [status, setStatus] = useState(null);
  const [appleStatus, setAppleStatus] = useState(null);
  const [items, setItems] = useState([]);
  const [monthDate, setMonthDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [calendarId, setCalendarId] = useState('primary');
  const [appleCalendarName, setAppleCalendarName] = useState('');
  const [daysForward, setDaysForward] = useState(30);
  const [appleDaysForward, setAppleDaysForward] = useState(30);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadStatus() {
    try {
      setStatus(await api.get('/api/integrations/google-calendar/status'));
      setAppleStatus(await api.get('/api/integrations/apple-calendar/status'));
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadCalendar() {
    setLoadingCalendar(true);
    try {
      setItems(await api.get('/api/agenda?days_back=31&days_forward=365'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCalendar(false);
    }
  }

  useEffect(() => {
    loadStatus();
    loadCalendar();
  }, []);

  async function refreshCalendarViews() {
    await loadCalendar();
  }

  async function sync() {
    setError('');
    setMessage('Syncing Google Calendar events...');
    try {
      const result = await api.post('/api/integrations/google-calendar/sync', {
        calendar_id: calendarId,
        days_back: 1,
        days_forward: Number(daysForward)
      });
      setMessage(`Sync complete. Fetched ${result.fetched}, created ${result.created}, updated ${result.updated}. Reminders created ${result.reminders_created || 0}, updated ${result.reminders_updated || 0}, auto-completed ${result.reminders_auto_completed || 0}.`);
      await refreshCalendarViews();
    } catch (err) {
      setError(err.message);
      setMessage('');
    }
  }

  async function syncApple() {
    setError('');
    setMessage('Syncing Apple Calendar events...');
    try {
      const result = await api.post('/api/integrations/apple-calendar/sync', {
        calendar_name: appleCalendarName || null,
        days_back: 1,
        days_forward: Number(appleDaysForward)
      });
      setMessage(`Apple sync complete. Calendars: ${result.calendars.join(', ')}. Fetched ${result.fetched}, created ${result.created}, updated ${result.updated}, removed ${result.deleted || 0}, skipped ${result.skipped_duplicates || 0} duplicate(s). Reminders created ${result.reminders_created || 0}, updated ${result.reminders_updated || 0}, removed ${result.reminders_deleted || 0}, auto-completed ${result.reminders_auto_completed || 0}.`);
      await refreshCalendarViews();
    } catch (err) {
      setError(err.message);
      setMessage('');
    }
  }

  const calendarControls = (
    <CalendarControls
      mode={viewMode}
      setMode={setViewMode}
      periodLabel={viewMode === 'week' ? 'Week view' : 'Month view'}
      onPrev={() => {
        if (viewMode === 'week') {
          const next = new Date(monthDate);
          next.setDate(monthDate.getDate() - 7);
          setMonthDate(next);
        } else {
          setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1));
        }
      }}
      onNext={() => {
        if (viewMode === 'week') {
          const next = new Date(monthDate);
          next.setDate(monthDate.getDate() + 7);
          setMonthDate(next);
        } else {
          setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
        }
      }}
      onToday={() => setMonthDate(new Date())}
    />
  );

  return (
    <div className="grid gap-4">
      {loadingCalendar ? <Card title="Calendar"><Loading /></Card> : viewMode === 'week' ? (
        <CalendarWeek
          items={items}
          anchorDate={monthDate}
          controls={calendarControls}
        />
      ) : (
        <CalendarMonth
          items={items}
          monthDate={monthDate}
          controls={calendarControls}
        />
      )}
      <Card title="Google Calendar Sync">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1">
              <span className="label">Calendar ID</span>
              <input className="input" value={calendarId} onChange={(event) => setCalendarId(event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="label">Days forward</span>
              <input className="input" type="number" min="1" max="730" value={daysForward} onChange={(event) => setDaysForward(event.target.value)} />
            </label>
            <div className="grid gap-1">
              <span className="label">Status</span>
              <div className="rounded-md border border-line px-3 py-2 text-sm dark:border-slate-700">
                {status?.configured ? 'Client file found' : 'Client file missing'} · {status?.connected ? 'Connected' : 'Not connected'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={sync} disabled={!status?.connected}><RefreshCw className="h-4 w-4" /> Sync</button>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Uses read-only Google Calendar access. Save the shared Google OAuth client JSON and connect Calendar in Settings before syncing.
        </p>
        {message && <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}
        <div className="mt-3"><ErrorBox message={error} /></div>
      </Card>
      <Card title="Apple Calendar Sync">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1">
              <span className="label">Calendar name</span>
              <input className="input" value={appleCalendarName} onChange={(event) => setAppleCalendarName(event.target.value)} placeholder="Leave blank for all" />
            </label>
            <label className="grid gap-1">
              <span className="label">Days forward</span>
              <input className="input" type="number" min="1" max="730" value={appleDaysForward} onChange={(event) => setAppleDaysForward(event.target.value)} />
            </label>
            <div className="grid gap-1">
              <span className="label">Status</span>
              <div className="rounded-md border border-line px-3 py-2 text-sm dark:border-slate-700">
                {appleStatus?.configured ? 'Config file found' : 'Config file missing'} · CalDAV read-only
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={syncApple} disabled={!appleStatus?.configured}><CalendarSync className="h-4 w-4" /> Sync Apple</button>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Uses iCloud CalDAV with an Apple app-specific password. Save credentials in <code>backend\config\apple-calendar.json</code>. Leave calendar name blank to sync all visible calendars.
        </p>
      </Card>
    </div>
  );
}

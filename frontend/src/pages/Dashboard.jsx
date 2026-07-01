import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { Badge, Card, EmptyState, ErrorBox, Loading } from '../components/ui.jsx';

function PaginatedList({ items, titleField = 'title', dateField, pageSize = 5 }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil((items?.length || 0) / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = (items || []).slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => {
    if (page >= pageCount) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  if (!items?.length) return <EmptyState>Nothing here right now.</EmptyState>;
  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">
        {visible.map((item) => (
          <li key={`${titleField}-${item.id}`} className="flex items-start justify-between gap-3 rounded-md border border-line p-3 dark:border-slate-800">
            <div>
              <p className="font-medium">{item[titleField] || item.description || item.name}</p>
              <p className="text-xs text-slate-500">{item[dateField] || item.start_time || item.category || item.room || ''}</p>
            </div>
            {item.priority && <Badge tone={item.priority}>{item.priority}</Badge>}
          </li>
        ))}
      </ul>
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm dark:border-slate-800">
          <span className="text-xs text-slate-500">Page {safePage + 1} of {pageCount}</span>
          <div className="flex gap-2">
            <button className="btn" type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={safePage === 0}>Previous</button>
            <button className="btn" type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={safePage >= pageCount - 1}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PinnedKnowledgeBase({ notes }) {
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => {
    if (!notes?.length) {
      setSelectedNote(null);
    }
  }, [notes]);

  if (!notes?.length) return <EmptyState>No pinned KB articles yet.</EmptyState>;

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">
        {notes.map((note) => (
          <li key={note.id}>
            <button
              className={`w-full rounded-md border border-line p-3 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pine dark:border-slate-800 dark:hover:bg-slate-900 ${selectedNote?.id === note.id ? 'bg-slate-50 dark:bg-slate-900' : ''}`}
              onClick={() => setSelectedNote(note)}
            >
              <p className="font-medium">{note.title}</p>
              <p className="text-xs text-slate-500">{note.updated_at}</p>
            </button>
          </li>
        ))}
      </ul>
      {selectedNote && (
        <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{selectedNote.title}</h3>
              <p className="text-xs text-slate-500">{selectedNote.updated_at}</p>
            </div>
            <button className="btn" type="button" onClick={() => setSelectedNote(null)}>Close</button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{selectedNote.body || 'No note body.'}</p>
        </article>
      )}
    </div>
  );
}

function projectTypeLabel(value) {
  return String(value || 'general').replaceAll('_', ' ');
}

function ProjectList({ projects, tasksByProject, subtitleField }) {
  if (!projects?.length) return <EmptyState>Nothing here right now.</EmptyState>;
  return (
    <div className="grid gap-2">
      {projects.map((project) => {
        const projectTasks = tasksByProject.get((project.name || '').toLowerCase()) || [];
        return (
          <article key={project.id} className="rounded-md border border-line p-3 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{project.name}</p>
                <p className="text-xs text-slate-500">{project[subtitleField] || project.next_action || project.last_worked_at || project.status || ''}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <Badge tone="muted">{projectTypeLabel(project.category)}</Badge>
                {project.priority && <Badge tone={project.priority}>{project.priority}</Badge>}
              </div>
            </div>
            {projectTasks.length > 0 && (
              <div className="mt-3 grid gap-2">
                {projectTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="rounded-md bg-slate-50 px-2 py-1.5 text-xs dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{task.title}</span>
                      <Badge tone={task.priority}>{task.priority}</Badge>
                    </div>
                    {task.due_date && <p className="mt-1 text-slate-500">{task.due_date}</p>}
                  </div>
                ))}
                {projectTasks.length > 3 && <p className="text-xs text-slate-500">+{projectTasks.length - 3} more task(s)</p>}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ProjectMomentum({ momentum, tasks }) {
  const tasksByProject = useMemo(() => {
    const map = new Map();
    for (const task of tasks || []) {
      const key = (task.project_name || '').toLowerCase();
      if (!key) continue;
      const existing = map.get(key) || [];
      existing.push(task);
      map.set(key, existing);
    }
    return map;
  }, [tasks]);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-semibold">Active projects</p>
        <ProjectList projects={momentum?.active} tasksByProject={tasksByProject} subtitleField="next_action" />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Inactive projects</p>
        <ProjectList projects={momentum?.inactive} tasksByProject={tasksByProject} subtitleField="last_worked_at" />
      </div>
    </div>
  );
}

function formatGb(value) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} GB`;
}

function StorageMetrics({ storage }) {
  if (!storage) return <Loading />;
  if (!storage.drives?.length) return <EmptyState>No storage metrics available.</EmptyState>;
  return (
    <div className="grid gap-3">
      {storage.drives.map((drive) => (
        <div key={drive.mountpoint}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{drive.mountpoint}</span>
            <span className="font-semibold tabular-nums">{drive.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-2 rounded-full ${drive.percent >= 85 ? 'bg-red-500' : 'bg-pine'}`} style={{ width: `${Math.min(drive.percent, 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {formatGb(drive.free_gb)} free of {formatGb(drive.total_gb)}
            {drive.filesystem ? ` · ${drive.filesystem}` : ''}
          </p>
        </div>
      ))}
      <div className="rounded-md border border-line p-3 text-xs dark:border-slate-800">
        <p className="font-semibold text-ink dark:text-slate-100">Dashboard data</p>
        <p className="mt-1 text-slate-500">{storage.app_data.size_mb} MB · {storage.app_data.path}</p>
      </div>
    </div>
  );
}

export default function Dashboard({ settings }) {
  const [data, setData] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [time, setTime] = useState(new Date());
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.get('/api/dashboard').then(setData).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let active = true;
    async function loadHealth() {
      try {
        const next = await api.get('/api/system/health');
        if (active) setSystemHealth(next);
      } catch (err) {
        if (active) setError(err.message);
      }
    }
    loadHealth();
    const timer = setInterval(loadHealth, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const groupedLinks = useMemo(() => {
    const groups = {};
    for (const link of data?.links || []) {
      const category = link.category || 'General';
      groups[category] = groups[category] || [];
      groups[category].push(link);
    }
    return groups;
  }, [data]);

  const upcomingCalendarEvents = useMemo(() => {
    return (data?.next_7_days || [])
      .filter((item) => item.source !== 'reminder')
      .map((item) => ({
        ...item,
        event_date: `${item.date || 'No date'}${item.start_time ? ` · ${item.start_time}` : ''}`
      }));
  }, [data]);

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <h1 className="text-3xl font-bold">Today</h1>
        </div>
        <div className="text-2xl font-semibold tabular-nums">{time.toLocaleTimeString(undefined, { hour12: settings?.time_format !== '24h' })}</div>
      </header>
      <ErrorBox message={error} />
      {!data ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 lg:col-span-2">
            <Card title="System Health">
              {!systemHealth ? <Loading /> : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 md:col-span-2">
                    <span className="text-sm text-slate-500">{systemHealth.host}</span>
                    <Badge tone={systemHealth.status === 'healthy' ? 'low' : systemHealth.status === 'watch' ? 'medium' : 'high'}>{systemHealth.status}</Badge>
                  </div>
                  <div className="metric-panel">
                    <div className="mb-1 flex justify-between text-sm">
                      <span>CPU</span>
                      <span className="font-semibold tabular-nums">{systemHealth.cpu_percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-pine" style={{ width: `${Math.min(systemHealth.cpu_percent, 100)}%` }} />
                    </div>
                  </div>
                  <div className="metric-panel">
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Memory</span>
                      <span className="font-semibold tabular-nums">{systemHealth.memory_percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-gold" style={{ width: `${Math.min(systemHealth.memory_percent, 100)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{systemHealth.memory_used_gb} GB of {systemHealth.memory_total_gb} GB · {systemHealth.processor_count} logical CPUs</p>
                  </div>
                </div>
              )}
            </Card>
            <Card title="Project Momentum"><ProjectMomentum momentum={data.project_momentum} tasks={data.project_tasks} /></Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Upcoming Calendar Events"><PaginatedList items={upcomingCalendarEvents} dateField="event_date" /></Card>
              <Card title="Upcoming Bills">
                <p className="mb-3 text-sm text-slate-500">Monthly total: <span className="font-semibold text-ink dark:text-slate-100">${data.bills.monthly_total.toFixed(2)}</span></p>
                <PaginatedList items={data.bills.next_7} titleField="name" dateField="due_date" />
              </Card>
            </div>
          </div>
          <div className="grid content-start gap-4">
            <Card title="Storage Metrics"><StorageMetrics storage={systemHealth?.storage} /></Card>
            <Card title="Pinned KB Articles"><PinnedKnowledgeBase notes={data.notes} /></Card>
            <Card title="Quick Links">
              {data.favorite_links?.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 text-sm font-semibold">Favorites</p>
                  <div className="flex flex-wrap gap-2">
                    {data.favorite_links.map((link) => <a key={link.id} className="btn" href={link.url} target="_blank" rel="noreferrer">{link.local_network ? 'Local Network · ' : ''}{link.name}</a>)}
                  </div>
                </div>
              )}
              {data.recent_links?.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 text-sm font-semibold">Recently used</p>
                  <div className="flex flex-wrap gap-2">
                    {data.recent_links.map((link) => <a key={link.id} className="btn" href={link.url} target="_blank" rel="noreferrer">{link.name}</a>)}
                  </div>
                </div>
              )}
              {Object.keys(groupedLinks).length === 0 ? <EmptyState>No quick links yet.</EmptyState> : Object.entries(groupedLinks).map(([category, links]) => (
                <div key={category} className="mb-3">
                  <p className="mb-2 text-sm font-semibold">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {links.map((link) => <a key={link.id} className="btn" href={link.url} target="_blank" rel="noreferrer">{link.local_network ? 'Local Network · ' : ''}{link.name}</a>)}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

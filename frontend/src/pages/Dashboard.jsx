import { useEffect, useMemo, useState } from 'react';
import { GripVertical } from 'lucide-react';
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

function ProjectColumn({ projects, tasksByProject, status, label, draggingId, dragTarget, onDragStart, onDragEnd, onDragOver, onDrop, onStatusChange }) {
  return (
    <section
      data-project-status={status}
      className={`flex min-h-64 flex-col rounded-lg border p-3 transition ${dragTarget === status ? 'border-pine bg-emerald-50/70 ring-2 ring-pine/20 dark:bg-emerald-950/20' : 'border-line bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40'}`}
      onDragEnter={(event) => onDragOver(event, status)}
      onDragOver={(event) => onDragOver(event, status)}
      onDrop={(event) => onDrop(event, status)}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold">{label}</h3>
        <span className="text-xs font-medium text-slate-500">{projects?.length || 0} {(projects?.length || 0) === 1 ? 'project' : 'projects'}</span>
      </div>
      {!projects?.length ? (
        <div className="flex min-h-48 flex-1 items-center justify-center rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Drop a project here.
        </div>
      ) : <div className="grid flex-1 content-start gap-2">
        {projects.map((project) => {
        const projectTasks = tasksByProject.get((project.name || '').toLowerCase()) || [];
        return (
          <article
            key={project.id}
            draggable
            onDragStart={(event) => onDragStart(event, project)}
            onDragEnd={onDragEnd}
            className={`cursor-grab rounded-md border border-line bg-white p-3 transition active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900 ${draggingId === project.id ? 'scale-[0.98] opacity-40' : 'hover:border-slate-300 dark:hover:border-slate-600'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a draggable="false" className="font-semibold underline-offset-2 hover:text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine" href={`#/projects?project=${project.id}`}>{project.name}</a>
              </div>
              <span
                className="shrink-0 rounded p-1 text-slate-400"
                title={`Drag ${project.name} to another status`}
                aria-hidden="true"
              >
                <GripVertical className="h-5 w-5" />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="min-w-0"><dt className="label">Type</dt><dd className="mt-0.5 capitalize text-slate-700 dark:text-slate-200">{projectTypeLabel(project.category)}</dd></div>
              <div className="min-w-0"><dt className="label">Priority</dt><dd className="mt-0.5 capitalize text-slate-700 dark:text-slate-200">{project.priority || 'None'}</dd></div>
            </dl>
            <label className="mt-3 grid gap-1 border-t border-line pt-3 dark:border-slate-800">
              <span className="label">Project status</span>
              <select
                className="input w-full text-sm"
                value={project.status}
                onChange={(event) => onStatusChange(project.id, event.target.value)}
              >
                <option value="active">Active</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            {projectTasks.length > 0 && (
              <div className="mt-3 grid gap-2 border-t border-line pt-3 dark:border-slate-800">
                <p className="label">Open tasks</p>
                {projectTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="border-t border-line pt-2 first:border-0 first:pt-0 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{task.title}</span>
                      <span className="shrink-0 text-xs capitalize text-slate-500">{task.priority || 'No priority'}</span>
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
      </div>}
    </section>
  );
}

function ProjectStatusDashboard({ momentum, tasks, onStatusChange }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
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

  function handleDragStart(event, project) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/project-id', String(project.id));
    event.dataTransfer.setData('text/plain', String(project.id));
    setDraggingId(project.id);
  }

  function handleDragOver(event, status) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragTarget(status);
  }

  async function handleDrop(event, status) {
    event.preventDefault();
    const projectId = Number(event.dataTransfer.getData('text/project-id') || event.dataTransfer.getData('text/plain'));
    setDragTarget(null);
    setDraggingId(null);
    if (projectId) await onStatusChange(projectId, status);
  }

  const columns = [
    { status: 'active', label: 'Active' },
    { status: 'in_progress', label: 'In progress' },
    { status: 'completed', label: 'Completed' }
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {columns.map((column) => (
        <ProjectColumn
          key={column.status}
          {...column}
          projects={momentum?.[column.status] || []}
          tasksByProject={tasksByProject}
          draggingId={draggingId}
          dragTarget={dragTarget}
          onDragStart={handleDragStart}
          onDragEnd={() => { setDraggingId(null); setDragTarget(null); }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onStatusChange={onStatusChange}
        />
      ))}
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

function DashboardPanel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-lg border border-line bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 ${className}`}>
      <div className="mb-3">
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard({ settings }) {
  const [data, setData] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [time, setTime] = useState(new Date());
  const [error, setError] = useState('');

  async function loadDashboard() {
    setData(await api.get('/api/dashboard'));
  }

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboard().catch((err) => setError(err.message));
  }, []);

  async function updateProjectStatus(projectId, status) {
    setError('');
    const previousData = data;
    const statuses = ['active', 'in_progress', 'completed'];
    const project = statuses.flatMap((key) => data?.project_momentum?.[key] || []).find((item) => item.id === projectId);
    if (!project || project.status === status) return;
    setData((current) => ({
      ...current,
      project_momentum: {
        ...current.project_momentum,
        ...Object.fromEntries(statuses.map((key) => [
          key,
          key === status
            ? [...(current.project_momentum[key] || []).filter((item) => item.id !== projectId), { ...project, status }]
            : (current.project_momentum[key] || []).filter((item) => item.id !== projectId)
        ]))
      }
    }));
    try {
      await api.put(`/api/projects/${projectId}`, { status });
      await loadDashboard();
    } catch (err) {
      setData(previousData);
      setError(err.message);
    }
  }

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
        <div className="grid gap-4">
          <Card title="Project Status Dashboard">
            <ProjectStatusDashboard momentum={data.project_momentum} tasks={data.project_tasks} onStatusChange={updateProjectStatus} />
          </Card>
          <Card title="System Overview">
            {!systemHealth ? <Loading /> : (
              <div className="grid gap-4 lg:grid-cols-3">
                <DashboardPanel title="System Health" subtitle={systemHealth.host} className="lg:col-span-2">
                  <div className="mb-3 flex justify-end">
                    <Badge tone={systemHealth.status === 'healthy' ? 'low' : systemHealth.status === 'watch' ? 'medium' : 'high'}>{systemHealth.status}</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="metric-panel">
                      <div className="mb-1 flex justify-between text-sm"><span>CPU</span><span className="font-semibold tabular-nums">{systemHealth.cpu_percent}%</span></div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-pine" style={{ width: `${Math.min(systemHealth.cpu_percent, 100)}%` }} /></div>
                    </div>
                    <div className="metric-panel">
                      <div className="mb-1 flex justify-between text-sm"><span>Memory</span><span className="font-semibold tabular-nums">{systemHealth.memory_percent}%</span></div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-gold" style={{ width: `${Math.min(systemHealth.memory_percent, 100)}%` }} /></div>
                      <p className="mt-2 text-xs text-slate-500">{systemHealth.memory_used_gb} GB of {systemHealth.memory_total_gb} GB · {systemHealth.processor_count} logical CPUs</p>
                    </div>
                  </div>
                </DashboardPanel>
                <DashboardPanel title="Storage" subtitle="Local drive capacity">
                  <StorageMetrics storage={systemHealth.storage} />
                </DashboardPanel>
              </div>
            )}
          </Card>
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <Card title="Upcoming" className="lg:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <DashboardPanel title="Calendar Events" subtitle="Next 7 days">
                  <PaginatedList items={upcomingCalendarEvents} dateField="event_date" />
                </DashboardPanel>
                <DashboardPanel title="Bills" subtitle="Due soon">
                <p className="mb-3 text-sm text-slate-500">Monthly total: <span className="font-semibold text-ink dark:text-slate-100">${data.bills.monthly_total.toFixed(2)}</span></p>
                <PaginatedList items={data.bills.next_7} titleField="name" dateField="due_date" />
                </DashboardPanel>
              </div>
            </Card>
            <Card title="Pinned Resources">
              <div className="grid gap-4">
                <DashboardPanel title="Articles"><PinnedKnowledgeBase notes={data.notes} /></DashboardPanel>
                <DashboardPanel title="Links">
                  {!data.favorite_links?.length ? <EmptyState>No pinned links yet.</EmptyState> : (
                    <div className="flex flex-wrap gap-2">
                      {data.favorite_links.map((link) => (
                        <a key={link.id} className="btn" href={link.url} target="_blank" rel="noreferrer">
                          {link.local_network ? 'Local Network · ' : ''}{link.name}
                        </a>
                      ))}
                    </div>
                  )}
                </DashboardPanel>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

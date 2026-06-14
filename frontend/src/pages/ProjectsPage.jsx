import { useEffect, useMemo, useState } from 'react';
import EntityForm from '../components/EntityForm.jsx';
import { Badge, Card, EmptyState, ErrorBox, Loading } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { entityConfig } from '../lib/config.js';

function copyText(value) {
  if (!value) return;
  navigator.clipboard?.writeText(value);
}

function normalizedProjectStatus(project) {
  if (project.status === 'planned' || project.status === 'blocked') return 'inactive';
  if (project.status === 'shipped') return 'completed';
  return project.status || 'active';
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [taskForm, setTaskForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [nextProjects, nextTasks] = await Promise.all([api.get('/api/projects'), api.get('/api/project-tasks')]);
      setProjects(nextProjects);
      setTasks(nextTasks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visibleProjects = useMemo(() => {
    if (filter === 'all') return projects;
    return projects.filter((project) => normalizedProjectStatus(project) === filter);
  }, [filter, projects]);

  const tasksByProject = useMemo(() => tasks.reduce((grouped, task) => {
    const key = (task.project_name || '').trim().toLowerCase();
    if (!key) return grouped;
    return { ...grouped, [key]: [...(grouped[key] || []), task] };
  }, {}), [tasks]);

  async function saveProject(event) {
    event.preventDefault();
    try {
      if (editing) await api.put(`/api/projects/${editing.id}`, form);
      else await api.post('/api/projects', form);
      setForm(null);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveTask(event) {
    event.preventDefault();
    try {
      await api.post('/api/project-tasks', taskForm);
      setTaskForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function action(path, body = {}) {
    try {
      await api.post(path, body);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function archive(project) {
    if (!window.confirm(`Archive "${project.name}"?`)) return;
    await action(`/api/projects/${project.id}/archive`);
  }

  async function updateNext(project) {
    const next = window.prompt('Next action', project.next_action || project.next_step || '');
    if (!next) return;
    await action(`/api/projects/${project.id}/next-action`, { next_action: next });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Project Momentum</h1>
          <p className="text-sm text-slate-500">Track active work, inactive projects, commands, Codex prompts, and next actions.</p>
        </div>
        <div className="flex gap-2">
          <select className="input max-w-36" value={filter} onChange={(event) => setFilter(event.target.value)}>
            {['active', 'inactive', 'completed', 'archived', 'all'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ ...entityConfig.projects.empty }); }}>Add project</button>
        </div>
      </div>
      <ErrorBox message={error} />
      {form && (
        <Card title={editing ? 'Edit project' : 'New project'}>
          <EntityForm fields={entityConfig.projects.fields} value={form} onChange={setForm} onSubmit={saveProject} onCancel={() => { setForm(null); setEditing(null); }} submitLabel={editing ? 'Save project' : 'Create project'} />
        </Card>
      )}
      {taskForm && (
        <Card title="New project task">
          <EntityForm fields={entityConfig.projectTasks.fields} value={taskForm} onChange={setTaskForm} onSubmit={saveTask} onCancel={() => setTaskForm(null)} submitLabel="Create task" />
        </Card>
      )}
      <Card title="Projects">
        {loading ? <Loading /> : visibleProjects.length === 0 ? <EmptyState>No projects in this view.</EmptyState> : (
          <div className="grid gap-3">
            {visibleProjects.map((project) => (
              <article key={project.id} className="rounded-md border border-line p-3 dark:border-slate-800">
                {(() => {
                  const projectTasks = tasksByProject[(project.name || '').trim().toLowerCase()] || [];
                  return (
                    <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{project.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{project.goal || project.description || 'No goal set.'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{project.category || 'codex'}</Badge>
                      <Badge tone={project.priority}>{project.priority}</Badge>
                      <Badge tone="muted">{normalizedProjectStatus(project)}</Badge>
                      {project.last_worked_at && <Badge tone="muted">worked {project.last_worked_at}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn" onClick={() => action(`/api/projects/${project.id}/mark-worked`)}>Worked today</button>
                    <button className="btn" onClick={() => { setEditing(project); setForm({ ...project }); }}>Edit</button>
                    {project.status !== 'archived' && <button className="btn btn-danger" onClick={() => archive(project)}>Archive</button>}
                  </div>
                </div>
                <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <div><dt className="label">Next action</dt><dd>{project.next_action || project.next_step || 'None'}</dd></div>
                  <div><dt className="label">Blocker</dt><dd>{project.blocker || 'None'}</dd></div>
                  <div><dt className="label">Local path</dt><dd className="break-all">{project.local_path || project.codex_workspace_path || 'None'}</dd></div>
                  <div><dt className="label">Repo</dt><dd className="break-all">{project.repo_url || project.repository_url || 'None'}</dd></div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn" onClick={() => updateNext(project)}>Update next action</button>
                  <button className="btn" onClick={() => setTaskForm({ ...entityConfig.projectTasks.empty, project_name: project.name })}>Add task</button>
                  <button className="btn" onClick={() => copyText(project.frontend_command)}>Copy frontend command</button>
                  <button className="btn" onClick={() => copyText(project.backend_command)}>Copy backend command</button>
                  <button className="btn" onClick={() => copyText(project.codex_prompt)}>Copy Codex prompt</button>
                  {(project.repo_url || project.repository_url) && <a className="btn" href={project.repo_url || project.repository_url} target="_blank" rel="noreferrer">Open repo</a>}
                </div>
                <div className="mt-4 border-t border-line pt-3 dark:border-slate-800">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Tasks</h3>
                    <Badge tone="muted">{projectTasks.length}</Badge>
                  </div>
                  {projectTasks.length === 0 ? <p className="text-sm text-slate-500">No open tasks for this project.</p> : (
                    <div className="grid gap-2">
                      {projectTasks.map((task) => (
                        <div key={task.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-line p-3 dark:border-slate-800">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-slate-500">{task.due_date || 'No due date'}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge tone={task.priority}>{task.priority}</Badge>
                            <button className="btn" onClick={() => action(`/api/project-tasks/${task.id}/complete`)}>Complete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                    </>
                  );
                })()}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

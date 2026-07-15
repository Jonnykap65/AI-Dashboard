import { useEffect, useMemo, useState } from 'react';
import EntityForm from '../components/EntityForm.jsx';
import { Card, EmptyState, ErrorBox, Loading, QuietAction, RecordDetailsToggle, quietActionClass } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { entityConfig } from '../lib/config.js';

const projectTemplates = {
  General: {
    category: 'general',
    goal: 'Outcome:\n\nScope:\n\nDone when:\n',
    notes: 'Context:\n\nConstraints:\n\nResources:\n'
  },
  Work: {
    category: 'work',
    goal: 'Business outcome:\n\nStakeholders:\n\nSuccess criteria:\n',
    notes: 'Decisions:\n\nDependencies:\n\nStatus notes:\n'
  },
  Home: {
    category: 'home',
    goal: 'Household outcome:\n\nRooms or areas:\n\nBudget:\n',
    notes: 'Materials:\n\nAppointments:\n\nReceipts or references:\n'
  },
  Learning: {
    category: 'learning',
    goal: 'Skill or topic:\n\nTarget level:\n\nCompletion evidence:\n',
    notes: 'Resources:\n\nPractice plan:\n\nQuestions:\n'
  },
  Maintenance: {
    category: 'maintenance',
    goal: 'System or item:\n\nMaintenance objective:\n\nService interval:\n',
    notes: 'Checklist:\n1. \n\nParts/tools:\n\nValidation:\n'
  },
  Event: {
    category: 'event',
    goal: 'Event outcome:\n\nDate/location:\n\nGuest or participant needs:\n',
    notes: 'Agenda:\n\nVendors:\n\nFollow-up:\n'
  },
  Software: {
    category: 'software',
    goal: 'User outcome:\n\nScope:\n\nRelease criteria:\n',
    notes: 'Architecture notes:\n\nRisks:\n\nValidation:\n'
  },
  Codex: {
    category: 'codex',
    goal: 'Goal:\n\nContext:\n\nDefinition of done:\n',
    codex_prompt: 'Goal:\n\nContext:\n\nFiles to inspect:\n\nConstraints:\n\nValidation required:\n'
  }
};

const technicalProjectTypes = new Set(['codex', 'software']);
const technicalFieldNames = new Set(['local_path', 'repo_url', 'frontend_command', 'backend_command', 'codex_prompt']);

function copyText(value) {
  if (!value) return;
  navigator.clipboard?.writeText(value);
}

function normalizedProjectStatus(project) {
  if (project.status === 'planned' || project.status === 'blocked' || project.status === 'inactive') return 'in_progress';
  if (project.status === 'shipped') return 'completed';
  return project.status || 'active';
}

export default function ProjectsPage() {
  const requestedProjectId = Number(new URLSearchParams(window.location.hash.split('?')[1] || '').get('project')) || null;
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [taskForm, setTaskForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(requestedProjectId ? 'all' : 'active');
  const [expandedProjects, setExpandedProjects] = useState(() => new Set());

  const projectFields = useMemo(() => {
    const category = form?.category || entityConfig.projects.empty.category;
    if (technicalProjectTypes.has(category)) return entityConfig.projects.fields;
    return entityConfig.projects.fields.filter((field) => !technicalFieldNames.has(field.name));
  }, [form]);

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

  useEffect(() => {
    if (!loading && requestedProjectId) {
      document.getElementById(`project-${requestedProjectId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading, requestedProjectId]);

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

  async function deleteProject(project) {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/projects/${project.id}`);
      if (editing?.id === project.id) {
        setForm(null);
        setEditing(null);
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startProject(templateName = 'General') {
    const template = projectTemplates[templateName] || projectTemplates.General;
    setEditing(null);
    setForm({ ...entityConfig.projects.empty, ...template });
  }

  function applyProjectTemplate(templateName) {
    const template = projectTemplates[templateName];
    setForm((current) => ({ ...(current || entityConfig.projects.empty), ...(template || {}) }));
  }

  function projectTypeLabel(value) {
    return String(value || 'general').replaceAll('_', ' ');
  }

  function hasTechnicalDetails(project) {
    return Boolean(
      project.local_path ||
      project.codex_workspace_path ||
      project.repo_url ||
      project.repository_url ||
      project.frontend_command ||
      project.backend_command ||
      project.codex_prompt ||
      technicalProjectTypes.has(project.category)
    );
  }

  function toggleProject(projectId) {
    setExpandedProjects((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Project Momentum</h1>
          <p className="text-sm text-slate-500">Track general, home, work, learning, software, and Codex projects with the right fields for each type.</p>
        </div>
        <div className="flex gap-2">
          <select className="input max-w-36" value={filter} onChange={(event) => setFilter(event.target.value)}>
            {['active', 'in_progress', 'completed', 'archived', 'all'].map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => startProject()}>Add project</button>
        </div>
      </div>
      <ErrorBox message={error} />
      {form && (
        <Card title={editing ? 'Edit project' : 'New project'}>
          {!editing && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="label">Template</span>
              {Object.keys(projectTemplates).map((name) => (
                <button key={name} type="button" className="btn" onClick={() => applyProjectTemplate(name)}>{name}</button>
              ))}
            </div>
          )}
          <EntityForm fields={projectFields} value={form} onChange={setForm} onSubmit={saveProject} onCancel={() => { setForm(null); setEditing(null); }} submitLabel={editing ? 'Save project' : 'Create project'} />
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
              <article id={`project-${project.id}`} key={project.id} className={`rounded-md border p-3 ${requestedProjectId === project.id ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-line dark:border-slate-800'}`}>
                {(() => {
                  const projectTasks = tasksByProject[(project.name || '').trim().toLowerCase()] || [];
                  const isExpanded = expandedProjects.has(project.id);
                  return (
                    <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{project.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.goal || project.description || 'No goal set.'}</p>
                  </div>
                  <RecordDetailsToggle
                    open={isExpanded}
                    onToggle={() => toggleProject(project.id)}
                    controls={`project-details-${project.id}`}
                    label={`${project.name} details`}
                  />
                </div>
                <dl className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div className="min-w-0"><dt className="label">Type</dt><dd className="mt-0.5 capitalize text-slate-700 dark:text-slate-200">{projectTypeLabel(project.category)}</dd></div>
                  <div className="min-w-0"><dt className="label">Priority</dt><dd className="mt-0.5 capitalize text-slate-700 dark:text-slate-200">{project.priority || 'None'}</dd></div>
                  <div className="min-w-0"><dt className="label">Status</dt><dd className="mt-0.5 capitalize text-slate-700 dark:text-slate-200">{normalizedProjectStatus(project).replaceAll('_', ' ')}</dd></div>
                  <div className="min-w-0"><dt className="label">Last worked</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{project.last_worked_at || 'Not recorded'}</dd></div>
                </dl>
                {isExpanded && <div id={`project-details-${project.id}`}>
                <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-line pt-4 text-sm dark:border-slate-800 md:grid-cols-2">
                  <div><dt className="label">Next action</dt><dd>{project.next_action || project.next_step || 'None'}</dd></div>
                  <div><dt className="label">Blocker</dt><dd>{project.blocker || 'None'}</dd></div>
                  {project.due_date && <div><dt className="label">Target date</dt><dd><a className="font-medium text-pine underline-offset-2 hover:underline dark:text-emerald-300" href={`#/calendar?date=${project.due_date}`}>{project.due_date}</a></dd></div>}
                  {project.tags && <div><dt className="label">Tags</dt><dd>{project.tags}</dd></div>}
                  {hasTechnicalDetails(project) && (
                    <>
                      <div><dt className="label">Local path</dt><dd className="break-all">{project.local_path || project.codex_workspace_path || 'None'}</dd></div>
                      <div><dt className="label">Repo</dt><dd className="break-all">{project.repo_url || project.repository_url || 'None'}</dd></div>
                    </>
                  )}
                </dl>
                <div className="mt-4 border-t border-line pt-3 dark:border-slate-800">
                  <p className="label">Project tools</p>
                  <div className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                    <QuietAction tone="positive" onClick={() => setTaskForm({ ...entityConfig.projectTasks.empty, project_name: project.name })}>Add task</QuietAction>
                    {project.frontend_command && <QuietAction onClick={() => copyText(project.frontend_command)}>Copy frontend command</QuietAction>}
                    {project.backend_command && <QuietAction onClick={() => copyText(project.backend_command)}>Copy backend command</QuietAction>}
                    {project.codex_prompt && <QuietAction onClick={() => copyText(project.codex_prompt)}>Copy Codex prompt</QuietAction>}
                    {(project.repo_url || project.repository_url) && <a className={quietActionClass} href={project.repo_url || project.repository_url} target="_blank" rel="noreferrer">Open repository</a>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 border-t border-line pt-3 dark:border-slate-800">
                  <QuietAction tone="positive" onClick={() => action(`/api/projects/${project.id}/mark-worked`)}>Mark worked today</QuietAction>
                  <QuietAction onClick={() => { setEditing(project); setForm({ ...project }); }}>Edit project</QuietAction>
                  {project.status !== 'archived' && <QuietAction tone="destructive" onClick={() => archive(project)}>Archive project</QuietAction>}
                  <QuietAction tone="destructive" onClick={() => deleteProject(project)}>Delete project</QuietAction>
                </div>
                <div className="mt-4 border-t border-line pt-3 dark:border-slate-800">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Tasks</h3>
                    <span className="text-xs font-medium text-slate-500">{projectTasks.length} {projectTasks.length === 1 ? 'task' : 'tasks'}</span>
                  </div>
                  {projectTasks.length === 0 ? <p className="text-sm text-slate-500">No open tasks for this project.</p> : (
                    <div className="grid gap-2">
                      {projectTasks.map((task) => (
                        <article key={task.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-line p-3 dark:border-slate-800">
                          <div className="min-w-0">
                            <p className="font-medium">{task.title}</p>
                            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                              <div><dt className="label">Due</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{task.due_date || 'No due date'}</dd></div>
                              <div><dt className="label">Priority</dt><dd className="mt-0.5 capitalize text-slate-700 dark:text-slate-200">{task.priority || 'None'}</dd></div>
                            </dl>
                          </div>
                          <QuietAction className="self-end" tone="positive" onClick={() => action(`/api/project-tasks/${task.id}/complete`)}>Mark complete</QuietAction>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                </div>}
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

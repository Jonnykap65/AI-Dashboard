import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Badge, Card, EmptyState, ErrorBox } from '../components/ui.jsx';

const routes = {
  calendar: '/calendar',
  bill: '/bills',
  knowledge_base: '/notes',
  link: '/notes',
  project: '/projects',
  project_task: '/projects',
  asset: '/system',
  speed_test: '/tools',
  daily_plan: '/'
};

const hiddenTypes = new Set(['reminder', 'inbox', 'security_record']);

export default function SearchPage({ setRoute }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!q.trim()) return;
    setError('');
    try {
      const nextResults = await api.get(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(nextResults.filter((result) => !hiddenTypes.has(result.type)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function createReminder(result) {
    try {
      await api.post('/api/search/actions/create-reminder', { result_type: result.type, result_id: result.id });
    } catch (err) {
      setError(err.message);
    }
  }

  async function attachToProject(result) {
    if (!projectId) return;
    try {
      await api.post('/api/search/actions/attach-to-project', { result_type: result.type, result_id: result.id, project_id: Number(projectId) });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">Global Search</h1>
        <p className="text-sm text-slate-500">Search calendar, bills, projects, Knowledge Base articles, assets, links, and daily plans.</p>
      </div>
      <ErrorBox message={error} />
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-2 md:flex-row">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search operations data" />
          <button className="btn btn-primary">Search</button>
        </form>
      </Card>
      <Card title="Results" action={
        <select className="input max-w-56" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Attach target project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      }>
        {results.length === 0 ? <EmptyState>No results yet.</EmptyState> : (
          <div className="grid gap-2">
            {results.map((result) => (
              <article key={`${result.type}-${result.id}`} className="rounded-md border border-line p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{result.type}</Badge>
                      {result.status && <Badge tone="muted">{result.status}</Badge>}
                      <span className="font-medium">{result.title}</span>
                    </div>
                    {result.snippet && <p className="mt-2 text-sm text-slate-500">{result.snippet}</p>}
                  </div>
                  <span className="text-sm text-slate-500">{result.relevant_date || 'No date'}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.type === 'link' ? <a className="btn" href={result.action_target} target="_blank" rel="noreferrer">Open</a> : <button className="btn" onClick={() => setRoute(routes[result.type] || '/')}>Open</button>}
                  <button className="btn" onClick={() => setRoute(routes[result.type] || '/')}>Edit</button>
                  {result.copy_link && <button className="btn" onClick={() => navigator.clipboard?.writeText(result.copy_link)}>Copy link</button>}
                  <button className="btn" onClick={() => createReminder(result)}>Create reminder</button>
                  {result.can_attach_to_project && <button className="btn" disabled={!projectId} onClick={() => attachToProject(result)}>Attach to project</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

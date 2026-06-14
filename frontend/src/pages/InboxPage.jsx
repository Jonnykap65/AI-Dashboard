import { useEffect, useMemo, useState } from 'react';
import EntityForm from '../components/EntityForm.jsx';
import { Badge, Card, EmptyState, ErrorBox, Loading } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { entityConfig } from '../lib/config.js';

const targets = ['reminder', 'note', 'project task', 'calendar item', 'link'];

export default function InboxPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ raw_text: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('new');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setItems(await api.get('/api/inbox'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  async function save(event) {
    event.preventDefault();
    try {
      if (editing) {
        await api.put(`/api/inbox/${editing.id}`, form);
      } else {
        await api.post('/api/inbox', form);
      }
      setForm({ raw_text: '' });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function convert(item, target) {
    const payload = { target_type: target };
    if (target === 'calendar item') payload.date = new Date().toISOString().slice(0, 10);
    if (target === 'link') {
      const url = item.raw_text.split(/\s+/).find((part) => part.startsWith('http://') || part.startsWith('https://'));
      if (url) payload.url = url;
    }
    try {
      await api.post(`/api/inbox/${item.id}/convert`, payload);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function archive(item) {
    if (!window.confirm('Archive this inbox item?')) return;
    try {
      await api.put(`/api/inbox/${item.id}`, { status: 'archived' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-slate-500">Capture first, then convert into the right local record.</p>
        </div>
        <select className="input max-w-40" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="new">new</option>
          <option value="processed">processed</option>
          <option value="archived">archived</option>
          <option value="all">all</option>
        </select>
      </div>
      <ErrorBox message={error} />
      <Card title={editing ? 'Edit capture' : 'Quick capture'}>
        <EntityForm
          fields={editing ? entityConfig.inbox.fields : [{ name: 'raw_text', label: 'Captured text', type: 'textarea', required: true }]}
          value={form}
          onChange={setForm}
          onSubmit={save}
          onCancel={() => { setForm({ raw_text: '' }); setEditing(null); }}
          submitLabel={editing ? 'Save changes' : 'Capture'}
        />
      </Card>
      <Card title="Items">
        {loading ? <Loading /> : visible.length === 0 ? <EmptyState>No inbox items in this view.</EmptyState> : (
          <div className="grid gap-3">
            {visible.map((item) => (
              <article key={item.id} className="rounded-md border border-line p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="whitespace-pre-wrap font-medium">{item.raw_text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{item.suggested_type}</Badge>
                      <Badge tone={item.priority}>{item.priority}</Badge>
                      <Badge tone="muted">{item.status}</Badge>
                      {item.tags && <Badge tone="muted">{item.tags}</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{item.created_at}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {targets.map((target) => <button key={target} className="btn" onClick={() => convert(item, target)}>Convert to {target}</button>)}
                  <button className="btn" onClick={() => { setEditing(item); setForm({ ...item }); }}>Edit</button>
                  {item.status !== 'archived' && <button className="btn btn-danger" onClick={() => archive(item)}>Archive</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

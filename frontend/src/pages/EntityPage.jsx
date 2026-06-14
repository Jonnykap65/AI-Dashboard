import { useEffect, useMemo, useState } from 'react';
import EntityForm from '../components/EntityForm.jsx';
import { Badge, Card, EmptyState, ErrorBox, Icons, Loading } from '../components/ui.jsx';
import { api } from '../lib/api.js';

export default function EntityPage({ config, description = 'Add, update, complete, and delete local records.', onItemsChange }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const showDateColumn = config.dateField && config.showDateColumn !== false;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const loaded = await api.get(config.path);
      setItems(loaded);
      if (onItemsChange) onItemsChange(loaded);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [config.path]);

  const visible = useMemo(() => {
    const q = filter.toLowerCase();
    const scoped = config.filterItem ? items.filter(config.filterItem) : items;
    if (!q) return scoped;
    return scoped.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }, [config, filter, items]);

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      const payload = config.prepareSubmit ? config.prepareSubmit(form) : form;
      if (editing) {
        await api.put(`${config.path}/${editing.id}`, payload);
      } else {
        await api.post(config.path, payload);
      }
      setForm(null);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    const title = item[config.titleField] || 'record';
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`${config.path}/${item.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function complete(item) {
    try {
      await api.post(config.completePath(item.id), {});
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function convertNote(item, targetType) {
    try {
      const payload = { target_type: targetType };
      if (targetType === 'calendar item') payload.date = new Date().toISOString().slice(0, 10);
      if (targetType === 'link') {
        const url = `${item.title} ${item.body || ''}`.split(/\s+/).find((part) => part.startsWith('http://') || part.startsWith('https://'));
        if (url) payload.url = url;
      }
      await api.post(`/api/notes/${item.id}/convert`, payload);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openLink(item) {
    window.open(item.url, '_blank', 'noopener,noreferrer');
    try {
      await api.post(`/api/links/${item.id}/opened`, {});
      await load();
    } catch {
      // Opening the link is the primary action; usage metadata can retry later.
    }
  }

  function startEdit(item) {
    setEditing(item);
    setForm({ ...item });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{config.label}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ ...config.empty }); }}>
          <Icons.Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <ErrorBox message={error} />
      {form && (
        <Card title={editing ? 'Edit record' : 'New record'}>
          <EntityForm fields={config.fields} value={form} onChange={setForm} onSubmit={save} onCancel={() => { setForm(null); setEditing(null); }} submitLabel={editing ? 'Save changes' : 'Create'} />
        </Card>
      )}
      <Card title="Records" action={<input className="input max-w-xs" placeholder="Filter this page" value={filter} onChange={(e) => setFilter(e.target.value)} />}>
        {loading ? <Loading /> : visible.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-2 pr-3">Title</th>
                  {showDateColumn && <th className="py-2 pr-3">{config.dateLabel || 'Date'}</th>}
                  {config.columns?.map((column) => <th key={column.key} className="py-2 pr-3">{column.label}</th>)}
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Details</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id} className="border-b border-line align-top dark:border-slate-800">
                    <td className="py-3 pr-3 font-medium">{item[config.titleField] || 'Untitled'}</td>
                    {showDateColumn && <td className="py-3 pr-3">{item[config.dateField] || 'No date'}</td>}
                    {config.columns?.map((column) => (
                      <td key={column.key} className="py-3 pr-3 font-medium tabular-nums">
                        {column.render ? column.render(item) : item[column.key]}
                      </td>
                    ))}
                    <td className="py-3 pr-3">
                      {item.priority && <Badge tone={item.priority}>{item.priority}</Badge>} {item.status && <Badge tone="muted">{item.status}</Badge>}
                    </td>
                    <td className="max-w-md py-3 pr-3 text-slate-600 dark:text-slate-300">
                      {config.detailsField ? item[config.detailsField] : item.source === 'google' ? 'Google Calendar' : item.source === 'apple' ? 'Apple Calendar' : item.source === 'gmail' ? 'Gmail bill discovery' : item.category || item.room || item.tags || item.billing_cycle || item.location || item.codex_workspace_path || ''}
                      {item.url && <button className="ml-2 text-pine underline" type="button" onClick={() => openLink(item)}>Open</button>}
                      {item.url && item.local_network && <Badge tone="muted">Local Network</Badge>}
                      {item.repository_url && <a className="ml-2 text-pine underline" href={item.repository_url} target="_blank" rel="noreferrer">Repo</a>}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {config.completePath && item.status !== 'completed' && <button className="btn" onClick={() => complete(item)}>Complete</button>}
                        {config.path === '/api/notes' && <button className="btn" onClick={() => convertNote(item, 'reminder')}>To reminder</button>}
                        {config.path === '/api/notes' && <button className="btn" onClick={() => convertNote(item, 'project task')}>To task</button>}
                        {config.path === '/api/notes' && <button className="btn" onClick={() => convertNote(item, 'link')}>To link</button>}
                        <button className="btn" title="Edit" onClick={() => startEdit(item)}><Icons.Pencil className="h-4 w-4" /></button>
                        <button className="btn btn-danger" title="Delete" onClick={() => remove(item)}><Icons.Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

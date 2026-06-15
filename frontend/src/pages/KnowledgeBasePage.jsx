import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, Upload } from 'lucide-react';
import EntityForm from '../components/EntityForm.jsx';
import { Badge, Card, EmptyState, ErrorBox, Icons, Loading } from '../components/ui.jsx';
import { api, downloadUrl } from '../lib/api.js';
import { entityConfig } from '../lib/config.js';

const templates = {
  Runbook: {
    note_type: 'runbook',
    body: 'Purpose:\n\nScope:\n\nPrerequisites:\n\nSteps:\n1. \n\nValidation:\n\nRollback:\n'
  },
  Troubleshooting: {
    note_type: 'troubleshooting',
    body: 'Symptom:\n\nImpact:\n\nChecks:\n1. \n\nLikely causes:\n\nFix:\n\nPrevention:\n'
  },
  Script: {
    note_type: 'script',
    body: 'Purpose:\n\n```powershell\n# Add script here\n```\n\nInputs:\n\nValidation:\n'
  },
  'Codex Prompt': {
    note_type: 'codex_prompt',
    body: 'Goal:\n\nContext:\n\nConstraints:\n\nFiles to inspect:\n\nValidation required:\n'
  },
  Decision: {
    note_type: 'decision',
    body: 'Decision:\n\nContext:\n\nOptions considered:\n\nReasoning:\n\nReview date:\n'
  }
};

function codeBlocks(body = '') {
  return [...body.matchAll(/```(?:\w+)?\n([\s\S]*?)```/g)].map((match) => match[1].trim());
}

export default function KnowledgeBasePage() {
  const config = entityConfig.notes;
  const linkConfig = entityConfig.links;
  const [articles, setArticles] = useState([]);
  const [links, setLinks] = useState([]);
  const [articleForm, setArticleForm] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);
  const [linkForm, setLinkForm] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [linkQuery, setLinkQuery] = useState('');
  const [linkCategory, setLinkCategory] = useState('');
  const [selectedArticleFile, setSelectedArticleFile] = useState(null);
  const [importingArticles, setImportingArticles] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importResults, setImportResults] = useState([]);
  const [selectedLinkFile, setSelectedLinkFile] = useState(null);
  const [importingLinks, setImportingLinks] = useState(false);
  const [linkImportMessage, setLinkImportMessage] = useState('');
  const [linkImportResults, setLinkImportResults] = useState([]);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [showLinkTransfer, setShowLinkTransfer] = useState(false);
  const [showArticleTransfer, setShowArticleTransfer] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [nextArticles, nextLinks] = await Promise.all([
        api.get(config.path),
        api.get(linkConfig.path)
      ]);
      setArticles(nextArticles);
      setLinks(nextLinks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const tagOptions = useMemo(() => {
    const all = new Set();
    for (const item of articles) {
      String(item.tags || '').split(',').map((part) => part.trim()).filter(Boolean).forEach((value) => all.add(value));
    }
    return [...all].sort();
  }, [articles]);

  const linkCategoryOptions = useMemo(() => {
    const all = new Set();
    for (const link of links) {
      if (link.category) all.add(link.category);
    }
    return [...all].sort();
  }, [links]);

  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return articles.filter((item) => {
      const matchesQuery = !q || JSON.stringify(item).toLowerCase().includes(q);
      const matchesCategory = !category || item.note_type === category;
      const tags = String(item.tags || '').split(',').map((part) => part.trim().toLowerCase());
      const matchesTag = !tag || tags.includes(tag.toLowerCase());
      return matchesQuery && matchesCategory && matchesTag;
    });
  }, [articles, category, query, tag]);

  const visibleLinks = useMemo(() => {
    const q = linkQuery.toLowerCase();
    return links.filter((link) => {
      const matchesQuery = !q || JSON.stringify(link).toLowerCase().includes(q);
      const matchesCategory = !linkCategory || link.category === linkCategory;
      return matchesQuery && matchesCategory;
    });
  }, [linkCategory, linkQuery, links]);

  const selectedArticle = useMemo(
    () => articles.find((item) => item.id === selectedArticleId) || null,
    [articles, selectedArticleId]
  );

  const selectedLink = useMemo(
    () => links.find((item) => item.id === selectedLinkId) || null,
    [links, selectedLinkId]
  );

  function startNew(templateName) {
    const template = templates[templateName];
    setEditingArticle(null);
    setArticleForm({ ...config.empty, ...(template || {}) });
  }

  function applyArticleTemplate(templateName) {
    const template = templates[templateName];
    setArticleForm((current) => ({ ...(current || config.empty), ...(template || {}) }));
  }

  function startNewLink() {
    setEditingLink(null);
    setLinkForm({ ...linkConfig.empty });
  }

  async function saveArticle(event) {
    event.preventDefault();
    try {
      if (editingArticle) {
        await api.put(`${config.path}/${editingArticle.id}`, articleForm);
      } else {
        await api.post(config.path, articleForm);
      }
      setArticleForm(null);
      setEditingArticle(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveLink(event) {
    event.preventDefault();
    try {
      if (editingLink) {
        await api.put(`${linkConfig.path}/${editingLink.id}`, linkForm);
      } else {
        await api.post(linkConfig.path, linkForm);
      }
      setLinkForm(null);
      setEditingLink(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeArticle(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`${config.path}/${item.id}`);
      if (selectedArticleId === item.id) setSelectedArticleId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeLink(item) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`${linkConfig.path}/${item.id}`);
      if (selectedLinkId === item.id) setSelectedLinkId(null);
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

  async function importArticles() {
    if (!selectedArticleFile) {
      setError('Select a .xlsx or .csv article file first.');
      return;
    }
    setImportingArticles(true);
    setError('');
    setImportMessage('');
    try {
      const form = new FormData();
      form.append('file', selectedArticleFile);
      const result = await api.upload('/api/notes/import-file', form);
      const invalid = result.skipped_invalid ? ` Invalid rows: ${result.skipped_invalid}.` : '';
      const duplicates = result.skipped_duplicates ? ` Duplicates: ${result.skipped_duplicates}.` : '';
      const details = result.errors?.length ? ` ${result.errors.join(' ')}` : '';
      const summary = `Imported ${result.imported} of ${result.rows} row(s) from ${result.filename}.${duplicates}${invalid}${details}`;
      setImportMessage(summary);
      setImportResults((current) => [{ ...result, summary, imported_at: new Date().toLocaleString() }, ...current].slice(0, 5));
      setSelectedArticleFile(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setImportingArticles(false);
    }
  }

  async function importLinks() {
    if (!selectedLinkFile) {
      setError('Select a .xlsx or .csv link file first.');
      return;
    }
    setImportingLinks(true);
    setError('');
    setLinkImportMessage('');
    try {
      const form = new FormData();
      form.append('file', selectedLinkFile);
      const result = await api.upload('/api/links/import-file', form);
      const invalid = result.skipped_invalid ? ` Invalid rows: ${result.skipped_invalid}.` : '';
      const duplicates = result.skipped_duplicates ? ` Duplicates: ${result.skipped_duplicates}.` : '';
      const details = result.errors?.length ? ` ${result.errors.join(' ')}` : '';
      const summary = `Imported ${result.imported} of ${result.rows} row(s) from ${result.filename}.${duplicates}${invalid}${details}`;
      setLinkImportMessage(summary);
      setLinkImportResults((current) => [{ ...result, summary, imported_at: new Date().toLocaleString() }, ...current].slice(0, 5));
      setSelectedLinkFile(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setImportingLinks(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-slate-500">Structured articles and quick links in one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => startNew()}><Icons.Plus className="h-4 w-4" /> Article</button>
          <button className="btn" onClick={startNewLink}><Icons.Plus className="h-4 w-4" /> Link</button>
        </div>
      </div>
      <ErrorBox message={error} />
      {importResults.length > 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <p className="font-semibold">Recent article imports</p>
          <div className="mt-2 grid gap-1">
            {importResults.map((result, index) => (
              <p key={`${result.filename}-${result.imported_at}-${index}`}>
                {result.imported_at}: {result.summary}
              </p>
            ))}
          </div>
        </div>
      )}
      {articleForm && (
        <Card title={editingArticle ? 'Edit article' : 'New article'}>
          {!editingArticle && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="label">Template</span>
              {Object.keys(templates).map((name) => (
                <button key={name} type="button" className="btn" onClick={() => applyArticleTemplate(name)}>{name}</button>
              ))}
            </div>
          )}
          <EntityForm fields={config.fields} value={articleForm} onChange={setArticleForm} onSubmit={saveArticle} onCancel={() => { setArticleForm(null); setEditingArticle(null); }} submitLabel={editingArticle ? 'Save changes' : 'Create'} />
        </Card>
      )}
      {linkForm && (
        <Card title={editingLink ? 'Edit link' : 'New link'}>
          <EntityForm fields={linkConfig.fields} value={linkForm} onChange={setLinkForm} onSubmit={saveLink} onCancel={() => { setLinkForm(null); setEditingLink(null); }} submitLabel={editingLink ? 'Save changes' : 'Create'} />
        </Card>
      )}
      <Card title="Links" action={<div className="flex flex-wrap gap-2">
        <input className="input max-w-56" placeholder="Search links" value={linkQuery} onChange={(event) => setLinkQuery(event.target.value)} />
        <select className="input max-w-48" value={linkCategory} onChange={(event) => setLinkCategory(event.target.value)}>
          <option value="">All link categories</option>
          {linkCategoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>}>
        {loading ? <Loading /> : visibleLinks.length === 0 ? <EmptyState>No links match these filters.</EmptyState> : (
          <div className="grid gap-3">
            {selectedLink && (
              <section className="rounded-md border border-pine/40 bg-emerald-50/60 p-4 dark:border-emerald-700 dark:bg-emerald-950/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-lg font-semibold">{selectedLink.name}</h3>
                      <Badge>{selectedLink.category || 'uncategorized'}</Badge>
                      {selectedLink.favorite && <Badge tone="low">favorite</Badge>}
                      {selectedLink.local_network && <Badge tone="muted">local network</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{selectedLink.tags || 'No tags'} · {selectedLink.updated_at}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn" onClick={() => openLink(selectedLink)}>Open</button>
                    <button className="btn" onClick={() => navigator.clipboard?.writeText(selectedLink.url)}>Copy URL</button>
                    <button className="btn" onClick={() => { setEditingLink(selectedLink); setLinkForm({ ...selectedLink }); }}><Icons.Pencil className="h-4 w-4" /></button>
                    <button className="btn" onClick={() => setSelectedLinkId(null)}><Icons.X className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-line bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="label">Link</p>
                  <p className="mt-1 break-all font-mono text-sm text-slate-800 dark:text-slate-100">{selectedLink.url}</p>
                </div>
                <div className="mt-3 max-h-[20rem] overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-sm leading-6 text-slate-100">
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Body</p>
                  <pre className="whitespace-pre-wrap font-sans">{selectedLink.notes || 'No notes.'}</pre>
                </div>
              </section>
            )}
            {visibleLinks.map((link) => (
              <article key={link.id} className={`rounded-md border p-3 transition ${selectedLinkId === link.id ? 'border-pine bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/20' : 'border-line hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/70'}`}>
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <button className="min-w-0 text-left" aria-label={`View link ${link.name}`} onClick={() => setSelectedLinkId(link.id)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words font-semibold">{link.name}</h2>
                      <Badge>{link.category || 'uncategorized'}</Badge>
                      {link.favorite && <Badge tone="low">favorite</Badge>}
                      {link.local_network && <Badge tone="muted">local network</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{link.tags || 'No tags'} · {link.updated_at}</p>
                  </button>
                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    <button className="btn" onClick={() => setSelectedLinkId(link.id)}>View</button>
                    <button className="btn" onClick={() => openLink(link)}>Open</button>
                    <button className="btn" onClick={() => navigator.clipboard?.writeText(link.url)}>Copy URL</button>
                    <button className="btn" onClick={() => { setEditingLink(link); setLinkForm({ ...link }); }}><Icons.Pencil className="h-4 w-4" /></button>
                    <button className="btn btn-danger" onClick={() => removeLink(link)}><Icons.Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
      <Card title="Articles" action={<div className="flex flex-wrap gap-2">
        <input className="input max-w-56" placeholder="Search Article" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="input max-w-48" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {config.fields.find((field) => field.name === 'note_type').options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="input max-w-48" value={tag} onChange={(event) => setTag(event.target.value)}>
          <option value="">All tags</option>
          {tagOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>}>
        {loading ? <Loading /> : visible.length === 0 ? <EmptyState>No KB articles match these filters.</EmptyState> : (
          <div className="grid gap-3">
            {selectedArticle && (
              <section className="rounded-md border border-pine/40 bg-emerald-50/60 p-4 dark:border-emerald-700 dark:bg-emerald-950/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-lg font-semibold">{selectedArticle.title}</h3>
                      <Badge>{selectedArticle.note_type}</Badge>
                      {selectedArticle.pinned && <Badge tone="low">pinned</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{selectedArticle.tags || 'No tags'} · {selectedArticle.updated_at}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn" onClick={() => navigator.clipboard?.writeText(selectedArticle.body || '')}>Copy body</button>
                    {codeBlocks(selectedArticle.body)[0] && <button className="btn" onClick={() => navigator.clipboard?.writeText(codeBlocks(selectedArticle.body)[0])}>Copy code</button>}
                    <button className="btn" onClick={() => { setEditingArticle(selectedArticle); setArticleForm({ ...selectedArticle }); }}><Icons.Pencil className="h-4 w-4" /></button>
                    <button className="btn" onClick={() => setSelectedArticleId(null)}><Icons.X className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-4 max-h-[28rem] overflow-auto rounded-md border border-line bg-white p-3 text-sm leading-6 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  <pre className="whitespace-pre-wrap font-sans">{selectedArticle.body || 'No body.'}</pre>
                </div>
              </section>
            )}
            {visible.map((item) => {
              const blocks = codeBlocks(item.body);
              return (
                <article key={item.id} className={`rounded-md border p-3 transition ${selectedArticleId === item.id ? 'border-pine bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/20' : 'border-line hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/70'}`}>
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <button className="min-w-0 text-left" aria-label={`Open article ${item.title}`} onClick={() => setSelectedArticleId(item.id)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{item.title}</h2>
                        <Badge>{item.note_type}</Badge>
                        {item.pinned && <Badge tone="low">pinned</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.tags || 'No tags'} · {item.updated_at}</p>
                    </button>
                    <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                      <button className="btn" onClick={() => setSelectedArticleId(item.id)}>View</button>
                      <button className="btn" onClick={() => navigator.clipboard?.writeText(item.body || '')}>Copy body</button>
                      {blocks[0] && <button className="btn" onClick={() => navigator.clipboard?.writeText(blocks[0])}>Copy code</button>}
                      <button className="btn" onClick={() => { setEditingArticle(item); setArticleForm({ ...item }); }}><Icons.Pencil className="h-4 w-4" /></button>
                      <button className="btn btn-danger" onClick={() => removeArticle(item)}><Icons.Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
      <Card title="Link import/export">
        <div className="rounded-md border border-line dark:border-slate-800">
          <button
            className="flex w-full items-center justify-between gap-3 p-3 text-left"
            type="button"
            onClick={() => setShowLinkTransfer((value) => !value)}
            aria-expanded={showLinkTransfer}
          >
            <div>
              <p className="text-sm font-semibold">Link import/export</p>
              <p className="text-xs text-slate-500">Import links from a file, or download current link records.</p>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 transition ${showLinkTransfer ? 'rotate-180' : ''}`} />
          </button>
          {showLinkTransfer && (
            <div className="grid gap-4 border-t border-line p-3 dark:border-slate-800">
              {linkImportMessage && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{linkImportMessage}</div>}
              <div className="grid gap-3 rounded-md border border-line p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Export links</p>
                    <p className="text-xs text-slate-500">Downloads use Name, URL, Category, Environment, Tags, Favorite, Body.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn" onClick={() => downloadUrl('/api/export/links.csv')}>
                      <Download className="h-4 w-4" /> CSV
                    </button>
                    <button className="btn" onClick={() => downloadUrl('/api/export/links.xlsx')}>
                      <Download className="h-4 w-4" /> XLSX
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 rounded-md border border-line p-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold">Import links</p>
                  <p className="text-xs text-slate-500">Accepted environments: {linkConfig.fields.find((field) => field.name === 'environment').options.join(', ')}. Favorite must be TRUE or FALSE.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    className="input"
                    type="file"
                    accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => setSelectedLinkFile(event.target.files?.[0] || null)}
                  />
                  <button className="btn btn-primary" onClick={importLinks} disabled={importingLinks}>
                    <Upload className="h-4 w-4" /> Import file
                  </button>
                </div>
              </div>
              {linkImportResults.length > 0 && (
                <div className="rounded-md border border-line p-3 text-sm dark:border-slate-800">
                  <p className="font-semibold">Recent link imports</p>
                  <div className="mt-2 grid gap-1 text-slate-600 dark:text-slate-300">
                    {linkImportResults.map((result, index) => (
                      <p key={`${result.filename}-${result.imported_at}-${index}`}>
                        {result.imported_at}: {result.summary}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
      <Card title="Article import/export">
        <div className="rounded-md border border-line dark:border-slate-800">
          <button
            className="flex w-full items-center justify-between gap-3 p-3 text-left"
            type="button"
            onClick={() => setShowArticleTransfer((value) => !value)}
            aria-expanded={showArticleTransfer}
          >
            <div>
              <p className="text-sm font-semibold">Article import/export</p>
              <p className="text-xs text-slate-500">Import articles from a file, or download current article records.</p>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 transition ${showArticleTransfer ? 'rotate-180' : ''}`} />
          </button>
          {showArticleTransfer && (
            <div className="grid gap-4 border-t border-line p-3 dark:border-slate-800">
              {importMessage && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{importMessage}</div>}
              <div className="grid gap-3 rounded-md border border-line p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Export articles</p>
                    <p className="text-xs text-slate-500">Downloads use Title, Category, Tags, Pinned, Body.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn" onClick={() => downloadUrl('/api/export/notes.csv')}>
                      <Download className="h-4 w-4" /> CSV
                    </button>
                    <button className="btn" onClick={() => downloadUrl('/api/export/notes.xlsx')}>
                      <Download className="h-4 w-4" /> XLSX
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 rounded-md border border-line p-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold">Import articles</p>
                  <p className="text-xs text-slate-500">Accepted categories: {config.fields.find((field) => field.name === 'note_type').options.join(', ')}. Pinned must be TRUE or FALSE.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    className="input"
                    type="file"
                    accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => setSelectedArticleFile(event.target.files?.[0] || null)}
                  />
                  <button className="btn btn-primary" onClick={importArticles} disabled={importingArticles}>
                    <Upload className="h-4 w-4" /> Import file
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

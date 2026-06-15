import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, MailSearch, Upload } from 'lucide-react';
import EntityPage from './EntityPage.jsx';
import { Badge, Card, EmptyState, ErrorBox, Loading } from '../components/ui.jsx';
import { api, downloadUrl } from '../lib/api.js';
import { entityConfig } from '../lib/config.js';

const BILL_SEARCH_TERMS = [
  { value: 'bill', label: 'Bill' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'statement', label: 'Statement' },
  { value: 'payment', label: 'Payment' },
  { value: '"amount due"', label: 'Amount due' },
  { value: '"due date"', label: 'Due date' }
];

function buildGmailQuery({ daysBack, terms, senderFilter, subjectFilter, hasAttachment }) {
  const parts = [`newer_than:${daysBack || 120}d`];
  if (terms.length) {
    parts.push(`(${terms.join(' OR ')})`);
  }
  if (senderFilter.trim()) {
    parts.push(`from:${senderFilter.trim()}`);
  }
  if (subjectFilter.trim()) {
    parts.push(`subject:(${subjectFilter.trim()})`);
  }
  if (hasAttachment) {
    parts.push('has:attachment');
  }
  return parts.join(' ');
}

function billAmount(item) {
  return Number(item.amount || 0);
}

function annualizedAmount(item) {
  const amount = billAmount(item);
  if (item.billing_cycle === 'weekly') return amount * 52;
  if (item.billing_cycle === 'monthly') return amount * 12;
  if (item.billing_cycle === 'quarterly') return amount * 4;
  if (item.billing_cycle === 'yearly') return amount;
  return amount;
}

function BillingChart({ bills, loading }) {
  const summary = useMemo(() => {
    const monthlyTotal = bills
      .filter((bill) => bill.billing_cycle === 'monthly')
      .reduce((total, bill) => total + billAmount(bill), 0);
    const monthlyAnnualTotal = bills
      .filter((bill) => bill.billing_cycle === 'monthly')
      .reduce((total, bill) => total + annualizedAmount(bill), 0);
    const yearlyAnnualTotal = bills
      .filter((bill) => bill.billing_cycle === 'yearly')
      .reduce((total, bill) => total + annualizedAmount(bill), 0);
    const bars = [
      { cycle: 'monthly', label: 'monthly annualized', value: monthlyAnnualTotal },
      { cycle: 'yearly', label: 'yearly annual total', value: yearlyAnnualTotal }
    ];
    return { monthlyTotal, monthlyAnnualTotal, yearlyAnnualTotal, recordCount: bills.length, bars };
  }, [bills]);
  const max = Math.max(...summary.bars.map((item) => item.value), 1);

  if (loading) return <Loading />;
  if (!bills.length) return <EmptyState>No bills imported yet.</EmptyState>;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Monthly equivalent" value={`$${summary.monthlyTotal.toFixed(2)}`} />
        <Metric label="Monthly annual total" value={`$${summary.monthlyAnnualTotal.toFixed(2)}`} />
        <Metric label="Yearly annual total" value={`$${summary.yearlyAnnualTotal.toFixed(2)}`} />
        <Metric label="Bill records" value={summary.recordCount} />
      </div>
      <div className="grid gap-3">
        {summary.bars.map((item) => (
          <div key={item.cycle} className="rounded-md border border-line p-3 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone="muted">{item.cycle}</Badge>
                <span className="text-sm text-slate-500">{item.label}</span>
              </div>
              <span className="font-semibold tabular-nums">${item.value.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-pine" style={{ width: `${Math.max((item.value / max) * 100, 3)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-line p-3 dark:border-slate-800">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ImportDiscoveryPanel({ onRefresh }) {
  const [gmailStatus, setGmailStatus] = useState(null);
  const [showGmailSearch, setShowGmailSearch] = useState(false);
  const [showFileTransfer, setShowFileTransfer] = useState(false);
  const [daysBack, setDaysBack] = useState(120);
  const [selectedTerms, setSelectedTerms] = useState(BILL_SEARCH_TERMS.map((term) => term.value));
  const [senderFilter, setSenderFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [keywordFilter, setKeywordFilter] = useState('invoice,bill,statement,payment,due');
  const [maxMessages, setMaxMessages] = useState(25);
  const [selectedFile, setSelectedFile] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const gmailQuery = buildGmailQuery({ daysBack, terms: selectedTerms, senderFilter, subjectFilter, hasAttachment });

  async function loadGmailStatus() {
    try {
      setGmailStatus(await api.get('/api/integrations/gmail/status'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadGmailStatus(); }, []);

  async function scanGmail() {
    setBusy('scan');
    setError('');
    setMessage('');
    try {
      const result = await api.post('/api/integrations/gmail/scan-bills', {
        query: gmailQuery,
        max_messages: Number(maxMessages) || 25,
        keyword_filter: keywordFilter
      });
      setMessage(`Scanned ${result.scanned} message(s), imported ${result.imported}. Duplicates: ${result.skipped_duplicates}. Unparsed: ${result.skipped_unparsed}.`);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  function toggleSearchTerm(value) {
    setSelectedTerms((current) => (
      current.includes(value)
        ? current.filter((term) => term !== value)
        : [...current, value]
    ));
  }

  async function importFile() {
    if (!selectedFile) {
      setError('Select a .xlsx, .csv, or .txt file first.');
      return;
    }
    setBusy('file');
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      const result = await api.upload('/api/bills/import-file', form);
      setMessage(`Imported ${result.imported} bill(s) from ${result.filename}. Duplicates: ${result.skipped_duplicates}. Unmatched rows: ${result.skipped_unmatched}. Invalid rows: ${result.skipped_invalid}.`);
      setSelectedFile(null);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <Card title="Import & discovery">
      <div className="grid gap-4">
        <ErrorBox message={error} />
        {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{message}</div>}
        <div className="rounded-md border border-line dark:border-slate-800">
          <button
            className="flex w-full items-center justify-between gap-3 p-3 text-left"
            type="button"
            onClick={() => setShowGmailSearch((value) => !value)}
            aria-expanded={showGmailSearch}
          >
            <div>
              <p className="text-sm font-semibold">Gmail bill search</p>
              <p className="text-xs text-slate-500">{gmailStatus?.connected ? 'Connected' : gmailStatus?.configured ? 'Configured in Settings, connect Gmail there before importing' : 'Add the Google OAuth JSON and connect Gmail in Settings first'}</p>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 transition ${showGmailSearch ? 'rotate-180' : ''}`} />
          </button>
          {showGmailSearch && (
            <div className="grid gap-3 border-t border-line p-3 dark:border-slate-800">
              <div className="grid gap-3 md:grid-cols-[160px_1fr_140px]">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Look back</span>
                  <select className="input" value={daysBack} onChange={(event) => setDaysBack(Number(event.target.value))}>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={120}>120 days</option>
                    <option value={180}>180 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Body keywords</span>
                  <input className="input" value={keywordFilter} onChange={(event) => setKeywordFilter(event.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Max messages</span>
                  <input className="input" type="number" min="1" max="100" value={maxMessages} onChange={(event) => setMaxMessages(event.target.value)} />
                </label>
              </div>
              <div className="grid gap-2 text-sm">
                <span className="font-medium">Search for</span>
                <div className="flex flex-wrap gap-2">
                  {BILL_SEARCH_TERMS.map((term) => (
                    <button
                      key={term.value}
                      type="button"
                      className={`btn ${selectedTerms.includes(term.value) ? 'btn-primary' : ''}`}
                      onClick={() => toggleSearchTerm(term.value)}
                    >
                      {term.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Sender contains</span>
                  <input className="input" placeholder="billing@example.com or vendor name" value={senderFilter} onChange={(event) => setSenderFilter(event.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Subject contains</span>
                  <input className="input" placeholder="invoice, statement, service name" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hasAttachment} onChange={(event) => setHasAttachment(event.target.checked)} />
                <span className="font-medium">Only messages with attachments</span>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Query preview</span>
                <input className="input font-mono text-xs" value={gmailQuery} readOnly />
              </label>
              <div className="flex justify-end">
                <button className="btn btn-primary" onClick={scanGmail} disabled={busy === 'scan'}>
                  <MailSearch className="h-4 w-4" /> Search and import
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-md border border-line dark:border-slate-800">
          <button
            className="flex w-full items-center justify-between gap-3 p-3 text-left"
            type="button"
            onClick={() => setShowFileTransfer((value) => !value)}
            aria-expanded={showFileTransfer}
          >
            <div>
              <p className="text-sm font-semibold">File import / export</p>
              <p className="text-xs text-slate-500">Import bills from a file, or download the current bill records.</p>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 transition ${showFileTransfer ? 'rotate-180' : ''}`} />
          </button>
          {showFileTransfer && (
            <div className="grid gap-4 border-t border-line p-3 dark:border-slate-800">
              <div className="grid gap-3">
                <p className="text-sm font-semibold">File import</p>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    className="input"
                    type="file"
                    accept=".xlsx,.csv,.txt,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  />
                  <button className="btn btn-primary" onClick={importFile} disabled={busy === 'file'}>
                    <Upload className="h-4 w-4" /> Import file
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Export bills</p>
                  <p className="text-xs text-slate-500">Download the current bill records for review or backup.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn" onClick={() => downloadUrl('/api/export/bills.csv')}>
                    <Download className="h-4 w-4" /> CSV
                  </button>
                  <button className="btn" onClick={() => downloadUrl('/api/export/bills.xlsx')}>
                    <Download className="h-4 w-4" /> XLSX
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function BillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadBills() {
    setLoading(true);
    setError('');
    try {
      setBills(await api.get('/api/bills'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBills(); }, []);

  return (
    <div className="grid gap-4">
      <ErrorBox message={error} />
      <Card title="Bills & Subscriptions Chart" action={<button className="btn" onClick={loadBills}>Refresh chart</button>}>
        <BillingChart bills={bills} loading={loading} />
      </Card>
      <EntityPage config={entityConfig.bills} onItemsChange={setBills} />
      <ImportDiscoveryPanel onRefresh={loadBills} />
    </div>
  );
}

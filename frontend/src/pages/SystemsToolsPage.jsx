import { useEffect, useState } from 'react';
import { Badge, Card, EmptyState, ErrorBox, Loading } from '../components/ui.jsx';
import { api } from '../lib/api.js';

const toolSections = ['Speed Test', 'Ping Test', 'DNS Lookup', 'Port Check'];
const systemSections = ['Local System Info', 'Local System Apps'];

function ToolsNav({ active, setActive, sections }) {
  return (
    <div className="flex flex-wrap gap-2">
      {sections.map((section) => (
        <button key={section} className={`btn ${active === section ? 'btn-primary' : ''}`} onClick={() => setActive(section)}>{section}</button>
      ))}
    </div>
  );
}

function SpeedTest() {
  const [history, setHistory] = useState([]);
  const [testUrl, setTestUrl] = useState('');
  const [uploadTestUrl, setUploadTestUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setHistory(await api.get('/api/speed-tests'));
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function runTest(event) {
    event.preventDefault();
    setRunning(true);
    setError('');
    try {
      await api.post('/api/tools/speed-test', { test_url: testUrl || null, upload_test_url: uploadTestUrl || null });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  async function clearHistory() {
    await api.delete('/api/tools/speed-test-history');
    await load();
  }

  const latest = history[history.length - 1];
  return (
    <div className="grid gap-4">
      <ErrorBox message={error} />
      <Card title="Approximate Speed Test">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={runTest}>
          <input className="input" value={testUrl} onChange={(event) => setTestUrl(event.target.value)} placeholder="Optional download test URL" />
          <input className="input" value={uploadTestUrl} onChange={(event) => setUploadTestUrl(event.target.value)} placeholder="Optional upload test URL" />
          <button className="btn btn-primary whitespace-nowrap" disabled={running}>{running ? 'Running' : 'Run test'}</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">Uses backend HTTP timing with bounded download and upload samples. Defaults use Cloudflare's public no-key speed endpoints.</p>
      </Card>
      <Card title="Latest Result">
        {!latest ? <EmptyState>No speed tests yet.</EmptyState> : (
          <div className="grid gap-3 md:grid-cols-5">
            <Metric label="Download" value={latest.download_mbps != null ? `${latest.download_mbps} Mbps` : 'N/A'} />
            <Metric label="Upload" value={latest.upload_mbps != null ? `${latest.upload_mbps} Mbps` : 'N/A'} />
            <Metric label="Latency" value={latest.latency_ms != null ? `${latest.latency_ms} ms` : 'N/A'} />
            <Metric label="Jitter" value={latest.jitter_ms != null ? `${latest.jitter_ms} ms` : 'N/A'} />
            <Metric label="Timestamp" value={latest.tested_at} />
          </div>
        )}
      </Card>
      <Card title="History" action={<button className="btn btn-danger" onClick={clearHistory} disabled={!history.length}>Clear</button>}>
        {!history.length ? <EmptyState>No history yet.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-slate-500 dark:border-slate-800"><tr><th className="py-2">Time</th><th>Download</th><th>Upload</th><th>Latency</th><th>Jitter</th><th>Method</th></tr></thead>
              <tbody>{[...history].reverse().map((item) => <tr key={item.id} className="border-b border-line dark:border-slate-800"><td className="py-2">{item.tested_at}</td><td>{item.download_mbps ?? 'N/A'}</td><td>{item.upload_mbps ?? 'N/A'}</td><td>{item.latency_ms ?? 'N/A'}</td><td>{item.jitter_ms ?? 'N/A'}</td><td>{item.method}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="metric-panel"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function JsonResult({ result }) {
  if (!result) return <EmptyState>No result yet.</EmptyState>;
  return <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">{JSON.stringify(result, null, 2)}</pre>;
}

function PingResult({ result }) {
  if (!result) return <EmptyState>No result yet.</EmptyState>;
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Host" value={result.host} />
        <Metric label="Reachable" value={result.reachable ? 'Yes' : 'No'} />
        <Metric label="Latency" value={result.latency_ms != null ? `${result.latency_ms} ms` : 'N/A'} />
        <Metric label="Packets" value={result.packet_count ?? 'N/A'} />
      </div>
      <div className="rounded-md border border-line bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Message</p>
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs">{result.message || 'No ping output returned.'}</pre>
      </div>
    </div>
  );
}

function formatDuration(seconds = 0) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function UsageBar({ value, tone = 'bg-pine' }) {
  const percent = Math.min(Math.max(Number(value || 0), 0), 100);
  return (
    <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-2 rounded-full ${tone}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function InfoTile({ label, value, detail }) {
  return (
    <div className="metric-panel">
      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold">{value || 'Unavailable'}</p>
      {detail && <p className="mt-1 break-words text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function LocalSystemInfoView({ info }) {
  if (!info) return <EmptyState>No system information available.</EmptyState>;
  const drives = info.storage?.drives || [];
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoTile label="Host" value={info.hostname} detail={info.checked_at ? `Checked ${info.checked_at}` : null} />
        <InfoTile label="OS" value={info.os} detail={info.os_version || info.platform} />
        <InfoTile label="Uptime" value={formatDuration(info.uptime_seconds)} detail={info.boot_time ? `Booted ${info.boot_time}` : null} />
        <InfoTile label="Processor" value={`${info.cpu?.logical_count ?? 'N/A'} logical CPUs`} detail={info.cpu?.processor || `${info.cpu?.physical_count ?? 'N/A'} physical cores`} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="metric-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">CPU Load</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{Number(info.cpu?.percent || 0).toFixed(1)}%</p>
            </div>
            <Badge tone={info.cpu?.percent >= 85 ? 'high' : info.cpu?.percent >= 70 ? 'medium' : 'low'}>{info.cpu?.percent >= 85 ? 'high' : info.cpu?.percent >= 70 ? 'watch' : 'normal'}</Badge>
          </div>
          <UsageBar value={info.cpu?.percent} tone={info.cpu?.percent >= 85 ? 'bg-red-500' : info.cpu?.percent >= 70 ? 'bg-gold' : 'bg-pine'} />
        </div>
        <div className="metric-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Memory</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{Number(info.memory?.percent || 0).toFixed(1)}%</p>
              <p className="mt-1 text-xs text-slate-500">{info.memory?.used_gb} GB used of {info.memory?.total_gb} GB</p>
            </div>
            <Badge tone={info.memory?.percent >= 85 ? 'high' : info.memory?.percent >= 70 ? 'medium' : 'low'}>{info.memory?.available_gb} GB free</Badge>
          </div>
          <UsageBar value={info.memory?.percent} tone={info.memory?.percent >= 85 ? 'bg-red-500' : info.memory?.percent >= 70 ? 'bg-gold' : 'bg-pine'} />
        </div>
      </div>

      <div className="system-panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Storage</p>
            <p className="text-xs text-slate-500">Local volumes visible to the backend process.</p>
          </div>
          <Badge tone="muted">{drives.length} volume{drives.length === 1 ? '' : 's'}</Badge>
        </div>
        {drives.length === 0 ? <EmptyState>No storage metrics available.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="system-table w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-2 pr-3">Drive</th>
                  <th className="py-2 pr-3">Filesystem</th>
                  <th className="py-2 pr-3">Used</th>
                  <th className="py-2 pr-3">Free</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2">Usage</th>
                </tr>
              </thead>
              <tbody>
                {drives.map((drive) => (
                  <tr key={`${drive.device}-${drive.mountpoint}`} className="border-b border-line align-top dark:border-slate-800">
                    <td className="py-3 pr-3 font-medium">{drive.mountpoint || drive.device}</td>
                    <td className="py-3 pr-3">{drive.filesystem || 'Unknown'}</td>
                    <td className="py-3 pr-3 tabular-nums">{drive.used_gb} GB</td>
                    <td className="py-3 pr-3 tabular-nums">{drive.free_gb} GB</td>
                    <td className="py-3 pr-3 tabular-nums">{drive.total_gb} GB</td>
                    <td className="py-3">
                      <div className="flex min-w-40 items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className={`h-2 rounded-full ${drive.percent >= 90 ? 'bg-red-500' : drive.percent >= 75 ? 'bg-gold' : 'bg-pine'}`} style={{ width: `${Math.min(drive.percent, 100)}%` }} />
                        </div>
                        <span className="w-12 text-right tabular-nums">{drive.percent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="system-panel text-sm">
        <p className="font-semibold">Dashboard Data</p>
        <p className="mt-1 break-all text-slate-500">{info.storage?.app_data?.path}</p>
        <p className="mt-1 text-xs text-slate-500">{info.storage?.app_data?.size_mb ?? 0} MB currently used</p>
      </div>
    </div>
  );
}

function PingTest() {
  const [host, setHost] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      setResult(await api.post('/api/tools/ping', { host }));
    } catch (err) {
      setError(err.message);
    }
  }
  return <ToolForm title="Ping Test" error={error} onSubmit={submit} button="Ping"><input className="input" value={host} onChange={(event) => setHost(event.target.value)} placeholder="Hostname or IP" required /><PingResult result={result} /></ToolForm>;
}

function DnsLookup() {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      setResult(await api.post('/api/tools/dns', { domain, record_type: 'ALL' }));
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <ToolForm title="DNS Lookup" error={error} onSubmit={submit} button="Lookup">
      <input className="input" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" required />
      <DnsResult result={result} />
    </ToolForm>
  );
}

function DnsResult({ result }) {
  if (!result) return <EmptyState>No result yet.</EmptyState>;
  const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];
  const grouped = result.grouped || recordTypes.reduce((items, type) => {
    items[type] = (result.records || []).filter((record) => record.type === type);
    return items;
  }, {});
  const errorsByType = (result.errors || []).reduce((items, error) => {
    items[error.type] = error.message;
    return items;
  }, {});
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{result.domain}</p>
          <p className="text-xs text-slate-500">Checked {result.checked_at}</p>
        </div>
        <Badge tone="muted">{(result.records || []).length} record{(result.records || []).length === 1 ? '' : 's'}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {recordTypes.map((type) => {
          const records = grouped[type] || [];
          return (
            <div key={type} className="rounded-md border border-line p-3 dark:border-slate-800">
              <div className="mb-2 flex items-center justify-between gap-3">
                <Badge>{type}</Badge>
                <span className="text-xs text-slate-500">{records.length} found</span>
              </div>
              {records.length ? (
                <ul className="grid gap-2 text-sm">
                  {records.map((record, index) => <li key={`${type}-${index}`} className="break-all rounded bg-slate-50 p-2 dark:bg-slate-950">{record.value}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">{errorsByType[type] ? `Unavailable: ${errorsByType[type]}` : 'No records found.'}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PortCheck() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState(443);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      setResult(await api.post('/api/tools/port-check', { host, port: Number(port) }));
    } catch (err) {
      setError(err.message);
    }
  }
  return <ToolForm title="Port Check" error={error} onSubmit={submit} button="Check"><input className="input" value={host} onChange={(event) => setHost(event.target.value)} placeholder="Hostname or IP" required /><input className="input" type="number" min="1" max="65535" value={port} onChange={(event) => setPort(event.target.value)} required /><JsonResult result={result} /></ToolForm>;
}

function LocalSystemInfo() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  async function load() {
    try {
      setInfo(await api.get('/api/tools/local-system-info'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);
  return <div className="grid gap-4"><ErrorBox message={error} /><Card title="Local System Info" action={<button className="btn" onClick={load}>Refresh</button>}>{!info ? <Loading /> : <LocalSystemInfoView info={info} />}</Card></div>;
}

function formatInstallDate(value) {
  if (!value) return 'Unknown';
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  return value;
}

function LocalSystemApps() {
  const [payload, setPayload] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      setPayload(await api.get('/api/tools/local-apps'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  const apps = payload?.apps || [];
  const filtered = apps.filter((app) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [app.name, app.publisher, app.version, app.scope, app.install_location].some((value) => String(value || '').toLowerCase().includes(needle));
  });

  return (
    <div className="grid gap-4">
      <ErrorBox message={error} />
      <Card
        title="Local System Apps"
        action={<button className="btn" onClick={load}>Refresh</button>}
      >
        {!payload ? <Loading /> : (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Installed apps" value={payload.count} />
              <Metric label="Visible after filter" value={filtered.length} />
              <Metric label="Checked" value={payload.checked_at} />
            </div>
            <p className="text-xs text-slate-500">Read-only inventory from standard Windows uninstall registry locations. This does not request administrator permissions.</p>
          </div>
        )}
      </Card>
      <Card title="Applications" action={<input className="input w-72" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter apps" />}>
        {!payload ? <Loading /> : filtered.length === 0 ? <EmptyState>No installed applications matched the filter.</EmptyState> : (
          <div className="system-table-wrap overflow-x-auto">
            <table className="system-table w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-2 pr-3">Application</th>
                  <th className="py-2 pr-3">Publisher</th>
                  <th className="py-2 pr-3">Version</th>
                  <th className="py-2 pr-3">Installed</th>
                  <th className="py-2 pr-3">Scope</th>
                  <th className="py-2">Location</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app, index) => (
                  <tr key={`${app.name}-${app.publisher}-${app.version}-${index}`} className="border-b border-line align-top dark:border-slate-800">
                    <td className="py-3 pr-3 font-medium">{app.name}</td>
                    <td className="py-3 pr-3">{app.publisher || <span className="text-slate-500">Unknown</span>}</td>
                    <td className="py-3 pr-3 tabular-nums">{app.version || <span className="text-slate-500">Unknown</span>}</td>
                    <td className="py-3 pr-3 tabular-nums">{formatInstallDate(app.install_date)}</td>
                    <td className="py-3 pr-3"><Badge tone="muted">{app.scope}</Badge></td>
                    <td className="py-3 break-all text-slate-500">{app.install_location || 'Not listed'}</td>
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

function ToolForm({ title, error, onSubmit, button, children }) {
  const childrenArray = Array.isArray(children) ? children : [children];
  return (
    <div className="grid gap-4">
      <ErrorBox message={error} />
      <Card title={title}>
        <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={onSubmit}>
          {childrenArray.slice(0, -1)}
          <button className="btn btn-primary">{button}</button>
        </form>
      </Card>
      <Card title="Result">{childrenArray[childrenArray.length - 1]}</Card>
    </div>
  );
}

export default function SystemsToolsPage({ mode = 'tools' }) {
  const sections = mode === 'system' ? systemSections : toolSections;
  const [active, setActive] = useState(sections[0]);

  useEffect(() => {
    if (!sections.includes(active)) setActive(sections[0]);
  }, [active, sections]);

  const isSystem = mode === 'system';

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">{isSystem ? 'System' : 'Tools'}</h1>
        <p className="text-sm text-slate-500">
          {isSystem ? 'Read-only local system inventory and machine status.' : 'Small local IT utilities for network and connectivity checks.'}
        </p>
      </div>
      <ToolsNav active={active} setActive={setActive} sections={sections} />
      {active === 'Speed Test' && <SpeedTest />}
      {active === 'Ping Test' && <PingTest />}
      {active === 'DNS Lookup' && <DnsLookup />}
      {active === 'Port Check' && <PortCheck />}
      {active === 'Local System Info' && <LocalSystemInfo />}
      {active === 'Local System Apps' && <LocalSystemApps />}
    </div>
  );
}

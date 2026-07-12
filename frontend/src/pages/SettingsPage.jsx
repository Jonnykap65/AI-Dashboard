import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, MailSearch } from 'lucide-react';
import { api, downloadUrl } from '../lib/api.js';
import { Card, ErrorBox, Loading } from '../components/ui.jsx';
import { resolveTheme, themeOptions } from '../lib/themes.js';

export default function SettingsPage({ onSaved }) {
  const [settings, setSettings] = useState(null);
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [googleConfig, setGoogleConfig] = useState(null);
  const [googleJson, setGoogleJson] = useState('');
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState(null);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [appleConfig, setAppleConfig] = useState(null);
  const [applePassword, setApplePassword] = useState('');
  const [appleCalendars, setAppleCalendars] = useState([]);
  const [importText, setImportText] = useState('');
  const [showGoogleInstructions, setShowGoogleInstructions] = useState(false);
  const [showAppleInstructions, setShowAppleInstructions] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/settings').then(setSettings).catch((err) => setError(err.message));
    api.get('/api/integrations/google/config').then(setGoogleConfig).catch(() => {});
    api.get('/api/integrations/google-calendar/status').then(setGoogleCalendarStatus).catch(() => {});
    api.get('/api/integrations/gmail/status').then(setGmailStatus).catch(() => {});
    api.get('/api/integrations/apple-calendar/config').then(setAppleConfig).catch(() => {});
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  async function savePreferences(nextSettings) {
    setError('');
    try {
      const saved = await api.put('/api/settings', nextSettings);
      setSettings(saved);
      onSaved?.(saved);
      setMessage('Preferences saved automatically.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function selectTheme(theme) {
    const nextSettings = { ...settings, theme };
    setSettings(nextSettings);
    onSaved?.(nextSettings);
    setError('');
    try {
      const saved = await api.put('/api/settings', nextSettings);
      setSettings(saved);
      onSaved?.(saved);
      setMessage('Appearance saved automatically.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function importJson() {
    setError('');
    try {
      const payload = JSON.parse(importText);
      await api.post('/api/import', payload);
      setMessage('Import completed.');
      setImportText('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveAppleCalendar(event) {
    event.preventDefault();
    setError('');
    try {
      const saved = await persistAppleCalendarConfig();
      setAppleConfig(saved);
      setApplePassword('');
      setMessage('Apple Calendar settings saved locally. Use Test connection to verify Apple accepts the credentials.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveGoogleConfig(event) {
    event.preventDefault();
    setError('');
    try {
      const saved = await api.put('/api/integrations/google/config', {
        client_secret_json: googleJson
      });
      setGoogleConfig(saved);
      setGoogleJson('');
      setGoogleCalendarStatus(await api.get('/api/integrations/google-calendar/status'));
      setGmailStatus(await api.get('/api/integrations/gmail/status'));
      setMessage('Google OAuth client JSON saved locally. Existing Calendar and Gmail tokens were left unchanged.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function connectGmail() {
    setError('');
    setMessage('');
    try {
      const status = await api.post('/api/integrations/gmail/connect', {});
      setGmailStatus(status);
      setMessage('Gmail connected. You can now use Bills import and discovery.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function connectGoogleCalendar() {
    setError('');
    setMessage('');
    try {
      const status = await api.post('/api/integrations/google-calendar/connect', {});
      setGoogleCalendarStatus(status);
      setMessage('Google Calendar connected. You can now sync Calendar events.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function persistAppleCalendarConfig() {
    return api.put('/api/integrations/apple-calendar/config', {
      apple_id: appleConfig.apple_id.trim(),
      app_specific_password: applePassword || null,
      url: appleConfig.url.trim(),
      calendar_name: appleConfig.calendar_name?.trim() || null
    });
  }

  async function testAppleCalendar() {
    setError('');
    try {
      const saved = await persistAppleCalendarConfig();
      setAppleConfig(saved);
      setApplePassword('');
      const result = await api.get('/api/integrations/apple-calendar/calendars');
      setAppleCalendars(result.calendars || []);
      setMessage(`Apple Calendar connected. Found ${result.calendars?.length || 0} calendar(s).`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!settings) return <Loading />;

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ErrorBox message={error} />
      {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}
      <Card title="Preferences">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="label">Display name</span>
            <input
              className="input"
              value={settings.display_name}
              onChange={(e) => setSettings({ ...settings, display_name: e.target.value })}
              onBlur={() => savePreferences(settings)}
            />
          </label>
          <label className="grid gap-1">
            <span className="label">Time format</span>
            <select className="input" value={settings.time_format} onChange={(e) => {
              const nextSettings = { ...settings, time_format: e.target.value };
              setSettings(nextSettings);
              savePreferences(nextSettings);
            }}>
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </label>
        </div>
      </Card>
      <Card title="Appearance">
        <div className="grid gap-3 md:grid-cols-2">
          {themeOptions.map((option) => {
            const selected = resolveTheme(settings.theme, prefersDark) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => selectTheme(option.value)}
                className={`theme-choice ${selected ? 'theme-choice-selected' : ''}`}
                aria-pressed={selected}
              >
                <span className="theme-swatch" style={{ '--swatch-bg': option.swatch[0], '--swatch-accent': option.swatch[1] }} aria-hidden="true" />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold">{option.label}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
                </span>
                <span className="theme-radio" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </Card>
      <Card title="Google APIs">
        {googleConfig ? (
          <form onSubmit={saveGoogleConfig} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-line p-3 text-sm dark:border-slate-700">
                <p className="label">Shared client JSON</p>
                <p className="mt-1">{googleConfig.configured ? 'Configured' : 'Not configured'}</p>
                <p className="mt-1 break-all text-slate-500">{googleConfig.shared_path}</p>
              </div>
              <div className="rounded-md border border-line p-3 text-sm dark:border-slate-700">
                <p className="label">Active file</p>
                <p className="mt-1">{googleConfig.using_shared_file ? 'Using shared Google file' : 'Using legacy fallback or none'}</p>
                <p className="mt-1 break-all text-slate-500">{googleConfig.active_path}</p>
              </div>
            </div>
            <div className="rounded-md border border-line p-3 text-sm dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="label">Google API access</p>
                  <p className="mt-1">
                    Calendar: {googleCalendarStatus?.connected ? 'Connected' : googleCalendarStatus?.configured ? 'Configured, not connected' : 'Not configured'} · Gmail: {gmailStatus?.connected ? 'Connected' : gmailStatus?.configured ? 'Configured, not connected' : 'Not configured'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Save the shared OAuth client JSON here for Google Calendar and Gmail. Then connect Calendar and Gmail here for the Google features you use.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn" type="button" onClick={connectGoogleCalendar} disabled={!googleCalendarStatus?.configured}>
                    <CalendarDays className="h-4 w-4" /> Connect Calendar
                  </button>
                  <button className="btn" type="button" onClick={connectGmail} disabled={!gmailStatus?.configured}>
                    <MailSearch className="h-4 w-4" /> Connect Gmail
                  </button>
                </div>
              </div>
            </div>
            <label className="grid gap-1">
              <span className="label">Google OAuth client JSON</span>
              <textarea className="input min-h-40 font-mono" value={googleJson} onChange={(e) => setGoogleJson(e.target.value)} placeholder="Paste the downloaded Google OAuth Desktop app JSON here" />
            </label>
            <div className="rounded-md border border-line p-3 text-sm dark:border-slate-700">
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                type="button"
                onClick={() => setShowGoogleInstructions((value) => !value)}
                aria-expanded={showGoogleInstructions}
              >
                <span>
                  <span className="block font-semibold">How to regenerate Google API OAuth credentials</span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Click to show the Google Cloud steps for Calendar and Gmail OAuth JSON.</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition ${showGoogleInstructions ? 'rotate-180' : ''}`} />
              </button>
              {showGoogleInstructions && (
                <div className="mt-3 grid gap-3 border-t border-line pt-3 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  <ol className="grid list-decimal gap-2 pl-5">
                    <li>Open Google Cloud Console and select or create the project for this dashboard.</li>
                    <li>Go to APIs &amp; Services -&gt; Library, search for Google Calendar API and Gmail API, and enable both APIs you plan to use.</li>
                    <li>Go to Google Auth platform -&gt; Branding and complete the OAuth consent details.</li>
                    <li>In Audience, keep the app in testing/internal as appropriate and add your Google account as a test user if needed.</li>
                    <li>In Data Access, add the read-only scopes for the Google features you use, including Google Calendar and Gmail read-only access.</li>
                    <li>Go to Google Auth platform -&gt; Clients, create a Desktop app OAuth client, and download its JSON file.</li>
                    <li>Paste the downloaded JSON into this Google OAuth client JSON box and click Save Google OAuth JSON.</li>
                    <li>After the JSON is saved, click Connect Calendar and Connect Gmail here for the Google features you use.</li>
                  </ol>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use OAuth Desktop client JSON here, not a simple API key. The app stores this local file under <code>backend\config\google-client-secret.json</code>; packaged builds use <code>dist\backend\config\google-client-secret.json</code>.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" type="submit" disabled={!googleJson.trim()}>Save Google OAuth JSON</button>
            </div>
            <p className="text-sm text-slate-500">
              Stored in <code>backend\config\google-client-secret.json</code>, which is ignored by Git. This one file is used for Google Calendar and Gmail. Save the JSON first, then connect Calendar and Gmail from this section as needed. Existing tokens remain separate and are not deleted.
            </p>
          </form>
        ) : <Loading />}
      </Card>
      <Card title="Apple Calendar">
        {appleConfig ? (
          <form onSubmit={saveAppleCalendar} className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="label">Apple ID</span>
              <input className="input" type="email" value={appleConfig.apple_id} onChange={(e) => setAppleConfig({ ...appleConfig, apple_id: e.target.value })} placeholder="name@example.com" />
            </label>
            <label className="grid gap-1">
              <span className="label">App-specific password</span>
              <input className="input" type="password" value={applePassword} onChange={(e) => setApplePassword(e.target.value)} placeholder={appleConfig.app_specific_password_saved ? 'Saved; leave blank to keep' : 'xxxx-xxxx-xxxx-xxxx'} />
            </label>
            <label className="grid gap-1">
              <span className="label">CalDAV URL</span>
              <input className="input" value={appleConfig.url} onChange={(e) => setAppleConfig({ ...appleConfig, url: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="label">Default calendar name</span>
              <input className="input" value={appleConfig.calendar_name || ''} onChange={(e) => setAppleConfig({ ...appleConfig, calendar_name: e.target.value })} placeholder="Blank syncs all calendars" />
            </label>
            <div className="rounded-md border border-line p-3 text-sm dark:border-slate-700 md:col-span-2">
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                type="button"
                onClick={() => setShowAppleInstructions((value) => !value)}
                aria-expanded={showAppleInstructions}
              >
                <span>
                  <span className="block font-semibold">How to create an Apple app-specific password</span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Click to show the Apple Account steps for CalDAV access.</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition ${showAppleInstructions ? 'rotate-180' : ''}`} />
              </button>
              {showAppleInstructions && (
                <div className="mt-3 grid gap-3 border-t border-line pt-3 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  <ol className="grid list-decimal gap-2 pl-5">
                    <li>Open <a className="link" href="https://account.apple.com/" target="_blank" rel="noreferrer">account.apple.com</a> and sign in with the Apple ID that owns the calendar.</li>
                    <li>Open Sign-In and Security, then select App-Specific Passwords.</li>
                    <li>Select Generate an app-specific password and follow the prompts from Apple.</li>
                    <li>Use a clear label such as AI Home Dashboard so you can revoke it later without affecting other apps.</li>
                    <li>Copy the generated password immediately; Apple shows it once.</li>
                    <li>Paste that value into this App-specific password field, then click Save Apple Calendar or Test connection.</li>
                  </ol>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Do not use your normal Apple ID password here. If the password is lost or exposed, revoke it from App-Specific Passwords and generate a new one for this dashboard.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button className="btn btn-primary" type="submit">Save Apple Calendar</button>
              <button className="btn" type="button" onClick={testAppleCalendar}>Test connection</button>
            </div>
            <p className="text-sm text-slate-500 md:col-span-2">
              Stored in <code>{appleConfig.config_path}</code>, which is ignored by Git. Use an Apple app-specific password, not your main Apple ID password. Test connection saves the current Apple Calendar fields before verifying Apple accepts them.
            </p>
            {appleCalendars.length > 0 && (
              <div className="rounded-md border border-line p-3 text-sm dark:border-slate-700 md:col-span-2">
                <p className="mb-2 font-semibold">Available calendars</p>
                <div className="flex flex-wrap gap-2">
                  {appleCalendars.map((calendar) => <span key={calendar.url} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{calendar.name}</span>)}
                </div>
              </div>
            )}
          </form>
        ) : <Loading />}
      </Card>
      <Card title="Data Import / Export">
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => downloadUrl('/api/export')}>Export JSON</button>
          <button className="btn" onClick={() => downloadUrl('/api/export/bills.csv')}>Export Bills CSV</button>
          <button className="btn" onClick={() => downloadUrl('/api/export/notes.md')}>Export Knowledge Base Markdown</button>
        </div>
        <div className="mt-4 grid gap-2">
          <span className="label">Import JSON</span>
          <textarea className="input min-h-40" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste exported JSON here. The backend validates before writing to SQLite." />
          <button className="btn btn-primary w-fit" onClick={importJson}>Import</button>
        </div>
      </Card>
      <Card title="Copyright">
        <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-medium text-slate-900 dark:text-slate-100">Copyright © 2026 Jonathan Kaplan</p>
          <p>Licensed under the MIT License.</p>
          <p>Developed by Jonathan Kaplan with assistance from OpenAI Codex.</p>
        </div>
      </Card>
    </div>
  );
}

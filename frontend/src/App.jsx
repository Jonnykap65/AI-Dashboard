import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import BillsPage from './pages/BillsPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EntityPage from './pages/EntityPage.jsx';
import KnowledgeBasePage from './pages/KnowledgeBasePage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import SystemsToolsPage from './pages/SystemsToolsPage.jsx';
import { api } from './lib/api.js';
import { entityConfig } from './lib/config.js';
import { isDarkTheme, resolveTheme } from './lib/themes.js';

function routeFromHash() {
  const hashRoute = window.location.hash.replace('#', '') || '/';
  const route = hashRoute.split('?')[0];
  if (route === '/chores' || route === '/security') {
    window.history.replaceState(null, '', '#/');
    return '/';
  }
  if (route === '/packages') return '/projects';
  if (route === '/links') return '/notes';
  if (route === '/systems') return '/tools';
  return route;
}

export default function App() {
  const [route, setRouteState] = useState(routeFromHash());
  const [settings, setSettings] = useState(null);

  function setRoute(next) {
    window.location.hash = next;
    setRouteState(next);
  }

  useEffect(() => {
    const onHash = () => setRouteState(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    api.get('/api/settings').then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = resolveTheme(settings?.theme, prefersDark);
    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.classList.toggle('dark', isDarkTheme(settings?.theme, prefersDark));
  }, [settings]);

  const page = useMemo(() => {
    if (route === '/') return <Dashboard settings={settings} />;
    if (route === '/calendar') return <CalendarPage />;
    if (route === '/bills') return <BillsPage />;
    if (route === '/projects') return <ProjectsPage />;
    if (route === '/notes') return <KnowledgeBasePage />;
    if (route === '/system') return <SystemsToolsPage mode="system" />;
    if (route === '/tools') return <SystemsToolsPage mode="tools" />;
    if (route === '/search') return <SearchPage setRoute={setRoute} />;
    if (route === '/settings') return <SettingsPage onSaved={setSettings} />;
    const key = route.replace('/', '');
    if (entityConfig[key]) return <EntityPage config={entityConfig[key]} />;
    return <Dashboard />;
  }, [route, settings]);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar route={route} setRoute={setRoute} settings={settings} />
      <main className="flex-1 p-4 md:p-6">
        {page}
      </main>
    </div>
  );
}

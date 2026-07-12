import { BookOpen, CalendarDays, CreditCard, FolderKanban, Home, Monitor, Search, Settings, Wrench } from 'lucide-react';

const items = [
  ['/', 'Dashboard', Home],
  ['/calendar', 'Calendar', CalendarDays],
  ['/bills', 'Bills', CreditCard],
  ['/projects', 'Projects', FolderKanban],
  ['/notes', 'Knowledge Base', BookOpen],
  ['/search', 'Search', Search],
  ['/tools', 'Tools', Wrench],
  ['/system', 'System', Monitor],
  ['/settings', 'Settings', Settings]
];

export default function Sidebar({ route, setRoute, settings }) {
  const displayName = settings?.display_name?.trim() || 'Home';
  const dashboardTitle = `${displayName}'s Personal Dashboard`;

  return (
    <aside className="flex border-r border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:min-h-screen md:w-64 md:flex-col">
      <div className="grid flex-1 content-start gap-6">
        <div>
          <h1 className="text-xl font-bold">{dashboardTitle}</h1>
        </div>
        <nav className="grid gap-1">
          {items.map(([path, label, Icon]) => (
            <button
              key={path}
              onClick={() => setRoute(path)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium ${route === path ? 'bg-emerald-50 text-pine dark:bg-emerald-950 dark:text-emerald-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </div>
      <p className="fixed bottom-4 left-4 z-10 text-xs text-slate-500 dark:text-slate-500">© 2026 Jonathan Kaplan</p>
    </aside>
  );
}

import { AlertTriangle, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    high: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    muted: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  };
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${tones[tone] || tones.default}`}>{children}</span>;
}

export function EmptyState({ children = 'No records yet.' }) {
  return <p className="rounded-md border border-dashed border-line p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{children}</p>;
}

export function Loading() {
  return <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading</div>;
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"><AlertTriangle className="h-4 w-4" /> {message}</div>;
}

export function IconButton({ title, children, ...props }) {
  return (
    <button className="btn" title={title} aria-label={title} {...props}>
      {children}
    </button>
  );
}

export const Icons = { Pencil, Plus, Trash2, X };


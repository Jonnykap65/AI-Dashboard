import { AlertTriangle, ChevronDown, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

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

const disclosureFocusClass = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

function DisclosureHeading({ title, description, open }) {
  return (
    <>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        {description && <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        {open ? 'Collapse' : 'Expand'}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </span>
    </>
  );
}

export function CollapsibleCard({ title, description, open, onToggle, children, className = '', contentClassName = '' }) {
  const contentId = `collapsible-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section className={`card ${className}`}>
      <button
        className={`flex w-full items-center justify-between gap-3 rounded-md text-left ${disclosureFocusClass}`}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <DisclosureHeading title={title} description={description} open={open} />
      </button>
      {open && <div id={contentId} className={`mt-4 border-t border-line pt-4 dark:border-slate-800 ${contentClassName}`}>{children}</div>}
    </section>
  );
}

export function DisclosurePanel({ title, description, open, onToggle, children, className = '', contentClassName = '' }) {
  const contentId = `disclosure-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section className={`rounded-md border border-line dark:border-slate-800 ${className}`}>
      <button
        className={`flex w-full items-center justify-between gap-3 rounded-md p-3 text-left ${disclosureFocusClass}`}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <DisclosureHeading title={title} description={description} open={open} />
      </button>
      {open && <div id={contentId} className={`border-t border-line p-3 dark:border-slate-800 ${contentClassName}`}>{children}</div>}
    </section>
  );
}

export function RecordDetailsToggle({ open, onToggle, controls, label = 'details' }) {
  return (
    <button
      className={`flex shrink-0 items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-slate-500 transition hover:text-ink dark:text-slate-400 dark:hover:text-slate-100 ${disclosureFocusClass}`}
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
    >
      {open ? 'Collapse' : 'Expand'}
      <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
  );
}

export const quietActionClass = `rounded-md px-2 py-2 text-sm font-medium text-slate-500 transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100 ${disclosureFocusClass}`;

const quietActionTones = {
  default: '',
  positive: 'text-pine hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200',
  destructive: 'text-red-600 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200'
};

export function QuietAction({ tone = 'default', className = '', children, ...props }) {
  return <button className={`${quietActionClass} ${quietActionTones[tone] || ''} ${className}`} type="button" {...props}>{children}</button>;
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

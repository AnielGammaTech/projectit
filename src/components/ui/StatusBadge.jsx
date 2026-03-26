import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  review: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  planning: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  deleted: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  needed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  ordered: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  ready_to_install: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  installed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function StatusBadge({ status, label, className }) {
  const displayLabel = label || status?.replace(/_/g, ' ');
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.todo;
  return (<span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize", colorClass, className)}>{displayLabel}</span>);
}

import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ListTodo, Package, AlertCircle, Clock } from 'lucide-react';
import { format, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { parseLocalDate } from '@/utils/dateUtils';

export default function UpcomingDueDates({ tasks = [], parts = [], projectId }) {
  const today = startOfDay(new Date());

  // Get items with due dates, sorted by date
  const tasksWithDue = tasks
    .filter(t => t.due_date && t.status !== 'completed')
    .map(t => ({ ...t, type: 'task', date: parseLocalDate(t.due_date) }))
    .filter(t => t.date);

  const partsWithDue = parts
    .filter(p => p.due_date && p.status !== 'installed')
    .map(p => ({ ...p, type: 'part', date: parseLocalDate(p.due_date) }))
    .filter(p => p.date);

  const allItems = [...tasksWithDue, ...partsWithDue]
    .sort((a, b) => a.date - b.date)
    .slice(0, 12); // Show max 12 items

  const overdueItems = allItems.filter(item => isBefore(item.date, today));
  const upcomingItems = allItems.filter(item => !isBefore(item.date, today));

  const getDateLabel = (date) => {
    const days = differenceInDays(date, today);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `${days}d`;
    return format(date, 'MMM d');
  };

  if (allItems.length === 0) {
    return (
      <div className="relative rounded-2xl overflow-hidden h-full flex flex-col border border-rose-100/60 bg-gradient-to-br from-white via-rose-50/30 to-pink-50/40">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400" />
        <div className="p-3.5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-200/50">
              <CalendarIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-none">Upcoming</h3>
              <p className="text-[11px] text-slate-500 font-medium">Due dates & deadlines</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-3 pb-3">
          <div className="text-center">
            <Clock className="w-8 h-8 text-rose-200 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400">No upcoming due dates</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden h-full flex flex-col border border-rose-100/60 bg-gradient-to-br from-white via-rose-50/30 to-pink-50/40">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400" />
      <div className="p-3.5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-200/50">
              <CalendarIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-none">Due Dates</h3>
              <p className="text-[11px] text-slate-500 font-medium">{allItems.length} upcoming</p>
            </div>
          </div>
          {overdueItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-600 text-[10px] font-bold border border-red-200/60">
              {overdueItems.length} overdue
            </span>
          )}
        </div>
      </div>

      <div className="px-3 pb-3 space-y-1 overflow-y-auto flex-1">
        {overdueItems.length > 0 && (
          <div className="flex items-center gap-1.5 px-1 py-1">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Overdue</span>
          </div>
        )}

        {overdueItems.map((item, idx) => (
          <Link
            key={item.id}
            to={createPageUrl(item.type === 'task' ? 'ProjectTasks' : 'ProjectParts') + `?id=${projectId}`}
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200/50 hover:border-red-300 hover:shadow-sm cursor-pointer transition-all"
            >
              <div className="p-1 rounded-lg bg-red-100">
                {item.type === 'task' ? (
                  <ListTodo className="w-3 h-3 text-red-600" />
                ) : (
                  <Package className="w-3 h-3 text-red-600" />
                )}
              </div>
              <span className="text-xs text-slate-700 flex-1 truncate font-medium">{item.title || item.name}</span>
              <span className="text-[10px] text-red-600 font-bold whitespace-nowrap bg-red-100/80 px-1.5 py-0.5 rounded-md">{getDateLabel(item.date)}</span>
            </motion.div>
          </Link>
        ))}

        {upcomingItems.length > 0 && overdueItems.length > 0 && (
          <div className="border-t border-rose-100 my-1.5" />
        )}

        {upcomingItems.map((item, idx) => {
          const days = differenceInDays(item.date, today);
          const isUrgent = days <= 2;

          return (
            <Link
              key={item.id}
              to={createPageUrl(item.type === 'task' ? 'ProjectTasks' : 'ProjectParts') + `?id=${projectId}`}
            >
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (overdueItems.length + idx) * 0.03 }}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-xl transition-all cursor-pointer",
                  isUrgent
                    ? "bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200/50 hover:border-amber-300 hover:shadow-sm"
                    : "bg-white/60 border border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-sm"
                )}
              >
                <div className={cn("p-1 rounded-lg", isUrgent ? "bg-amber-100" : "bg-slate-50")}>
                  {item.type === 'task' ? (
                    <ListTodo className={cn("w-3 h-3", isUrgent ? "text-amber-600" : "text-indigo-500")} />
                  ) : (
                    <Package className={cn("w-3 h-3", isUrgent ? "text-amber-600" : "text-emerald-500")} />
                  )}
                </div>
                <span className="text-xs text-slate-600 flex-1 truncate">{item.title || item.name}</span>
                <span className={cn(
                  "text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-md",
                  isUrgent ? "text-amber-700 bg-amber-100/80" : "text-slate-500 bg-slate-100/80"
                )}>
                  {getDateLabel(item.date)}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
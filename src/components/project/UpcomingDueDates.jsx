import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ListTodo, Package, AlertCircle } from 'lucide-react';
import { format, isBefore, startOfDay, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function UpcomingDueDates({ tasks = [], parts = [], projectId }) {
  const today = startOfDay(new Date());

  // Get items with due dates, sorted by date
  const tasksWithDue = tasks
    .filter(t => t.due_date && t.status !== 'completed')
    .map(t => ({ ...t, type: 'task', date: parseISO(t.due_date) }));
  
  const partsWithDue = parts
    .filter(p => p.due_date && p.status !== 'installed')
    .map(p => ({ ...p, type: 'part', date: parseISO(p.due_date) }));

  const allItems = [...tasksWithDue, ...partsWithDue]
    .sort((a, b) => a.date - b.date)
    .slice(0, 8); // Show max 8 items

  const overdueItems = allItems.filter(item => isBefore(item.date, today));
  const upcomingItems = allItems.filter(item => !isBefore(item.date, today));

  const getDateLabel = (date) => {
    const days = differenceInDays(date, today);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `In ${days} days`;
    return format(date, 'MMM d');
  };

  if (allItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-rose-100">
            <CalendarIcon className="w-4 h-4 text-rose-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Upcoming</h3>
        </div>
        <p className="text-sm text-slate-400 text-center py-4">No upcoming due dates</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-pink-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500 shadow-md shadow-rose-200">
            <CalendarIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Upcoming Due Dates</h3>
            <p className="text-xs text-slate-500">{allItems.length} items</p>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-1.5 max-h-[280px] overflow-y-auto">
        {overdueItems.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span className="text-xs font-medium text-red-600">Overdue</span>
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
              className="flex items-center gap-3 p-2.5 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 cursor-pointer transition-colors"
            >
              {item.type === 'task' ? (
                <ListTodo className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <Package className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className="text-sm text-slate-700 flex-1 truncate">{item.title || item.name}</span>
              <span className="text-xs text-red-600 font-medium whitespace-nowrap">{getDateLabel(item.date)}</span>
            </motion.div>
          </Link>
        ))}

        {upcomingItems.length > 0 && overdueItems.length > 0 && (
          <div className="border-t border-slate-100 my-2" />
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
                  "flex items-center gap-3 p-2.5 rounded-xl transition-colors cursor-pointer",
                  isUrgent ? "bg-amber-50 border border-amber-100 hover:bg-amber-100" : "bg-slate-50 hover:bg-slate-100"
                )}
              >
                {item.type === 'task' ? (
                  <ListTodo className={cn("w-4 h-4 shrink-0", isUrgent ? "text-amber-600" : "text-indigo-500")} />
                ) : (
                  <Package className={cn("w-4 h-4 shrink-0", isUrgent ? "text-amber-600" : "text-amber-500")} />
                )}
                <span className="text-sm text-slate-700 flex-1 truncate">{item.title || item.name}</span>
                <span className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isUrgent ? "text-amber-600" : "text-slate-500"
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
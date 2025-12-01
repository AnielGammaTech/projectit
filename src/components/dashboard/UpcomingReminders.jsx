import { motion } from 'framer-motion';
import { Bell, Calendar, ChevronRight } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

export default function UpcomingReminders({ reminders = [], projects = [] }) {
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getDateLabel = (date) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const sortedReminders = [...reminders]
    .filter(r => !r.is_completed)
    .sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date))
    .slice(0, 5);

  if (sortedReminders.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-violet-50">
            <Bell className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Upcoming Reminders</h3>
        </div>
        <p className="text-slate-500 text-center py-8">No upcoming reminders</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-violet-50">
          <Bell className="w-5 h-5 text-violet-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Upcoming Reminders</h3>
      </div>

      <div className="space-y-3">
        {sortedReminders.map((reminder, idx) => {
          const isOverdue = isPast(new Date(reminder.reminder_date)) && !isToday(new Date(reminder.reminder_date));
          
          return (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "p-4 rounded-xl border transition-all hover:shadow-sm",
                isOverdue ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={cn(
                    "font-medium",
                    isOverdue ? "text-red-900" : "text-slate-900"
                  )}>
                    {reminder.title}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {getProjectName(reminder.project_id)}
                  </p>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-lg",
                  isOverdue ? "bg-red-100 text-red-700" : isToday(new Date(reminder.reminder_date)) ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                )}>
                  <Calendar className="w-3.5 h-3.5" />
                  {getDateLabel(reminder.reminder_date)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Package, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function UpcomingDeadlines({ tasks = [], parts = [], projects = [] }) {
  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  // Combine tasks and parts with due dates
  const deadlines = [
    ...tasks
      .filter(t => t.due_date && t.status !== 'completed')
      .map(t => ({ ...t, type: 'task', date: new Date(t.due_date) })),
    ...parts
      .filter(p => p.due_date && p.status !== 'installed')
      .map(p => ({ ...p, type: 'part', date: new Date(p.due_date) }))
  ]
    .sort((a, b) => a.date - b.date)
    .slice(0, 8);

  const getDateBadge = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isPast(date) && !isToday(date)) {
      return { label: 'Overdue', color: 'bg-red-500 text-white', urgent: true };
    }
    if (isToday(date)) {
      return { label: 'Today', color: 'bg-orange-500 text-white', urgent: true };
    }
    if (isTomorrow(date)) {
      return { label: 'Tomorrow', color: 'bg-amber-500 text-white', urgent: true };
    }
    const days = differenceInDays(date, today);
    if (days <= 7) {
      return { label: `${days} days`, color: 'bg-blue-100 text-blue-700', urgent: false };
    }
    return { label: format(date, 'MMM d'), color: 'bg-slate-100 text-slate-600', urgent: false };
  };

  if (deadlines.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-50">
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Upcoming Deadlines</h3>
        </div>
        <p className="text-slate-500 text-center py-6">No upcoming deadlines</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-amber-50">
          <Calendar className="w-5 h-5 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Upcoming Deadlines</h3>
      </div>

      <div className="space-y-2">
        {deadlines.map((item, idx) => {
          const dateBadge = getDateBadge(item.date);
          const Icon = item.type === 'task' ? CheckCircle2 : Package;
          const iconBg = item.type === 'task' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600';

          return (
            <motion.div
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Link to={createPageUrl('ProjectDetail') + `?id=${item.project_id}`}>
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-slate-50",
                  dateBadge.urgent && "bg-red-50/50"
                )}>
                  <div className={cn("p-1.5 rounded-lg", iconBg)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {item.title || item.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{getProjectName(item.project_id)}</p>
                  </div>
                  <Badge className={cn("text-xs shrink-0", dateBadge.color)}>
                    {dateBadge.urgent && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {dateBadge.label}
                  </Badge>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
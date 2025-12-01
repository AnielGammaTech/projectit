import { motion } from 'framer-motion';
import { Activity, CheckCircle2, Package, Bell, FolderPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RecentActivity({ tasks = [], parts = [], reminders = [] }) {
  // Combine recent items
  const activities = [
    ...tasks.slice(0, 3).map(t => ({
      type: 'task',
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-50',
      title: t.title,
      subtitle: t.status === 'completed' ? 'Completed' : 'Updated',
      date: t.updated_date
    })),
    ...parts.slice(0, 2).map(p => ({
      type: 'part',
      icon: Package,
      color: 'text-blue-500 bg-blue-50',
      title: p.name,
      subtitle: p.status,
      date: p.updated_date
    })),
    ...reminders.slice(0, 2).map(r => ({
      type: 'reminder',
      icon: Bell,
      color: 'text-violet-500 bg-violet-50',
      title: r.title,
      subtitle: 'Reminder set',
      date: r.created_date
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-indigo-50">
            <Activity className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <p className="text-slate-500 text-center py-8">No recent activity</p>
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
        <div className="p-2 rounded-xl bg-indigo-50">
          <Activity className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
      </div>

      <div className="space-y-4">
        {activities.map((activity, idx) => {
          const Icon = activity.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-3"
            >
              <div className={`p-2 rounded-lg ${activity.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{activity.title}</p>
                <p className="text-sm text-slate-500">{activity.subtitle}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, Package, MessageSquare, FolderKanban, Clock, ArrowUpCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ActivityFeed({ tasks = [], parts = [], notes = [], projects = [] }) {
  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  // Combine all activities
  const activities = [
    ...tasks.slice(0, 10).map(t => ({
      id: `task-${t.id}`,
      type: 'task',
      title: t.title,
      subtitle: t.status === 'completed' ? 'Task completed' : `Status: ${t.status?.replace('_', ' ')}`,
      project_id: t.project_id,
      date: t.updated_date,
      icon: t.status === 'completed' ? CheckCircle2 : t.status === 'in_progress' ? ArrowUpCircle : Clock,
      color: t.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
             t.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
    })),
    ...parts.slice(0, 6).map(p => ({
      id: `part-${p.id}`,
      type: 'part',
      title: p.name,
      subtitle: `Part ${p.status}`,
      project_id: p.project_id,
      date: p.updated_date,
      icon: Package,
      color: p.status === 'installed' ? 'bg-emerald-100 text-emerald-600' : 
             p.status === 'received' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
    })),
    ...notes.slice(0, 6).map(n => ({
      id: `note-${n.id}`,
      type: 'note',
      title: n.content?.substring(0, 50) + (n.content?.length > 50 ? '...' : ''),
      subtitle: `${n.type} by ${n.author_name || 'Unknown'}`,
      project_id: n.project_id,
      date: n.created_date,
      icon: MessageSquare,
      color: 'bg-violet-100 text-violet-600'
    }))
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-indigo-50">
            <Activity className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <p className="text-slate-500 text-center py-6">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-indigo-50">
          <Activity className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
      </div>

      <div className="space-y-1">
        {activities.map((activity, idx) => {
          const Icon = activity.icon;

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Link to={createPageUrl('ProjectDetail') + `?id=${activity.project_id}`}>
                <div className="flex items-start gap-3 p-2.5 rounded-xl transition-all hover:bg-slate-50">
                  <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", activity.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{activity.title}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{activity.subtitle}</span>
                      <span>•</span>
                      <span className="truncate">{getProjectName(activity.project_id)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
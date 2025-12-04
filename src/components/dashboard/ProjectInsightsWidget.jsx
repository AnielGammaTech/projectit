import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, UserX, Clock, RotateCcw, TrendingUp, CheckCircle2,
  Sparkles, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { differenceInDays, isPast, isToday } from 'date-fns';

export default function ProjectInsightsWidget({ projectId }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', projectId],
    queryFn: () => base44.entities.Part.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  // Analyze tasks for insights
  const insights = [];
  
  // Unassigned tasks
  const unassignedTasks = tasks.filter(t => !t.assigned_to && t.status !== 'completed' && t.status !== 'archived');
  if (unassignedTasks.length > 0) {
    insights.push({
      type: 'warning',
      icon: UserX,
      title: `${unassignedTasks.length} unassigned task${unassignedTasks.length > 1 ? 's' : ''}`,
      description: 'Tasks without an owner may be forgotten',
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      tasks: unassignedTasks
    });
  }

  // Overdue tasks
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'completed' || t.status === 'archived' || !t.due_date) return false;
    return isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date));
  });
  if (overdueTasks.length > 0) {
    insights.push({
      type: 'critical',
      icon: AlertTriangle,
      title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
      description: 'These need immediate attention',
      color: 'text-red-500',
      bg: 'bg-red-50',
      tasks: overdueTasks
    });
  }

  // Stale tasks (no update in 7+ days and not completed)
  const staleTasks = tasks.filter(t => {
    if (t.status === 'completed' || t.status === 'archived') return false;
    const lastUpdate = new Date(t.updated_date || t.created_date);
    return differenceInDays(new Date(), lastUpdate) > 7;
  });
  if (staleTasks.length > 0) {
    insights.push({
      type: 'info',
      icon: Clock,
      title: `${staleTasks.length} stale task${staleTasks.length > 1 ? 's' : ''}`,
      description: 'No updates in over a week',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      tasks: staleTasks
    });
  }

  // Parts waiting for delivery
  const pendingParts = parts.filter(p => p.status === 'ordered');
  if (pendingParts.length > 0) {
    insights.push({
      type: 'info',
      icon: RotateCcw,
      title: `${pendingParts.length} part${pendingParts.length > 1 ? 's' : ''} awaiting delivery`,
      description: 'Track vendor shipments',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50'
    });
  }

  // All good!
  if (insights.length === 0) {
    insights.push({
      type: 'success',
      icon: CheckCircle2,
      title: 'Project on track',
      description: 'No issues detected',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    });
  }

  // Calculate health score
  const totalActive = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived').length;
  const issueCount = unassignedTasks.length + overdueTasks.length + staleTasks.length;
  const healthScore = totalActive > 0 ? Math.max(0, 100 - Math.round((issueCount / totalActive) * 100)) : 100;

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600 shadow-lg shadow-violet-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">AI Insights</h3>
              <p className="text-sm text-slate-500">Project health analysis</p>
            </div>
          </div>
          <div className="text-right">
            <div className={cn("text-2xl font-bold", getHealthColor(healthScore))}>{healthScore}%</div>
            <div className="text-xs text-slate-500">Health</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {insights.slice(0, 4).map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer hover:shadow-sm",
                insight.bg
              )}
            >
              <div className={cn("p-1.5 rounded-lg bg-white/80", insight.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900">{insight.title}</p>
                <p className="text-xs text-slate-500">{insight.description}</p>
              </div>
              {insight.tasks && (
                <ArrowRight className="w-4 h-4 text-slate-400 mt-1" />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
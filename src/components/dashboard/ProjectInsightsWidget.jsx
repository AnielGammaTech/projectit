import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, UserX, Clock, RotateCcw, TrendingUp, CheckCircle2,
  Sparkles, ArrowRight, ChevronDown, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { differenceInDays, isPast, isToday } from 'date-fns';

export default function ProjectInsightsWidget({ projectId, tasks: propTasks, parts: propParts, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState({});
  
  const { data: fetchedTasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId && !propTasks
  });

  const { data: fetchedParts = [] } = useQuery({
    queryKey: ['parts', projectId],
    queryFn: () => api.entities.Part.filter({ project_id: projectId }),
    enabled: !!projectId && !propParts
  });

  const tasks = propTasks || fetchedTasks;
  const parts = propParts || fetchedParts;

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
  const totalIssues = unassignedTasks.length + overdueTasks.length + staleTasks.length;
  const healthScore = totalActive > 0 ? Math.max(0, 100 - Math.round((totalIssues / totalActive) * 100)) : 100;

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getHealthBgColor = (score) => {
    if (score >= 80) return 'bg-emerald-100 border-emerald-200';
    if (score >= 60) return 'bg-amber-100 border-amber-200';
    return 'bg-red-100 border-red-200';
  };

  const hasIssues = insights.length > 0 && insights[0].type !== 'success';
  const issueCount = insights.filter(i => i.type !== 'success').length;

  // Compact view for header
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => hasIssues && setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
            hasIssues ? "cursor-pointer hover:shadow-md" : "cursor-default",
            getHealthBgColor(healthScore)
          )}
        >
          <div className={cn("text-lg font-bold", getHealthColor(healthScore))}>
            {healthScore}%
          </div>
          <div className="text-xs text-slate-600">Health</div>
          {hasIssues && (
            <>
              <div className="w-px h-4 bg-slate-300 mx-1" />
              <div className="flex items-center gap-1">
                {insights[0].type === 'critical' && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                {insights[0].type === 'warning' && <UserX className="w-3.5 h-3.5 text-amber-500" />}
                {insights[0].type === 'info' && <Clock className="w-3.5 h-3.5 text-blue-500" />}
                <span className="text-xs font-medium text-slate-700">{issueCount}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", expanded && "rotate-180")} />
              </div>
            </>
          )}
          {!hasIssues && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1" />}
        </button>

        {/* Expanded dropdown */}
        <AnimatePresence>
          {expanded && hasIssues && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <span className="font-semibold text-sm text-slate-900">AI Insights</span>
                </div>
                <button onClick={() => setExpanded(false)} className="p-1 hover:bg-slate-200 rounded">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                {insights.filter(i => i.type !== 'success').map((insight, idx) => {
                  const Icon = insight.icon;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-2 p-2.5 rounded-lg",
                        insight.bg
                      )}
                    >
                      <div className={cn("p-1 rounded-md bg-white/80", insight.color)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs text-slate-900">{insight.title}</p>
                        <p className="text-[10px] text-slate-500">{insight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full widget view
  return (
    <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-600 shadow-lg shadow-violet-200">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">AI Insights</h3>
            <p className="text-xs text-slate-500">Project health analysis</p>
          </div>
        </div>
        <div className="text-right">
          <div className={cn("text-xl font-bold", getHealthColor(healthScore))}>{healthScore}%</div>
          <div className="text-[10px] text-slate-500">Health</div>
        </div>
      </div>

      <div className="space-y-2">
        {insights.slice(0, 3).map((insight, idx) => {
          const Icon = insight.icon;
          const isExpanded = expandedInsights[idx];
          return (
            <div key={idx}>
              <div
                onClick={() => insight.tasks && setExpandedInsights(prev => ({ ...prev, [idx]: !prev[idx] }))}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-lg transition-all",
                  insight.bg,
                  insight.tasks && "cursor-pointer hover:shadow-sm"
                )}
              >
                <div className={cn("p-1 rounded-md bg-white/80", insight.color)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs text-slate-900">{insight.title}</p>
                  <p className="text-[10px] text-slate-500">{insight.description}</p>
                </div>
                {insight.tasks && (
                  <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                )}
              </div>
              {isExpanded && insight.tasks && (
                <div className="mt-1.5 ml-7 space-y-1">
                  {insight.tasks.slice(0, 3).map(task => (
                    <Link
                      key={task.id}
                      to={createPageUrl('ProjectTasks') + `?id=${projectId}&taskId=${task.id}`}
                      className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-slate-100 hover:border-slate-300 transition-all text-xs"
                    >
                      <span className="flex-1 truncate text-slate-700">{task.title}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </Link>
                  ))}
                  {insight.tasks.length > 3 && (
                    <p className="text-[10px] text-slate-400 pl-1">+{insight.tasks.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
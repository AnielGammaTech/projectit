import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import {
  Monitor, Users, AlertTriangle, TrendingUp, Clock,
  CheckCircle2, Package, ListTodo, Sparkles, RefreshCw,
  BarChart3, Calendar, Loader2, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UserAvatar from '@/components/UserAvatar';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

export default function ManagerDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list('-created_date'),
    refetchInterval: 30000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => api.entities.Task.list(),
    refetchInterval: 30000
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['allParts'],
    queryFn: () => api.entities.Part.list(),
    refetchInterval: 30000
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => api.entities.TimeEntry.list('-created_date', 100),
    refetchInterval: 30000
  });

  // Calculate metrics
  const activeProjects = projects.filter(p => p.status !== 'archived' && p.status !== 'completed');
  const overdueTasks = tasks.filter(t => { const d = parseLocalDate(t.due_date); return d && isPast(d) && !isToday(d) && t.status !== 'completed'; });
  const unassignedTasks = tasks.filter(t => !t.assigned_to && t.status !== 'completed' && t.status !== 'archived');
  const pendingParts = parts.filter(p => p.status === 'ordered');
  const readyToInstall = parts.filter(p => p.status === 'ready_to_install');

  // Workload per tech
  const techWorkload = teamMembers.map(member => {
    const memberTasks = tasks.filter(t => t.assigned_to === member.email && t.status !== 'completed' && t.status !== 'archived');
    const overdue = memberTasks.filter(t => { const d = parseLocalDate(t.due_date); return d && isPast(d) && !isToday(d); });
    const dueToday = memberTasks.filter(t => { const d = parseLocalDate(t.due_date); return d && isToday(d); });
    const hoursToday = timeEntries
      .filter(e => e.user_email === member.email && e.start_time && isToday(new Date(e.start_time)))
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;
    
    return {
      ...member,
      taskCount: memberTasks.length,
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      hoursToday: hoursToday.toFixed(1)
    };
  }).sort((a, b) => b.taskCount - a.taskCount);

  // Generate AI insights
  const generateInsights = async () => {
    setLoadingInsights(true);
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze this project management data and provide 3-4 actionable insights for a manager:

Active Projects: ${activeProjects.length}
Overdue Tasks: ${overdueTasks.length}
Unassigned Tasks: ${unassignedTasks.length}
Parts Awaiting Delivery: ${pendingParts.length}
Parts Ready to Install: ${readyToInstall.length}

Team Workload:
${techWorkload.map(t => `- ${t.name}: ${t.taskCount} tasks, ${t.overdueCount} overdue`).join('\n')}

Provide brief, actionable recommendations. Focus on bottlenecks and priorities.`,
        response_json_schema: {
          type: 'object',
          properties: {
            insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                }
              }
            }
          }
        }
      });
      setAiInsights(result.insights);
    } catch (err) {
      console.error('Failed to generate insights:', err);
    }
    setLoadingInsights(false);
  };

  useEffect(() => {
    if (teamMembers.length > 0 && tasks.length > 0) {
      generateInsights();
    }
  }, [teamMembers.length, tasks.length]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Dashboard')} className="p-2 hover:bg-slate-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-indigo-400" />
            <div>
              <h1 className="text-2xl font-bold">Manager Dashboard</h1>
              <p className="text-slate-400 text-sm">{format(currentTime, 'EEEE, MMMM d, yyyy • h:mm a')}</p>
            </div>
          </div>
        </div>
        <Button onClick={generateInsights} disabled={loadingInsights} variant="outline" className="text-white border-slate-600">
          <RefreshCw className={cn("w-4 h-4 mr-2", loadingInsights && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Left Column - Stats */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="font-semibold">Overview</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <p className="text-3xl font-bold text-white">{activeProjects.length}</p>
                <p className="text-xs text-slate-400">Active Projects</p>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <p className="text-3xl font-bold text-emerald-400">{tasks.filter(t => t.status === 'completed').length}</p>
                <p className="text-xs text-slate-400">Completed Tasks</p>
              </div>
            </div>
          </motion.div>

          {/* Alerts */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <span className="font-semibold">Alerts</span>
            </div>
            <div className="space-y-3">
              {overdueTasks.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <span className="text-red-400">Overdue Tasks</span>
                  <span className="text-2xl font-bold text-red-400">{overdueTasks.length}</span>
                </div>
              )}
              {unassignedTasks.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <span className="text-amber-400">Unassigned</span>
                  <span className="text-2xl font-bold text-amber-400">{unassignedTasks.length}</span>
                </div>
              )}
              {readyToInstall.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <span className="text-purple-400">Ready to Install</span>
                  <span className="text-2xl font-bold text-purple-400">{readyToInstall.length}</span>
                </div>
              )}
              {overdueTasks.length === 0 && unassignedTasks.length === 0 && readyToInstall.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400">All clear!</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Center - Team Workload */}
        <div className="col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-800 rounded-2xl p-5 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <span className="font-semibold">Team Workload</span>
            </div>
            <div className="space-y-3">
              {techWorkload.map((tech, idx) => (
                <motion.div 
                  key={tech.id} 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: 0.1 * idx }}
                  className="bg-slate-700/50 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        email={tech.email}
                        name={tech.name}
                        avatarUrl={teamMembers.find(m => m.email === tech.email)?.avatar_url}
                        size="lg"
                      />
                      <div>
                        <p className="font-medium">{tech.name}</p>
                        <p className="text-xs text-slate-400">{tech.hoursToday}h logged today</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {tech.overdueCount > 0 && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          {tech.overdueCount} overdue
                        </Badge>
                      )}
                      {tech.dueTodayCount > 0 && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          {tech.dueTodayCount} due today
                        </Badge>
                      )}
                      <span className="text-lg font-bold">{tech.taskCount}</span>
                      <span className="text-slate-400 text-sm">tasks</span>
                    </div>
                  </div>
                  <Progress value={Math.min(tech.taskCount * 10, 100)} className="h-1.5 bg-slate-600" />
                </motion.div>
              ))}
              {techWorkload.length === 0 && (
                <p className="text-slate-400 text-center py-8">No team members found</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right - AI Insights */}
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-slate-800 rounded-2xl p-5 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <span className="font-semibold">AI Insights</span>
            </div>
            {loadingInsights ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              </div>
            ) : aiInsights ? (
              <div className="space-y-3">
                {aiInsights.map((insight, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className={cn(
                      "p-3 rounded-xl border",
                      insight.priority === 'high' ? "bg-red-500/10 border-red-500/20" :
                      insight.priority === 'medium' ? "bg-amber-500/10 border-amber-500/20" :
                      "bg-slate-700/50 border-slate-600"
                    )}
                  >
                    <p className="font-medium text-sm mb-1">{insight.title}</p>
                    <p className="text-xs text-slate-400">{insight.description}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">Click refresh to generate insights</p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Bottom Row - Overdue Items */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 bg-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/20">
            <Clock className="w-5 h-5 text-red-400" />
          </div>
          <span className="font-semibold">Overdue Items</span>
          <Badge className="bg-red-500/20 text-red-400">{overdueTasks.length}</Badge>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {overdueTasks.slice(0, 8).map(task => {
            const daysOverdue = differenceInDays(new Date(), parseLocalDate(task.due_date));
            return (
              <div key={task.id} className="bg-slate-700/50 rounded-xl p-3 border border-red-500/20">
                <p className="font-medium text-sm truncate">{task.title}</p>
                <p className="text-xs text-slate-400 truncate">{task.assigned_name || 'Unassigned'}</p>
                <p className="text-xs text-red-400 mt-1">{daysOverdue} day{daysOverdue > 1 ? 's' : ''} overdue</p>
              </div>
            );
          })}
          {overdueTasks.length === 0 && (
            <div className="col-span-4 text-center py-6 text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              No overdue items
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
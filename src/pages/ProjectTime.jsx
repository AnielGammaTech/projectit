import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  User,
  Calendar,
  Timer,
  BarChart3,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';
import UserAvatar from '@/components/UserAvatar';

export default function ProjectTime() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState('');

  const { data: project, refetch: refetchProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await api.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries', projectId],
    queryFn: () => api.entities.TimeEntry.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  useEffect(() => {
    if (project) {
      setBudgetValue(project.time_budget_hours?.toString() || '');
    }
  }, [project]);

  // Calculate totals
  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);
  const budgetHours = project?.time_budget_hours || 0;
  const budgetUsedPercent = budgetHours > 0 ? Math.min((totalHours / budgetHours) * 100, 100) : 0;
  const remainingHours = Math.max(budgetHours - totalHours, 0);
  const isOverBudget = totalHours > budgetHours && budgetHours > 0;

  // This week's hours
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekHours = timeEntries
    .filter(entry => {
      if (!entry.date) return false;
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
    })
    .reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);

  // Group by team member
  const hoursByMember = timeEntries.reduce((acc, entry) => {
    const email = entry.user_email || 'Unknown';
    if (!acc[email]) {
      acc[email] = { hours: 0, name: entry.user_name || email, entries: [] };
    }
    acc[email].hours += entry.duration_hours || 0;
    acc[email].entries.push(entry);
    return acc;
  }, {});

  const handleSaveBudget = async () => {
    const hours = parseFloat(budgetValue) || 0;
    await api.entities.Project.update(projectId, { time_budget_hours: hours });
    refetchProject();
    setEditingBudget(false);
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b] flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b]">
      <ProjectNavHeader project={project} currentPage="ProjectTime" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500 shadow-lg shadow-blue-200">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Time Tracking</h1>
              <p className="text-slate-500 dark:text-slate-400">{timeEntries.length} time entries logged</p>
            </div>
          </div>
        </div>

        {/* Budget Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "bg-white dark:bg-[#1e2a3a] rounded-2xl border p-6 mb-6 shadow-sm",
            isOverBudget ? "border-red-200 bg-red-50/30" : "border-slate-100 dark:border-slate-700/50"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Time Budget
            </h2>
            {editingBudget ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  className="w-24 h-8"
                  placeholder="Hours"
                />
                <Button size="sm" onClick={handleSaveBudget}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingBudget(false)}>Cancel</Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEditingBudget(true)}
                className="text-slate-500"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit Budget
              </Button>
            )}
          </div>

          {budgetHours > 0 ? (
            <>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{totalHours.toFixed(1)}</span>
                  <span className="text-lg text-slate-500 dark:text-slate-400 ml-1">/ {budgetHours}h</span>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-sm font-medium",
                    isOverBudget ? "text-red-600" : remainingHours < budgetHours * 0.2 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {isOverBudget ? (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {(totalHours - budgetHours).toFixed(1)}h over budget
                      </span>
                    ) : (
                      `${remainingHours.toFixed(1)}h remaining`
                    )}
                  </span>
                </div>
              </div>
              <Progress 
                value={budgetUsedPercent} 
                className={cn(
                  "h-3",
                  isOverBudget ? "[&>div]:bg-red-500" : budgetUsedPercent > 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                )}
              />
              <p className="text-sm text-slate-500 mt-2">{budgetUsedPercent.toFixed(0)}% of budget used</p>
            </>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <Timer className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No time budget set</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setEditingBudget(true)}
              >
                Set Budget
              </Button>
            </div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#1e2a3a] rounded-xl border border-slate-100 dark:border-slate-700/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Hours</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-[#1e2a3a] rounded-xl border border-slate-100 dark:border-slate-700/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">This Week</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{thisWeekHours.toFixed(1)}h</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-[#1e2a3a] rounded-xl border border-slate-100 dark:border-slate-700/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <User className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Team Members</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{Object.keys(hoursByMember).length}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Team Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-400" />
            Time by Team Member
          </h2>
          {Object.keys(hoursByMember).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(hoursByMember)
                .sort((a, b) => b[1].hours - a[1].hours)
                .map(([email, data]) => {
                  const memberPercent = totalHours > 0 ? (data.hours / totalHours) * 100 : 0;
                  return (
                    <div key={email} className="flex items-center gap-4">
                      <UserAvatar
                        email={email}
                        name={data.name}
                        avatarUrl={teamMembers.find(m => m.email === email)?.avatar_url}
                        size="lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{data.name}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-300">{data.hours.toFixed(1)}h</span>
                        </div>
                        <Progress value={memberPercent} className="h-2 [&>div]:bg-blue-500" />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No time entries logged yet</p>
              <p className="text-sm">Use the time tracker on the project page to log hours</p>
            </div>
          )}
        </motion.div>

        {/* Recent Time Entries */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6"
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            Recent Time Entries
          </h2>
          {timeEntries.length > 0 ? (
            <div className="space-y-3">
              {timeEntries
                .sort((a, b) => new Date(b.date || b.created_date) - new Date(a.date || a.created_date))
                .slice(0, 10)
                .map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <UserAvatar
                      email={entry.user_email}
                      name={entry.user_name}
                      avatarUrl={teamMembers.find(m => m.email === entry.user_email)?.avatar_url}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{entry.description || 'Time logged'}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                        <span>{entry.user_name}</span>
                        {entry.date && <span>{format(parseISO(entry.date), 'MMM d, yyyy')}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {(entry.duration_hours || 0).toFixed(1)}h
                    </Badge>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Timer className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No time entries yet</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
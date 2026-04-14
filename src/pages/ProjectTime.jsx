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
import { ProjectSubpageSkeleton } from '@/components/ui/PageSkeletons';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';
import UserAvatar from '@/components/UserAvatar';
import { toast } from 'sonner';

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
    try {
      const hours = parseFloat(budgetValue) || 0;
      await api.entities.Project.update(projectId, { time_budget_hours: hours });
      refetchProject();
    } catch (err) {
      toast.error('Failed to save budget. Please try again.');
    } finally {
      setEditingBudget(false);
    }
  };

  if (!project) return <ProjectSubpageSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <ProjectNavHeader project={project} currentPage="ProjectTime" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500 shadow-lg shadow-blue-500/20">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Time Tracking</h1>
              <p className="text-muted-foreground">{timeEntries.length} time entries logged</p>
            </div>
          </div>
        </div>

        {/* Budget Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "bg-card rounded-2xl border p-4 sm:p-6 mb-6 shadow-sm",
            isOverBudget ? "border-red-200 bg-red-50/30" : "border-border"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
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
                className="text-muted-foreground"
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
                  <span className="text-2xl sm:text-4xl font-bold text-foreground">{totalHours.toFixed(1)}</span>
                  <span className="text-lg text-muted-foreground ml-1">/ {budgetHours}h</span>
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
              <p className="text-sm text-muted-foreground mt-2">{budgetUsedPercent.toFixed(0)}% of budget used</p>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Timer className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
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
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{thisWeekHours.toFixed(1)}h</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{Object.keys(hoursByMember).length}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Team Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl border border-border p-4 sm:p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
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
                          <span className="font-medium text-foreground">{data.name}</span>
                          <span className="text-sm text-muted-foreground">{data.hours.toFixed(1)}h</span>
                        </div>
                        <Progress value={memberPercent} className="h-2 [&>div]:bg-blue-500" />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
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
          className="bg-card rounded-2xl border border-border p-4 sm:p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            Recent Time Entries
          </h2>
          {timeEntries.length > 0 ? (
            <div className="space-y-3">
              {timeEntries
                .sort((a, b) => new Date(b.date || b.created_date) - new Date(a.date || a.created_date))
                .slice(0, 10)
                .map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <UserAvatar
                      email={entry.user_email}
                      name={entry.user_name}
                      avatarUrl={teamMembers.find(m => m.email === entry.user_email)?.avatar_url}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{entry.description || 'Time logged'}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{entry.user_name}</span>
                        {entry.date && <span>{format(parseISO(entry.date), 'MMM d, yyyy')}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50">
                      {(entry.duration_hours || 0).toFixed(1)}h
                    </Badge>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Timer className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
              <p>No time entries yet</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
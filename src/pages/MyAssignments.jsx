import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { format, isPast, isToday, isTomorrow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { parseLocalDate } from '@/utils/dateUtils';
import { CheckSquare, MessageSquare, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl, resolveUploadUrl } from '@/utils';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

import { getColorForEmail, getInitials } from '@/constants/colors';
import { toast } from 'sonner';

export default function MyAssignments() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('with_dates'); // 'all', 'with_dates', 'assigned_by_me'
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['myTasks'],
    queryFn: () => api.entities.Task.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const getProjectInfo = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project || { name: 'Unknown Project', client: '' };
  };

  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      await api.entities.Task.update(task.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    } catch {
      toast.error('Failed to update task');
    }
  };

  // Get active project IDs (exclude archived, deleted, completed)
  const activeProjectIds = projects
    .filter(p => p.status !== 'archived' && p.status !== 'deleted' && p.status !== 'completed')
    .map(p => p.id);

  // Only consider tasks from active projects
  const activeProjectTasks = tasks.filter(t => activeProjectIds.includes(t.project_id));

  // Filter tasks based on active tab
  const getFilteredTasks = () => {
    let filtered = activeProjectTasks;

    if (activeTab === 'all') {
      filtered = activeProjectTasks.filter(t => t.assigned_to === currentUser?.email && t.status !== 'completed');
    } else if (activeTab === 'with_dates') {
      filtered = activeProjectTasks.filter(t => t.assigned_to === currentUser?.email && t.due_date && t.status !== 'completed');
    } else if (activeTab === 'assigned_by_me') {
      filtered = activeProjectTasks.filter(t => t.created_by === currentUser?.email && t.assigned_to !== currentUser?.email && t.status !== 'completed');
    }

    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  // Group tasks by due date
  const groupTasksByDate = () => {
    const overdue = [];
    const dueToday = [];
    const dueLater = [];
    const noDueDate = [];

    filteredTasks.forEach(task => {
      if (!task.due_date) {
        noDueDate.push(task);
        return;
      }

      const dueDate = parseISO(task.due_date);
      if (isPast(dueDate) && !isToday(dueDate)) {
        overdue.push(task);
      } else if (isToday(dueDate)) {
        dueToday.push(task);
      } else {
        dueLater.push(task);
      }
    });

    // Sort by date within each group
    overdue.sort((a, b) => parseLocalDate(a.due_date) - parseLocalDate(b.due_date));
    dueLater.sort((a, b) => parseLocalDate(a.due_date) - parseLocalDate(b.due_date));

    // Group due later by date
    const dueLaterGrouped = dueLater.reduce((acc, task) => {
      const dateKey = task.due_date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);
      return acc;
    }, {});

    return { overdue, dueToday, dueLaterGrouped, noDueDate };
  };

  const { overdue, dueToday, dueLaterGrouped, noDueDate } = groupTasksByDate();

  const renderTask = (task) => {
    const project = getProjectInfo(task.project_id);
    const assignees = task.assigned_name ? [{ name: task.assigned_name, email: task.assigned_to }] : [];

    return (
      <div
        key={task.id}
        className="flex items-start gap-3 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 px-2 -mx-2 rounded-lg transition-colors"
      >
        <button
          onClick={() => handleToggleComplete(task)}
          className={cn(
            "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0",
            task.status === 'completed'
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-border hover:border-emerald-400"
          )}
        >
          {task.status === 'completed' && <CheckSquare className="w-3 h-3" />}
        </button>

        <div className="flex-1 min-w-0">
          <Link
            to={createPageUrl('ProjectTasks') + `?id=${task.project_id}`}
            className={cn(
              "font-medium text-foreground hover:text-primary transition-colors",
              task.status === 'completed' && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </Link>

          {task.notes && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              <span className="truncate">{task.notes}</span>
            </div>
          )}
        </div>

        {/* Assignees */}
        <div className="flex -space-x-1.5">
          {assignees.map((assignee, idx) => (
            <div
              key={idx}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-medium border-2 border-card",
                getColorForEmail(assignee.email)
              )}
              title={assignee.name}
            >
              {getInitials(assignee.name)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProjectGroup = (projectId, projectTasks) => {
    const project = getProjectInfo(projectId);

    return (
      <div key={projectId} className="mb-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-2">
          {project.client && `${project.client} - `}{project.name}
        </div>
        {projectTasks.map(renderTask)}
      </div>
    );
  };

  // Group tasks by project for rendering
  const groupByProject = (tasks) => {
    return tasks.reduce((acc, task) => {
      if (!acc[task.project_id]) acc[task.project_id] = [];
      acc[task.project_id].push(task);
      return acc;
    }, {});
  };

  if (loadingTasks) return <CardGridSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with Avatar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg",
            getColorForEmail(currentUser?.email)
          )}>
            {currentUser?.avatar_url ? (
              <img src={resolveUploadUrl(currentUser.avatar_url)} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(currentUser?.full_name)
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">Here are your assignments</h1>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation",
              activeTab === 'all'
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:bg-muted border border-border"
            )}
          >
            <span className="sm:hidden">All</span>
            <span className="hidden sm:inline">My assignments</span>
          </button>
          <button
            onClick={() => setActiveTab('with_dates')}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation",
              activeTab === 'with_dates'
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:bg-muted border border-border"
            )}
          >
            <span className="sm:hidden">With dates</span>
            <span className="hidden sm:inline">My assignments with dates</span>
          </button>
          <button
            onClick={() => setActiveTab('assigned_by_me')}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation",
              activeTab === 'assigned_by_me'
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:bg-muted border border-border"
            )}
          >
            <span className="sm:hidden">Assigned</span>
            <span className="hidden sm:inline">Stuff I've assigned</span>
          </button>
        </div>

        {/* Task List */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Overdue Section */}
          {overdue.length > 0 && (
            <div className="border-b border-border">
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Overdue</h3>
              </div>
              <div className="px-4 py-2">
                {Object.entries(groupByProject(overdue)).map(([projectId, tasks]) => {
                  const project = getProjectInfo(projectId);
                  return (
                    <div key={projectId} className="mb-3 last:mb-0">
                      <div className="flex items-baseline gap-4 py-2">
                        <span className="text-xs font-medium text-muted-foreground w-20 sm:w-24 shrink-0 uppercase">
                          {format(parseISO(tasks[0].due_date), 'EEE, MMM d')}
                        </span>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            {project.client && `${project.client} - `}{project.name}
                          </div>
                          {tasks.map(renderTask)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due Today Section */}
          {dueToday.length > 0 && (
            <div className="border-b border-border">
              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20">
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Due today</h3>
              </div>
              <div className="px-4 py-2">
                {Object.entries(groupByProject(dueToday)).map(([projectId, tasks]) => {
                  const project = getProjectInfo(projectId);
                  return (
                    <div key={projectId} className="mb-3 last:mb-0">
                      <div className="flex items-baseline gap-4 py-2">
                        <span className="text-xs font-medium text-muted-foreground w-20 sm:w-24 shrink-0 uppercase">
                          {format(new Date(), 'EEE, MMM d')}
                        </span>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            {project.client && `${project.client} - `}{project.name}
                          </div>
                          {tasks.map(renderTask)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due Later Section */}
          {Object.keys(dueLaterGrouped).length > 0 && (
            <div className="border-b border-border">
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20">
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400">Due later</h3>
              </div>
              <div className="px-4 py-2">
                {Object.entries(dueLaterGrouped).map(([date, dateTasks]) => {
                  const projectGroups = groupByProject(dateTasks);
                  return Object.entries(projectGroups).map(([projectId, tasks]) => {
                    const project = getProjectInfo(projectId);
                    return (
                      <div key={`${date}-${projectId}`} className="mb-3 last:mb-0">
                        <div className="flex items-baseline gap-4 py-2">
                          <span className="text-xs font-medium text-muted-foreground w-20 sm:w-24 shrink-0 uppercase">
                            {format(parseISO(date), 'EEE, MMM d')}
                          </span>
                          <div className="flex-1">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                              {project.client && `${project.client} - `}{project.name}
                            </div>
                            {tasks.map(renderTask)}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          )}

          {/* No Due Date Section */}
          {noDueDate.length > 0 && activeTab === 'all' && (
            <div>
              <div className="px-4 py-3 bg-muted/50">
                <h3 className="text-sm font-semibold text-muted-foreground">No due date</h3>
              </div>
              <div className="px-4 py-2">
                {Object.entries(groupByProject(noDueDate)).map(([projectId, tasks]) =>
                  renderProjectGroup(projectId, tasks)
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredTasks.length === 0 && (
            <div className="p-12 text-center">
              <ListTodo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No assignments</h3>
              <p className="text-muted-foreground">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

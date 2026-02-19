import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { parseLocalDate } from '@/utils/dateUtils';
import { motion } from 'framer-motion';
import { 
  Pin, Settings, X, Plus, GripVertical, Activity, 
  Calendar, TrendingUp, ListTodo, FolderKanban, 
  Clock, AlertTriangle, CheckCircle2, Sparkles,
  BarChart3, Users, Package, FileText, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const WIDGET_TYPES = {
  metrics: { icon: BarChart3, label: 'Key Metrics', color: 'bg-blue-500' },
  activity: { icon: Activity, label: 'Recent Activity', color: 'bg-violet-500' },
  deadlines: { icon: Calendar, label: 'Upcoming Deadlines', color: 'bg-amber-500' },
  ai_summary: { icon: Sparkles, label: 'AI Project Summary', color: 'bg-indigo-500' },
  my_tasks: { icon: ListTodo, label: 'My Tasks', color: 'bg-emerald-500' },
  team_load: { icon: Users, label: 'Team Workload', color: 'bg-pink-500' },
  overdue_parts: { icon: Package, label: 'Overdue Parts', color: 'bg-red-500' },
  project_progress: { icon: TrendingUp, label: 'Project Progress', color: 'bg-teal-500' },
  billing_summary: { icon: Clock, label: 'Billable Hours', color: 'bg-orange-500' },
  pending_proposals: { icon: FileText, label: 'Pending Proposals', color: 'bg-indigo-500' },
};

// Pending Proposals Widget
function PendingProposalsWidget({ quotes }) {
  const pendingQuotes = quotes.filter(q => q.status === 'pending').slice(0, 5);

  return (
    <div className="space-y-2">
      {pendingQuotes.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No pending proposals</p>
      ) : (
        pendingQuotes.map((quote) => (
          <div key={quote.id} className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg">
            <FileText className="w-4 h-4 text-indigo-500" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{quote.title}</p>
              <p className="text-[10px] text-slate-500 truncate">{quote.customer_name}</p>
            </div>
            <Badge className="text-[10px] bg-indigo-100 text-indigo-700">
              ${quote.amount?.toLocaleString()}
            </Badge>
          </div>
        ))
      )}
    </div>
  );
}

// Metrics Widget
function MetricsWidget({ projects, tasks, parts }) {
  const activeProjects = projects.filter(p => p.status !== 'archived' && p.status !== 'completed');
  const activeProjectIds = activeProjects.map(p => p.id);
  
  // Only count tasks and parts from active projects
  const activeTasks = tasks.filter(t => activeProjectIds.includes(t.project_id));
  const activeParts = parts.filter(p => activeProjectIds.includes(p.project_id));
  
  const completedTasks = activeTasks.filter(t => t.status === 'completed').length;
  const pendingParts = activeParts.filter(p => p.status !== 'installed').length;
  const overdueTasks = activeTasks.filter(t => { const d = parseLocalDate(t.due_date); return d && isPast(d) && !isToday(d) && t.status !== 'completed'; }).length;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-2xl font-bold text-blue-700">{activeProjects.length}</p>
        <p className="text-xs text-blue-600">Active Projects</p>
      </div>
      <div className="p-3 bg-emerald-50 rounded-lg">
        <p className="text-2xl font-bold text-emerald-700">{completedTasks}</p>
        <p className="text-xs text-emerald-600">Completed Tasks</p>
      </div>
      <div className="p-3 bg-amber-50 rounded-lg">
        <p className="text-2xl font-bold text-amber-700">{pendingParts}</p>
        <p className="text-xs text-amber-600">Pending Parts</p>
      </div>
      <div className="p-3 bg-red-50 rounded-lg">
        <p className="text-2xl font-bold text-red-700">{overdueTasks}</p>
        <p className="text-xs text-red-600">Overdue Tasks</p>
      </div>
    </div>
  );
}

// Activity Widget
function ActivityWidget({ activities }) {
  const recentActivities = activities.slice(0, 5);

  return (
    <div className="space-y-2">
      {recentActivities.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
      ) : (
        recentActivities.map((activity, idx) => (
          <div key={activity.id || idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
              <Activity className="w-3 h-3 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700 line-clamp-1">{activity.description}</p>
              <p className="text-[10px] text-slate-400">{activity.actor_name}</p>
            </div>
          </div>
        ))
      )}
      <Link to={createPageUrl('ActivityFeed')}>
        <Button variant="ghost" size="sm" className="w-full text-xs mt-2">
          View all activity →
        </Button>
      </Link>
    </div>
  );
}

// Deadlines Widget
function DeadlinesWidget({ tasks, projects }) {
  // Only show deadlines from active projects
  const activeProjects = projects.filter(p => p.status !== 'archived' && p.status !== 'completed');
  const activeProjectIds = activeProjects.map(p => p.id);
  
  const upcomingItems = [
    ...tasks.filter(t => t.due_date && t.status !== 'completed' && activeProjectIds.includes(t.project_id)).map(t => ({
      type: 'task',
      title: t.title,
      date: t.due_date,
      projectId: t.project_id
    })),
    ...activeProjects.filter(p => p.due_date).map(p => ({
      type: 'project',
      title: p.name,
      date: p.due_date,
      projectId: p.id
    }))
  ].sort((a, b) => (parseLocalDate(a.date) || 0) - (parseLocalDate(b.date) || 0)).slice(0, 5);

  const getDateLabel = (date) => {
    const d = parseLocalDate(date);
    if (!d) return { label: '—', color: 'text-slate-400 bg-slate-50' };
    if (isPast(d) && !isToday(d)) return { label: 'Overdue', color: 'text-red-600 bg-red-50' };
    if (isToday(d)) return { label: 'Today', color: 'text-amber-600 bg-amber-50' };
    if (isTomorrow(d)) return { label: 'Tomorrow', color: 'text-blue-600 bg-blue-50' };
    return { label: format(d, 'MMM d'), color: 'text-slate-600 bg-slate-50' };
  };

  return (
    <div className="space-y-2">
      {upcomingItems.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No upcoming deadlines</p>
      ) : (
        upcomingItems.map((item, idx) => {
          const dateInfo = getDateLabel(item.date);
          return (
            <Link 
              key={idx} 
              to={createPageUrl('ProjectDetail') + `?id=${item.projectId}`}
              className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {item.type === 'task' ? (
                <ListTodo className="w-4 h-4 text-blue-500" />
              ) : (
                <FolderKanban className="w-4 h-4 text-indigo-500" />
              )}
              <span className="flex-1 text-xs text-slate-700 truncate">{item.title}</span>
              <Badge className={cn("text-[10px]", dateInfo.color)}>{dateInfo.label}</Badge>
            </Link>
          );
        })
      )}
    </div>
  );
}

// AI Summary Widget
function AISummaryWidget({ projects, tasks }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const hasGeneratedRef = React.useRef(false);

  const generateSummary = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const activeProjects = projects.filter(p => p.status !== 'archived').slice(0, 5);
      const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
      const overdueTasks = tasks.filter(t => { const d = parseLocalDate(t.due_date); return d && isPast(d) && !isToday(d) && t.status !== 'completed'; }).length;

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Generate a brief, actionable daily summary for a project manager based on this data:

Active Projects: ${activeProjects.map(p => p.name).join(', ')}
Total Pending Tasks: ${pendingTasks}
Overdue Tasks: ${overdueTasks}
Today's Date: ${format(new Date(), 'EEEE, MMMM d, yyyy')}

Provide 2-3 sentences focusing on priorities and recommendations. Be concise and actionable.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' }
          },
          required: ['summary']
        },
        feature: 'dashboard_summary'
      });
      setSummary(result.summary);
    } catch (err) {
      setSummary('Unable to generate summary. Please try again.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (projects.length > 0 && !hasGeneratedRef.current && !loading) {
      hasGeneratedRef.current = true;
      generateSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
        </div>
      ) : summary ? (
        <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">Click to generate AI summary</p>
      )}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full text-xs"
        onClick={generateSummary}
        disabled={loading}
      >
        <Sparkles className="w-3 h-3 mr-1" />
        Refresh Summary
      </Button>
    </div>
  );
}

// My Tasks Widget
function MyTasksWidget({ tasks, currentUser, projects }) {
  // Only show tasks from active projects
  const activeProjectIds = projects.filter(p => p.status !== 'archived' && p.status !== 'completed').map(p => p.id);
  const myTasks = tasks
    .filter(t => t.assigned_to === currentUser?.email && t.status !== 'completed' && activeProjectIds.includes(t.project_id))
    .slice(0, 5);

  return (
    <div className="space-y-2">
      {myTasks.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No tasks assigned to you</p>
      ) : (
        myTasks.map((task) => (
          <Link 
            key={task.id}
            to={createPageUrl('ProjectDetail') + `?id=${task.project_id}`}
            className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <CheckCircle2 className={cn(
              "w-4 h-4",
              task.status === 'in_progress' ? 'text-blue-500' : 'text-slate-400'
            )} />
            <span className="flex-1 text-xs text-slate-700 truncate">{task.title}</span>
            {task.due_date && (() => { const d = parseLocalDate(task.due_date); return d && isPast(d) && !isToday(d); })() && (
              <AlertTriangle className="w-3 h-3 text-red-500" />
            )}
          </Link>
        ))
      )}
      <Link to={createPageUrl('AllTasks') + '?tab=tasks'}>
        <Button variant="ghost" size="sm" className="w-full text-xs mt-2">
          View all my tasks →
        </Button>
      </Link>
    </div>
  );
}

// Team Workload Widget
function TeamWorkloadWidget({ tasks, teamMembers, projects }) {
  // Only count tasks from active projects
  const activeProjectIds = projects.filter(p => p.status !== 'archived' && p.status !== 'completed').map(p => p.id);
  const activeTasks = tasks.filter(t => activeProjectIds.includes(t.project_id));
  
  const workload = teamMembers.map(member => {
    const memberTasks = activeTasks.filter(t => t.assigned_to === member.email && t.status !== 'completed');
    return {
      name: member.name,
      email: member.email,
      count: memberTasks.length,
      overdue: memberTasks.filter(t => { const d = parseLocalDate(t.due_date); return d && isPast(d) && !isToday(d); }).length
    };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="space-y-2">
      {workload.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No team members found</p>
      ) : (
        workload.map((member, idx) => (
          <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-medium">
              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <span className="flex-1 text-xs text-slate-700 truncate">{member.name}</span>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px]">{member.count} tasks</Badge>
              {member.overdue > 0 && (
                <Badge className="text-[10px] bg-red-100 text-red-700">{member.overdue} overdue</Badge>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Overdue Parts Widget
function OverduePartsWidget({ parts, projects }) {
  // Only show parts from active projects
  const activeProjectIds = projects.filter(p => p.status !== 'archived' && p.status !== 'completed').map(p => p.id);
  const overdueParts = parts
    .filter(p => { const d = parseLocalDate(p.due_date); return d && isPast(d) && !isToday(d) && p.status !== 'installed' && activeProjectIds.includes(p.project_id); })
    .slice(0, 5);

  return (
    <div className="space-y-2">
      {overdueParts.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No overdue parts</p>
      ) : (
        overdueParts.map((part) => (
          <div key={part.id} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
            <Package className="w-4 h-4 text-red-500" />
            <span className="flex-1 text-xs text-slate-700 truncate">{part.name}</span>
            <Badge className="text-[10px] bg-red-100 text-red-700">
              {format(parseLocalDate(part.due_date), 'MMM d')}
            </Badge>
          </div>
        ))
      )}
    </div>
  );
}

// Project Progress Widget
function ProjectProgressWidget({ projects }) {
  const activeProjects = projects
    .filter(p => p.status !== 'archived' && p.status !== 'completed')
    .slice(0, 5);

  return (
    <div className="space-y-3">
      {activeProjects.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No active projects</p>
      ) : (
        activeProjects.map((project) => (
          <div key={project.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 truncate flex-1">{project.name}</span>
              <span className="text-xs font-medium text-slate-600">{project.progress || 0}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${project.progress || 0}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Billable Hours Widget
function BillableHoursWidget({ timeEntries }) {
  const pendingHours = timeEntries
    .filter(t => t.billing_status === 'pending')
    .reduce((sum, t) => sum + (t.duration_minutes || 0), 0) / 60;

  const readyToBill = timeEntries
    .filter(t => t.billing_status === 'ready_to_bill')
    .reduce((sum, t) => sum + (t.duration_minutes || 0), 0) / 60;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-orange-50 rounded-lg text-center">
          <p className="text-xl font-bold text-orange-700">{pendingHours.toFixed(1)}h</p>
          <p className="text-[10px] text-orange-600">Pending</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-lg text-center">
          <p className="text-xl font-bold text-emerald-700">{readyToBill.toFixed(1)}h</p>
          <p className="text-[10px] text-emerald-600">Ready to Bill</p>
        </div>
      </div>
      <Link to={createPageUrl('Billing')}>
        <Button variant="ghost" size="sm" className="w-full text-xs">
          View billing →
        </Button>
      </Link>
    </div>
  );
}

// Main Widget Component
function DashboardWidget({ type, onRemove, projects, tasks, parts, activities, teamMembers, currentUser, timeEntries, quotes }) {
  const config = WIDGET_TYPES[type];
  const Icon = config?.icon || BarChart3;

  const renderContent = () => {
    switch (type) {
      case 'pending_proposals':
        return <PendingProposalsWidget quotes={quotes} />;
      case 'metrics':
        return <MetricsWidget projects={projects} tasks={tasks} parts={parts} />;
      case 'activity':
        return <ActivityWidget activities={activities} />;
      case 'deadlines':
        return <DeadlinesWidget tasks={tasks} projects={projects} />;
      case 'ai_summary':
        return <AISummaryWidget projects={projects} tasks={tasks} />;
      case 'my_tasks':
        return <MyTasksWidget tasks={tasks} currentUser={currentUser} projects={projects} />;
      case 'team_load':
        return <TeamWorkloadWidget tasks={tasks} teamMembers={teamMembers} projects={projects} />;
      case 'overdue_parts':
        return <OverduePartsWidget parts={parts} projects={projects} />;
      case 'project_progress':
        return <ProjectProgressWidget projects={projects} />;
      case 'billing_summary':
        return <BillableHoursWidget timeEntries={timeEntries} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", config?.color || 'bg-slate-500')}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-medium text-slate-700">{config?.label || 'Widget'}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="p-4">
        {renderContent()}
      </div>
    </motion.div>
  );
}

// Widget Selector Dialog
function WidgetSelector({ pinnedWidgets, onAddWidget }) {
  const availableWidgets = Object.entries(WIDGET_TYPES).filter(
    ([key]) => !pinnedWidgets.includes(key)
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Widget
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Dashboard Widget</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {availableWidgets.map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => onAddWidget(key)}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
              >
                <div className={cn("p-2 rounded-lg", config.color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700">{config.label}</span>
              </button>
            );
          })}
          {availableWidgets.length === 0 && (
            <p className="col-span-2 text-center text-sm text-slate-500 py-4">
              All widgets are already added
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Export Component
export default function DashboardWidgets() {
  const [currentUser, setCurrentUser] = useState(null);
  const [pinnedWidgets, setPinnedWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    return saved ? JSON.parse(saved) : ['metrics', 'deadlines', 'my_tasks', 'pending_proposals'];
  });

  useEffect(() => {
    let mounted = true;
    api.auth.me().then(user => {
      if (mounted) setCurrentUser(user);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard_widgets', JSON.stringify(pinnedWidgets));
  }, [pinnedWidgets]);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['allParts'],
    queryFn: () => api.entities.Part.list()
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['recentActivities'],
    queryFn: () => api.entities.ProjectActivity.list('-created_date', 20)
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => api.entities.TimeEntry.list()
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['incomingQuotesWidget'],
    queryFn: () => api.entities.IncomingQuote.filter({ status: 'pending' })
  });

  const handleAddWidget = (type) => {
    if (!pinnedWidgets.includes(type)) {
      setPinnedWidgets([...pinnedWidgets, type]);
    }
  };

  const handleRemoveWidget = (type) => {
    setPinnedWidgets(pinnedWidgets.filter(w => w !== type));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Pinned Widgets</span>
        </div>
        <WidgetSelector pinnedWidgets={pinnedWidgets} onAddWidget={handleAddWidget} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pinnedWidgets.map((type) => (
          <DashboardWidget
            key={type}
            type={type}
            onRemove={() => handleRemoveWidget(type)}
            projects={projects}
            tasks={tasks}
            parts={parts}
            activities={activities}
            teamMembers={teamMembers}
            currentUser={currentUser}
            timeEntries={timeEntries}
            quotes={quotes}
          />
        ))}
      </div>
    </div>
  );
}
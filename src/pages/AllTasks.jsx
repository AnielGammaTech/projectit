import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, Search, CheckCircle2, Circle, Clock, ArrowUpCircle, Calendar as CalendarIcon, User, UserPlus, FolderKanban, Package, Truck, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import { sendTaskAssignmentNotification, sendTaskCompletionNotification } from '@/utils/notifications';
import { parseLocalDate } from '@/utils/dateUtils';
import UserAvatar from '@/components/UserAvatar';
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';
import PageShell from '@/components/ui/PageShell';
import EmptyState from '@/components/ui/EmptyState';

const statusConfig = {
  todo: { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100', label: 'To Do' },
  in_progress: { icon: ArrowUpCircle, color: 'text-blue-500', bg: 'bg-blue-100', label: 'In Progress' },
  review: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100', label: 'Review' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Completed' }
};

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700'
};

// Monday.com-style task row for the flat table view
function TaskTableRow({ task, teamMembers, currentUser, statusConfig, priorityColors, getDueDateLabel, projectName, projectNumber, onComplete, onAssign, onUnassign, onDueDateChange, onNavigate }) {
  const [dateOpen, setDateOpen] = useState(false);
  const status = statusConfig[task.status] || statusConfig.todo;
  const StatusIcon = status.icon;
  const dueInfo = task.due_date ? getDueDateLabel(task.due_date) : null;

  return (
    <div
      onClick={() => onNavigate(task)}
      className="group flex items-center gap-2 px-3 py-3.5 sm:py-2.5 border-b border-border hover:bg-primary/5 dark:hover:bg-muted/30 transition-all duration-200 cursor-pointer active:bg-primary/5"
    >
      {/* Complete checkbox */}
      <button
        onClick={(e) => onComplete(e, task.id)}
        className={cn(
          "w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90",
          task.status === 'completed'
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50"
        )}
        title="Mark as completed"
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <CheckCircle2 className="w-3 h-3 opacity-30 sm:opacity-0 sm:group-hover:opacity-40" />
        )}
      </button>

      {/* Task title + project name */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">{task.title}</span>
        </div>
      </div>

      {/* Project badge */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0 max-w-[200px]">
        <FolderKanban className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground truncate">{projectName}</span>
        {projectNumber && <span className="px-1 py-0 bg-muted text-muted-foreground rounded text-[9px] font-mono shrink-0">#{projectNumber}</span>}
      </div>

      {/* Status badge */}
      <div className="hidden md:block shrink-0 w-24">
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      {/* Priority */}
      <div className="hidden lg:block shrink-0 w-16">
        {task.priority && (
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", priorityColors[task.priority])}>
            {task.priority}
          </Badge>
        )}
      </div>

      {/* Assignee */}
      <div className="shrink-0 w-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {task.assigned_name ? (
              <button
                onClick={(e) => e.stopPropagation()}
                className="hover:ring-2 hover:ring-offset-1 hover:ring-blue-300 rounded-full"
                title={task.assigned_name}
              >
                <UserAvatar
                  email={task.assigned_to}
                  name={task.assigned_name}
                  avatarUrl={teamMembers.find(m => m.email === task.assigned_to)?.avatar_url}
                  size="sm"
                />
              </button>
            ) : (
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-7 h-7 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:border-blue-400"
                title="Assign"
              >
                <UserPlus className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            {task.assigned_to && (
              <DropdownMenuItem onClick={() => onUnassign(task)}>
                <User className="w-4 h-4 mr-2" />
                Unassign
              </DropdownMenuItem>
            )}
            {teamMembers.map((member) => (
              <DropdownMenuItem key={member.id} onClick={() => onAssign(task, member.email)}>
                <UserAvatar email={member.email} name={member.name} avatarUrl={member.avatar_url} size="xs" className="mr-2" />
                {member.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Due date */}
      <div className="shrink-0 w-20 text-right">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            {dueInfo ? (
              <Badge
                onClick={(e) => { e.stopPropagation(); setDateOpen(true); }}
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0.5 h-5 cursor-pointer hover:opacity-80", dueInfo.color)}
              >
                {dueInfo.label}
              </Badge>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setDateOpen(true); }}
                className="p-1 rounded hover:bg-muted sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                title="Set due date"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
            <Calendar
              mode="single"
              selected={task.due_date ? (() => {
                const dateStr = task.due_date.split('T')[0];
                const [year, month, day] = dateStr.split('-').map(Number);
                return new Date(year, month - 1, day);
              })() : undefined}
              onSelect={(date) => { onDueDateChange(task, date); setDateOpen(false); }}
            />
            {task.due_date && (
              <div className="p-2 border-t">
                <Button variant="ghost" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { onDueDateChange(task, null); setDateOpen(false); }}>
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// Monday.com-style part row for the flat table view
function PartTableRow({ part, teamMembers, projectName, projectNumber, getDueDateLabel, onAssign, onUnassign, onDueDateChange, onStatusChange, onETAChange, onNavigate }) {
  const [etaOpen, setEtaOpen] = useState(false);
  const deliveryInfo = part.est_delivery_date && parseLocalDate(part.est_delivery_date) ? getDueDateLabel(part.est_delivery_date) : null;
  const partStatusConfig = {
    needed: { label: 'Needed', color: 'text-red-700', bg: 'bg-red-100' },
    ordered: { label: 'Ordered', color: 'text-blue-700', bg: 'bg-blue-100' },
    received: { label: 'Received', color: 'text-amber-700', bg: 'bg-amber-100' },
    installed: { label: 'Installed', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  };
  const st = partStatusConfig[part.status] || partStatusConfig.needed;

  return (
    <div
      onClick={() => onNavigate(part)}
      className="group flex items-center gap-2 px-3 py-2.5 border-b border-border hover:bg-primary/5 dark:hover:bg-muted/30 transition-all duration-200 cursor-pointer"
    >
      {/* Part icon */}
      <Package className="w-4 h-4 text-amber-500 shrink-0" />

      {/* Part name + number */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">{part.name}</span>
        </div>
        {part.part_number && (
          <span className="hidden sm:inline text-[10px] text-slate-400 font-mono shrink-0">#{part.part_number}</span>
        )}
      </div>

      {/* Project badge */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0 max-w-[180px]">
        <FolderKanban className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground truncate">{projectName}</span>
        {projectNumber && <span className="px-1 py-0 bg-muted text-muted-foreground rounded text-[9px] font-mono shrink-0">#{projectNumber}</span>}
      </div>

      {/* Status dropdown */}
      <div className="shrink-0 w-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span
              onClick={(e) => e.stopPropagation()}
              className={cn("inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80", st.bg, st.color)}
            >
              {st.label}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            {Object.entries(partStatusConfig).map(([key, cfg]) => (
              <DropdownMenuItem key={key} onClick={() => onStatusChange?.(part, key)}>
                <span className={cn("inline-flex items-center text-[10px] font-medium px-1.5 py-0 rounded-full mr-2", cfg.bg, cfg.color)}>
                  {cfg.label}
                </span>
                {cfg.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Assignee */}
      <div className="shrink-0 w-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {part.assigned_name ? (
              <button
                onClick={(e) => e.stopPropagation()}
                className="hover:ring-2 hover:ring-offset-1 hover:ring-blue-300 rounded-full"
                title={part.assigned_name}
              >
                <UserAvatar
                  email={part.assigned_to}
                  name={part.assigned_name}
                  avatarUrl={teamMembers.find(m => m.email === part.assigned_to)?.avatar_url}
                  size="sm"
                />
              </button>
            ) : (
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-7 h-7 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:border-blue-400"
                title="Assign"
              >
                <UserPlus className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            {part.assigned_to && (
              <DropdownMenuItem onClick={() => onUnassign(part)}>
                <User className="w-4 h-4 mr-2" />
                Unassign
              </DropdownMenuItem>
            )}
            {teamMembers.map((member) => (
              <DropdownMenuItem key={member.id} onClick={() => onAssign(part, member.email)}>
                <UserAvatar email={member.email} name={member.name} avatarUrl={member.avatar_url} size="xs" className="mr-2" />
                {member.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ETA date */}
      <div className="shrink-0 w-24 text-right">
        <Popover open={etaOpen} onOpenChange={setEtaOpen}>
          <PopoverTrigger asChild>
            {deliveryInfo ? (
              <Badge
                onClick={(e) => { e.stopPropagation(); setEtaOpen(true); }}
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0.5 h-5 cursor-pointer hover:opacity-80 bg-cyan-50 text-cyan-700 border-cyan-200")}
              >
                ETA: {deliveryInfo.label}
              </Badge>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setEtaOpen(true); }}
                className="p-1 rounded hover:bg-muted opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                title="Set ETA"
              >
                <Truck className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
            <Calendar
              mode="single"
              selected={part.est_delivery_date ? (() => {
                const dateStr = part.est_delivery_date.split('T')[0];
                const [year, month, day] = dateStr.split('-').map(Number);
                return new Date(year, month - 1, day);
              })() : undefined}
              onSelect={(date) => { onETAChange?.(part, date); setEtaOpen(false); }}
            />
            {part.est_delivery_date && (
              <div className="p-2 border-t">
                <Button variant="ghost" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { onETAChange?.(part, null); setEtaOpen(false); }}>
                  Clear ETA
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export default function AllTasks() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'tasks';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('all'); // 'all', 'mine', 'my_overdue', 'mine_due'
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const TASKS_PER_GROUP = 5;
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(user => {
      setCurrentUser(user);
      setIsAdmin(user?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => api.entities.Task.list('-created_date')
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['allParts'],
    queryFn: () => api.entities.Part.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: taskGroups = [] } = useQuery({
    queryKey: ['allTaskGroups'],
    queryFn: () => api.entities.TaskGroup.list()
  });

  const getGroupName = (groupId) => {
    if (!groupId) return null;
    const group = taskGroups.find(g => g.id === groupId);
    return group?.name || null;
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getProjectNumber = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.project_number || null;
  };

  // Helper to check if user has access to a project
  const userHasProjectAccess = (project) => {
    if (isAdmin) return true;
    if (!project.team_members || project.team_members.length === 0) return true;
    return project.team_members.includes(currentUser?.email);
  };

  // Get active project IDs (not archived, completed, or deleted) that user has access to
  const activeProjectIds = projects
    .filter(p => p.status !== 'archived' && p.status !== 'completed' && p.status !== 'deleted' && userHasProjectAccess(p))
    .map(p => p.id);

  const allFilteredTasks = tasks.filter(task => {
    // Only show tasks from active projects (exclude archived)
    if (!activeProjectIds.includes(task.project_id)) return false;

    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' || task.assigned_to === assigneeFilter;

    let matchesViewMode = true;
    if (viewMode === 'mine') {
      matchesViewMode = task.assigned_to === currentUser?.email;
    } else if (viewMode === 'my_overdue') {
      if (!task.due_date || task.assigned_to !== currentUser?.email) {
        matchesViewMode = false;
      } else {
        const dueDate = parseLocalDate(task.due_date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        matchesViewMode = dueDate <= today;
      }
    } else if (viewMode === 'mine_due') {
      // Show only overdue tasks and tasks due today
      if (!task.due_date) {
        matchesViewMode = false;
      } else {
        const dueDate = parseLocalDate(task.due_date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        matchesViewMode = dueDate <= today;
      }
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesViewMode;
  }).sort((a, b) => {
    // Always sort by due date: tasks with due dates first (ascending), then tasks without due dates
    const dateA = a.due_date ? parseLocalDate(a.due_date) : null;
    const dateB = b.due_date ? parseLocalDate(b.due_date) : null;
    if (dateA && dateB) return dateA - dateB;
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    return 0;
  });

  // Separate active and completed tasks
  const filteredTasks = allFilteredTasks.filter(t => t.status !== 'completed');
  const completedTasks = allFilteredTasks.filter(t => t.status === 'completed');

  // My assigned parts (with due dates)
  const myParts = parts.filter(part =>
    part.assigned_to === currentUser?.email && part.due_date
  );

  // Parts from active projects only
  const activeProjectParts = parts.filter(p => activeProjectIds.includes(p.project_id));

  // Filter parts - only show parts from active projects
  const filteredParts = parts.filter(part => {
    // Only include parts from active projects
    if (!activeProjectIds.includes(part.project_id)) return false;

    const matchesSearch = part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.part_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || part.status === statusFilter;
    const matchesAssignee = assigneeFilter === 'all' || part.assigned_to === assigneeFilter;
    return matchesSearch && matchesStatus && matchesAssignee;
  });

  // Only count tasks from active projects
  const activeTasks = tasks.filter(t => activeProjectIds.includes(t.project_id));
  const myTasksCount = activeTasks.filter(t => t.assigned_to === currentUser?.email && t.status !== 'completed').length;
  const myOverdueCount = activeTasks.filter(t => {
    if (!t.due_date || t.status === 'completed' || t.assigned_to !== currentUser?.email) return false;
    const dueDate = parseLocalDate(t.due_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return dueDate <= today;
  }).length;
  const myTasksWithDueCount = activeTasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    const dueDate = parseLocalDate(t.due_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return dueDate <= today;
  }).length;

  const handleQuickComplete = async (e, taskId) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    await api.entities.Task.update(taskId, { status: 'completed' });

    if (task) {
      await sendTaskCompletionNotification({
        task,
        projectId: task.project_id,
        projectName: getProjectName(task.project_id),
        currentUser,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const handleTaskAssign = async (task, email) => {
    const member = teamMembers.find(m => m.email === email);
    await api.entities.Task.update(task.id, {
      assigned_to: email,
      assigned_name: member?.name || email
    });
    if (email !== task.assigned_to) {
      await sendTaskAssignmentNotification({
        assigneeEmail: email,
        taskTitle: task.title,
        projectId: task.project_id,
        projectName: getProjectName(task.project_id),
        currentUser,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const handleTaskUnassign = async (task) => {
    await api.entities.Task.update(task.id, { assigned_to: '', assigned_name: '' });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const handleTaskDueDateChange = async (task, date) => {
    await api.entities.Task.update(task.id, {
      due_date: date ? format(date, 'yyyy-MM-dd') : ''
    });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const handlePartAssign = async (part, email) => {
    const member = teamMembers.find(m => m.email === email);
    await api.entities.Part.update(part.id, {
      assigned_to: email,
      assigned_name: member?.name || email
    });
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
  };

  const handlePartUnassign = async (part) => {
    await api.entities.Part.update(part.id, { assigned_to: '', assigned_name: '' });
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
  };

  const handlePartDueDateChange = async (part, date) => {
    await api.entities.Part.update(part.id, {
      due_date: date ? format(date, 'yyyy-MM-dd') : ''
    });
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
  };

  const handlePartStatusChange = async (part, newStatus) => {
    await api.entities.Part.update(part.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
  };

  const handlePartETAChange = async (part, date) => {
    await api.entities.Part.update(part.id, {
      est_delivery_date: date ? format(date, 'yyyy-MM-dd') : ''
    });
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
  };

  const getDueDateLabel = (date) => {
    const d = parseLocalDate(date);
    if (!d) return null;
    if (isToday(d)) return { label: 'Today', color: 'text-amber-600 bg-amber-50' };
    if (isTomorrow(d)) return { label: 'Tomorrow', color: 'text-blue-600 bg-blue-50' };
    if (isPast(d)) return { label: 'Overdue', color: 'text-red-600 bg-red-50' };
    return { label: format(d, 'MMM d'), color: 'text-slate-600 bg-slate-50' };
  };

  const tasksByStatus = {
    todo: allFilteredTasks.filter(t => t.status === 'todo'),
    in_progress: allFilteredTasks.filter(t => t.status === 'in_progress'),
    review: allFilteredTasks.filter(t => t.status === 'review'),
    completed: completedTasks
  };

  if (loadingTasks) return <TablePageSkeleton />;

  return (
    <PageShell
      title="Tasks & Parts"
      subtitle="View and filter all tasks and parts across projects"
      actions={
          <div className="flex gap-1 p-1 bg-muted rounded-xl mx-auto sm:mx-0">
            <button
              onClick={() => setActiveTab('tasks')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5",
                activeTab === 'tasks' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('parts')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5",
                activeTab === 'parts' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Package className="w-3.5 h-3.5" />
              Parts
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted-foreground/10">{parts.filter(p => activeProjectIds.includes(p.project_id)).length}</span>
            </button>
          </div>
      }
    >

        {/* Unified Toolbar - Tasks */}
        {activeTab === 'tasks' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-3 sm:p-4 mb-4 sm:mb-6"
          >
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-full sm:w-fit mb-3 sm:mb-4 overflow-x-auto">
              <button
                onClick={() => setViewMode('all')}
                className={cn(
                  "px-3 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-1 sm:flex-initial",
                  viewMode === 'all'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({activeTasks.filter(t => t.status !== 'completed').length})
              </button>
              <button
                onClick={() => setViewMode('mine')}
                className={cn(
                  "px-3 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-1 sm:flex-initial",
                  viewMode === 'mine'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Mine ({myTasksCount})
              </button>
              <button
                onClick={() => setViewMode('my_overdue')}
                className={cn(
                  "px-3 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-1 sm:flex-initial",
                  viewMode === 'my_overdue'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Overdue ({myOverdueCount})
              </button>
              <button
                onClick={() => setViewMode('mine_due')}
                className={cn(
                  "hidden sm:block px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                  viewMode === 'mine_due'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Due ({myTasksWithDueCount})
              </button>
            </div>

            {/* Filters Row */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <div className="relative flex-1 min-w-[140px] sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 sm:h-9"
                />
              </div>

              {/* Status Pills — horizontal scroll on mobile */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {Object.entries(statusConfig).filter(([key]) => key !== 'completed').map(([key, config]) => {
                  const Icon = config.icon;
                  const count = tasksByStatus[key]?.length || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0",
                        statusFilter === key
                          ? "bg-[#0F2F44] text-white dark:bg-blue-600"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px]",
                        statusFilter === key ? "bg-white/20" : "bg-muted-foreground/10"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden sm:flex items-center gap-2 sm:ml-auto">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.email}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tasks List — flat table view (Monday.com style) */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {filteredTasks.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                {/* Table header — hidden on mobile */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-muted/50 dark:bg-background border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="w-5 shrink-0" />
                  <div className="flex-1">Task</div>
                  <div className="w-[200px] shrink-0">Project</div>
                  <div className="hidden md:block w-24 shrink-0">Status</div>
                  <div className="hidden lg:block w-16 shrink-0">Priority</div>
                  <div className="w-8 shrink-0">Owner</div>
                  <div className="w-20 shrink-0 text-right">Due</div>
                </div>

                {/* Task rows grouped by project with collapsible headers */}
                {(() => {
                  const grouped = {};
                  filteredTasks.forEach(task => {
                    const pid = task.project_id;
                    if (!grouped[pid]) grouped[pid] = [];
                    grouped[pid].push(task);
                  });

                  return Object.entries(grouped).map(([projectId, projectTasks]) => {
                    // Default collapsed on mobile — only expand when explicitly toggled
                    const isCollapsed = expandedGroups[projectId] !== true;

                    const project = projects.find(p => p.id === projectId);
                    const dueSoonTasks = projectTasks.filter(t => {
                      if (t.status === 'completed' || t.status === 'archived' || !t.due_date) return false;
                      const d = parseLocalDate(t.due_date);
                      if (!d) return false;
                      const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
                      return days >= 0 && days <= 3;
                    });
                    const overdueTasks = projectTasks.filter(t => {
                      if (t.status === 'completed' || t.status === 'archived' || !t.due_date) return false;
                      const d = parseLocalDate(t.due_date);
                      return d && d < new Date() && !isToday(d);
                    });

                    return (
                      <div key={projectId}>
                        {/* Project group header with quick info */}
                        <div
                          className="flex items-center gap-2 px-3 py-2.5 sm:py-2 bg-muted/30 dark:bg-card border-b border-border cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors active:bg-muted/50"
                          onClick={() => setExpandedGroups(prev => ({ ...prev, [projectId]: prev[projectId] === true ? false : true }))}
                        >
                          <ChevronRight className={cn("w-4 h-4 sm:w-3.5 sm:h-3.5 text-muted-foreground transition-transform shrink-0", !isCollapsed && "rotate-90")} />
                          <FolderKanban className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm sm:text-xs text-foreground truncate">
                                {getProjectName(projectId)}
                              </span>
                              {getProjectNumber(projectId) && (
                                <span className="px-1.5 py-0.5 bg-slate-700 text-white rounded text-[9px] font-mono shrink-0">#{getProjectNumber(projectId)}</span>
                              )}
                            </div>
                            {/* Quick info widgets */}
                            <div className="hidden sm:flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                              {project?.client && (
                                <span className="truncate max-w-[120px]">{project.client}</span>
                              )}
                              {project?.project_lead && (() => {
                                const leadMember = teamMembers.find(m => m.email === project.project_lead);
                                const leadName = leadMember?.name || project.project_lead.split('@')[0];
                                return (
                                  <span className="flex items-center gap-1">
                                    <span className="w-3.5 h-3.5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold">{leadName[0]?.toUpperCase()}</span>
                                    {leadName.split(' ')[0]}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          {/* Task counts */}
                          <div className="hidden sm:flex items-center gap-2 shrink-0">
                            {overdueTasks.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                {overdueTasks.length} overdue
                              </span>
                            )}
                            {dueSoonTasks.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                {dueSoonTasks.length} due soon
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] sm:text-[10px] text-muted-foreground shrink-0">{projectTasks.length}</span>
                        </div>

                        {/* Tasks in this project */}
                        {!isCollapsed && projectTasks.map((task) => (
                          <TaskTableRow
                            key={task.id}
                            task={task}
                            teamMembers={teamMembers}
                            currentUser={currentUser}
                            statusConfig={statusConfig}
                            priorityColors={priorityColors}
                            getDueDateLabel={getDueDateLabel}
                            projectName={getProjectName(task.project_id)}
                            projectNumber={getProjectNumber(task.project_id)}
                            onComplete={handleQuickComplete}
                            onAssign={handleTaskAssign}
                            onUnassign={handleTaskUnassign}
                            onDueDateChange={handleTaskDueDateChange}
                            onNavigate={(t) => navigate(createPageUrl('ProjectTasks') + `?id=${t.project_id}`)}
                          />
                        ))}
                      </div>
                    );
                  });
                })()}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card rounded-2xl border border-border"
              >
                <EmptyState
                  icon={ListTodo}
                  title="No active tasks found"
                  description="Try adjusting your filters or create a new task in a project"
                />
              </motion.div>
            )}

            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-2 transition-colors"
                >
                  {showCompletedTasks ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Completed ({completedTasks.length})
                </button>

                <AnimatePresence>
                  {showCompletedTasks && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-card rounded-2xl border border-border overflow-hidden"
                    >
                      {completedTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => navigate(createPageUrl('ProjectTasks') + `?id=${task.project_id}`)}
                          className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-muted/50 dark:hover:bg-muted/30 transition-all duration-200 cursor-pointer group"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-sm text-slate-400 line-through truncate flex-1">{task.title}</span>
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            <FolderKanban className="w-3 h-3 text-slate-300" />
                            <span className="text-[11px] text-slate-300">{getProjectName(task.project_id)}</span>
                          </div>
                          {task.assigned_name && (
                            <UserAvatar
                              email={task.assigned_to}
                              name={task.assigned_name}
                              avatarUrl={teamMembers.find(m => m.email === task.assigned_to)?.avatar_url}
                              size="sm"
                              className="opacity-50"
                            />
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Parts Toolbar */}
        {activeTab === 'parts' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-4 mb-6"
          >
            {/* Status Pills Row */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <div className="relative flex-1 min-w-[140px] sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search parts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 sm:h-9"
                />
              </div>

              {/* Status pills */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {[
                  { key: 'needed', label: 'Needed' },
                  { key: 'ordered', label: 'Ordered' },
                  { key: 'received', label: 'Received' },
                  { key: 'installed', label: 'Installed' },
                ].map((s) => {
                  const count = activeProjectParts.filter(p => p.status === s.key).length;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0",
                        statusFilter === s.key
                          ? "bg-[#0F2F44] text-white dark:bg-blue-600"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {s.label}
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px]",
                        statusFilter === s.key ? "bg-white/20" : "bg-muted-foreground/10"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="flex-1 sm:w-36 h-10 sm:h-9">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.email}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Parts List — flat table view (Monday.com style) */}
        {activeTab === 'parts' && (
          <div className="space-y-3">
            {filteredParts.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                {/* Table header — desktop only */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-muted/50 dark:bg-background border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="w-4 shrink-0" />
                  <div className="flex-1">Part</div>
                  <div className="w-[180px] shrink-0">Project</div>
                  <div className="w-20 shrink-0">Status</div>
                  <div className="w-8 shrink-0">Owner</div>
                  <div className="w-24 shrink-0 text-right">ETA</div>
                </div>

                {/* Part rows grouped by project with collapsible headers */}
                {(() => {
                  const grouped = {};
                  filteredParts.forEach(part => {
                    const pid = part.project_id;
                    if (!grouped[pid]) grouped[pid] = [];
                    grouped[pid].push(part);
                  });

                  return Object.entries(grouped).map(([projectId, projectParts]) => {
                    const isCollapsed = expandedGroups[`parts_${projectId}`] === false;

                    return (
                      <div key={projectId}>
                        {/* Project group header */}
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 dark:bg-card border-b border-border cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedGroups(prev => ({ ...prev, [`parts_${projectId}`]: prev[`parts_${projectId}`] === false ? true : false }))}
                        >
                          <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", !isCollapsed && "rotate-90")} />
                          <FolderKanban className="w-3.5 h-3.5 text-primary" />
                          <Link
                            to={createPageUrl('ProjectParts') + `?id=${projectId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-xs text-foreground hover:text-primary truncate"
                          >
                            {getProjectName(projectId)}
                          </Link>
                          {getProjectNumber(projectId) && (
                            <span className="px-1.5 py-0 bg-slate-700 text-white rounded text-[9px] font-mono shrink-0">#{getProjectNumber(projectId)}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{projectParts.length} part{projectParts.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Parts in this project */}
                        {!isCollapsed && projectParts.map((part) => (
                          <PartTableRow
                            key={part.id}
                            part={part}
                            teamMembers={teamMembers}
                            projectName={getProjectName(part.project_id)}
                            projectNumber={getProjectNumber(part.project_id)}
                            getDueDateLabel={getDueDateLabel}
                            onAssign={handlePartAssign}
                            onUnassign={handlePartUnassign}
                            onDueDateChange={handlePartDueDateChange}
                            onStatusChange={handlePartStatusChange}
                            onETAChange={handlePartETAChange}
                            onNavigate={(p) => navigate(createPageUrl('ProjectParts') + `?id=${p.project_id}`)}
                          />
                        ))}
                      </div>
                    );
                  });
                })()}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card rounded-2xl border border-border"
              >
                <EmptyState
                  icon={Package}
                  title="No parts found"
                  description={statusFilter !== 'all' ? 'Try adjusting your filters' : 'Parts will appear here when added to active projects'}
                />
              </motion.div>
            )}
          </div>
        )}
    </PageShell>
  );
}

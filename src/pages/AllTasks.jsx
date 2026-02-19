import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const getColorForEmail = (email) => {
  if (!email) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// Task row component with its own state for date picker
function TaskRow({ task, teamMembers, currentUser, statusConfig, priorityColors, getDueDateLabel, groupName, onComplete, onAssign, onUnassign, onDueDateChange, onNavigate }) {
  const [dateOpen, setDateOpen] = useState(false);
  const status = statusConfig[task.status] || statusConfig.todo;
  const dueInfo = task.due_date ? getDueDateLabel(task.due_date) : null;

  return (
    <div
      onClick={() => onNavigate(task)}
      className="flex items-center gap-2 px-3 sm:px-4 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer group active:bg-slate-100"
    >
      {/* Checkmark */}
      <button
        onClick={(e) => onComplete(e, task.id)}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90",
          task.status === 'completed'
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-slate-300 hover:border-[#0069AF] hover:bg-[#0069AF]/5"
        )}
        title="Mark as completed"
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <CheckCircle2 className="w-3 h-3 opacity-0 group-hover:opacity-30" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-medium text-slate-900 truncate">{task.title}</h4>
          {groupName && (
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 hidden sm:inline">{groupName}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {task.priority && (
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 hidden sm:flex", priorityColors[task.priority])}>
            {task.priority}
          </Badge>
        )}

        {/* Inline assignee dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {task.assigned_name ? (
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-medium hover:ring-2 hover:ring-offset-1 hover:ring-indigo-300 shrink-0", getColorForEmail(task.assigned_to))}
                title={task.assigned_name}
              >
                {getInitials(task.assigned_name)}
              </button>
            ) : (
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:border-[#0069AF]"
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
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>
                  {getInitials(member.name)}
                </div>
                {member.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Inline due date picker */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            {dueInfo ? (
              <Badge
                onClick={(e) => { e.stopPropagation(); setDateOpen(true); }}
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-4 cursor-pointer hover:opacity-80", dueInfo.color)}
              >
                {dueInfo.label}
              </Badge>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setDateOpen(true); }}
                className="p-0.5 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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

// Part row component with its own state for date picker
function PartRow({ part, teamMembers, getDueDateLabel, onAssign, onUnassign, onDueDateChange, onNavigate }) {
  const [dateOpen, setDateOpen] = useState(false);
  const dueInfo = part.due_date && parseLocalDate(part.due_date) ? getDueDateLabel(part.due_date) : null;
  const deliveryInfo = part.est_delivery_date && parseLocalDate(part.est_delivery_date) ? getDueDateLabel(part.est_delivery_date) : null;
  const statusColors = {
    needed: 'bg-red-100 text-red-700',
    ordered: 'bg-blue-100 text-blue-700',
    received: 'bg-amber-100 text-amber-700',
    installed: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div
      onClick={() => onNavigate(part)}
      className="flex items-center gap-2 px-3 sm:px-4 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer group active:bg-slate-100"
    >
      <Package className="w-4 h-4 text-amber-500 shrink-0" />

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-slate-900 truncate">{part.name}</h4>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", statusColors[part.status] || 'bg-slate-100 text-slate-600')}>
          {part.status?.replace('_', ' ')}
        </Badge>
        {part.part_number && (
          <span className="text-[10px] text-slate-400 hidden sm:inline font-mono">#{part.part_number}</span>
        )}

        {/* Inline assignee dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {part.assigned_name ? (
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-medium hover:ring-2 hover:ring-offset-1 hover:ring-indigo-300 shrink-0", getColorForEmail(part.assigned_to))}
                title={part.assigned_name}
              >
                {getInitials(part.assigned_name)}
              </button>
            ) : (
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:border-[#0069AF]"
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
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>
                  {getInitials(member.name)}
                </div>
                {member.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {deliveryInfo && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-cyan-50 text-cyan-700 border-cyan-200 hidden sm:flex">
            ETA: {deliveryInfo.label}
          </Badge>
        )}

        {/* Inline due date picker */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            {dueInfo ? (
              <Badge
                onClick={(e) => { e.stopPropagation(); setDateOpen(true); }}
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-4 cursor-pointer hover:opacity-80", dueInfo.color)}
              >
                {dueInfo.label}
              </Badge>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setDateOpen(true); }}
                className="p-0.5 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                title="Set due date"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
            <Calendar
              mode="single"
              selected={part.due_date ? (() => {
                const dateStr = part.due_date.split('T')[0];
                const [year, month, day] = dateStr.split('-').map(Number);
                return new Date(year, month - 1, day);
              })() : undefined}
              onSelect={(date) => { onDueDateChange(part, date); setDateOpen(false); }}
            />
            {part.due_date && (
              <div className="p-2 border-t">
                <Button variant="ghost" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { onDueDateChange(part, null); setDateOpen(false); }}>
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {part.quantity > 1 && (
          <span className="text-[10px] text-slate-400 hidden sm:inline">x{part.quantity}</span>
        )}
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
  const [viewMode, setViewMode] = useState('all'); // 'all', 'mine', 'mine_due'
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setIsAdmin(user?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['allParts'],
    queryFn: () => base44.entities.Part.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const { data: taskGroups = [] } = useQuery({
    queryKey: ['allTaskGroups'],
    queryFn: () => base44.entities.TaskGroup.list()
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
    } else if (viewMode === 'mine_due') {
      matchesViewMode = task.assigned_to === currentUser?.email && task.due_date;
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesViewMode;
  }).sort((a, b) => {
    if (viewMode === 'mine_due') {
      return (parseLocalDate(a.due_date) || 0) - (parseLocalDate(b.due_date) || 0);
    }
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
  const myTasksWithDueCount = activeTasks.filter(t => t.assigned_to === currentUser?.email && t.due_date && t.status !== 'completed').length;

  const handleQuickComplete = async (e, taskId) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    await base44.entities.Task.update(taskId, { status: 'completed' });

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
    await base44.entities.Task.update(task.id, {
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
    await base44.entities.Task.update(task.id, { assigned_to: '', assigned_name: '' });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const handleTaskDueDateChange = async (task, date) => {
    await base44.entities.Task.update(task.id, {
      due_date: date ? format(date, 'yyyy-MM-dd') : ''
    });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const handlePartAssign = async (part, email) => {
    const member = teamMembers.find(m => m.email === email);
    await base44.entities.Part.update(part.id, {
      assigned_to: email,
      assigned_name: member?.name || email
    });
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
  };

  const handlePartUnassign = async (part) => {
    await base44.entities.Part.update(part.id, { assigned_to: '', assigned_name: '' });
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
  };

  const handlePartDueDateChange = async (part, date) => {
    await base44.entities.Part.update(part.id, {
      due_date: date ? format(date, 'yyyy-MM-dd') : ''
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

  if (loadingTasks) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div>
              <div className="h-8 w-48 bg-slate-200 rounded-lg" />
              <div className="h-4 w-64 bg-slate-100 rounded mt-2" />
              <div className="flex gap-2 mt-4">
                <div className="h-10 w-24 bg-slate-200 rounded-lg" />
                <div className="h-10 w-24 bg-slate-200 rounded-lg" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="h-10 bg-slate-100 rounded-lg mb-4" />
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                <div className="h-8 w-24 bg-slate-100 rounded-lg" />
              </div>
            </div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="flex gap-3">
                    <div className="h-5 w-16 bg-slate-100 rounded" />
                    <div className="h-5 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tasks & Parts</h1>
          <p className="text-slate-500 mt-1">View and filter all tasks and parts across projects</p>

          {/* Main Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('tasks')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'tasks' ? "bg-[#0069AF] text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <ListTodo className="w-4 h-4" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('parts')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'parts' ? "bg-[#0F2F44] text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <Package className="w-4 h-4" />
              Parts
              <span className={cn("text-xs px-1.5 py-0.5 rounded-full", activeTab === 'parts' ? "bg-[#133F5C]" : "bg-[#0069AF]/10 text-[#0069AF]")}>{parts.filter(p => activeProjectIds.includes(p.project_id)).length}</span>
            </button>
          </div>
        </motion.div>

        {/* Unified Toolbar - Tasks */}
        {activeTab === 'tasks' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 mb-6"
          >
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-4">
              <button
                onClick={() => setViewMode('all')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  viewMode === 'all'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                All Tasks ({activeTasks.filter(t => t.status !== 'completed').length})
              </button>
              <button
                onClick={() => setViewMode('mine')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  viewMode === 'mine'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                My Tasks ({myTasksCount})
              </button>
              <button
                onClick={() => setViewMode('mine_due')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  viewMode === 'mine_due'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Due Soon ({myTasksWithDueCount})
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
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {Object.entries(statusConfig).filter(([key]) => key !== 'completed').map(([key, config]) => {
                  const Icon = config.icon;
                  const count = tasksByStatus[key]?.length || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0",
                        statusFilter === key
                          ? "bg-[#0069AF] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{config.label}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px]",
                        statusFilter === key ? "bg-white/20" : "bg-white"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="flex-1 sm:w-32 h-10 sm:h-9">
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

        {/* Tasks List — grouped by project */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {filteredTasks.length > 0 ? (
              (() => {
                // Group tasks by project
                const grouped = {};
                filteredTasks.forEach(task => {
                  const pid = task.project_id;
                  if (!grouped[pid]) grouped[pid] = [];
                  grouped[pid].push(task);
                });

                return Object.entries(grouped).map(([projectId, projectTasks]) => (
                  <motion.div
                    key={projectId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-100 overflow-hidden"
                  >
                    {/* Project header */}
                    <Link
                      to={createPageUrl('ProjectDetail') + `?id=${projectId}`}
                      className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-3.5 h-3.5 text-[#0069AF]" />
                        <span className="font-semibold text-sm text-slate-900">{getProjectName(projectId)}</span>
                        {getProjectNumber(projectId) && <span className="px-1.5 py-0.5 bg-slate-800 text-white rounded text-[10px] font-mono font-semibold">#{getProjectNumber(projectId)}</span>}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{projectTasks.length}</Badge>
                      </div>
                    </Link>

                    {/* Task rows */}
                    <div className="divide-y divide-slate-50">
                      {projectTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          teamMembers={teamMembers}
                          currentUser={currentUser}
                          statusConfig={statusConfig}
                          priorityColors={priorityColors}
                          getDueDateLabel={getDueDateLabel}
                          groupName={getGroupName(task.group_id)}
                          onComplete={handleQuickComplete}
                          onAssign={handleTaskAssign}
                          onUnassign={handleTaskUnassign}
                          onDueDateChange={handleTaskDueDateChange}
                          onNavigate={(t) => navigate(createPageUrl('ProjectTasks') + `?id=${t.project_id}`)}
                        />
                      ))}
                    </div>
                  </motion.div>
                ));
              })()
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
              >
                <ListTodo className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No active tasks found</h3>
                <p className="text-slate-500">Try adjusting your filters or create a new task in a project</p>
              </motion.div>
            )}

            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 mb-2 transition-colors"
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
                      className="bg-white rounded-xl border border-slate-100 overflow-hidden"
                    >
                      <div className="divide-y divide-slate-50">
                        {completedTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => navigate(createPageUrl('ProjectTasks') + `?id=${task.project_id}`)}
                            className="flex items-center gap-2 px-4 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-sm text-slate-400 line-through truncate flex-1">{task.title}</span>
                            <span className="text-[10px] text-slate-300">{getProjectName(task.project_id)}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Parts Filters */}
        {activeTab === 'parts' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 mb-6"
          >
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search parts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="needed">Needed</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="installed">Installed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-48">
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
          </motion.div>
        )}

        {/* Parts Status Cards */}
        {activeTab === 'parts' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { key: 'needed', label: 'Needed', color: 'text-red-500', bg: 'bg-red-100' },
              { key: 'ordered', label: 'Ordered', color: 'text-blue-500', bg: 'bg-blue-100' },
              { key: 'received', label: 'Received', color: 'text-amber-500', bg: 'bg-amber-100' },
              { key: 'installed', label: 'Installed', color: 'text-emerald-500', bg: 'bg-emerald-100' }
            ].map((status) => {
              const count = activeProjectParts.filter(p => p.status === status.key).length;
              return (
                <motion.div
                  key={status.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                    statusFilter === status.key ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-white"
                  )}
                  onClick={() => setStatusFilter(statusFilter === status.key ? 'all' : status.key)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", status.bg)}>
                      <Package className={cn("w-4 h-4", status.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{count}</p>
                      <p className="text-xs text-slate-500">{status.label}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Parts List — grouped by project */}
        {activeTab === 'parts' && (
          <div className="space-y-3">
            {filteredParts.length > 0 ? (
              (() => {
                const grouped = {};
                filteredParts.forEach(part => {
                  const pid = part.project_id;
                  if (!grouped[pid]) grouped[pid] = [];
                  grouped[pid].push(part);
                });

                return Object.entries(grouped).map(([projectId, projectParts]) => (
                  <motion.div
                    key={projectId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-100 overflow-hidden"
                  >
                    {/* Project header */}
                    <Link
                      to={createPageUrl('ProjectParts') + `?id=${projectId}`}
                      className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-3.5 h-3.5 text-[#0F2F44]" />
                        <span className="font-semibold text-sm text-slate-900">{getProjectName(projectId)}</span>
                        {getProjectNumber(projectId) && <span className="px-1.5 py-0.5 bg-slate-800 text-white rounded text-[10px] font-mono font-semibold">#{getProjectNumber(projectId)}</span>}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{projectParts.length}</Badge>
                      </div>
                    </Link>

                    {/* Part rows */}
                    <div className="divide-y divide-slate-50">
                      {projectParts.map((part) => (
                        <PartRow
                          key={part.id}
                          part={part}
                          teamMembers={teamMembers}
                          getDueDateLabel={getDueDateLabel}
                          onAssign={handlePartAssign}
                          onUnassign={handlePartUnassign}
                          onDueDateChange={handlePartDueDateChange}
                          onNavigate={(p) => navigate(createPageUrl('ProjectParts') + `?id=${p.project_id}`)}
                        />
                      ))}
                    </div>
                  </motion.div>
                ));
              })()
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
              >
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No parts found</h3>
                <p className="text-slate-500">{statusFilter !== 'all' ? 'Try adjusting your filters' : 'Parts will appear here when added to active projects'}</p>
              </motion.div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

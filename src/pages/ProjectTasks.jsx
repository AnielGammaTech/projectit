import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ArrowLeft, Plus, Search, ChevronDown, ChevronRight,
  CheckCircle2, Circle, Clock, ArrowUpCircle,
  MoreHorizontal, Edit2, Trash2, Calendar as CalendarIcon,
  UserPlus, User, AlertTriangle, MessageCircle, Paperclip,
  FolderPlus, Archive, CheckSquare, Square, X, GripVertical,
  Check, Flag, ListChecks, TrendingUp, ListTodo
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import TaskModal from '@/components/modals/TaskModal';
import TaskDetailModal from '@/components/modals/TaskDetailModal';
import GroupModal from '@/components/modals/GroupModal';
import TaskGroupCard from '@/components/project/TaskGroupCard';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';
import UserAvatar from '@/components/UserAvatar';
import { sendTaskAssignmentNotification, sendTaskCompletionNotification } from '@/utils/notifications';
import { fireTaskConfetti, fireCelebrationConfetti } from '@/utils/confetti';
import { toast } from 'sonner';

const motivationalMessages = [
  "Nice work! Keep it up!",
  "One down, you're crushing it!",
  "Task complete! You're on a roll!",
  "Great progress! Keep the momentum!",
  "Done! Another step closer to the finish line!",
  "Nailed it! Your team will thank you!",
  "Completed! That's how it's done!",
];

// --- Design constants ---

const statusPillConfig = {
  todo:        { label: 'To Do',       bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  review:      { label: 'Review',      bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  completed:   { label: 'Completed',   bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  archived:    { label: 'Archived',    bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400' }
};

const groupColors = {
  slate: 'bg-slate-500', red: 'bg-red-500', amber: 'bg-amber-500',
  emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500', pink: 'bg-pink-500'
};

const groupAccentColors = {
  slate: 'border-l-slate-400', red: 'border-l-red-500', amber: 'border-l-amber-500',
  emerald: 'border-l-emerald-500', blue: 'border-l-blue-500', violet: 'border-l-violet-500', pink: 'border-l-pink-500'
};

const groupProgressGradients = {
  slate: 'bg-slate-400', red: 'bg-gradient-to-r from-red-500 to-rose-400',
  amber: 'bg-gradient-to-r from-amber-500 to-orange-400', emerald: 'bg-gradient-to-r from-emerald-500 to-teal-400',
  blue: 'bg-gradient-to-r from-blue-500 to-indigo-400', violet: 'bg-gradient-to-r from-violet-500 to-purple-400',
  pink: 'bg-gradient-to-r from-pink-500 to-rose-400'
};

const groupDotColors = {
  slate: 'bg-slate-500', red: 'bg-red-500', amber: 'bg-amber-500',
  emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500', pink: 'bg-pink-500'
};

const getDueDateInfo = (dueDate, status) => {
  if (!dueDate || status === 'completed') return null;
  const dateStr = dueDate.split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isPast(date) && !isToday(date)) return { label: 'Overdue', color: 'bg-red-500 text-white', urgent: true };
  if (isToday(date)) return { label: 'Today', color: 'bg-orange-500 text-white', urgent: true };
  if (isTomorrow(date)) return { label: 'Tomorrow', color: 'bg-amber-500 text-white', urgent: true };
  const days = differenceInDays(date, today);
  if (days <= 7) return { label: `${days}d`, color: 'bg-blue-100 text-blue-700', urgent: false };
  return { label: format(date, 'MMM d'), color: 'bg-slate-100 text-slate-600', urgent: false };
};

export default function ProjectTasks() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const autoOpenTaskId = urlParams.get('task');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState('all');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set(['ungrouped']));
  const [initialCollapseApplied, setInitialCollapseApplied] = useState(false);

  // Inline task creation state
  const [inlineTaskGroupId, setInlineTaskGroupId] = useState(null);
  const [inlineTaskData, setInlineTaskData] = useState({ title: '', assigned_to: '', due_date: null, description: '' });
  const [inlineDatePickerOpen, setInlineDatePickerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [inlineExpanded, setInlineExpanded] = useState(false);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, item: null });

  // Multi-select state
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDatePickerOpen, setBulkDatePickerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const autoOpenFired = useRef(false);

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await api.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: taskGroups = [], refetch: refetchGroups } = useQuery({
    queryKey: ['taskGroups', projectId],
    queryFn: () => api.entities.TaskGroup.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  // Collapse all groups by default on first load
  useEffect(() => {
    if (taskGroups.length > 0 && !initialCollapseApplied) {
      setCollapsedGroups(new Set(['ungrouped', ...taskGroups.map(g => g.id)]));
      setInitialCollapseApplied(true);
    }
  }, [taskGroups, initialCollapseApplied]);

  // Auto-open task detail if ?task= param is in URL
  useEffect(() => {
    if (autoOpenFired.current) return;
    if (autoOpenTaskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === autoOpenTaskId);
      if (task) {
        setSelectedTask(task);
        autoOpenFired.current = true;
      }
    }
  }, [autoOpenTaskId, tasks]);

  // Filter to only project members for assignment dropdowns
  const projectMembers = useMemo(() => {
    if (!project?.team_members?.length) return [];
    return teamMembers.filter(tm => project.team_members.includes(tm.email));
  }, [teamMembers, project]);

  const { data: allComments = [] } = useQuery({
    queryKey: ['allTaskComments', projectId],
    queryFn: async () => {
      const taskIds = tasks.map(t => t.id);
      if (taskIds.length === 0) return [];
      const comments = await api.entities.TaskComment.list();
      return comments.filter(c => taskIds.includes(c.task_id));
    },
    enabled: tasks.length > 0
  });

  const getCommentCount = (taskId) => {
    return allComments.filter(c => c.task_id === taskId).length;
  };

  const toggleGroup = (groupId) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedGroups(newCollapsed);
  };

  const filteredTasks = tasks.filter(task => {
    if (task.status === 'archived' && viewFilter !== 'archived') return false;

    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase());
    if (viewFilter === 'my_tasks') return matchesSearch && task.assigned_to === currentUser?.email;
    if (viewFilter === 'overdue') {
      const dueDateInfo = getDueDateInfo(task.due_date, task.status);
      return matchesSearch && dueDateInfo?.urgent;
    }
    if (viewFilter === 'archived') return matchesSearch && task.status === 'archived';
    return matchesSearch;
  });

  // Computed stats
  const totalTasks = tasks.filter(t => t.status !== 'archived').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const overdueTasks = tasks.filter(t => {
    const info = getDueDateInfo(t.due_date, t.status);
    return info?.label === 'Overdue';
  }).length;
  const todayTasks = tasks.filter(t => {
    const info = getDueDateInfo(t.due_date, t.status);
    return info?.label === 'Today';
  }).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Multi-select handlers
  const toggleTaskSelection = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
    if (newSelected.size === 0) setSelectionMode(false);
  };

  const selectAllTasks = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
      setSelectionMode(false);
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
    setSelectionMode(false);
  };

  const handleBulkArchive = async () => {
    try {
      for (const taskId of selectedTasks) {
        await api.entities.Task.update(taskId, { status: 'archived' });
      }
      refetchTasks();
      clearSelection();
    } catch (err) {
      toast.error('Failed to archive tasks. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const taskId of selectedTasks) {
        await api.entities.Task.delete(taskId);
      }
      refetchTasks();
      clearSelection();
    } catch (err) {
      toast.error('Failed to delete tasks. Please try again.');
    }
  };

  const handleBulkAssign = async (email) => {
    try {
      const member = teamMembers.find(m => m.email === email);
      const tasksToNotify = [];
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.assigned_to !== email) {
          tasksToNotify.push(task);
        }
        await api.entities.Task.update(taskId, {
          assigned_to: email,
          assigned_name: member?.name || email
        });
      }

      for (const task of tasksToNotify) {
        await sendTaskAssignmentNotification({
          assigneeEmail: email,
          taskTitle: task.title,
          projectId,
          projectName: project?.name,
          currentUser,
        });
      }

      refetchTasks();
      clearSelection();
    } catch (err) {
      toast.error('Failed to assign tasks. Please try again.');
    }
  };

  const handleBulkDueDate = async (date) => {
    try {
      for (const taskId of selectedTasks) {
        await api.entities.Task.update(taskId, {
          due_date: date ? format(date, 'yyyy-MM-dd') : ''
        });
      }
      refetchTasks();
      setBulkDatePickerOpen(false);
    } catch (err) {
      toast.error('Failed to update due dates. Please try again.');
    }
  };

  const handleBulkMoveToGroup = async (groupId) => {
    try {
      for (const taskId of selectedTasks) {
        await api.entities.Task.update(taskId, { group_id: groupId || '' });
      }
      refetchTasks();
      clearSelection();
    } catch (err) {
      toast.error('Failed to move tasks to group. Please try again.');
    }
  };

  // Drag and drop handler
  const handleDragEnd = async (result) => {
    const { draggableId, destination, source } = result;
    if (!destination) return;

    const destGroupId = destination.droppableId === 'ungrouped' ? '' : destination.droppableId;
    const sourceGroupId = source.droppableId === 'ungrouped' ? '' : source.droppableId;

    // Same position — nothing to do
    if (destGroupId === sourceGroupId && destination.index === source.index) return;

    // Build the ordered list for the destination group
    const allTasks = queryClient.getQueryData(['tasks', projectId]) || [];
    const destTasks = sortTasks(
      allTasks.filter((t) => (t.group_id || '') === destGroupId && t.id !== draggableId)
    );
    const draggedTask = allTasks.find((t) => t.id === draggableId);
    if (!draggedTask) return;

    // Insert at new position
    destTasks.splice(destination.index, 0, { ...draggedTask, group_id: destGroupId });

    // Assign sort_order to every task in the destination group
    const updates = destTasks.map((t, i) => ({ id: t.id, sort_order: i, group_id: destGroupId }));

    // Optimistic cache update
    queryClient.setQueryData(['tasks', projectId], (old) =>
      (old || []).map((t) => {
        const upd = updates.find((u) => u.id === t.id);
        return upd ? { ...t, sort_order: upd.sort_order, group_id: upd.group_id } : t;
      })
    );

    try {
      await Promise.all(
        updates.map((u) =>
          api.entities.Task.update(u.id, { sort_order: u.sort_order, group_id: u.group_id })
        )
      );
    } catch (err) {
      toast.error('Failed to reorder tasks');
    }
    await refetchTasks();
  };

  const sortTasks = (taskList) => {
    return [...taskList].sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      if ((a.sort_order ?? Infinity) !== (b.sort_order ?? Infinity)) {
        return (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity);
      }
      return 0;
    });
  };

  const ungroupedTasks = sortTasks(filteredTasks.filter(t => !t.group_id));
  const getTasksForGroup = (groupId) => sortTasks(filteredTasks.filter(t => t.group_id === groupId));

  const handleInlineCreate = async (groupId) => {
    if (!inlineTaskData.title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const member = teamMembers.find(m => m.email === inlineTaskData.assigned_to);
      const taskTitle = inlineTaskData.title.trim();
      const assigneeEmail = inlineTaskData.assigned_to || '';
      await api.entities.Task.create({
        title: taskTitle,
        project_id: projectId,
        status: 'todo',
        priority: 'medium',
        group_id: groupId || '',
        due_date: inlineTaskData.due_date ? format(inlineTaskData.due_date, 'yyyy-MM-dd') : '',
        assigned_to: assigneeEmail,
        assigned_name: member?.name || '',
        description: inlineTaskData.description || ''
      });

      if (assigneeEmail) {
        await sendTaskAssignmentNotification({
          assigneeEmail,
          taskTitle,
          projectId,
          projectName: project?.name,
          currentUser,
        });
      }

      setInlineTaskData({ title: '', assigned_to: '', due_date: null, description: '' });
      setInlineTaskGroupId(null);
      setInlineExpanded(false);
      refetchTasks();
    } catch (err) {
      toast.error('Failed to create task. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const cancelInlineCreate = () => {
    setInlineTaskGroupId(null);
    setInlineTaskData({ title: '', assigned_to: '', due_date: null, description: '' });
    setInlineExpanded(false);
  };

  const handleStatusChange = async (task, status) => {
    try {
      await api.entities.Task.update(task.id, { status });

      if (status === 'completed') {
        fireTaskConfetti();
        const msg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        toast.success(msg);

        await sendTaskCompletionNotification({
          task,
          projectId,
          projectName: project?.name,
          currentUser,
        });

        // Check if all tasks are now completed for a big celebration
        const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, status } : t);
        const activeTasks = updatedTasks.filter(t => t.status !== 'archived');
        const allDone = activeTasks.length > 0 && activeTasks.every(t => t.status === 'completed');
        if (allDone) {
          setTimeout(() => {
            fireCelebrationConfetti();
            toast.success("All tasks completed! Amazing work!");
          }, 500);
        }
      }

      refetchTasks();
    } catch (err) {
      toast.error('Failed to update task status. Please try again.');
    }
  };

  const handleSaveTask = async (data) => {
    try {
      const wasAssigned = editingTask?.assigned_to;
      const isNewlyAssigned = data.assigned_to && data.assigned_to !== 'unassigned' && data.assigned_to !== wasAssigned;

      if (editingTask) {
        await api.entities.Task.update(editingTask.id, data);
      } else {
        await api.entities.Task.create(data);
      }

      if (isNewlyAssigned) {
        await sendTaskAssignmentNotification({
          assigneeEmail: data.assigned_to,
          taskTitle: data.title,
          projectId,
          projectName: project?.name,
          currentUser,
        });
      }

      await refetchTasks();
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (err) {
      toast.error('Failed to save task. Please try again.');
    }
  };

  const handleBulkCreateTasks = async (tasksData) => {
    try {
      for (const taskData of tasksData) {
        await api.entities.Task.create({
          ...taskData,
          project_id: projectId
        });
      }
      await refetchTasks();
      setShowTaskModal(false);
    } catch (err) {
      toast.error('Failed to create tasks. Please try again.');
    }
  };


  const handleSaveGroup = async (data, existingGroup) => {
    try {
      if (existingGroup) {
        await api.entities.TaskGroup.update(existingGroup.id, data);
      } else {
        await api.entities.TaskGroup.create({ ...data, project_id: projectId });
      }
      refetchGroups();
      setShowGroupModal(false);
      setEditingGroup(null);
    } catch (err) {
      toast.error('Failed to save group. Please try again.');
    }
  };

  const handleDeleteGroup = async (group) => {
    try {
      await api.entities.TaskGroup.delete(group.id);
      const groupTasks = tasks.filter(t => t.group_id === group.id);
      for (const task of groupTasks) {
        await api.entities.Task.update(task.id, { group_id: '' });
      }
      refetchGroups();
      refetchTasks();
    } catch (err) {
      toast.error('Failed to delete group. Please try again.');
    }
  };

  const handleDelete = async () => {
    const { type, item } = deleteConfirm;
    try {
      if (type === 'task') {
        await api.entities.Task.delete(item.id);
        refetchTasks();
      } else if (type === 'group') {
        await handleDeleteGroup(item);
      }
      setDeleteConfirm({ open: false, type: null, item: null });
    } catch (err) {
      toast.error('Failed to delete. Please try again.');
    }
  };

  const handleTaskAssign = async (task, email) => {
    try {
      const member = teamMembers.find(m => m.email === email);
      await api.entities.Task.update(task.id, {
        assigned_to: email,
        assigned_name: member?.name || email
      });

      if (email !== task.assigned_to) {
        await sendTaskAssignmentNotification({
          assigneeEmail: email,
          taskTitle: task.title,
          projectId,
          projectName: project?.name,
          currentUser,
        });
      }

      refetchTasks();
    } catch (err) {
      toast.error('Failed to assign task. Please try again.');
    }
  };

  const handleTaskUnassign = async (task) => {
    try {
      await api.entities.Task.update(task.id, {
        assigned_to: '',
        assigned_name: ''
      });
      refetchTasks();
    } catch (err) {
      toast.error('Failed to unassign task. Please try again.');
    }
  };

  const handleTaskDueDateChange = async (task, date) => {
    try {
      await api.entities.Task.update(task.id, {
        due_date: date ? format(date, 'yyyy-MM-dd') : ''
      });
      refetchTasks();
    } catch (err) {
      toast.error('Failed to update due date. Please try again.');
    }
  };

  // ---- Inline Task Creator (DRY) ----
  const InlineTaskCreator = ({ groupId }) => {
    const actualGroupId = groupId === 'ungrouped' ? '' : groupId;
    const isActive = inlineTaskGroupId === groupId;

    if (!isActive) {
      return (
        <button
          onClick={() => { setInlineTaskGroupId(groupId); setInlineExpanded(false); }}
          className="flex items-center gap-2 text-sm text-primary hover:text-foreground py-2 pl-1 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add a task
        </button>
      );
    }

    return (
      <div className="rounded-xl border-2 border-primary/20 bg-blue-50/30 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-1 text-primary">
            <Plus className="w-4 h-4" />
          </div>
          <Input
            value={inlineTaskData.title}
            onChange={(e) => setInlineTaskData(p => ({ ...p, title: e.target.value }))}
            placeholder="Task name..."
            className="flex-1 h-9 border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-slate-400 text-sm font-medium"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInlineCreate(actualGroupId); }
              if (e.key === 'Escape') cancelInlineCreate();
            }}
          />
          <span className="text-xs text-slate-400 hidden sm:inline">Press Enter</span>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500" onClick={() => setInlineExpanded(!inlineExpanded)}>
            {inlineExpanded ? 'Less' : 'More'}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelInlineCreate}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        {inlineExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 pl-7"
          >
            <Select value={inlineTaskData.assigned_to} onValueChange={(v) => setInlineTaskData(p => ({ ...p, assigned_to: v }))}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="Assignee..." />
              </SelectTrigger>
              <SelectContent>
                {projectMembers.map((m) => (
                  <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover open={inlineDatePickerOpen} onOpenChange={setInlineDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs font-normal">
                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  {inlineTaskData.due_date ? format(inlineTaskData.due_date, 'MMM d') : 'Due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={inlineTaskData.due_date}
                  onSelect={(date) => { setInlineTaskData(p => ({ ...p, due_date: date })); setInlineDatePickerOpen(false); }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </motion.div>
        )}
      </div>
    );
  };

  // ---- TaskRow (Redesigned: Asana + Monday.com) ----
  const TaskRow = ({ task, dragHandleProps, isDragging }) => {
    const [dateOpen, setDateOpen] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const pill = statusPillConfig[task.status] || statusPillConfig.todo;
    const dueDateInfo = getDueDateInfo(task.due_date, task.status);
    const commentCount = getCommentCount(task.id);
    const isSelected = selectedTasks.has(task.id);
    const isCompleted = task.status === 'completed';
    const checklistItems = task.checklist_items;
    const checklistTotal = Array.isArray(checklistItems) ? checklistItems.length : 0;
    const checklistDone = Array.isArray(checklistItems) ? checklistItems.filter(i => i.completed || i.done).length : 0;

    return (
      <>
        {/* ── Mobile: Two-line task card ── */}
        <div
          className={cn(
            "sm:hidden group flex flex-col gap-1.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer",
            isCompleted || task.status === 'archived'
              ? "opacity-50 bg-slate-50/30 dark:bg-slate-800/30 border-slate-100 dark:border-border"
              : "border-slate-200/80 dark:border-border active:bg-slate-50",
            isSelected && "ring-2 ring-primary bg-blue-50/50"
          )}
          onClick={() => selectionMode ? toggleTaskSelection(task.id) : setSelectedTask(task)}
        >
          {/* Row 1: Checkbox + Title + Priority */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!selectionMode) handleStatusChange(task, isCompleted ? 'todo' : 'completed');
              }}
              className="shrink-0 touch-manipulation"
            >
              {isCompleted ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </motion.div>
              ) : (
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 transition-colors",
                  task.priority === 'high' ? "border-red-400" : "border-slate-300"
                )} />
              )}
            </button>
            <span className={cn(
              "flex-1 font-medium text-sm truncate min-w-0",
              isCompleted ? "line-through text-slate-400" : "text-foreground"
            )}>
              {task.title}
            </span>
            {task.priority === 'high' && (
              <Flag className="w-3.5 h-3.5 text-red-500 fill-red-500 shrink-0" />
            )}
          </div>

          {/* Row 2: Meta info chips */}
          <div className="flex items-center gap-2 pl-7 flex-wrap">
            {/* Status pill */}
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
              pill.bg, pill.text
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", pill.dot)} />
              {pill.label}
            </span>

            {/* Due date */}
            {dueDateInfo && (
              <Badge className={cn("text-[10px] px-1.5 py-0", dueDateInfo.color)}>
                {dueDateInfo.urgent && <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                {dueDateInfo.label}
              </Badge>
            )}

            {/* Checklist */}
            {checklistTotal > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                <ListChecks className="w-3 h-3" />
                {checklistDone}/{checklistTotal}
              </span>
            )}

            {/* Comments */}
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                <MessageCircle className="w-3 h-3" />
                {commentCount}
              </span>
            )}

            {/* Assignee */}
            {task.assigned_name && (
              <UserAvatar email={task.assigned_to} name={task.assigned_name} size="xs" />
            )}
          </div>
        </div>

        {/* ── Desktop: Original single-line row ── */}
        <div
          className={cn(
            "hidden sm:flex group items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer",
            isCompleted || task.status === 'archived'
              ? "opacity-50 bg-slate-50/30 dark:bg-slate-800/30 border-slate-100 dark:border-border"
              : "border-slate-200/80 dark:border-border hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50",
            isSelected && "ring-2 ring-primary bg-blue-50/50",
            isDragging && "shadow-lg ring-2 ring-primary"
          )}
          onClick={() => selectionMode ? toggleTaskSelection(task.id) : setSelectedTask(task)}
        >
          {/* Drag handle */}
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation">
            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Selection checkbox */}
          {selectionMode && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleTaskSelection(task.id); }}
              className="p-1.5 touch-manipulation"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-primary" />
              ) : (
                <Square className="w-5 h-5 text-slate-300" />
              )}
            </button>
          )}

          {/* Asana-style round checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!selectionMode) handleStatusChange(task, isCompleted ? 'todo' : 'completed');
            }}
            className="shrink-0 touch-manipulation"
          >
            {isCompleted ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="w-[17px] h-[17px] rounded-full bg-emerald-500 flex items-center justify-center"
              >
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </motion.div>
            ) : (
              <div className="w-[17px] h-[17px] rounded-full border-2 border-slate-300 hover:border-emerald-400 transition-colors" />
            )}
          </button>

          {/* Title */}
          <span className={cn(
            "flex-1 font-medium text-[13px] truncate min-w-0",
            isCompleted && "line-through text-slate-400"
          )}>
            {task.title}
          </span>

          {/* Indicators row */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Checklist progress mini-indicator */}
            {checklistTotal > 0 && (
              <div className="flex items-center gap-1 text-slate-400">
                <ListChecks className="w-3.5 h-3.5" />
                <span className="text-xs">{checklistDone}/{checklistTotal}</span>
              </div>
            )}

            {/* Comment count */}
            {commentCount > 0 && (
              <div className="flex items-center gap-1 text-slate-400">
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="text-xs">{commentCount}</span>
              </div>
            )}

            {/* Attachments indicator */}
            {task.attachments?.length > 0 && (
              <div className="flex items-center gap-1 text-slate-400">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="text-xs">{task.attachments.length}</span>
              </div>
            )}

            {/* Monday.com status pill with dropdown */}
            <DropdownMenu open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); setStatusDropdownOpen(true); }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80",
                    pill.bg, pill.text
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", pill.dot)} />
                  {pill.label}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {Object.entries(statusPillConfig).map(([key, config]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleStatusChange(task, key)}
                    className="gap-2"
                  >
                    <div className={cn("w-2 h-2 rounded-full", config.dot)} />
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Priority flag */}
            {task.priority === 'high' && (
              <Flag className="w-3.5 h-3.5 text-red-500 fill-red-500 shrink-0" />
            )}

            {/* Due date picker */}
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                {dueDateInfo ? (
                  <Badge
                    onClick={(e) => { e.stopPropagation(); setDateOpen(true); }}
                    className={cn("text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80", dueDateInfo.color)}
                  >
                    {dueDateInfo.urgent && <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                    {dueDateInfo.label}
                  </Badge>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDateOpen(true); }}
                    className="p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
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
                  onSelect={(date) => { handleTaskDueDateChange(task, date); setDateOpen(false); }}
                />
                {task.due_date && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full text-red-600" onClick={() => { handleTaskDueDateChange(task, null); setDateOpen(false); }}>
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Assignee avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {task.assigned_name ? (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="hover:ring-2 hover:ring-offset-1 hover:ring-primary/30 rounded-full touch-manipulation shrink-0"
                    title={task.assigned_name}
                  >
                    <UserAvatar email={task.assigned_to} name={task.assigned_name} size="sm" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-primary/40 touch-manipulation shrink-0"
                  >
                    <UserPlus className="w-2.5 h-2.5 text-slate-400" />
                  </button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                {task.assigned_to && (
                  <DropdownMenuItem onClick={() => handleTaskUnassign(task)} className="text-slate-500">
                    <User className="w-4 h-4 mr-2" />
                    Unassign
                  </DropdownMenuItem>
                )}
                {projectMembers.map((member) => (
                  <DropdownMenuItem key={member.id} onClick={() => handleTaskAssign(task, member.email)}>
                    <UserAvatar email={member.email} name={member.name} size="xs" className="mr-2" />
                    {member.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 touch-manipulation" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditingTask(task); setShowTaskModal(true); }}>
                  <Edit2 className="w-4 h-4 mr-2" />Edit
                </DropdownMenuItem>
                {task.status === 'archived' ? (
                  <DropdownMenuItem onClick={() => handleStatusChange(task, 'todo')}>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleStatusChange(task, 'archived')}>
                    <Archive className="w-4 h-4 mr-2" />Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => { setSelectedTask(null); setDeleteConfirm({ open: true, type: 'task', item: task }); }} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </>
    );
  };

  // ---- Group Progress Footer ----
  const GroupProgressFooter = ({ groupTasks, color }) => {
    const completed = groupTasks.filter(t => t.status === 'completed').length;
    const total = groupTasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const overdueCount = groupTasks.filter(t => {
      const info = getDueDateInfo(t.due_date, t.status);
      return info?.label === 'Overdue';
    }).length;
    const gradient = groupProgressGradients[color] || groupProgressGradients.slate;

    if (total === 0) return null;

    return (
      <div className="px-4 pb-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", gradient)}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{percent}%</span>
          {overdueCount > 0 && (
            <span className="text-xs text-red-500 font-medium whitespace-nowrap">{overdueCount} overdue</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <ProjectNavHeader project={project} currentPage="ProjectTasks" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile: Compact inline header */}
        <div className="sm:hidden flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">Tasks</h1>
            <span className="text-xs text-slate-400 dark:text-slate-500">{completedTasks}/{totalTasks}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
              size="sm"
              className="bg-primary hover:bg-primary/80 text-white h-8 text-xs px-2.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Task
            </Button>
            <Button
              onClick={() => setShowGroupModal(true)}
              variant="outline"
              size="sm"
              className="border-slate-200 dark:border-border text-slate-600 dark:text-slate-400 h-8 text-xs px-2.5"
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1" />
              Group
            </Button>
          </div>
        </div>
        {/* Mobile: slim progress bar */}
        <div className="sm:hidden mb-4">
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Desktop: Compact Header */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30">
              <ListTodo className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Tasks</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{completedTasks} of {totalTasks} completed</span>
                {totalTasks > 0 && (
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                )}
                <span className="text-xs font-semibold text-primary">{progressPercent}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
              className="bg-primary hover:bg-primary/80 text-white h-9 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGroupModal(true)}
              className="h-9 gap-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              New Group
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectionMode && selectedTasks.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary text-white rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <button onClick={clearSelection} className="p-1.5 hover:bg-white/10 rounded touch-manipulation">
                <X className="w-4 h-4" />
              </button>
              <span className="font-medium text-sm">{selectedTasks.size} selected</span>
              <button onClick={selectAllTasks} className="text-sm underline hover:no-underline">
                {selectedTasks.size === filteredTasks.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full">
              {/* Move to Group */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-8 text-xs">
                    <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                    Move to Group
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkMoveToGroup('')}>
                    Ungrouped
                  </DropdownMenuItem>
                  {taskGroups.map((g) => (
                    <DropdownMenuItem key={g.id} onClick={() => handleBulkMoveToGroup(g.id)}>
                      <div className={cn("w-2 h-2 rounded-full mr-2", groupColors[g.color])} />
                      {g.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Assign */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-8 text-xs">
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Assign
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {projectMembers.map((member) => (
                    <DropdownMenuItem key={member.id} onClick={() => handleBulkAssign(member.email)}>
                      <UserAvatar email={member.email} name={member.name} size="xs" className="mr-2" />
                      {member.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Due Date */}
              <Popover open={bulkDatePickerOpen} onOpenChange={setBulkDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-8 text-xs">
                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                    Due Date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    onSelect={handleBulkDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Archive */}
              <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={handleBulkArchive}>
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                Archive
              </Button>

              {/* Delete */}
              <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={handleBulkDelete}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
            </div>
          </motion.div>
        )}

        {/* Phase 2: Filter/Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mb-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 h-10 sm:h-9 rounded-xl focus-visible:ring-primary"
            />
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 overflow-x-auto">
            <div className="flex gap-1 p-1 bg-slate-100/80 dark:bg-slate-700/50 rounded-xl shrink-0">
              {[['all', 'All'], ['my_tasks', 'Mine'], ['overdue', 'Overdue'], ['archived', 'Archived']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setViewFilter(key)}
                  className={cn(
                    "text-xs font-medium py-2 px-3 rounded-lg transition-all whitespace-nowrap touch-manipulation relative",
                    viewFilter === key ? "bg-white dark:bg-slate-600 text-primary dark:text-blue-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  {label}
                  {key === 'overdue' && overdueTasks > 0 && viewFilter !== 'overdue' && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
            {/* View Mode Toggle — hidden on mobile */}
            <div className="hidden sm:flex gap-1 p-1 bg-slate-100/80 dark:bg-slate-700/50 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "text-xs font-medium py-2 px-3 rounded-lg transition-all touch-manipulation",
                  viewMode === 'list' ? "bg-white dark:bg-slate-600 text-primary dark:text-blue-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  "text-xs font-medium py-2 px-3 rounded-lg transition-all touch-manipulation",
                  viewMode === 'cards' ? "bg-white dark:bg-slate-600 text-primary dark:text-blue-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                Cards
              </button>
            </div>
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) clearSelection(); }}
              className={cn("hidden sm:inline-flex h-9 shrink-0 touch-manipulation", selectionMode && "bg-primary hover:bg-primary/80")}
            >
              <CheckSquare className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{selectionMode ? 'Done' : 'Select'}</span>
            </Button>
          </div>
        </div>

        {/* Card View */}
        {viewMode === 'cards' && (
          <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-3 sm:gap-4 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {taskGroups.map((group) => {
                const groupTasks = getTasksForGroup(group.id);
                return (
                  <TaskGroupCard
                    key={group.id}
                    group={group}
                    tasks={groupTasks}
                    onEditGroup={(g) => { setEditingGroup(g); setShowGroupModal(true); }}
                    onDeleteGroup={(g) => setDeleteConfirm({ open: true, type: 'group', item: g })}
                    onTaskClick={(task) => setSelectedTask(task)}
                    onTaskStatusChange={handleStatusChange}
                  />
                );
              })}
              {ungroupedTasks.length > 0 && (
                <TaskGroupCard
                  group={{ name: 'Ungrouped', color: 'slate' }}
                  tasks={ungroupedTasks}
                  onTaskClick={(task) => setSelectedTask(task)}
                  onTaskStatusChange={handleStatusChange}
                />
              )}
            </div>
          </div>
        )}

        {/* List View - Task Groups with Drag and Drop */}
        {viewMode === 'list' && (
        <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {taskGroups.map((group) => {
            const groupTasks = getTasksForGroup(group.id);
            const completedCount = groupTasks.filter(t => t.status === 'completed').length;
            const isExpanded = !collapsedGroups.has(group.id);
            const accentColor = groupAccentColors[group.color] || groupAccentColors.slate;

            return (
              <div key={group.id} className={cn("bg-card rounded-2xl border border-slate-200 dark:border-border overflow-hidden shadow-sm border-l-4", accentColor)}>
                {/* Phase 4: Monday.com Group Header */}
                <div
                  className="group/header flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => toggleGroup(group.id)}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="font-bold text-base text-foreground flex-1">{group.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-sm text-slate-600 font-medium">
                    {completedCount}/{groupTasks.length}
                  </span>
                  {/* Inline +Add on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setInlineTaskGroupId(group.id); }}
                    className="opacity-0 group-hover/header:opacity-100 transition-opacity text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingGroup(group); setShowGroupModal(true); }}>
                        <Edit2 className="w-4 h-4 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteConfirm({ open: true, type: 'group', item: group })} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {isExpanded && (
                  <Droppable droppableId={group.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "px-3 pb-2 space-y-1 min-h-[40px] transition-colors",
                          snapshot.isDraggingOver && "bg-blue-50/50"
                        )}
                      >
                        {groupTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <TaskRow
                                  task={task}
                                  dragHandleProps={provided.dragHandleProps}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Phase 5: Inline Task Creator */}
                        <InlineTaskCreator groupId={group.id} />
                      </div>
                    )}
                  </Droppable>
                )}
                {/* Phase 4: Group Progress Footer */}
                {isExpanded && <GroupProgressFooter groupTasks={groupTasks} color={group.color} />}
              </div>
            );
          })}

          {/* Ungrouped — hide if empty */}
          {ungroupedTasks.length > 0 && <div className={cn("bg-card rounded-2xl border border-slate-200 dark:border-border overflow-hidden shadow-sm border-l-4", groupAccentColors.slate)}>
            <div
              className="group/header flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              onClick={() => toggleGroup('ungrouped')}
            >
              {!collapsedGroups.has('ungrouped') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              <span className="font-bold text-base text-muted-foreground flex-1">Ungrouped</span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-sm text-slate-600 font-medium">
                {ungroupedTasks.filter(t => t.status === 'completed').length}/{ungroupedTasks.length}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setInlineTaskGroupId('ungrouped'); }}
                className="opacity-0 group-hover/header:opacity-100 transition-opacity text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {!collapsedGroups.has('ungrouped') && (
              <Droppable droppableId="ungrouped">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "px-3 pb-2 space-y-1 min-h-[40px] transition-colors",
                      snapshot.isDraggingOver && "bg-blue-50/50"
                    )}
                  >
                    {ungroupedTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <TaskRow
                              task={task}
                              dragHandleProps={provided.dragHandleProps}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    <InlineTaskCreator groupId="ungrouped" />
                  </div>
                )}
              </Droppable>
            )}
            {!collapsedGroups.has('ungrouped') && (
              <GroupProgressFooter groupTasks={ungroupedTasks} color="slate" />
            )}
          </div>}

          {/* Phase 6: Empty State */}
          {filteredTasks.length === 0 && taskGroups.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <ListTodo className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No tasks yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Get started by creating a task group to organize your work, or add your first task directly.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={() => setShowGroupModal(true)}
                  variant="outline"
                  className="border-primary/20 text-primary hover:bg-primary/5"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
                <Button
                  onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
                  className="bg-primary hover:bg-primary/80 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          )}
        </div>
        </DragDropContext>
        )}
      </div>

      {/* Modals */}
      <TaskModal
        open={showTaskModal}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        task={editingTask}
        projectId={projectId}
        teamMembers={projectMembers}
        groups={taskGroups}
        onSave={handleSaveTask}
        onBulkCreate={handleBulkCreateTasks}
      />

      <GroupModal
        open={showGroupModal}
        onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
        group={editingGroup}
        projectId={projectId}
        onSave={handleSaveGroup}
      />

      <TaskDetailModal
        open={!!selectedTask && !deleteConfirm.open}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        teamMembers={projectMembers}
        currentUser={currentUser}
        onEdit={(task) => { setSelectedTask(null); setEditingTask(task); setShowTaskModal(true); }}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => { if (!open) { setDeleteConfirm({ open: false, type: null, item: null }); setSelectedTask(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm.type}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
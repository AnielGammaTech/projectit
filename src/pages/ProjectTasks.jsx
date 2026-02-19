import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  ArrowLeft, Plus, Search, ChevronDown, ChevronRight, 
  CheckCircle2, Circle, Clock, ArrowUpCircle, 
  MoreHorizontal, Edit2, Trash2, Calendar as CalendarIcon,
  UserPlus, User, AlertTriangle, MessageCircle, Paperclip,
  FolderPlus, Archive, CheckSquare, Square, X, GripVertical
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

const statusConfig = {
  todo: { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100', label: 'To Do' },
  in_progress: { icon: ArrowUpCircle, color: 'text-blue-500', bg: 'bg-blue-100', label: 'In Progress' },
  review: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100', label: 'Review' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Completed' },
  archived: { icon: Archive, color: 'text-slate-400', bg: 'bg-slate-100', label: 'Archived' }
};

const groupColors = {
  slate: 'bg-slate-500', red: 'bg-red-500', amber: 'bg-amber-500',
  emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500', pink: 'bg-pink-500'
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

const getDueDateInfo = (dueDate, status) => {
  if (!dueDate || status === 'completed') return null;
  // Parse as local date to avoid timezone issues
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
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  
  // Inline task creation state
  const [inlineTaskGroupId, setInlineTaskGroupId] = useState(null);
  const [inlineTaskData, setInlineTaskData] = useState({ title: '', assigned_to: '', due_date: null, description: '' });
  const [inlineDatePickerOpen, setInlineDatePickerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: taskGroups = [], refetch: refetchGroups } = useQuery({
    queryKey: ['taskGroups', projectId],
    queryFn: () => base44.entities.TaskGroup.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ['allTaskComments', projectId],
    queryFn: async () => {
      const taskIds = tasks.map(t => t.id);
      if (taskIds.length === 0) return [];
      const comments = await base44.entities.TaskComment.list();
      return comments.filter(c => taskIds.includes(c.task_id));
    },
    enabled: tasks.length > 0
  });

  // Initialize expanded groups
  useEffect(() => {
    if (taskGroups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(['ungrouped', ...taskGroups.map(g => g.id)]));
    }
  }, [taskGroups]);

  const getCommentCount = (taskId) => {
    return allComments.filter(c => c.task_id === taskId).length;
  };

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const filteredTasks = tasks.filter(task => {
    // Hide archived unless viewing archived
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
    for (const taskId of selectedTasks) {
      await base44.entities.Task.update(taskId, { status: 'archived' });
    }
    refetchTasks();
    clearSelection();
  };

  const handleBulkDelete = async () => {
    for (const taskId of selectedTasks) {
      await base44.entities.Task.delete(taskId);
    }
    refetchTasks();
    clearSelection();
  };

  const handleBulkAssign = async (email) => {
    const member = teamMembers.find(m => m.email === email);
    for (const taskId of selectedTasks) {
      await base44.entities.Task.update(taskId, {
        assigned_to: email,
        assigned_name: member?.name || email
      });
    }
    refetchTasks();
    clearSelection();
  };

  const handleBulkDueDate = async (date) => {
    for (const taskId of selectedTasks) {
      await base44.entities.Task.update(taskId, {
        due_date: date ? format(date, 'yyyy-MM-dd') : ''
      });
    }
    refetchTasks();
    setBulkDatePickerOpen(false);
  };

  const handleBulkMoveToGroup = async (groupId) => {
    for (const taskId of selectedTasks) {
      await base44.entities.Task.update(taskId, { group_id: groupId || '' });
    }
    refetchTasks();
    clearSelection();
  };

  // Drag and drop handler
  const handleDragEnd = async (result) => {
    const { draggableId, destination, source } = result;
    if (!destination) return;
    
    // Get the destination group ID (or empty string for ungrouped)
    const destGroupId = destination.droppableId === 'ungrouped' ? '' : destination.droppableId;
    const sourceGroupId = source.droppableId === 'ungrouped' ? '' : source.droppableId;
    
    // If dropped in same group, no update needed
    if (destGroupId === sourceGroupId) return;
    
    // Update the task's group
    await base44.entities.Task.update(draggableId, { group_id: destGroupId });
    refetchTasks();
  };

  const sortTasks = (taskList) => {
    return [...taskList].sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return 0;
    });
  };

  const ungroupedTasks = sortTasks(filteredTasks.filter(t => !t.group_id));
  const getTasksForGroup = (groupId) => sortTasks(filteredTasks.filter(t => t.group_id === groupId));

  const handleInlineCreate = async (groupId) => {
    if (!inlineTaskData.title.trim() || isCreating) return;
    
    setIsCreating(true);
    const member = teamMembers.find(m => m.email === inlineTaskData.assigned_to);
    await base44.entities.Task.create({
      title: inlineTaskData.title.trim(),
      project_id: projectId,
      status: 'todo',
      priority: 'medium',
      group_id: groupId || '',
      due_date: inlineTaskData.due_date ? format(inlineTaskData.due_date, 'yyyy-MM-dd') : '',
      assigned_to: inlineTaskData.assigned_to || '',
      assigned_name: member?.name || '',
      description: inlineTaskData.description || ''
    });
    setInlineTaskData({ title: '', assigned_to: '', due_date: null, description: '' });
    setInlineTaskGroupId(null);
    setIsCreating(false);
    refetchTasks();
  };

  const cancelInlineCreate = () => {
    setInlineTaskGroupId(null);
    setInlineTaskData({ title: '', assigned_to: '', due_date: null, description: '' });
  };

  const handleStatusChange = async (task, status) => {
    await base44.entities.Task.update(task.id, { status });
    refetchTasks();
  };

  const handleSaveTask = async (data) => {
    if (editingTask) {
      await base44.entities.Task.update(editingTask.id, data);
    } else {
      await base44.entities.Task.create(data);
    }
    await refetchTasks();
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleBulkCreateTasks = async (tasksData) => {
    for (const taskData of tasksData) {
      await base44.entities.Task.create({
        ...taskData,
        project_id: projectId
      });
    }
    await refetchTasks();
    setShowTaskModal(false);
  };

  const handleSaveGroup = async (data, existingGroup) => {
    if (existingGroup) {
      await base44.entities.TaskGroup.update(existingGroup.id, data);
    } else {
      await base44.entities.TaskGroup.create({ ...data, project_id: projectId });
    }
    refetchGroups();
    setShowGroupModal(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (group) => {
    await base44.entities.TaskGroup.delete(group.id);
    const groupTasks = tasks.filter(t => t.group_id === group.id);
    for (const task of groupTasks) {
      await base44.entities.Task.update(task.id, { group_id: '' });
    }
    refetchGroups();
    refetchTasks();
  };

  const handleDelete = async () => {
    const { type, item } = deleteConfirm;
    if (type === 'task') {
      await base44.entities.Task.delete(item.id);
      refetchTasks();
    } else if (type === 'group') {
      await handleDeleteGroup(item);
    }
    setDeleteConfirm({ open: false, type: null, item: null });
  };

  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const handleTaskAssign = async (task, email) => {
    const member = teamMembers.find(m => m.email === email);
    await base44.entities.Task.update(task.id, {
      assigned_to: email,
      assigned_name: member?.name || email
    });
    refetchTasks();
  };

  const handleTaskUnassign = async (task) => {
    await base44.entities.Task.update(task.id, {
      assigned_to: '',
      assigned_name: ''
    });
    refetchTasks();
  };

  const handleTaskDueDateChange = async (task, date) => {
    await base44.entities.Task.update(task.id, {
      due_date: date ? format(date, 'yyyy-MM-dd') : ''
    });
    refetchTasks();
  };

  const TaskRow = ({ task, dragHandleProps, isDragging }) => {
    const [dateOpen, setDateOpen] = useState(false);
    const status = statusConfig[task.status] || statusConfig.todo;
    const StatusIcon = status.icon;
    const dueDateInfo = getDueDateInfo(task.due_date, task.status);
    const commentCount = getCommentCount(task.id);
    const isSelected = selectedTasks.has(task.id);

    return (
      <div
        className={cn(
          "group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer",
          task.status === 'completed' || task.status === 'archived' ? "opacity-60 border-slate-100" :
          dueDateInfo?.urgent ? "border-red-200 bg-red-50/30" : "border-slate-200",
          isSelected && "ring-2 ring-indigo-500 bg-indigo-50/50",
          isDragging && "shadow-lg ring-2 ring-indigo-400"
        )}
        onClick={() => selectionMode ? toggleTaskSelection(task.id) : setSelectedTask(task)}
      >
        {/* Drag handle - always visible on touch devices */}
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation">
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
        {/* Selection checkbox */}
        {selectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleTaskSelection(task.id); }}
            className="p-1.5 touch-manipulation"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-indigo-600" />
            ) : (
              <Square className="w-5 h-5 text-slate-300" />
            )}
          </button>
        )}

        {/* Status */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!selectionMode) handleStatusChange(task, task.status === 'completed' ? 'todo' : 'completed');
          }}
          className={cn("p-2 sm:p-1.5 rounded-lg transition-all hover:scale-110 active:scale-90 touch-manipulation shrink-0", status.bg, "hover:bg-emerald-100")}
        >
          <StatusIcon className={cn("w-5 h-5 sm:w-4 sm:h-4", status.color)} />
        </button>

        {/* Title */}
        <span className={cn(
          "flex-1 font-medium text-sm sm:text-base truncate min-w-0",
          task.status === 'completed' && "line-through text-slate-500"
        )}>
          {task.title}
        </span>

        {/* Indicators - hide some on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Comment count - hidden on mobile */}
          {commentCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-slate-400">
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="text-xs">{commentCount}</span>
            </div>
          )}

          {/* Attachments indicator - hidden on mobile */}
          {task.attachments?.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-slate-400">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="text-xs">{task.attachments.length}</span>
            </div>
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

          {/* Assignee */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {task.assigned_name ? (
                <button
                  onClick={(e) => e.stopPropagation()}
                  className={cn("w-8 h-8 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium hover:ring-2 hover:ring-offset-1 hover:ring-indigo-300 touch-manipulation shrink-0", getColorForEmail(task.assigned_to))}
                  title={task.assigned_name}
                >
                  {getInitials(task.assigned_name)}
                </button>
              ) : (
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:border-indigo-300 touch-manipulation shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-slate-400" />
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
              {teamMembers.map((member) => (
                <DropdownMenuItem key={member.id} onClick={() => handleTaskAssign(task, member.email)}>
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>
                    {getInitials(member.name)}
                  </div>
                  {member.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Archive button - hidden on mobile (available in more menu) */}
          {task.status !== 'archived' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange(task, 'archived'); }}
              className="hidden sm:block p-1.5 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
              title="Archive"
            >
              <Archive className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-4 h-4" />
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
              <DropdownMenuItem onClick={() => setDeleteConfirm({ open: true, type: 'task', item: task })} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <ProjectNavHeader project={project} currentPage="ProjectTasks" />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Tasks</h1>
            <p className="text-xs sm:text-sm text-slate-500">{completedTasks}/{tasks.length} completed</p>
          </div>
          <Button onClick={() => setShowGroupModal(true)} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 sm:h-10">
            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">New Group</span>
            <span className="sm:hidden">Group</span>
          </Button>
        </div>



        {/* Bulk Action Bar */}
        {selectionMode && selectedTasks.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-600 text-white rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <button onClick={clearSelection} className="p-1.5 hover:bg-indigo-500 rounded touch-manipulation">
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
                  {teamMembers.map((member) => (
                    <DropdownMenuItem key={member.id} onClick={() => handleBulkAssign(member.email)}>
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>
                        {getInitials(member.name)}
                      </div>
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mb-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 h-10 sm:h-9"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              {[['all', 'All'], ['my_tasks', 'Mine'], ['overdue', 'Overdue'], ['archived', 'Archived']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setViewFilter(key)}
                  className={cn(
                    "text-xs font-medium py-2 px-3 rounded-md transition-all whitespace-nowrap touch-manipulation",
                    viewFilter === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* View Mode Toggle */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "text-xs font-medium py-2 px-3 rounded-md transition-all touch-manipulation",
                  viewMode === 'list' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  "text-xs font-medium py-2 px-3 rounded-md transition-all touch-manipulation",
                  viewMode === 'cards' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Cards
              </button>
            </div>
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) clearSelection(); }}
              className={cn("h-9 shrink-0 touch-manipulation", selectionMode && "bg-indigo-600")}
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
            const isExpanded = expandedGroups.has(group.id);

            return (
              <div key={group.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleGroup(group.id)}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div className={cn("w-3 h-3 rounded-full", groupColors[group.color] || groupColors.slate)} />
                  <span className="font-semibold text-slate-900 flex-1">{group.name}</span>
                  <span className="text-sm text-slate-500">{completedCount}/{groupTasks.length}</span>
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
                          "px-4 pb-4 space-y-2 min-h-[60px] transition-colors",
                          snapshot.isDraggingOver && "bg-indigo-50/50"
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
                        
                        {/* Inline Task Creation Form */}
                        {inlineTaskGroupId === group.id ? (
                          <div className="bg-white rounded-xl border-2 border-emerald-200 p-4 space-y-3 shadow-sm">
                            <Input
                              value={inlineTaskData.title}
                              onChange={(e) => setInlineTaskData(p => ({ ...p, title: e.target.value }))}
                              placeholder="Task name"
                              className="h-10 border-slate-200"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInlineCreate(group.id); } }}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">Assigned to</label>
                                <Select value={inlineTaskData.assigned_to} onValueChange={(v) => setInlineTaskData(p => ({ ...p, assigned_to: v }))}>
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Assign..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {teamMembers.map((m) => (
                                      <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">Due on</label>
                                <Popover open={inlineDatePickerOpen} onOpenChange={setInlineDatePickerOpen}>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full h-9 justify-start text-sm font-normal">
                                      <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                                      {inlineTaskData.due_date ? format(inlineTaskData.due_date, 'MMM d') : 'Select date'}
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
                              </div>
                            </div>
                            <Textarea
                              value={inlineTaskData.description}
                              onChange={(e) => setInlineTaskData(p => ({ ...p, description: e.target.value }))}
                              placeholder="Add notes..."
                              className="min-h-[60px] text-sm"
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={cancelInlineCreate}>Cancel</Button>
                              <Button size="sm" onClick={() => handleInlineCreate(group.id)} disabled={!inlineTaskData.title.trim() || isCreating} className="bg-emerald-600 hover:bg-emerald-700">
                                Add Task
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setInlineTaskGroupId(group.id)}
                            className="flex items-center gap-2 text-sm text-[#0069AF] hover:text-[#133F5C] py-2 pl-1 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Add a task
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}

          {/* Ungrouped */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleGroup('ungrouped')}
            >
              {expandedGroups.has('ungrouped') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              <span className="font-semibold text-slate-500 flex-1">Ungrouped</span>
              <span className="text-sm text-slate-500">
                {ungroupedTasks.filter(t => t.status === 'completed').length}/{ungroupedTasks.length}
              </span>
            </div>
            {expandedGroups.has('ungrouped') && (
              <Droppable droppableId="ungrouped">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "px-4 pb-4 space-y-2 min-h-[60px] transition-colors",
                      snapshot.isDraggingOver && "bg-indigo-50/50"
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
                    
                    {/* Inline Task Creation Form for Ungrouped */}
                    {inlineTaskGroupId === 'ungrouped' ? (
                      <div className="bg-white rounded-xl border-2 border-emerald-200 p-4 space-y-3 shadow-sm">
                        <Input
                          value={inlineTaskData.title}
                          onChange={(e) => setInlineTaskData(p => ({ ...p, title: e.target.value }))}
                          placeholder="Task name"
                          className="h-10 border-slate-200"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInlineCreate(''); } }}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Assigned to</label>
                            <Select value={inlineTaskData.assigned_to} onValueChange={(v) => setInlineTaskData(p => ({ ...p, assigned_to: v }))}>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {teamMembers.map((m) => (
                                  <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Due on</label>
                            <Popover open={inlineDatePickerOpen} onOpenChange={setInlineDatePickerOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full h-9 justify-start text-sm font-normal">
                                  <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                                  {inlineTaskData.due_date ? format(inlineTaskData.due_date, 'MMM d') : 'Select date'}
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
                          </div>
                        </div>
                        <Textarea
                          value={inlineTaskData.description}
                          onChange={(e) => setInlineTaskData(p => ({ ...p, description: e.target.value }))}
                          placeholder="Add notes..."
                          className="min-h-[60px] text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={cancelInlineCreate}>Cancel</Button>
                          <Button size="sm" onClick={() => handleInlineCreate('')} disabled={!inlineTaskData.title.trim() || isCreating} className="bg-emerald-600 hover:bg-emerald-700">
                            Add Task
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setInlineTaskGroupId('ungrouped')}
                        className="flex items-center gap-2 text-sm text-[#0069AF] hover:text-[#133F5C] py-2 pl-1 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add a task
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            )}
          </div>

          {filteredTasks.length === 0 && taskGroups.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No tasks yet</p>
              <p className="text-sm">Add your first task above</p>
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
        teamMembers={teamMembers}
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
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        teamMembers={teamMembers}
        currentUser={currentUser}
        onEdit={(task) => { setSelectedTask(null); setEditingTask(task); setShowTaskModal(true); }}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, type: null, item: null })}>
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
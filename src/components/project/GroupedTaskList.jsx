import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, CheckCircle2, Circle, Clock, ArrowUpCircle, User, AlertTriangle, MoreHorizontal, UserPlus, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { sendTaskAssignmentNotification } from '@/utils/notifications';

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

const groupColors = {
  slate: 'bg-slate-500',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500'
};

const getDueDateInfo = (dueDate, status) => {
  if (!dueDate || status === 'completed') return null;
  const date = parseLocalDate(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isPast(date) && !isToday(date)) return { label: 'Overdue', color: 'bg-red-500 text-white', urgent: true };
  if (isToday(date)) return { label: 'Due Today', color: 'bg-orange-500 text-white', urgent: true };
  if (isTomorrow(date)) return { label: 'Tomorrow', color: 'bg-amber-500 text-white', urgent: true };
  const days = differenceInDays(date, today);
  if (days <= 7) return { label: `${days} days`, color: 'bg-blue-100 text-blue-700', urgent: false };
  return { label: format(date, 'MMM d'), color: 'bg-slate-100 text-slate-600', urgent: false };
};

const TaskItem = ({ task, teamMembers = [], onStatusChange, onEdit, onDelete, onTaskClick, onTaskUpdate, currentUser, projectName, onDragStart, onDragEnd, isDragging }) => {
  const [dateOpen, setDateOpen] = useState(false);
  const status = statusConfig[task.status] || statusConfig.todo;
  const StatusIcon = status.icon;
  const dueDateInfo = getDueDateInfo(task.due_date, task.status);

  const handleAssign = async (email) => {
    const member = teamMembers.find(m => m.email === email);
    const wasAssigned = task.assigned_to;
    await base44.entities.Task.update(task.id, {
      assigned_to: email,
      assigned_name: member?.name || email
    });

    if (email !== wasAssigned) {
      await sendTaskAssignmentNotification({
        assigneeEmail: email,
        taskTitle: task.title,
        projectId: task.project_id,
        projectName,
        currentUser,
      });
    }

    onTaskUpdate?.();
  };

  const handleUnassign = async () => {
    await base44.entities.Task.update(task.id, {
      assigned_to: '',
      assigned_name: ''
    });
    onTaskUpdate?.();
  };

  const handleDateChange = async (date) => {
    await base44.entities.Task.update(task.id, {
      due_date: date ? format(date, 'yyyy-MM-dd') : ''
    });
    setDateOpen(false);
    onTaskUpdate?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0, scale: isDragging ? 0.95 : 1 }}
      exit={{ opacity: 0, x: -10 }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(task);
      }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        "group bg-white rounded-lg border p-2.5 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing",
        task.status === 'completed' ? "opacity-60 border-slate-100" :
        dueDateInfo?.urgent ? "border-red-200 bg-red-50/30" : "border-slate-100",
        isDragging && "ring-2 ring-[#0069AF] shadow-lg"
      )}
      onClick={() => onTaskClick?.(task)}
    >
      <div className="flex items-center gap-2">
        {/* Status Toggle - Click to complete */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(task, task.status === 'completed' ? 'todo' : 'completed');
          }}
          className={cn("p-1 rounded transition-all shrink-0 hover:scale-110", status.bg, "hover:bg-emerald-100")}
          title={task.status === 'completed' ? "Mark as todo" : "Mark as completed"}
        >
          <StatusIcon className={cn("w-3.5 h-3.5", status.color)} />
        </button>

        <span className={cn(
          "flex-1 text-sm font-medium truncate",
          task.status === 'completed' && "line-through text-slate-500"
        )}>
          {task.title}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Due Date Picker */}
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
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="single"
                selected={task.due_date ? parseLocalDate(task.due_date) : undefined}
                onSelect={(date) => handleDateChange(date)}
                initialFocus
              />
              {task.due_date && (
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full text-red-600" onClick={() => handleDateChange(null)}>
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
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium hover:ring-2 hover:ring-offset-1 hover:ring-indigo-300 transition-all",
                    getColorForEmail(task.assigned_to)
                  )} 
                  title={task.assigned_name}
                >
                  {getInitials(task.assigned_name)}
                </button>
              ) : (
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all" 
                  title="Assign"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {task.assigned_to && (
                <DropdownMenuItem onClick={() => handleUnassign()} className="text-slate-500">
                  <User className="w-4 h-4 mr-2" />
                  Unassign
                </DropdownMenuItem>
              )}
              {teamMembers.map((member) => (
                <DropdownMenuItem key={member.id} onClick={() => handleAssign(member.email)}>
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>
                    {getInitials(member.name)}
                  </div>
                  {member.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit2 className="w-4 h-4 mr-2" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
};

export default function GroupedTaskList({
  tasks = [],
  groups = [],
  teamMembers = [],
  onStatusChange,
  onEdit,
  onDelete,
  onTaskClick,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onTaskUpdate,
  onAddTaskToGroup,
  currentUserEmail,
  currentUser,
  projectName,
}) {
  const [expandedGroups, setExpandedGroups] = useState(new Set(['ungrouped', ...groups.map(g => g.id)]));
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('slate');
  const [viewFilter, setViewFilter] = useState('all');
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);

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
    if (viewFilter === 'my_tasks') return task.assigned_to === currentUserEmail;
    if (viewFilter === 'my_due') return task.assigned_to === currentUserEmail && task.due_date;
    return true;
  });

  const ungroupedTasks = filteredTasks.filter(t => !t.group_id);
  const getTasksForGroup = (groupId) => filteredTasks.filter(t => t.group_id === groupId);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    onCreateGroup({ name: newGroupName, color: newGroupColor });
    setNewGroupName('');
  };

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverGroup(null);
  };

  const handleDropOnGroup = async (groupId) => {
    if (!draggedTask) return;
    const targetGroupId = groupId === 'ungrouped' ? '' : groupId;
    if (draggedTask.group_id === targetGroupId || (!draggedTask.group_id && groupId === 'ungrouped')) {
      setDraggedTask(null);
      setDragOverGroup(null);
      return;
    }
    await base44.entities.Task.update(draggedTask.id, { group_id: targetGroupId });
    onTaskUpdate?.();
    setDraggedTask(null);
    setDragOverGroup(null);
  };

  return (
    <div className="space-y-3">
      {/* Filter Tabs */}
      {currentUserEmail && (
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {[['all', 'All'], ['my_tasks', 'Mine'], ['my_due', 'Due']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setViewFilter(key)}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all",
                viewFilter === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Groups */}
      {groups.map((group) => {
        const groupTasks = getTasksForGroup(group.id);
        const completedCount = groupTasks.filter(t => t.status === 'completed').length;
        const isExpanded = expandedGroups.has(group.id);

        return (
          <div key={group.id} className="rounded-xl overflow-hidden">
            <div
              className={cn(
                "flex items-center gap-3 p-3 cursor-pointer transition-all rounded-t-xl",
                dragOverGroup === group.id ? "bg-[#0069AF]/10 ring-2 ring-[#0069AF] ring-inset" : "hover:bg-slate-50"
              )}
              onClick={() => toggleGroup(group.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverGroup(group.id); }}
              onDragLeave={() => setDragOverGroup(null)}
              onDrop={(e) => { e.preventDefault(); handleDropOnGroup(group.id); }}
            >
              <div className={cn("w-4 h-4 rounded-full", groupColors[group.color] || groupColors.slate)} />
              <span className="font-medium text-slate-900">{group.name}</span>
              <span className="text-xs text-slate-400">{completedCount}/{groupTasks.length}</span>
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditGroup(group); }}>
                    <Edit2 className="w-4 h-4 mr-2" />Edit Group
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteGroup(group); }} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1.5 pl-4"
                  onDragOver={(e) => { e.preventDefault(); setDragOverGroup(group.id); }}
                  onDrop={(e) => { e.preventDefault(); handleDropOnGroup(group.id); }}
                >
                  {groupTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      teamMembers={teamMembers}
                      onStatusChange={onStatusChange}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onTaskClick={onTaskClick}
                      onTaskUpdate={onTaskUpdate}
                      currentUser={currentUser}
                      projectName={projectName}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedTask?.id === task.id}
                    />
                  ))}
                  {/* Add task button inside group */}
                  <button
                    onClick={() => onAddTaskToGroup?.(group.id)}
                    className="flex items-center gap-2 text-sm text-[#0069AF] hover:text-[#133F5C] py-2 pl-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add a task
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Ungrouped Tasks */}
      {ungroupedTasks.length > 0 && (
        <div className="rounded-xl overflow-hidden">
          <div
            className={cn(
              "flex items-center gap-3 p-3 cursor-pointer transition-all rounded-t-xl",
              dragOverGroup === 'ungrouped' ? "bg-[#0069AF]/10 ring-2 ring-[#0069AF] ring-inset" : "hover:bg-slate-50"
            )}
            onClick={() => toggleGroup('ungrouped')}
            onDragOver={(e) => { e.preventDefault(); setDragOverGroup('ungrouped'); }}
            onDragLeave={() => setDragOverGroup(null)}
            onDrop={(e) => { e.preventDefault(); handleDropOnGroup('ungrouped'); }}
          >
            <div className="w-4 h-4 rounded-full bg-slate-300" />
            <span className="font-medium text-slate-500">Ungrouped</span>
            <span className="text-xs text-slate-400">{ungroupedTasks.filter(t => t.status === 'completed').length}/{ungroupedTasks.length}</span>
          </div>
          <AnimatePresence>
            {expandedGroups.has('ungrouped') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-1.5 pl-4"
                onDragOver={(e) => { e.preventDefault(); setDragOverGroup('ungrouped'); }}
                onDrop={(e) => { e.preventDefault(); handleDropOnGroup('ungrouped'); }}
              >
                {ungroupedTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    teamMembers={teamMembers}
                    onStatusChange={onStatusChange}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTaskClick={onTaskClick}
                    onTaskUpdate={onTaskUpdate}
                    currentUser={currentUser}
                    projectName={projectName}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedTask?.id === task.id}
                  />
                ))}
                {/* Add task button */}
                <button
                  onClick={() => onAddTaskToGroup?.(null)}
                  className="flex items-center gap-2 text-sm text-[#0069AF] hover:text-[#133F5C] py-2 pl-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add a task
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* New Group Button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            New Group
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500">Group Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Phase 1, Network Setup"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Color</Label>
              <div className="flex gap-2 mt-2">
                {Object.keys(groupColors).map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewGroupColor(color)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all hover:scale-110",
                      groupColors[color],
                      newGroupColor === color ? "ring-2 ring-offset-2 ring-[#0069AF]" : ""
                    )}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleCreateGroup} size="sm" className="w-full bg-[#0069AF] hover:bg-[#133F5C]">
              Create Group
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {filteredTasks.length === 0 && groups.length === 0 && (
        <div className="text-center py-6 text-slate-500">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No tasks yet</p>
        </div>
      )}
    </div>
  );
}
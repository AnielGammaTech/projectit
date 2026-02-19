import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ChevronLeft, Calendar as CalendarIcon, UserPlus, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import GroupedTaskList from '@/components/project/GroupedTaskList';
import { sendTaskAssignmentNotification } from '@/utils/notifications';
import TaskDetailView from '@/components/project/TaskDetailView';

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

export default function TasksViewModal({
  open,
  onClose,
  tasks,
  groups,
  projectId,
  projectName,
  teamMembers = [],
  currentUser,
  onStatusChange,
  onEdit,
  onDelete,
  onTaskClick,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onAddTask,
  onTasksRefresh,
  currentUserEmail
}) {
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState(null);
  const [quickTaskAssignee, setQuickTaskAssignee] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  const handleTaskClick = (task) => {
    setSelectedTaskId(task.id);
  };

  const handleBack = () => {
    setSelectedTaskId(null);
  };

  const handleQuickCreate = async (e) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || isCreating) return;

    setIsCreating(true);
    const taskTitle = quickTaskTitle.trim();
    const assigneeEmail = quickTaskAssignee?.email || '';
    await base44.entities.Task.create({
      title: taskTitle,
      project_id: projectId,
      status: 'todo',
      priority: 'medium',
      due_date: quickTaskDueDate ? format(quickTaskDueDate, 'yyyy-MM-dd') : '',
      assigned_to: assigneeEmail,
      assigned_name: quickTaskAssignee?.name || ''
    });

    if (assigneeEmail) {
      await sendTaskAssignmentNotification({
        assigneeEmail,
        taskTitle,
        projectId,
        projectName,
        currentUser,
      });
    }

    setQuickTaskTitle('');
    setQuickTaskDueDate(null);
    setQuickTaskAssignee(null);
    setIsCreating(false);
    onTasksRefresh?.();
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  };

  // Task detail view
  if (selectedTask) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              Task Details
            </DialogTitle>
          </DialogHeader>
          <TaskDetailView
            task={selectedTask}
            teamMembers={teamMembers}
            currentUser={currentUser}
            onStatusChange={(status) => { onStatusChange(selectedTask, status); }}
            onPriorityChange={async (priority) => {
              await base44.entities.Task.update(selectedTask.id, { ...selectedTask, priority });
            }}
            onAssigneeChange={async (email, name) => {
              const wasAssigned = selectedTask.assigned_to;
              await base44.entities.Task.update(selectedTask.id, { ...selectedTask, assigned_to: email, assigned_name: name });
              if (email && email !== wasAssigned) {
                await sendTaskAssignmentNotification({
                  assigneeEmail: email,
                  taskTitle: selectedTask.title,
                  projectId,
                  projectName,
                  currentUser,
                });
              }
            }}
            onEdit={() => { onEdit(selectedTask); }}
            onDelete={() => { onDelete(selectedTask); setSelectedTaskId(null); }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Tasks</span>
            <span className="text-sm font-normal text-slate-500">{completedTasks}/{tasks.length} completed</span>
          </DialogTitle>
        </DialogHeader>
        
        {/* Quick Add Task */}
        <form onSubmit={handleQuickCreate} className="pb-3 border-b space-y-2">
          <div className="flex gap-2">
            <Input
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder="Type a task and press Enter..."
              className="flex-1"
              disabled={isCreating}
            />
            <Button type="submit" disabled={!quickTaskTitle.trim() || isCreating} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            {/* Due Date */}
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", quickTaskDueDate && "text-indigo-600")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {quickTaskDueDate ? format(quickTaskDueDate, 'MMM d') : 'Due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={quickTaskDueDate}
                  onSelect={(date) => { setQuickTaskDueDate(date); setDatePickerOpen(false); }}
                  initialFocus
                />
                {quickTaskDueDate && (
                  <div className="p-2 border-t">
                    <Button type="button" variant="ghost" size="sm" className="w-full text-red-600" onClick={() => { setQuickTaskDueDate(null); setDatePickerOpen(false); }}>
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Assignee */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {quickTaskAssignee ? (
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px]", getColorForEmail(quickTaskAssignee.email))}>
                      {getInitials(quickTaskAssignee.name)}
                    </div>
                    {quickTaskAssignee.name.split(' ')[0]}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    Assign
                  </Button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {quickTaskAssignee && (
                  <DropdownMenuItem onClick={() => setQuickTaskAssignee(null)} className="text-slate-500">
                    <User className="w-4 h-4 mr-2" />
                    Unassign
                  </DropdownMenuItem>
                )}
                {teamMembers.map((member) => (
                  <DropdownMenuItem key={member.id} onClick={() => setQuickTaskAssignee(member)}>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>
                      {getInitials(member.name)}
                    </div>
                    {member.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 pt-3">
          <GroupedTaskList
            tasks={tasks}
            groups={groups}
            teamMembers={teamMembers}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onTaskClick={handleTaskClick}
            onCreateGroup={onCreateGroup}
            onEditGroup={onEditGroup}
            onDeleteGroup={onDeleteGroup}
            onTaskUpdate={onTasksRefresh}
            currentUserEmail={currentUserEmail}
            currentUser={currentUser}
            projectName={projectName}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import GroupedTaskList from '@/components/project/GroupedTaskList';
import TaskDetailView from '@/components/project/TaskDetailView';

export default function TasksViewModal({ 
  open, 
  onClose, 
  tasks, 
  groups, 
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
  currentUserEmail 
}) {
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  const handleTaskClick = (task) => {
    setSelectedTaskId(task.id);
  };

  const handleBack = () => {
    setSelectedTaskId(null);
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
              await base44.entities.Task.update(selectedTask.id, { ...selectedTask, assigned_to: email, assigned_name: name });
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
            <div className="flex items-center gap-3">
              <span className="text-sm font-normal text-slate-500">{completedTasks}/{tasks.length} completed</span>
              <Button size="sm" onClick={onAddTask} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <GroupedTaskList
            tasks={tasks}
            groups={groups}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onTaskClick={handleTaskClick}
            onCreateGroup={onCreateGroup}
            onEditGroup={onEditGroup}
            onDeleteGroup={onDeleteGroup}
            currentUserEmail={currentUserEmail}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
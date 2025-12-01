import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import GroupedTaskList from '@/components/project/GroupedTaskList';

export default function TasksViewModal({ 
  open, 
  onClose, 
  tasks, 
  groups, 
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
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

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
            onTaskClick={onTaskClick}
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
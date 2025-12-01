import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  currentUserEmail 
}) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Tasks</span>
            <span className="text-sm font-normal text-slate-500">{completedTasks}/{tasks.length} completed</span>
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusConfig = {
  todo: { label: 'To Do', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  review: { label: 'Review', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' }
};

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700'
};

export default function TaskDetailView({ 
  task, 
  teamMembers = [], 
  currentUser, 
  onStatusChange, 
  onEdit, 
  onDelete 
}) {
  if (!task) return null;

  const status = statusConfig[task.status] || statusConfig.todo;

  return (
    <div className="space-y-4 mt-2 flex-1 overflow-y-auto">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{task.title}</h2>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Badge className={cn("cursor-pointer text-sm", status.color)}>
              {status.label}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => onStatusChange(key)}>
                <Badge className={cn("mr-2", config.color)}>{config.label}</Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Badge className={priorityColors[task.priority]}>
          {task.priority} priority
        </Badge>
      </div>

      {task.description && (
        <div>
          <span className="text-sm text-slate-500">Description</span>
          <p className="text-slate-700 mt-1">{task.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        {task.assigned_name && (
          <div>
            <span className="text-slate-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              Assigned to
            </span>
            <p className="font-medium mt-1">{task.assigned_name}</p>
          </div>
        )}
        {task.due_date && (
          <div>
            <span className="text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Due Date
            </span>
            <p className="font-medium mt-1">{format(new Date(task.due_date), 'MMM d, yyyy')}</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t flex justify-between">
        <Button variant="outline" onClick={onEdit}>
          <Edit2 className="w-4 h-4 mr-2" />Edit
        </Button>
        <Button variant="outline" onClick={onDelete} className="text-red-600 hover:text-red-700">
          <Trash2 className="w-4 h-4 mr-2" />Delete
        </Button>
      </div>
    </div>
  );
}
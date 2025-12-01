import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, User, Calendar, MoreHorizontal, Trash2, Edit2, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

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

const getDueDateInfo = (dueDate, status) => {
  if (!dueDate || status === 'completed') return null;
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isPast(date) && !isToday(date)) {
    return { label: 'Overdue', color: 'bg-red-500 text-white', urgent: true };
  }
  if (isToday(date)) {
    return { label: 'Due Today', color: 'bg-orange-500 text-white', urgent: true };
  }
  if (isTomorrow(date)) {
    return { label: 'Tomorrow', color: 'bg-amber-500 text-white', urgent: true };
  }
  const days = differenceInDays(date, today);
  if (days <= 7) {
    return { label: `${days} days`, color: 'bg-blue-100 text-blue-700', urgent: false };
  }
  return { label: format(date, 'MMM d'), color: 'bg-slate-100 text-slate-600', urgent: false };
};

const TaskItem = ({ task, onStatusChange, onEdit, onDelete }) => {
  const status = statusConfig[task.status] || statusConfig.todo;
  const StatusIcon = status.icon;
  const dueDateInfo = getDueDateInfo(task.due_date, task.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "group bg-white rounded-xl border p-3 hover:shadow-md transition-all",
        task.status === 'completed' ? "opacity-60 border-slate-100" : 
        dueDateInfo?.urgent ? "border-red-200 bg-red-50/30" : "border-slate-100 hover:border-slate-200"
      )}
    >
      <div className="flex items-start gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("p-1 rounded-lg transition-colors shrink-0", status.bg)}>
              <StatusIcon className={cn("w-4 h-4", status.color)} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {Object.entries(statusConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <DropdownMenuItem key={key} onClick={() => onStatusChange(task, key)}>
                  <Icon className={cn("w-4 h-4 mr-2", config.color)} />
                  {config.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "font-medium text-sm text-slate-900",
              task.status === 'completed' && "line-through text-slate-500"
            )}>
              {task.title}
            </h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {dueDateInfo && (
              <Badge className={cn("text-xs font-medium", dueDateInfo.color)}>
                {dueDateInfo.urgent && <AlertTriangle className="w-3 h-3 mr-1" />}
                {dueDateInfo.label}
              </Badge>
            )}
            
            <Badge variant="outline" className={cn("text-xs", priorityColors[task.priority])}>
              {task.priority}
            </Badge>

            {task.assigned_name && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assigned_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function TaskList({ tasks = [], onStatusChange, onEdit, onDelete }) {
  // Group tasks by status
  const groupedTasks = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review: tasks.filter(t => t.status === 'review'),
    completed: tasks.filter(t => t.status === 'completed')
  };

  // Sort each group by due date (urgent first)
  Object.keys(groupedTasks).forEach(key => {
    groupedTasks[key].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  });

  const activeGroups = ['todo', 'in_progress', 'review'].filter(key => groupedTasks[key].length > 0);
  const hasCompleted = groupedTasks.completed.length > 0;

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <p className="text-sm">No tasks yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeGroups.map(statusKey => {
        const config = statusConfig[statusKey];
        const StatusIcon = config.icon;
        const taskGroup = groupedTasks[statusKey];

        return (
          <div key={statusKey} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={cn("w-4 h-4", config.color)} />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {config.label}
              </span>
              <span className="text-xs text-slate-400">({taskGroup.length})</span>
            </div>
            <AnimatePresence>
              {taskGroup.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        );
      })}

      {hasCompleted && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Completed
            </span>
            <span className="text-xs text-slate-400">({groupedTasks.completed.length})</span>
          </div>
          <AnimatePresence>
            {groupedTasks.completed.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
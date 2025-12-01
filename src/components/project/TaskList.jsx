import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, User, Calendar, MoreHorizontal, Trash2, Edit2, ArrowUpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig = {
  todo: { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100' },
  in_progress: { icon: ArrowUpCircle, color: 'text-blue-500', bg: 'bg-blue-100' },
  review: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' }
};

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700'
};

export default function TaskList({ tasks = [], onStatusChange, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {tasks.map((task, idx) => {
          const status = statusConfig[task.status] || statusConfig.todo;
          const StatusIcon = status.icon;

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                "group bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all",
                task.status === 'completed' && "opacity-60"
              )}
            >
              <div className="flex items-start gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn("p-1 rounded-lg transition-colors", status.bg)}>
                      <StatusIcon className={cn("w-5 h-5", status.color)} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {Object.entries(statusConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <DropdownMenuItem
                          key={key}
                          onClick={() => onStatusChange(task, key)}
                        >
                          <Icon className={cn("w-4 h-4 mr-2", config.color)} />
                          {key.replace('_', ' ')}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={cn(
                      "font-medium text-slate-900",
                      task.status === 'completed' && "line-through text-slate-500"
                    )}>
                      {task.title}
                    </h4>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
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

                  {task.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <Badge variant="outline" className={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>

                    {task.assigned_name && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <User className="w-3.5 h-3.5" />
                        <span>{task.assigned_name}</span>
                      </div>
                    )}

                    {task.due_date && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{format(new Date(task.due_date), 'MMM d')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {tasks.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No tasks yet. Create your first task!</p>
        </div>
      )}
    </div>
  );
}
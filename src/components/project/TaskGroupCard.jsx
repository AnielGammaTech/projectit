import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, User, MoreHorizontal, Edit2, Trash2, Flag } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';

const groupColors = {
  slate:   { accent: 'from-slate-500 to-slate-400',   light: 'bg-slate-50',   border: 'border-slate-200', text: 'text-slate-600', progress: 'bg-slate-400' },
  red:     { accent: 'from-red-500 to-rose-400',      light: 'bg-red-50',     border: 'border-red-200',   text: 'text-red-600',   progress: 'bg-gradient-to-r from-red-500 to-rose-400' },
  amber:   { accent: 'from-amber-500 to-orange-400',  light: 'bg-amber-50',   border: 'border-amber-200', text: 'text-amber-600', progress: 'bg-gradient-to-r from-amber-500 to-orange-400' },
  emerald: { accent: 'from-emerald-500 to-teal-400',  light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', progress: 'bg-gradient-to-r from-emerald-500 to-teal-400' },
  blue:    { accent: 'from-blue-500 to-indigo-400',   light: 'bg-blue-50',    border: 'border-blue-200',  text: 'text-blue-600',  progress: 'bg-gradient-to-r from-blue-500 to-indigo-400' },
  violet:  { accent: 'from-violet-500 to-purple-400', light: 'bg-violet-50',  border: 'border-violet-200', text: 'text-violet-600', progress: 'bg-gradient-to-r from-violet-500 to-purple-400' },
  pink:    { accent: 'from-pink-500 to-rose-400',     light: 'bg-pink-50',    border: 'border-pink-200',  text: 'text-pink-600',  progress: 'bg-gradient-to-r from-pink-500 to-rose-400' }
};

const statusMiniPill = {
  todo: { label: 'To Do', classes: 'bg-slate-100 text-slate-500' },
  in_progress: { label: 'Active', classes: 'bg-blue-100 text-blue-600' },
  review: { label: 'Review', classes: 'bg-amber-100 text-amber-600' },
  completed: { label: 'Done', classes: 'bg-emerald-100 text-emerald-600' },
};

export default function TaskGroupCard({ group, tasks = [], onEditGroup, onDeleteGroup, onTaskClick, onTaskStatusChange }) {
  const colorConfig = groupColors[group?.color] || groupColors.slate;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#1e2a3a] rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-700/50 min-w-[300px] max-w-[340px] flex-shrink-0 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Gradient accent bar */}
      <div className={cn("h-1.5 bg-gradient-to-r", colorConfig.accent)} />

      {/* Header */}
      <div className="p-3.5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{group?.name || 'Ungrouped'}</h3>
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-medium">
              {completedCount}/{totalCount}
            </span>
          </div>
          {onEditGroup && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditGroup?.(group)}>
                  <Edit2 className="w-4 h-4 mr-2" />Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDeleteGroup?.(group)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="px-2 max-h-[400px] overflow-y-auto">
        {tasks.map((task) => {
          const status = statusMiniPill[task.status] || statusMiniPill.todo;
          const isCompleted = task.status === 'completed';

          return (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className={cn(
                "flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all group mb-0.5",
                isCompleted ? "opacity-50" : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
              )}
            >
              {/* Round checkbox */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskStatusChange?.(task, isCompleted ? 'todo' : 'completed');
                }}
                whileTap={{ scale: 0.85 }}
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5",
                  isCompleted
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-300 group-hover:border-emerald-400"
                )}
              >
                <AnimatePresence>
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-3 h-3" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm text-slate-800 dark:text-slate-200 leading-tight",
                  isCompleted && "line-through text-slate-400 dark:text-slate-500"
                )}>
                  {task.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {/* Mini status pill */}
                  {!isCompleted && task.status !== 'todo' && (
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md", status.classes)}>
                      {status.label}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded-md">
                      <Clock className="w-3 h-3" />
                      {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {task.priority === 'high' && (
                    <Flag className="w-3 h-3 text-red-500" />
                  )}
                  {task.assigned_name && (
                    <UserAvatar
                      email={task.assigned_to}
                      name={task.assigned_name}
                      size="xs"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="text-center py-6 px-2">
            <p className="text-sm text-slate-400">No tasks yet</p>
          </div>
        )}
      </div>

      {/* Progress Footer */}
      {totalCount > 0 && (
        <div className="px-3.5 pb-3 pt-2 mt-1 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className={cn("h-1.5 rounded-full", colorConfig.progress)}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-400 tabular-nums">
              {progressPercent}%
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
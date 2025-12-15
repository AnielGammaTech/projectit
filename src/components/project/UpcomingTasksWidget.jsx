import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ListTodo, ChevronRight, ChevronLeft, CheckCircle2, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

export default function UpcomingTasksWidget({ projectId, tasks = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get upcoming/overdue tasks (not completed/archived)
  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed' && t.status !== 'archived')
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    })
    .slice(0, 5);

  const currentTask = upcomingTasks[currentIndex];

  const nextTask = (e) => {
    if (e) e.preventDefault();
    setCurrentIndex((prev) => (prev + 1) % upcomingTasks.length);
  };

  const prevTask = (e) => {
    if (e) e.preventDefault();
    setCurrentIndex((prev) => (prev - 1 + upcomingTasks.length) % upcomingTasks.length);
  };

  const getDueDateLabel = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isPast(d) && !isToday(d)) return { label: 'Overdue', className: 'text-red-600 font-medium' };
    if (isToday(d)) return { label: 'Today', className: 'text-amber-600 font-medium' };
    if (isTomorrow(d)) return { label: 'Tomorrow', className: 'text-blue-600' };
    return { label: format(d, 'MMM d'), className: 'text-slate-500' };
  };

  if (upcomingTasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-3 w-full h-full flex items-center justify-center min-h-[100px]">
        <div className="text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 mx-auto mb-1" />
          <p className="text-[10px] text-slate-500">All caught up!</p>
        </div>
      </div>
    );
  }

  const dueInfo = currentTask ? getDueDateLabel(currentTask.due_date) : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 w-full h-full flex flex-col justify-center min-h-[100px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="font-semibold text-slate-900 text-xs">Upcoming ({currentIndex + 1}/{upcomingTasks.length})</h3>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={prevTask}
            disabled={upcomingTasks.length <= 1}
            className="p-1 hover:bg-slate-100 rounded-md disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3 h-3 text-slate-500" />
          </button>
          <button 
            onClick={nextTask}
            disabled={upcomingTasks.length <= 1}
            className="p-1 hover:bg-slate-100 rounded-md disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      </div>
      
      <Link 
        to={createPageUrl('ProjectTasks') + `?id=${projectId}&taskId=${currentTask.id}`}
        className="block group"
      >
        <div className="flex items-start gap-2">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
            currentTask.priority === 'high' ? "bg-red-500" :
            currentTask.priority === 'low' ? "bg-blue-500" : "bg-amber-500"
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
              {currentTask.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {dueInfo && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className={cn("text-[10px]", dueInfo.className)}>
                    {dueInfo.label}
                  </span>
                </div>
              )}
              {currentTask.assigned_name && (
                <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                  • {currentTask.assigned_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
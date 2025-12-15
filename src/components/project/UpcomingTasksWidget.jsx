import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ListTodo, ChevronRight, CheckCircle2 } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

export default function UpcomingTasksWidget({ projectId, tasks = [] }) {
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

  const getDueDateLabel = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isPast(d) && !isToday(d)) return { label: 'Overdue', className: 'text-red-600 font-medium' };
    if (isToday(d)) return { label: 'Today', className: 'text-amber-600 font-medium' };
    if (isTomorrow(d)) return { label: 'Tomorrow', className: 'text-blue-600' };
    return { label: format(d, 'MMM d'), className: 'text-slate-500' };
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 w-full max-w-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Upcoming Tasks</h3>
        </div>
        <Link 
          to={createPageUrl('ProjectTasks') + `?id=${projectId}`}
          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      
      {upcomingTasks.length > 0 ? (
        <div className="space-y-2">
          {upcomingTasks.map(task => {
            const dueInfo = getDueDateLabel(task.due_date);
            return (
              <Link 
                key={task.id}
                to={createPageUrl('ProjectTasks') + `?id=${projectId}&taskId=${task.id}`}
                className="block p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                    task.priority === 'high' ? "bg-red-500" :
                    task.priority === 'low' ? "bg-blue-500" : "bg-amber-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {dueInfo && (
                        <span className={cn("text-[10px]", dueInfo.className)}>
                          {dueInfo.label}
                        </span>
                      )}
                      {task.assigned_name && (
                        <span className="text-[10px] text-slate-400">• {task.assigned_name}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 mt-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">All caught up!</p>
        </div>
      )}
    </div>
  );
}
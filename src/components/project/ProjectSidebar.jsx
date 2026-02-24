import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  ListTodo,
  Package,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  Users,
  TrendingUp,
  AlertTriangle,
  Zap,
  FileText,
  MessageSquare,
  ArrowUpRight,
  CircleDot,
  Timer
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';

const priorityColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200'
};

const partStatusColors = {
  needed: 'bg-slate-100 text-slate-700',
  ordered: 'bg-blue-100 text-blue-700',
  received: 'bg-emerald-100 text-emerald-700',
  ready_to_install: 'bg-amber-100 text-amber-700'
};

export default function ProjectSidebar({ projectId, tasks = [], parts = [], projectMembers = [], project, progressUpdates = [] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get dates with tasks/parts for calendar highlighting
  const taskDates = tasks
    .filter(t => t.due_date && t.status !== 'completed' && t.status !== 'archived')
    .map(t => new Date(t.due_date));

  const partDates = parts
    .filter(p => p.est_delivery_date && p.status !== 'installed')
    .map(p => new Date(p.est_delivery_date));

  // ── Stats calculations ──
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = activeTasks.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return isPast(d) && !isToday(d);
  });
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const taskCompletion = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const activeParts = parts.filter(p => p.status !== 'installed');
  const installedParts = parts.filter(p => p.status === 'installed');
  const overdueParts = activeParts.filter(p => {
    if (!p.est_delivery_date) return false;
    const d = new Date(p.est_delivery_date);
    return isPast(d) && !isToday(d);
  });
  const partCompletion = parts.length > 0 ? Math.round((installedParts.length / parts.length) * 100) : 0;

  // ── Recent updates ──
  const recentUpdates = [...(progressUpdates || [])]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 4);

  return (
    <div className="space-y-3">
      {/* Mini Calendar */}
      <div className="bg-white dark:bg-[#1e2a3a] rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Calendar</h3>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border-0 p-0"
          classNames={{
            months: "flex flex-col",
            month: "space-y-2",
            caption: "flex justify-center pt-1 relative items-center text-xs",
            caption_label: "text-xs font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell: "text-slate-500 rounded-md w-7 font-normal text-[10px]",
            row: "flex w-full mt-1",
            cell: "h-7 w-7 text-center text-xs p-0 relative",
            day: "h-7 w-7 p-0 font-normal text-[11px] hover:bg-slate-100 rounded-full",
            day_selected: "bg-indigo-600 text-white hover:bg-indigo-600",
            day_today: "bg-slate-100 font-semibold",
            day_outside: "text-slate-300",
          }}
          modifiers={{
            hasTask: taskDates,
            hasPart: partDates,
          }}
          modifiersStyles={{
            hasTask: {
              backgroundColor: '#fef3c7',
              borderRadius: '9999px'
            },
            hasPart: {
              border: '2px solid #6366f1',
              borderRadius: '9999px'
            },
          }}
        />
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-100" />
            <span>Task due</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-indigo-500" />
            <span>Part delivery</span>
          </div>
        </div>
      </div>

      {/* Project Health */}
      <div className="bg-white dark:bg-[#1e2a3a] rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Project Health</h3>
        </div>

        {/* Task progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 font-medium">Tasks</span>
            <span className="text-[11px] font-bold text-slate-600">{completedTasks.length}/{tasks.length}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn("h-2 rounded-full transition-all duration-500", taskCompletion === 100 ? "bg-emerald-500" : "bg-blue-500")}
              style={{ width: `${taskCompletion}%` }}
            />
          </div>
        </div>

        {/* Parts progress bar */}
        {parts.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-500 font-medium">Parts</span>
              <span className="text-[11px] font-bold text-slate-600">{installedParts.length}/{parts.length}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-2 rounded-full transition-all duration-500", partCompletion === 100 ? "bg-emerald-500" : "bg-teal-500")}
                style={{ width: `${partCompletion}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick stat pills */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className={cn("flex items-center gap-1.5 px-2.5 py-2 rounded-lg border", inProgressTasks.length > 0 ? "bg-blue-50/80 border-blue-100" : "bg-slate-50 border-slate-100")}>
            <Zap className={cn("w-3.5 h-3.5", inProgressTasks.length > 0 ? "text-blue-500" : "text-slate-400")} />
            <div>
              <div className="text-sm font-bold text-slate-800 leading-none">{inProgressTasks.length}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">In Progress</div>
            </div>
          </div>
          <div className={cn("flex items-center gap-1.5 px-2.5 py-2 rounded-lg border", overdueTasks.length > 0 ? "bg-red-50/80 border-red-100" : "bg-slate-50 border-slate-100")}>
            <AlertTriangle className={cn("w-3.5 h-3.5", overdueTasks.length > 0 ? "text-red-500" : "text-slate-400")} />
            <div>
              <div className={cn("text-sm font-bold leading-none", overdueTasks.length > 0 ? "text-red-600" : "text-slate-800")}>{overdueTasks.length}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Overdue</div>
            </div>
          </div>
          <div className={cn("flex items-center gap-1.5 px-2.5 py-2 rounded-lg border", activeParts.length > 0 ? "bg-amber-50/80 border-amber-100" : "bg-slate-50 border-slate-100")}>
            <Package className={cn("w-3.5 h-3.5", activeParts.length > 0 ? "text-amber-500" : "text-slate-400")} />
            <div>
              <div className="text-sm font-bold text-slate-800 leading-none">{activeParts.length}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Pending</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-50/80 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <div>
              <div className="text-sm font-bold text-slate-800 leading-none">{completedTasks.length}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Done</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Updates */}
      {recentUpdates.length > 0 && (
        <div className="bg-white dark:bg-[#1e2a3a] rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Recent Updates</h3>
          </div>
          <div className="space-y-2.5">
            {recentUpdates.map((update, idx) => (
              <div key={update.id || idx} className="relative pl-4">
                <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-slate-300" />
                {idx < recentUpdates.length - 1 && <div className="absolute left-[3px] top-3.5 w-0.5 h-full bg-slate-100" />}
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {update.content || update.title || 'Progress update'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-400">{update.created_by_name || 'Team'}</span>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(update.created_date), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

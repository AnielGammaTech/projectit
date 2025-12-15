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
  CheckCircle2
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

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

export default function ProjectSidebar({ projectId, tasks = [], parts = [] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // Get pending parts
  const pendingParts = parts
    .filter(p => p.status !== 'installed')
    .sort((a, b) => {
      if (!a.est_delivery_date && !b.est_delivery_date) return 0;
      if (!a.est_delivery_date) return 1;
      if (!b.est_delivery_date) return -1;
      return new Date(a.est_delivery_date) - new Date(b.est_delivery_date);
    })
    .slice(0, 5);

  // Get dates with tasks/parts for calendar highlighting
  const taskDates = tasks
    .filter(t => t.due_date && t.status !== 'completed' && t.status !== 'archived')
    .map(t => new Date(t.due_date));
  
  const partDates = parts
    .filter(p => p.est_delivery_date && p.status !== 'installed')
    .map(p => new Date(p.est_delivery_date));

  const getDueDateLabel = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isPast(d) && !isToday(d)) return { label: 'Overdue', className: 'text-red-600 font-medium' };
    if (isToday(d)) return { label: 'Today', className: 'text-amber-600 font-medium' };
    if (isTomorrow(d)) return { label: 'Tomorrow', className: 'text-blue-600' };
    return { label: format(d, 'MMM d'), className: 'text-slate-500' };
  };

  return (
    <div className="space-y-3">
      {/* Mini Calendar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Calendar</h3>
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
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
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

      {/* Upcoming Tasks - Moved to Header */}


    </div>
  );
}
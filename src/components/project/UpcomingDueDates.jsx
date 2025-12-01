import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ListTodo, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function UpcomingDueDates({ tasks = [], parts = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week offset (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  // Get items with due dates
  const tasksWithDue = tasks.filter(t => t.due_date && t.status !== 'completed');
  const partsWithDue = parts.filter(p => p.due_date && p.status !== 'installed');

  const getItemsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTasks = tasksWithDue.filter(t => t.due_date === dateStr);
    const dayParts = partsWithDue.filter(p => p.due_date === dateStr);
    return { tasks: dayTasks, parts: dayParts };
  };

  const hasItemsOnDate = (date) => {
    const { tasks, parts } = getItemsForDate(date);
    return tasks.length > 0 || parts.length > 0;
  };

  const isOverdue = (date) => {
    return isBefore(startOfDay(date), startOfDay(new Date()));
  };

  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-pink-100/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500 shadow-lg shadow-rose-200">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Upcoming Due Dates</h3>
            <p className="text-sm text-slate-500">{tasksWithDue.length} tasks · {partsWithDue.length} parts</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h4 className="font-semibold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h4>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
              {day}
            </div>
          ))}
          
          {emptyDays.map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}
          
          {days.map(day => {
            const hasItems = hasItemsOnDate(day);
            const { tasks: dayTasks, parts: dayParts } = getItemsForDate(day);
            const overdue = hasItems && isOverdue(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(hasItems ? day : null)}
                className={cn(
                  "aspect-square rounded-lg text-sm font-medium transition-all relative",
                  isToday(day) && "ring-2 ring-indigo-500 ring-offset-1",
                  isSelected && "bg-indigo-600 text-white",
                  !isSelected && hasItems && !overdue && "bg-blue-50 text-blue-700 hover:bg-blue-100",
                  !isSelected && overdue && "bg-red-50 text-red-700 hover:bg-red-100",
                  !isSelected && !hasItems && "text-slate-600 hover:bg-slate-50",
                  !isSameMonth(day, currentMonth) && "text-slate-300"
                )}
              >
                {format(day, 'd')}
                {hasItems && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayTasks.length > 0 && <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : "bg-indigo-500")} />}
                    {dayParts.length > 0 && <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : "bg-amber-500")} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Items */}
        <AnimatePresence mode="wait">
          {selectedItems && (selectedItems.tasks.length > 0 || selectedItems.parts.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-slate-100 pt-4 space-y-2"
            >
              <h5 className="text-sm font-semibold text-slate-700 mb-3">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h5>
              
              {selectedItems.tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-indigo-50">
                  <ListTodo className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm text-slate-700 flex-1 truncate">{task.title}</span>
                  <Badge variant="outline" className="text-xs">{task.status?.replace('_', ' ')}</Badge>
                </div>
              ))}
              
              {selectedItems.parts.map(part => (
                <div key={part.id} className="flex items-center gap-3 p-2 rounded-lg bg-amber-50">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-slate-700 flex-1 truncate">{part.name}</span>
                  <Badge variant="outline" className="text-xs">{part.status}</Badge>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100 mt-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Tasks</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Parts</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Overdue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
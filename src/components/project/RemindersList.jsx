import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MoreHorizontal, Trash2, Edit2, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

export default function RemindersList({ reminders = [], onToggleComplete, onEdit, onDelete }) {
  const sortedReminders = [...reminders].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return new Date(a.reminder_date) - new Date(b.reminder_date);
  });

  const getDateBadge = (date) => {
    const d = new Date(date);
    if (isToday(d)) return { label: 'Today', color: 'bg-amber-100 text-amber-700' };
    if (isTomorrow(d)) return { label: 'Tomorrow', color: 'bg-blue-100 text-blue-700' };
    if (isPast(d)) return { label: 'Overdue', color: 'bg-red-100 text-red-700' };
    return { label: format(d, 'MMM d'), color: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {sortedReminders.map((reminder, idx) => {
          const dateBadge = getDateBadge(reminder.reminder_date);
          const isOverdue = isPast(new Date(reminder.reminder_date)) && !isToday(new Date(reminder.reminder_date)) && !reminder.is_completed;

          return (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                "group bg-white rounded-xl border p-4 hover:shadow-md transition-all",
                reminder.is_completed ? "opacity-60 border-slate-100" : isOverdue ? "border-red-200 bg-red-50/50" : "border-slate-100 hover:border-slate-200"
              )}
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={reminder.is_completed}
                  onCheckedChange={() => onToggleComplete(reminder)}
                  className="mt-1"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={cn(
                      "font-medium text-slate-900",
                      reminder.is_completed && "line-through text-slate-500"
                    )}>
                      {reminder.title}
                    </h4>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(reminder)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(reminder)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {reminder.description && (
                    <p className="text-sm text-slate-500 mt-1">{reminder.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <Badge variant="outline" className={dateBadge.color}>
                      <Calendar className="w-3 h-3 mr-1" />
                      {dateBadge.label}
                    </Badge>

                    {reminder.reminder_time && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{reminder.reminder_time}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {reminders.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No reminders set. Create your first reminder!</p>
        </div>
      )}
    </div>
  );
}
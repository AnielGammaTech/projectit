import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, addMonths, subMonths, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CheckSquare, Calendar as CalendarIcon, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl, resolveUploadUrl } from '@/utils';
import { CalendarSkeleton } from '@/components/ui/PageSkeletons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

import { getColorForEmail, getInitials } from '@/constants/colors';

export default function MySchedule() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [nextMonth, setNextMonth] = useState(addMonths(new Date(), 1));
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const calendarFeedUrl = useMemo(() => {
    if (!currentUser?.id) return '';
    return `${window.location.origin}/api/calendar-feed/${currentUser.id}.ics`;
  }, [currentUser?.id]);
  const webcalUrl = useMemo(() => {
    if (!calendarFeedUrl) return '';
    return calendarFeedUrl.replace('https://', 'webcal://').replace('http://', 'webcal://');
  }, [calendarFeedUrl]);

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied to clipboard');
  };

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    setNextMonth(addMonths(currentMonth, 1));
  }, [currentMonth]);

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['myScheduleTasks'],
    queryFn: () => api.entities.Task.list('-due_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  // Get active project IDs (exclude archived, deleted, completed)
  const activeProjectIds = projects
    .filter(p => p.status !== 'archived' && p.status !== 'deleted' && p.status !== 'completed')
    .map(p => p.id);

  // Filter tasks for current user with due dates, only from active projects
  const myTasks = tasks.filter(t =>
    activeProjectIds.includes(t.project_id) &&
    t.assigned_to === currentUser?.email &&
    t.due_date &&
    t.status !== 'completed'
  );

  const getProjectInfo = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project || { name: 'Unknown Project', client: '' };
  };

  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      await api.entities.Task.update(task.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['myScheduleTasks'] });
    } catch {
      toast.error('Failed to update task');
    }
  };

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    return myTasks.filter(task => {
      const taskDate = parseISO(task.due_date);
      return isSameDay(taskDate, date);
    });
  };

  // Check if date has tasks
  const hasTasksOnDate = (date) => {
    return getTasksForDate(date).length > 0;
  };

  // Render calendar for a month
  const renderCalendar = (month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="flex-1">
        <div className="grid grid-cols-7 gap-0">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1.5">
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            const hasTasks = hasTasksOnDate(day);
            const isCurrentMonth = isSameMonth(day, month);
            const isTodayDate = isToday(day);

            return (
              <div
                key={idx}
                className={cn(
                  "text-center py-1.5 text-xs relative",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isCurrentMonth && "text-foreground",
                  isTodayDate && "bg-primary text-primary-foreground rounded-md font-semibold"
                )}
              >
                {format(day, 'd')}
                {hasTasks && isCurrentMonth && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Get unique dates with tasks, sorted
  const datesWithTasks = [...new Set(myTasks.map(t => t.due_date))].sort();

  if (loadingTasks) return <CalendarSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-8">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-bold text-foreground">My Schedule</h1>
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                <CalendarIcon className="w-3 h-3" />
                Sync
              </button>
            </PopoverTrigger>
              <PopoverContent className="w-80 rounded-xl p-4" align="end">
                <h3 className="text-sm font-semibold text-foreground mb-1">Add to your calendar</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Subscribe to see your tasks and deadlines in Google Calendar, Outlook, or Apple Calendar.
                </p>

                <a
                  href={webcalUrl}
                  className="flex items-center gap-2 w-full p-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors mb-2 justify-center"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Subscribe in Calendar App
                </a>

                <button
                  onClick={() => handleCopy(calendarFeedUrl)}
                  className="flex items-center gap-2 w-full p-2.5 rounded-lg border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy feed URL'}
                </button>

                <p className="text-[10px] text-muted-foreground mt-2">
                  Works with Google Calendar, Outlook, Apple Calendar, and any app that supports iCal feeds.
                </p>
              </PopoverContent>
            </Popover>
        </div>

        {/* Calendar — 1 month on mobile, 2 on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border shadow-sm p-3 sm:p-4 mb-4 max-w-md"
        >
          {/* Nav arrows */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-semibold text-foreground">{format(currentMonth, 'MMMM yyyy')}</span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div>
            {renderCalendar(currentMonth)}
          </div>
        </motion.div>

        {/* Task List — compact */}
        <div className="space-y-0.5">
          {datesWithTasks.length > 0 ? (
            datesWithTasks.map(date => {
              const dateTasks = getTasksForDate(parseISO(date));
              if (dateTasks.length === 0) return null;
              const isPastDate = parseISO(date) < new Date() && !isToday(parseISO(date));

              return (
                <div key={date}>
                  <div className="px-1 py-1.5">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isPastDate ? "text-red-500" : "text-muted-foreground")}>
                      {format(parseISO(date), 'EEE, MMM d')}
                      {isPastDate && ' · Overdue'}
                      {isToday(parseISO(date)) && ' · Today'}
                    </span>
                  </div>
                  {dateTasks.map(task => {
                    const project = getProjectInfo(task.project_id);
                    return (
                      <Link
                        key={task.id}
                        to={createPageUrl('ProjectTasks') + `?id=${task.project_id}&task=${task.id}`}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-card transition-colors"
                      >
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleComplete(task); }}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                            task.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30"
                          )}
                        >
                          {task.status === 'completed' && <CheckSquare className="w-3 h-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {project.project_number ? `#${project.project_number} · ` : ''}{project.name}
                          </p>
                        </div>
                        {isPastDate && <span className="text-[10px] font-semibold text-red-500 shrink-0">Overdue</span>}
                      </Link>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <CalendarIcon className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No scheduled tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
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

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const getColorForEmail = (email) => {
  if (!email) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function MySchedule() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [nextMonth, setNextMonth] = useState(addMonths(new Date(), 1));
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const calendarFeedUrl = `${window.location.origin}/api/calendar-feed/${currentUser?.id}.ics`;
  const webcalUrl = calendarFeedUrl.replace('https://', 'webcal://').replace('http://', 'webcal://');

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
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await api.entities.Task.update(task.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['myScheduleTasks'] });
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
        <div className="text-center font-semibold text-foreground mb-4">
          {format(month, 'MMMM yyyy')}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
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
                  "text-center py-2 text-sm relative",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isCurrentMonth && "text-foreground",
                  isTodayDate && "bg-primary text-primary-foreground rounded-lg font-semibold"
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">My Schedule</h1>
            <p className="text-xs text-muted-foreground">Tasks and deadlines synced to your calendar</p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="w-4 h-4" />
                  Sync to Calendar
                </Button>
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
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Two-Month Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border shadow-sm p-3 sm:p-6 mb-4 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            {renderCalendar(currentMonth)}
            {renderCalendar(nextMonth)}
          </div>
        </motion.div>

        {/* Task List by Date */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          {datesWithTasks.length > 0 ? (
            datesWithTasks.map(date => {
              const dateTasks = getTasksForDate(parseISO(date));
              if (dateTasks.length === 0) return null;

              return (
                <div key={date} className="border-b border-border last:border-b-0">
                  {dateTasks.map(task => {
                    const project = getProjectInfo(task.project_id);
                    const assignees = [];
                    if (task.assigned_name) {
                      assignees.push({ name: task.assigned_name, email: task.assigned_to });
                    }
                    // Add any additional assignees if you have notify_on_complete
                    if (task.notify_on_complete?.length > 0) {
                      task.notify_on_complete.forEach(email => {
                        const member = teamMembers.find(m => m.email === email);
                        if (member && !assignees.find(a => a.email === email)) {
                          assignees.push({ name: member.name, email });
                        }
                      });
                    }

                    return (
                      <div key={task.id} className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors">
                        <div className="w-24 shrink-0">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-medium text-muted-foreground uppercase">
                              {format(parseISO(date), 'EEE, MMM d')}
                            </span>
                          </div>
                          {task.start_date && task.start_date !== task.due_date && (
                            <div className="text-xs text-muted-foreground/60 mt-0.5">
                              {format(parseISO(task.start_date), 'MMM d')} - {format(parseISO(task.due_date), 'MMM d')}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleComplete(task)}
                              className={cn(
                                "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0",
                                task.status === 'completed'
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-muted-foreground/30 hover:border-emerald-400"
                              )}
                            >
                              {task.status === 'completed' && <CheckSquare className="w-3 h-3" />}
                            </button>
                            
                            <div className="flex-1">
                              <Link 
                                to={createPageUrl('ProjectTasks') + `?id=${task.project_id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                              >
                                {task.title}
                                {assignees.slice(0, 3).map((assignee, idx) => (
                                  <span
                                    key={idx}
                                    className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium",
                                      getColorForEmail(assignee.email)
                                    )}
                                    title={assignee.name}
                                  >
                                    {getInitials(assignee.name)}
                                  </span>
                                ))}
                              </Link>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {project.client && `${project.client} - `}{project.name}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No scheduled tasks</h3>
              <p className="text-muted-foreground">Tasks with due dates will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
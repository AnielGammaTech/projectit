import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, addMonths, subMonths, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CheckSquare, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl, resolveUploadUrl } from '@/utils';

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
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    setNextMonth(addMonths(currentMonth, 1));
  }, [currentMonth]);

  const { data: tasks = [] } = useQuery({
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
        <div className="text-center font-semibold text-slate-900 mb-4">
          {format(month, 'MMMM yyyy')}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
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
                  !isCurrentMonth && "text-slate-300",
                  isCurrentMonth && "text-slate-700",
                  isTodayDate && "bg-slate-900 text-white rounded-lg font-semibold"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header with Avatar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg",
            getColorForEmail(currentUser?.email)
          )}>
            {currentUser?.avatar_url ? (
              <img src={resolveUploadUrl(currentUser.avatar_url)} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(currentUser?.full_name)
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Your Schedule</h1>
        </motion.div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Two-Month Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8"
        >
          <div className="flex gap-8">
            {renderCalendar(currentMonth)}
            {renderCalendar(nextMonth)}
          </div>
        </motion.div>

        {/* Task List by Date */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {datesWithTasks.length > 0 ? (
            datesWithTasks.map(date => {
              const dateTasks = getTasksForDate(parseISO(date));
              if (dateTasks.length === 0) return null;

              return (
                <div key={date} className="border-b border-slate-100 last:border-b-0">
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
                      <div key={task.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors">
                        <div className="w-24 shrink-0">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-medium text-slate-500 uppercase">
                              {format(parseISO(date), 'EEE, MMM d')}
                            </span>
                          </div>
                          {task.start_date && task.start_date !== task.due_date && (
                            <div className="text-xs text-slate-400 mt-0.5">
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
                                  : "border-slate-300 hover:border-emerald-400"
                              )}
                            >
                              {task.status === 'completed' && <CheckSquare className="w-3 h-3" />}
                            </button>
                            
                            <div className="flex-1">
                              <Link 
                                to={createPageUrl('ProjectTasks') + `?id=${task.project_id}`}
                                className="font-medium text-slate-900 hover:text-[#0069AF] transition-colors flex items-center gap-2"
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
                              <div className="text-xs text-slate-500 mt-0.5">
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
              <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No scheduled tasks</h3>
              <p className="text-slate-500">Tasks with due dates will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { 
  Monitor, CheckCircle2, Clock, Package, ListTodo, 
  AlertTriangle, Wrench, ArrowLeft, Play, Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function TechDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['myTasks', currentUser?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_to: currentUser.email }),
    enabled: !!currentUser?.email,
    refetchInterval: 30000
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['myParts', currentUser?.email],
    queryFn: () => base44.entities.Part.filter({ installer_email: currentUser.email }),
    enabled: !!currentUser?.email,
    refetchInterval: 30000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: timeEntries = [], refetch: refetchTime } = useQuery({
    queryKey: ['myTimeEntries', currentUser?.email],
    queryFn: () => base44.entities.TimeEntry.filter({ user_email: currentUser.email }, '-created_date', 50),
    enabled: !!currentUser?.email,
    refetchInterval: 30000
  });

  // Active timer
  const activeTimer = timeEntries.find(e => e.is_running);

  // Calculate metrics
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
  const overdueTasks = activeTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const dueTodayTasks = activeTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const dueTomorrowTasks = activeTasks.filter(t => t.due_date && isTomorrow(new Date(t.due_date)));
  const completedToday = tasks.filter(t => t.status === 'completed' && t.updated_date && isToday(new Date(t.updated_date)));
  const readyToInstall = parts.filter(p => p.status === 'ready_to_install');

  // Hours logged today
  const hoursToday = timeEntries
    .filter(e => e.start_time && isToday(new Date(e.start_time)) && !e.is_running)
    .reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;

  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const handleCompleteTask = async (task) => {
    await base44.entities.Task.update(task.id, { status: 'completed' });
    refetchTasks();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Dashboard')} className="p-2 hover:bg-slate-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold">Tech Dashboard</h1>
              <p className="text-slate-400 text-sm">
                {format(currentTime, 'EEEE, MMMM d • h:mm a')} • Welcome, {currentUser?.full_name?.split(' ')[0] || 'Tech'}
              </p>
            </div>
          </div>
        </div>
        {activeTimer && (
          <div className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-medium">Timer Running</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Stats Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <ListTodo className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-slate-400 text-sm">My Tasks</span>
          </div>
          <p className="text-4xl font-bold">{activeTasks.length}</p>
          <p className="text-sm text-slate-400 mt-1">{completedToday.length} completed today</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-slate-400 text-sm">Due Today</span>
          </div>
          <p className="text-4xl font-bold text-amber-400">{dueTodayTasks.length}</p>
          <p className="text-sm text-slate-400 mt-1">{dueTomorrowTasks.length} due tomorrow</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Wrench className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-slate-400 text-sm">Ready to Install</span>
          </div>
          <p className="text-4xl font-bold text-purple-400">{readyToInstall.length}</p>
          <p className="text-sm text-slate-400 mt-1">parts assigned</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-slate-400 text-sm">Hours Today</span>
          </div>
          <p className="text-4xl font-bold text-emerald-400">{hoursToday.toFixed(1)}h</p>
          <Progress value={Math.min((hoursToday / 8) * 100, 100)} className="h-1.5 mt-2 bg-slate-700" />
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Priority Tasks */}
        <div className="col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-slate-800 rounded-2xl p-5 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <span className="font-semibold">Priority Tasks</span>
              {overdueTasks.length > 0 && (
                <Badge className="bg-red-500/20 text-red-400">{overdueTasks.length} overdue</Badge>
              )}
            </div>
            <div className="space-y-3">
              {/* Overdue */}
              {overdueTasks.map(task => {
                const daysOverdue = differenceInDays(new Date(), new Date(task.due_date));
                return (
                  <motion.div 
                    key={task.id}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-slate-400">{getProjectName(task.project_id)}</p>
                      <p className="text-xs text-red-400 mt-1">{daysOverdue} day{daysOverdue > 1 ? 's' : ''} overdue</p>
                    </div>
                    <Button 
                      onClick={() => handleCompleteTask(task)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete
                    </Button>
                  </motion.div>
                );
              })}
              
              {/* Due Today */}
              {dueTodayTasks.map(task => (
                <motion.div 
                  key={task.id}
                  className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-slate-400">{getProjectName(task.project_id)}</p>
                    <p className="text-xs text-amber-400 mt-1">Due today</p>
                  </div>
                  <Button 
                    onClick={() => handleCompleteTask(task)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                </motion.div>
              ))}

              {/* Due Tomorrow */}
              {dueTomorrowTasks.map(task => (
                <motion.div 
                  key={task.id}
                  className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-slate-400">{getProjectName(task.project_id)}</p>
                    <p className="text-xs text-blue-400 mt-1">Due tomorrow</p>
                  </div>
                  <Button 
                    onClick={() => handleCompleteTask(task)}
                    variant="outline"
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                </motion.div>
              ))}

              {overdueTasks.length === 0 && dueTodayTasks.length === 0 && dueTomorrowTasks.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                  <p className="text-emerald-400 font-medium">All caught up!</p>
                  <p className="text-sm text-slate-400">No urgent tasks</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Parts to Install */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <span className="font-semibold">Parts to Install</span>
            </div>
            <div className="space-y-2">
              {readyToInstall.slice(0, 5).map(part => (
                <div key={part.id} className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                  <p className="font-medium text-sm">{part.name}</p>
                  {part.part_number && <p className="text-xs text-slate-400">#{part.part_number}</p>}
                </div>
              ))}
              {readyToInstall.length === 0 && (
                <p className="text-slate-400 text-center py-4">No parts pending</p>
              )}
            </div>
          </motion.div>

          {/* Completed Today */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-semibold">Completed Today</span>
              <Badge className="bg-emerald-500/20 text-emerald-400">{completedToday.length}</Badge>
            </div>
            <div className="space-y-2">
              {completedToday.slice(0, 5).map(task => (
                <div key={task.id} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-sm truncate">{task.title}</p>
                </div>
              ))}
              {completedToday.length === 0 && (
                <p className="text-slate-400 text-center py-4">Nothing completed yet</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
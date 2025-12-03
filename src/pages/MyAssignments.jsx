import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { format, isPast, isToday, isTomorrow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckSquare, MessageSquare, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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

export default function MyAssignments() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('with_dates'); // 'all', 'with_dates', 'assigned_by_me'
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ['myTasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const getProjectInfo = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project || { name: 'Unknown Project', client: '' };
  };

  const handleToggleComplete = async (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await base44.entities.Task.update(task.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['myTasks'] });
  };

  // Filter tasks based on active tab
  const getFilteredTasks = () => {
    let filtered = tasks;
    
    if (activeTab === 'all') {
      filtered = tasks.filter(t => t.assigned_to === currentUser?.email && t.status !== 'completed');
    } else if (activeTab === 'with_dates') {
      filtered = tasks.filter(t => t.assigned_to === currentUser?.email && t.due_date && t.status !== 'completed');
    } else if (activeTab === 'assigned_by_me') {
      filtered = tasks.filter(t => t.created_by === currentUser?.email && t.assigned_to !== currentUser?.email && t.status !== 'completed');
    }
    
    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  // Group tasks by due date
  const groupTasksByDate = () => {
    const overdue = [];
    const dueToday = [];
    const dueLater = [];
    const noDueDate = [];

    filteredTasks.forEach(task => {
      if (!task.due_date) {
        noDueDate.push(task);
        return;
      }
      
      const dueDate = parseISO(task.due_date);
      if (isPast(dueDate) && !isToday(dueDate)) {
        overdue.push(task);
      } else if (isToday(dueDate)) {
        dueToday.push(task);
      } else {
        dueLater.push(task);
      }
    });

    // Sort by date within each group
    overdue.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    dueLater.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    // Group due later by date
    const dueLaterGrouped = dueLater.reduce((acc, task) => {
      const dateKey = task.due_date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);
      return acc;
    }, {});

    return { overdue, dueToday, dueLaterGrouped, noDueDate };
  };

  const { overdue, dueToday, dueLaterGrouped, noDueDate } = groupTasksByDate();

  const renderTask = (task) => {
    const project = getProjectInfo(task.project_id);
    const assignees = task.assigned_name ? [{ name: task.assigned_name, email: task.assigned_to }] : [];
    
    return (
      <div 
        key={task.id}
        className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 px-2 -mx-2 rounded-lg transition-colors"
      >
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
        
        <div className="flex-1 min-w-0">
          <Link 
            to={createPageUrl('ProjectTasks') + `?id=${task.project_id}`}
            className={cn(
              "font-medium text-slate-900 hover:text-[#0069AF] transition-colors",
              task.status === 'completed' && "line-through text-slate-400"
            )}
          >
            {task.title}
          </Link>
          
          {task.notes && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
              <MessageSquare className="w-3 h-3" />
              <span className="truncate">{task.notes}</span>
            </div>
          )}
        </div>
        
        {/* Assignees */}
        <div className="flex -space-x-1.5">
          {assignees.map((assignee, idx) => (
            <div
              key={idx}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-medium border-2 border-white",
                getColorForEmail(assignee.email)
              )}
              title={assignee.name}
            >
              {getInitials(assignee.name)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProjectGroup = (projectId, projectTasks) => {
    const project = getProjectInfo(projectId);
    
    return (
      <div key={projectId} className="mb-4">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 px-2">
          {project.client && `${project.client} - `}{project.name}
        </div>
        {projectTasks.map(renderTask)}
      </div>
    );
  };

  // Group tasks by project for rendering
  const groupByProject = (tasks) => {
    return tasks.reduce((acc, task) => {
      if (!acc[task.project_id]) acc[task.project_id] = [];
      acc[task.project_id].push(task);
      return acc;
    }, {});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with Avatar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg",
            getColorForEmail(currentUser?.email)
          )}>
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(currentUser?.full_name)
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Here are your assignments</h1>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeTab === 'all'
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            My assignments
          </button>
          <button
            onClick={() => setActiveTab('with_dates')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeTab === 'with_dates'
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            My assignments with dates
          </button>
          <button
            onClick={() => setActiveTab('assigned_by_me')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeTab === 'assigned_by_me'
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            Stuff I've assigned
          </button>
        </div>

        {/* Task List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Overdue Section */}
          {overdue.length > 0 && (
            <div className="border-b border-slate-200">
              <div className="px-4 py-3 bg-red-50">
                <h3 className="text-sm font-semibold text-red-700">Overdue</h3>
              </div>
              <div className="px-4 py-2">
                {Object.entries(groupByProject(overdue)).map(([projectId, tasks]) => {
                  const project = getProjectInfo(projectId);
                  return (
                    <div key={projectId} className="mb-3 last:mb-0">
                      <div className="flex items-baseline gap-4 py-2">
                        <span className="text-xs font-medium text-slate-400 w-24 shrink-0 uppercase">
                          {format(parseISO(tasks[0].due_date), 'EEE, MMM d')}
                        </span>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                            {project.client && `${project.client} - `}{project.name}
                          </div>
                          {tasks.map(renderTask)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due Today Section */}
          {dueToday.length > 0 && (
            <div className="border-b border-slate-200">
              <div className="px-4 py-3 bg-amber-50">
                <h3 className="text-sm font-semibold text-amber-700">Due today</h3>
              </div>
              <div className="px-4 py-2">
                {Object.entries(groupByProject(dueToday)).map(([projectId, tasks]) => {
                  const project = getProjectInfo(projectId);
                  return (
                    <div key={projectId} className="mb-3 last:mb-0">
                      <div className="flex items-baseline gap-4 py-2">
                        <span className="text-xs font-medium text-slate-400 w-24 shrink-0 uppercase">
                          {format(new Date(), 'EEE, MMM d')}
                        </span>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                            {project.client && `${project.client} - `}{project.name}
                          </div>
                          {tasks.map(renderTask)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due Later Section */}
          {Object.keys(dueLaterGrouped).length > 0 && (
            <div className="border-b border-slate-200">
              <div className="px-4 py-3 bg-blue-50">
                <h3 className="text-sm font-semibold text-blue-700">Due later</h3>
              </div>
              <div className="px-4 py-2">
                {Object.entries(dueLaterGrouped).map(([date, dateTasks]) => {
                  const projectGroups = groupByProject(dateTasks);
                  return Object.entries(projectGroups).map(([projectId, tasks]) => {
                    const project = getProjectInfo(projectId);
                    return (
                      <div key={`${date}-${projectId}`} className="mb-3 last:mb-0">
                        <div className="flex items-baseline gap-4 py-2">
                          <span className="text-xs font-medium text-slate-400 w-24 shrink-0 uppercase">
                            {format(parseISO(date), 'EEE, MMM d')}
                          </span>
                          <div className="flex-1">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                              {project.client && `${project.client} - `}{project.name}
                            </div>
                            {tasks.map(renderTask)}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          )}

          {/* No Due Date Section */}
          {noDueDate.length > 0 && activeTab === 'all' && (
            <div>
              <div className="px-4 py-3 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-600">No due date</h3>
              </div>
              <div className="px-4 py-2">
                {Object.entries(groupByProject(noDueDate)).map(([projectId, tasks]) => 
                  renderProjectGroup(projectId, tasks)
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredTasks.length === 0 && (
            <div className="p-12 text-center">
              <ListTodo className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No assignments</h3>
              <p className="text-slate-500">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
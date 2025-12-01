import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ListTodo, Filter, Search, Plus, CheckCircle2, Circle, Clock, ArrowUpCircle, Calendar, User, FolderKanban, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig = {
  todo: { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100', label: 'To Do' },
  in_progress: { icon: ArrowUpCircle, color: 'text-blue-500', bg: 'bg-blue-100', label: 'In Progress' },
  review: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100', label: 'Review' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Completed' }
};

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700'
};

export default function AllTasks() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'tasks';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'mine'
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['allParts'],
    queryFn: () => base44.entities.Part.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' || task.assigned_to === assigneeFilter;
    const matchesViewMode = viewMode === 'all' || (viewMode === 'mine' && task.assigned_to === currentUser?.email);
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesViewMode;
  });

  // My assigned parts (with due dates)
  const myParts = parts.filter(part => 
    part.assigned_to === currentUser?.email && part.due_date
  );

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    review: filteredTasks.filter(t => t.status === 'review'),
    completed: filteredTasks.filter(t => t.status === 'completed')
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tasks & Parts</h1>
          <p className="text-slate-500 mt-1">View and filter all tasks and parts across projects</p>
          
          {/* Main Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('tasks')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'tasks' ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <ListTodo className="w-4 h-4" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('parts')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'parts' ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <Package className="w-4 h-4" />
              Parts
              <span className={cn("text-xs px-1.5 py-0.5 rounded-full", activeTab === 'parts' ? "bg-amber-600" : "bg-amber-100 text-amber-700")}>{parts.length}</span>
            </button>
          </div>
        </motion.div>

        {/* Filters - Tasks */}
        {activeTab === 'tasks' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 mb-6"
          >
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.email}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}

        {/* Stats - Tasks */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {Object.entries(statusConfig).map(([key, config]) => {
              const Icon = config.icon;
              const count = tasksByStatus[key]?.length || 0;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                    statusFilter === key ? "border-indigo-300 bg-indigo-50" : "border-slate-100 bg-white"
                  )}
                  onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", config.bg)}>
                      <Icon className={cn("w-4 h-4", config.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{count}</p>
                      <p className="text-xs text-slate-500">{config.label}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Tasks List */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task, idx) => {
                const status = statusConfig[task.status] || statusConfig.todo;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("p-1.5 rounded-lg", status.bg)}>
                        <StatusIcon className={cn("w-5 h-5", status.color)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={cn(
                            "font-medium text-slate-900",
                            task.status === 'completed' && "line-through text-slate-500"
                          )}>
                            {task.title}
                          </h4>
                          <Link to={createPageUrl('ProjectDetail') + `?id=${task.project_id}`}>
                            <Badge variant="outline" className="shrink-0 hover:bg-slate-100">
                              <FolderKanban className="w-3 h-3 mr-1" />
                              {getProjectName(task.project_id)}
                            </Badge>
                          </Link>
                        </div>

                        {task.description && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <Badge variant="outline" className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>

                          {task.assigned_name && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                              <User className="w-3.5 h-3.5" />
                              <span>{task.assigned_name}</span>
                            </div>
                          )}

                          {task.due_date && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{format(new Date(task.due_date), 'MMM d')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
              >
                <ListTodo className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks found</h3>
                <p className="text-slate-500">Try adjusting your filters or create a new task in a project</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Parts List */}
        {activeTab === 'parts' && (
          <div className="space-y-3">
            {parts.length > 0 ? (
              parts.map((part, idx) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-1.5 rounded-lg bg-amber-100">
                      <Package className="w-5 h-5 text-amber-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-slate-900">{part.name}</h4>
                        <Link to={createPageUrl('ProjectDetail') + `?id=${part.project_id}`}>
                          <Badge variant="outline" className="shrink-0 hover:bg-slate-100">
                            <FolderKanban className="w-3 h-3 mr-1" />
                            {getProjectName(part.project_id)}
                          </Badge>
                        </Link>
                      </div>

                      {part.part_number && (
                        <p className="text-sm text-slate-500 mt-1">#{part.part_number}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                          {part.status}
                        </Badge>

                        {part.quantity > 1 && (
                          <Badge variant="outline">Qty: {part.quantity}</Badge>
                        )}

                        {part.assigned_name && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <User className="w-3.5 h-3.5" />
                            <span>{part.assigned_name}</span>
                          </div>
                        )}

                        {part.due_date && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{format(new Date(part.due_date), 'MMM d')}</span>
                          </div>
                        )}

                        {part.supplier && (
                          <span className="text-xs text-slate-400">{part.supplier}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
              >
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No parts found</h3>
                <p className="text-slate-500">Parts will appear here when added to projects</p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ListTodo, Filter, Search, Plus, CheckCircle2, Circle, Clock, ArrowUpCircle, Calendar, User, FolderKanban, Package, Edit2, Truck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import TaskModal from '@/components/modals/TaskModal';
import PartModal from '@/components/modals/PartModal';
import PartDetailModal from '@/components/modals/PartDetailModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [viewMode, setViewMode] = useState('all'); // 'all', 'mine', 'mine_due'
  const [currentUser, setCurrentUser] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [deletePartConfirm, setDeletePartConfirm] = useState({ open: false, part: null });
  const queryClient = useQueryClient();

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

  // Get active project IDs (not archived or completed)
  const activeProjectIds = projects
    .filter(p => p.status !== 'archived' && p.status !== 'completed')
    .map(p => p.id);

  const filteredTasks = tasks.filter(task => {
    // Only show tasks from active projects (exclude archived)
    if (!activeProjectIds.includes(task.project_id)) return false;
    
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' || task.assigned_to === assigneeFilter;
    
    let matchesViewMode = true;
    if (viewMode === 'mine') {
      matchesViewMode = task.assigned_to === currentUser?.email;
    } else if (viewMode === 'mine_due') {
      matchesViewMode = task.assigned_to === currentUser?.email && task.due_date;
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesViewMode;
  }).sort((a, b) => {
    // Sort completed tasks to the bottom
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    
    if (viewMode === 'mine_due') {
      return new Date(a.due_date) - new Date(b.due_date);
    }
    return 0;
  });

  // My assigned parts (with due dates)
  const myParts = parts.filter(part => 
    part.assigned_to === currentUser?.email && part.due_date
  );

  // Parts from active projects only
  const activeProjectParts = parts.filter(p => activeProjectIds.includes(p.project_id));

  // Filter parts - only show parts from active projects
  const filteredParts = parts.filter(part => {
    // Only include parts from active projects
    if (!activeProjectIds.includes(part.project_id)) return false;
    
    const matchesSearch = part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.part_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || part.status === statusFilter;
    const matchesAssignee = assigneeFilter === 'all' || part.assigned_to === assigneeFilter;
    return matchesSearch && matchesStatus && matchesAssignee;
  });

  // Only count tasks from active projects
  const activeTasks = tasks.filter(t => activeProjectIds.includes(t.project_id));
  const myTasksCount = activeTasks.filter(t => t.assigned_to === currentUser?.email && t.status !== 'completed').length;
  const myTasksWithDueCount = activeTasks.filter(t => t.assigned_to === currentUser?.email && t.due_date && t.status !== 'completed').length;

  const handleSaveTask = async (data) => {
    if (editingTask) {
      await base44.entities.Task.update(editingTask.id, data);
    }
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleSavePart = async (data) => {
    if (editingPart) {
      await base44.entities.Part.update(editingPart.id, data);
    }
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
    setShowPartModal(false);
    setEditingPart(null);
    setSelectedPart(null);
  };

  const handleSetDeliveryDate = async (part, date) => {
    await base44.entities.Part.update(part.id, { est_delivery_date: format(date, 'yyyy-MM-dd') });
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
  };

  const handlePartStatusChange = async (part, status) => {
    await base44.entities.Part.update(part.id, { status });
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
  };

  const handleDeletePart = async () => {
    if (deletePartConfirm.part) {
      await base44.entities.Part.delete(deletePartConfirm.part.id);
      queryClient.invalidateQueries({ queryKey: ['allParts'] });
    }
    setDeletePartConfirm({ open: false, part: null });
  };

  const getDueDateLabel = (date) => {
    const d = new Date(date);
    if (isToday(d)) return { label: 'Today', color: 'text-amber-600 bg-amber-50' };
    if (isTomorrow(d)) return { label: 'Tomorrow', color: 'text-blue-600 bg-blue-50' };
    if (isPast(d)) return { label: 'Overdue', color: 'text-red-600 bg-red-50' };
    return { label: format(d, 'MMM d'), color: 'text-slate-600 bg-slate-50' };
  };

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
              <span className={cn("text-xs px-1.5 py-0.5 rounded-full", activeTab === 'parts' ? "bg-amber-600" : "bg-amber-100 text-amber-700")}>{parts.filter(p => activeProjectIds.includes(p.project_id)).length}</span>
            </button>
          </div>
        </motion.div>

        {/* My Tasks Buttons */}
        {activeTab === 'tasks' && currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-3 mb-4"
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setViewMode('all')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                  viewMode === 'all' 
                    ? "bg-[#0069AF] text-white shadow-md" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <ListTodo className="w-4 h-4" />
                All Tasks
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs",
                  viewMode === 'all' ? "bg-white/20" : "bg-slate-200"
                )}>
                  {activeTasks.filter(t => t.status !== 'completed').length}
                </span>
              </button>
              <button
                onClick={() => setViewMode('mine')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                  viewMode === 'mine' 
                    ? "bg-[#0069AF] text-white shadow-md" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <User className="w-4 h-4" />
                My Tasks
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs",
                  viewMode === 'mine' ? "bg-white/20" : "bg-slate-200"
                )}>
                  {myTasksCount}
                </span>
              </button>
              <button
                onClick={() => setViewMode('mine_due')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                  viewMode === 'mine_due' 
                    ? "bg-[#0069AF] text-white shadow-md" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <Calendar className="w-4 h-4" />
                My Tasks with Due Dates
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs",
                  viewMode === 'mine_due' ? "bg-white/20" : "bg-amber-100 text-amber-700"
                )}>
                  {myTasksWithDueCount}
                </span>
              </button>
            </div>
          </motion.div>
        )}

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
                const dueInfo = task.due_date ? getDueDateLabel(task.due_date) : null;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                    className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group"
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
                          <div className="flex items-center gap-2">
                            <Edit2 className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Link to={createPageUrl('ProjectDetail') + `?id=${task.project_id}`} onClick={(e) => e.stopPropagation()}>
                              <Badge variant="outline" className="shrink-0 hover:bg-slate-100">
                                <FolderKanban className="w-3 h-3 mr-1" />
                                {getProjectName(task.project_id)}
                              </Badge>
                            </Link>
                          </div>
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

                          {dueInfo && (
                            <Badge variant="outline" className={dueInfo.color}>
                              <Calendar className="w-3 h-3 mr-1" />
                              {dueInfo.label}
                            </Badge>
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

        {/* Parts Filters */}
        {activeTab === 'parts' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 mb-6"
          >
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search parts..."
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
                  <SelectItem value="needed">Needed</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="installed">Installed</SelectItem>
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

        {/* Parts Status Cards */}
        {activeTab === 'parts' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { key: 'needed', label: 'Needed', color: 'text-red-500', bg: 'bg-red-100' },
              { key: 'ordered', label: 'Ordered', color: 'text-blue-500', bg: 'bg-blue-100' },
              { key: 'received', label: 'Received', color: 'text-amber-500', bg: 'bg-amber-100' },
              { key: 'installed', label: 'Installed', color: 'text-emerald-500', bg: 'bg-emerald-100' }
            ].map((status) => {
              const count = activeProjectParts.filter(p => p.status === status.key).length;
              return (
                <motion.div
                  key={status.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                    statusFilter === status.key ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-white"
                  )}
                  onClick={() => setStatusFilter(statusFilter === status.key ? 'all' : status.key)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", status.bg)}>
                      <Package className={cn("w-4 h-4", status.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{count}</p>
                      <p className="text-xs text-slate-500">{status.label}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Parts List */}
        {activeTab === 'parts' && (
          <div className="space-y-3">
            {filteredParts.length > 0 ? (
              filteredParts.map((part, idx) => {
                const dueInfo = part.due_date && !isNaN(new Date(part.due_date).getTime()) ? getDueDateLabel(part.due_date) : null;
                const deliveryInfo = part.est_delivery_date && !isNaN(new Date(part.est_delivery_date).getTime()) ? getDueDateLabel(part.est_delivery_date) : null;
                
                return (
                  <motion.div
                    key={part.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => setSelectedPart(part)}
                    className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-1.5 rounded-lg bg-amber-100">
                        <Package className="w-5 h-5 text-amber-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-slate-900">{part.name}</h4>
                          <div className="flex items-center gap-2">
                            {/* Quick set delivery date button */}
                            {!part.est_delivery_date && (part.status === 'ordered' || part.status === 'needed') && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Truck className="w-3 h-3 mr-1" />
                                    Set ETA
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
                                  <CalendarPicker
                                    mode="single"
                                    selected={undefined}
                                    onSelect={(date) => date && handleSetDeliveryDate(part, date)}
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); setDeletePartConfirm({ open: true, part }); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Link to={createPageUrl('ProjectDetail') + `?id=${part.project_id}`} onClick={(e) => e.stopPropagation()}>
                              <Badge variant="outline" className="shrink-0 hover:bg-slate-100">
                                <FolderKanban className="w-3 h-3 mr-1" />
                                {getProjectName(part.project_id)}
                              </Badge>
                            </Link>
                          </div>
                        </div>

                        {part.part_number && (
                          <p className="text-sm text-slate-500 mt-1">#{part.part_number}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                            {part.status?.replace('_', ' ')}
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

                          {deliveryInfo && (
                            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                              <Truck className="w-3 h-3 mr-1" />
                              ETA: {deliveryInfo.label}
                            </Badge>
                          )}

                          {dueInfo && (
                            <Badge variant="outline" className={dueInfo.color}>
                              <Calendar className="w-3 h-3 mr-1" />
                              {dueInfo.label}
                            </Badge>
                          )}

                          {part.supplier && (
                            <span className="text-xs text-slate-400">{part.supplier}</span>
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
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No parts found</h3>
                <p className="text-slate-500">{statusFilter !== 'all' ? 'Try adjusting your filters' : 'Parts will appear here when added to active projects'}</p>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Task Edit Modal */}
      <TaskModal
        open={showTaskModal}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        task={editingTask}
        projectId={editingTask?.project_id}
        teamMembers={teamMembers}
        groups={[]}
        onSave={handleSaveTask}
      />

      {/* Part Edit Modal */}
      <PartModal
        open={showPartModal}
        onClose={() => { setShowPartModal(false); setEditingPart(null); }}
        part={editingPart}
        projectId={editingPart?.project_id}
        teamMembers={teamMembers}
        onSave={handleSavePart}
      />

      {/* Part Detail Modal */}
      <PartDetailModal
        open={!!selectedPart}
        onClose={() => setSelectedPart(null)}
        part={selectedPart}
        teamMembers={teamMembers}
        currentUser={currentUser}
        onEdit={(part) => { setSelectedPart(null); setEditingPart(part); setShowPartModal(true); }}
        onStatusChange={handlePartStatusChange}
      />

      {/* Delete Part Confirmation */}
      <AlertDialog open={deletePartConfirm.open} onOpenChange={(open) => !open && setDeletePartConfirm({ open: false, part: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete part?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletePartConfirm.part?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePart} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
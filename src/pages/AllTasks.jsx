import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, Filter, Search, Plus, CheckCircle2, Circle, Clock, ArrowUpCircle, Calendar, User, FolderKanban, Package, Edit2, Truck, Trash2, ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';
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
import QuickOrderModal from '@/components/parts/QuickOrderModal';
import { sendTaskAssignmentNotification, sendTaskCompletionNotification } from '@/utils/notifications';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [deletePartConfirm, setDeletePartConfirm] = useState({ open: false, part: null });
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [quickOrderPart, setQuickOrderPart] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setIsAdmin(user?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
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

  // Helper to check if user has access to a project
  const userHasProjectAccess = (project) => {
    if (isAdmin) return true;
    if (!project.team_members || project.team_members.length === 0) return true;
    return project.team_members.includes(currentUser?.email);
  };

  // Get active project IDs (not archived, completed, or deleted) that user has access to
  const activeProjectIds = projects
    .filter(p => p.status !== 'archived' && p.status !== 'completed' && p.status !== 'deleted' && userHasProjectAccess(p))
    .map(p => p.id);

  const allFilteredTasks = tasks.filter(task => {
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
    if (viewMode === 'mine_due') {
      return new Date(a.due_date) - new Date(b.due_date);
    }
    return 0;
  });

  // Separate active and completed tasks
  const filteredTasks = allFilteredTasks.filter(t => t.status !== 'completed');
  const completedTasks = allFilteredTasks.filter(t => t.status === 'completed');

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
      const wasAssigned = editingTask.assigned_to;
      const isNewlyAssigned = data.assigned_to && data.assigned_to !== 'unassigned' && data.assigned_to !== wasAssigned;
      await base44.entities.Task.update(editingTask.id, data);

      if (isNewlyAssigned) {
        await sendTaskAssignmentNotification({
          assigneeEmail: data.assigned_to,
          taskTitle: data.title,
          projectId: data.project_id || editingTask.project_id,
          projectName: getProjectName(data.project_id || editingTask.project_id),
          currentUser,
        });
      }
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

  const handleQuickOrderSave = async (partId, data) => {
    await base44.entities.Part.update(partId, data);
    queryClient.invalidateQueries({ queryKey: ['allParts'] });
  };

  const handleDeletePart = async () => {
    if (deletePartConfirm.part) {
      await base44.entities.Part.delete(deletePartConfirm.part.id);
      queryClient.invalidateQueries({ queryKey: ['allParts'] });
    }
    setDeletePartConfirm({ open: false, part: null });
  };

  const handleQuickComplete = async (e, taskId) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    await base44.entities.Task.update(taskId, { status: 'completed' });

    if (task) {
      await sendTaskCompletionNotification({
        task,
        projectId: task.project_id,
        projectName: getProjectName(task.project_id),
        currentUser,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const getDueDateLabel = (date) => {
    const d = new Date(date);
    if (isToday(d)) return { label: 'Today', color: 'text-amber-600 bg-amber-50' };
    if (isTomorrow(d)) return { label: 'Tomorrow', color: 'text-blue-600 bg-blue-50' };
    if (isPast(d)) return { label: 'Overdue', color: 'text-red-600 bg-red-50' };
    return { label: format(d, 'MMM d'), color: 'text-slate-600 bg-slate-50' };
  };

  const tasksByStatus = {
    todo: allFilteredTasks.filter(t => t.status === 'todo'),
    in_progress: allFilteredTasks.filter(t => t.status === 'in_progress'),
    review: allFilteredTasks.filter(t => t.status === 'review'),
    completed: completedTasks
  };

  if (loadingTasks) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div>
              <div className="h-8 w-48 bg-slate-200 rounded-lg" />
              <div className="h-4 w-64 bg-slate-100 rounded mt-2" />
              <div className="flex gap-2 mt-4">
                <div className="h-10 w-24 bg-slate-200 rounded-lg" />
                <div className="h-10 w-24 bg-slate-200 rounded-lg" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="h-10 bg-slate-100 rounded-lg mb-4" />
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                <div className="h-8 w-24 bg-slate-100 rounded-lg" />
              </div>
            </div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="flex gap-3">
                    <div className="h-5 w-16 bg-slate-100 rounded" />
                    <div className="h-5 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
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
                activeTab === 'tasks' ? "bg-[#0069AF] text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <ListTodo className="w-4 h-4" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('parts')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'parts' ? "bg-[#0F2F44] text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <Package className="w-4 h-4" />
              Parts
              <span className={cn("text-xs px-1.5 py-0.5 rounded-full", activeTab === 'parts' ? "bg-[#133F5C]" : "bg-[#0069AF]/10 text-[#0069AF]")}>{parts.filter(p => activeProjectIds.includes(p.project_id)).length}</span>
            </button>
          </div>
        </motion.div>

        {/* Unified Toolbar - Tasks */}
        {activeTab === 'tasks' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 mb-6"
          >
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-4">
              <button
                onClick={() => setViewMode('all')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  viewMode === 'all' 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                All Tasks ({activeTasks.filter(t => t.status !== 'completed').length})
              </button>
              <button
                onClick={() => setViewMode('mine')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  viewMode === 'mine' 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                My Tasks ({myTasksCount})
              </button>
              <button
                onClick={() => setViewMode('mine_due')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  viewMode === 'mine_due' 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Due Soon ({myTasksWithDueCount})
              </button>
            </div>

            {/* Filters Row */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <div className="relative flex-1 min-w-[140px] sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 sm:h-9"
                />
              </div>

              {/* Status Pills — horizontal scroll on mobile */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {Object.entries(statusConfig).filter(([key]) => key !== 'completed').map(([key, config]) => {
                  const Icon = config.icon;
                  const count = tasksByStatus[key]?.length || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0",
                        statusFilter === key
                          ? "bg-[#0069AF] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{config.label}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px]",
                        statusFilter === key ? "bg-white/20" : "bg-white"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="flex-1 sm:w-32 h-10 sm:h-9">
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
                  <SelectTrigger className="flex-1 sm:w-36 h-10 sm:h-9">
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
            </div>
          </motion.div>
        )}

        {/* Tasks List — grouped by project */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {filteredTasks.length > 0 ? (
              (() => {
                // Group tasks by project
                const grouped = {};
                filteredTasks.forEach(task => {
                  const pid = task.project_id;
                  if (!grouped[pid]) grouped[pid] = [];
                  grouped[pid].push(task);
                });

                return Object.entries(grouped).map(([projectId, projectTasks]) => (
                  <motion.div
                    key={projectId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-100 overflow-hidden"
                  >
                    {/* Project header */}
                    <Link
                      to={createPageUrl('ProjectDetail') + `?id=${projectId}`}
                      className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-3.5 h-3.5 text-[#0069AF]" />
                        <span className="font-semibold text-sm text-slate-900">{getProjectName(projectId)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">#{projectId.slice(0, 8)}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{projectTasks.length}</Badge>
                      </div>
                    </Link>

                    {/* Task rows */}
                    <div className="divide-y divide-slate-50">
                      {projectTasks.map((task) => {
                        const status = statusConfig[task.status] || statusConfig.todo;
                        const StatusIcon = status.icon;
                        const dueInfo = task.due_date ? getDueDateLabel(task.due_date) : null;

                        return (
                          <div
                            key={task.id}
                            onClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer group active:bg-slate-100"
                          >
                            {/* Tappable checkmark */}
                            <button
                              onClick={(e) => handleQuickComplete(e, task.id)}
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90",
                                task.status === 'completed'
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-slate-300 hover:border-[#0069AF] hover:bg-[#0069AF]/5"
                              )}
                              title="Mark as completed"
                            >
                              {task.status === 'completed' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 opacity-0 group-hover:opacity-30" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-slate-900 truncate">{task.title}</h4>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {task.priority && (
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 hidden sm:flex", priorityColors[task.priority])}>
                                  {task.priority}
                                </Badge>
                              )}
                              {task.assigned_name && (
                                <span className="text-[11px] text-slate-400 hidden lg:inline">{task.assigned_name.split(' ')[0]}</span>
                              )}
                              {dueInfo && (
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", dueInfo.color)}>
                                  {dueInfo.label}
                                </Badge>
                              )}
                              <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ));
              })()
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
              >
                <ListTodo className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No active tasks found</h3>
                <p className="text-slate-500">Try adjusting your filters or create a new task in a project</p>
              </motion.div>
            )}

            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 mb-2 transition-colors"
                >
                  {showCompletedTasks ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Completed ({completedTasks.length})
                </button>

                <AnimatePresence>
                  {showCompletedTasks && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white rounded-xl border border-slate-100 overflow-hidden"
                    >
                      <div className="divide-y divide-slate-50">
                        {completedTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-sm text-slate-400 line-through truncate flex-1">{task.title}</span>
                            <span className="text-[10px] text-slate-300">{getProjectName(task.project_id)}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
                            {/* Quick Order button */}
                            {part.status === 'needed' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={(e) => { e.stopPropagation(); setQuickOrderPart(part); }}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                Order
                              </Button>
                            )}
                            {/* Quick set delivery date button */}
                            {!part.est_delivery_date && part.status === 'ordered' && (
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

      {/* Quick Order Modal */}
      <QuickOrderModal
        open={!!quickOrderPart}
        onClose={() => setQuickOrderPart(null)}
        part={quickOrderPart}
        onSave={handleQuickOrderSave}
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
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import {
  BarChart3, PieChart, TrendingUp, Users, Package,
  CheckCircle2, Clock, DollarSign, Activity, Truck,
  ShoppingCart, Timer, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, subDays } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#0069AF', '#22c55e', '#f59e0b', '#ef4444', '#0F2F44', '#74C7FF'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list('-created_date')
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list('-created_date')
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['allParts'],
    queryFn: () => api.entities.Part.list('-created_date')
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.entities.InventoryItem.list()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => api.entities.TimeEntry.list('-created_date')
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.entities.Customer.list()
  });

  // Calculations — filter tasks/parts to only active projects
  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'archived' && p.status !== 'deleted');
  const activeProjectIds = activeProjects.map(p => p.id);

  // Only count tasks/parts from active projects
  const projectTasks = tasks.filter(t => activeProjectIds.includes(t.project_id));
  const completedTasks = projectTasks.filter(t => t.status === 'completed');
  const activeTasks = projectTasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
  const overdueTasks = projectTasks.filter(t => { const d = parseLocalDate(t.due_date); return d && d < new Date() && t.status !== 'completed'; });
  const totalHours = (timeEntries.filter(e => activeProjectIds.includes(e.project_id)).reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60);

  // Financial — only parts from active projects
  const projectParts = parts.filter(p => p.project_id && activeProjectIds.includes(p.project_id));
  const projectItemsCost = projectParts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  const projectItemsRetail = projectParts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.sell_price || p.unit_cost || 0)), 0);
  const stockedCost = inventory.reduce((sum, i) => sum + ((i.quantity_in_stock || 0) * (i.unit_cost || 0)), 0);
  const stockedRetail = inventory.reduce((sum, i) => sum + ((i.quantity_in_stock || 0) * (i.sell_price || i.unit_cost || 0)), 0);
  const partsInTransit = projectParts.filter(p => p.status === 'ordered');
  const partsNeeded = projectParts.filter(p => p.status === 'needed');
  const transitCost = partsInTransit.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  const neededCost = partsNeeded.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  const totalCost = projectItemsCost + stockedCost;
  const totalRetail = projectItemsRetail + stockedRetail;
  const margin = totalRetail - totalCost;
  const marginPercent = totalRetail > 0 ? ((margin / totalRetail) * 100).toFixed(1) : 0;

  // Task status distribution — active projects only
  const taskStatusData = [
    { name: 'To Do', value: projectTasks.filter(t => t.status === 'todo').length, color: '#94a3b8' },
    { name: 'In Progress', value: projectTasks.filter(t => t.status === 'in_progress').length, color: '#0069AF' },
    { name: 'Review', value: projectTasks.filter(t => t.status === 'review').length, color: '#f59e0b' },
    { name: 'Completed', value: completedTasks.length, color: '#22c55e' }
  ].filter(d => d.value > 0);

  // Weekly completion trend — active projects only
  const weeklyTrend = Array.from({ length: 6 }, (_, i) => {
    const weekStart = subDays(new Date(), (5 - i) * 7 + 7);
    const weekEnd = subDays(new Date(), (5 - i) * 7);
    const completed = projectTasks.filter(t => {
      if (!t.updated_date || t.status !== 'completed') return false;
      const date = new Date(t.updated_date);
      return date >= weekStart && date <= weekEnd;
    }).length;
    return { week: `W${i + 1}`, completed };
  });

  // Team performance — active projects only
  const tasksByMember = teamMembers.map(member => {
    const memberTasks = projectTasks.filter(t => t.assigned_to === member.email);
    const memberCompleted = memberTasks.filter(t => t.status === 'completed').length;
    const memberHours = timeEntries
      .filter(e => e.user_email === member.email && activeProjectIds.includes(e.project_id))
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;
    return {
      name: member.name?.split(' ')[0] || member.email.split('@')[0],
      fullName: member.name || member.email,
      total: memberTasks.length,
      completed: memberCompleted,
      hours: memberHours,
      rate: memberTasks.length > 0 ? Math.round((memberCompleted / memberTasks.length) * 100) : 0
    };
  }).filter(m => m.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);

  // Project financial breakdown
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedProjectParts = parts.filter(p => p.project_id === selectedProjectId);
  const selectedCustomer = selectedProject ? customers.find(c => c.id === selectedProject.customer_id) : null;
  const getPartsByStatus = (status) => selectedProjectParts.filter(p => p.status === status);
  const getPartsCost = (status) => getPartsByStatus(status).reduce((s, p) => s + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  const getPartsRetail = (status) => getPartsByStatus(status).reduce((s, p) => s + ((p.quantity || 1) * (p.sell_price || p.unit_cost || 0)), 0);
  const projTotalCost = selectedProjectParts.reduce((s, p) => s + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  const projTotalRetail = selectedProjectParts.reduce((s, p) => s + ((p.quantity || 1) * (p.sell_price || p.unit_cost || 0)), 0);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'financial', label: 'Financial', icon: DollarSign },
    { key: 'team', label: 'Team', icon: Users },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-40 bg-slate-200 rounded-lg" />
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-64 bg-slate-200 rounded-xl" />
              <div className="h-64 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, sub, color = 'text-slate-900', iconBg = 'bg-slate-100', iconColor = 'text-slate-600' }) => (
    <div className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("p-2 rounded-lg", iconBg)}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-slate-500 mt-1">Business metrics and team performance</p>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 p-1 bg-slate-100 rounded-lg w-fit">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    activeTab === tab.key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Activity} label="Active Projects" value={activeProjects.length} sub={`${completedTasks.length} tasks completed`} iconBg="bg-[#0069AF]/10" iconColor="text-[#0069AF]" />
              <StatCard icon={CheckCircle2} label="Task Completion" value={`${projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0}%`} sub={`${activeTasks.length} active tasks`} color="text-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <StatCard icon={Clock} label="Hours Logged" value={`${totalHours.toFixed(0)}h`} sub={`${timeEntries.length} entries`} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <StatCard icon={DollarSign} label="Portfolio Value" value={`$${totalRetail.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`} sub={`${marginPercent}% margin`} color="text-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Task Status Pie */}
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#0069AF]" />
                  Task Status
                </h3>
                {taskStatusData.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={180}>
                      <RechartsPie>
                        <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={2} stroke="#fff">
                          {taskStatusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {taskStatusData.map(item => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-slate-600">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-slate-400">No data</div>
                )}
              </div>

              {/* Completion Trend */}
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0069AF]" />
                  Completion Trend
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={weeklyTrend}>
                    <defs>
                      <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0069AF" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0069AF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Area type="monotone" dataKey="completed" stroke="#0069AF" strokeWidth={2} fill="url(#completedGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Overdue & Pipeline summary */}
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Overdue Tasks</h3>
                {overdueTasks.length > 0 ? (
                  <div className="space-y-2">
                    {overdueTasks.slice(0, 5).map(task => (
                      <Link key={task.id} to={createPageUrl('ProjectDetail') + `?id=${task.project_id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-red-50 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-sm text-slate-700 truncate flex-1">{task.title}</span>
                        <span className="text-[10px] text-red-500 font-medium">
                          {task.due_date && format(parseLocalDate(task.due_date) || new Date(), 'MMM d')}
                        </span>
                      </Link>
                    ))}
                    {overdueTasks.length > 5 && (
                      <p className="text-xs text-slate-400 text-center">+{overdueTasks.length - 5} more</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 py-4">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">All tasks on track!</span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Parts Pipeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-slate-600">Needed</span>
                    </div>
                    <span className="text-sm font-medium">{partsNeeded.length} items</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-slate-600">In Transit</span>
                    </div>
                    <span className="text-sm font-medium">{partsInTransit.length} items</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-slate-600">In Stock</span>
                    </div>
                    <span className="text-sm font-medium">{inventory.length} items</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Project Health</h3>
                <div className="space-y-3">
                  {activeProjects.slice(0, 4).map(project => {
                    const pTasks = projectTasks.filter(t => t.project_id === project.id);
                    const pCompleted = pTasks.filter(t => t.status === 'completed').length;
                    const pct = pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0;
                    return (
                      <div key={project.id}>
                        <div className="flex items-center justify-between mb-1">
                          <Link to={createPageUrl('ProjectDetail') + `?id=${project.id}`} className="text-xs text-slate-700 hover:text-[#0069AF] truncate">{project.name}</Link>
                          <span className="text-[10px] text-slate-400">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Package} label="Project Items" value={`$${projectItemsCost.toLocaleString(undefined, {maximumFractionDigits: 0})}`} sub={`${projectParts.length} items | Retail: $${projectItemsRetail.toLocaleString(undefined, {maximumFractionDigits: 0})}`} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <StatCard icon={Package} label="Stocked Inventory" value={`$${stockedCost.toLocaleString(undefined, {maximumFractionDigits: 0})}`} sub={`${inventory.length} items | Retail: $${stockedRetail.toLocaleString(undefined, {maximumFractionDigits: 0})}`} iconBg="bg-[#0069AF]/10" iconColor="text-[#0069AF]" />
              <StatCard icon={Truck} label="In Transit" value={`$${transitCost.toLocaleString(undefined, {maximumFractionDigits: 0})}`} sub={`${partsInTransit.length} items ordered`} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <StatCard icon={ShoppingCart} label="To be Ordered" value={`$${neededCost.toLocaleString(undefined, {maximumFractionDigits: 0})}`} sub={`${partsNeeded.length} items pending`} color="text-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
            </div>

            {/* Totals Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Total Cost</p>
                <p className="text-3xl font-bold text-slate-900">${totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Total Retail</p>
                <p className="text-3xl font-bold text-emerald-600">${totalRetail.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              </div>
              <div className="bg-gradient-to-r from-[#0069AF] to-[#133F5C] rounded-xl p-5 text-white">
                <p className="text-xs font-medium text-white/70 uppercase tracking-wide mb-2">Margin</p>
                <p className="text-3xl font-bold">${margin.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                <p className="text-sm text-white/70">{marginPercent}%</p>
              </div>
            </div>

            {/* Project Drilldown */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Project Cost Breakdown</h3>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full max-w-md mb-4">
                  <SelectValue placeholder="Select a project to view details..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => {
                    const c = customers.find(c => c.id === p.customer_id);
                    return (
                      <SelectItem key={p.id} value={p.id}>{p.name}{c ? ` — ${c.name}` : ''}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedProject && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-slate-900">{selectedProject.name}</h4>
                      <p className="text-sm text-slate-500">{selectedCustomer?.name || selectedProject.client}</p>
                    </div>
                    <Badge variant="outline">{selectedProjectParts.length} items</Badge>
                  </div>

                  <div className="grid grid-cols-5 gap-3 mb-5">
                    {[
                      { label: 'Needed', status: 'needed', color: 'red' },
                      { label: 'In Transit', status: 'ordered', color: 'amber' },
                      { label: 'In Stock', status: 'received', color: 'blue' },
                      { label: 'Checked Out', status: 'ready_to_install', color: 'purple' },
                      { label: 'Installed', status: 'installed', color: 'emerald' },
                    ].map(({ label, status, color }) => (
                      <div key={status} className={`bg-${color}-50 border border-${color}-200 rounded-lg p-3`}>
                        <p className={`text-xs text-${color}-600 mb-1`}>{label}</p>
                        <p className={`text-lg font-bold text-${color}-600`}>${getPartsCost(status).toFixed(0)}</p>
                        <p className="text-[10px] text-slate-500">{getPartsByStatus(status).length} items</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-1">Cost</p>
                      <p className="text-xl font-bold text-slate-900">${projTotalCost.toFixed(0)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-1">Retail</p>
                      <p className="text-xl font-bold text-slate-900">${projTotalRetail.toFixed(0)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-4">
                      <p className="text-xs text-emerald-600 mb-1">Margin</p>
                      <p className="text-xl font-bold text-emerald-600">${(projTotalRetail - projTotalCost).toFixed(0)}</p>
                      <p className="text-[10px] text-slate-500">{projTotalRetail > 0 ? (((projTotalRetail - projTotalCost) / projTotalRetail) * 100).toFixed(1) : 0}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Team Size" value={teamMembers.length} sub="Active members" iconBg="bg-[#0069AF]/10" iconColor="text-[#0069AF]" />
              <StatCard icon={Timer} label="Total Hours" value={`${totalHours.toFixed(0)}h`} sub={`${timeEntries.length} entries`} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <StatCard icon={CheckCircle2} label="Tasks Completed" value={completedTasks.length} sub={`out of ${projectTasks.length} total`} color="text-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <StatCard icon={Clock} label="Active Timers" value={timeEntries.filter(e => e.is_running).length} sub="Running now" iconBg="bg-violet-50" iconColor="text-violet-600" />
            </div>

            {/* Team Performance */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0069AF]" />
                Team Performance
              </h3>
              {tasksByMember.length > 0 ? (
                <div className="space-y-4">
                  {tasksByMember.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-xs font-bold text-[#0069AF] shrink-0">
                        {member.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{member.fullName}</span>
                          <span className="text-xs text-slate-500">{member.completed}/{member.total} tasks · {member.hours.toFixed(1)}h</span>
                        </div>
                        <Progress value={member.rate} className="h-2" />
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs w-12 justify-center",
                        member.rate >= 70 ? "text-emerald-600 bg-emerald-50" : member.rate >= 40 ? "text-amber-600 bg-amber-50" : "text-slate-600"
                      )}>
                        {member.rate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">No team data available</div>
              )}
            </div>

            {/* Recent Time Entries */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0069AF]" />
                Recent Time Entries
              </h3>
              <div className="space-y-1">
                {timeEntries.slice(0, 8).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 shrink-0">
                        {(entry.user_name || entry.user_email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{entry.user_name || entry.user_email}</p>
                        <p className="text-xs text-slate-400 truncate">{entry.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-semibold text-slate-900">{((entry.duration_minutes || 0) / 60).toFixed(1)}h</p>
                      <p className="text-[10px] text-slate-400">{entry.start_time && format(new Date(entry.start_time), 'MMM d')}</p>
                    </div>
                  </div>
                ))}
                {timeEntries.length === 0 && (
                  <div className="py-8 text-center text-slate-400">No time entries</div>
                )}
              </div>
            </div>

            {/* Team Bar Chart */}
            {tasksByMember.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Tasks by Team Member</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={tasksByMember} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="total" fill="#0F2F44" radius={[4, 4, 0, 0]} name="Total" />
                    <Bar dataKey="completed" fill="#0069AF" radius={[4, 4, 0, 0]} name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

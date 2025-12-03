import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  BarChart3, PieChart, TrendingUp, Calendar, Users, Package, 
  CheckCircle2, Clock, AlertTriangle, Download, Filter, Timer,
  DollarSign, FileText, Activity, Bell, ChevronDown, ShoppingCart, Truck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line } from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const [reportType, setReportType] = useState('financial');
  const [dateRange, setDateRange] = useState('30');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['allParts'],
    queryFn: () => base44.entities.Part.list('-created_date')
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date')
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  // Filter by date range
  const startDate = subDays(new Date(), parseInt(dateRange));
  const filterByDate = (items) => items.filter(item => 
    new Date(item.created_date) >= startDate
  );

  const filteredTasks = filterByDate(tasks);
  const filteredProjects = filterByDate(projects);

  // Stats calculations
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');
  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'archived');

  // Financial calculations
  const projectParts = parts.filter(p => p.project_id);
  const stockedInventory = inventory;
  const partsInTransit = parts.filter(p => p.status === 'ordered');
  const partsToOrder = parts.filter(p => p.status === 'needed');

  const projectItemsCost = projectParts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  const projectItemsRetail = projectParts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.sell_price || p.unit_cost || 0)), 0);
  const stockedCost = stockedInventory.reduce((sum, i) => sum + ((i.quantity_in_stock || 0) * (i.unit_cost || 0)), 0);
  const stockedRetail = stockedInventory.reduce((sum, i) => sum + ((i.quantity_in_stock || 0) * (i.sell_price || i.unit_cost || 0)), 0);
  const transitCost = partsInTransit.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  const transitRetail = partsInTransit.reduce((sum, p) => sum + ((p.quantity || 1) * (p.sell_price || p.unit_cost || 0)), 0);
  const toOrderCost = partsToOrder.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  const toOrderRetail = partsToOrder.reduce((sum, p) => sum + ((p.quantity || 1) * (p.sell_price || p.unit_cost || 0)), 0);

  const totalCost = projectItemsCost + stockedCost;
  const totalRetail = projectItemsRetail + stockedRetail;
  const margin = totalRetail - totalCost;
  const marginPercent = totalRetail > 0 ? ((margin / totalRetail) * 100).toFixed(1) : 0;

  // Selected project data
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedProjectParts = parts.filter(p => p.project_id === selectedProjectId);
  const selectedCustomer = selectedProject ? customers.find(c => c.id === selectedProject.customer_id) : null;

  const getProjectPartsByStatus = (status) => selectedProjectParts.filter(p => p.status === status);
  const getPartsCostByStatus = (status) => getProjectPartsByStatus(status).reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  const getPartsRetailByStatus = (status) => getProjectPartsByStatus(status).reduce((sum, p) => sum + ((p.quantity || 1) * (p.sell_price || p.unit_cost || 0)), 0);

  const projectTotalCost = selectedProjectParts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  const projectTotalRetail = selectedProjectParts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.sell_price || p.unit_cost || 0)), 0);
  const projectMargin = projectTotalRetail - projectTotalCost;
  const projectMarginPercent = projectTotalRetail > 0 ? ((projectMargin / projectTotalRetail) * 100).toFixed(1) : 0;

  // Task status distribution
  const taskStatusData = [
    { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#94a3b8' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: '#3b82f6' },
    { name: 'Review', value: tasks.filter(t => t.status === 'review').length, color: '#f59e0b' },
    { name: 'Completed', value: completedTasks.length, color: '#22c55e' }
  ].filter(d => d.value > 0);

  // Team performance
  const tasksByMember = teamMembers.map(member => ({
    name: member.name.split(' ')[0],
    total: tasks.filter(t => t.assigned_to === member.email).length,
    completed: tasks.filter(t => t.assigned_to === member.email && t.status === 'completed').length
  })).filter(m => m.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);

  // Weekly trend
  const weeklyTrend = Array.from({ length: 4 }, (_, i) => {
    const weekStart = subDays(new Date(), (3 - i) * 7 + 7);
    const weekEnd = subDays(new Date(), (3 - i) * 7);
    const completed = tasks.filter(t => {
      if (!t.updated_date || t.status !== 'completed') return false;
      const date = new Date(t.updated_date);
      return date >= weekStart && date <= weekEnd;
    }).length;
    return { week: `Week ${i + 1}`, completed };
  });

  const renderFinancialReport = () => (
    <div className="space-y-6">
      {/* Overall Inventory & Pipeline */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Overall Inventory & Pipeline</h2>
        
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-xl border-2 border-emerald-200 p-4">
            <div className="flex items-center gap-2 text-emerald-600 text-sm mb-2">
              <Package className="w-4 h-4" />
              Project Items
            </div>
            <p className="text-2xl font-bold text-emerald-600">${projectItemsCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-500">Retail: ${projectItemsRetail.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-emerald-600">{projectParts.length} items</p>
          </div>
          
          <div className="bg-white rounded-xl border-2 border-emerald-200 p-4">
            <div className="flex items-center gap-2 text-emerald-600 text-sm mb-2">
              <Package className="w-4 h-4" />
              Stocked Inventory
            </div>
            <p className="text-2xl font-bold text-emerald-600">${stockedCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-500">Retail: ${stockedRetail.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-emerald-600">{stockedInventory.length} items</p>
          </div>
          
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-2">
              <Truck className="w-4 h-4" />
              Product in Transit
            </div>
            <p className="text-2xl font-bold text-slate-700">${transitCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-500">Retail: ${transitRetail.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-500">{partsInTransit.length} items ordered</p>
          </div>
          
          <div className="bg-white rounded-xl border-2 border-orange-200 p-4">
            <div className="flex items-center gap-2 text-orange-600 text-sm mb-2">
              <ShoppingCart className="w-4 h-4" />
              Product to be Ordered
            </div>
            <p className="text-2xl font-bold text-orange-600">${toOrderCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-500">Retail: ${toOrderRetail.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-orange-600">{partsToOrder.length} items pending</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500 mb-1">Total Cost</p>
            <p className="text-2xl font-bold text-slate-900">${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-500">{projectParts.length + stockedInventory.length} items</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500 mb-1">Total Retail Value</p>
            <p className="text-2xl font-bold text-emerald-600">${totalRetail.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-500">Potential revenue</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500 mb-1">Margin</p>
            <p className="text-2xl font-bold text-emerald-600">${margin.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-500">{marginPercent}% margin</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500 mb-1">Total Pipeline Value</p>
            <p className="text-2xl font-bold text-slate-900">${(totalRetail + transitRetail + toOrderRetail).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-500">Combined inventory value</p>
          </div>
        </div>
      </div>

      {/* Project-Specific Reporting */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Project-Specific Reporting</h2>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <label className="text-sm text-slate-500 mb-2 block">Select Project</label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => {
                const customer = customers.find(c => c.id === p.customer_id);
                return (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {customer ? `(${customer.name})` : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedProject && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedProject.name}</h3>
                <p className="text-sm text-slate-500">{selectedCustomer?.name || selectedProject.client}</p>
              </div>
              <Badge variant="outline">{selectedProjectParts.length} items</Badge>
            </div>

            <div className="grid grid-cols-5 gap-3 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-600 mb-1">To be Ordered</p>
                <p className="text-lg font-bold text-red-600">${getPartsCostByStatus('needed').toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">{getProjectPartsByStatus('needed').length} items | Retail: ${getPartsRetailByStatus('needed').toFixed(2)}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-600 mb-1">In Transit</p>
                <p className="text-lg font-bold text-amber-600">${getPartsCostByStatus('ordered').toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">{getProjectPartsByStatus('ordered').length} items | Retail: ${getPartsRetailByStatus('ordered').toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-600 mb-1">In Stock</p>
                <p className="text-lg font-bold text-blue-600">${getPartsCostByStatus('received').toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">{getProjectPartsByStatus('received').length} items | Retail: ${getPartsRetailByStatus('received').toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs text-purple-600 mb-1">Checked Out</p>
                <p className="text-lg font-bold text-purple-600">${getPartsCostByStatus('ready_to_install').toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">{getProjectPartsByStatus('ready_to_install').length} items | Retail: ${getPartsRetailByStatus('ready_to_install').toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-600 mb-1">Installed</p>
                <p className="text-lg font-bold text-emerald-600">${getPartsCostByStatus('installed').toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">{getProjectPartsByStatus('installed').length} items | Retail: ${getPartsRetailByStatus('installed').toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-1">Total Cost</p>
                <p className="text-xl font-bold text-slate-900">${projectTotalCost.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-1">Total Retail Value</p>
                <p className="text-xl font-bold text-slate-900">${projectTotalRetail.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-1">~~ Margin</p>
                <p className="text-xl font-bold text-emerald-600">${projectMargin.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{projectMarginPercent}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderActivityReport = () => (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-500" />
            Task Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {taskStatusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400">No data</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Completion Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksByMember.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {tasksByMember.map((member, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{member.name}</span>
                    <span className="text-xs text-slate-500">{member.completed}/{member.total} completed</span>
                  </div>
                  <Progress value={member.total > 0 ? (member.completed / member.total) * 100 : 0} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No team data</div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTimesheetsReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Total Hours Logged</p>
                <p className="text-3xl font-bold mt-1">{(timeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60).toFixed(1)}h</p>
              </div>
              <Clock className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Time Entries</p>
                <p className="text-3xl font-bold mt-1">{timeEntries.length}</p>
              </div>
              <FileText className="w-10 h-10 text-slate-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Active Timers</p>
                <p className="text-3xl font-bold mt-1">{timeEntries.filter(e => e.is_running).length}</p>
              </div>
              <Timer className="w-10 h-10 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {timeEntries.slice(0, 10).map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">{entry.user_name || entry.user_email}</p>
                  <p className="text-sm text-slate-500">{entry.description || 'No description'}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{((entry.duration_minutes || 0) / 60).toFixed(1)}h</p>
                  <p className="text-xs text-slate-500">{entry.start_time && format(new Date(entry.start_time), 'MMM d, yyyy')}</p>
                </div>
              </div>
            ))}
            {timeEntries.length === 0 && (
              <p className="text-center py-8 text-slate-400">No time entries</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {reportType === 'financial' ? 'Cost & Value Reporting' : 
                 reportType === 'activity' ? 'Activity Report' :
                 reportType === 'timesheets' ? 'Timesheets Report' :
                 reportType === 'overdue' ? 'Overdue Appointments' : 'Notification History'}
              </h1>
              <p className="text-slate-500 text-sm">
                {reportType === 'financial' ? 'Track inventory costs and retail values' : 
                 reportType === 'activity' ? 'View task and team activity' :
                 reportType === 'timesheets' ? 'Track time entries and hours' : 'View report details'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-56 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activity">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Activity
                  </div>
                </SelectItem>
                <SelectItem value="timesheets">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Timesheets
                  </div>
                </SelectItem>
                <SelectItem value="financial">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Financial
                  </div>
                </SelectItem>
                <SelectItem value="overdue">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Overdue Appointments
                  </div>
                </SelectItem>
                <SelectItem value="notifications">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notification History
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {reportType !== 'financial' && (
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-white">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </motion.div>

        {/* Report Content */}
        {reportType === 'financial' && renderFinancialReport()}
        {reportType === 'activity' && renderActivityReport()}
        {reportType === 'timesheets' && renderTimesheetsReport()}
        {reportType === 'overdue' && (
          <Card>
            <CardContent className="p-12 text-center text-slate-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Overdue appointments report</p>
              <p className="text-sm">Coming soon</p>
            </CardContent>
          </Card>
        )}
        {reportType === 'notifications' && (
          <Card>
            <CardContent className="p-12 text-center text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Notification history</p>
              <p className="text-sm">Coming soon</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
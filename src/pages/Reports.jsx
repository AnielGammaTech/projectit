import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  BarChart3, PieChart, TrendingUp, Calendar, Users, Package, 
  CheckCircle2, Clock, AlertTriangle, Download, Filter, Timer
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

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const [dateRange, setDateRange] = useState('30');
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
    queryKey: ['parts'],
    queryFn: () => base44.entities.Part.list('-created_date')
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
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
  const activeProjects = projects.filter(p => p.status === 'in_progress');

  // Task status distribution
  const taskStatusData = [
    { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#94a3b8' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: '#3b82f6' },
    { name: 'Review', value: tasks.filter(t => t.status === 'review').length, color: '#f59e0b' },
    { name: 'Completed', value: completedTasks.length, color: '#22c55e' }
  ].filter(d => d.value > 0);

  // Project status distribution
  const projectStatusData = [
    { name: 'Planning', value: projects.filter(p => p.status === 'planning').length, color: '#f59e0b' },
    { name: 'In Progress', value: activeProjects.length, color: '#3b82f6' },
    { name: 'On Hold', value: projects.filter(p => p.status === 'on_hold').length, color: '#94a3b8' },
    { name: 'Completed', value: projects.filter(p => p.status === 'completed').length, color: '#22c55e' }
  ].filter(d => d.value > 0);

  // Parts status
  const partsStatusData = [
    { name: 'Needed', value: parts.filter(p => p.status === 'needed').length, color: '#ef4444' },
    { name: 'Ordered', value: parts.filter(p => p.status === 'ordered').length, color: '#f59e0b' },
    { name: 'Received', value: parts.filter(p => p.status === 'received').length, color: '#3b82f6' },
    { name: 'Installed', value: parts.filter(p => p.status === 'installed').length, color: '#22c55e' }
  ].filter(d => d.value > 0);

  // Tasks by team member
  const tasksByMember = teamMembers.map(member => ({
    name: member.name.split(' ')[0],
    total: tasks.filter(t => t.assigned_to === member.email).length,
    completed: tasks.filter(t => t.assigned_to === member.email && t.status === 'completed').length
  })).filter(m => m.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);

  // Weekly task completion trend (last 4 weeks)
  const weeklyTrend = Array.from({ length: 4 }, (_, i) => {
    const weekStart = subDays(new Date(), (3 - i) * 7 + 7);
    const weekEnd = subDays(new Date(), (3 - i) * 7);
    const completed = tasks.filter(t => {
      if (!t.updated_date || t.status !== 'completed') return false;
      const date = new Date(t.updated_date);
      return date >= weekStart && date <= weekEnd;
    }).length;
    return {
      week: `Week ${i + 1}`,
      completed
    };
  });

  const totalPartsValue = parts.reduce((sum, p) => sum + ((p.unit_cost || 0) * (p.quantity || 1)), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
            <p className="text-slate-500 mt-1">Analytics and insights for your projects</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('TimeReport')}>
              <Button variant="outline">
                <Timer className="w-4 h-4 mr-2" />
                Time Report
              </Button>
            </Link>
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
          </div>
        </motion.div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm">Total Projects</p>
                    <p className="text-3xl font-bold mt-1">{projects.length}</p>
                    <p className="text-indigo-200 text-xs mt-1">{activeProjects.length} active</p>
                  </div>
                  <BarChart3 className="w-10 h-10 text-indigo-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm">Tasks Completed</p>
                    <p className="text-3xl font-bold mt-1">{completedTasks.length}</p>
                    <p className="text-emerald-200 text-xs mt-1">{tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}% completion rate</p>
                  </div>
                  <CheckCircle2 className="w-10 h-10 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm">Parts Value</p>
                    <p className="text-3xl font-bold mt-1">${totalPartsValue.toLocaleString()}</p>
                    <p className="text-amber-200 text-xs mt-1">{parts.length} total parts</p>
                  </div>
                  <Package className="w-10 h-10 text-amber-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">Overdue Tasks</p>
                    <p className="text-3xl font-bold mt-1">{overdueTasks.length}</p>
                    <p className="text-red-200 text-xs mt-1">Need attention</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Task Status Pie Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
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
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
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
          </motion.div>

          {/* Project Status */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  Project Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={projectStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {projectStatusData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-slate-400">No data</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Trend */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
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
          </motion.div>
        </div>

        {/* Team Performance & Parts Status */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Team Performance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-500" />
                  Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasksByMember.length > 0 ? (
                  <div className="space-y-4">
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
          </motion.div>

          {/* Parts Status */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-500" />
                  Parts Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {partsStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={partsStatusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {partsStatusData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-slate-400">No parts data</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
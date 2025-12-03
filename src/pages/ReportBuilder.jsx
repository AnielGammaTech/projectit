import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  BarChart3, LineChart, PieChart, Plus, Save, Download, Mail, Calendar,
  ArrowLeft, Filter, RefreshCw, Star, Trash2, Clock, TrendingUp, Users,
  FileText, DollarSign, ListTodo, Package, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  BarChart, Bar, LineChart as ReLineChart, Line, PieChart as RePieChart, Pie,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = ['#0069AF', '#133F5C', '#74C7FF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const metricOptions = [
  { id: 'total_projects', label: 'Total Projects', icon: FileText, category: 'projects' },
  { id: 'active_projects', label: 'Active Projects', icon: FileText, category: 'projects' },
  { id: 'completed_projects', label: 'Completed Projects', icon: FileText, category: 'projects' },
  { id: 'total_tasks', label: 'Total Tasks', icon: ListTodo, category: 'tasks' },
  { id: 'completed_tasks', label: 'Completed Tasks', icon: ListTodo, category: 'tasks' },
  { id: 'overdue_tasks', label: 'Overdue Tasks', icon: Clock, category: 'tasks' },
  { id: 'total_hours', label: 'Total Hours Logged', icon: Clock, category: 'time' },
  { id: 'billable_hours', label: 'Billable Hours', icon: DollarSign, category: 'time' },
  { id: 'proposals_sent', label: 'Proposals Sent', icon: FileText, category: 'proposals' },
  { id: 'proposals_accepted', label: 'Proposals Accepted', icon: TrendingUp, category: 'proposals' },
  { id: 'proposal_value', label: 'Proposal Value', icon: DollarSign, category: 'proposals' },
  { id: 'total_customers', label: 'Total Customers', icon: Users, category: 'customers' },
  { id: 'new_customers', label: 'New Customers', icon: Users, category: 'customers' },
  { id: 'parts_ordered', label: 'Parts Ordered', icon: Package, category: 'parts' },
  { id: 'parts_value', label: 'Parts Value', icon: DollarSign, category: 'parts' },
];

const chartTypes = [
  { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { id: 'line', label: 'Line Chart', icon: LineChart },
  { id: 'pie', label: 'Pie Chart', icon: PieChart },
  { id: 'area', label: 'Area Chart', icon: TrendingUp },
];

const dateRanges = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
];

export default function ReportBuilder() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('builder');
  const [reportConfig, setReportConfig] = useState({
    name: 'New Report',
    metrics: ['total_projects', 'completed_tasks'],
    chart_type: 'bar',
    filters: {
      date_range: 'month',
      start_date: null,
      end_date: null,
      project_ids: [],
      customer_ids: [],
    }
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Fetch all data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list()
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: () => base44.entities.Part.list()
  });

  const { data: savedReports = [], refetch: refetchReports } = useQuery({
    queryKey: ['savedReports'],
    queryFn: () => base44.entities.SavedReport.list('-created_date')
  });

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (reportConfig.filters.date_range) {
      case 'today': return { start: now, end: now };
      case 'week': return { start: subDays(now, 7), end: now };
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'year': return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom': return {
        start: reportConfig.filters.start_date ? new Date(reportConfig.filters.start_date) : subMonths(now, 1),
        end: reportConfig.filters.end_date ? new Date(reportConfig.filters.end_date) : now
      };
      default: return { start: startOfMonth(now), end: now };
    }
  };

  // Calculate metrics
  const calculateMetrics = () => {
    const { start, end } = getDateRange();
    const inRange = (date) => {
      if (!date) return false;
      const d = new Date(date);
      return d >= start && d <= end;
    };

    const filteredProjects = projects.filter(p => inRange(p.created_date));
    const filteredTasks = tasks.filter(t => inRange(t.created_date));
    const filteredTime = timeEntries.filter(t => inRange(t.start_time));
    const filteredProposals = proposals.filter(p => inRange(p.created_date));
    const filteredCustomers = customers.filter(c => inRange(c.created_date));
    const filteredParts = parts.filter(p => inRange(p.created_date));

    return {
      total_projects: projects.length,
      active_projects: projects.filter(p => p.status === 'planning' || p.status === 'in_progress').length,
      completed_projects: projects.filter(p => p.status === 'completed').length,
      total_tasks: tasks.length,
      completed_tasks: tasks.filter(t => t.status === 'completed').length,
      overdue_tasks: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
      total_hours: Math.round(timeEntries.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) / 60),
      billable_hours: Math.round(timeEntries.filter(t => t.billing_status !== 'excluded').reduce((sum, t) => sum + (t.duration_minutes || 0), 0) / 60),
      proposals_sent: proposals.filter(p => p.status !== 'draft').length,
      proposals_accepted: proposals.filter(p => p.status === 'approved').length,
      proposal_value: proposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.total || 0), 0),
      total_customers: customers.filter(c => c.is_company).length,
      new_customers: filteredCustomers.filter(c => c.is_company).length,
      parts_ordered: parts.filter(p => p.status !== 'needed').length,
      parts_value: parts.reduce((sum, p) => sum + ((p.unit_cost || 0) * (p.quantity || 1)), 0),
    };
  };

  const metrics = calculateMetrics();

  // Generate chart data
  const generateChartData = () => {
    return reportConfig.metrics.map(metricId => {
      const metric = metricOptions.find(m => m.id === metricId);
      return {
        name: metric?.label || metricId,
        value: metrics[metricId] || 0
      };
    });
  };

  const chartData = generateChartData();

  const toggleMetric = (metricId) => {
    setReportConfig(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter(m => m !== metricId)
        : [...prev.metrics, metricId]
    }));
  };

  const handleSaveReport = async (name) => {
    const reportData = {
      name,
      report_type: 'custom',
      metrics: reportConfig.metrics,
      chart_type: reportConfig.chart_type,
      filters: reportConfig.filters,
    };
    await base44.entities.SavedReport.create(reportData);
    refetchReports();
    setShowSaveModal(false);
  };

  const loadReport = (report) => {
    setReportConfig({
      name: report.name,
      metrics: report.metrics || [],
      chart_type: report.chart_type || 'bar',
      filters: report.filters || { date_range: 'month' }
    });
    setSelectedReport(report);
    setActiveTab('builder');
  };

  const exportCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = chartData.map(d => [d.name, d.value]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportConfig.name || 'report'}.csv`;
    a.click();
  };

  const renderChart = () => {
    if (chartData.length === 0) return null;

    switch (reportConfig.chart_type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0069AF">
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ReLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#0069AF" strokeWidth={2} />
            </ReLineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RePieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={150}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="value" stroke="#0069AF" fill="#74C7FF" />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <Link to={createPageUrl('Reports')} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Reports
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#0069AF] shadow-lg shadow-[#0069AF]/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Report Builder</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setShowSaveModal(true)} className="bg-[#0069AF] hover:bg-[#133F5C]">
              <Save className="w-4 h-4 mr-2" />
              Save Report
            </Button>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="builder" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Star className="w-4 h-4" />
              Saved Reports ({savedReports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Config Panel */}
              <div className="space-y-6">
                {/* Date Range */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date Range
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={reportConfig.filters.date_range}
                      onValueChange={(v) => setReportConfig(p => ({ ...p, filters: { ...p.filters, date_range: v } }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dateRanges.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {reportConfig.filters.date_range === 'custom' && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start">
                              {reportConfig.filters.start_date ? format(new Date(reportConfig.filters.start_date), 'MMM d') : 'Start'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={reportConfig.filters.start_date ? new Date(reportConfig.filters.start_date) : undefined}
                              onSelect={(d) => setReportConfig(p => ({ ...p, filters: { ...p.filters, start_date: d } }))}
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start">
                              {reportConfig.filters.end_date ? format(new Date(reportConfig.filters.end_date), 'MMM d') : 'End'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={reportConfig.filters.end_date ? new Date(reportConfig.filters.end_date) : undefined}
                              onSelect={(d) => setReportConfig(p => ({ ...p, filters: { ...p.filters, end_date: d } }))}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Chart Type */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Chart Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {chartTypes.map(ct => {
                        const Icon = ct.icon;
                        return (
                          <button
                            key={ct.id}
                            onClick={() => setReportConfig(p => ({ ...p, chart_type: ct.id }))}
                            className={cn(
                              "p-3 rounded-lg border-2 text-center transition-all",
                              reportConfig.chart_type === ct.id
                                ? "border-[#0069AF] bg-blue-50"
                                : "border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <Icon className="w-5 h-5 mx-auto mb-1 text-slate-600" />
                            <span className="text-xs">{ct.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Metrics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Select Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-80 overflow-y-auto">
                    <div className="space-y-2">
                      {metricOptions.map(metric => {
                        const Icon = metric.icon;
                        return (
                          <label
                            key={metric.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              reportConfig.metrics.includes(metric.id) ? "bg-blue-50" : "hover:bg-slate-50"
                            )}
                          >
                            <Checkbox
                              checked={reportConfig.metrics.includes(metric.id)}
                              onCheckedChange={() => toggleMetric(metric.id)}
                            />
                            <Icon className="w-4 h-4 text-slate-500" />
                            <span className="text-sm">{metric.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Preview */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Preview</span>
                      <Badge variant="outline">{dateRanges.find(r => r.id === reportConfig.filters.date_range)?.label}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportConfig.metrics.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-slate-400">
                        Select metrics to generate chart
                      </div>
                    ) : (
                      renderChart()
                    )}

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                      {reportConfig.metrics.slice(0, 4).map(metricId => {
                        const metric = metricOptions.find(m => m.id === metricId);
                        const Icon = metric?.icon || BarChart3;
                        return (
                          <div key={metricId} className="text-center">
                            <Icon className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                            <p className="text-2xl font-bold text-slate-900">
                              {metricId.includes('value') ? `$${metrics[metricId]?.toLocaleString()}` : metrics[metricId]}
                            </p>
                            <p className="text-xs text-slate-500">{metric?.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <div className="grid gap-4">
              {savedReports.length === 0 ? (
                <Card className="p-12 text-center">
                  <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No saved reports</h3>
                  <p className="text-slate-500">Create and save reports to access them here</p>
                </Card>
              ) : (
                savedReports.map(report => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">{report.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{report.chart_type}</Badge>
                            <span className="text-xs text-slate-500">
                              {report.metrics?.length || 0} metrics
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => loadReport(report)}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await base44.entities.SavedReport.delete(report.id);
                              refetchReports();
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Modal */}
        <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Report Name</Label>
                <Input
                  value={reportConfig.name}
                  onChange={(e) => setReportConfig(p => ({ ...p, name: e.target.value }))}
                  placeholder="Monthly Summary"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowSaveModal(false)}>Cancel</Button>
                <Button onClick={() => handleSaveReport(reportConfig.name)} className="bg-[#0069AF] hover:bg-[#133F5C]">
                  Save Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
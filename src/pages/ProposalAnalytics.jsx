import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Eye, CheckCircle2, XCircle, Clock, DollarSign, 
  FileText, Users, Calendar, ArrowLeft, Filter, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, subDays, subMonths, differenceInDays, differenceInHours } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4'];

export default function ProposalAnalytics() {
  const [dateRange, setDateRange] = useState('30');

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date')
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['proposalActivities'],
    queryFn: () => base44.entities.ProposalActivity.list('-created_date')
  });

  // Filter by date range
  const cutoffDate = subDays(new Date(), parseInt(dateRange));
  const filteredProposals = proposals.filter(p => new Date(p.created_date) >= cutoffDate);

  // Calculate metrics
  const totalProposals = filteredProposals.length;
  const sentProposals = filteredProposals.filter(p => p.status !== 'draft');
  const approvedProposals = filteredProposals.filter(p => p.status === 'approved');
  const rejectedProposals = filteredProposals.filter(p => p.status === 'rejected');
  const viewedProposals = filteredProposals.filter(p => ['viewed', 'approved', 'rejected', 'changes_requested'].includes(p.status));
  const pendingProposals = filteredProposals.filter(p => ['sent', 'viewed'].includes(p.status));

  const acceptanceRate = sentProposals.length > 0 
    ? ((approvedProposals.length / sentProposals.length) * 100).toFixed(1) 
    : 0;
  const rejectionRate = sentProposals.length > 0 
    ? ((rejectedProposals.length / sentProposals.length) * 100).toFixed(1) 
    : 0;
  const viewRate = sentProposals.length > 0 
    ? ((viewedProposals.length / sentProposals.length) * 100).toFixed(1) 
    : 0;

  const totalRevenue = approvedProposals.reduce((sum, p) => sum + (p.total || 0), 0);
  const pendingRevenue = pendingProposals.reduce((sum, p) => sum + (p.total || 0), 0);
  const avgProposalValue = totalProposals > 0 
    ? filteredProposals.reduce((sum, p) => sum + (p.total || 0), 0) / totalProposals 
    : 0;

  // Calculate average response time (from sent to approved/rejected)
  const responseTimes = filteredProposals
    .filter(p => p.sent_date && (p.signed_date || p.status === 'rejected'))
    .map(p => {
      const sentDate = new Date(p.sent_date);
      const responseDate = p.signed_date ? new Date(p.signed_date) : new Date(p.updated_date);
      return differenceInHours(responseDate, sentDate);
    });
  const avgResponseTime = responseTimes.length > 0 
    ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 24).toFixed(1) 
    : 0;

  // Status distribution for pie chart
  const statusData = [
    { name: 'Approved', value: approvedProposals.length, color: '#22c55e' },
    { name: 'Rejected', value: rejectedProposals.length, color: '#ef4444' },
    { name: 'Pending', value: pendingProposals.length, color: '#f59e0b' },
    { name: 'Draft', value: filteredProposals.filter(p => p.status === 'draft').length, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  // Monthly trends
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = subMonths(new Date(), i);
    const monthEnd = subMonths(new Date(), i - 1);
    const monthProposals = proposals.filter(p => {
      const created = new Date(p.created_date);
      return created >= monthStart && created < monthEnd;
    });
    monthlyData.push({
      month: format(monthStart, 'MMM'),
      total: monthProposals.length,
      approved: monthProposals.filter(p => p.status === 'approved').length,
      rejected: monthProposals.filter(p => p.status === 'rejected').length,
      revenue: monthProposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.total || 0), 0)
    });
  }

  // Revenue by salesperson
  const salespersonData = {};
  filteredProposals.forEach(p => {
    const name = p.created_by_name || 'Unknown';
    if (!salespersonData[name]) {
      salespersonData[name] = { name, total: 0, approved: 0, revenue: 0 };
    }
    salespersonData[name].total++;
    if (p.status === 'approved') {
      salespersonData[name].approved++;
      salespersonData[name].revenue += p.total || 0;
    }
  });
  const salespersonChartData = Object.values(salespersonData).sort((a, b) => b.revenue - a.revenue);

  // Recent activity
  const recentActivities = activities.slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Proposals')} className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#133F5C]">Proposal Analytics</h1>
              <p className="text-slate-500">Track performance and insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
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
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <MetricCard
            title="Total Proposals"
            value={totalProposals}
            icon={FileText}
            color="bg-blue-500"
          />
          <MetricCard
            title="Acceptance Rate"
            value={`${acceptanceRate}%`}
            icon={CheckCircle2}
            color="bg-emerald-500"
            subtitle={`${approvedProposals.length} approved`}
          />
          <MetricCard
            title="Rejection Rate"
            value={`${rejectionRate}%`}
            icon={XCircle}
            color="bg-red-500"
            subtitle={`${rejectedProposals.length} rejected`}
          />
          <MetricCard
            title="View Rate"
            value={`${viewRate}%`}
            icon={Eye}
            color="bg-amber-500"
            subtitle={`${viewedProposals.length} viewed`}
          />
          <MetricCard
            title="Avg Response Time"
            value={`${avgResponseTime} days`}
            icon={Clock}
            color="bg-purple-500"
          />
          <MetricCard
            title="Revenue Won"
            value={`$${(totalRevenue / 1000).toFixed(1)}k`}
            icon={DollarSign}
            color="bg-emerald-600"
            subtitle={`$${(pendingRevenue / 1000).toFixed(1)}k pending`}
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="approved" name="Approved" fill="#22c55e" />
                    <Bar dataKey="rejected" name="Rejected" fill="#ef4444" />
                    <Bar dataKey="total" name="Total" fill="#94a3b8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trend & Salesperson Performance */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#0069AF" 
                      fill="#0069AF" 
                      fillOpacity={0.2}
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Salesperson Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance by Salesperson</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {salespersonChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salespersonChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#0069AF" name="Revenue Won" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Top Proposals */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentActivities.length > 0 ? recentActivities.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className={`p-1.5 rounded-full ${
                      activity.action === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                      activity.action === 'rejected' ? 'bg-red-100 text-red-600' :
                      activity.action === 'viewed' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {activity.action === 'approved' ? <CheckCircle2 className="w-4 h-4" /> :
                       activity.action === 'rejected' ? <XCircle className="w-4 h-4" /> :
                       activity.action === 'viewed' ? <Eye className="w-4 h-4" /> :
                       <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 capitalize">{activity.action.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-500">{activity.actor_name || activity.actor_email}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {format(new Date(activity.created_date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                )) : (
                  <p className="text-center text-slate-400 py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Proposals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Proposals by Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {filteredProposals
                  .sort((a, b) => (b.total || 0) - (a.total || 0))
                  .slice(0, 10)
                  .map((proposal, idx) => (
                    <Link 
                      key={proposal.id} 
                      to={createPageUrl('ProposalEditor') + `?id=${proposal.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-slate-400 w-6">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{proposal.title}</p>
                        <p className="text-xs text-slate-500">{proposal.customer_name}</p>
                      </div>
                      <Badge className={
                        proposal.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        proposal.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {proposal.status}
                      </Badge>
                      <span className="text-sm font-bold text-slate-900">
                        ${(proposal.total || 0).toLocaleString()}
                      </span>
                    </Link>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-100 p-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color} text-white`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </motion.div>
  );
}
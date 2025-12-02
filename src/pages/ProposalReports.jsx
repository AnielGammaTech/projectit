import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, TrendingUp, DollarSign, Users, FileText, 
  Calendar, Download, CheckCircle2, XCircle, Clock, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#0069AF', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

export default function ProposalReports() {
  const [dateRange, setDateRange] = useState('6months');

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date')
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '1month': return subMonths(now, 1);
      case '3months': return subMonths(now, 3);
      case '6months': return subMonths(now, 6);
      case '12months': return subMonths(now, 12);
      default: return subMonths(now, 6);
    }
  };

  const filteredProposals = proposals.filter(p => {
    const createdDate = new Date(p.created_date);
    return createdDate >= getDateFilter();
  });

  // Summary Stats
  const stats = {
    total: filteredProposals.length,
    totalValue: filteredProposals.reduce((sum, p) => sum + (p.total || 0), 0),
    approved: filteredProposals.filter(p => p.status === 'approved').length,
    approvedValue: filteredProposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.total || 0), 0),
    pending: filteredProposals.filter(p => ['sent', 'viewed'].includes(p.status)).length,
    pendingValue: filteredProposals.filter(p => ['sent', 'viewed'].includes(p.status)).reduce((sum, p) => sum + (p.total || 0), 0),
    rejected: filteredProposals.filter(p => p.status === 'rejected').length,
    conversionRate: filteredProposals.filter(p => p.status !== 'draft').length > 0
      ? Math.round((filteredProposals.filter(p => p.status === 'approved').length / filteredProposals.filter(p => p.status !== 'draft').length) * 100)
      : 0,
    avgDealSize: filteredProposals.filter(p => p.status === 'approved').length > 0
      ? filteredProposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.total || 0), 0) / filteredProposals.filter(p => p.status === 'approved').length
      : 0
  };

  // Status Distribution
  const statusData = [
    { name: 'Approved', value: filteredProposals.filter(p => p.status === 'approved').length, color: '#10b981' },
    { name: 'Pending', value: filteredProposals.filter(p => ['sent', 'viewed'].includes(p.status)).length, color: '#0069AF' },
    { name: 'Draft', value: filteredProposals.filter(p => p.status === 'draft').length, color: '#94a3b8' },
    { name: 'Rejected', value: filteredProposals.filter(p => p.status === 'rejected').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Monthly Trend
  const getMonthlyData = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));
      const monthProposals = proposals.filter(p => {
        const date = new Date(p.created_date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });
      months.push({
        month: format(monthStart, 'MMM'),
        created: monthProposals.length,
        approved: monthProposals.filter(p => p.status === 'approved').length,
        value: monthProposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.total || 0), 0) / 1000
      });
    }
    return months;
  };

  // Top Customers
  const topCustomers = customers
    .map(c => ({
      name: c.name,
      company: c.company,
      proposals: proposals.filter(p => p.customer_email === c.email).length,
      value: proposals.filter(p => p.customer_email === c.email && p.status === 'approved').reduce((sum, p) => sum + (p.total || 0), 0)
    }))
    .filter(c => c.proposals > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const exportReport = () => {
    const headers = ['Proposal #', 'Title', 'Customer', 'Status', 'Total', 'Created Date', 'Valid Until'];
    const rows = filteredProposals.map(p => [
      p.proposal_number,
      p.title,
      p.customer_name,
      p.status,
      p.total || 0,
      format(new Date(p.created_date), 'yyyy-MM-dd'),
      p.valid_until || ''
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposals-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to={createPageUrl('Proposals')} className="inline-flex items-center text-[#0069AF] hover:text-[#133F5C] mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Proposals
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Proposal Reports</h1>
            <p className="text-slate-500 mt-1">Analytics and insights for your proposals</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Proposals', value: stats.total, icon: FileText, color: 'bg-slate-100 text-slate-600' },
            { label: 'Total Value', value: `$${stats.totalValue.toLocaleString()}`, icon: DollarSign, color: 'bg-amber-100 text-amber-600' },
            { label: 'Won Deals', value: stats.approved, subtext: `$${stats.approvedValue.toLocaleString()}`, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
            { label: 'Conversion Rate', value: `${stats.conversionRate}%`, subtext: `Avg: $${Math.round(stats.avgDealSize).toLocaleString()}`, icon: TrendingUp, color: 'bg-blue-100 text-blue-600' },
          ].map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl border border-slate-100 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl", metric.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                    <p className="text-xs text-slate-500">{metric.label}</p>
                    {metric.subtext && <p className="text-xs text-slate-400">{metric.subtext}</p>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-6"
          >
            <h3 className="font-semibold text-slate-900 mb-4">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getMonthlyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" name="Created" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 p-6"
          >
            <h3 className="font-semibold text-slate-900 mb-4">Status Distribution</h3>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-600">{item.name}</span>
                    <span className="text-sm font-medium text-slate-900 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Revenue Trend & Top Customers */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 p-6"
          >
            <h3 className="font-semibold text-slate-900 mb-4">Revenue Trend (Approved, $K)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getMonthlyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`$${value}K`, 'Revenue']} />
                <Line type="monotone" dataKey="value" stroke="#0069AF" strokeWidth={2} dot={{ fill: '#0069AF' }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Top Customers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-100 p-6"
          >
            <h3 className="font-semibold text-slate-900 mb-4">Top Customers by Value</h3>
            <div className="space-y-3">
              {topCustomers.length > 0 ? topCustomers.map((customer, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-[#0069AF] font-semibold text-sm">
                      {customer.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{customer.name}</p>
                      <p className="text-xs text-slate-500">{customer.proposals} proposals</p>
                    </div>
                  </div>
                  <p className="font-semibold text-emerald-600">${customer.value.toLocaleString()}</p>
                </div>
              )) : (
                <p className="text-center text-slate-500 py-8">No customer data yet</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
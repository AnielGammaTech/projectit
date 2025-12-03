import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  DollarSign, Clock, Package, CheckCircle2, Send, AlertCircle,
  FileText, Building2, Filter, Search, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const billingStatusConfig = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-600', icon: Clock },
  ready_to_bill: { label: 'Ready to Bill', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  invoiced: { label: 'Invoiced', color: 'bg-blue-100 text-blue-700', icon: Send },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
};

export default function Billing() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: timeEntries = [], refetch: refetchTime } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date')
  });

  const { data: parts = [], refetch: refetchParts } = useQuery({
    queryKey: ['allParts'],
    queryFn: () => base44.entities.Part.list('-created_date')
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  // Filter items
  const filteredTime = timeEntries.filter(e => {
    const matchesStatus = statusFilter === 'all' || (e.billing_status || 'pending') === statusFilter;
    const matchesProject = projectFilter === 'all' || e.project_id === projectFilter;
    return matchesStatus && matchesProject;
  });

  const filteredParts = parts.filter(p => {
    const matchesStatus = statusFilter === 'all' || (p.billing_status || 'pending') === statusFilter;
    const matchesProject = projectFilter === 'all' || p.project_id === projectFilter;
    const matchesSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesProject && matchesSearch;
  });

  // Calculate totals
  const totalTimeMinutes = filteredTime.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const totalTimeHours = (totalTimeMinutes / 60).toFixed(1);
  const totalPartsCost = filteredParts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);

  // Ready to bill counts
  const readyToBillTime = timeEntries.filter(e => e.billing_status === 'ready_to_bill');
  const readyToBillParts = parts.filter(p => p.billing_status === 'ready_to_bill');
  const readyToBillTotal = readyToBillTime.length + readyToBillParts.length;

  // Invoice summary
  const invoicedTime = timeEntries.filter(e => e.billing_status === 'invoiced');
  const invoicedParts = parts.filter(p => p.billing_status === 'invoiced');
  const paidTime = timeEntries.filter(e => e.billing_status === 'paid');
  const paidParts = parts.filter(p => p.billing_status === 'paid');

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const handleTimeStatusChange = async (entryId, status) => {
    await base44.entities.TimeEntry.update(entryId, { billing_status: status });
    refetchTime();
  };

  const handlePartStatusChange = async (partId, status) => {
    await base44.entities.Part.update(partId, { billing_status: status });
    refetchParts();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Billing Overview</h1>
            <p className="text-slate-500 mt-1">Track billable time and materials across all projects</p>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-slate-500">Total Time</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalTimeHours}h</p>
            <p className="text-sm text-slate-500 mt-1">{filteredTime.length} entries</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-slate-500">Parts Cost</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">${totalPartsCost.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">{filteredParts.length} items</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-white/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-sm text-white/80">Ready to Bill</span>
            </div>
            <p className="text-3xl font-bold">{readyToBillTotal}</p>
            <p className="text-sm text-white/80 mt-1">items pending invoice</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl p-5 text-white"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-white/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-sm text-white/80">Paid</span>
            </div>
            <p className="text-3xl font-bold">{paidTime.length + paidParts.length}</p>
            <p className="text-sm text-white/80 mt-1">completed items</p>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ready_to_bill">Ready to Bill</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Time Entries */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-slate-100 mb-6 overflow-hidden"
        >
          <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Time Entries</h2>
                <p className="text-sm text-slate-500">{filteredTime.length} entries</p>
              </div>
            </div>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {filteredTime.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No time entries found</p>
              </div>
            ) : (
              filteredTime.slice(0, 20).map((entry) => {
                const status = billingStatusConfig[entry.billing_status || 'pending'];
                const StatusIcon = status.icon;
                return (
                  <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", status.color)}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{entry.user_name || entry.user_email}</p>
                        <Link 
                          to={createPageUrl('ProjectDetail') + `?id=${entry.project_id}`}
                          className="text-sm text-[#0069AF] hover:underline"
                        >
                          {getProjectName(entry.project_id)}
                        </Link>
                        <p className="text-xs text-slate-400">{entry.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{((entry.duration_minutes || 0) / 60).toFixed(1)}h</p>
                        <p className="text-xs text-slate-500">
                          {entry.start_time && format(new Date(entry.start_time), 'MMM d')}
                        </p>
                      </div>
                      <Select
                        value={entry.billing_status || 'pending'}
                        onValueChange={(v) => handleTimeStatusChange(entry.id, v)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="ready_to_bill">Ready to Bill</SelectItem>
                          <SelectItem value="invoiced">Invoiced</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Parts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
        >
          <div className="p-5 border-b bg-gradient-to-r from-amber-50 to-orange-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Parts & Materials</h2>
                <p className="text-sm text-slate-500">{filteredParts.length} items</p>
              </div>
            </div>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {filteredParts.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No parts found</p>
              </div>
            ) : (
              filteredParts.slice(0, 20).map((part) => {
                const status = billingStatusConfig[part.billing_status || 'pending'];
                const StatusIcon = status.icon;
                const total = (part.quantity || 1) * (part.unit_cost || 0);
                return (
                  <div key={part.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", status.color)}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{part.name}</p>
                        <Link 
                          to={createPageUrl('ProjectDetail') + `?id=${part.project_id}`}
                          className="text-sm text-[#0069AF] hover:underline"
                        >
                          {getProjectName(part.project_id)}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {part.quantity || 1} × ${(part.unit_cost || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-slate-900">${total.toFixed(2)}</p>
                        <Badge variant="outline" className="text-xs">{part.status}</Badge>
                      </div>
                      <Select
                        value={part.billing_status || 'pending'}
                        onValueChange={(v) => handlePartStatusChange(part.id, v)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="ready_to_bill">Ready to Bill</SelectItem>
                          <SelectItem value="invoiced">Invoiced</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
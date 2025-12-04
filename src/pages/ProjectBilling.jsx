import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Clock, Package, DollarSign, FileText, 
  CheckCircle2, Send, AlertCircle, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';

const billingStatusConfig = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-600', icon: Clock },
  ready_to_bill: { label: 'Ready to Bill', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  invoiced: { label: 'Invoiced', color: 'bg-blue-100 text-blue-700', icon: Send },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
};

export default function ProjectBilling() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: timeEntries = [], refetch: refetchTime } = useQuery({
    queryKey: ['timeEntries', projectId],
    queryFn: () => base44.entities.TimeEntry.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: parts = [], refetch: refetchParts } = useQuery({
    queryKey: ['parts', projectId],
    queryFn: () => base44.entities.Part.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  // Calculate totals
  const totalTimeMinutes = timeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const totalTimeHours = (totalTimeMinutes / 60).toFixed(1);
  const totalPartsCost = parts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);

  // Group by billing status
  const timeByStatus = {
    pending: timeEntries.filter(e => !e.billing_status || e.billing_status === 'pending'),
    ready_to_bill: timeEntries.filter(e => e.billing_status === 'ready_to_bill'),
    invoiced: timeEntries.filter(e => e.billing_status === 'invoiced'),
    paid: timeEntries.filter(e => e.billing_status === 'paid')
  };

  const partsByStatus = {
    pending: parts.filter(p => !p.billing_status || p.billing_status === 'pending'),
    ready_to_bill: parts.filter(p => p.billing_status === 'ready_to_bill'),
    invoiced: parts.filter(p => p.billing_status === 'invoiced'),
    paid: parts.filter(p => p.billing_status === 'paid')
  };

  const handleTimeStatusChange = async (entryId, status) => {
    await base44.entities.TimeEntry.update(entryId, { billing_status: status });
    refetchTime();
  };

  const handlePartStatusChange = async (partId, status) => {
    await base44.entities.Part.update(partId, { billing_status: status });
    refetchParts();
  };

  const handleBulkTimeStatus = async (status) => {
    for (const entry of timeByStatus.pending) {
      await base44.entities.TimeEntry.update(entry.id, { billing_status: status });
    }
    refetchTime();
  };

  const handleBulkPartStatus = async (status) => {
    for (const part of partsByStatus.pending) {
      await base44.entities.Part.update(part.id, { billing_status: status });
    }
    refetchParts();
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <ProjectNavHeader project={project} currentPage="ProjectBilling" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-sm text-slate-500">Track billable time and materials</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
            <p className="text-sm text-slate-500 mt-1">{timeEntries.length} entries</p>
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
            <p className="text-sm text-slate-500 mt-1">{parts.length} items</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-500">Ready to Bill</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">
              {timeByStatus.ready_to_bill.length + partsByStatus.ready_to_bill.length}
            </p>
            <p className="text-sm text-slate-500 mt-1">items ready</p>
          </motion.div>
        </div>

        {/* Time Entries Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 mb-6 overflow-hidden"
        >
          <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Time Entries</h2>
                <p className="text-sm text-slate-500">{totalTimeHours} hours tracked</p>
              </div>
            </div>
            {timeByStatus.pending.length > 0 && (
              <Button 
                size="sm" 
                onClick={() => handleBulkTimeStatus('ready_to_bill')}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Mark All Ready to Bill
              </Button>
            )}
          </div>
          <div className="divide-y">
            {timeEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No time entries yet</p>
              </div>
            ) : (
              timeEntries.map((entry) => {
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
                        <p className="text-sm text-slate-500">{entry.description || 'No description'}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {entry.start_time && format(new Date(entry.start_time), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{((entry.duration_minutes || 0) / 60).toFixed(1)}h</p>
                        <p className="text-xs text-slate-500">{entry.duration_minutes} min</p>
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

        {/* Parts Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
        >
          <div className="p-5 border-b bg-gradient-to-r from-amber-50 to-orange-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Parts & Materials</h2>
                <p className="text-sm text-slate-500">${totalPartsCost.toLocaleString()} total</p>
              </div>
            </div>
            {partsByStatus.pending.length > 0 && (
              <Button 
                size="sm" 
                onClick={() => handleBulkPartStatus('ready_to_bill')}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Mark All Ready to Bill
              </Button>
            )}
          </div>
          <div className="divide-y">
            {parts.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No parts added yet</p>
              </div>
            ) : (
              parts.map((part) => {
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
                        <p className="text-sm text-slate-500">
                          {part.quantity || 1} × ${(part.unit_cost || 0).toFixed(2)}
                        </p>
                        {part.part_number && (
                          <p className="text-xs text-slate-400 mt-1">#{part.part_number}</p>
                        )}
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
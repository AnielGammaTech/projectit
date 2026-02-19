import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Shield, Search, Filter, Download, ChevronDown, ChevronRight,
  User, FolderKanban, ListTodo, FileText, Package, Settings,
  DollarSign, Users, Calendar, Clock, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const categoryConfig = {
  auth: { label: 'Authentication', icon: Shield, color: 'bg-slate-100 text-slate-700' },
  project: { label: 'Projects', icon: FolderKanban, color: 'bg-indigo-100 text-indigo-700' },
  task: { label: 'Tasks', icon: ListTodo, color: 'bg-blue-100 text-blue-700' },
  proposal: { label: 'Proposals', icon: FileText, color: 'bg-emerald-100 text-emerald-700' },
  customer: { label: 'Customers', icon: Users, color: 'bg-purple-100 text-purple-700' },
  inventory: { label: 'Inventory', icon: Package, color: 'bg-amber-100 text-amber-700' },
  settings: { label: 'Settings', icon: Settings, color: 'bg-slate-100 text-slate-700' },
  user: { label: 'Users', icon: User, color: 'bg-pink-100 text-pink-700' },
  billing: { label: 'Billing', icon: DollarSign, color: 'bg-green-100 text-green-700' },
};

const actionLabels = {
  login: 'Logged in',
  logout: 'Logged out',
  project_created: 'Created project',
  project_updated: 'Updated project',
  project_deleted: 'Deleted project',
  project_archived: 'Archived project',
  task_created: 'Created task',
  task_updated: 'Updated task',
  task_completed: 'Completed task',
  task_deleted: 'Deleted task',
  proposal_created: 'Created proposal',
  proposal_updated: 'Updated proposal',
  proposal_sent: 'Sent proposal',
  proposal_approved: 'Proposal approved',
  proposal_rejected: 'Proposal rejected',
  proposal_deleted: 'Deleted proposal',
  customer_created: 'Created customer',
  customer_updated: 'Updated customer',
  customer_deleted: 'Deleted customer',
  inventory_created: 'Added inventory item',
  inventory_updated: 'Updated inventory',
  inventory_deleted: 'Deleted inventory item',
  inventory_checkout: 'Checked out inventory',
  inventory_restock: 'Restocked inventory',
  settings_updated: 'Updated settings',
  integration_enabled: 'Enabled integration',
  integration_disabled: 'Disabled integration',
  user_invited: 'Invited user',
  user_role_changed: 'Changed user role',
  permission_updated: 'Updated permissions',
  billing_status_changed: 'Changed billing status',
};

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => api.entities.AuditLog.list('-created_date', 500)
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  // Get unique users from logs
  const uniqueUsers = [...new Set(logs.map(l => l.user_email))].filter(Boolean);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !search || 
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || log.action_category === categoryFilter;
    const matchesUser = userFilter === 'all' || log.user_email === userFilter;
    
    let matchesDate = true;
    if (dateRange !== 'all' && log.created_date) {
      const logDate = new Date(log.created_date);
      const now = new Date();
      if (dateRange === 'today') {
        matchesDate = logDate.toDateString() === now.toDateString();
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = logDate >= weekAgo;
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        matchesDate = logDate >= monthAgo;
      }
    }
    
    return matchesSearch && matchesCategory && matchesUser && matchesDate;
  });

  const paginatedLogs = filteredLogs.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const exportLogs = () => {
    const csv = [
      ['Date', 'Time', 'User', 'Action', 'Category', 'Entity', 'Details'].join(','),
      ...filteredLogs.map(log => [
        log.created_date ? format(new Date(log.created_date), 'yyyy-MM-dd') : '',
        log.created_date ? format(new Date(log.created_date), 'HH:mm:ss') : '',
        log.user_name || log.user_email,
        actionLabels[log.action] || log.action,
        log.action_category,
        log.entity_name || '',
        `"${(log.details || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-[#0069AF] shadow-lg shadow-[#0069AF]/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Audit Logs</h1>
          </div>
          <p className="text-slate-500">Track all user actions and system changes</p>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border shadow-sm p-4 mb-6"
        >
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(email => (
                  <SelectItem key={email} value={email}>{email}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(categoryConfig).slice(0, 4).map(([key, config]) => {
            const count = logs.filter(l => l.action_category === key).length;
            const Icon = config.icon;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", config.color)}>
                    <Icon className="w-4 h-4" />
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

        {/* Logs Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing {paginatedLogs.length} of {filteredLogs.length} logs
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading audit logs...</div>
          ) : paginatedLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No audit logs found</div>
          ) : (
            <div className="divide-y">
              {paginatedLogs.map((log, idx) => {
                const category = categoryConfig[log.action_category] || categoryConfig.settings;
                const Icon = category.icon;
                
                return (
                  <div 
                    key={log.id || idx} 
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-lg shrink-0", category.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">
                            {actionLabels[log.action] || log.action}
                          </span>
                          {log.entity_name && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-600 truncate">{log.entity_name}</span>
                            </>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-sm text-slate-500 truncate">{log.details}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#0069AF] flex items-center justify-center text-white text-xs font-medium">
                            {getUserInitials(log.user_name)}
                          </div>
                          <span className="text-sm text-slate-600">{log.user_name || log.user_email}</span>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-slate-900">
                            {log.created_date && format(new Date(log.created_date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {log.created_date && format(new Date(log.created_date), 'h:mm a')}
                          </p>
                        </div>

                        <Eye className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600">
                Page {page + 1} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </motion.div>

        {/* Detail Modal */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Audit Log Details</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Action</p>
                    <p className="font-medium">{actionLabels[selectedLog.action] || selectedLog.action}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Category</p>
                    <Badge className={categoryConfig[selectedLog.action_category]?.color}>
                      {categoryConfig[selectedLog.action_category]?.label || selectedLog.action_category}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">User</p>
                    <p className="font-medium">{selectedLog.user_name || selectedLog.user_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Date & Time</p>
                    <p className="font-medium">
                      {selectedLog.created_date && format(new Date(selectedLog.created_date), 'PPpp')}
                    </p>
                  </div>
                </div>

                {selectedLog.entity_name && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Affected Entity</p>
                    <p className="font-medium">{selectedLog.entity_type}: {selectedLog.entity_name}</p>
                  </div>
                )}

                {selectedLog.details && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Details</p>
                    <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedLog.details}</p>
                  </div>
                )}

                {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Changes</p>
                    <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
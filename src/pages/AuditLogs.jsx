import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay, subDays } from 'date-fns';
import {
  Shield, Search, Download, ChevronDown, ChevronRight,
  User, FolderKanban, ListTodo, FileText, Package, Settings,
  DollarSign, Users, Clock, Eye, LogIn, LogOut, Navigation,
  Pencil, Plus, Trash2, CheckCircle2, Archive, PauseCircle,
  Truck, PackageCheck, Wrench, MessageSquare, Timer, File,
  Filter, X, Activity
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
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';
import { getColorForEmail, getInitials } from '@/constants/colors';

const categoryConfig = {
  auth: { label: 'Authentication', icon: Shield, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dotColor: 'bg-slate-500' },
  navigation: { label: 'Navigation', icon: Navigation, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', dotColor: 'bg-sky-500' },
  project: { label: 'Projects', icon: FolderKanban, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', dotColor: 'bg-indigo-500' },
  task: { label: 'Tasks', icon: ListTodo, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dotColor: 'bg-blue-500' },
  part: { label: 'Parts', icon: Package, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dotColor: 'bg-emerald-500' },
  note: { label: 'Notes', icon: MessageSquare, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', dotColor: 'bg-violet-500' },
  file: { label: 'Files', icon: File, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dotColor: 'bg-amber-500' },
  time: { label: 'Time', icon: Timer, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300', dotColor: 'bg-cyan-500' },
  proposal: { label: 'Proposals', icon: FileText, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dotColor: 'bg-emerald-500' },
  customer: { label: 'Customers', icon: Users, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', dotColor: 'bg-purple-500' },
  inventory: { label: 'Inventory', icon: Package, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dotColor: 'bg-amber-500' },
  settings: { label: 'Settings', icon: Settings, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dotColor: 'bg-slate-500' },
  user: { label: 'Users', icon: User, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300', dotColor: 'bg-pink-500' },
  billing: { label: 'Billing', icon: DollarSign, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', dotColor: 'bg-green-500' },
};

// Map actions to icons for the timeline
function getActionIcon(action) {
  if (action?.includes('login') || action === 'login') return LogIn;
  if (action?.includes('logout') || action === 'logout') return LogOut;
  if (action === 'page_viewed') return Eye;
  if (action?.includes('created')) return Plus;
  if (action?.includes('updated')) return Pencil;
  if (action?.includes('deleted') || action === 'delete') return Trash2;
  if (action?.includes('completed')) return CheckCircle2;
  if (action?.includes('archived')) return Archive;
  if (action?.includes('on_hold')) return PauseCircle;
  if (action?.includes('ordered')) return Truck;
  if (action?.includes('received')) return PackageCheck;
  if (action?.includes('installed') || action?.includes('ready_to_install')) return Wrench;
  return Activity;
}

// Human-readable action label
function getActionLabel(log) {
  const action = log.action;
  if (!action) return 'Unknown action';

  // Auth
  if (action === 'login') return 'Logged in';
  if (action === 'logout') return 'Logged out';
  if (action === 'login_new_device') return 'Logged in from new device';

  // Navigation
  if (action === 'page_viewed') return `Viewed ${log.entity_name || 'page'}`;

  // Entity actions — build from action string
  const parts = action.split('_');
  if (parts.length >= 2) {
    const verb = parts[parts.length - 1];
    const verbMap = {
      created: 'Created',
      updated: 'Updated',
      deleted: 'Deleted',
      completed: 'Completed',
      archived: 'Archived',
      ordered: 'Ordered',
      received: 'Received',
      installed: 'Installed',
    };
    const humanVerb = verbMap[verb] || verb.charAt(0).toUpperCase() + verb.slice(1);
    const entityLabel = log.entity_type || parts.slice(0, -1).join(' ');
    const name = log.entity_name ? ` "${log.entity_name}"` : '';
    return `${humanVerb} ${entityLabel}${name}`;
  }

  return action.replace(/_/g, ' ');
}

// Group logs by date
function groupByDate(logs) {
  const groups = {};
  for (const log of logs) {
    if (!log.created_date) continue;
    const date = startOfDay(new Date(log.created_date));
    const key = date.toISOString();
    if (!groups[key]) groups[key] = { date, logs: [] };
    groups[key].logs.push(log);
  }
  return Object.values(groups).sort((a, b) => b.date - a.date);
}

function getDateGroupLabel(date) {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d, yyyy');
}

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => api.entities.AuditLog.list('-created_date', 2000),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  // Show only real team members (not system accounts like Auto-send, QuoteIT API)
  const uniqueUsers = useMemo(() => {
    return teamMembers
      .filter(m => m.email && m.name)
      .map(m => ({ email: m.email, name: m.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
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
          matchesDate = isToday(logDate);
        } else if (dateRange === 'yesterday') {
          matchesDate = isYesterday(logDate);
        } else if (dateRange === 'week') {
          matchesDate = logDate >= subDays(now, 7);
        } else if (dateRange === 'month') {
          matchesDate = logDate >= subDays(now, 30);
        }
      }

      return matchesSearch && matchesCategory && matchesUser && matchesDate;
    });
  }, [logs, search, categoryFilter, userFilter, dateRange]);

  // Group for timeline
  const dateGroups = useMemo(() => groupByDate(filteredLogs), [filteredLogs]);

  // Activity summary for selected user (or all)
  const summary = useMemo(() => {
    const todayLogs = logs.filter(l => l.created_date && isToday(new Date(l.created_date)));
    const relevantLogs = userFilter !== 'all'
      ? todayLogs.filter(l => l.user_email === userFilter)
      : todayLogs;

    const loginLogs = relevantLogs.filter(l => l.action === 'login' || l.action === 'login_new_device');
    const firstLogin = loginLogs.length > 0
      ? loginLogs.reduce((earliest, l) => new Date(l.created_date) < new Date(earliest.created_date) ? l : earliest)
      : null;

    const lastActivity = relevantLogs.length > 0
      ? relevantLogs.reduce((latest, l) => new Date(l.created_date) > new Date(latest.created_date) ? l : latest)
      : null;

    // Most active project
    const projectCounts = {};
    for (const l of relevantLogs) {
      const pName = l.project_name;
      if (pName) {
        projectCounts[pName] = (projectCounts[pName] || 0) + 1;
      }
    }
    const topProject = Object.entries(projectCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      firstLogin: firstLogin ? format(new Date(firstLogin.created_date), 'h:mm a') : '--',
      lastActivity: lastActivity ? format(new Date(lastActivity.created_date), 'h:mm a') : '--',
      totalActions: relevantLogs.filter(l => l.action !== 'page_viewed').length,
      pageViews: relevantLogs.filter(l => l.action === 'page_viewed').length,
      topProject: topProject ? topProject[0] : '--',
    };
  }, [logs, userFilter]);

  const exportLogs = () => {
    const csv = [
      ['Date', 'Time', 'User', 'Action', 'Category', 'Entity', 'Details', 'IP'].join(','),
      ...filteredLogs.map(log => [
        log.created_date ? format(new Date(log.created_date), 'yyyy-MM-dd') : '',
        log.created_date ? format(new Date(log.created_date), 'HH:mm:ss') : '',
        `"${log.user_name || log.user_email || ''}"`,
        `"${getActionLabel(log)}"`,
        log.action_category || '',
        `"${log.entity_name || ''}"`,
        `"${(log.details || '').replace(/"/g, '""')}"`,
        log.ip_address || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) return <TablePageSkeleton />;

  const selectedUserName = userFilter !== 'all'
    ? uniqueUsers.find(u => u.email === userFilter)?.name || userFilter
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Audit Logs</h1>
          </div>
          <p className="text-muted-foreground text-sm">Track all user actions and system changes</p>
        </motion.div>

        {/* Employee Picker + Date Range */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border shadow-sm p-4 mb-4"
        >
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-52">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <SelectValue placeholder="All Employees" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {uniqueUsers.map(u => (
                  <SelectItem key={u.email} value={u.email}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold", getColorForEmail(u.email))}>
                        {getInitials(u.name)}
                      </div>
                      {u.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn("gap-1.5", showFilters && "bg-primary/10 border-primary/30")}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {categoryFilter !== 'all' && (
                <span className="ml-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">1</span>
              )}
            </Button>

            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={exportLogs} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>

          {/* Category filter row */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-border"
            >
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    categoryFilter === 'all'
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  All
                </button>
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const count = filteredLogs.filter(l => l.action_category === key).length;
                  if (count === 0 && categoryFilter !== key) return null;
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                        categoryFilter === key
                          ? "bg-primary text-white"
                          : cn("hover:opacity-80", config.color)
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                      <span className="opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Activity Summary Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4"
        >
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <LogIn className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">First Login</span>
            </div>
            <p className="text-sm font-bold text-foreground">{summary.firstLogin}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Last Active</span>
            </div>
            <p className="text-sm font-bold text-foreground">{summary.lastActivity}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Pencil className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Actions</span>
            </div>
            <p className="text-sm font-bold text-foreground">{summary.totalActions}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Page Views</span>
            </div>
            <p className="text-sm font-bold text-foreground">{summary.pageViews}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Top Project</span>
            </div>
            <p className="text-sm font-bold text-foreground truncate">{summary.topProject}</p>
          </div>
        </motion.div>

        {/* Timeline Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            {selectedUserName
              ? <><span className="font-medium text-foreground">{selectedUserName}</span> — {filteredLogs.length} events</>
              : <>{filteredLogs.length} events</>
            }
          </p>
        </div>

        {/* Timeline Feed */}
        {dateGroups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-2xl border border-border p-12 text-center"
          >
            <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No activity found for the selected filters</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {dateGroups.map(group => (
              <motion.div
                key={group.date.toISOString()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {getDateGroupLabel(group.date)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{group.logs.length} events</span>
                </div>

                {/* Events */}
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

                  <div className="space-y-0.5">
                    {group.logs.map((log, idx) => {
                      const category = categoryConfig[log.action_category] || categoryConfig.settings;
                      const ActionIcon = getActionIcon(log.action);
                      const member = teamMembers.find(m => m.email === log.user_email);
                      const userName = member?.name || log.user_name || log.user_email?.split('@')[0] || 'System';
                      const timeStr = log.created_date ? format(new Date(log.created_date), 'h:mm:ss a') : '';
                      const relativeTime = log.created_date ? formatDistanceToNow(new Date(log.created_date), { addSuffix: true }) : '';

                      return (
                        <div
                          key={log.id || idx}
                          className="group relative flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-card cursor-pointer transition-colors"
                          onClick={() => setSelectedLog(log)}
                        >
                          {/* Timeline dot */}
                          <div className={cn(
                            "relative z-10 w-[10px] h-[10px] rounded-full mt-1.5 ring-2 ring-background flex-shrink-0",
                            category.dotColor
                          )} />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">{userName}</span>
                              <span className="text-xs text-muted-foreground">{getActionLabel(log)}</span>
                              {log.project_name && log.action !== 'page_viewed' && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {log.project_name}
                                </span>
                              )}
                            </div>
                            {log.details && log.action !== 'page_viewed' && !log.details.startsWith('Created ') && !log.details.startsWith('Deleted ') && !log.details.startsWith('Updated ') && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{log.details}</p>
                            )}
                          </div>

                          {/* Timestamp */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-muted-foreground group-hover:hidden">{relativeTime}</span>
                            <span className="text-[11px] text-muted-foreground hidden group-hover:inline">{timeStr}</span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Activity Detail
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (() => {
              const category = categoryConfig[selectedLog.action_category] || categoryConfig.settings;
              const Icon = category.icon;
              const member = teamMembers.find(m => m.email === selectedLog.user_email);
              const userName = member?.name || selectedLog.user_name || selectedLog.user_email;

              return (
                <div className="space-y-4 mt-2">
                  {/* User + Action */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold", getColorForEmail(selectedLog.user_email || ''))}>
                      {getInitials(userName)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{userName}</p>
                      <p className="text-xs text-muted-foreground">{selectedLog.user_email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Action</p>
                      <p className="text-sm font-medium text-foreground">{getActionLabel(selectedLog)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Category</p>
                      <Badge className={cn("text-[10px]", category.color)}>
                        <Icon className="w-3 h-3 mr-1" />
                        {category.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Date & Time</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedLog.created_date && format(new Date(selectedLog.created_date), 'PPpp')}
                      </p>
                    </div>
                    {selectedLog.ip_address && (
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">IP Address</p>
                        <p className="text-sm font-mono text-foreground">{selectedLog.ip_address}</p>
                      </div>
                    )}
                  </div>

                  {selectedLog.entity_name && selectedLog.action !== 'page_viewed' && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Entity</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedLog.entity_type}: {selectedLog.entity_name}
                      </p>
                    </div>
                  )}

                  {selectedLog.project_name && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Project</p>
                      <p className="text-sm font-medium text-foreground">{selectedLog.project_name}</p>
                    </div>
                  )}

                  {selectedLog.details && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Details</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg text-foreground">{selectedLog.details}</p>
                    </div>
                  )}

                  {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Changes</p>
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        {Object.entries(selectedLog.changes).map(([field, change]) => (
                          <div key={field} className="flex items-start gap-2 text-xs">
                            <span className="font-mono font-semibold text-foreground min-w-[80px]">{field}</span>
                            <span className="text-red-500 line-through truncate max-w-[140px]">
                              {typeof change.from === 'object' ? JSON.stringify(change.from) : String(change.from ?? '(empty)')}
                            </span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="text-emerald-600 truncate max-w-[140px]">
                              {typeof change.to === 'object' ? JSON.stringify(change.to) : String(change.to ?? '(empty)')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedLog.user_agent && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">User Agent</p>
                      <p className="text-[11px] text-muted-foreground font-mono break-all">{selectedLog.user_agent}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

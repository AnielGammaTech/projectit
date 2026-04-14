import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import {
  Monitor,
  Wifi,
  WifiOff,
  UserCheck,
  UserX,
  AlertTriangle,
  FileWarning,
  PackageOpen,
  CheckCircle2,
  ArrowRightLeft,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import ManageITShell from '@/components/assets/ManageITShell';
import { motion } from 'framer-motion';

function AppleLogo({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsLogo({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 12V6.5l8-1.1V12H3zm10 0V5.2l8-1.2V12h-8zM3 13h8v6.6l-8-1.1V13zm10 0h8v6l-8 1.2V13z" />
    </svg>
  );
}

function LinuxLogo({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.5 2C10.29 2 8.5 3.79 8.5 6v2.5c0 1.12.46 2.13 1.2 2.86-.2.42-.32.88-.32 1.37V15c0 1.1.9 2 2 2h2.24c1.1 0 2-.9 2-2v-2.27c0-.49-.12-.95-.32-1.37.74-.73 1.2-1.74 1.2-2.86V6c0-2.21-1.79-4-4-4zm-5 16c-1.38 0-2.5 1.12-2.5 2.5S6.12 23 7.5 23s2.5-1.12 2.5-2.5S8.88 18 7.5 18zm9 0c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" />
    </svg>
  );
}

const FADE_IN = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

function getOsIcon(os) {
  const lower = (os || '').toLowerCase();
  if (lower.includes('mac') || lower.includes('ios') || lower.includes('darwin')) {
    return { Icon: AppleLogo, label: 'Apple' };
  }
  if (lower.includes('windows') || lower.includes('win')) {
    return { Icon: WindowsLogo, label: 'Windows' };
  }
  if (lower.includes('ubuntu') || lower.includes('linux') || lower.includes('debian')) {
    return { Icon: LinuxLogo, label: 'Linux' };
  }
  return { Icon: Monitor, label: 'Other' };
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
}

function buildEmployeeDeviceMap(employees, assets, activeAssignments) {
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const map = new Map();

  for (const assignment of activeAssignments) {
    const emp = employees.find((e) => e.id === assignment.employee_id);
    if (!emp) continue;
    const asset = assetMap.get(assignment.asset_id);
    if (!asset) continue;

    const key = emp.id;
    if (!map.has(key)) {
      map.set(key, {
        name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department || '-',
        devices: [],
      });
    }
    map.get(key).devices.push(asset.name || asset.hostname || 'Unknown');
  }

  return [...map.values()].sort((a, b) => b.devices.length - a.devices.length);
}

function buildOsBreakdown(assets) {
  const counts = {};
  for (const asset of assets) {
    const os = asset.os || 'Unknown';
    counts[os] = (counts[os] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([os, count]) => ({ os, count }))
    .sort((a, b) => b.count - a.count);
}

export default function AssetDashboard() {
  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list('-created_date'),
    staleTime: 0,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
    staleTime: 0,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list('last_name'),
    staleTime: 0,
  });

  const { data: acceptances = [], isLoading: loadingAcceptances } = useQuery({
    queryKey: ['assetAcceptances'],
    queryFn: () => api.entities.AssetAcceptance.list('-created_date'),
    staleTime: 0,
  });

  if (loadingAssets || loadingAssignments || loadingEmployees || loadingAcceptances) {
    return <CardGridSkeleton />;
  }

  const activeAssignments = assignments.filter((a) => !a.returned_date);
  const assignedAssetIds = new Set(activeAssignments.map((a) => a.asset_id));
  const totalDevices = assets.length;
  const onlineCount = assets.filter((a) => a.device_active === true).length;
  const offlineCount = totalDevices - onlineCount;
  const assignedCount = assignedAssetIds.size;
  const unassignedCount = totalDevices - assignedCount;

  // Needs attention
  const offline7Days = assets.filter(
    (a) => a.device_active !== true && daysSince(a.last_contact) >= 7
  );
  const pendingAcceptances = acceptances.filter((a) => a.status === 'pending');
  const unassignedDevices = assets.filter((a) => !assignedAssetIds.has(a.id));
  const hasAttentionItems =
    offline7Days.length > 0 || pendingAcceptances.length > 0 || unassignedDevices.length > 0;

  // OS breakdown
  const osBreakdown = buildOsBreakdown(assets);
  const maxOsCount = osBreakdown.length > 0 ? osBreakdown[0].count : 1;

  // Who has what
  const employeeDevices = buildEmployeeDeviceMap(employees, assets, activeAssignments);

  // Recent activity
  const recentActivity = assignments.slice(0, 10).map((a) => {
    const asset = assets.find((ast) => ast.id === a.asset_id);
    const emp = employees.find((e) => e.id === a.employee_id);
    return {
      id: a.id,
      employeeName: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
      assetName: asset?.name || asset?.hostname || 'Unknown',
      isReturn: !!a.returned_date,
      date: a.returned_date || a.assigned_date,
    };
  });

  const statCards = [
    { label: 'Total Devices', value: totalDevices, icon: Monitor, color: 'text-foreground' },
    { label: 'Online', value: onlineCount, icon: Wifi, dot: 'bg-emerald-500' },
    { label: 'Offline', value: offlineCount, icon: WifiOff, dot: 'bg-gray-400' },
    { label: 'Assigned', value: assignedCount, icon: UserCheck, color: 'text-emerald-700 dark:text-emerald-400' },
    { label: 'Unassigned', value: unassignedCount, icon: UserX, color: 'text-muted-foreground' },
  ];

  return (
    <ManageITShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        {/* Row 1: Quick Stats */}
        <motion.div {...FADE_IN} transition={{ duration: 0.3 }} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl bg-card border border-border px-3 py-2.5"
            >
              <div className="flex items-center gap-2 mb-1">
                {card.dot ? (
                  <span className={cn('w-2 h-2 rounded-full shrink-0', card.dot)} />
                ) : (
                  <card.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-[11px] text-muted-foreground font-medium truncate">
                  {card.label}
                </span>
              </div>
              <p className={cn('text-xl font-bold', card.color || 'text-foreground')}>
                {card.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Row 2: Two panels side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT: Needs Attention */}
          <motion.div
            {...FADE_IN}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="rounded-xl bg-card border border-border p-4"
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">Needs Attention</h2>
            {!hasAttentionItems ? (
              <div className="flex items-center gap-2 py-4 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">All clear — nothing needs attention</span>
              </div>
            ) : (
              <div className="space-y-2">
                {offline7Days.length > 0 && (
                  <div className="flex items-center justify-between gap-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-sm text-foreground truncate">
                        Offline 7+ days
                      </span>
                    </div>
                    <Badge variant="destructive" className="shrink-0 text-xs">
                      {offline7Days.length}
                    </Badge>
                  </div>
                )}
                {pendingAcceptances.length > 0 && (
                  <div className="flex items-center justify-between gap-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileWarning className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-sm text-foreground truncate">
                        Unsigned consent forms
                      </span>
                    </div>
                    <Badge className="shrink-0 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100">
                      {pendingAcceptances.length}
                    </Badge>
                  </div>
                )}
                {unassignedDevices.length > 0 && (
                  <div className="flex items-center justify-between gap-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <PackageOpen className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-sm text-foreground truncate">
                        Unassigned devices
                      </span>
                    </div>
                    <Badge className="shrink-0 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100">
                      {unassignedDevices.length}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* RIGHT: Devices by OS */}
          <motion.div
            {...FADE_IN}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-xl bg-card border border-border p-4"
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">Devices by OS</h2>
            <div className="space-y-2.5">
              {osBreakdown.map(({ os, count }) => {
                const pct = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0;
                const barWidth = maxOsCount > 0 ? Math.round((count / maxOsCount) * 100) : 0;
                const { Icon } = getOsIcon(os);
                return (
                  <div key={os} className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">{os}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-emerald-700 dark:bg-emerald-800 transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {osBreakdown.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No devices found</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Row 3: Who Has What */}
        <motion.div
          {...FADE_IN}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-xl bg-card border border-border overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Who Has What</h2>
          </div>
          {employeeDevices.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">No active assignments</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[1fr_0.7fr_auto_1.5fr] gap-3 px-4 py-2 bg-muted/50">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Department</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center"># Devices</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Devices</span>
              </div>
              <div className="divide-y divide-border">
                {employeeDevices.slice(0, 10).map((row) => (
                  <div
                    key={row.name}
                    className="px-4 py-2 sm:grid sm:grid-cols-[1fr_0.7fr_auto_1.5fr] sm:gap-3 sm:items-center"
                  >
                    <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.department}</p>
                    <p className="text-xs font-semibold text-foreground text-center tabular-nums">
                      {row.devices.length}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {row.devices.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
              {employeeDevices.length > 10 && (
                <div className="px-4 py-2 border-t border-border">
                  <Link
                    to={createPageUrl('AssetEmployees')}
                    className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    View all {employeeDevices.length} employees
                  </Link>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Row 4: Recent Activity */}
        <motion.div
          {...FADE_IN}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-xl bg-card border border-border overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">No activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2">
                  <div
                    className={cn(
                      'p-1.5 rounded-lg shrink-0',
                      item.isReturn
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-emerald-100 dark:bg-emerald-900/30'
                    )}
                  >
                    {item.isReturn ? (
                      <ArrowRightLeft className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <UserCheck className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">
                      <span className="font-medium">{item.employeeName}</span>
                      {' '}
                      {item.isReturn ? 'returned' : 'assigned'}
                      {' '}
                      <span className="font-medium">{item.assetName}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">
                      {relativeTime(item.date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </ManageITShell>
  );
}

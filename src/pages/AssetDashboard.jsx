import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import {
  Monitor,
  Smartphone,
  Key,
  Car,
  Wrench,
  Box,
  AlertTriangle,
  ClipboardCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import AssetStatsCard from '@/components/assets/AssetStatsCard';
import ManageITShell from '@/components/assets/ManageITShell';

const ASSET_TYPE_CONFIG = {
  'IT Equipment': { icon: Monitor, color: 'bg-blue-500' },
  'Mobile Device': { icon: Smartphone, color: 'bg-violet-500' },
  'Software License': { icon: Key, color: 'bg-amber-500' },
  'Vehicle': { icon: Car, color: 'bg-emerald-500' },
  'Physical Tool': { icon: Wrench, color: 'bg-orange-500' },
};

function getTypeConfig(type) {
  return ASSET_TYPE_CONFIG[type] || { icon: Box, color: 'bg-slate-500' };
}

function isLicenseExpiringSoon(asset) {
  if (asset.asset_type !== 'Software License' || !asset.license_expiry_date) {
    return false;
  }
  const now = new Date();
  const expiry = new Date(asset.license_expiry_date);
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

function getOverdueReturns(assets, assignments, employees) {
  const inactiveEmployeeIds = new Set(
    employees
      .filter(e => e.suspended === true || e.active === false)
      .map(e => e.id)
  );

  return assignments
    .filter(a => !a.returned_date && inactiveEmployeeIds.has(a.employee_id))
    .map(a => {
      const asset = assets.find(asset => asset.id === a.asset_id);
      const employee = employees.find(emp => emp.id === a.employee_id);
      return { ...a, asset_name: asset?.name, employee_name: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown' };
    });
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

  if (loadingAssets || loadingAssignments || loadingEmployees) {
    return <CardGridSkeleton />;
  }

  const activeAssignments = assignments.filter(a => !a.returned_date);
  const assignedAssetIds = new Set(activeAssignments.map(a => a.asset_id));
  const assignedCount = assignedAssetIds.size;
  const returnedCount = assignments.filter(a => a.returned_date).length;
  const availableCount = assets.length - assignedCount;

  const expiringLicenses = assets.filter(isLicenseExpiringSoon);
  const overdueReturns = getOverdueReturns(assets, assignments, employees);

  // Assets grouped by type
  const assetsByType = assets.reduce((acc, asset) => {
    const type = asset.asset_type || 'Other';
    return { ...acc, [type]: (acc[type] || 0) + 1 };
  }, {});

  // Recent 5 assignments
  const recentAssignments = assignments.slice(0, 5).map(a => {
    const asset = assets.find(asset => asset.id === a.asset_id);
    const employee = employees.find(emp => emp.id === a.employee_id);
    return {
      ...a,
      asset_name: asset?.name || 'Unknown Asset',
      employee_name: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
    };
  });

  return (
    <ManageITShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <AssetStatsCard
            title="Total Assets"
            value={assets.length}
            icon={Box}
            iconColor="bg-gradient-to-br from-emerald-500 to-green-600"
            delay={0}
          />
          <AssetStatsCard
            title="Assigned"
            value={assignedCount}
            icon={ClipboardCheck}
            iconColor="bg-gradient-to-br from-blue-500 to-indigo-600"
            delay={0.05}
          />
          <AssetStatsCard
            title="Available"
            value={availableCount}
            icon={CheckCircle2}
            iconColor="bg-gradient-to-br from-emerald-500 to-green-600"
            delay={0.1}
          />
          <AssetStatsCard
            title="Returned"
            value={returnedCount}
            icon={RotateCcw}
            iconColor="bg-gradient-to-br from-violet-500 to-purple-600"
            delay={0.15}
          />
        </div>

        {/* Expiring Licenses Alert */}
        {expiringLicenses.length > 0 && (
          <Link to={createPageUrl('AssetLicenses')}>
            <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-900/20 p-3 hover:shadow-sm transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                    {expiringLicenses.length} license{expiringLicenses.length > 1 ? 's' : ''} expiring within 30 days
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/70 truncate">
                    {expiringLicenses.slice(0, 3).map(a => a.name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Overdue Returns Alert */}
        {overdueReturns.length > 0 && (
          <div className="mb-4 rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50/80 dark:bg-red-900/20 p-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 shrink-0">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-red-800 dark:text-red-300">
                  {overdueReturns.length} overdue return{overdueReturns.length > 1 ? 's' : ''} from inactive employees
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/70 truncate">
                  {overdueReturns.slice(0, 3).map(r => `${r.asset_name} (${r.employee_name})`).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Assets by Type */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Assets by Type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(assetsByType).map(([type, count]) => {
              const config = getTypeConfig(type);
              const TypeIcon = config.icon;
              const percentage = assets.length > 0 ? Math.round((count / assets.length) * 100) : 0;
              return (
                <div
                  key={type}
                  className="rounded-2xl bg-white dark:bg-card border border-border p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("p-1.5 rounded-lg shrink-0", config.color)}>
                      <TypeIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground truncate">{type}</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-2">{count}</p>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={cn("h-1.5 rounded-full transition-all duration-500", config.color)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{percentage}% of total</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Assignments */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent Assignments</h2>
          <div className="rounded-2xl bg-white dark:bg-card border border-border overflow-hidden">
            {recentAssignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 rounded-xl bg-muted mb-3">
                  <ClipboardCheck className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No assignments yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assignments will appear here once assets are assigned to employees.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto] gap-3 px-4 py-2 bg-muted/50">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Asset</p>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</p>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</p>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
                </div>
                {recentAssignments.map(a => {
                  const isReturned = !!a.returned_date;
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-3 sm:grid sm:grid-cols-[1fr_1fr_auto_auto]">
                      <div className="flex items-center gap-2 flex-1 min-w-0 sm:flex-none">
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 shrink-0 sm:hidden">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{a.asset_name}</p>
                      </div>
                      <p className="hidden sm:block text-sm text-muted-foreground truncate">{a.employee_name}</p>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {a.assigned_date ? new Date(a.assigned_date).toLocaleDateString() : ''}
                      </p>
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                        isReturned
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      )}>
                        {isReturned ? 'Returned' : 'Active'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ManageITShell>
  );
}

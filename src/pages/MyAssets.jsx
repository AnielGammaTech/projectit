import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import {
  Monitor,
  Smartphone,
  Key,
  Car,
  Wrench,
  Package,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Box,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import { cn } from '@/lib/utils';
import ManageITShell from '@/components/assets/ManageITShell';

const TYPE_ICONS = {
  'IT Equipment': Monitor,
  'Mobile Device': Smartphone,
  'Software License': Key,
  'Vehicle': Car,
  'Physical Tool': Wrench,
};

const TYPE_BADGE_STYLES = {
  'IT Equipment': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Mobile Device': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'Software License': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Vehicle': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Physical Tool': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'MMM d, yyyy');
}

function getTypeIcon(type) {
  return TYPE_ICONS[type] || Box;
}

export default function MyAssets() {
  const { user } = useAuth();

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list(),
    staleTime: 300000,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
    staleTime: 300000,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
    staleTime: 300000,
  });

  const isLoading = loadingAssets || loadingAssignments || loadingEmployees;

  const currentEmployee = employees.find(
    (e) => e.email?.toLowerCase() === user?.email?.toLowerCase()
  );

  const myAssignments = currentEmployee
    ? assignments.filter(
        (a) => a.employee_id === currentEmployee.id && !a.returned_date
      )
    : [];

  const assignedAssets = myAssignments.map((assignment) => {
    const asset = assets.find((a) => a.id === assignment.asset_id);
    return { ...assignment, asset };
  });

  return (
    <ManageITShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Loading */}
      {isLoading && <CardGridSkeleton />}

      {/* No employee profile */}
      {!isLoading && !currentEmployee && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            No employee profile found
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your email doesn't match any employee in the system. Contact your
            administrator to get your profile set up.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && currentEmployee && assignedAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            No assets currently assigned to you
          </h2>
          <p className="text-sm text-muted-foreground">
            When assets are assigned to you, they will appear here.
          </p>
        </div>
      )}

      {/* Asset cards */}
      {!isLoading && currentEmployee && assignedAssets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignedAssets.map((item) => {
            const asset = item.asset;
            if (!asset) return null;

            const TypeIcon = getTypeIcon(asset.type);
            const badgeStyle =
              TYPE_BADGE_STYLES[asset.type] ||
              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-white dark:bg-card p-5 space-y-3 shadow-warm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      <TypeIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {asset.name}
                      </h3>
                      {(asset.manufacturer || asset.model) && (
                        <p className="text-sm text-muted-foreground truncate">
                          {[asset.manufacturer, asset.model]
                            .filter(Boolean)
                            .join(' / ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      'shrink-0 text-xs font-medium border-0',
                      badgeStyle
                    )}
                  >
                    {asset.type}
                  </Badge>
                </div>

                {asset.serial_number && (
                  <p className="text-xs text-muted-foreground font-mono">
                    S/N: {asset.serial_number}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Since {formatDate(item.assigned_date)}</span>
                  </div>
                  {item.acknowledged && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Acknowledged</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </ManageITShell>
  );
}

import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
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
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/20">
          <Package className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Assets
          </h1>
          {!isLoading && currentEmployee && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {assignedAssets.length} asset{assignedAssets.length !== 1 ? 's' : ''} assigned to you
            </p>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && <CardGridSkeleton />}

      {/* No employee profile */}
      {!isLoading && !currentEmployee && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            No employee profile found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Your email doesn't match any employee in the system. Contact your
            administrator to get your profile set up.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && currentEmployee && assignedAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
            <Package className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            No assets currently assigned to you
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
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

            const TypeIcon = getTypeIcon(asset.asset_type);
            const badgeStyle =
              TYPE_BADGE_STYLES[asset.asset_type] ||
              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 shrink-0">
                      <TypeIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {asset.name}
                      </h3>
                      {(asset.manufacturer || asset.model) && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
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
                    {asset.asset_type}
                  </Badge>
                </div>

                {asset.serial_number && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    S/N: {asset.serial_number}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
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
  );
}

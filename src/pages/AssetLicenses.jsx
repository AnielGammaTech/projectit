import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import {
  Key,
  Search,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import { cn } from '@/lib/utils';
import ManageITShell from '@/components/assets/ManageITShell';

const STATUS_STYLES = {
  Available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function getExpiryInfo(expiryDate) {
  if (!expiryDate) return { label: 'No expiry', variant: 'valid' };

  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Expired', variant: 'expired' };
  }
  if (diffDays <= 30) {
    return { label: `${diffDays}d left`, variant: 'expiring' };
  }
  return {
    label: format(expiry, 'MMM d, yyyy'),
    variant: 'valid',
  };
}

const EXPIRY_STYLES = {
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expiring: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  valid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export default function AssetLicenses() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list('name'),
    staleTime: 0,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list(),
    staleTime: 0,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
    staleTime: 0,
  });

  const licenses = useMemo(() => {
    const softwareLicenses = assets.filter((a) => a.type === 'Software License');

    return softwareLicenses.map((license) => {
      const activeAssignment = assignments.find(
        (a) => a.asset_id === license.id && !a.returned_date
      );
      const assignedEmployee = activeAssignment
        ? employees.find((e) => e.id === activeAssignment.employee_id)
        : null;
      const status = activeAssignment ? 'Assigned' : 'Available';
      const expiry = getExpiryInfo(license.expiry_date);

      return { ...license, activeAssignment, assignedEmployee, status, expiry };
    });
  }, [assets, assignments, employees]);

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return licenses;

    return licenses.filter(
      (l) =>
        l.name?.toLowerCase().includes(query) ||
        l.license_key?.toLowerCase().includes(query)
    );
  }, [licenses, searchQuery]);

  if (loadingAssets) return <CardGridSkeleton />;

  return (
    <ManageITShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or license key..."
            className="pl-9"
          />
        </div>

        {/* License list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Key className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">No software licenses found</p>
            <p className="text-sm mt-1">Try adjusting your search or add a license in Asset Inventory.</p>
          </div>
        ) : (
          <div className="rounded-2xl border divide-y bg-card">
            {filtered.map((license) => {
              const ExpiryIcon = license.expiry.variant === 'valid' ? Calendar : AlertTriangle;

              return (
                <Link
                  key={license.id}
                  to={createPageUrl('AssetDetail') + '?id=' + license.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Icon */}
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    <Key className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {license.name}
                    </p>
                    {license.license_key && (
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {license.license_key}
                      </p>
                    )}
                  </div>

                  {/* Assigned employee */}
                  {license.assignedEmployee && (
                    <span className="hidden sm:inline-flex text-xs text-muted-foreground truncate max-w-[120px]">
                      {`${license.assignedEmployee.first_name || ''} ${license.assignedEmployee.last_name || ''}`.trim() || license.assignedEmployee.email || 'Unknown'}
                    </span>
                  )}

                  {/* Expiry badge */}
                  {license.expiry_date && (
                    <Badge
                      variant="secondary"
                      className={cn('text-[10px] shrink-0 gap-1', EXPIRY_STYLES[license.expiry.variant])}
                    >
                      <ExpiryIcon className="w-3 h-3" />
                      {license.expiry.label}
                    </Badge>
                  )}

                  {/* Status badge */}
                  <Badge
                    variant="secondary"
                    className={cn('text-[10px] shrink-0', STATUS_STYLES[license.status])}
                  >
                    {license.status}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ManageITShell>
  );
}

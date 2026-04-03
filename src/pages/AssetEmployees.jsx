import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  Search,
  RefreshCw,
  User,
  Briefcase,
  MapPin,
  Package,
  CloudDownload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import ManageITShell from '@/components/assets/ManageITShell';

function getStatusBadge(employee) {
  if (employee.suspended) {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">
        Suspended
      </Badge>
    );
  }
  if (employee.active === false) {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0">
        Inactive
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
      Active
    </Badge>
  );
}

export default function AssetEmployees() {
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
    staleTime: 300000,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
    staleTime: 300000,
  });

  const activeAssignmentsByEmployee = assignments
    .filter(a => !a.returned_date)
    .reduce((acc, a) => {
      const count = acc[a.employee_id] || 0;
      return { ...acc, [a.employee_id]: count + 1 };
    }, {});

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.functions.invoke('syncJumpCloudEmployees');
      const summary = result?.summary || result;
      toast.success(
        `JumpCloud sync complete: ${summary?.created ?? 0} added, ${summary?.updated ?? 0} updated, ${summary?.deactivated ?? 0} deactivated`
      );
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (error) {
      toast.error(`Sync failed: ${error.message || 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loadingEmployees || loadingAssignments) {
    return <CardGridSkeleton />;
  }

  const searchLower = search.toLowerCase();
  const filtered = search
    ? employees.filter(e => {
        const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
        const email = (e.email || '').toLowerCase();
        const dept = (e.department || '').toLowerCase();
        return (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          dept.includes(searchLower)
        );
      })
    : employees;

  const hasEmployees = employees.length > 0;
  const hasResults = filtered.length > 0;

  return (
    <ManageITShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-lg font-semibold text-foreground">
              {employees.length} employee{employees.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground">Synced from JumpCloud</p>
          </div>
          <Button
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', syncing && 'animate-spin')} />
            Sync JumpCloud
          </Button>
        </div>

        {/* Search */}
        <div className="rounded-2xl bg-card border border-border p-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Employee List */}
        {!hasEmployees && (
          <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-2xl bg-muted mb-4">
              <CloudDownload className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No employees yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Import your employee directory from JumpCloud to get started.
            </p>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <RefreshCw className={cn('w-4 h-4 mr-1', syncing && 'animate-spin')} />
              Sync JumpCloud
            </Button>
          </div>
        )}

        {hasEmployees && !hasResults && (
          <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center py-12">
            <div className="p-3 rounded-xl bg-muted mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No matching employees</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different search term.
            </p>
          </div>
        )}

        {hasResults && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(employee => {
              const assignmentCount = activeAssignmentsByEmployee[employee.id] || 0;
              const initials = `${(employee.first_name || '')[0] || ''}${(employee.last_name || '')[0] || ''}`.toUpperCase();
              return (
                <Link
                  key={employee.id}
                  to={`${createPageUrl('AssetEmployeeDetail')}?id=${employee.id}`}
                  className="rounded-2xl bg-card border border-border p-4 hover:shadow-md transition-all duration-200 block"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        {initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {employee.email}
                      </p>
                    </div>
                    {getStatusBadge(employee)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {employee.department && (
                      <span className="flex items-center gap-1 truncate">
                        <Briefcase className="w-3.5 h-3.5 shrink-0" />
                        {employee.department}
                      </span>
                    )}
                    {employee.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {employee.location}
                      </span>
                    )}
                    <div className="flex-1" />
                    {assignmentCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Package className="w-3 h-3 mr-1" />
                        {assignmentCount}
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ManageITShell>
  );
}

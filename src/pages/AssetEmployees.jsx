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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground">Employees</h1>
              <p className="text-xs text-muted-foreground">
                {employees.length} employee{employees.length !== 1 ? 's' : ''} from JumpCloud
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', syncing && 'animate-spin')} />
            Sync JumpCloud
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Employee List */}
        {!hasEmployees && (
          <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
            <CloudDownload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No employees yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Click "Sync JumpCloud" to import your employee directory.
            </p>
          </div>
        )}

        {hasEmployees && !hasResults && (
          <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
            <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No matching employees</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Try a different search term.
            </p>
          </div>
        )}

        {hasResults && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {filtered.map(employee => {
              const assignmentCount = activeAssignmentsByEmployee[employee.id] || 0;
              return (
                <Link
                  key={employee.id}
                  to={`${createPageUrl('AssetEmployeeDetail')}?id=${employee.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {employee.email}
                    </p>
                  </div>

                  <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    {employee.department && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        {employee.department}
                      </span>
                    )}
                    {employee.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {employee.location}
                      </span>
                    )}
                  </div>

                  {assignmentCount > 0 && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      <Package className="w-3 h-3 mr-1" />
                      {assignmentCount}
                    </Badge>
                  )}

                  {getStatusBadge(employee)}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

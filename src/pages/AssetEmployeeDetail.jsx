import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Briefcase,
  MapPin,
  Monitor,
  Smartphone,
  Key,
  Car,
  Wrench,
  Box,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

const ASSET_TYPE_ICONS = {
  'IT Equipment': Monitor,
  'Mobile Device': Smartphone,
  'Software License': Key,
  'Vehicle': Car,
  'Physical Tool': Wrench,
};

function getTypeIcon(type) {
  return ASSET_TYPE_ICONS[type] || Box;
}

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

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function AssignmentRow({ assignment, asset }) {
  const TypeIcon = getTypeIcon(asset?.asset_type);
  const assetName = asset?.name || 'Unknown Asset';
  const isReturned = Boolean(assignment.returned_date);

  return (
    <Link
      to={`${createPageUrl('AssetDetail')}?id=${assignment.asset_id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <div className="p-2 rounded-lg bg-muted shrink-0">
        <TypeIcon className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{assetName}</p>
        <p className="text-xs text-muted-foreground">
          {asset?.asset_type || 'Unknown Type'}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {isReturned
            ? `${formatDate(assignment.assigned_date)} - ${formatDate(assignment.returned_date)}`
            : formatDate(assignment.assigned_date)}
        </span>

        {assignment.acknowledged && (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        )}
      </div>
    </Link>
  );
}

export default function AssetEmployeeDetail() {
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get('id');

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

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list(),
    staleTime: 300000,
  });

  if (loadingEmployees || loadingAssignments || loadingAssets) {
    return <CardGridSkeleton />;
  }

  const employee = employees.find(e => e.id === employeeId);

  if (!employee) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <Link
            to={createPageUrl('AssetEmployees')}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to employees
          </Link>
          <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
            <User className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Employee not found</p>
          </div>
        </div>
      </div>
    );
  }

  const assetsById = assets.reduce((acc, a) => ({ ...acc, [a.id]: a }), {});

  const employeeAssignments = assignments.filter(a => a.employee_id === employeeId);
  const currentAssignments = employeeAssignments.filter(a => !a.returned_date);
  const pastAssignments = employeeAssignments.filter(a => a.returned_date);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Back Link */}
        <Link
          to={createPageUrl('AssetEmployees')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to employees
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">
                {employee.first_name} {employee.last_name}
              </h1>
              {getStatusBadge(employee)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {employee.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {employee.email}
                </span>
              )}
              {employee.job_title && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {employee.job_title}
                </span>
              )}
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
          </div>
        </div>

        {/* Current Assets */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Current Assets ({currentAssignments.length})
          </h2>
          {currentAssignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">No assets currently assigned</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
              {currentAssignments.map(a => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  asset={assetsById[a.asset_id]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Past Assignments */}
        {pastAssignments.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Past Assignments ({pastAssignments.length})
            </h2>
            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
              {pastAssignments.map(a => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  asset={assetsById[a.asset_id]}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

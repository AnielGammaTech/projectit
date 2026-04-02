import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Key,
  Car,
  Wrench,
  Hash,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  User,
  CheckCircle2,
  Edit2,
  Box,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import AssetModal from '@/components/assets/AssetModal';
import ManageITShell from '@/components/assets/ManageITShell';

const TYPE_ICONS = {
  'IT Equipment': Monitor,
  'Mobile Device': Smartphone,
  'Software License': Key,
  'Vehicle': Car,
  'Physical Tool': Wrench,
};

const STATUS_STYLES = {
  Available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Returned: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const CONDITION_STYLES = {
  New: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Damaged: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(value) {
  if (value == null || value === '') return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function getAssetStatus(assetId, assignments) {
  const hasActive = assignments.some(
    (a) => a.asset_id === assetId && !a.returned_date
  );
  if (hasActive) return 'Assigned';
  const hasAny = assignments.some((a) => a.asset_id === assetId);
  if (hasAny) return 'Returned';
  return 'Available';
}

function DetailField({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value}</p>
      </div>
    </div>
  );
}

function AssignmentCard({ assignment, employeeName }) {
  const isActive = !assignment.returned_date;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isActive
          ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30'
          : 'bg-card'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <User className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {employeeName || 'Unknown Employee'}
        </span>
        {isActive && (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-[10px]">
            Active
          </Badge>
        )}
        {assignment.acknowledged && (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p>Assigned: {formatDate(assignment.assigned_date)}</p>
        {assignment.returned_date && (
          <p>Returned: {formatDate(assignment.returned_date)}</p>
        )}
        {assignment.condition_at_checkout && (
          <p>Checkout condition: {assignment.condition_at_checkout}</p>
        )}
        {assignment.condition_at_return && (
          <p>Return condition: {assignment.condition_at_return}</p>
        )}
      </div>

      {assignment.notes && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          {assignment.notes}
        </p>
      )}
    </div>
  );
}

export default function AssetDetail() {
  const [searchParams] = useSearchParams();
  const assetId = searchParams.get('id');
  const [showModal, setShowModal] = useState(false);

  const queryClient = useQueryClient();

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

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
    staleTime: 300000,
  });

  const isLoading = loadingAssets || loadingAssignments;

  if (isLoading) return <CardGridSkeleton />;

  const asset = assets.find((a) => String(a.id) === String(assetId));

  if (!asset) {
    return (
      <ManageITShell>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Box className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">Asset not found</p>
            <p className="text-sm mt-1">
              The asset you are looking for does not exist or has been deleted.
            </p>
            <Link
              to={createPageUrl('AssetInventory')}
              className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to inventory
            </Link>
          </div>
        </div>
      </ManageITShell>
    );
  }

  const status = getAssetStatus(asset.id, assignments);
  const TypeIcon = TYPE_ICONS[asset.type] || Box;
  const isSoftware = asset.type === 'Software License';

  const assetAssignments = assignments
    .filter((a) => String(a.asset_id) === String(asset.id))
    .sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date));

  const employeeMap = new Map(
    employees.map((e) => [e.id, e.full_name || e.name || 'Unknown'])
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['assetAssignments'] });
  };

  return (
    <ManageITShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Back link */}
        <Link
          to={createPageUrl('AssetInventory')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inventory
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 shrink-0">
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                {asset.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <Badge
                  variant="secondary"
                  className={cn('text-[10px]', STATUS_STYLES[status])}
                >
                  {status}
                </Badge>
                {asset.type && (
                  <span className="text-xs text-muted-foreground">
                    {asset.type}
                  </span>
                )}
                {asset.condition && (
                  <Badge
                    variant="secondary"
                    className={cn('text-[10px]', CONDITION_STYLES[asset.condition])}
                  >
                    {asset.condition}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModal(true)}
            className="shrink-0"
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <DetailField icon={Hash} label="Serial Number" value={asset.serial_number} />
          <DetailField icon={Monitor} label="Model" value={asset.model} />
          <DetailField icon={Package} label="Manufacturer" value={asset.manufacturer} />
          <DetailField icon={MapPin} label="Location" value={asset.location} />
          <DetailField
            icon={Calendar}
            label="Purchase Date"
            value={formatDate(asset.purchase_date)}
          />
          <DetailField
            icon={DollarSign}
            label="Purchase Cost"
            value={formatCurrency(asset.purchase_cost)}
          />
          {isSoftware && (
            <>
              <DetailField icon={Key} label="License Key" value={asset.license_key} />
              <DetailField
                icon={Calendar}
                label="Expiry Date"
                value={formatDate(asset.expiry_date)}
              />
            </>
          )}
        </div>

        {/* Notes */}
        {asset.notes && (
          <div className="mb-6 p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Notes</h2>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {asset.notes}
            </p>
          </div>
        )}

        {/* Assignment History */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Assignment History
          </h2>
          {assetAssignments.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <User className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No assignments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assetAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  employeeName={employeeMap.get(assignment.employee_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <AssetModal
        open={showModal}
        onClose={() => setShowModal(false)}
        asset={asset}
        onSave={invalidateAll}
      />
    </ManageITShell>
  );
}

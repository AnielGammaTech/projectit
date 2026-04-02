import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  Monitor,
  Smartphone,
  Key,
  Car,
  Wrench,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Package,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AssetModal from '@/components/assets/AssetModal';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import { cn } from '@/lib/utils';

const ASSET_TYPES = [
  'IT Equipment',
  'Mobile Device',
  'Software License',
  'Vehicle',
  'Physical Tool',
];

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

function getAssetStatus(assetId, assignments) {
  const activeAssignment = assignments.find(
    (a) => a.asset_id === assetId && !a.returned_date
  );
  if (activeAssignment) return 'Assigned';
  const hasAnyAssignment = assignments.some((a) => a.asset_id === assetId);
  if (hasAnyAssignment) return 'Returned';
  return 'Available';
}

function getAssignedEmployeeId(assetId, assignments) {
  const active = assignments.find(
    (a) => a.asset_id === assetId && !a.returned_date
  );
  return active?.employee_id ?? null;
}

export default function AssetInventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, asset: null });

  const queryClient = useQueryClient();

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list(),
    staleTime: 300000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
    staleTime: 300000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list(),
    staleTime: 300000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['assetAssignments'] });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.asset) return;
    try {
      await api.entities.Asset.delete(deleteConfirm.asset.id);
      toast.success('Asset deleted');
      invalidateAll();
    } catch (error) {
      toast.error('Failed to delete asset');
    } finally {
      setDeleteConfirm({ open: false, asset: null });
    }
  };

  const openEdit = (asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingAsset(null);
    setShowModal(true);
  };

  if (loadingAssets) return <CardGridSkeleton />;

  // Build enriched list with status
  const enrichedAssets = assets.map((asset) => {
    const status = getAssetStatus(asset.id, assignments);
    const assignedEmployeeId = getAssignedEmployeeId(asset.id, assignments);
    const assignedEmployee = assignedEmployeeId
      ? employees.find((e) => e.id === assignedEmployeeId)
      : null;
    return { ...asset, status, assignedEmployee };
  });

  // Filter
  const query = searchQuery.toLowerCase();
  const filtered = enrichedAssets.filter((a) => {
    const matchesSearch =
      !query ||
      a.name?.toLowerCase().includes(query) ||
      a.serial_number?.toLowerCase().includes(query) ||
      a.model?.toLowerCase().includes(query);
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/30 shrink-0">
              <HardDrive className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground">Asset Inventory</h1>
              <p className="text-xs text-muted-foreground">{assets.length} assets</p>
            </div>
          </div>
          <Button onClick={openCreate} size="sm" className="shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            Add Asset
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, serial, or model..."
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ASSET_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="Returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Asset list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">No assets found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new asset.</p>
          </div>
        ) : (
          <div className="rounded-2xl border divide-y bg-card">
            {filtered.map((asset) => {
              const TypeIcon = TYPE_ICONS[asset.type] || HardDrive;
              return (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Type icon */}
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    <TypeIcon className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={createPageUrl('AssetDetail') + `?id=${asset.id}`}
                      className="font-medium text-sm text-foreground hover:underline truncate block"
                    >
                      {asset.name}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {[asset.manufacturer, asset.model, asset.serial_number]
                        .filter(Boolean)
                        .join(' - ') || 'No details'}
                    </p>
                  </div>

                  {/* Assigned employee */}
                  {asset.assignedEmployee && (
                    <span className="hidden sm:inline-flex text-xs text-muted-foreground truncate max-w-[120px]">
                      {asset.assignedEmployee.full_name || asset.assignedEmployee.name}
                    </span>
                  )}

                  {/* Status badge */}
                  <Badge
                    variant="secondary"
                    className={cn('text-[10px] shrink-0', STATUS_STYLES[asset.status])}
                  >
                    {asset.status}
                  </Badge>

                  {/* Condition badge */}
                  {asset.condition && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] shrink-0 hidden sm:inline-flex',
                        CONDITION_STYLES[asset.condition]
                      )}
                    >
                      {asset.condition}
                    </Badge>
                  )}

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('AssetDetail') + `?id=${asset.id}`}>
                          <Eye className="w-4 h-4 mr-2" /> View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(asset)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeleteConfirm({ open: true, asset })}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <AssetModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingAsset(null);
        }}
        asset={editingAsset}
        onSave={invalidateAll}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(v) => { if (!v) setDeleteConfirm({ open: false, asset: null }); }}
        title="Delete Asset"
        description={`Are you sure you want to delete "${deleteConfirm.asset?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

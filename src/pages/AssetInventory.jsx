import { useState, useCallback } from 'react';
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
  UserPlus,
  RotateCcw,
  RefreshCw,
  Lock,
  Unlock,
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
import AssignReturnModal from '@/components/assets/AssignReturnModal';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import { cn } from '@/lib/utils';
import ManageITShell from '@/components/assets/ManageITShell';

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
  const [assignReturnAsset, setAssignReturnAsset] = useState(null);
  const [syncing, setSyncing] = useState(false);

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

  const handleSyncDevices = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await api.functions.invoke('syncJumpCloudDevices');
      const s = result.summary;
      toast.success(`Synced ${s.total} devices: ${s.created} new, ${s.updated} updated, ${s.autoAssigned} auto-assigned`);
      invalidateAll();
    } catch (error) {
      toast.error(error?.message || 'Failed to sync JumpCloud devices');
    } finally {
      setSyncing(false);
    }
  }, [queryClient]);

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

  const toggleSyncLock = async (asset) => {
    const locked = !asset.sync_locked;
    try {
      await api.entities.Asset.update(asset.id, { sync_locked: locked });
      toast.success(locked ? 'Asset locked — sync will skip auto-assignment' : 'Asset unlocked — sync can auto-assign');
      invalidateAll();
    } catch {
      toast.error('Failed to update asset');
    }
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
    <ManageITShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-lg font-semibold text-foreground">
              {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
            </p>
            <p className="text-xs text-muted-foreground">Manage your organization's inventory</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSyncDevices}
              disabled={syncing}
              size="sm"
              variant="outline"
              className="shrink-0"
            >
              <RefreshCw className={cn('w-4 h-4 mr-1', syncing && 'animate-spin')} />
              {syncing ? 'Syncing...' : 'Sync JumpCloud'}
            </Button>
            <Button
              onClick={openCreate}
              size="sm"
              className="shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-card border border-border p-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
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
        </div>

        {/* Asset list */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-2xl bg-muted mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No assets found</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Try adjusting your filters or add a new asset.</p>
            <Button
              onClick={openCreate}
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Asset
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((asset) => {
              const TypeIcon = TYPE_ICONS[asset.type] || HardDrive;
              const typeColor = {
                'IT Equipment': 'bg-blue-500',
                'Mobile Device': 'bg-violet-500',
                'Software License': 'bg-amber-500',
                'Vehicle': 'bg-emerald-500',
                'Physical Tool': 'bg-orange-500',
              }[asset.type] || 'bg-slate-500';

              return (
                <div
                  key={asset.id}
                  className="rounded-2xl bg-card border border-border p-4 hover:shadow-md transition-all duration-200"
                >
                  {/* Top row: icon + name + actions */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn("p-2 rounded-xl shrink-0", typeColor)}>
                      <TypeIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={createPageUrl('AssetDetail') + `?id=${asset.id}`}
                        className="font-semibold text-sm text-foreground hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors truncate block"
                      >
                        {asset.name}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {[asset.manufacturer, asset.model, asset.serial_number]
                          .filter(Boolean)
                          .join(' / ') || 'No details'}
                      </p>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <Badge
                      variant="secondary"
                      className={cn('text-[10px]', STATUS_STYLES[asset.status])}
                    >
                      {asset.status}
                    </Badge>
                    {asset.condition && (
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px]', CONDITION_STYLES[asset.condition])}
                      >
                        {asset.condition}
                      </Badge>
                    )}
                    {asset.sync_locked && (
                      <Lock className="w-3 h-3 text-muted-foreground" title="Sync locked" />
                    )}
                  </div>

                  {/* Assigned employee */}
                  {asset.assignedEmployee && (
                    <p className="text-xs text-muted-foreground mb-3 truncate">
                      Assigned to{' '}
                      <span className="font-medium text-foreground">
                        {`${asset.assignedEmployee.first_name || ''} ${asset.assignedEmployee.last_name || ''}`.trim() || asset.assignedEmployee.email || 'Unknown'}
                      </span>
                    </p>
                  )}

                  {/* Actions row */}
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 text-sm px-3"
                    >
                      <Link to={createPageUrl('AssetDetail') + `?id=${asset.id}`}>
                        <Eye className="w-4 h-4 mr-1.5" />
                        View
                      </Link>
                    </Button>
                    {asset.status === 'Available' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-sm px-3 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/20"
                        onClick={() => setAssignReturnAsset(asset)}
                      >
                        <UserPlus className="w-4 h-4 mr-1.5" />
                        Assign
                      </Button>
                    )}
                    {asset.status === 'Assigned' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-sm px-3 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/20"
                        onClick={() => setAssignReturnAsset(asset)}
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        Return
                      </Button>
                    )}
                    <div className="flex-1" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleSyncLock(asset)}>
                          {asset.sync_locked
                            ? <><Unlock className="w-4 h-4 mr-2" /> Unlock Sync</>
                            : <><Lock className="w-4 h-4 mr-2" /> Lock Sync</>
                          }
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

      {/* Assign / Return modal */}
      <AssignReturnModal
        open={!!assignReturnAsset}
        onClose={() => setAssignReturnAsset(null)}
        asset={assignReturnAsset}
        employees={employees}
        assignments={assignments}
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
    </ManageITShell>
  );
}

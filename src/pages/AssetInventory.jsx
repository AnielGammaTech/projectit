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
  FileSignature,
  Copy,
  Check,
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

function AppleLogo({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function WindowsLogo({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 12V6.5l8-1.1V12H3zm10 0V5.2l8-1.2V12h-8zM3 13h8v6.6l-8-1.1V13zm10 0h8v6l-8 1.2V13z"/>
    </svg>
  );
}

function getOsIcon(asset) {
  const os = (asset.os || '').toLowerCase();
  const manufacturer = (asset.manufacturer || '').toLowerCase();
  const model = (asset.model || '').toLowerCase();

  const isApple = os.includes('mac') || os.includes('ios') || os.includes('darwin')
    || manufacturer.includes('apple') || model.includes('mac') || model.includes('iphone') || model.includes('ipad');
  const isWindows = os.includes('windows') || os.includes('win');

  if (isApple) return { Icon: AppleLogo, color: 'bg-slate-700 dark:bg-slate-600' };
  if (isWindows) return { Icon: WindowsLogo, color: 'bg-blue-600' };
  return null;
}

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
    staleTime: 0,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
    staleTime: 0,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list(),
    staleTime: 0,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => api.entities.AppSettings.list(),
    staleTime: 300000,
  });
  const consentSettings = appSettings.find(s => s.setting_key === 'consent_form') || {};
  const defaultTerms = 'I acknowledge receipt of this company asset in the condition described above. I agree to use it responsibly, report any damage or issues promptly, and return it upon request or when my employment ends.';

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

  const [consentLink, setConsentLink] = useState(null);
  const [consentCopied, setConsentCopied] = useState(false);

  const generateConsentForm = async (asset) => {
    const activeAssignment = assignments.find(a => a.asset_id === asset.id && !a.returned_date);
    const employeeId = activeAssignment?.employee_id || null;

    const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken))
      .then(buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join(''));

    try {
      await api.entities.AssetAcceptance.create({
        token_hash: tokenHash,
        assignment_id: activeAssignment?.id || null,
        asset_id: asset.id,
        employee_id: employeeId,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        condition_at_checkout: asset.condition || 'Good',
        terms_text: consentSettings.terms_text || defaultTerms,
      });

      const link = `${window.location.origin}/accept/${rawToken}`;
      setConsentLink(link);
      navigator.clipboard.writeText(link);
      setConsentCopied(true);
      setTimeout(() => setConsentCopied(false), 2000);
      toast.success('Consent form link copied to clipboard');
    } catch {
      toast.error('Failed to generate consent form');
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
              const osInfo = getOsIcon(asset);
              const FallbackIcon = TYPE_ICONS[asset.type] || HardDrive;
              const fallbackColor = {
                'IT Equipment': 'bg-blue-500',
                'Mobile Device': 'bg-violet-500',
                'Software License': 'bg-amber-500',
                'Vehicle': 'bg-emerald-500',
                'Physical Tool': 'bg-orange-500',
              }[asset.type] || 'bg-slate-500';
              const employeeName = asset.assignedEmployee
                ? `${asset.assignedEmployee.first_name || ''} ${asset.assignedEmployee.last_name || ''}`.trim() || asset.assignedEmployee.email || 'Unknown'
                : null;

              return (
                <div
                  key={asset.id}
                  className="rounded-xl bg-card border border-border hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Clickable area */}
                  <Link
                    to={createPageUrl('AssetDetail') + `?id=${asset.id}`}
                    className="block p-3 pb-0"
                  >
                    {/* Top: icon + name */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className={cn("w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white", osInfo?.color || fallbackColor)}>
                        {osInfo ? <osInfo.Icon className="w-4 h-4" /> : <FallbackIcon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate block">
                          {asset.name}
                        </span>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {[asset.model, asset.serial_number].filter(Boolean).join(' · ') || asset.type}
                        </p>
                      </div>
                    </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <Badge variant="secondary" className={cn('text-[10px]', STATUS_STYLES[asset.status])}>{asset.status}</Badge>
                    {asset.device_active != null && (
                      <span className="inline-flex items-center gap-1 text-[10px]" title={asset.last_contact ? `Last: ${new Date(asset.last_contact).toLocaleString()}` : ''}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", asset.device_active ? "bg-emerald-500" : "bg-slate-400")} />
                        <span className={asset.device_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                          {asset.device_active ? 'Online' : 'Offline'}
                        </span>
                      </span>
                    )}
                    {asset.sync_locked && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>

                  {/* Employee */}
                  {employeeName && (
                    <p className="text-[11px] text-muted-foreground mb-2 truncate">
                      Assigned to <span className="font-medium text-foreground">{employeeName}</span>
                    </p>
                  )}

                  </Link>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-2 mx-3 mb-3 border-t border-border">
                    {asset.status === 'Available' && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20" onClick={() => setAssignReturnAsset(asset)}>
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign
                      </Button>
                    )}
                    {asset.status === 'Assigned' && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20" onClick={() => setAssignReturnAsset(asset)}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Return
                      </Button>
                    )}
                    <div className="flex-1" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => generateConsentForm(asset)}>
                          <FileSignature className="w-4 h-4 mr-2" /> Generate Consent Form
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleSyncLock(asset)}>
                          {asset.sync_locked
                            ? <><Unlock className="w-4 h-4 mr-2" /> Unlock Sync</>
                            : <><Lock className="w-4 h-4 mr-2" /> Lock Sync</>
                          }
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(asset)}>
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteConfirm({ open: true, asset })}>
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

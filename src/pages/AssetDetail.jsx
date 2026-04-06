import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
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
  Shield,
  Wifi,
  ShoppingBag,
  Clock,
  MessageSquare,
  Send,
  AlertTriangle,
  Copy,
  Check,
  Link2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const NOTE_TYPE_STYLES = {
  note: { label: 'Note', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  maintenance: { label: 'Maintenance', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  incident: { label: 'Incident', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function getAssetStatus(assetId, assignments) {
  const hasActive = assignments.some(a => a.asset_id === assetId && !a.returned_date);
  if (hasActive) return 'Assigned';
  const hasAny = assignments.some(a => a.asset_id === assetId);
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

function WarrantyBanner({ asset }) {
  if (!asset.warranty_end) return null;
  const end = new Date(asset.warranty_end);
  const now = new Date();
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
        <p className="text-xs text-red-700 dark:text-red-300">Warranty expired {formatDate(asset.warranty_end)}</p>
      </div>
    );
  }
  if (daysLeft <= 90) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">Warranty expires in {daysLeft} days ({formatDate(asset.warranty_end)})</p>
      </div>
    );
  }
  return null;
}

function AcknowledgmentBadge({ assignment, acceptances }) {
  const acceptance = acceptances.find(a => a.assignment_id === assignment.id);
  const [expanded, setExpanded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!acceptance) {
    return (
      <span className="text-[10px] text-muted-foreground">No acknowledgment sent</span>
    );
  }

  if (acceptance.status === 'signed') {
    return (
      <div>
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-medium">Acknowledged</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {expanded && (
          <div className="mt-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
            {acceptance.signature_data && (
              <img
                src={acceptance.signature_data}
                alt="Signature"
                className="h-16 rounded border bg-white"
              />
            )}
            <div className="text-xs text-emerald-700 dark:text-emerald-300 space-y-0.5">
              <p>Signed by: {acceptance.signer_name}</p>
              <p>Date: {formatDate(acceptance.signed_at)}</p>
              {acceptance.signer_ip && <p>IP: {acceptance.signer_ip}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (acceptance.status === 'expired') {
    return (
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
        <span className="text-xs text-red-600 dark:text-red-400">Link expired</span>
      </div>
    );
  }

  // Pending
  return (
    <div className="flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5 text-amber-500" />
      <span className="text-xs text-amber-600 dark:text-amber-400">Pending signature</span>
    </div>
  );
}

function AssignmentCard({ assignment, employeeName, acceptances }) {
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
        <div className="ml-auto">
          <AcknowledgmentBadge assignment={assignment} acceptances={acceptances} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p>Assigned: {formatDate(assignment.assigned_date)}</p>
        {assignment.returned_date && <p>Returned: {formatDate(assignment.returned_date)}</p>}
        {assignment.condition_at_checkout && <p>Checkout condition: {assignment.condition_at_checkout}</p>}
        {assignment.condition_at_return && <p>Return condition: {assignment.condition_at_return}</p>}
      </div>

      {assignment.notes && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">{assignment.notes}</p>
      )}
    </div>
  );
}

function NoteCard({ note }) {
  const typeInfo = NOTE_TYPE_STYLES[note.type] || NOTE_TYPE_STYLES.note;
  return (
    <div className="flex gap-3 py-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
        {(note.author_name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">{note.author_name || 'System'}</span>
          <Badge variant="secondary" className={cn('text-[10px]', typeInfo.className)}>{typeInfo.label}</Badge>
          <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(note.created_date)}</span>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
      </div>
    </div>
  );
}

function AddNoteForm({ assetId, currentUser, onSave }) {
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.entities.AssetNote.create({
        asset_id: assetId,
        content: content.trim(),
        type: noteType,
        author_email: currentUser?.email,
        author_name: currentUser?.fullName || currentUser?.email,
      });
      setContent('');
      setNoteType('note');
      onSave();
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={noteType} onValueChange={setNoteType}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="incident">Incident</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="flex-1 text-sm"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || saving}
          className="self-end bg-emerald-700 hover:bg-emerald-800 text-white"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function AssetDetail() {
  const [searchParams] = useSearchParams();
  const assetId = searchParams.get('id');
  const [showModal, setShowModal] = useState(false);
  const { user: currentUser } = useAuth();

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

  const { data: acceptances = [] } = useQuery({
    queryKey: ['assetAcceptances'],
    queryFn: () => api.entities.AssetAcceptance.list('-created_date'),
    staleTime: 300000,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['assetNotes', assetId],
    queryFn: () => api.entities.AssetNote.filter({ asset_id: assetId }, '-created_date'),
    staleTime: 60000,
    enabled: !!assetId,
  });

  const isLoading = loadingAssets || loadingAssignments;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['assetAssignments'] });
    queryClient.invalidateQueries({ queryKey: ['assetAcceptances'] });
    queryClient.invalidateQueries({ queryKey: ['assetNotes', assetId] });
  };

  if (isLoading) return <CardGridSkeleton />;

  const asset = assets.find(a => String(a.id) === String(assetId));

  if (!asset) {
    return (
      <ManageITShell>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Box className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">Asset not found</p>
            <p className="text-sm mt-1">The asset you are looking for does not exist or has been deleted.</p>
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
  const isNetworkDevice = asset.type === 'IT Equipment' || asset.type === 'Mobile Device';

  const assetAssignments = assignments
    .filter(a => String(a.asset_id) === String(asset.id))
    .sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date));

  const employeeMap = new Map(
    employees.map(e => [e.id, `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || 'Unknown'])
  );

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
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-700 to-green-800 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 shrink-0">
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">{asset.name}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <Badge variant="secondary" className={cn('text-[10px]', STATUS_STYLES[status])}>{status}</Badge>
                {asset.type && <span className="text-xs text-muted-foreground">{asset.type}</span>}
                {asset.condition && (
                  <Badge variant="secondary" className={cn('text-[10px]', CONDITION_STYLES[asset.condition])}>{asset.condition}</Badge>
                )}
                {asset.device_active != null && (
                  <span className="inline-flex items-center gap-1 text-[10px]">
                    <span className={cn("w-1.5 h-1.5 rounded-full", asset.device_active ? "bg-emerald-500" : "bg-slate-400")} />
                    <span className={asset.device_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                      {asset.device_active ? 'Online' : 'Offline'}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowModal(true)} className="shrink-0">
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>

        {/* Warranty Banner */}
        <WarrantyBanner asset={asset} />

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 mt-4">
          <DetailField icon={Hash} label="Serial Number" value={asset.serial_number} />
          <DetailField icon={Monitor} label="Model" value={asset.model} />
          <DetailField icon={Package} label="Manufacturer" value={asset.manufacturer} />
          <DetailField icon={MapPin} label="Location" value={asset.location} />
          <DetailField icon={Calendar} label="Purchase Date" value={formatDate(asset.purchase_date)} />
          <DetailField icon={DollarSign} label="Purchase Cost" value={formatCurrency(asset.purchase_cost)} />
          <DetailField icon={ShoppingBag} label="Supplier" value={asset.supplier} />
          <DetailField icon={Package} label="Accessories" value={asset.accessories} />
          {asset.os && <DetailField icon={Monitor} label="Operating System" value={[asset.os, asset.os_version].filter(Boolean).join(' ')} />}
          {asset.last_contact && <DetailField icon={Clock} label="Last Contact" value={new Date(asset.last_contact).toLocaleString()} />}
          {isSoftware && (
            <>
              <DetailField icon={Key} label="License Key" value={asset.license_key} />
              <DetailField icon={Calendar} label="Expiry Date" value={formatDate(asset.expiry_date)} />
            </>
          )}
        </div>

        {/* Warranty Details */}
        {(asset.warranty_start || asset.warranty_end) && (
          <div className="mb-6 p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Warranty</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {asset.warranty_start && (
                <div><p className="text-xs text-muted-foreground">Start</p><p className="font-medium">{formatDate(asset.warranty_start)}</p></div>
              )}
              {asset.warranty_end && (
                <div><p className="text-xs text-muted-foreground">End</p><p className="font-medium">{formatDate(asset.warranty_end)}</p></div>
              )}
            </div>
          </div>
        )}

        {/* Network Details */}
        {isNetworkDevice && (asset.mac_address || asset.hostname || asset.ip_address) && (
          <div className="mb-6 p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Network</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {asset.mac_address && (
                <div><p className="text-xs text-muted-foreground">MAC Address</p><p className="font-medium font-mono text-xs">{asset.mac_address}</p></div>
              )}
              {asset.hostname && (
                <div><p className="text-xs text-muted-foreground">Hostname</p><p className="font-medium">{asset.hostname}</p></div>
              )}
              {asset.ip_address && (
                <div><p className="text-xs text-muted-foreground">IP Address</p><p className="font-medium font-mono text-xs">{asset.ip_address}</p></div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {asset.notes && (
          <div className="mb-6 p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Description</h2>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{asset.notes}</p>
          </div>
        )}

        {/* Activity Notes */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Notes & Activity</h2>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <AddNoteForm assetId={assetId} currentUser={currentUser} onSave={invalidateAll} />
            {notes.length > 0 && (
              <div className="mt-4 pt-4 border-t divide-y divide-border">
                {notes.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            )}
          </div>
        </div>

        {/* Assignment History */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Assignment History</h2>
          {assetAssignments.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <User className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No assignments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assetAssignments.map(assignment => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  employeeName={employeeMap.get(assignment.employee_id)}
                  acceptances={acceptances}
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

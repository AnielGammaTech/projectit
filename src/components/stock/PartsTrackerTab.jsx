import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, Package, Truck, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronRight, ExternalLink, Save, MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const statusConfig = {
  needed: { label: 'Needed', color: 'bg-slate-100 text-slate-700', icon: Clock },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-700', icon: Package },
  received: { label: 'Received', color: 'bg-amber-100 text-amber-700', icon: Truck },
  ready_to_install: { label: 'Ready', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  installed: { label: 'Installed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
};

export default function PartsTrackerTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedParts, setExpandedParts] = useState({});
  const [editingNotes, setEditingNotes] = useState({});
  const [savingPart, setSavingPart] = useState(null);
  const queryClient = useQueryClient();

  const { data: parts = [], refetch: refetchParts } = useQuery({
    queryKey: ['allParts'],
    queryFn: () => base44.entities.Part.list('-created_date'),
    staleTime: 60000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 300000
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    staleTime: 300000
  });

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || 'Unknown Project';
  const getProductName = (id) => products.find(p => p.id === id)?.name;

  // Filter parts
  const filteredParts = parts.filter(part => {
    const matchesSearch = 
      part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.part_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getProjectName(part.project_id)?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || part.status === statusFilter;
    
    // Exclude installed parts unless specifically filtered
    const notInstalled = statusFilter === 'installed' || part.status !== 'installed';
    
    return matchesSearch && matchesStatus && notInstalled;
  });

  // Group by status
  const groupedByStatus = {
    needed: filteredParts.filter(p => p.status === 'needed'),
    ordered: filteredParts.filter(p => p.status === 'ordered'),
    received: filteredParts.filter(p => p.status === 'received'),
    ready_to_install: filteredParts.filter(p => p.status === 'ready_to_install'),
  };

  const handleStatusChange = async (part, newStatus) => {
    setSavingPart(part.id);
    await base44.entities.Part.update(part.id, { status: newStatus });
    refetchParts();
    queryClient.invalidateQueries({ queryKey: ['parts', part.project_id] });
    setSavingPart(null);
  };

  const handleSaveTracking = async (part) => {
    setSavingPart(part.id);
    const updates = editingNotes[part.id] || {};
    await base44.entities.Part.update(part.id, {
      tracking_notes: updates.tracking_notes ?? part.tracking_notes,
      tracking_number: updates.tracking_number ?? part.tracking_number,
      carrier: updates.carrier ?? part.carrier,
      est_delivery_date: updates.est_delivery_date ?? part.est_delivery_date
    });
    setEditingNotes(prev => {
      const newState = { ...prev };
      delete newState[part.id];
      return newState;
    });
    refetchParts();
    queryClient.invalidateQueries({ queryKey: ['parts', part.project_id] });
    setSavingPart(null);
  };

  const updateEditingField = (partId, field, value) => {
    setEditingNotes(prev => ({
      ...prev,
      [partId]: { ...(prev[partId] || {}), [field]: value }
    }));
  };

  const toggleExpanded = (partId) => {
    setExpandedParts(prev => ({ ...prev, [partId]: !prev[partId] }));
  };

  const StatusGroup = ({ status, parts }) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    const [isOpen, setIsOpen] = useState(true);

    if (parts.length === 0) return null;

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Icon className="w-4 h-4" />
          <span className="font-semibold text-slate-900">{config.label}</span>
          <Badge className={cn("ml-auto", config.color)}>{parts.length}</Badge>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {parts.map(part => (
            <PartCard
              key={part.id}
              part={part}
              expanded={expandedParts[part.id]}
              onToggle={() => toggleExpanded(part.id)}
              onStatusChange={handleStatusChange}
              onSaveTracking={handleSaveTracking}
              editingNotes={editingNotes[part.id]}
              updateEditingField={updateEditingField}
              saving={savingPart === part.id}
              getProjectName={getProjectName}
              getProductName={getProductName}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search parts, projects, tracking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Active</SelectItem>
            <SelectItem value="needed">Needed</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="ready_to_install">Ready to Install</SelectItem>
            <SelectItem value="installed">Installed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(groupedByStatus).map(([status, items]) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          return (
            <div key={status} className={cn("p-4 rounded-xl border", config.color.replace('text-', 'border-').replace('100', '200'))}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{config.label}</span>
              </div>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
          );
        })}
      </div>

      {/* Parts List */}
      {filteredParts.length === 0 ? (
        <div className="text-center py-16 bg-[#0F2F44]/5 rounded-2xl border border-[#0F2F44]/10">
          <Package className="w-12 h-12 mx-auto text-[#0F2F44]/30 mb-4" />
          <h3 className="text-lg font-medium text-[#0F2F44] mb-2">No parts to track</h3>
          <p className="text-[#0F2F44]/60">Parts added to projects will appear here</p>
        </div>
      ) : (
        <div>
          {Object.entries(groupedByStatus).map(([status, items]) => (
            <StatusGroup key={status} status={status} parts={items} />
          ))}
        </div>
      )}
    </div>
  );
}

function PartCard({ part, expanded, onToggle, onStatusChange, onSaveTracking, editingNotes, updateEditingField, saving, getProjectName, getProductName }) {
  const config = statusConfig[part.status];
  const productName = getProductName(part.product_id);
  const hasChanges = editingNotes && Object.keys(editingNotes).length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header Row */}
      <div 
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{part.name}</h3>
            {part.part_number && (
              <span className="text-xs text-slate-500">#{part.part_number}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link 
              to={createPageUrl('ProjectDetail') + `?id=${part.project_id}`}
              className="hover:text-[#0069AF] hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {getProjectName(part.project_id)}
              <ExternalLink className="w-3 h-3" />
            </Link>
            {productName && (
              <>
                <span>•</span>
                <span className="text-emerald-600">{productName}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {part.tracking_number && (
            <Badge variant="outline" className="text-xs">
              <Truck className="w-3 h-3 mr-1" />
              {part.carrier || 'Track'}: {part.tracking_number}
            </Badge>
          )}
          <Select value={part.status} onValueChange={(v) => onStatusChange(part, v)} disabled={saving}>
            <SelectTrigger className={cn("w-36", config.color)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="needed">Needed</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="ready_to_install">Ready to Install</SelectItem>
              <SelectItem value="installed">Installed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Tracking Number</label>
              <Input
                placeholder="Enter tracking #"
                value={editingNotes?.tracking_number ?? part.tracking_number ?? ''}
                onChange={(e) => updateEditingField(part.id, 'tracking_number', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Carrier</label>
              <Input
                placeholder="UPS, FedEx, etc."
                value={editingNotes?.carrier ?? part.carrier ?? ''}
                onChange={(e) => updateEditingField(part.id, 'carrier', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Est. Delivery</label>
              <Input
                type="date"
                value={editingNotes?.est_delivery_date ?? part.est_delivery_date ?? ''}
                onChange={(e) => updateEditingField(part.id, 'est_delivery_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Tracking Notes
            </label>
            <Textarea
              placeholder="Add notes about this part's tracking status..."
              value={editingNotes?.tracking_notes ?? part.tracking_notes ?? ''}
              onChange={(e) => updateEditingField(part.id, 'tracking_notes', e.target.value)}
              rows={2}
            />
          </div>

          {hasChanges && (
            <div className="flex justify-end">
              <Button 
                onClick={() => onSaveTracking(part)} 
                disabled={saving}
                className="bg-[#0F2F44] hover:bg-[#1a4a6e]"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}

          {/* Additional Info */}
          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
            {part.quantity && <span>Qty: {part.quantity}</span>}
            {part.supplier && <span>Supplier: {part.supplier}</span>}
            {part.assigned_name && <span>Assigned: {part.assigned_name}</span>}
            {part.due_date && <span>Due: {format(new Date(part.due_date), 'MMM d')}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
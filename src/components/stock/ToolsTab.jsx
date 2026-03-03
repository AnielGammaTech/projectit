import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, HardDrive, Edit2, Trash2, Filter, X, ChevronDown, ShoppingCart, RotateCcw, History, Loader2, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ToolsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [viewingTool, setViewingTool] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [stockFilter, setStockFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: tools = [], refetch } = useQuery({
    queryKey: ['tools'],
    queryFn: () => api.entities.Tool.list('-created_date'),
    staleTime: 300000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.filter({ status: { $ne: 'archived' } })
  });

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const filteredTools = tools.filter(t => {
    const matchesSearch =
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'available' && (t.quantity_on_hand || 0) > 0) ||
      (stockFilter === 'checked_out' && (t.checked_out_count || 0) > 0);
    return matchesSearch && matchesStock;
  });

  const handleSave = async (data) => {
    try {
      if (editingTool) {
        await api.entities.Tool.update(editingTool.id, data);
      } else {
        await api.entities.Tool.create(data);
      }
      refetch();
      setShowModal(false);
      setEditingTool(null);
    } catch (err) {
      console.error('Tool save failed:', err);
      // Re-throw so ToolModal can display the error
      throw err;
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        await api.entities.Tool.delete(deleteConfirm.id);
        refetch();
        setDeleteConfirm(null);
      } catch (err) {
        console.error('Tool delete failed:', err);
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="space-y-3 mb-4">
        {/* Search Row */}
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search tools..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {/* Filters + Actions Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Status</span>
                {stockFilter !== 'all' && <Badge variant="default" className="h-5 w-5 p-0 justify-center bg-[#0069AF]">1</Badge>}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckboxItem checked={stockFilter === 'all'} onCheckedChange={() => setStockFilter('all')}>All Tools</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={stockFilter === 'available'} onCheckedChange={() => setStockFilter('available')}>Available</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={stockFilter === 'checked_out'} onCheckedChange={() => setStockFilter('checked_out')}>Checked Out</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <span className="text-xs sm:text-sm text-slate-500 shrink-0">{filteredTools.length} tools</span>
          <Button onClick={() => { setEditingTool(null); setShowModal(true); }} className="bg-[#0F2F44] hover:bg-[#1a4a6e]" size="sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Tool</span>
          </Button>
        </div>
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="text-center py-16 bg-[#0F2F44]/5 rounded-2xl border border-[#0F2F44]/10">
          <HardDrive className="w-12 h-12 mx-auto text-[#0F2F44]/30 mb-4" />
          <h3 className="text-lg font-medium text-[#0F2F44] mb-2">
            {tools.length === 0 ? 'No tools yet' : 'No tools match filters'}
          </h3>
          <p className="text-[#0F2F44]/60 mb-4">
            {tools.length === 0 ? 'Add tools that can be checked out and returned' : 'Try adjusting your filters'}
          </p>
          {tools.length === 0 && (
            <Button onClick={() => setShowModal(true)} className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
              <Plus className="w-4 h-4 mr-2" />Add Tool
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => setViewingTool(tool)}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md hover:border-[#0069AF]/30 transition-all cursor-pointer group"
            >
              <div className="aspect-square bg-slate-50 relative">
                {tool.image_url ? (
                  <img src={tool.image_url} alt={tool.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <HardDrive className="w-10 h-10 text-slate-200" />
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5">
                  <Badge variant={tool.quantity_on_hand > 0 ? "default" : "destructive"} className={cn("text-[10px] px-1.5 py-0", tool.quantity_on_hand > 0 ? "bg-emerald-500 text-white" : "")}>
                    {tool.quantity_on_hand || 0}
                  </Badge>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(tool); }}
                  className="absolute top-1.5 left-1.5 p-1.5 rounded bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-600 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2">
                <h3 className="font-medium text-slate-900 text-sm truncate" title={tool.name}>{tool.name}</h3>
                {tool.serial_number && <p className="text-[10px] text-slate-400 truncate mt-0.5">SN: {tool.serial_number}</p>}
                {tool.category && <p className="text-[10px] text-slate-400 truncate">{tool.category}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      <ToolViewModal
        open={!!viewingTool}
        onClose={() => setViewingTool(null)}
        tool={viewingTool}
        projects={projects}
        currentUser={currentUser}
        queryClient={queryClient}
        onEdit={(tool) => { setViewingTool(null); setEditingTool(tool); setShowModal(true); }}
        onRefetch={refetch}
      />

      {/* Edit/Add Modal */}
      <ToolModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingTool(null); }}
        tool={editingTool}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tool?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deleteConfirm?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ToolViewModal({ open, onClose, tool, projects, currentUser, queryClient, onEdit, onRefetch }) {
  const [activeAction, setActiveAction] = useState(null);
  const [actionData, setActionData] = useState({ quantity: 1, project_id: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [actionError, setActionError] = useState(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ['toolTransactions', tool?.id],
    queryFn: () => api.entities.ToolTransaction.filter({ tool_id: tool.id }, '-created_date'),
    enabled: !!tool?.id
  });

  useEffect(() => {
    setActiveAction(null);
    setActionData({ quantity: 1, project_id: '', notes: '' });
    setShowHistory(false);
    setActionError(null);
  }, [tool, open]);

  if (!tool) return null;

  const handleAction = async () => {
    if (!activeAction || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const qty = Number(actionData.quantity) || 1;
      await api.entities.ToolTransaction.create({
        tool_id: tool.id,
        type: activeAction,
        quantity: qty,
        project_id: actionData.project_id || null,
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || currentUser?.email || '',
        notes: actionData.notes || ''
      });

      const isReturn = activeAction === 'return';
      const newQty = isReturn ? tool.quantity_on_hand + qty : tool.quantity_on_hand - qty;
      const newCheckedOut = isReturn
        ? Math.max(0, (tool.checked_out_count || 0) - qty)
        : (tool.checked_out_count || 0) + qty;

      await api.entities.Tool.update(tool.id, {
        quantity_on_hand: Math.max(0, newQty),
        checked_out_count: newCheckedOut
      });

      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['toolTransactions', tool.id] });
      onRefetch();
      setActiveAction(null);
      setActionData({ quantity: 1, project_id: '', notes: '' });
    } catch (err) {
      console.error('Action failed:', err);
      setActionError(err.message || 'Action failed. Please try again.');
    }
    setSubmitting(false);
  };

  const txConfig = {
    checkout: { label: 'Checked out', color: 'bg-orange-100 text-orange-700', sign: '-' },
    return: { label: 'Returned', color: 'bg-purple-100 text-purple-700', sign: '+' },
  };

  const displayedTx = showHistory ? transactions : transactions.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {tool.image_url ? (
              <img src={tool.image_url} alt={tool.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <HardDrive className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold truncate">{tool.name}</p>
              {tool.category && <p className="text-sm font-normal text-slate-500">{tool.category}</p>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            {tool.serial_number && <div><p className="text-xs text-slate-500">Serial Number</p><p className="text-sm font-medium">{tool.serial_number}</p></div>}
            {tool.manufacturer && <div><p className="text-xs text-slate-500">Manufacturer</p><p className="text-sm font-medium">{tool.manufacturer}</p></div>}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
            <div className="text-center"><p className="text-[10px] sm:text-xs text-slate-500">Available</p><p className={cn("text-base sm:text-lg font-bold", tool.quantity_on_hand === 0 ? "text-red-600" : "text-slate-900")}>{tool.quantity_on_hand || 0}</p></div>
            <div className="text-center"><p className="text-[10px] sm:text-xs text-slate-500">Checked Out</p><p className="text-base sm:text-lg font-bold text-orange-600">{tool.checked_out_count || 0}</p></div>
            <div className="text-center"><p className="text-[10px] sm:text-xs text-slate-500">Total</p><p className="text-base sm:text-lg font-bold text-slate-900">{(tool.quantity_on_hand || 0) + (tool.checked_out_count || 0)}</p></div>
          </div>

          {tool.description && <div><p className="text-xs text-slate-500 mb-1">Description</p><p className="text-sm text-slate-700 line-clamp-3">{tool.description}</p></div>}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button size="sm" variant={activeAction === 'checkout' ? 'default' : 'outline'} onClick={() => setActiveAction(activeAction === 'checkout' ? null : 'checkout')} disabled={tool.quantity_on_hand === 0} className={activeAction === 'checkout' ? 'bg-orange-600 hover:bg-orange-700' : ''}>
              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />Checkout
            </Button>
            <Button size="sm" variant={activeAction === 'return' ? 'default' : 'outline'} onClick={() => setActiveAction(activeAction === 'return' ? null : 'return')} disabled={(tool.checked_out_count || 0) === 0} className={activeAction === 'return' ? 'bg-purple-600 hover:bg-purple-700' : ''}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Return
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => onEdit(tool)}>
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit
            </Button>
          </div>

          {/* Inline Action Panel */}
          {activeAction && (
            <div className="p-3 bg-slate-50 rounded-lg border space-y-3">
              <p className="text-sm font-semibold text-slate-700">{activeAction === 'checkout' ? 'Checkout Tool' : 'Return Tool'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" min={1} max={activeAction === 'checkout' ? tool.quantity_on_hand : (tool.checked_out_count || 0)} value={actionData.quantity} onChange={(e) => setActionData(p => ({ ...p, quantity: e.target.value }))} className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">Project (optional)</Label>
                  <Select value={actionData.project_id} onValueChange={(v) => setActionData(p => ({ ...p, project_id: v }))}>
                    <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={actionData.notes} onChange={(e) => setActionData(p => ({ ...p, notes: e.target.value }))} className="mt-1 h-16 text-sm" placeholder="Optional notes..." />
              </div>
              {actionError && (
                <p className="text-xs text-red-600 bg-red-50 rounded p-2 text-center">{actionError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setActiveAction(null)}>Cancel</Button>
                <Button size="sm" onClick={handleAction} disabled={submitting || !actionData.quantity} className={activeAction === 'checkout' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'}>
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Confirm {activeAction === 'checkout' ? 'Checkout' : 'Return'}
                </Button>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="border-t pt-3">
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 w-full">
              <History className="w-4 h-4" />History ({transactions.length})
              {showHistory ? <X className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
            </button>
            {(showHistory || transactions.length > 0) && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {displayedTx.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">No transactions yet</p>
                ) : displayedTx.map((tx) => {
                  const cfg = txConfig[tx.type] || txConfig.checkout;
                  const proj = projects.find(p => p.id === tx.project_id);
                  return (
                    <div key={tx.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-slate-50">
                      <Badge className={cn("text-[10px] px-1.5 py-0", cfg.color)}>{cfg.label}</Badge>
                      <span className="font-semibold text-slate-700">{cfg.sign}{tx.quantity}</span>
                      {proj && <span className="text-slate-500 truncate">→ {proj.name}</span>}
                      <span className="text-slate-400 ml-auto shrink-0">{tx.user_name?.split(' ')[0]}</span>
                      <span className="text-slate-400 shrink-0">{tx.created_date ? format(new Date(tx.created_date), 'MMM d') : ''}</span>
                    </div>
                  );
                })}
                {!showHistory && transactions.length > 5 && (
                  <button onClick={() => setShowHistory(true)} className="text-xs text-[#0069AF] hover:underline w-full text-center py-1">Show all {transactions.length}</button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolModal({ open, onClose, tool, onSave }) {
  const [formData, setFormData] = useState({
    name: '', serial_number: '', description: '', image_url: '',
    quantity_on_hand: 0, checked_out_count: 0, manufacturer: '', category: ''
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setSaveError(null);
    setSaving(false);
    if (tool) {
      setFormData({
        name: tool.name || '', serial_number: tool.serial_number || '',
        description: tool.description || '', image_url: tool.image_url || '',
        quantity_on_hand: tool.quantity_on_hand || 0, checked_out_count: tool.checked_out_count || 0,
        manufacturer: tool.manufacturer || '', category: tool.category || ''
      });
    } else {
      setFormData({ name: '', serial_number: '', description: '', image_url: '', quantity_on_hand: 0, checked_out_count: 0, manufacturer: '', category: '' });
    }
  }, [tool, open]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (err) { console.error('Upload failed:', err); }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      await onSave({ ...formData, quantity_on_hand: parseInt(formData.quantity_on_hand) || 0, checked_out_count: parseInt(formData.checked_out_count) || 0 });
    } catch (err) {
      console.error('Tool save error:', err);
      setSaveError(err.message || 'Failed to save tool. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{tool ? 'Edit Tool' : 'Add Tool'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Image</Label>
            <div className="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#0F2F44]/50 transition-colors" onClick={() => document.getElementById('tool-image-input').click()}>
              {formData.image_url ? (
                <div className="relative inline-block">
                  <img src={formData.image_url} alt="Tool" className="max-h-32 rounded-lg mx-auto" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, image_url: '' })); }} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="py-4"><ImagePlus className="w-8 h-8 mx-auto text-slate-400 mb-2" /><p className="text-sm text-slate-500">{uploading ? 'Uploading...' : 'Click to upload'}</p></div>
              )}
            </div>
            <input id="tool-image-input" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required /></div>
            <div><Label>Serial Number</Label><Input value={formData.serial_number} onChange={(e) => setFormData(p => ({ ...p, serial_number: e.target.value }))} /></div>
            <div><Label>Category</Label><Input value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} /></div>
            <div><Label>Manufacturer</Label><Input value={formData.manufacturer} onChange={(e) => setFormData(p => ({ ...p, manufacturer: e.target.value }))} /></div>
            <div><Label>Quantity Available</Label><Input type="number" value={formData.quantity_on_hand} onChange={(e) => setFormData(p => ({ ...p, quantity_on_hand: e.target.value }))} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 text-center">{saveError}</p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="bg-[#0F2F44] hover:bg-[#1a4a6e]" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {tool ? 'Save Changes' : 'Add Tool'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

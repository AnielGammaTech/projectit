import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, HardDrive, Edit2, Trash2, Filter, X, ChevronDown, ShoppingCart, RotateCcw, History, Loader2, ImagePlus, LogOut, LogIn } from 'lucide-react';
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
  const [quickAction, setQuickAction] = useState(null); // { type: 'checkout' | 'return' }
  const [quickActionTool, setQuickActionTool] = useState('');
  const [quickActionQty, setQuickActionQty] = useState(1);
  const [quickActionSubmitting, setQuickActionSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: tools = [], refetch, isLoading } = useQuery({
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

  const handleQuickAction = async (tool, type, qty = 1) => {
    try {
      await api.entities.ToolTransaction.create({
        tool_id: tool.id,
        type,
        quantity: qty,
        project_id: null,
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || currentUser?.email || '',
        notes: ''
      });
      const isReturn = type === 'return';
      const newOnHand = isReturn ? (tool.quantity_on_hand || 0) + qty : (tool.quantity_on_hand || 0) - qty;
      const newCheckedOut = isReturn
        ? Math.max(0, (tool.checked_out_count || 0) - qty)
        : (tool.checked_out_count || 0) + qty;
      await api.entities.Tool.update(tool.id, {
        quantity_on_hand: Math.max(0, newOnHand),
        checked_out_count: newCheckedOut
      });
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['toolTransactions', tool.id] });
      refetch();
    } catch (err) {
      console.error('Quick action failed:', err);
    }
  };

  const handleQuickActionSubmit = async () => {
    const tool = tools.find(t => t.id === quickActionTool);
    if (!tool || !quickAction) return;
    setQuickActionSubmitting(true);
    await handleQuickAction(tool, quickAction.type, quickActionQty);
    setQuickActionSubmitting(false);
    setQuickAction(null);
    setQuickActionTool('');
    setQuickActionQty(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="space-y-3 mb-4">
        {/* Search Row */}
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters + Actions Row */}
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap sm:flex-wrap pb-1 sm:pb-0 no-scrollbar">
          {[
            { key: 'all', label: 'All' },
            { key: 'available', label: 'Available' },
            { key: 'checked_out', label: 'Checked Out' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStockFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                stockFilter === f.key
                  ? "bg-[#0069AF] text-white"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}

          <div className="flex-1" />

          <div className="flex-shrink-0 flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{filteredTools.length} tools</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setQuickAction({ type: 'return' }); setQuickActionTool(''); setQuickActionQty(1); }}
              className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Check In</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setQuickAction({ type: 'checkout' }); setQuickActionTool(''); setQuickActionQty(1); }}
              className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Check Out</span>
            </Button>
            <Button
              onClick={() => { setEditingTool(null); setShowModal(true); }}
              className="bg-[#0F2F44] hover:bg-[#1a4a6e] text-white shrink-0"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Tool
            </Button>
          </div>
        </div>
      </div>

      {/* Tools List — Compact rows */}
      {isLoading ? (
        <div className="rounded-2xl border bg-card overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="rounded-2xl border bg-card py-16 text-center">
          <HardDrive className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-base font-medium text-foreground mb-1">
            {tools.length === 0 ? 'No tools yet' : 'No tools match filters'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {tools.length === 0 ? 'Add tools that can be checked out and returned' : 'Try adjusting your filters'}
          </p>
          {tools.length === 0 ? (
            <Button onClick={() => setShowModal(true)} className="bg-[#0F2F44] hover:bg-[#1a4a6e] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Tool
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStockFilter('all')}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-warm overflow-hidden">
          {/* List header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
            <div className="col-span-3">Tool</div>
            <div className="col-span-2">Serial Number</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1 text-center">Total</div>
            <div className="col-span-2 text-center">Checked Out</div>
            <div className="col-span-2">Status</div>
          </div>

          {/* Tool rows */}
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => setViewingTool(tool)}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors items-center"
            >
              {/* Tool name + icon */}
              <div className="col-span-3 flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {tool.image_url ? (
                    <img src={tool.image_url} alt={tool.name} className="w-9 h-9 rounded-lg object-cover" />
                  ) : (
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm font-medium text-foreground truncate">{tool.name}</p>
              </div>

              {/* Serial */}
              <div className="hidden sm:block col-span-2">
                <span className="text-xs font-mono text-muted-foreground">{tool.serial_number || '—'}</span>
              </div>

              {/* Category */}
              <div className="hidden sm:block col-span-2">
                <span className="text-xs text-muted-foreground">{tool.category || '—'}</span>
              </div>

              {/* Total qty */}
              <div className="hidden sm:flex col-span-1 justify-center">
                <span className="text-sm font-medium text-foreground">{tool.quantity_on_hand || 0}</span>
              </div>

              {/* Checked out count */}
              <div className="hidden sm:flex col-span-2 justify-center">
                <span className={cn(
                  "text-sm font-bold tabular-nums px-2 py-0.5 rounded-md",
                  (tool.checked_out_count || 0) > 0
                    ? "text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30"
                    : "text-foreground"
                )}>
                  {tool.checked_out_count || 0}
                </span>
              </div>

              {/* Status */}
              <div className="hidden sm:flex col-span-2 items-center justify-between">
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-md",
                  (tool.checked_out_count || 0) > 0
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                )}>
                  {(tool.checked_out_count || 0) > 0 ? 'Checked Out' : 'Available'}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(tool); }}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600"
                    title="Delete tool"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Mobile info */}
              <div className="sm:hidden flex items-center gap-3 text-xs text-muted-foreground">
                {tool.serial_number && <span className="font-mono">{tool.serial_number}</span>}
                <span className={cn(
                  "font-bold px-1.5 py-0.5 rounded",
                  (tool.checked_out_count || 0) > 0
                    ? "text-orange-700 bg-orange-100"
                    : "text-emerald-700 bg-emerald-100"
                )}>
                  {(tool.checked_out_count || 0) > 0 ? `${tool.checked_out_count} out` : 'Available'}
                </span>
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

      {/* Quick Check Out / Check In Dialog */}
      <Dialog open={!!quickAction} onOpenChange={() => setQuickAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {quickAction?.type === 'checkout' ? (
                <><LogOut className="w-5 h-5 text-orange-600" /> Check Out Tool</>
              ) : (
                <><LogIn className="w-5 h-5 text-purple-600" /> Check In Tool</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium">Tool</Label>
              <Select value={quickActionTool} onValueChange={setQuickActionTool}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a tool..." /></SelectTrigger>
                <SelectContent>
                  {tools
                    .filter(t => quickAction?.type === 'checkout' ? (t.quantity_on_hand || 0) > 0 : (t.checked_out_count || 0) > 0)
                    .map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.serial_number ? `(${t.serial_number})` : ''} — {quickAction?.type === 'checkout' ? `${t.quantity_on_hand} avail` : `${t.checked_out_count} out`}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Quantity</Label>
              <Input
                type="number"
                min={1}
                max={quickActionTool ? (quickAction?.type === 'checkout' ? (tools.find(t => t.id === quickActionTool)?.quantity_on_hand || 1) : (tools.find(t => t.id === quickActionTool)?.checked_out_count || 1)) : 1}
                value={quickActionQty}
                onChange={(e) => setQuickActionQty(Number(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setQuickAction(null)} disabled={quickActionSubmitting} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">Cancel</Button>
              <Button
                onClick={handleQuickActionSubmit}
                disabled={!quickActionTool || quickActionSubmitting}
                className={cn("w-full sm:w-auto min-h-[44px] sm:min-h-0", quickAction?.type === 'checkout' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700')}
              >
                {quickActionSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {quickAction?.type === 'checkout' ? 'Check Out' : 'Check In'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {tool.image_url ? (
              <img src={tool.image_url} alt={tool.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <HardDrive className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold truncate">{tool.name}</p>
              {tool.category && <p className="text-sm font-normal text-muted-foreground">{tool.category}</p>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            {tool.serial_number && (
              <div>
                <p className="text-xs text-muted-foreground">Serial Number</p>
                <p className="text-sm font-medium">{tool.serial_number}</p>
              </div>
            )}
            {tool.manufacturer && (
              <div>
                <p className="text-xs text-muted-foreground">Manufacturer</p>
                <p className="text-sm font-medium">{tool.manufacturer}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Available</p>
              <p className={cn("text-base sm:text-lg font-bold", tool.quantity_on_hand === 0 ? "text-red-600" : "text-foreground")}>
                {tool.quantity_on_hand || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Checked Out</p>
              <p className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400">{tool.checked_out_count || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
              <p className="text-base sm:text-lg font-bold text-foreground">{(tool.quantity_on_hand || 0) + (tool.checked_out_count || 0)}</p>
            </div>
          </div>

          {tool.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground line-clamp-3">{tool.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2 border-t">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant={activeAction === 'checkout' ? 'default' : 'outline'}
                onClick={() => setActiveAction(activeAction === 'checkout' ? null : 'checkout')}
                disabled={tool.quantity_on_hand === 0}
                className={cn("w-full sm:w-auto min-h-[44px] sm:min-h-0", activeAction === 'checkout' ? 'bg-orange-600 hover:bg-orange-700' : '')}
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />Checkout
              </Button>
              <Button
                size="sm"
                variant={activeAction === 'return' ? 'default' : 'outline'}
                onClick={() => setActiveAction(activeAction === 'return' ? null : 'return')}
                disabled={(tool.checked_out_count || 0) === 0}
                className={cn("w-full sm:w-auto min-h-[44px] sm:min-h-0", activeAction === 'return' ? 'bg-purple-600 hover:bg-purple-700' : '')}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Return
              </Button>
            </div>
            <div className="hidden sm:block flex-1" />
            <Button size="sm" variant="outline" onClick={() => onEdit(tool)} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit
            </Button>
          </div>

          {/* Inline Action Panel */}
          {activeAction && (
            <div className="p-3 bg-muted/50 rounded-lg border space-y-3">
              <p className="text-sm font-semibold text-foreground">{activeAction === 'checkout' ? 'Checkout Tool' : 'Return Tool'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    max={activeAction === 'checkout' ? tool.quantity_on_hand : (tool.checked_out_count || 0)}
                    value={actionData.quantity}
                    onChange={(e) => setActionData(p => ({ ...p, quantity: e.target.value }))}
                    className="mt-1 h-8"
                  />
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
                <Textarea
                  value={actionData.notes}
                  onChange={(e) => setActionData(p => ({ ...p, notes: e.target.value }))}
                  className="mt-1 h-16 text-sm"
                  placeholder="Optional notes..."
                />
              </div>
              {actionError && (
                <p className="text-xs text-red-600 bg-red-50 rounded p-2 text-center">{actionError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setActiveAction(null)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleAction}
                  disabled={submitting || !actionData.quantity}
                  className={activeAction === 'checkout' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Confirm {activeAction === 'checkout' ? 'Checkout' : 'Return'}
                </Button>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="border-t pt-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
            >
              <History className="w-4 h-4" />History ({transactions.length})
              {showHistory ? <X className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
            </button>
            {(showHistory || transactions.length > 0) && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {displayedTx.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No transactions yet</p>
                ) : displayedTx.map((tx) => {
                  const cfg = txConfig[tx.type] || txConfig.checkout;
                  const proj = projects.find(p => p.id === tx.project_id);
                  return (
                    <div key={tx.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-muted/50">
                      <Badge className={cn("text-[10px] px-1.5 py-0", cfg.color)}>{cfg.label}</Badge>
                      <span className="font-semibold text-foreground">{cfg.sign}{tx.quantity}</span>
                      {proj && <span className="text-muted-foreground truncate">→ {proj.name}</span>}
                      <span className="text-muted-foreground ml-auto shrink-0">{tx.user_name?.split(' ')[0]}</span>
                      <span className="text-muted-foreground shrink-0">{tx.created_date ? format(new Date(tx.created_date), 'MMM d') : ''}</span>
                    </div>
                  );
                })}
                {!showHistory && transactions.length > 5 && (
                  <button onClick={() => setShowHistory(true)} className="text-xs text-[#0069AF] hover:underline w-full text-center py-1">
                    Show all {transactions.length}
                  </button>
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
    } catch (err) {
      console.error('Upload failed:', err);
    }
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader><DialogTitle>{tool ? 'Edit Tool' : 'Add Tool'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Image</Label>
            <div
              className="mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById('tool-image-input').click()}
            >
              {formData.image_url ? (
                <div className="relative inline-block">
                  <img src={formData.image_url} alt="Tool" className="max-h-32 rounded-lg mx-auto" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, image_url: '' })); }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="py-4">
                  <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Click to upload'}</p>
                </div>
              )}
            </div>
            <input id="tool-image-input" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={formData.serial_number} onChange={(e) => setFormData(p => ({ ...p, serial_number: e.target.value }))} />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input value={formData.manufacturer} onChange={(e) => setFormData(p => ({ ...p, manufacturer: e.target.value }))} />
            </div>
            <div>
              <Label>Quantity Available</Label>
              <Input type="number" value={formData.quantity_on_hand} onChange={(e) => setFormData(p => ({ ...p, quantity_on_hand: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} />
          </div>
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 text-center">{saveError}</p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="bg-[#0F2F44] hover:bg-[#1a4a6e] text-white" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {tool ? 'Save Changes' : 'Add Tool'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

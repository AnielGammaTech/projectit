import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Package, Calendar as CalendarIcon, User, MessageSquare, Send, Trash2,
  DollarSign, Hash, Truck, UserPlus, ChevronDown, Check, PackageCheck,
  Wrench, Pencil, X, Link, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

const statusConfig = {
  needed: { label: 'Needed', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600', dot: 'bg-slate-400' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700', dot: 'bg-blue-500' },
  received: { label: 'Received', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700', dot: 'bg-amber-500' },
  ready_to_install: { label: 'Ready to Install', color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700', dot: 'bg-purple-500' },
  installed: { label: 'Installed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500' }
};

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const getColorForEmail = (email) => {
  if (!email) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function PartDetailModal({ open, onClose, part, teamMembers = [], currentUser, onStatusChange, onDelete }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields - local state
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [purchaseLink, setPurchaseLink] = useState('');
  const [notes, setNotes] = useState('');

  // Sync state from part prop and reset to view mode on open
  useEffect(() => {
    if (part) {
      setName(part.name || '');
      setPartNumber(part.part_number || '');
      setQuantity(part.quantity || 1);
      setUnitCost(part.unit_cost || 0);
      setSupplier(part.supplier || '');
      setPurchaseLink(part.purchase_link || '');
      setNotes(part.notes || '');
    }
    setIsEditing(false);
  }, [part?.id, open]);

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['partComments', part?.id],
    queryFn: () => api.entities.TaskComment.filter({ task_id: part?.id }),
    enabled: !!part?.id && open
  });

  // Auto-save handler
  const autoSave = async (updates) => {
    if (!part) return;
    setSaving(true);
    try {
      await api.entities.Part.update(part.id, updates);
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['projectParts'] });
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
    setSaving(false);
  };

  const handleNameBlur = () => {
    if (name !== part.name && name.trim()) {
      autoSave({ name: name.trim() });
    }
  };

  const handlePartNumberBlur = () => {
    if (partNumber !== (part.part_number || '')) {
      autoSave({ part_number: partNumber });
    }
  };

  const handleQuantityBlur = () => {
    if (quantity !== part.quantity) {
      autoSave({ quantity });
    }
  };

  const handleUnitCostBlur = () => {
    if (unitCost !== part.unit_cost) {
      autoSave({ unit_cost: unitCost });
    }
  };

  const handleSupplierBlur = () => {
    if (supplier !== (part.supplier || '')) {
      autoSave({ supplier });
    }
  };

  const handlePurchaseLinkBlur = () => {
    if (purchaseLink !== (part.purchase_link || '')) {
      autoSave({ purchase_link: purchaseLink });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== (part.notes || '')) {
      autoSave({ notes });
    }
  };

  const handleStatusChange = (status) => {
    const updates = { status };
    if (status === 'received' && part.status !== 'received') {
      updates.received_date = format(new Date(), 'yyyy-MM-dd');
    }
    if (status === 'installed' && part.status !== 'installed') {
      updates.installed_date = format(new Date(), 'yyyy-MM-dd');
    }
    if (onStatusChange) {
      onStatusChange(part, status);
    } else {
      autoSave(updates);
    }
  };

  const handleAssign = (email) => {
    if (email === 'unassigned') {
      autoSave({ assigned_to: '', assigned_name: '' });
    } else {
      const member = teamMembers.find(m => m.email === email);
      autoSave({ assigned_to: email, assigned_name: member?.name || email });
    }
  };

  const handleReceiverAssign = (email) => {
    if (email === 'unassigned') {
      autoSave({ receiver_email: '', receiver_name: '' });
    } else {
      const member = teamMembers.find(m => m.email === email);
      autoSave({ receiver_email: email, receiver_name: member?.name || email });
    }
  };

  const handleInstallerAssign = (email) => {
    if (email === 'unassigned') {
      autoSave({ installer_email: '', installer_name: '' });
    } else {
      const member = teamMembers.find(m => m.email === email);
      autoSave({ installer_email: email, installer_name: member?.name || email });
    }
  };

  const handleDueDateChange = (date) => {
    autoSave({ due_date: date ? format(date, 'yyyy-MM-dd') : '' });
  };

  const handleEstDeliveryChange = (date) => {
    autoSave({ est_delivery_date: date ? format(date, 'yyyy-MM-dd') : '' });
  };

  const handleMarkReceived = () => {
    autoSave({ status: 'received', received_date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleMarkInstalled = () => {
    autoSave({ status: 'installed', installed_date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !part) return;
    setSubmitting(true);
    await api.entities.TaskComment.create({
      task_id: part.id,
      content: newComment,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name
    });
    setNewComment('');
    refetchComments();
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId) => {
    await api.entities.TaskComment.delete(commentId);
    refetchComments();
  };

  if (!part) return null;

  const currentStatus = statusConfig[part.status] || statusConfig.needed;
  const totalCost = (unitCost || 0) * (quantity || 1);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col [&>button.absolute]:hidden" onPointerDownOutside={() => onClose()} onEscapeKeyDown={() => onClose()}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex-shrink-0">
              <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleNameBlur}
                    className="text-lg font-semibold text-foreground bg-transparent outline-none w-full hover:bg-muted/50 focus:bg-muted/50 rounded px-1 -mx-1 transition-colors border border-border focus:border-primary"
                    placeholder="Part name..."
                  />
                  <div className="flex items-center gap-1 mt-0.5">
                    <Hash className="w-3 h-3 text-muted-foreground" />
                    <input
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      onBlur={handlePartNumberBlur}
                      className="text-sm text-muted-foreground bg-transparent outline-none hover:bg-muted/50 focus:bg-muted/50 rounded px-1 -mx-1 transition-colors border border-border focus:border-primary"
                      placeholder="Part number..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-foreground">{part.name || 'Unnamed Part'}</h2>
                  {part.part_number && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Hash className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{part.part_number}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {saving && (
                <span className="text-xs text-muted-foreground animate-pulse mr-2">Saving...</span>
              )}
              {!isEditing ? (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <Pencil className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(part)} className="h-8 w-8 text-muted-foreground hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Actions Row — always interactive */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {/* Status dropdown — always clickable */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:opacity-80", currentStatus.color)}>
                  <div className={cn("w-2 h-2 rounded-full", currentStatus.dot)} />
                  {currentStatus.label}
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => handleStatusChange(key)}>
                    <div className={cn("w-2 h-2 rounded-full mr-2", config.dot)} />
                    {config.label}
                    {part.status === key && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick action buttons based on status */}
            {part.status === 'ordered' && (
              <Button size="sm" variant="outline" onClick={handleMarkReceived} className="h-8 text-xs gap-1.5 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30">
                <PackageCheck className="w-3.5 h-3.5" />
                Mark Received
              </Button>
            )}
            {(part.status === 'received' || part.status === 'ready_to_install') && (
              <Button size="sm" variant="outline" onClick={handleMarkInstalled} className="h-8 text-xs gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                <Wrench className="w-3.5 h-3.5" />
                Mark Installed
              </Button>
            )}

            {/* Assignee — always clickable */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm cursor-pointer">
                  {part.assigned_name ? (
                    <>
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium", getColorForEmail(part.assigned_to))}>
                        {getInitials(part.assigned_name)}
                      </div>
                      <span className="text-foreground">{part.assigned_name}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Assign</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleAssign('unassigned')}>
                  <User className="w-4 h-4 mr-2 text-muted-foreground" />
                  Unassigned
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {teamMembers.map(m => (
                  <DropdownMenuItem key={m.id} onClick={() => handleAssign(m.email)}>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(m.email))}>
                      {getInitials(m.name)}
                    </div>
                    {m.name}
                    {part.assigned_to === m.email && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Due Date — always clickable */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm cursor-pointer">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  {part.due_date ? (
                    <span className="text-foreground">{format(parseLocalDate(part.due_date), 'MMM d')}</span>
                  ) : (
                    <span className="text-muted-foreground">Due date</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={part.due_date ? parseLocalDate(part.due_date) : undefined}
                  onSelect={handleDueDateChange}
                />
                {part.due_date && (
                  <div className="p-2 border-t border-border">
                    <Button variant="ghost" size="sm" onClick={() => handleDueDateChange(null)} className="w-full text-red-600 text-xs">
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Cost Summary Bar */}
          <div className="px-4 sm:px-6 py-3 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Qty</span>
                  {isEditing ? (
                    <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} onBlur={handleQuantityBlur}
                      className="block w-16 text-sm font-semibold text-foreground bg-transparent outline-none border border-border focus:border-primary rounded px-1.5 py-0.5 mt-0.5" />
                  ) : (
                    <p className="text-sm font-semibold text-foreground">{part.quantity || 1}</p>
                  )}
                </div>
                <span className="text-muted-foreground/50 text-lg font-light">&times;</span>
                <div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Unit Cost</span>
                  {isEditing ? (
                    <div className="relative mt-0.5">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)} onBlur={handleUnitCostBlur}
                        className="block w-24 text-sm font-semibold text-foreground bg-transparent outline-none border border-border focus:border-primary rounded pl-5 pr-1.5 py-0.5" />
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">${(part.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  )}
                </div>
                <span className="text-muted-foreground/50 text-lg font-light">=</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Details Grid — all fields always interactive */}
          <div className="px-4 sm:px-6 py-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {/* Supplier — always editable */}
              <div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Truck className="w-2.5 h-2.5" /> Supplier</span>
                <input value={supplier} onChange={(e) => setSupplier(e.target.value)} onBlur={handleSupplierBlur} placeholder="e.g., Amazon, CDW..."
                  className="w-full text-sm font-medium text-foreground bg-transparent outline-none rounded px-2 py-1 mt-0.5 placeholder-muted-foreground/40 hover:bg-muted/50 focus:bg-muted/50 focus:ring-1 focus:ring-primary/30 transition-colors" />
              </div>

              {/* Est. Delivery — always clickable */}
              <div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><CalendarIcon className="w-2.5 h-2.5" /> Est. Delivery</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full text-left text-sm rounded px-2 py-1 mt-0.5 transition-colors hover:bg-muted/50 cursor-pointer">
                      {part.est_delivery_date ? (
                        <span className="text-foreground font-medium">{format(parseLocalDate(part.est_delivery_date), 'MMM d, yyyy')}</span>
                      ) : (
                        <span className="text-muted-foreground/40">Set date...</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar mode="single" selected={part.est_delivery_date ? parseLocalDate(part.est_delivery_date) : undefined} onSelect={handleEstDeliveryChange} />
                    {part.est_delivery_date && (
                      <div className="p-2 border-t border-border">
                        <Button variant="ghost" size="sm" onClick={() => handleEstDeliveryChange(null)} className="w-full text-red-600 text-xs">Clear date</Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Purchase Link — always editable */}
              <div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Link className="w-2.5 h-2.5" /> Purchase Link</span>
                {part.purchase_link && !isEditing ? (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <a href={part.purchase_link} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 break-all">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {(() => { try { return new URL(part.purchase_link).hostname; } catch { return part.purchase_link; } })()}
                    </a>
                    <button onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <input value={purchaseLink} onChange={(e) => setPurchaseLink(e.target.value)} onBlur={handlePurchaseLinkBlur} placeholder="https://..."
                    className="w-full text-sm text-foreground bg-transparent outline-none rounded px-2 py-1 mt-0.5 placeholder-muted-foreground/40 hover:bg-muted/50 focus:bg-muted/50 focus:ring-1 focus:ring-primary/30 transition-colors" />
                )}
              </div>

              {/* Receiver — always clickable */}
              {(part.status === 'ordered' || part.status === 'received' || part.status === 'ready_to_install' || part.status === 'installed') && (
                <div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><PackageCheck className="w-2.5 h-2.5" /> Receiver</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-1.5 text-sm rounded px-2 py-1 mt-0.5 transition-colors hover:bg-muted/50 cursor-pointer">
                        {part.receiver_name ? (
                          <><div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px]", getColorForEmail(part.receiver_email))}>{getInitials(part.receiver_name)}</div>
                          <span className="text-foreground font-medium">{part.receiver_name}</span></>
                        ) : (<span className="text-muted-foreground/40">Assign...</span>)}
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleReceiverAssign('unassigned')}><User className="w-4 h-4 mr-2 text-muted-foreground" />Unassigned</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {teamMembers.map(m => (
                        <DropdownMenuItem key={m.id} onClick={() => handleReceiverAssign(m.email)}>
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(m.email))}>{getInitials(m.name)}</div>
                          {m.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Installer — always clickable */}
              {(part.status === 'received' || part.status === 'ready_to_install' || part.status === 'installed') && (
                <div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Wrench className="w-2.5 h-2.5" /> Installer</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-1.5 text-sm rounded px-2 py-1 mt-0.5 transition-colors hover:bg-muted/50 cursor-pointer">
                        {part.installer_name ? (
                          <><div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px]", getColorForEmail(part.installer_email))}>{getInitials(part.installer_name)}</div>
                          <span className="text-foreground font-medium">{part.installer_name}</span></>
                        ) : (<span className="text-muted-foreground/40">Assign...</span>)}
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleInstallerAssign('unassigned')}><User className="w-4 h-4 mr-2 text-muted-foreground" />Unassigned</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {teamMembers.map(m => (
                        <DropdownMenuItem key={m.id} onClick={() => handleInstallerAssign(m.email)}>
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(m.email))}>{getInitials(m.name)}</div>
                          {m.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Date stamps */}
            {(part.received_date || part.installed_date) && (
              <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                {part.received_date && (
                  <span className="text-xs text-muted-foreground"><span className="font-medium">Received:</span> {format(parseLocalDate(part.received_date), 'MMM d, yyyy')}</span>
                )}
                {part.installed_date && (
                  <span className="text-xs text-muted-foreground"><span className="font-medium">Installed:</span> {format(parseLocalDate(part.installed_date), 'MMM d, yyyy')}</span>
                )}
              </div>
            )}

            {/* Notes — always editable */}
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Notes</span>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={handleNotesBlur} placeholder="Add notes..."
                className="min-h-[50px] resize-none text-sm mt-1 bg-transparent border-transparent hover:border-border focus:border-border" />
            </div>
          </div>

          {/* Comments Section */}
          <div className="px-4 sm:px-6 py-3 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Comments ({comments.length})</span>
            </div>

            <div className="flex gap-2 mb-3">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] shrink-0", getColorForEmail(currentUser?.email))}>
                {getInitials(currentUser?.full_name)}
              </div>
              <div className="flex-1 flex gap-1.5">
                <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()} className="text-sm h-8" />
                <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim() || submitting}
                  className="bg-amber-500 hover:bg-amber-600 shrink-0 h-8 w-8">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto">
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-2 group">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] shrink-0 mt-0.5", getColorForEmail(comment.author_email))}>
                      {getInitials(comment.author_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs text-foreground">{comment.author_name}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(comment.created_date), 'MMM d, h:mm a')}</span>
                        {comment.author_email === currentUser?.email && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity ml-auto">
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

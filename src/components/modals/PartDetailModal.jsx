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
  needed: { label: 'Needed', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  received: { label: 'Received', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  ready_to_install: { label: 'Ready to Install', color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  installed: { label: 'Installed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] sm:max-h-[90vh] h-[100dvh] sm:h-auto overflow-hidden flex flex-col rounded-none sm:rounded-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 flex-shrink-0">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleNameBlur}
                    className="text-lg font-semibold text-slate-900 bg-transparent outline-none w-full hover:bg-slate-50 focus:bg-slate-50 rounded px-1 -mx-1 transition-colors border border-slate-200 focus:border-indigo-300"
                    placeholder="Part name..."
                  />
                  <div className="flex items-center gap-1 mt-0.5">
                    <Hash className="w-3 h-3 text-slate-400" />
                    <input
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      onBlur={handlePartNumberBlur}
                      className="text-sm text-slate-500 bg-transparent outline-none hover:bg-slate-50 focus:bg-slate-50 rounded px-1 -mx-1 transition-colors border border-slate-200 focus:border-indigo-300"
                      placeholder="Part number..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-slate-900">{part.name || 'Unnamed Part'}</h2>
                  {part.part_number && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span className="text-sm text-slate-500">{part.part_number}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {saving && (
                <span className="text-xs text-slate-400 animate-pulse mr-2">Saving...</span>
              )}
              {!isEditing ? (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                  <Pencil className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="h-8 w-8 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(part)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {/* Status - always interactive for quick workflow */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors", currentStatus.color)}>
                  <div className={cn("w-2 h-2 rounded-full", currentStatus.dot)} />
                  {currentStatus.label}
                  {isEditing && <ChevronDown className="w-3 h-3 opacity-50" />}
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
              <Button size="sm" variant="outline" onClick={handleMarkReceived} className="h-8 text-xs gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50">
                <PackageCheck className="w-3.5 h-3.5" />
                Mark Received
              </Button>
            )}
            {(part.status === 'received' || part.status === 'ready_to_install') && (
              <Button size="sm" variant="outline" onClick={handleMarkInstalled} className="h-8 text-xs gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <Wrench className="w-3.5 h-3.5" />
                Mark Installed
              </Button>
            )}

            {/* Assignee */}
            {isEditing ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm">
                    {part.assigned_name ? (
                      <>
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium", getColorForEmail(part.assigned_to))}>
                          {getInitials(part.assigned_name)}
                        </div>
                        <span className="text-slate-700">{part.assigned_name}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">Assign</span>
                      </>
                    )}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleAssign('unassigned')}>
                    <User className="w-4 h-4 mr-2 text-slate-400" />
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
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm">
                {part.assigned_name ? (
                  <>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium", getColorForEmail(part.assigned_to))}>
                      {getInitials(part.assigned_name)}
                    </div>
                    <span className="text-slate-700">{part.assigned_name}</span>
                  </>
                ) : (
                  <span className="text-slate-400">Unassigned</span>
                )}
              </div>
            )}

            {/* Due Date */}
            {isEditing ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                    {part.due_date ? (
                      <span>{format(parseLocalDate(part.due_date), 'MMM d')}</span>
                    ) : (
                      <span className="text-slate-500">Due date</span>
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
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" onClick={() => handleDueDateChange(null)} className="w-full text-red-600 text-xs">
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                {part.due_date ? (
                  <span>{format(parseLocalDate(part.due_date), 'MMM d')}</span>
                ) : (
                  <span className="text-slate-400">No due date</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Details Grid */}
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* Quantity */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Quantity</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    onBlur={handleQuantityBlur}
                    className="w-full text-sm font-medium text-slate-900 bg-transparent outline-none border border-slate-200 hover:border-slate-300 focus:border-indigo-300 rounded-lg px-3 py-2 transition-colors"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-900 px-3 py-2">{part.quantity || 1}</p>
                )}
              </div>

              {/* Unit Cost */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Unit Cost</label>
                {isEditing ? (
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                      onBlur={handleUnitCostBlur}
                      className="w-full text-sm font-medium text-slate-900 bg-transparent outline-none border border-slate-200 hover:border-slate-300 focus:border-indigo-300 rounded-lg pl-7 pr-3 py-2 transition-colors"
                    />
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-900 px-3 py-2 flex items-center gap-0.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    {(part.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              {/* Total Cost (calculated) */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Total</label>
                <div className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg">
                  <DollarSign className="w-3.5 h-3.5" />
                  {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-4">
              {/* Supplier */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Supplier
                </label>
                {isEditing ? (
                  <input
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    onBlur={handleSupplierBlur}
                    placeholder="e.g., Amazon, CDW..."
                    className="w-full text-sm text-slate-900 bg-transparent outline-none border border-slate-200 hover:border-slate-300 focus:border-indigo-300 rounded-lg px-3 py-2 transition-colors placeholder-slate-300"
                  />
                ) : (
                  <p className="text-sm text-slate-900 px-3 py-2">{part.supplier || <span className="text-slate-400">--</span>}</p>
                )}
              </div>

              {/* Est. Delivery */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Est. Delivery
                </label>
                {isEditing ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full text-left text-sm border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 transition-colors">
                        {part.est_delivery_date ? (
                          <span className="text-slate-900">{format(parseLocalDate(part.est_delivery_date), 'MMM d, yyyy')}</span>
                        ) : (
                          <span className="text-slate-300">Set delivery date...</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                      <Calendar
                        mode="single"
                        selected={part.est_delivery_date ? parseLocalDate(part.est_delivery_date) : undefined}
                        onSelect={handleEstDeliveryChange}
                      />
                      {part.est_delivery_date && (
                        <div className="p-2 border-t">
                          <Button variant="ghost" size="sm" onClick={() => handleEstDeliveryChange(null)} className="w-full text-red-600 text-xs">
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="text-sm text-slate-900 px-3 py-2">
                    {part.est_delivery_date ? format(parseLocalDate(part.est_delivery_date), 'MMM d, yyyy') : <span className="text-slate-400">--</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Purchase Link */}
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Link className="w-3 h-3" /> Purchase Link
              </label>
              {isEditing ? (
                <input
                  value={purchaseLink}
                  onChange={(e) => setPurchaseLink(e.target.value)}
                  onBlur={handlePurchaseLinkBlur}
                  placeholder="https://..."
                  className="w-full text-sm text-slate-900 bg-transparent outline-none border border-slate-200 hover:border-slate-300 focus:border-indigo-300 rounded-lg px-3 py-2 transition-colors placeholder-slate-300"
                />
              ) : (
                <div className="px-3 py-2">
                  {part.purchase_link ? (
                    <a
                      href={part.purchase_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5 break-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      {(() => {
                        try { return new URL(part.purchase_link).hostname; } catch { return part.purchase_link; }
                      })()}
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400">--</span>
                  )}
                </div>
              )}
            </div>

            {/* Receiver (show if ordered or later) */}
            {(part.status === 'ordered' || part.status === 'received' || part.status === 'ready_to_install' || part.status === 'installed') && (
              <div className="mt-4">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <PackageCheck className="w-3 h-3" /> Receiver
                </label>
                {isEditing ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-2 text-sm border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 transition-colors">
                        {part.receiver_name ? (
                          <>
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(part.receiver_email))}>
                              {getInitials(part.receiver_name)}
                            </div>
                            <span className="text-slate-900">{part.receiver_name}</span>
                          </>
                        ) : (
                          <span className="text-slate-300">Assign receiver...</span>
                        )}
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleReceiverAssign('unassigned')}>
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        Unassigned
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {teamMembers.map(m => (
                        <DropdownMenuItem key={m.id} onClick={() => handleReceiverAssign(m.email)}>
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(m.email))}>
                            {getInitials(m.name)}
                          </div>
                          {m.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <p className="text-sm text-slate-900 px-3 py-2 inline-flex items-center gap-2">
                    {part.receiver_name ? (
                      <>
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(part.receiver_email))}>
                          {getInitials(part.receiver_name)}
                        </div>
                        {part.receiver_name}
                      </>
                    ) : (
                      <span className="text-slate-400">--</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Installer (show if received or later) */}
            {(part.status === 'received' || part.status === 'ready_to_install' || part.status === 'installed') && (
              <div className="mt-4">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Installer
                </label>
                {isEditing ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-2 text-sm border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 transition-colors">
                        {part.installer_name ? (
                          <>
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(part.installer_email))}>
                              {getInitials(part.installer_name)}
                            </div>
                            <span className="text-slate-900">{part.installer_name}</span>
                          </>
                        ) : (
                          <span className="text-slate-300">Assign installer...</span>
                        )}
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleInstallerAssign('unassigned')}>
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        Unassigned
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {teamMembers.map(m => (
                        <DropdownMenuItem key={m.id} onClick={() => handleInstallerAssign(m.email)}>
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(m.email))}>
                            {getInitials(m.name)}
                          </div>
                          {m.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <p className="text-sm text-slate-900 px-3 py-2 inline-flex items-center gap-2">
                    {part.installer_name ? (
                      <>
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(part.installer_email))}>
                          {getInitials(part.installer_name)}
                        </div>
                        {part.installer_name}
                      </>
                    ) : (
                      <span className="text-slate-400">--</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Date stamps */}
            {(part.received_date || part.installed_date) && (
              <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
                {part.received_date && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Received:</span> {format(parseLocalDate(part.received_date), 'MMM d, yyyy')}
                  </div>
                )}
                {part.installed_date && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Installed:</span> {format(parseLocalDate(part.installed_date), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">Notes</label>
            {isEditing ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add notes..."
                className="min-h-[70px] resize-none border-slate-200 text-sm"
              />
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-wrap min-h-[40px] px-1">
                {part.notes || <span className="text-slate-400">No notes</span>}
              </p>
            )}
          </div>

          {/* Comments Section */}
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <label className="text-sm font-medium text-slate-700">Comments ({comments.length})</label>
            </div>

            {/* Comment Input */}
            <div className="flex gap-2 mb-4">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0", getColorForEmail(currentUser?.email))}>
                {getInitials(currentUser?.full_name)}
              </div>
              <div className="flex-1 flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                  className="text-sm"
                />
                <Button
                  size="icon"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submitting}
                  className="bg-amber-500 hover:bg-amber-600 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 group">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0", getColorForEmail(comment.author_email))}>
                      {getInitials(comment.author_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                        </span>
                        {comment.author_email === currentUser?.email && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No comments yet</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

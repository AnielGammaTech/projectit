import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  CalendarIcon, ShoppingCart, ImagePlus, Loader2, X, Check,
  ChevronDown, User, Package
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/api/apiClient';
import { cn } from '@/lib/utils';

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

export default function QuickOrderModal({ open, onClose, part, onSave, teamMembers = [] }) {
  const [estDeliveryDate, setEstDeliveryDate] = useState(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverName, setReceiverName] = useState('');

  // Reset state when modal opens with a new part
  useEffect(() => {
    if (open && part) {
      setEstDeliveryDate(null);
      setOrderNotes('');
      setImageUrl('');
      setReceiverEmail(part.installer_email || part.receiver_email || '');
      setReceiverName(part.installer_name || part.receiver_name || '');
    }
  }, [open, part?.id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  // Paste from clipboard
  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        setUploading(true);
        try {
          const { file_url } = await api.integrations.Core.UploadFile({ file });
          setImageUrl(file_url);
        } catch (err) {
          console.error('Paste upload failed:', err);
        }
        setUploading(false);
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [open, handlePaste]);

  const handleReceiverAssign = (email) => {
    if (email === 'unassigned') {
      setReceiverEmail('');
      setReceiverName('');
    } else {
      const member = teamMembers.find(m => m.email === email);
      setReceiverEmail(email);
      setReceiverName(member?.name || email);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const updateData = {
      status: 'ordered',
      est_delivery_date: estDeliveryDate ? format(estDeliveryDate, 'yyyy-MM-dd') : null,
    };

    // Build notes: combine order notes + image
    const notesParts = [];
    if (orderNotes.trim()) notesParts.push(`Order notes:${orderNotes.trim()}`);
    if (imageUrl) notesParts.push(`Order Photo: ${imageUrl}`);

    if (notesParts.length > 0) {
      updateData.notes = part.notes
        ? `${part.notes}\n\n${notesParts.join('\n')}`
        : notesParts.join('\n');
    }

    if (imageUrl) {
      updateData.order_screenshot = imageUrl;
    }

    // Reassign part to the receiver — the purchaser shouldn't own it after ordering
    if (receiverEmail) {
      updateData.assigned_to = receiverEmail;
      updateData.assigned_name = receiverName;
      updateData.receiver_email = receiverEmail;
      updateData.receiver_name = receiverName;
      updateData.installer_email = receiverEmail;
      updateData.installer_name = receiverName;
    }

    await onSave(part.id, updateData);
    setSaving(false);
    onClose();
  };

  if (!part) return null;

  const selectedReceiver = receiverEmail
    ? teamMembers.find(m => m.email === receiverEmail)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Order Part</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {part.name}
                {part.part_number && <span className="text-slate-400"> (#{part.part_number})</span>}
                {' '}&middot; Qty: {part.quantity || 1}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Receiver Assignment */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <User className="w-3 h-3" />
              Receiver / Installer
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors text-sm">
                  {selectedReceiver ? (
                    <div className="flex items-center gap-2">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium", getColorForEmail(receiverEmail))}>
                        {getInitials(receiverName)}
                      </div>
                      <span className="font-medium text-slate-900">{receiverName}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400">Who will receive & install this?</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {receiverEmail && (
                  <>
                    <DropdownMenuItem onClick={() => handleReceiverAssign('unassigned')}>
                      <X className="w-4 h-4 mr-2 text-slate-400" />
                      Clear
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {teamMembers.map(m => (
                  <DropdownMenuItem key={m.id} onClick={() => handleReceiverAssign(m.email)}>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(m.email))}>
                      {getInitials(m.name)}
                    </div>
                    <span className="flex-1">{m.name}</span>
                    {receiverEmail === m.email && <Check className="w-4 h-4 text-blue-600" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ImagePlus className="w-3 h-3" />
              Order Confirmation Screenshot
              <span className="text-slate-300 font-normal normal-case">(optional)</span>
            </label>
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200">
                <img src={imageUrl} alt="Order confirmation" className="w-full h-32 object-cover" />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 py-6 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5 text-slate-300" />
                    <span className="text-sm text-slate-400">Click to upload or paste screenshot</span>
                    <span className="text-[10px] text-slate-300">Ctrl+V to paste from clipboard</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Estimated Delivery Date */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Package className="w-3 h-3" />
              Estimated Delivery Date
              <span className="text-slate-300 font-normal normal-case">(optional)</span>
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors text-sm text-left">
                  <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  {estDeliveryDate ? (
                    <span className="text-slate-900">{format(estDeliveryDate, 'MMM d, yyyy')}</span>
                  ) : (
                    <span className="text-slate-400">Pick a date...</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]">
                <Calendar
                  mode="single"
                  selected={estDeliveryDate}
                  onSelect={setEstDeliveryDate}
                />
                {estDeliveryDate && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => setEstDeliveryDate(null)} className="w-full text-red-600 text-xs">
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Order Notes */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
              Order Notes
              <span className="text-slate-300 font-normal normal-case ml-1">(optional)</span>
            </label>
            <Textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Order #, tracking info, vendor details..."
              className="min-h-[80px] resize-none text-sm border-slate-200"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" onClick={onClose} disabled={saving} className="px-4">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 gap-2 px-5"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            Mark as Ordered
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

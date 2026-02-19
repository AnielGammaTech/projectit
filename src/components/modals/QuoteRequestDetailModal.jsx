import { useState } from 'react';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, DollarSign, Building2, Package, Edit2, Trash2, 
  User, Clock, Loader2, CheckCircle2, Truck, Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-700' },
  quoted: { label: 'Quoted', color: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  ordered: { label: 'Ordered', color: 'bg-amber-100 text-amber-700' },
  received: { label: 'Received', color: 'bg-green-100 text-green-700' }
};

const statusFlow = ['pending', 'in_review', 'quoted', 'approved', 'ordered', 'received'];

export default function QuoteRequestDetailModal({ 
  open, onClose, quote, projects, currentUser, isAdmin, onEdit, onDelete, onUpdated 
}) {
  const [loading, setLoading] = useState(false);
  const [adminData, setAdminData] = useState({
    quote_amount: '',
    vendor: '',
    expected_delivery: '',
    install_date: '',
    notes: ''
  });

  if (!quote) return null;

  const project = projects?.find(p => p.id === quote.project_id);
  const status = statusConfig[quote.status] || statusConfig.pending;
  const isOwner = currentUser?.email === quote.requested_by_email;

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    await api.entities.QuoteRequest.update(quote.id, { status: newStatus });
    onUpdated();
    setLoading(false);
  };

  const handleAdminUpdate = async () => {
    setLoading(true);
    const updates = {};
    if (adminData.quote_amount) updates.quote_amount = parseFloat(adminData.quote_amount);
    if (adminData.vendor) updates.vendor = adminData.vendor;
    if (adminData.expected_delivery) updates.expected_delivery = adminData.expected_delivery;
    if (adminData.install_date) updates.install_date = adminData.install_date;
    if (adminData.notes) updates.notes = adminData.notes;

    await api.entities.QuoteRequest.update(quote.id, updates);
    onUpdated();
    setAdminData({ quote_amount: '', vendor: '', expected_delivery: '', install_date: '', notes: '' });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{quote.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={status.color}>{status.label}</Badge>
                {quote.priority === 'urgent' && (
                  <Badge variant="destructive">Urgent</Badge>
                )}
              </div>
            </div>
            {(isOwner || isAdmin) && (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(quote)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => onDelete(quote)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Progress */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            {statusFlow.map((s, idx) => {
              const isActive = statusFlow.indexOf(quote.status) >= idx;
              const isCurrent = quote.status === s;
              return (
                <div key={s} className="flex items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                    isActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500",
                    isCurrent && "ring-2 ring-indigo-300 ring-offset-2"
                  )}>
                    {idx + 1}
                  </div>
                  {idx < statusFlow.length - 1 && (
                    <div className={cn(
                      "w-6 h-0.5 mx-1",
                      isActive ? "bg-indigo-600" : "bg-slate-200"
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Requested by</span>
              <span className="font-medium">{quote.requested_by_name}</span>
            </div>
            {quote.assigned_to_name && (
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-600">Assigned to</span>
                <span className="font-medium text-indigo-600">{quote.assigned_to_name}</span>
              </div>
            )}
            {project && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Project</span>
                <span className="font-medium">{project.name}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Created</span>
              <span className="font-medium">{format(new Date(quote.created_date), 'PPP')}</span>
            </div>
            {quote.quote_link && (
              <a 
                href={quote.quote_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <LinkIcon className="w-4 h-4" />
                View Quote/Reference Link
              </a>
            )}
          </div>

          {/* Description */}
          <div>
            <Label className="text-slate-500 text-sm">Description</Label>
            <p className="mt-1 text-slate-700">{quote.description}</p>
          </div>

          {/* Items */}
          {quote.items?.length > 0 && (
            <div>
              <Label className="text-slate-500 text-sm">Items</Label>
              <div className="mt-2 space-y-2">
                {quote.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="outline">x{item.quantity}</Badge>
                    {item.notes && <span className="text-sm text-slate-500">{item.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quote Info (if available) */}
          {(quote.quote_amount || quote.vendor || quote.expected_delivery || quote.install_date) && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
              <h4 className="font-semibold text-emerald-800">Quote Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {quote.quote_amount && (
                  <div>
                    <span className="text-emerald-600">Amount</span>
                    <p className="font-bold text-emerald-800 text-lg">${quote.quote_amount.toLocaleString()}</p>
                  </div>
                )}
                {quote.vendor && (
                  <div>
                    <span className="text-emerald-600">Vendor</span>
                    <p className="font-medium text-emerald-800">{quote.vendor}</p>
                  </div>
                )}
                {quote.expected_delivery && (
                  <div>
                    <span className="text-emerald-600">Expected Delivery</span>
                    <p className="font-medium text-emerald-800">{format(new Date(quote.expected_delivery), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {quote.install_date && (
                  <div>
                    <span className="text-emerald-600">Install Date</span>
                    <p className="font-medium text-emerald-800">{format(new Date(quote.install_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
              {quote.notes && (
                <div>
                  <span className="text-emerald-600 text-sm">Notes</span>
                  <p className="text-emerald-800 mt-1">{quote.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Admin Controls */}
          {isAdmin && quote.status !== 'received' && (
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4">
              <h4 className="font-semibold text-indigo-800">Account Management</h4>
              
              <div className="flex items-center gap-3">
                <Label className="text-sm w-24">Status</Label>
                <Select value={quote.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="flex-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Quote Amount</Label>
                  <Input
                    type="number"
                    placeholder={quote.quote_amount || "0.00"}
                    value={adminData.quote_amount}
                    onChange={(e) => setAdminData(prev => ({ ...prev, quote_amount: e.target.value }))}
                    className="mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-sm">Vendor</Label>
                  <Input
                    placeholder={quote.vendor || "Enter vendor"}
                    value={adminData.vendor}
                    onChange={(e) => setAdminData(prev => ({ ...prev, vendor: e.target.value }))}
                    className="mt-1 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Expected Delivery</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-1 justify-start bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {adminData.expected_delivery ? format(new Date(adminData.expected_delivery), 'MMM d') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={adminData.expected_delivery ? new Date(adminData.expected_delivery) : undefined}
                        onSelect={(date) => setAdminData(prev => ({ ...prev, expected_delivery: date ? format(date, 'yyyy-MM-dd') : '' }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm">Install Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-1 justify-start bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {adminData.install_date ? format(new Date(adminData.install_date), 'MMM d') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={adminData.install_date ? new Date(adminData.install_date) : undefined}
                        onSelect={(date) => setAdminData(prev => ({ ...prev, install_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label className="text-sm">Notes for Tech</Label>
                <Textarea
                  placeholder={quote.notes || "Add notes..."}
                  value={adminData.notes}
                  onChange={(e) => setAdminData(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-1 bg-white h-16"
                />
              </div>

              <Button 
                onClick={handleAdminUpdate} 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Quote Details
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
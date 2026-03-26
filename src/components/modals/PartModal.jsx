import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Package, Search, Link2, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PartModal({ open, onClose, part, projectId, teamMembers = [], onSave }) {
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    part_number: '',
    product_id: '',
    quantity: 1,
    unit_cost: 0,
    status: 'needed',
    supplier: '',
    notes: '',
    assigned_to: '',
    assigned_name: '',
    due_date: '',
    est_delivery_date: ''
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
    staleTime: 300000,
    enabled: open
  });

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 10);

  useEffect(() => {
    if (part) {
      setFormData({
        name: part.name || '',
        part_number: part.part_number || '',
        product_id: part.product_id || '',
        quantity: part.quantity || 1,
        unit_cost: part.unit_cost || 0,
        status: part.status || 'needed',
        supplier: part.supplier || '',
        notes: part.notes || '',
        assigned_to: part.assigned_to || '',
        assigned_name: part.assigned_name || '',
        due_date: part.due_date || '',
        est_delivery_date: part.est_delivery_date || ''
      });
      if (part.product_id) {
        const linkedProduct = products.find(p => p.id === part.product_id);
        if (linkedProduct) setProductSearch(linkedProduct.name);
      }
    } else {
      setFormData({
        name: '',
        part_number: '',
        product_id: '',
        quantity: 1,
        unit_cost: 0,
        status: 'needed',
        supplier: '',
        notes: '',
        assigned_to: '',
        assigned_name: '',
        est_delivery_date: '',
        due_date: ''
      });
      setProductSearch('');
    }
  }, [part, open, products]);

  const handleSelectProduct = (product) => {
    setFormData(prev => ({
      ...prev,
      product_id: product.id,
      name: prev.name || product.name,
      part_number: prev.part_number || product.sku || '',
      unit_cost: prev.unit_cost || product.cost || product.selling_price || 0
    }));
    setProductSearch(product.name);
    setShowProductDropdown(false);
  };

  const handleClearProduct = () => {
    setFormData(prev => ({ ...prev, product_id: '' }));
    setProductSearch('');
  };

  const handleAssigneeChange = (email) => {
    if (email === 'unassigned') {
      setFormData(prev => ({ ...prev, assigned_to: '', assigned_name: '' }));
    } else {
      const member = teamMembers.find(m => m.email === email);
      setFormData(prev => ({
        ...prev,
        assigned_to: email,
        assigned_name: member?.name || ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    await onSave({ ...formData, project_id: projectId });
    setSaving(false);
  };

  const isEdit = !!part;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
                <Package className="w-4 h-4 text-white" />
              </div>
              {isEdit ? 'Edit Part' : 'Add Part'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-6 space-y-5">
            {/* Link to Product */}
            <div className="relative">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-2">
                <Link2 className="w-3.5 h-3.5 text-emerald-500" />
                Link to Stock Product
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Search products in stock..."
                  className={cn("pl-10", formData.product_id && "border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10")}
                />
                {formData.product_id && (
                  <button type="button" onClick={handleClearProduct} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1e2a3a] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-auto">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className="w-full px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center gap-3 transition-colors"
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          <Package className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-slate-800 dark:text-slate-200">{product.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{product.sku || 'No SKU'} · ${product.cost || product.selling_price || 0}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Part Name & Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Part Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Network Switch"
                  required
                />
              </div>
              <div>
                <Label htmlFor="part_number" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Part Number</Label>
                <Input
                  id="part_number"
                  value={formData.part_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, part_number: e.target.value }))}
                  placeholder="e.g., SW-2048G"
                />
              </div>
            </div>

            {/* Quantity, Cost, Status */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantity" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="unit_cost" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Unit Cost ($)</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
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

            {/* Supplier & Purchase Link */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="e.g., Amazon, CDW"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Assign To</Label>
                <Select value={formData.assigned_to || 'unassigned'} onValueChange={handleAssigneeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.email}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start font-normal", !formData.due_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date ? format(new Date(formData.due_date.split('T')[0] + 'T12:00:00'), 'MMM d, yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.due_date ? new Date(formData.due_date.split('T')[0] + 'T12:00:00') : undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Est. Delivery</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start font-normal", !formData.est_delivery_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.est_delivery_date ? format(new Date(formData.est_delivery_date.split('T')[0] + 'T12:00:00'), 'MMM d, yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.est_delivery_date ? new Date(formData.est_delivery_date.split('T')[0] + 'T12:00:00') : undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, est_delivery_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                className="h-20 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-[#151d2b]/50 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="bg-[#0069AF] hover:bg-[#0F2F44]" disabled={saving || !formData.name}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Update Part' : 'Add Part'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { CalendarIcon, Loader2, Package, Search } from 'lucide-react';
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
      // Set product search to show linked product name
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{part ? 'Edit Part' : 'Add Part'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Link to Product from Stock */}
          <div className="relative">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Link to Stock Product (optional)
            </Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Search products in stock..."
                className={cn("pl-10", formData.product_id && "border-emerald-300 bg-emerald-50")}
              />
              {formData.product_id && (
                <button
                  type="button"
                  onClick={handleClearProduct}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>
            {showProductDropdown && productSearch && filteredProducts.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-3"
                  >
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                        <Package className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.sku || 'No SKU'} • ${product.cost || product.selling_price || 0}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Part Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Network Switch"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="part_number">Part Number</Label>
              <Input
                id="part_number"
                value={formData.part_number}
                onChange={(e) => setFormData(prev => ({ ...prev, part_number: e.target.value }))}
                placeholder="e.g., SW-2048G"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="unit_cost">Unit Cost ($)</Label>
              <Input
                id="unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger className="mt-1.5">
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

          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
              placeholder="e.g., Amazon, CDW, NewEgg"
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assign To</Label>
              <Select value={formData.assigned_to || 'unassigned'} onValueChange={handleAssigneeChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.email}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(new Date(formData.due_date.split('T')[0] + 'T12:00:00'), 'PPP') : 'Pick date'}
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
          </div>

          <div>
            <Label>Est. Delivery Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.est_delivery_date ? format(new Date(formData.est_delivery_date.split('T')[0] + 'T12:00:00'), 'PPP') : 'Pick delivery date'}
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

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              className="mt-1.5 h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {part ? 'Update Part' : 'Add Part'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
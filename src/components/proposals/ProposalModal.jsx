import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Plus, Trash2, Package, PenLine, Search } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ProposalModal({ open, onClose, proposal, customers, inventory, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    customer_name: '',
    customer_email: '',
    customer_company: '',
    customer_phone: '',
    customer_address: '',
    items: [],
    notes: '',
    terms_conditions: 'Payment due within 30 days of approval. All prices valid for 30 days.',
    valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    status: 'draft'
  });
  const [searchInventory, setSearchInventory] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');

  useEffect(() => {
    if (proposal) {
      setFormData({
        title: proposal.title || '',
        customer_name: proposal.customer_name || '',
        customer_email: proposal.customer_email || '',
        customer_company: proposal.customer_company || '',
        customer_phone: proposal.customer_phone || '',
        customer_address: proposal.customer_address || '',
        items: proposal.items || [],
        notes: proposal.notes || '',
        terms_conditions: proposal.terms_conditions || '',
        valid_until: proposal.valid_until || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        status: proposal.status || 'draft'
      });
    } else {
      setFormData({
        title: '',
        customer_name: '',
        customer_email: '',
        customer_company: '',
        customer_phone: '',
        customer_address: '',
        items: [],
        notes: '',
        terms_conditions: 'Payment due within 30 days of approval. All prices valid for 30 days.',
        valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        status: 'draft'
      });
    }
    setSelectedCustomer('');
    setSearchInventory('');
  }, [proposal, open]);

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_company: customer.company || '',
        customer_phone: customer.phone || '',
        customer_address: [customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')
      }));
      setSelectedCustomer(customerId);
    }
  };

  const addInventoryItem = (item) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        type: 'inventory',
        inventory_item_id: item.id,
        name: item.name,
        description: item.description || '',
        quantity: 1,
        unit_price: item.sell_price || item.unit_cost || 0,
        discount_percent: 0,
        tax_percent: 0
      }]
    }));
  };

  const addCustomItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        type: 'custom',
        name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_percent: 0
      }]
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    formData.items.forEach(item => {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const discount = lineTotal * ((item.discount_percent || 0) / 100);
      const afterDiscount = lineTotal - discount;
      const tax = afterDiscount * ((item.tax_percent || 0) / 100);
      
      subtotal += lineTotal;
      discountTotal += discount;
      taxTotal += tax;
    });

    return {
      subtotal,
      discount_total: discountTotal,
      tax_total: taxTotal,
      total: subtotal - discountTotal + taxTotal
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totals = calculateTotals();
    onSave({ ...formData, ...totals });
  };

  const totals = calculateTotals();
  const filteredInventory = inventory.filter(item => 
    item.name?.toLowerCase().includes(searchInventory.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchInventory.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposal ? 'Edit Proposal' : 'New Proposal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="items">Line Items ({formData.items.length})</TabsTrigger>
              <TabsTrigger value="terms">Terms & Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div>
                <Label>Proposal Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Network Infrastructure Upgrade"
                  required
                  className="mt-1"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                <Label className="font-semibold">Customer Information</Label>
                
                {customers.length > 0 && (
                  <Select value={selectedCustomer} onValueChange={handleCustomerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.company && `(${c.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Name *</Label>
                    <Input
                      value={formData.customer_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email *</Label>
                    <Input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Company</Label>
                    <Input
                      value={formData.customer_company}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_company: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={formData.customer_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Address</Label>
                  <Input
                    value={formData.customer_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Valid Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-1 justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.valid_until ? format(new Date(formData.valid_until), 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.valid_until ? new Date(formData.valid_until) : undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, valid_until: date ? format(date, 'yyyy-MM-dd') : '' }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={addCustomItem} className="flex-1">
                  <PenLine className="w-4 h-4 mr-2" />
                  Add Custom Item
                </Button>
              </div>

              {/* Inventory Search */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <Label className="text-sm font-medium mb-2 block">Add from Inventory</Label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search inventory..."
                    value={searchInventory}
                    onChange={(e) => setSearchInventory(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchInventory && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredInventory.slice(0, 10).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { addInventoryItem(item); setSearchInventory(''); }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{item.name}</span>
                          {item.sku && <span className="text-xs text-slate-400">({item.sku})</span>}
                        </div>
                        <span className="text-sm font-medium">${item.sell_price || item.unit_cost || 0}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          className="font-medium"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="mb-3 text-sm"
                    />
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Discount %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount_percent}
                          onChange={(e) => updateItem(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tax %</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.tax_percent}
                          onChange={(e) => updateItem(idx, 'tax_percent', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="text-right mt-2 text-sm font-medium text-slate-900">
                      Line Total: ${((item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount_percent || 0) / 100) * (1 + (item.tax_percent || 0) / 100)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              {formData.items.length > 0 && (
                <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discount_total > 0 && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Discount</span>
                      <span>-${totals.discount_total.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.tax_total > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>${totals.tax_total.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-700">
                    <span>Total</span>
                    <span>${totals.total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="terms" className="space-y-4 mt-4">
              <div>
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                  className="mt-1 h-32"
                  placeholder="Enter terms and conditions..."
                />
              </div>
              <div>
                <Label>Internal Notes (not shown to customer)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-1 h-24"
                  placeholder="Internal notes..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#0069AF] hover:bg-[#133F5C]">
              {proposal ? 'Update Proposal' : 'Create Proposal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
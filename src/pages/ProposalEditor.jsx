import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Save, Send, Plus, Trash2, Package, PenLine, 
  Search, GripVertical, ChevronDown, ChevronUp, Edit2, X,
  Calendar, User, Building2, Mail, Phone, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ProposalEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const proposalId = urlParams.get('id');
  const queryClient = useQueryClient();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingAreaIndex, setEditingAreaIndex] = useState(null);
  const [searchInventory, setSearchInventory] = useState('');
  const [expandedAreas, setExpandedAreas] = useState({});
  
  const [formData, setFormData] = useState({
    proposal_number: '',
    title: '',
    customer_name: '',
    customer_email: '',
    customer_company: '',
    customer_phone: '',
    customer_address: '',
    project_id: '',
    areas: [],
    notes: '',
    terms_conditions: 'Payment due within 30 days of approval. All prices valid for 30 days.',
    valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    sales_tax_percent: 0,
    status: 'draft'
  });

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    quantity: 1,
    unit_price: 0
  });

  const [newCustomer, setNewCustomer] = useState({
    name: '', email: '', phone: '', company: ''
  });
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      if (!proposalId) return null;
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      return proposals[0];
    },
    enabled: !!proposalId
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: allProposals = [] } = useQuery({
    queryKey: ['allProposalsCount'],
    queryFn: () => base44.entities.Proposal.list(),
    enabled: !proposalId
  });

  useEffect(() => {
    if (proposal) {
      // Convert old items format to areas format if needed
      let areas = proposal.areas || [];
      if (!areas.length && proposal.items?.length) {
        areas = [{ name: 'Items', items: proposal.items }];
      }
      
      setFormData({
        proposal_number: proposal.proposal_number || '',
        title: proposal.title || '',
        customer_name: proposal.customer_name || '',
        customer_email: proposal.customer_email || '',
        customer_company: proposal.customer_company || '',
        customer_phone: proposal.customer_phone || '',
        customer_address: proposal.customer_address || '',
        project_id: proposal.project_id || '',
        areas: areas,
        notes: proposal.notes || '',
        terms_conditions: proposal.terms_conditions || '',
        valid_until: proposal.valid_until || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        sales_tax_percent: proposal.sales_tax_percent || 0,
        status: proposal.status || 'draft'
      });
      
      // Expand all areas by default
      const expanded = {};
      areas.forEach((_, idx) => { expanded[idx] = true; });
      setExpandedAreas(expanded);
    } else if (!proposalId && allProposals) {
      // New proposal - generate sequential number
      const nextNumber = (allProposals.length + 1).toString().padStart(4, '0');
      const proposalNumber = `P-${nextNumber}`;
      setFormData(prev => ({ ...prev, proposal_number: proposalNumber }));
    }
  }, [proposal, proposalId, allProposals]);

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
    }
    setShowCustomerModal(false);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) return;
    const created = await base44.entities.Customer.create(newCustomer);
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    setFormData(prev => ({
      ...prev,
      customer_name: newCustomer.name,
      customer_email: newCustomer.email,
      customer_company: newCustomer.company || '',
      customer_phone: newCustomer.phone || ''
    }));
    setNewCustomer({ name: '', email: '', phone: '', company: '' });
    setShowNewCustomerForm(false);
    setShowCustomerModal(false);
  };

  const addArea = () => {
    const areaName = `Area ${formData.areas.length + 1}`;
    setFormData(prev => ({
      ...prev,
      areas: [...prev.areas, { name: areaName, items: [] }]
    }));
    setExpandedAreas(prev => ({ ...prev, [formData.areas.length]: true }));
  };

  const updateAreaName = (index, name) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map((area, i) => i === index ? { ...area, name } : area)
    }));
  };

  const removeArea = (index) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.filter((_, i) => i !== index)
    }));
  };

  const toggleArea = (index) => {
    setExpandedAreas(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const addItemToArea = (areaIndex, item) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map((area, i) => 
        i === areaIndex 
          ? { ...area, items: [...area.items, item] }
          : area
      )
    }));
  };

  const updateItemInArea = (areaIndex, itemIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map((area, i) => 
        i === areaIndex 
          ? { 
              ...area, 
              items: area.items.map((item, j) => 
                j === itemIndex ? { ...item, [field]: value } : item
              )
            }
          : area
      )
    }));
  };

  const removeItemFromArea = (areaIndex, itemIndex) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map((area, i) => 
        i === areaIndex 
          ? { ...area, items: area.items.filter((_, j) => j !== itemIndex) }
          : area
      )
    }));
  };

  const addInventoryItem = (inventoryItem) => {
    if (editingAreaIndex === null) return;
    addItemToArea(editingAreaIndex, {
      type: 'inventory',
      inventory_item_id: inventoryItem.id,
      name: inventoryItem.name,
      description: inventoryItem.description || '',
      quantity: 1,
      unit_price: inventoryItem.sell_price || inventoryItem.unit_cost || 0
    });
    setSearchInventory('');
  };

  const addCustomItem = () => {
    if (editingAreaIndex === null || !newItem.name) return;
    addItemToArea(editingAreaIndex, {
      type: 'custom',
      ...newItem
    });
    setNewItem({ name: '', description: '', quantity: 1, unit_price: 0 });
    setShowItemModal(false);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    formData.areas.forEach(area => {
      area.items?.forEach(item => {
        subtotal += (item.quantity || 0) * (item.unit_price || 0);
      });
    });
    const taxAmount = subtotal * ((formData.sales_tax_percent || 0) / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const handleSave = async () => {
    setSaving(true);
    const totals = calculateTotals();
    
    // Flatten items for backward compatibility
    const allItems = formData.areas.flatMap(area => area.items || []);
    
    const data = {
      ...formData,
      items: allItems,
      subtotal: totals.subtotal,
      tax_total: totals.taxAmount,
      total: totals.total,
      created_by_email: currentUser?.email,
      created_by_name: currentUser?.full_name
    };

    if (proposalId) {
      await base44.entities.Proposal.update(proposalId, data);
    } else {
      const approvalToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const newProposal = await base44.entities.Proposal.create({
        ...data,
        approval_token: approvalToken
      });
      window.location.href = createPageUrl('ProposalEditor') + `?id=${newProposal.id}`;
    }
    
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    setSaving(false);
  };

  const totals = calculateTotals();
  const filteredInventory = inventory.filter(item =>
    item.name?.toLowerCase().includes(searchInventory.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchInventory.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Proposals')} className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">{formData.proposal_number}</span>
                <Badge variant="outline" className="text-xs">{formData.status}</Badge>
              </div>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Proposal Title"
                className="border-0 p-0 h-auto text-lg font-semibold focus-visible:ring-0 bg-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Link to={createPageUrl('ProposalView') + `?id=${proposalId}`}>
              <Button className="bg-[#0069AF] hover:bg-[#133F5C]">
                Preview
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Project Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center gap-4">
                {formData.customer_name ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-[#0069AF] font-semibold text-sm">
                      {formData.customer_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#133F5C] truncate">{formData.customer_name}</p>
                      <p className="text-xs text-slate-500 truncate">{formData.customer_email}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 text-sm text-slate-500">No customer selected</div>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowCustomerModal(true)} className="shrink-0">
                  {formData.customer_name ? 'Change' : 'Select'}
                </Button>
              </div>
              
              {/* Project Link */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <Label className="text-xs text-slate-500">Linked Project</Label>
                <Select value={formData.project_id || 'none'} onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Link to project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.filter(p => p.status !== 'archived').map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Areas & Items */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-xl font-bold text-slate-900 mb-4">Areas & Items</h2>
              
              {formData.areas.length > 0 ? (
                <div className="space-y-4">
                  {formData.areas.map((area, areaIndex) => (
                    <div key={areaIndex} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {/* Area Header */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <button onClick={() => toggleArea(areaIndex)} className="text-slate-400 hover:text-slate-600">
                            {expandedAreas[areaIndex] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          <Input
                            value={area.name}
                            onChange={(e) => updateAreaName(areaIndex, e.target.value)}
                            className="border-0 bg-transparent font-semibold p-0 h-auto focus-visible:ring-0"
                          />
                          <Badge variant="outline">{area.items?.length || 0} items</Badge>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeArea(areaIndex)} className="text-red-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Area Items */}
                      {expandedAreas[areaIndex] && (
                        <div className="p-4">
                          {area.items?.length > 0 ? (
                            <div className="space-y-3 mb-4">
                              {area.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                  <div className="flex-1 grid grid-cols-12 gap-3 items-start">
                                    <div className="col-span-5">
                                      <Input
                                        value={item.name}
                                        onChange={(e) => updateItemInArea(areaIndex, itemIndex, 'name', e.target.value)}
                                        placeholder="Item name"
                                        className="font-medium"
                                      />
                                      <Input
                                        value={item.description}
                                        onChange={(e) => updateItemInArea(areaIndex, itemIndex, 'description', e.target.value)}
                                        placeholder="Description"
                                        className="mt-1 text-sm"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <Label className="text-xs text-slate-500">Qty</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItemInArea(areaIndex, itemIndex, 'quantity', parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <Label className="text-xs text-slate-500">Price</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.unit_price}
                                        onChange={(e) => updateItemInArea(areaIndex, itemIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <Label className="text-xs text-slate-500">Total</Label>
                                      <p className="font-semibold text-slate-900 mt-2">
                                        ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                                      </p>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeItemFromArea(areaIndex, itemIndex)}
                                        className="text-slate-400 hover:text-red-500"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {/* Add Item Buttons */}
                          <div className="flex gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setEditingAreaIndex(areaIndex)}>
                                  <Package className="w-4 h-4 mr-2" />
                                  Add from Inventory
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-3" align="start">
                                <div className="relative mb-2">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <Input
                                    placeholder="Search inventory..."
                                    value={searchInventory}
                                    onChange={(e) => { setSearchInventory(e.target.value); setEditingAreaIndex(areaIndex); }}
                                    className="pl-8"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                  {filteredInventory.slice(0, 10).map(item => (
                                    <button
                                      key={item.id}
                                      onClick={() => addInventoryItem(item)}
                                      className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-100 text-left"
                                    >
                                      <span className="text-sm truncate">{item.name}</span>
                                      <span className="text-sm font-medium">${item.sell_price || item.unit_cost || 0}</span>
                                    </button>
                                  ))}
                                  {filteredInventory.length === 0 && (
                                    <p className="text-sm text-slate-500 text-center py-4">No items found</p>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => { setEditingAreaIndex(areaIndex); setShowItemModal(true); }}
                            >
                              <PenLine className="w-4 h-4 mr-2" />
                              Add Custom Item
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <p className="text-slate-500 mb-2">No items on this proposal yet</p>
                  <p className="text-sm text-slate-400 mb-4">Items must be added to an 'area'</p>
                </div>
              )}

              <Button onClick={addArea} className="mt-4 bg-[#0069AF] hover:bg-[#133F5C]">
                Create an Area
              </Button>
            </motion.div>

            {/* Financial Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-bold text-slate-900 mb-4">Financial Summary</h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-6 bg-slate-50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-slate-700">Subtotal</span>
                    <span className="font-semibold text-slate-900">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-slate-700">Sales Tax</span>
                      <button 
                        onClick={() => {
                          const newTax = prompt('Enter sales tax percentage:', formData.sales_tax_percent);
                          if (newTax !== null) setFormData(prev => ({ ...prev, sales_tax_percent: parseFloat(newTax) || 0 }));
                        }}
                        className="ml-2 text-sm text-[#f97316] hover:underline"
                      >
                        Edit
                      </button>
                      <p className="text-xs text-slate-500">{formData.sales_tax_percent}% rate</p>
                    </div>
                    <span className="font-semibold text-slate-900">${totals.taxAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="p-6 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-lg font-bold text-slate-900">Proposal Total</span>
                      <p className="text-xs text-slate-500">Recurring services not included</p>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">${totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Valid Until */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <Label className="text-sm font-medium">Valid Until</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-2 justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formData.valid_until ? format(new Date(formData.valid_until), 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.valid_until ? new Date(formData.valid_until) : undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, valid_until: date ? format(date, 'yyyy-MM-dd') : '' }))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <Label className="text-sm font-medium">Terms & Conditions</Label>
              <Textarea
                value={formData.terms_conditions}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                className="mt-2 h-32"
              />
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <Label className="text-sm font-medium">Internal Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-2 h-24"
                placeholder="Notes (not shown to customer)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      <Dialog open={showCustomerModal} onOpenChange={(open) => { setShowCustomerModal(open); if (!open) setShowNewCustomerForm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{showNewCustomerForm ? 'New Customer' : 'Select Customer'}</DialogTitle>
          </DialogHeader>
          
          {showNewCustomerForm ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={newCustomer.name} onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))} className="mt-1 h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Company</Label>
                  <Input value={newCustomer.company} onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={newCustomer.phone} onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))} className="mt-1 h-9" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewCustomerForm(false)} className="flex-1">Back</Button>
                <Button size="sm" onClick={handleCreateCustomer} className="flex-1 bg-[#0069AF] hover:bg-[#133F5C]">Create & Select</Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowNewCustomerForm(true)} className="w-full mb-3">
                <Plus className="w-4 h-4 mr-2" />
                Create New Customer
              </Button>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {customers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-[#0069AF] font-semibold text-sm">
                      {customer.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{customer.name}</p>
                      <p className="text-xs text-slate-500 truncate">{customer.email}</p>
                    </div>
                  </button>
                ))}
                {customers.length === 0 && (
                  <p className="text-center text-slate-500 py-6 text-sm">No customers yet</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Item Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.unit_price}
                  onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowItemModal(false)}>Cancel</Button>
              <Button onClick={addCustomItem} className="bg-[#0069AF] hover:bg-[#133F5C]">Add Item</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
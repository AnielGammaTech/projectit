import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Save, Send, Plus, Trash2, Package, 
  Search, ChevronDown, ChevronUp, X, Eye,
  Calendar, User, Building2, Mail, Phone, FileText,
  DollarSign, Percent, MoreHorizontal, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [activeTab, setActiveTab] = useState('items');
  
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

  const [customerType, setCustomerType] = useState('person');
  const [newCustomer, setNewCustomer] = useState({
    first_name: '', last_name: '', email: '', phone: '', company: '', address: ''
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

  const { data: customers = [], refetch: refetchCustomers } = useQuery({
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
      
      const expanded = {};
      areas.forEach((_, idx) => { expanded[idx] = true; });
      setExpandedAreas(expanded);
    } else if (!proposalId && allProposals) {
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
    const name = customerType === 'person' 
      ? `${newCustomer.first_name} ${newCustomer.last_name}`.trim()
      : newCustomer.company;
    
    if (!name || !newCustomer.email) return;
    
    await base44.entities.Customer.create({
      name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      company: customerType === 'company' ? newCustomer.company : '',
      address: newCustomer.address
    });
    
    refetchCustomers();
    setFormData(prev => ({
      ...prev,
      customer_name: name,
      customer_email: newCustomer.email,
      customer_company: customerType === 'company' ? newCustomer.company : '',
      customer_phone: newCustomer.phone || ''
    }));
    setNewCustomer({ first_name: '', last_name: '', email: '', phone: '', company: '', address: '' });
    setShowNewCustomerForm(false);
    setShowCustomerModal(false);
  };

  const addArea = () => {
    const areaName = `Section ${formData.areas.length + 1}`;
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

  const addInventoryItem = (inventoryItem, areaIdx) => {
    addItemToArea(areaIdx, {
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
    addItemToArea(editingAreaIndex, { type: 'custom', ...newItem });
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
      const newProposal = await base44.entities.Proposal.create({ ...data, approval_token: approvalToken });
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
  const totalItems = formData.areas.reduce((sum, area) => sum + (area.items?.length || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Proposals')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono bg-slate-50">{formData.proposal_number}</Badge>
                <Badge className={cn(
                  "text-xs",
                  formData.status === 'draft' && "bg-slate-100 text-slate-600",
                  formData.status === 'sent' && "bg-blue-100 text-blue-700",
                  formData.status === 'approved' && "bg-emerald-100 text-emerald-700"
                )}>
                  {formData.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Link to={proposalId ? createPageUrl('ProposalView') + `?id=${proposalId}` : '#'}>
              <Button variant="outline" size="sm" disabled={!proposalId}>
                <Eye className="w-4 h-4 mr-1.5" />
                Preview
              </Button>
            </Link>
            <Button size="sm" className="bg-[#0069AF] hover:bg-[#005a94]">
              <Send className="w-4 h-4 mr-1.5" />
              Send
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Title Input */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Proposal Title"
                className="text-2xl font-semibold border-0 bg-transparent px-0 h-auto focus-visible:ring-0 placeholder:text-slate-300"
              />
            </motion.div>

            {/* Customer Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Client</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowCustomerModal(true)} className="text-[#0069AF]">
                  {formData.customer_name ? 'Change' : '+ Add Client'}
                </Button>
              </div>
              {formData.customer_name ? (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0069AF] to-[#133F5C] flex items-center justify-center text-white font-semibold text-lg">
                    {formData.customer_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{formData.customer_name}</p>
                    <p className="text-sm text-slate-500">{formData.customer_email}</p>
                    {formData.customer_company && <p className="text-sm text-slate-400">{formData.customer_company}</p>}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                  <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">No client selected</p>
                </div>
              )}
            </motion.div>

            {/* Line Items */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Line Items</h3>
                <span className="text-sm text-slate-400">{totalItems} item{totalItems !== 1 && 's'}</span>
              </div>

              {formData.areas.length > 0 ? (
                <div className="space-y-4">
                  {formData.areas.map((area, areaIndex) => (
                    <div key={areaIndex} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {/* Area Header */}
                      <div 
                        className="flex items-center gap-3 px-5 py-4 bg-slate-50 cursor-pointer"
                        onClick={() => toggleArea(areaIndex)}
                      >
                        {expandedAreas[areaIndex] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        <input
                          value={area.name}
                          onChange={(e) => { e.stopPropagation(); updateAreaName(areaIndex, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-transparent font-medium text-slate-900 border-0 p-0 focus:ring-0 focus:outline-none"
                        />
                        <Badge variant="outline" className="text-xs">{area.items?.length || 0}</Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                          onClick={(e) => { e.stopPropagation(); removeArea(areaIndex); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Area Items */}
                      <AnimatePresence>
                        {expandedAreas[areaIndex] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-100"
                          >
                            {area.items?.length > 0 && (
                              <div className="divide-y divide-slate-100">
                                {area.items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="px-5 py-4 flex items-start gap-4">
                                    <div className="flex-1 space-y-2">
                                      <input
                                        value={item.name}
                                        onChange={(e) => updateItemInArea(areaIndex, itemIndex, 'name', e.target.value)}
                                        className="w-full font-medium text-slate-900 border-0 p-0 focus:ring-0 focus:outline-none"
                                        placeholder="Item name"
                                      />
                                      <input
                                        value={item.description}
                                        onChange={(e) => updateItemInArea(areaIndex, itemIndex, 'description', e.target.value)}
                                        className="w-full text-sm text-slate-500 border-0 p-0 focus:ring-0 focus:outline-none"
                                        placeholder="Description (optional)"
                                      />
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="w-20">
                                        <Label className="text-[10px] text-slate-400 uppercase">Qty</Label>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={item.quantity}
                                          onChange={(e) => updateItemInArea(areaIndex, itemIndex, 'quantity', parseFloat(e.target.value) || 0)}
                                          className="h-9 text-center"
                                        />
                                      </div>
                                      <div className="w-28">
                                        <Label className="text-[10px] text-slate-400 uppercase">Price</Label>
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => updateItemInArea(areaIndex, itemIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                                            className="h-9 pl-7"
                                          />
                                        </div>
                                      </div>
                                      <div className="w-28 text-right">
                                        <Label className="text-[10px] text-slate-400 uppercase">Total</Label>
                                        <p className="h-9 flex items-center justify-end font-semibold text-slate-900">
                                          ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                                        </p>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 text-slate-300 hover:text-red-500"
                                        onClick={() => removeItemFromArea(areaIndex, itemIndex)}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add Item Row */}
                            <div className="px-5 py-3 bg-slate-50/50 flex gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-slate-500">
                                    <Package className="w-4 h-4 mr-1.5" />
                                    From Inventory
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-2" align="start">
                                  <div className="relative mb-2">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                      placeholder="Search..."
                                      value={searchInventory}
                                      onChange={(e) => setSearchInventory(e.target.value)}
                                      className="pl-8 h-9"
                                    />
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {filteredInventory.slice(0, 8).map(inv => (
                                      <button
                                        key={inv.id}
                                        onClick={() => addInventoryItem(inv, areaIndex)}
                                        className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-100 text-left"
                                      >
                                        <span className="text-sm truncate">{inv.name}</span>
                                        <span className="text-sm font-medium text-slate-600">${inv.sell_price || inv.unit_cost || 0}</span>
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-slate-500"
                                onClick={() => { setEditingAreaIndex(areaIndex); setShowItemModal(true); }}
                              >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Custom Item
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-1">No items added yet</p>
                  <p className="text-sm text-slate-400 mb-4">Create a section to start adding line items</p>
                </div>
              )}

              <Button onClick={addArea} variant="outline" className="w-full mt-4 border-dashed">
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden sticky top-24"
            >
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Summary</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Tax</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.sales_tax_percent}
                      onChange={(e) => setFormData(prev => ({ ...prev, sales_tax_percent: parseFloat(e.target.value) || 0 }))}
                      className="w-16 h-7 text-xs text-center"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                  <span className="font-medium">${totals.taxAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="px-5 py-4 bg-slate-900 text-white">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold">${totals.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Settings */}
              <div className="p-5 space-y-4 border-t border-slate-100">
                <div>
                  <Label className="text-xs text-slate-500 uppercase">Valid Until</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-1.5 justify-start font-normal h-9">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {formData.valid_until ? format(new Date(formData.valid_until), 'MMM d, yyyy') : 'Select'}
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

                <div>
                  <Label className="text-xs text-slate-500 uppercase">Linked Project</Label>
                  <Select value={formData.project_id || 'none'} onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger className="mt-1.5 h-9">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {projects.filter(p => p.status !== 'archived').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-500 uppercase">Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1.5 h-20 text-sm"
                    placeholder="Internal notes..."
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* New Client Modal */}
      <Dialog open={showCustomerModal} onOpenChange={(open) => { setShowCustomerModal(open); if (!open) { setShowNewCustomerForm(false); setNewCustomer({ first_name: '', last_name: '', email: '', phone: '', company: '', address: '' }); } }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-semibold text-center">
              {showNewCustomerForm ? 'New Client' : 'Select Client'}
            </DialogTitle>
          </DialogHeader>
          
          {showNewCustomerForm ? (
            <div className="px-6 pb-6">
              {/* Person/Company Toggle */}
              <div className="flex justify-center mb-6">
                <RadioGroup value={customerType} onValueChange={setCustomerType} className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="person" id="person" className="text-[#f97316] border-slate-300" />
                    <Label htmlFor="person" className="cursor-pointer">Person</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="company" id="company" className="text-[#f97316] border-slate-300" />
                    <Label htmlFor="company" className="cursor-pointer">Company</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                {customerType === 'person' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Label className="absolute -top-2 left-3 bg-white px-1 text-xs text-slate-500">First Name</Label>
                      <Input 
                        value={newCustomer.first_name} 
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, first_name: e.target.value }))}
                        className="h-12 pt-2"
                      />
                    </div>
                    <div className="relative">
                      <Label className="absolute -top-2 left-3 bg-white px-1 text-xs text-slate-500">Last Name</Label>
                      <Input 
                        value={newCustomer.last_name} 
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, last_name: e.target.value }))}
                        className="h-12 pt-2"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Label className="absolute -top-2 left-3 bg-white px-1 text-xs text-slate-500">Company Name</Label>
                    <Input 
                      value={newCustomer.company} 
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                      className="h-12 pt-2"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Label className="absolute -top-2 left-3 bg-white px-1 text-xs text-slate-500">Email</Label>
                    <Input 
                      type="email"
                      value={newCustomer.email} 
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      className="h-12 pt-2"
                    />
                  </div>
                  <div className="relative">
                    <Label className="absolute -top-2 left-3 bg-white px-1 text-xs text-slate-500">Phone Number</Label>
                    <Input 
                      value={newCustomer.phone} 
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-12 pt-2"
                    />
                  </div>
                </div>

                <div className="relative">
                  <Label className="absolute -top-2 left-3 bg-white px-1 text-xs text-slate-500">Address (Optional)</Label>
                  <Input 
                    value={newCustomer.address} 
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                    className="h-12 pt-2"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setShowNewCustomerForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleCreateCustomer} className="flex-1 bg-[#f97316] hover:bg-[#ea580c]">
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-6 pb-6">
              <Button 
                variant="outline" 
                onClick={() => setShowNewCustomerForm(true)} 
                className="w-full mb-4 h-12 border-dashed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Client
              </Button>
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search clients..." className="pl-9" />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {customers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 text-left transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0069AF] to-[#133F5C] flex items-center justify-center text-white font-medium">
                      {customer.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{customer.name}</p>
                      <p className="text-sm text-slate-500 truncate">{customer.email}</p>
                    </div>
                  </button>
                ))}
                {customers.length === 0 && (
                  <p className="text-center text-slate-400 py-8">No clients yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Item Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Name</Label>
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
                className="mt-1 h-20"
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
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowItemModal(false)}>Cancel</Button>
              <Button onClick={addCustomItem} className="bg-[#0069AF] hover:bg-[#005a94]">Add Item</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Edit2, Trash2, Mail, Phone, Building2, MapPin, MoreHorizontal, FileText, FolderKanban, Eye, ChevronDown, ChevronRight, UserPlus, Upload, Loader2, MessageSquare, Send, CheckSquare, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import CustomerCommunication from '@/components/customers/CustomerCommunication';

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, customer: null });
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const [allCompaniesExpanded, setAllCompaniesExpanded] = useState(true);
  const [viewFilter, setViewFilter] = useState('all'); // 'all', 'companies', 'contacts'
  const [addingContactTo, setAddingContactTo] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', address: '', city: '', state: '', zip: '', notes: '', is_company: false, company_id: ''
  });
  const queryClient = useQueryClient();

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCommunication, setShowCommunication] = useState(false);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data: customers = [], refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date')
  });

  // Separate companies and contacts
  const companies = customers.filter(c => c.is_company);
  const standaloneContacts = customers.filter(c => !c.is_company && !c.company_id);
  const getContactsForCompany = (companyId) => customers.filter(c => c.company_id === companyId);

  const toggleCompany = (companyId) => {
    setExpandedCompanies(prev => ({ ...prev, [companyId]: !prev[companyId] }));
  };

  const toggleAllCompanies = () => {
    if (allCompaniesExpanded) {
      // Collapse all
      const collapsed = {};
      companies.forEach(c => { collapsed[c.id] = false; });
      setExpandedCompanies(collapsed);
    } else {
      // Expand all
      const expanded = {};
      companies.forEach(c => { expanded[c.id] = true; });
      setExpandedCompanies(expanded);
    }
    setAllCompaniesExpanded(!allCompaniesExpanded);
  };

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || '',
        email: editingCustomer.email || '',
        phone: editingCustomer.phone || '',
        company: editingCustomer.company || '',
        address: editingCustomer.address || '',
        city: editingCustomer.city || '',
        state: editingCustomer.state || '',
        zip: editingCustomer.zip || '',
        notes: editingCustomer.notes || '',
        is_company: editingCustomer.is_company || false,
        company_id: editingCustomer.company_id || ''
      });
    } else if (addingContactTo) {
      const parentCompany = customers.find(c => c.id === addingContactTo);
      setFormData({ 
        name: '', email: '', phone: '', 
        company: parentCompany?.name || '', 
        address: parentCompany?.address || '', 
        city: parentCompany?.city || '', 
        state: parentCompany?.state || '', 
        zip: parentCompany?.zip || '', 
        notes: '', 
        is_company: false, 
        company_id: addingContactTo 
      });
    } else {
      setFormData({ name: '', email: '', phone: '', company: '', address: '', city: '', state: '', zip: '', notes: '', is_company: false, company_id: '' });
    }
  }, [editingCustomer, showModal, addingContactTo, customers]);

  const filteredCompanies = companies.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStandaloneContacts = standaloneContacts.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCustomerProposals = (customerId, email) => proposals.filter(p => p.customer_id === customerId || p.customer_email === email);
  const getCustomerProjects = (customerId) => projects.filter(p => p.customer_id === customerId);
  const getProposalCount = (customerId, email) => getCustomerProposals(customerId, email).length;
  const getProjectCount = (customerId) => getCustomerProjects(customerId).length;
  const getTotalValue = (customerId, email) => getCustomerProposals(customerId, email).filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.total || 0), 0);

  const handleSave = async () => {
    if (editingCustomer) {
      await base44.entities.Customer.update(editingCustomer.id, formData);
    } else {
      await base44.entities.Customer.create(formData);
    }
    refetch();
    setShowModal(false);
    setEditingCustomer(null);
    setAddingContactTo(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm.customer) {
      await base44.entities.Customer.delete(deleteConfirm.customer.id);
      refetch();
    }
    setDeleteConfirm({ open: false, customer: null });
  };

  // Multi-select handlers
  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    if (newSelected.size === 0) setSelectionMode(false);
  };

  const selectAll = () => {
    const allIds = [...companies, ...standaloneContacts].map(c => c.id);
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
      setSelectionMode(false);
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (let i = 0; i < ids.length; i++) {
      await base44.entities.Customer.delete(ids[i]);
      // Small delay to avoid rate limiting
      if (i < ids.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    refetch();
    clearSelection();
    setBulkDeleteConfirm(false);
  };

  const handleImport = async () => {
    setImporting(true);
    const lines = importData.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const customer = {};
      headers.forEach((header, idx) => {
        if (header === 'name') customer.name = values[idx];
        if (header === 'email') customer.email = values[idx];
        if (header === 'phone') customer.phone = values[idx];
        if (header === 'company') customer.company = values[idx];
        if (header === 'address') customer.address = values[idx];
        if (header === 'city') customer.city = values[idx];
        if (header === 'state') customer.state = values[idx];
        if (header === 'zip') customer.zip = values[idx];
      });
      if (customer.name) {
        await base44.entities.Customer.create({ ...customer, source: 'import' });
      }
    }
    refetch();
    setImporting(false);
    setShowImportModal(false);
    setImportData('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Customers</h1>
            <p className="text-slate-500 mt-1">Manage your customer database</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" onClick={() => { setEditingCustomer(null); setFormData(p => ({ ...p, is_company: true })); setShowModal(true); }}>
              <Building2 className="w-4 h-4 mr-2" />
              Add Company
            </Button>
            <Button onClick={() => { setEditingCustomer(null); setFormData(p => ({ ...p, is_company: false })); setShowModal(true); }} className="bg-[#0069AF] hover:bg-[#133F5C]">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </motion.div>

        {/* Bulk Action Bar */}
        {selectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-600 text-white rounded-xl p-3 mb-4 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3">
              <button onClick={clearSelection} className="p-1 hover:bg-red-500 rounded">
                <X className="w-4 h-4" />
              </button>
              <span className="font-medium">{selectedIds.size} selected</span>
              <button onClick={selectAll} className="text-sm underline hover:no-underline">
                {selectedIds.size === (companies.length + standaloneContacts.length) ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <Button 
              size="sm" 
              variant="secondary" 
              className="bg-white text-red-600 hover:bg-red-50"
              onClick={() => setBulkDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Selected
            </Button>
          </motion.div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant={selectionMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) clearSelection(); }}
              className={cn("h-10", selectionMode && "bg-red-600 hover:bg-red-700")}
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              {selectionMode ? 'Done' : 'Select'}
            </Button>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewFilter('all')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  viewFilter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                All ({companies.length + standaloneContacts.length})
              </button>
              <button
                onClick={() => setViewFilter('companies')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                  viewFilter === 'companies' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                Companies ({companies.length})
              </button>
              <button
                onClick={() => setViewFilter('contacts')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                  viewFilter === 'contacts' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Contacts ({standaloneContacts.length})
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Companies with expandable contacts */}
          {(viewFilter === 'all' || viewFilter === 'companies') && filteredCompanies.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Companies ({filteredCompanies.length})
                </h3>
                <button
                  onClick={toggleAllCompanies}
                  className="text-xs text-[#0069AF] hover:text-[#133F5C] flex items-center gap-1 font-medium"
                >
                  {allCompaniesExpanded ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Collapse All
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-3.5 h-3.5" />
                      Expand All
                    </>
                  )}
                </button>
              </div>
              <AnimatePresence>
                {filteredCompanies.map((company, idx) => {
                  const contacts = getContactsForCompany(company.id);
                  const isExpanded = expandedCompanies[company.id] !== false;
                  return (
                    <motion.div
                      key={company.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={cn(
                        "bg-white rounded-xl border overflow-hidden",
                        selectedIds.has(company.id) ? "border-red-300 bg-red-50/30 ring-2 ring-red-200" : "border-slate-100"
                      )}
                    >
                      <div className="p-5 hover:bg-slate-50/50 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            {selectionMode && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleSelection(company.id); }}
                                className="mt-1 p-1"
                              >
                                {selectedIds.has(company.id) ? (
                                  <CheckSquare className="w-5 h-5 text-red-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300" />
                                )}
                              </button>
                            )}
                            <button onClick={() => toggleCompany(company.id)} className="mt-1">
                              {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                            </button>
                            <div className="w-12 h-12 rounded-lg bg-[#133F5C]/10 flex items-center justify-center text-[#133F5C] font-semibold text-lg">
                              <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{company.name}</h3>
                              <p className="text-sm text-slate-500">{contacts.length} contacts</p>
                              <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                                {company.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{company.email}</span>}
                                {company.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{company.phone}</span>}
                              </div>
                              {(company.city || company.state) && (
                                <span className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {[company.city, company.state].filter(Boolean).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-slate-500">{getProposalCount(company.id, company.email)} proposals · {getProjectCount(company.id)} projects</p>
                              {getTotalValue(company.id, company.email) > 0 && (
                                <p className="text-sm font-medium text-emerald-600">${getTotalValue(company.id, company.email).toLocaleString()} won</p>
                              )}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(company)}>
                              <Eye className="w-4 h-4 mr-1" />View
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="w-5 h-5" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setAddingContactTo(company.id); setShowModal(true); }}>
                                  <UserPlus className="w-4 h-4 mr-2" />Add Contact
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setEditingCustomer(company); setShowModal(true); }}>
                                  <Edit2 className="w-4 h-4 mr-2" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteConfirm({ open: true, customer: company })} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      {isExpanded && contacts.length > 0 && (
                        <div className="border-t bg-slate-50/50 divide-y">
                          {contacts.map(contact => (
                            <div 
                              key={contact.id} 
                              className="px-5 py-3 pl-16 flex items-center justify-between hover:bg-slate-100/50 cursor-pointer transition-colors"
                              onClick={() => setSelectedCustomer(contact)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-[#0069AF] font-medium text-sm">
                                  {contact.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 text-sm hover:text-[#0069AF]">{contact.name}</p>
                                  <p className="text-xs text-slate-500">{contact.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" onClick={() => { setEditingCustomer(contact); setShowModal(true); }}>
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ open: true, customer: contact })} className="text-red-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Standalone Contacts */}
          {(viewFilter === 'all' || viewFilter === 'contacts') && filteredStandaloneContacts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Users className="w-4 h-4" /> Individual Contacts ({filteredStandaloneContacts.length})
              </h3>
              <AnimatePresence>
                {filteredStandaloneContacts.map((customer, idx) => (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={cn(
                      "bg-white rounded-xl border p-5 hover:shadow-md transition-all",
                      selectedIds.has(customer.id) ? "border-red-300 bg-red-50/30 ring-2 ring-red-200" : "border-slate-100"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {selectionMode && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleSelection(customer.id); }}
                            className="mt-1 p-1"
                          >
                            {selectedIds.has(customer.id) ? (
                              <CheckSquare className="w-5 h-5 text-red-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300" />
                            )}
                          </button>
                        )}
                        <div className="w-12 h-12 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-[#0069AF] font-semibold text-lg">
                          {customer.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{customer.name}</h3>
                          {customer.company && <p className="text-sm text-slate-500">{customer.company}</p>}
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{customer.email}</span>
                            {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-slate-500">{getProposalCount(customer.id, customer.email)} proposals · {getProjectCount(customer.id)} projects</p>
                          {getTotalValue(customer.id, customer.email) > 0 && (
                            <p className="text-sm font-medium text-emerald-600">${getTotalValue(customer.id, customer.email).toLocaleString()} won</p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(customer)}>
                          <Eye className="w-4 h-4 mr-1" />View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-5 h-5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingCustomer(customer); setShowModal(true); }}>
                              <Edit2 className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteConfirm({ open: true, customer })} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {((viewFilter === 'all' && filteredCompanies.length === 0 && filteredStandaloneContacts.length === 0) ||
            (viewFilter === 'companies' && filteredCompanies.length === 0) ||
            (viewFilter === 'contacts' && filteredStandaloneContacts.length === 0)) && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No customers yet</h3>
              <p className="text-slate-500 mb-6">Add your first company or contact to get started</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => { setFormData(p => ({ ...p, is_company: true })); setShowModal(true); }}>
                  <Building2 className="w-4 h-4 mr-2" />Add Company
                </Button>
                <Button onClick={() => setShowModal(true)} className="bg-[#0069AF] hover:bg-[#133F5C]">
                  <Plus className="w-4 h-4 mr-2" />Add Contact
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) { setEditingCustomer(null); setAddingContactTo(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? `Edit ${editingCustomer.is_company ? 'Company' : 'Contact'}` : 
               addingContactTo ? 'Add Contact to Company' :
               formData.is_company ? 'Add Company' : 'Add Contact'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{formData.is_company ? 'Company Name *' : 'Name *'}</Label>
                <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Email {formData.is_company ? '' : '*'}</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="mt-1" />
              </div>
              {!formData.is_company && !addingContactTo && (
                <div>
                  <Label>Link to Company</Label>
                  <select
                    value={formData.company_id || ''}
                    onChange={(e) => {
                      const company = companies.find(c => c.id === e.target.value);
                      setFormData(prev => ({ 
                        ...prev, 
                        company_id: e.target.value,
                        company: company?.name || ''
                      }));
                    }}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">No company (standalone contact)</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {(formData.is_company || !addingContactTo) && (
              <>
                <div>
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} className="mt-1" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={formData.state} onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input value={formData.zip} onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))} className="mt-1" />
                  </div>
                </div>
              </>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} className="mt-1" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-[#0069AF] hover:bg-[#133F5C]">
                {editingCustomer ? 'Update' : formData.is_company ? 'Add Company' : 'Add Contact'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, customer: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} customers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all selected customers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete {selectedIds.size} Customers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Customers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-500">
              Paste CSV data with headers: name, email, phone, company, address, city, state, zip
            </p>
            <Textarea 
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="name,email,phone,company,address,city,state,zip&#10;John Doe,john@example.com,555-1234,Acme Inc,123 Main St,Austin,TX,78701"
              className="h-48 font-mono text-sm"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={importing || !importData.trim()} className="bg-[#0069AF] hover:bg-[#133F5C]">
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-[#0069AF] font-semibold">
                {selectedCustomer?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <span>{selectedCustomer?.name}</span>
                {selectedCustomer?.company && <p className="text-sm text-slate-500 font-normal">{selectedCustomer.company}</p>}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6 mt-4">
              {/* Quick Actions */}
              <div className="flex gap-2 mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2"
                  onClick={() => setShowCommunication(true)}
                >
                  <Mail className="w-4 h-4" /> Send Email
                </Button>
                {selectedCustomer.phone && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={() => setShowCommunication(true)}
                  >
                    <MessageSquare className="w-4 h-4" /> Send SMS
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => window.location.href = `tel:${selectedCustomer.phone}`}
                  disabled={!selectedCustomer.phone}
                >
                  <Phone className="w-4 h-4" />
                </Button>
              </div>

              {/* Contact Info */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${selectedCustomer.email}`} className="text-[#0069AF] hover:underline">{selectedCustomer.email}</a>
                    </div>
                  )}
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <a href={`tel:${selectedCustomer.phone}`} className="text-[#0069AF] hover:underline">{selectedCustomer.phone}</a>
                    </div>
                  )}
                </div>
                {(selectedCustomer.address || selectedCustomer.city) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-xl font-bold text-[#0069AF]">{getProposalCount(selectedCustomer.id, selectedCustomer.email)}</p>
                    <p className="text-xs text-slate-500">Proposals</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-xl font-bold text-[#0069AF]">{getProjectCount(selectedCustomer.id)}</p>
                    <p className="text-xs text-slate-500">Projects</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-xl font-bold text-emerald-600">${getTotalValue(selectedCustomer.id, selectedCustomer.email).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Won Value</p>
                  </div>
                </div>

                {selectedCustomer.default_tax_rate > 0 && (
                  <div className="text-sm pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Default Tax Rate:</span> <span className="font-medium">{selectedCustomer.default_tax_rate}%</span>
                  </div>
                )}
                
                {selectedCustomer.source && (
                  <div className="text-xs text-slate-400 pt-2 border-t border-slate-200">
                    Source: <Badge variant="outline" className="text-xs">{selectedCustomer.source}</Badge>
                    {selectedCustomer.external_id && <span className="ml-2">ID: {selectedCustomer.external_id}</span>}
                  </div>
                )}
              </div>

              {/* Projects */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-[#0069AF]" />
                    Projects ({getCustomerProjects(selectedCustomer.id).length})
                  </h4>
                  <Link to={createPageUrl('Dashboard')}>
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
                {getCustomerProjects(selectedCustomer.id).length > 0 ? (
                  <div className="space-y-2">
                    {getCustomerProjects(selectedCustomer.id).slice(0, 5).map(project => (
                      <Link key={project.id} to={createPageUrl('ProjectDetail') + `?id=${project.id}`} className="block p-3 bg-white border rounded-lg hover:shadow-sm transition-all">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{project.name}</span>
                          <Badge variant="outline" className={cn(
                            project.status === 'completed' && "bg-emerald-50 text-emerald-700",
                            project.status === 'in_progress' && "bg-blue-50 text-blue-700",
                            project.status === 'planning' && "bg-amber-50 text-amber-700"
                          )}>{project.status?.replace('_', ' ')}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">No projects linked</p>
                )}
              </div>

              {/* Proposals */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0069AF]" />
                    Proposals ({getCustomerProposals(selectedCustomer.id, selectedCustomer.email).length})
                  </h4>
                  <Link to={createPageUrl('Proposals')}>
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
                {getCustomerProposals(selectedCustomer.id, selectedCustomer.email).length > 0 ? (
                  <div className="space-y-2">
                    {getCustomerProposals(selectedCustomer.id, selectedCustomer.email).slice(0, 5).map(proposal => (
                      <div 
                        key={proposal.id} 
                        onClick={() => window.location.href = createPageUrl('ProposalEditor') + `?id=${proposal.id}`}
                        className="block p-3 bg-white border rounded-lg hover:shadow-sm hover:border-[#0069AF]/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-900">{proposal.title || proposal.proposal_number}</span>
                            <p className="text-xs text-slate-500">{proposal.proposal_number}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">${(proposal.total || 0).toLocaleString()}</span>
                            <Badge variant="outline" className={cn(
                              proposal.status === 'approved' && "bg-emerald-50 text-emerald-700",
                              proposal.status === 'sent' && "bg-blue-50 text-blue-700",
                              proposal.status === 'draft' && "bg-slate-50 text-slate-600",
                              proposal.status === 'viewed' && "bg-purple-50 text-purple-700",
                              proposal.status === 'rejected' && "bg-red-50 text-red-700"
                            )}>{proposal.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">No proposals yet</p>
                )}
              </div>

              {/* Notes */}
              {selectedCustomer.notes && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-1">Notes</h4>
                  <p className="text-sm text-amber-700">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Communication Modal */}
      <Dialog open={showCommunication} onOpenChange={setShowCommunication}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-[#0069AF]" />
              Contact {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <CustomerCommunication 
              customer={selectedCustomer} 
              proposals={proposals}
              onClose={() => setShowCommunication(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
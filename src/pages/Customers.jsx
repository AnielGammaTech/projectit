import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Edit2, Trash2, Mail, Phone, Building2, MapPin, MoreHorizontal, FileText, FolderKanban, Eye, ChevronDown, ChevronRight, UserPlus, Upload, Loader2, MessageSquare, Send, CheckSquare, Square, X, Globe, RefreshCw } from 'lucide-react';
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
  const [syncing, setSyncing] = useState(false);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data: customers = [], refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date')
  });

  const { data: sites = [], refetch: refetchSites } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list()
  });

  // Separate companies and contacts
  const companies = customers.filter(c => c.is_company);
  const standaloneContacts = customers.filter(c => !c.is_company && !c.company_id);
  const getContactsForCompany = (companyId) => customers.filter(c => c.company_id === companyId);
  const getSitesForCompany = (companyId) => sites.filter(s => s.customer_id === companyId);
  
  // Track which tab is active per company (sites or contacts)
  const [companyTabs, setCompanyTabs] = useState({});

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

  const { data: incomingQuotes = [] } = useQuery({
    queryKey: ['incomingQuotes'],
    queryFn: () => base44.entities.IncomingQuote.list()
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

  const getCustomerQuotes = (name, company, email) => incomingQuotes.filter(q => {
    const nameMatch = q.customer_name && (q.customer_name.toLowerCase() === name?.toLowerCase() || q.customer_name.toLowerCase() === company?.toLowerCase());
    const emailMatch = email && q.raw_data?.customer_email?.toLowerCase() === email.toLowerCase();
    return nameMatch || emailMatch;
  });
  const getCustomerProjects = (customerId) => projects.filter(p => p.customer_id === customerId);
  const getProposalCount = (name, company, email) => getCustomerQuotes(name, company, email).length;
  const getProjectCount = (customerId) => getCustomerProjects(customerId).length;
  const getTotalValue = (name, company, email) => getCustomerQuotes(name, company, email).reduce((sum, q) => sum + (q.amount || 0), 0);

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

  const handleHaloPSASync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncHaloPSACustomers', {});
      refetch();
      refetchSites();
    } catch (e) {
      console.error('Sync failed', e);
    }
    setSyncing(false);
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
            <p className="text-slate-500 mt-1">Manage your client relationships</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleHaloPSASync} disabled={syncing}>
              <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
              Sync from HaloPSA
            </Button>
            <Button onClick={() => { setEditingCustomer(null); setFormData(p => ({ ...p, is_company: true })); setShowModal(true); }} className="bg-[#F97316] hover:bg-[#EA580C]">
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
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
          {/* Companies Grid */}
          {(viewFilter === 'all' || viewFilter === 'companies') && filteredCompanies.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCompanies.map((company, idx) => {
                const contacts = getContactsForCompany(company.id);
                const companySites = getSitesForCompany(company.id);
                const companyProjects = getProjectCount(company.id);
                // Get address from company directly, or fall back to first site's address
                const displayAddress = (company.address || company.city) 
                  ? [company.address, company.city, company.state].filter(Boolean).join(', ')
                  : companySites.length > 0 
                    ? [companySites[0].address, companySites[0].city, companySites[0].state].filter(Boolean).join(', ')
                    : null;
                return (
                  <motion.div
                    key={company.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={cn(
                      "bg-white rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer group",
                      selectedIds.has(company.id) ? "border-red-300 bg-red-50/30 ring-2 ring-red-200" : "border-slate-200 hover:border-slate-300"
                    )}
                    onClick={() => setSelectedCustomer(company)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {selectionMode && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleSelection(company.id); }}
                            className="mt-0.5 p-0.5"
                          >
                            {selectedIds.has(company.id) ? (
                              <CheckSquare className="w-4 h-4 text-red-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        )}
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 truncate text-sm">{company.name}</h3>
                            {company.source === 'halo_psa' && (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200 px-1.5 py-0 flex-shrink-0">Halo</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {displayAddress || 'No address'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0 ml-2" />
                    </div>
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedCustomer(company); }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors"
                        title="Sites/Locations"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-medium text-slate-700">{companySites.length}</span>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedCustomer(company); }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                        title="Contacts"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-slate-700">{contacts.length}</span>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedCustomer(company); }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-orange-50 transition-colors"
                        title="Projects"
                      >
                        <FolderKanban className="w-3.5 h-3.5 text-orange-600" />
                        <span className="text-xs font-medium text-slate-700">{companyProjects}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}


          {/* Standalone Contacts */}
          {(viewFilter === 'all' || viewFilter === 'contacts') && filteredStandaloneContacts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {filteredStandaloneContacts.map((customer, idx) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={cn(
                    "bg-white rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer group",
                    selectedIds.has(customer.id) ? "border-red-300 bg-red-50/30 ring-2 ring-red-200" : "border-slate-200 hover:border-slate-300"
                  )}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {selectionMode && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleSelection(customer.id); }}
                          className="mt-0.5 p-0.5"
                        >
                          {selectedIds.has(customer.id) ? (
                            <CheckSquare className="w-4 h-4 text-red-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      )}
                      <div className="w-9 h-9 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-[#0069AF] font-medium text-sm flex-shrink-0">
                        {customer.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 truncate text-sm">{customer.name}</h3>
                        {customer.company && <p className="text-xs text-slate-500 truncate">{customer.company}</p>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0 ml-2" />
                  </div>
                  
                  {/* Stats Row */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                      title="Contacts"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-medium text-slate-700">0</span>
                    </button>
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-orange-50 transition-colors"
                      title="Projects"
                    >
                      <FolderKanban className="w-3.5 h-3.5 text-orange-600" />
                      <span className="text-xs font-medium text-slate-700">{getProjectCount(customer.id)}</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {((viewFilter === 'all' && filteredCompanies.length === 0 && filteredStandaloneContacts.length === 0) ||
            (viewFilter === 'companies' && filteredCompanies.length === 0) ||
            (viewFilter === 'contacts' && filteredStandaloneContacts.length === 0)) && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No customers yet</h3>
              <p className="text-slate-500 mb-6">Add your first company or sync from HaloPSA</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleHaloPSASync} disabled={syncing}>
                  <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
                  Sync from HaloPSA
                </Button>
                <Button onClick={() => { setFormData(p => ({ ...p, is_company: true })); setShowModal(true); }} className="bg-[#F97316] hover:bg-[#EA580C]">
                  <Plus className="w-4 h-4 mr-2" />Add Customer
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
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedCustomer && (() => {
            const customerSites = getSitesForCompany(selectedCustomer.id);
            const customerContacts = getContactsForCompany(selectedCustomer.id);
            const customerProjects = getCustomerProjects(selectedCustomer.id);
            return (
              <>
                {/* Header */}
                <div className="flex items-start justify-between border-b pb-4 mb-4">
                  <div>
                    <Link 
                      to="#" 
                      onClick={(e) => { e.preventDefault(); setSelectedCustomer(null); }}
                      className="text-sm text-slate-500 hover:text-[#0069AF] flex items-center gap-1 mb-2"
                    >
                      ← Back to Customers
                    </Link>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      {selectedCustomer.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {selectedCustomer.email}
                        </span>
                      ) : (
                        <span className="text-slate-400">No email</span>
                      )}
                      {selectedCustomer.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400">No phone</span>
                      )}
                    </div>
                    {(selectedCustomer.address || selectedCustomer.city) && (
                      <p className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {selectedCustomer.source === 'halo_psa' && (
                      <Badge variant="outline" className="mt-2 text-xs bg-blue-50 text-blue-600 border-blue-200">
                        Synced from HaloPSA
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingCustomer(selectedCustomer); setShowModal(true); }}>
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-4 border-b mb-4">
                  <button
                    onClick={() => setCompanyTabs(prev => ({ ...prev, [selectedCustomer.id]: 'details' }))}
                    className={cn(
                      "pb-2 text-sm font-medium border-b-2 transition-colors",
                      (companyTabs[selectedCustomer.id] || 'details') === 'details'
                        ? "border-[#0069AF] text-[#0069AF]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Details & Contacts
                  </button>
                  <button
                    onClick={() => setCompanyTabs(prev => ({ ...prev, [selectedCustomer.id]: 'proposals' }))}
                    className={cn(
                      "pb-2 text-sm font-medium border-b-2 transition-colors",
                      companyTabs[selectedCustomer.id] === 'proposals'
                        ? "border-[#0069AF] text-[#0069AF]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Proposals ({getCustomerQuotes(selectedCustomer.name, selectedCustomer.company, selectedCustomer.email).length})
                  </button>
                  <button
                    onClick={() => setCompanyTabs(prev => ({ ...prev, [selectedCustomer.id]: 'projects' }))}
                    className={cn(
                      "pb-2 text-sm font-medium border-b-2 transition-colors",
                      companyTabs[selectedCustomer.id] === 'projects'
                        ? "border-[#0069AF] text-[#0069AF]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Projects ({customerProjects.length})
                  </button>
                </div>

                {/* Details & Contacts Tab */}
                {(companyTabs[selectedCustomer.id] || 'details') === 'details' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Company Info */}
                    <div className="bg-white border rounded-xl p-4">
                      <h4 className="font-semibold text-slate-900 mb-4">Company Info</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wide">Address</p>
                          <p className="text-slate-700">{selectedCustomer.address || '--'}</p>
                          {(selectedCustomer.city || selectedCustomer.state || selectedCustomer.zip) && (
                            <p className="text-slate-700">{[selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip].filter(Boolean).join(', ')}</p>
                          )}
                          {customerSites.length > 0 && (
                            <p className="text-xs text-slate-400 mt-1">(from site: {customerSites[0].name})</p>
                          )}
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wide">Primary Contact</p>
                          <p className="text-slate-700">{customerContacts[0]?.name || '--'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wide">Email</p>
                          <p className="text-slate-700">{selectedCustomer.email || '--'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wide">Phone</p>
                          <p className="text-slate-700">{selectedCustomer.phone || '--'}</p>
                        </div>
                        
                        {/* Sites/Locations */}
                        <div className="pt-3 border-t">
                          <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Sites / Locations ({customerSites.length})</p>
                          {customerSites.length > 0 ? (
                            <div className="space-y-2">
                              {customerSites.map(site => (
                                <div key={site.id} className="p-2 bg-slate-50 rounded-lg">
                                  <p className="font-medium text-slate-800 text-sm">{site.name}</p>
                                  <p className="text-xs text-slate-500">
                                    {[site.address, site.city, site.state, site.zip].filter(Boolean).join(', ') || 'No address'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400 text-sm">No sites</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Associated Contacts */}
                    <div className="bg-white border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-slate-900">Associated Contacts</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{customerContacts.length}</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setAddingContactTo(selectedCustomer.id); setShowModal(true); }}
                            className="h-7 text-xs"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                      {customerContacts.length > 0 ? (
                        <div className="space-y-2">
                          {customerContacts.map(contact => (
                            <div key={contact.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                              <div className="w-8 h-8 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-[#0069AF] font-medium text-sm">
                                {contact.name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-800 text-sm">{contact.name}</p>
                                {contact.email && <p className="text-xs text-slate-500">{contact.email}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm text-center py-6">No contacts</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Proposals Tab */}
                {companyTabs[selectedCustomer.id] === 'proposals' && (
                  <div>
                    {getCustomerQuotes(selectedCustomer.name, selectedCustomer.company, selectedCustomer.email).length > 0 ? (
                      <div className="space-y-2">
                        {getCustomerQuotes(selectedCustomer.name, selectedCustomer.company, selectedCustomer.email).map(quote => (
                          <div key={quote.id} className="p-3 bg-white border rounded-lg hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-slate-900">{quote.title}</span>
                                <p className="text-xs text-slate-500">ID: {quote.quoteit_id}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700">${(quote.amount || 0).toLocaleString()}</span>
                                <Badge variant="outline" className={cn(
                                  quote.status === 'converted' && "bg-emerald-50 text-emerald-700",
                                  quote.status === 'pending' && "bg-blue-50 text-blue-700"
                                )}>{quote.status}</Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 text-center py-8">No proposals found</p>
                    )}
                  </div>
                )}

                {/* Projects Tab */}
                {companyTabs[selectedCustomer.id] === 'projects' && (
                  <div>
                    {customerProjects.length > 0 ? (
                      <div className="space-y-2">
                        {customerProjects.map(project => (
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
                      <p className="text-sm text-slate-400 text-center py-8">No projects linked</p>
                    )}
                  </div>
                )}
              </>
            );
          })()}
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
              quotes={incomingQuotes}
              onClose={() => setShowCommunication(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
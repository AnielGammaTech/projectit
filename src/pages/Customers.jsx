import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';
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
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

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
  const [contactSearch, setContactSearch] = useState('');
  const [contactPage, setContactPage] = useState(1);

  // Reset contact search/page when changing selected customer
  useEffect(() => {
    setContactSearch('');
    setContactPage(1);
  }, [selectedCustomer?.id]);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data: customers = [], isLoading: loadingCustomers, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.entities.Customer.list('-created_date')
  });

  const { data: sites = [], refetch: refetchSites } = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.entities.Site.list()
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
    queryFn: () => api.entities.IncomingQuote.list()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list()
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
  }, [editingCustomer, showModal, addingContactTo]);

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
    try {
      if (editingCustomer) {
        await api.entities.Customer.update(editingCustomer.id, formData);
      } else {
        await api.entities.Customer.create(formData);
      }
      refetch();
      setShowModal(false);
      setEditingCustomer(null);
      setAddingContactTo(null);
    } catch (err) {
      toast.error('Failed to save customer');
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteConfirm.customer) {
        await api.entities.Customer.delete(deleteConfirm.customer.id);
        refetch();
      }
    } catch (err) {
      toast.error('Failed to delete customer');
    } finally {
      setDeleteConfirm({ open: false, customer: null });
    }
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
    try {
      const ids = Array.from(selectedIds);
      for (let i = 0; i < ids.length; i++) {
        await api.entities.Customer.delete(ids[i]);
        // Small delay to avoid rate limiting
        if (i < ids.length - 1) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
      refetch();
      clearSelection();
    } catch (err) {
      toast.error('Failed to delete selected customers');
    } finally {
      setBulkDeleteConfirm(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
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
          await api.entities.Customer.create({ ...customer, source: 'import' });
        }
      }
      refetch();
      setImportData('');
    } catch (err) {
      toast.error('Failed to import customers. Please try again.');
    } finally {
      setImporting(false);
      setShowImportModal(false);
    }
  };

  const handleHaloPSASync = async () => {
    setSyncing(true);
    try {
      await api.functions.invoke('syncHaloPSACustomers', {});
      refetch();
      refetchSites();
    } catch (e) {
      toast.error('Sync failed');
    }
    setSyncing(false);
  };

  if (loadingCustomers) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                <div className="h-4 w-64 bg-slate-100 dark:bg-slate-700/60 rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                <div className="h-10 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              </div>
            </div>
            {/* Search bar skeleton */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex gap-3">
                <div className="flex-1 h-10 bg-muted rounded-lg animate-pulse" />
                <div className="h-10 w-20 bg-muted rounded-lg animate-pulse" />
                <div className="h-10 w-72 bg-muted rounded-lg animate-pulse" />
              </div>
            </div>
            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl border border-border p-4"
                  style={{ animationDelay: `${i * 75}ms` }}
                >
                  <div className="flex items-start gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/5" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-2/5" />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 pt-3 border-t border-border/50 animate-pulse">
                    <div className="h-5 w-10 bg-slate-100 dark:bg-slate-700/40 rounded" />
                    <div className="h-5 w-10 bg-slate-100 dark:bg-slate-700/40 rounded" />
                    <div className="h-5 w-10 bg-slate-100 dark:bg-slate-700/40 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 mb-3 sm:mb-6"
        >
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-3xl font-bold text-foreground tracking-tight">Customers</h1>
            <span className="text-xs text-muted-foreground sm:hidden">{companies.length + standaloneContacts.length}</span>
            <p className="hidden sm:block text-muted-foreground text-sm">Manage your client relationships</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={handleHaloPSASync} disabled={syncing} className="hidden sm:inline-flex">
              <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
              Sync from HaloPSA
            </Button>
            <Button variant="ghost" size="sm" onClick={handleHaloPSASync} disabled={syncing} className="sm:hidden h-8 w-8 p-0">
              <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={() => { setEditingCustomer(null); setFormData(p => ({ ...p, is_company: true })); setShowModal(true); }} className="bg-primary hover:bg-primary/80 h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Customer</span>
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

        {/* Mobile: compact search only */}
        <div className="sm:hidden mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm rounded-xl bg-card border-border"
            />
          </div>
        </div>

        {/* Desktop: search + filter toolbar in card */}
        <div className="hidden sm:block bg-card rounded-2xl border border-border p-4 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setViewFilter('all')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  viewFilter === 'all' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({companies.length + standaloneContacts.length})
              </button>
              <button
                onClick={() => setViewFilter('companies')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1",
                  viewFilter === 'companies' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                Companies ({companies.length})
              </button>
              <button
                onClick={() => setViewFilter('contacts')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1",
                  viewFilter === 'contacts' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Contacts ({standaloneContacts.length})
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-4">
          {/* Companies — mobile list view */}
          {(viewFilter === 'all' || viewFilter === 'companies') && filteredCompanies.length > 0 && (
            <>
              {/* Mobile compact list */}
              <div className="sm:hidden bg-card rounded-xl border border-border overflow-hidden divide-y divide-border/50">
                {filteredCompanies.map((company) => {
                  const contacts = getContactsForCompany(company.id);
                  const companySites = getSitesForCompany(company.id);
                  const companyProjects = getProjectCount(company.id);
                  const displayAddress = (company.address || company.city)
                    ? [company.city, company.state].filter(Boolean).join(', ')
                    : companySites.length > 0
                      ? [companySites[0].city, companySites[0].state].filter(Boolean).join(', ')
                      : null;
                  return (
                    <div
                      key={company.id}
                      className="flex items-center gap-3 px-3 py-2.5 active:bg-muted cursor-pointer"
                      onClick={() => setSelectedCustomer(company)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-medium text-sm text-foreground truncate">{company.name}</h3>
                          {company.source === 'halo_psa' && (
                            <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200 px-1 py-0 shrink-0">Halo</Badge>
                          )}
                        </div>
                        {displayAddress && (
                          <p className="text-[11px] text-slate-400 truncate">{displayAddress}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
                        {companySites.length > 0 && (
                          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{companySites.length}</span>
                        )}
                        {contacts.length > 0 && (
                          <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{contacts.length}</span>
                        )}
                        {companyProjects > 0 && (
                          <span className="flex items-center gap-0.5"><FolderKanban className="w-3 h-3" />{companyProjects}</span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </div>
                  );
                })}
              </div>

              {/* Desktop compact list */}
              <div className="hidden sm:block rounded-2xl border bg-card shadow-warm overflow-hidden">
              {filteredCompanies.map((company) => {
                const contacts = getContactsForCompany(company.id);
                const companySites = getSitesForCompany(company.id);
                const companyProjects = getProjectCount(company.id);
                const displayAddress = (company.address || company.city)
                  ? [company.address, company.city, company.state].filter(Boolean).join(', ')
                  : companySites.length > 0
                    ? [companySites[0].address, companySites[0].city, companySites[0].state].filter(Boolean).join(', ')
                    : null;
                return (
                  <div
                    key={company.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
                      selectedIds.has(company.id) && "bg-red-50/30 dark:bg-red-900/10"
                    )}
                    onClick={() => setSelectedCustomer(company)}
                  >
                    {selectionMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelection(company.id); }}
                        className="p-0.5 shrink-0"
                      >
                        {selectedIds.has(company.id) ? (
                          <CheckSquare className="w-4 h-4 text-red-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    )}
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{company.name}</span>
                        {company.source === 'halo_psa' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Halo</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">{displayAddress || 'No address'}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span>{companySites.length} sites</span>
                      <span>{contacts.length} contacts</span>
                      <span>{companyProjects} projects</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
              </div>
            </>
          )}


          {/* Standalone Contacts */}
          {(viewFilter === 'all' || viewFilter === 'contacts') && filteredStandaloneContacts.length > 0 && (
            <>
              {/* Mobile compact list */}
              <div className="sm:hidden bg-card rounded-xl border border-border overflow-hidden divide-y divide-border/50 mt-2">
                {filteredStandaloneContacts.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 px-3 py-2.5 active:bg-slate-50 dark:active:bg-slate-700/30 cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs shrink-0">
                      {customer.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground truncate">{customer.name}</h3>
                      {customer.company && <p className="text-[11px] text-slate-400 truncate">{customer.company}</p>}
                    </div>
                    {getProjectCount(customer.id) > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-slate-400 shrink-0">
                        <FolderKanban className="w-3 h-3" />{getProjectCount(customer.id)}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>

              {/* Desktop compact list */}
              <div className="hidden sm:block rounded-2xl border bg-card shadow-warm overflow-hidden mt-4">
                {filteredStandaloneContacts.map((customer) => (
                  <div
                    key={customer.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
                      selectedIds.has(customer.id) && "bg-red-50/30 dark:bg-red-900/10"
                    )}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    {selectionMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelection(customer.id); }}
                        className="p-0.5 shrink-0"
                      >
                        {selectedIds.has(customer.id) ? (
                          <CheckSquare className="w-4 h-4 text-red-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    )}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                      {customer.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate block">{customer.name}</span>
                      <span className="text-xs text-muted-foreground truncate block">{customer.company || 'No company'}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span>{getProjectCount(customer.id)} projects</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </>
          )}

          {((viewFilter === 'all' && filteredCompanies.length === 0 && filteredStandaloneContacts.length === 0) ||
            (viewFilter === 'companies' && filteredCompanies.length === 0) ||
            (viewFilter === 'contacts' && filteredStandaloneContacts.length === 0)) && (
            <div className="bg-card rounded-2xl border border-slate-100 dark:border-border p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No customers yet</h3>
              <p className="text-muted-foreground mb-6">Add your first company or sync from HaloPSA</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleHaloPSASync} disabled={syncing}>
                  <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
                  Sync from HaloPSA
                </Button>
                <Button onClick={() => { setFormData(p => ({ ...p, is_company: true })); setShowModal(true); }} className="bg-primary hover:bg-primary/80">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label>{formData.is_company ? 'Company Name *' : 'Name *'}</Label>
                <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Email {formData.is_company ? '' : '*'}</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/80">
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
              <Button onClick={handleImport} disabled={importing || !importData.trim()} className="bg-primary hover:bg-primary/80">
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent hideCloseOnMobile className="sm:max-w-3xl overflow-hidden p-0 h-[92vh] sm:h-auto sm:max-h-[90vh]">
          {selectedCustomer && (() => {
            const customerSites = getSitesForCompany(selectedCustomer.id);
            const customerContacts = getContactsForCompany(selectedCustomer.id);
            const customerProjects = getCustomerProjects(selectedCustomer.id);
            const customerQuotes = getCustomerQuotes(selectedCustomer.name, selectedCustomer.company, selectedCustomer.email);
            const fullAddress = [selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip].filter(Boolean).join(', ');
            const siteAddress = customerSites.length > 0 ? [customerSites[0].address, customerSites[0].city, customerSites[0].state, customerSites[0].zip].filter(Boolean).join(', ') : '';
            const displayAddress = fullAddress || siteAddress;

            return (
              <>
                {/* Hero Header */}
                <div className="bg-[#0a1e2e] dark:bg-[#0a1e2e] px-4 sm:px-6 pt-3 sm:pt-6 pb-4 sm:pb-5 text-white relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                  <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full" />
                  <div className="relative z-10">
                    {/* Mobile: close/edit bar */}
                    <div className="sm:hidden flex items-center justify-between mb-2">
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="flex items-center gap-1.5 text-white text-sm font-semibold bg-white/15 rounded-full px-4 py-1.5"
                      >
                        <X className="w-4 h-4" /> Close
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingCustomer(selectedCustomer); setShowModal(true); }}
                        className="text-white/80 hover:text-white hover:bg-white/15 h-7 text-xs px-2"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-lg sm:text-2xl font-bold shrink-0">
                          {selectedCustomer.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-xl font-bold truncate">{selectedCustomer.name}</h2>
                            {selectedCustomer.source === 'halo_psa' && (
                              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/20 text-white/90 shrink-0">HaloPSA</span>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 mt-1 text-xs sm:text-sm text-white/70">
                            {selectedCustomer.email && (
                              <span className="flex items-center gap-1.5 truncate">
                                <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> {selectedCustomer.email}
                              </span>
                            )}
                            {selectedCustomer.phone && (
                              <span className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> {selectedCustomer.phone}
                              </span>
                            )}
                          </div>
                          {displayAddress && (
                            <p className="flex items-center gap-1.5 mt-0.5 sm:mt-1 text-xs sm:text-sm text-white/80 truncate">
                              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" /> {displayAddress}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Desktop edit button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingCustomer(selectedCustomer); setShowModal(true); }}
                        className="hidden sm:flex text-white/80 hover:text-white hover:bg-white/15 h-8 shrink-0"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </Button>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-4 gap-2 mt-3 sm:mt-4">
                      <div className="flex flex-col items-center gap-0.5 px-2 py-2 bg-white/10 rounded-xl">
                        <MapPin className="w-4 h-4 text-emerald-300" />
                        <span className="text-sm font-bold">{customerSites.length}</span>
                        <span className="text-[10px] text-white/60">Sites</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 px-2 py-2 bg-white/10 rounded-xl">
                        <Users className="w-4 h-4 text-blue-300" />
                        <span className="text-sm font-bold">{customerContacts.length}</span>
                        <span className="text-[10px] text-white/60">Contacts</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 px-2 py-2 bg-white/10 rounded-xl">
                        <FolderKanban className="w-4 h-4 text-orange-300" />
                        <span className="text-sm font-bold">{customerProjects.length}</span>
                        <span className="text-[10px] text-white/60">Projects</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 px-2 py-2 bg-white/10 rounded-xl">
                        <FileText className="w-4 h-4 text-violet-300" />
                        <span className="text-sm font-bold">{customerQuotes.length}</span>
                        <span className="text-[10px] text-white/60">Proposals</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-3 sm:px-6 pt-3 border-b border-slate-200 dark:border-border bg-card">
                  {[
                    { key: 'details', label: 'Details', mobileLabel: 'Details' },
                    { key: 'contacts', label: null, mobileLabel: `Contacts`, mobileOnly: true },
                    { key: 'proposals', label: `Proposals (${customerQuotes.length})`, mobileLabel: `Proposals` },
                    { key: 'projects', label: `Projects (${customerProjects.length})`, mobileLabel: `Projects` },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setCompanyTabs(prev => ({ ...prev, [selectedCustomer.id]: tab.key }))}
                      className={cn(
                        "px-2.5 sm:px-4 pb-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                        tab.mobileOnly && "sm:hidden",
                        (companyTabs[selectedCustomer.id] || 'details') === tab.key
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className={tab.mobileOnly ? "" : "sm:hidden"}>{tab.mobileLabel}</span>
                      {tab.label && <span className="hidden sm:inline">{tab.label}</span>}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="overflow-y-auto no-scrollbar p-3 sm:p-6 flex-1">
                  {/* Details & Contacts Tab */}
                  {(companyTabs[selectedCustomer.id] || 'details') === 'details' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Company Info */}
                      <div className="bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl p-5">
                        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          Company Info
                        </h4>
                        <div className="space-y-4 text-sm">
                          <div>
                            <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-1">Address</p>
                            {(selectedCustomer.address || selectedCustomer.city) ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-700 dark:text-slate-300 hover:text-primary hover:underline"
                              >
                                {selectedCustomer.address && <p>{selectedCustomer.address}</p>}
                                <p>{[selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip].filter(Boolean).join(', ')}</p>
                              </a>
                            ) : customerSites.length > 0 && (customerSites[0].address || customerSites[0].city) ? (
                              <>
                                <p className="text-foreground">{customerSites[0].address || <span className="text-muted-foreground italic">Not set</span>}</p>
                                <p className="text-foreground">{[customerSites[0].city, customerSites[0].state, customerSites[0].zip].filter(Boolean).join(', ')}</p>
                                <p className="text-xs text-muted-foreground mt-1">(from site: {customerSites[0].name})</p>
                              </>
                            ) : (
                              <p className="text-muted-foreground italic">Not set</p>
                            )}
                          </div>
                          <div>
                            <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-1">Primary Contact</p>
                            <p className="text-foreground">{customerContacts[0]?.name || <span className="text-muted-foreground italic">Not set</span>}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-1">Email</p>
                            <p className="text-foreground">{selectedCustomer.email || <span className="text-muted-foreground italic">Not set</span>}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-1">Phone</p>
                            <p className="text-foreground">{selectedCustomer.phone || <span className="text-muted-foreground italic">Not set</span>}</p>
                          </div>

                          {/* Sites/Locations */}
                          <div className="pt-3 border-t border-slate-200 dark:border-border">
                            <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2">Sites / Locations ({customerSites.length})</p>
                            {customerSites.length > 0 ? (
                              <div className="space-y-2">
                                {customerSites.map(site => (
                                  <div key={site.id} className="p-2.5 bg-card rounded-lg border border-slate-200 dark:border-border">
                                    <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{site.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {[site.address, site.city, site.state, site.zip].filter(Boolean).join(', ') || 'No address'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-sm italic">No sites</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Associated Contacts — hidden on mobile (has its own tab) */}
                      <div className="hidden sm:block bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            Contacts
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{customerContacts.length}</span>
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
                        {customerContacts.length > 5 && (
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input
                              placeholder="Search contacts..."
                              value={contactSearch}
                              onChange={(e) => { setContactSearch(e.target.value); setContactPage(1); }}
                              className="pl-9 h-8 text-sm"
                            />
                          </div>
                        )}
                        {(() => {
                          const filtered = customerContacts.filter(c =>
                            c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                            c.email?.toLowerCase().includes(contactSearch.toLowerCase())
                          );
                          const totalPages = Math.ceil(filtered.length / 10);
                          const paginated = filtered.slice((contactPage - 1) * 10, contactPage * 10);
                          return filtered.length > 0 ? (
                            <>
                              <div className="space-y-1.5">
                                {paginated.map(contact => (
                                  <div key={contact.id} className="flex items-center gap-3 p-2.5 bg-card rounded-lg border border-slate-200 dark:border-border hover:border-primary/30 transition-colors">
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                                      {contact.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">{contact.name}</p>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {contact.email && <span className="truncate">{contact.email}</span>}
                                        {contact.phone && <span>{contact.phone}</span>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-border">
                                  <span className="text-xs text-slate-500">
                                    {(contactPage - 1) * 10 + 1}-{Math.min(contactPage * 10, filtered.length)} of {filtered.length}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={contactPage === 1} onClick={() => setContactPage(p => p - 1)}>Prev</Button>
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={contactPage >= totalPages} onClick={() => setContactPage(p => p + 1)}>Next</Button>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-slate-400 text-sm text-center py-6">
                              {contactSearch ? 'No contacts match your search' : 'No contacts'}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Contacts Tab (mobile only) */}
                  {companyTabs[selectedCustomer.id] === 'contacts' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-primary" />
                          Contacts
                          <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{customerContacts.length}</span>
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setAddingContactTo(selectedCustomer.id); setShowModal(true); }}
                          className="h-8 text-xs"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
                        </Button>
                      </div>
                      {customerContacts.length > 5 && (
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <Input
                            placeholder="Search contacts..."
                            value={contactSearch}
                            onChange={(e) => { setContactSearch(e.target.value); setContactPage(1); }}
                            className="pl-9 h-9 text-sm"
                          />
                        </div>
                      )}
                      {(() => {
                        const filtered = customerContacts.filter(c =>
                          c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                          c.email?.toLowerCase().includes(contactSearch.toLowerCase())
                        );
                        const totalPages = Math.ceil(filtered.length / 10);
                        const paginated = filtered.slice((contactPage - 1) * 10, contactPage * 10);
                        return filtered.length > 0 ? (
                          <div className="space-y-2">
                            {paginated.map(contact => (
                              <div key={contact.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-background rounded-xl border border-slate-200 dark:border-border">
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                                  {contact.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">{contact.name}</p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {contact.email && <span className="truncate">{contact.email}</span>}
                                    {contact.phone && <span>{contact.phone}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-border">
                                <span className="text-xs text-slate-500">
                                  {(contactPage - 1) * 10 + 1}-{Math.min(contactPage * 10, filtered.length)} of {filtered.length}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={contactPage === 1} onClick={() => setContactPage(p => p - 1)}>Prev</Button>
                                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={contactPage >= totalPages} onClick={() => setContactPage(p => p + 1)}>Next</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-sm text-slate-400">{contactSearch ? 'No contacts match your search' : 'No contacts yet'}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setAddingContactTo(selectedCustomer.id); setShowModal(true); }}
                              className="mt-3 h-8 text-xs"
                            >
                              <UserPlus className="w-3.5 h-3.5 mr-1" /> Add First Contact
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Proposals Tab */}
                  {companyTabs[selectedCustomer.id] === 'proposals' && (
                    <div>
                      {customerQuotes.length > 0 ? (
                        <div className="space-y-2">
                          {customerQuotes.map(quote => (
                            <div key={quote.id} className="p-4 bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl hover:border-primary/30 transition-all">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <img src="/quoteit-favicon.svg" alt="" className="w-5 h-5 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium text-foreground">{quote.title}</span>
                                    <p className="text-xs text-muted-foreground">ID: {quote.quoteit_id}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">${(quote.amount || 0).toLocaleString()}</span>
                                  <Badge variant="outline" className={cn(
                                    quote.status === 'converted' && "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
                                    quote.status === 'pending' && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                  )}>{quote.status}</Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                          <p className="text-sm text-slate-400">No proposals found</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Projects Tab */}
                  {companyTabs[selectedCustomer.id] === 'projects' && (
                    <div>
                      {customerProjects.length > 0 ? (
                        <div className="space-y-2">
                          {customerProjects.map(project => (
                            <Link key={project.id} to={createPageUrl('ProjectDetail') + `?id=${project.id}`} className="block p-4 bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl hover:border-primary/30 transition-all">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{project.name}</span>
                                <Badge variant="outline" className={cn(
                                  project.status === 'completed' && "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
                                  project.status === 'in_progress' && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                                  project.status === 'planning' && "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                )}>{project.status?.replace('_', ' ')}</Badge>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <FolderKanban className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                          <p className="text-sm text-slate-400">No projects linked</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
              <Send className="w-5 h-5 text-primary" />
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
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Save, Send, Plus, Eye, Calendar, User, Mail, Phone, FileText,
  Search, Building2, ChevronDown, Sparkles, Wand2, Package, Loader2, Layers,
  Copy, Check, History, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

import ProposalSection from '@/components/proposals/ProposalSection';
import ProposalSummary from '@/components/proposals/ProposalSummary';
import CustomItemModal from '@/components/proposals/CustomItemModal';
import AIProposalGenerator from '@/components/proposals/AIProposalGenerator';
import ProposalActivityFeed from '@/components/proposals/ProposalActivityFeed';
import ProposalVersionHistory, { saveProposalVersion } from '@/components/proposals/ProposalVersionHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  viewed: { label: 'Viewed', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200' },
  changes_requested: { label: 'Changes Requested', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  expired: { label: 'Expired', color: 'bg-slate-100 text-slate-500 border-slate-200' }
};

export default function ProposalEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const proposalId = urlParams.get('id');
  const queryClient = useQueryClient();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedData, setLastSavedData] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [showAISearchModal, setShowAISearchModal] = useState(false);
  const [showAIGeneratorModal, setShowAIGeneratorModal] = useState(false);
  const [editingAreaIndex, setEditingAreaIndex] = useState(null);
  const [expandedAreas, setExpandedAreas] = useState({});
  const [linkCopied, setLinkCopied] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(null);

  // Markup settings
  const [markupType, setMarkupType] = useState('percentage');
  const [markupValue, setMarkupValue] = useState(20);
  const [selectedSalesperson, setSelectedSalesperson] = useState(null);

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

  // New customer form
  const [customerType, setCustomerType] = useState('person');
  const [newCustomer, setNewCustomer] = useState({
    first_name: '', last_name: '', email: '', phone: '', company: '', address: ''
  });
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (!selectedSalesperson) {
        setSelectedSalesperson({ name: user?.full_name, email: user?.email });
      }
    }).catch(() => {});
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

  const { data: bundles = [] } = useQuery({
    queryKey: ['serviceBundles'],
    queryFn: () => base44.entities.ServiceBundle.list()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const { data: allProposals = [] } = useQuery({
    queryKey: ['allProposalsCount'],
    queryFn: () => base44.entities.Proposal.list(),
    enabled: !proposalId
  });

  const { data: proposalSettings } = useQuery({
    queryKey: ['proposalSettings'],
    queryFn: async () => {
      const settings = await base44.entities.ProposalSettings.filter({ setting_key: 'main' });
      return settings[0];
    }
  });

  // Poll ProposalApproval app for status changes every 3 seconds
  useEffect(() => {
    const token = proposal?.approval_token;
    if (!token || !proposalId || !['sent', 'viewed'].includes(formData.status)) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('https://proposal-pro-693241d0a76cc7fc545d1a0b.base44.app/api/functions/receiveProposal', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'check_status', token })
                        });
                        const result = await response.json();

                        // Map status from remote app
                        const remoteStatus = result.status === 'declined' ? 'rejected' : result.status;
                        const isViewed = result.viewed && formData.status === 'sent';
                        const newStatus = isViewed ? 'viewed' : remoteStatus;

                        if (newStatus && newStatus !== 'pending' && newStatus !== formData.status) {
          // Update local proposal with new status
                            const updateData = { status: newStatus };
                            if (result.signer_name) updateData.signer_name = result.signer_name;
                            if (result.signature_data) updateData.signature_data = result.signature_data;
                            if (result.signed_date) updateData.signed_date = result.signed_date;
                            if (result.changes_requested) updateData.change_request_notes = result.changes_requested;

          await base44.entities.Proposal.update(proposalId, updateData);
          setFormData(prev => ({ ...prev, ...updateData }));
          queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
          queryClient.invalidateQueries({ queryKey: ['proposalActivity', proposalId] });

          // Stop polling once we get a final status
          if (['approved', 'rejected', 'changes_requested'].includes(result.status)) {
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [proposal?.approval_token, formData.status, proposalId]);

  // Load settings
  useEffect(() => {
    if (proposalSettings) {
      setMarkupType(proposalSettings.default_markup_type || 'percentage');
      setMarkupValue(proposalSettings.default_markup_value || 20);
      if (!proposalId && proposalSettings.default_terms_conditions) {
        setFormData(prev => ({ ...prev, terms_conditions: proposalSettings.default_terms_conditions }));
      }
      if (!proposalId && proposalSettings.default_sales_tax_percent) {
        setFormData(prev => ({ ...prev, sales_tax_percent: proposalSettings.default_sales_tax_percent }));
      }
    }
  }, [proposalSettings, proposalId]);

  useEffect(() => {
    if (proposal) {
      let areas = proposal.areas || [];
      if (!areas.length && proposal.items?.length) {
        areas = [{ name: 'Items', items: proposal.items }];
      }
      
      const initialData = {
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
        status: proposal.status || 'draft',
        change_request_notes: proposal.change_request_notes
      };
      
      setFormData(initialData);
      setLastSavedData(JSON.stringify(initialData));
      
      const expanded = {};
      areas.forEach((_, idx) => { expanded[idx] = true; });
      setExpandedAreas(expanded);
    } else if (!proposalId && allProposals) {
      const prefix = proposalSettings?.proposal_prefix || 'P-';
      const nextNumber = (allProposals.length + 1).toString().padStart(4, '0');
      const proposalNumber = `${prefix}${nextNumber}`;
      setFormData(prev => ({ ...prev, proposal_number: proposalNumber }));
    }
  }, [proposal, proposalId, allProposals, proposalSettings]);

  // Auto-save effect
  useEffect(() => {
    if (!proposalId || saving || !lastSavedData) return;

    const currentDataString = JSON.stringify(formData);
    if (currentDataString === lastSavedData) return;

    const timer = setTimeout(async () => {
      setSaving(true);
      await handleSave(true); // silent save
      setLastSavedData(currentDataString);
      setSaving(false);
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [formData, proposalId, saving, lastSavedData]);

  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_company: customer.company || '',
      customer_phone: customer.phone || '',
      customer_address: [customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')
    }));
    setShowCustomerModal(false);
  };

  const handleCreateCustomer = async () => {
    const name = customerType === 'person' 
      ? `${newCustomer.first_name} ${newCustomer.last_name}`.trim()
      : newCustomer.company;
    
    if (!name || !newCustomer.email) return;
    
    const created = await base44.entities.Customer.create({
      name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      company: customerType === 'company' ? newCustomer.company : '',
      address: newCustomer.address
    });
    
    refetchCustomers();
    handleCustomerSelect(created);
    setNewCustomer({ first_name: '', last_name: '', email: '', phone: '', company: '', address: '' });
    setShowNewCustomerForm(false);
  };

  // Section handlers
  const addArea = () => {
    const areaName = `Section ${formData.areas.length + 1}`;
    setFormData(prev => ({
      ...prev,
      areas: [...prev.areas, { name: areaName, items: [], is_optional: false }]
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

  const duplicateArea = (index) => {
    const area = formData.areas[index];
    const newArea = { 
      ...area, 
      name: `${area.name} (Copy)`,
      items: area.items?.map(item => ({ ...item })) || []
    };
    setFormData(prev => ({
      ...prev,
      areas: [...prev.areas.slice(0, index + 1), newArea, ...prev.areas.slice(index + 1)]
    }));
    setExpandedAreas(prev => ({ ...prev, [index + 1]: true }));
  };

  const toggleAreaOptional = (index) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map((area, i) => 
        i === index ? { ...area, is_optional: !area.is_optional } : area
      )
    }));
  };

  const addOptionToArea = (index) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map((area, i) => 
        i === index ? { ...area, options: [...(area.options || []), { items: [] }] } : area
      )
    }));
  };

  const toggleArea = (index) => {
    setExpandedAreas(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Item handlers
  const addItemToArea = (areaIndex, item) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map((area, i) => 
        i === areaIndex 
          ? { ...area, items: [...(area.items || []), item] }
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

  const duplicateItemInArea = (areaIndex, itemIndex) => {
    const item = formData.areas[areaIndex].items[itemIndex];
    addItemToArea(areaIndex, { ...item });
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalCost = 0;
    formData.areas.forEach(area => {
      if (!area.is_optional) {
        area.items?.forEach(item => {
          subtotal += (item.quantity || 0) * (item.unit_price || 0);
          totalCost += (item.quantity || 0) * (item.unit_cost || 0);
        });
      }
    });
    const taxAmount = subtotal * ((formData.sales_tax_percent || 0) / 100);
    return { subtotal, totalCost, taxAmount, total: subtotal + taxAmount };
  };

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    const totals = calculateTotals();
    const allItems = formData.areas.flatMap(area => area.items || []);
    
    const data = {
      ...formData,
      items: allItems,
      subtotal: totals.subtotal,
      tax_total: totals.taxAmount,
      total: totals.total,
      created_by_email: selectedSalesperson?.email || currentUser?.email,
      created_by_name: selectedSalesperson?.name || currentUser?.full_name
    };

    if (proposalId) {
      await base44.entities.Proposal.update(proposalId, data);
    } else {
      const approvalToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const newProposal = await base44.entities.Proposal.create({ ...data, approval_token: approvalToken });
      // Log creation activity
      await base44.entities.ProposalActivity.create({
        proposal_id: newProposal.id,
        action: 'created',
        actor_name: currentUser?.full_name || 'User',
        actor_email: currentUser?.email,
        details: `Proposal "${data.title}" created`
      });
      if (!silent) window.location.href = createPageUrl('ProposalEditor') + `?id=${newProposal.id}`;
    }
    
    if (!silent) {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setSaving(false);
    }
  };

  const totals = calculateTotals();
  const totalItems = formData.areas.reduce((sum, area) => sum + (area.items?.length || 0), 0);

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.company?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Changes Requested Alert */}
      {formData.status === 'changes_requested' && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Customer Requested Changes</p>
              <p className="text-amber-700 text-sm mt-1">{proposal?.change_request_notes || 'No notes provided.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Proposals')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Proposals
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-2">
              {saving ? 'Saving...' : 'All changes saved'}
            </span>
            {/* Generate & Copy Customer Link Button */}
                              {proposalId && proposal?.approval_token && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={async () => {
                                                          // Copy link first (before async call loses document focus)
                                                          const link = `https://proposal-pro-545d1a0b.base44.app/Approve?token=${proposal.approval_token}`;
                                                          navigator.clipboard.writeText(link);
                                                          setLinkCopied(true);
                                                          setTimeout(() => setLinkCopied(false), 2000);

                                                          // Update status to sent
                                                          const newStatus = 'sent';
                                                          setFormData(prev => ({ ...prev, status: newStatus }));
                                                          await base44.entities.Proposal.update(proposalId, { status: newStatus, sent_date: new Date().toISOString() });

                                                          // Log activity
                                                          await base44.entities.ProposalActivity.create({
                                                            proposal_id: proposalId,
                                                            action: 'sent',
                                                            actor_name: currentUser?.full_name || 'User',
                                                            actor_email: currentUser?.email,
                                                            details: 'Approval link copied and shared'
                                                          });

                                                          // Then sync proposal to approval app
                                                                                          try {
                                                                                            await fetch('https://proposal-pro-545d1a0b.base44.app/api/functions/receiveProposal', {
                                                                                              method: 'POST',
                                                                                              headers: { 'Content-Type': 'application/json' },
                                                                                              body: JSON.stringify({
                                                                                                action: 'store',
                                                                                                token: proposal.approval_token,
                                                                                                proposal: {
                                                                                                  proposal_number: formData.proposal_number,
                                                                                                  title: formData.title,
                                                                                                  customer_name: formData.customer_name,
                                                                                                  customer_email: formData.customer_email,
                                                                                                  customer_company: formData.customer_company,
                                                                                                  customer_phone: formData.customer_phone,
                                                                                                  customer_address: formData.customer_address,
                                                                                                  created_by_name: selectedSalesperson?.name || currentUser?.full_name,
                                                                                                  created_by_email: selectedSalesperson?.email || currentUser?.email,
                                                                                                  items: formData.areas?.flatMap(a => a.items || []) || [],
                                                                                                  areas: formData.areas,
                                                                                                  subtotal: calculateTotals().subtotal,
                                                                                                  tax_total: calculateTotals().taxAmount,
                                                                                                  total: calculateTotals().total,
                                                                                                  terms_conditions: formData.terms_conditions,
                                                                                                  valid_until: formData.valid_until,
                                                                                                  sent_date: new Date().toISOString(),
                                                                                                  status: newStatus
                                                                                                }
                                                                                              })
                                                                                            });
                                                                                          } catch (err) {
                                                                                            console.error('Failed to sync proposal:', err);
                                                                                          }

                                                          queryClient.invalidateQueries({ queryKey: ['proposalActivity', proposalId] });
                                                        }}
                                  className={cn(linkCopied && "bg-emerald-50 border-emerald-200 text-emerald-600")}
                                >
                                  {linkCopied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                                  {linkCopied ? 'Copied!' : 'Copy Link'}
                                </Button>
                              )}
            <Button variant="ghost" size="sm" onClick={async () => {
              await handleSave(false);
              if (proposalId) {
                await saveProposalVersion(proposalId, formData, 'Manual save', currentUser?.email, currentUser?.full_name);
                queryClient.invalidateQueries({ queryKey: ['proposalVersions', proposalId] });
              }
            }} disabled={saving}>
              <Save className="w-4 h-4 mr-1.5" />
              Save Version
            </Button>
            <Link to={proposalId ? createPageUrl('ProposalView') + `?id=${proposalId}` : '#'}>
              <Button variant="outline" size="sm" disabled={!proposalId}>
                <Eye className="w-4 h-4 mr-1.5" />
                Preview
              </Button>
            </Link>
            <Button 
              size="sm" 
              className="bg-[#0069AF] hover:bg-[#005a94]"
              disabled={!proposalId || !formData.customer_email}
              onClick={async () => {
                                  if (!formData.customer_email) {
                                    alert('Please add a customer with an email address before sending.');
                                    return;
                                  }
                                  await handleSave();

                                  // Sync proposal to approval app before sending
                                                      try {
                                                        await fetch('https://proposal-pro-545d1a0b.base44.app/api/functions/receiveProposal', {
                                                          method: 'POST',
                                                          headers: { 'Content-Type': 'application/json' },
                                                          body: JSON.stringify({
                                                            action: 'store',
                                                            token: proposal?.approval_token,
                                                            proposal: {
                                                              proposal_number: formData.proposal_number,
                                                              title: formData.title,
                                                              customer_name: formData.customer_name,
                                                              customer_email: formData.customer_email,
                                                              customer_company: formData.customer_company,
                                                              customer_phone: formData.customer_phone,
                                                              customer_address: formData.customer_address,
                                                              created_by_name: selectedSalesperson?.name || currentUser?.full_name,
                                                              created_by_email: selectedSalesperson?.email || currentUser?.email,
                                                              items: formData.areas?.flatMap(a => a.items || []) || [],
                                                              areas: formData.areas,
                                                              subtotal: calculateTotals().subtotal,
                                                              tax_total: calculateTotals().taxAmount,
                                                              total: calculateTotals().total,
                                                              terms_conditions: formData.terms_conditions,
                                                              valid_until: formData.valid_until,
                                                              sent_date: new Date().toISOString(),
                                                              status: 'sent'
                                                            }
                                                          })
                                                        });
                                                      } catch (err) {
                                                        console.error('Failed to sync proposal:', err);
                                                      }

                                  const approvalLink = `https://proposal-pro-545d1a0b.base44.app/Approve?token=${proposal?.approval_token}`;
                                  await base44.functions.invoke('sendEmailit', {
                                    to: formData.customer_email,
                                    subject: `Proposal: ${formData.title}`,
                                    html: `
                                      <h2>You have received a proposal</h2>
                                      <p>Dear ${formData.customer_name},</p>
                                      <p>Please review and approve the following proposal:</p>
                                      <p><strong>${formData.title}</strong></p>
                                      <p>Total: $${calculateTotals().total?.toLocaleString()}</p>
                                      <p><a href="${approvalLink}" style="background: #0069AF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Review & Sign Proposal</a></p>
                                      <p>This proposal is valid until ${formData.valid_until ? format(new Date(formData.valid_until), 'MMMM d, yyyy') : 'further notice'}.</p>
                                    `
                                  });
                await base44.entities.Proposal.update(proposalId, { status: 'sent', sent_date: new Date().toISOString() });
                // Log activity
                await base44.entities.ProposalActivity.create({
                  proposal_id: proposalId,
                  action: 'sent',
                  actor_name: currentUser?.full_name || 'User',
                  actor_email: currentUser?.email,
                  details: `Proposal sent to ${formData.customer_email}`
                });
                setFormData(prev => ({ ...prev, status: 'sent' }));
                queryClient.invalidateQueries({ queryKey: ['proposalActivity', proposalId] });
                alert('Proposal sent successfully!');
              }}
            >
              <Send className="w-4 h-4 mr-1.5" />
              Send
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className={cn("lg:col-span-8 space-y-5", showActivityPanel && "lg:col-span-5")}>
            {/* Title Header */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter proposal title..."
                      className="text-2xl font-bold text-slate-900 bg-transparent border-none focus:outline-none w-full placeholder:text-slate-300"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">{formData.proposal_number}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-sm font-medium text-slate-700">${totals.total.toFixed(2)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-80",
                          formData.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                          formData.status === 'sent' ? "bg-blue-100 text-blue-700" :
                          formData.status === 'viewed' ? "bg-amber-100 text-amber-700" :
                          formData.status === 'rejected' ? "bg-red-100 text-red-700" :
                          formData.status === 'changes_requested' ? "bg-orange-100 text-orange-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            formData.status === 'approved' ? "bg-emerald-500" :
                            formData.status === 'sent' ? "bg-blue-500" :
                            formData.status === 'viewed' ? "bg-amber-500" :
                            formData.status === 'rejected' ? "bg-red-500" :
                            formData.status === 'changes_requested' ? "bg-orange-500" :
                            "bg-slate-400"
                          )} />
                          {statusConfig[formData.status]?.label || formData.status}
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <DropdownMenuItem key={key} onClick={async () => {
                            setFormData(prev => ({ ...prev, status: key }));
                            if (proposalId) {
                              const updates = { status: key };
                              if (key === 'sent') updates.sent_date = new Date().toISOString();
                              await base44.entities.Proposal.update(proposalId, updates);
                              await base44.entities.ProposalActivity.create({
                                proposal_id: proposalId,
                                action: key === 'sent' ? 'sent' : 'updated',
                                actor_name: currentUser?.full_name || 'User',
                                actor_email: currentUser?.email,
                                details: `Status changed to ${config.label}`
                              });
                              queryClient.invalidateQueries({ queryKey: ['proposalActivity', proposalId] });
                            }
                          }}>
                            <span className={cn("w-2 h-2 rounded-full mr-2", config.color.split(' ')[0])}></span>
                            {config.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {/* Activity Button */}
                {proposalId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowActivityPanel(!showActivityPanel)}
                    className={cn(showActivityPanel && "bg-slate-100")}
                  >
                    <History className="w-4 h-4 mr-1.5" />
                    Activity
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Salesperson Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 }}
              className="bg-slate-50 rounded-xl border border-slate-200 px-5 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Salesperson</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="font-semibold text-slate-900 hover:text-[#0069AF] flex items-center gap-1 transition-colors">
                      {selectedSalesperson?.name || currentUser?.full_name || 'Not assigned'}
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {currentUser && (
                      <DropdownMenuItem onClick={() => setSelectedSalesperson({ name: currentUser.full_name, email: currentUser.email })}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#0069AF] flex items-center justify-center text-white text-xs font-medium">
                            {currentUser.full_name?.charAt(0)}
                          </div>
                          <span>{currentUser.full_name}</span>
                          <span className="text-xs text-slate-400">(Me)</span>
                        </div>
                      </DropdownMenuItem>
                    )}
                    {teamMembers.filter(m => m.email !== currentUser?.email).map(member => (
                      <DropdownMenuItem key={member.id} onClick={() => setSelectedSalesperson({ name: member.name, email: member.email })}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-medium">
                            {member.name?.charAt(0)}
                          </div>
                          <span>{member.name}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>

            {/* Client & Location Cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-2 gap-4"
            >
              {/* Client Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Client</p>
                    {formData.customer_name ? (
                      <>
                        <p className="font-semibold text-slate-900">{formData.customer_company || formData.customer_name}</p>
                        {formData.customer_company && <p className="text-sm text-slate-600">{formData.customer_name}</p>}
                        <p className="text-sm text-slate-500">{formData.customer_email}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">No client selected</p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowCustomerModal(true)} 
                    className="text-slate-400 hover:text-slate-600 h-8 w-8"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 relative overflow-hidden">
                <div className="flex">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-2">Location</p>
                    {formData.customer_address ? (
                      <>
                        <p className="font-semibold text-slate-900">{formData.customer_address.split(',')[0]}</p>
                        <p className="text-sm text-slate-500">{formData.customer_address.split(',').slice(1).join(',').trim()}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">No address</p>
                    )}
                  </div>
                  {formData.customer_address && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.customer_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-24 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 block hover:opacity-90 transition-opacity"
                    >
                      <img 
                        src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ef4444(${encodeURIComponent(formData.customer_address.split(',')[0])})/-81.7787,26.1420,12/200x160?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`}
                        alt="Location"
                        className="w-full h-full object-cover"
                        onError={(e) => { 
                          e.target.onerror = null;
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-400"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>';
                        }}
                      />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>



            {/* Version History */}
            {proposalId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                <ProposalVersionHistory 
                  proposalId={proposalId} 
                  currentProposal={formData}
                  onRevert={() => {
                    queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
                  }}
                />
              </motion.div>
            )}

            {/* Line Items */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Line Items</h3>
                <span className="text-xs text-slate-400">{totalItems} item{totalItems !== 1 && 's'}</span>
              </div>

              {formData.areas.length > 0 ? (
                <div className="space-y-3">
                  {formData.areas.map((area, areaIndex) => (
                    <ProposalSection
                      key={areaIndex}
                      area={area}
                      areaIndex={areaIndex}
                      expanded={expandedAreas[areaIndex]}
                      onToggle={() => toggleArea(areaIndex)}
                      onUpdateName={(name) => updateAreaName(areaIndex, name)}
                      onUpdateArea={(updatedArea) => {
                        setFormData(prev => ({
                          ...prev,
                          areas: prev.areas.map((a, i) => i === areaIndex ? updatedArea : a)
                        }));
                      }}
                      onRemove={() => removeArea(areaIndex)}
                      onDuplicate={() => duplicateArea(areaIndex)}
                      onMakeOptional={() => toggleAreaOptional(areaIndex)}
                      onAddOption={() => addOptionToArea(areaIndex)}
                      onUpdateItem={(itemIdx, field, value) => updateItemInArea(areaIndex, itemIdx, field, value)}
                      onRemoveItem={(itemIdx) => removeItemFromArea(areaIndex, itemIdx)}
                      onDuplicateItem={(itemIdx) => duplicateItemInArea(areaIndex, itemIdx)}
                      onAddFromInventory={(item) => addItemToArea(areaIndex, item)}
                      onAddCustomItem={() => { setEditingAreaIndex(areaIndex); setShowCustomItemModal(true); }}
                      onAddBundle={(bundle) => {
                        // Add primary item first, then sub-items with indentation
                        const primaryItem = bundle.items?.find(i => i.is_primary);
                        const subItems = bundle.items?.filter(i => !i.is_primary) || [];
                        const itemsToAdd = [];
                        
                        if (primaryItem) {
                          itemsToAdd.push({
                            type: 'bundle_primary',
                            bundle_id: bundle.id,
                            name: primaryItem.name,
                            description: primaryItem.description,
                            quantity: primaryItem.quantity || 1,
                            unit_cost: primaryItem.unit_price || 0,
                            unit_price: calculateMarkup(primaryItem.unit_price || 0)
                          });
                        }
                        
                        subItems.forEach(item => {
                          itemsToAdd.push({
                            type: 'bundle_item',
                            bundle_id: bundle.id,
                            name: item.name,
                            description: item.description,
                            quantity: item.quantity || 1,
                            unit_cost: item.unit_price || 0,
                            unit_price: calculateMarkup(item.unit_price || 0)
                          });
                        });
                        
                        setFormData(prev => ({
                          ...prev,
                          areas: prev.areas.map((a, i) => 
                            i === areaIndex 
                              ? { ...a, items: [...(a.items || []), ...itemsToAdd] }
                              : a
                          )
                        }));
                      }}
                      inventory={inventory}
                      bundles={bundles}
                      markupType={markupType}
                      markupValue={markupValue}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm mb-1">No items added yet</p>
                  <p className="text-xs text-slate-400">Create a section to start adding line items</p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <Button onClick={addArea} variant="outline" className="flex-1 border-dashed h-10">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
                <Button 
                  onClick={() => setShowAISearchModal(true)} 
                  variant="outline" 
                  className="border-purple-300 text-purple-600 hover:bg-purple-50 h-10"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Quick Add
                </Button>
                <Button 
                  onClick={() => setShowAIGeneratorModal(true)} 
                  variant="outline" 
                  className="border-purple-300 text-purple-600 hover:bg-purple-50 h-10"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  AI Generate
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className={cn("lg:col-span-4", showActivityPanel && "lg:col-span-3")}>
            <ProposalSummary
              formData={formData}
              setFormData={setFormData}
              totals={totals}
              projects={projects}
              markupType={markupType}
              setMarkupType={setMarkupType}
              markupValue={markupValue}
              setMarkupValue={setMarkupValue}
            />
          </div>

          {/* Activity Panel - Slide out */}
          {showActivityPanel && proposalId && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-4 space-y-4"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Activity</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowActivityPanel(false)}>
                    ✕
                  </Button>
                </div>
                <ProposalActivityFeed proposalId={proposalId} />
                {proposal?.approval_token && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Customer Approval Link:</p>
                    <div className="flex gap-2">
                      <Input 
                        value={`https://proposal-pro-545d1a0b.base44.app/Approve?token=${proposal.approval_token}`}
                        readOnly
                        className="text-xs h-8"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-8"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://proposal-pro-545d1a0b.base44.app/Approve?token=${proposal.approval_token}`);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }}
                      >
                        {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Customer Modal */}
      <Dialog open={showCustomerModal} onOpenChange={(open) => { setShowCustomerModal(open); if (!open) { setShowNewCustomerForm(false); setNewCustomer({ first_name: '', last_name: '', email: '', phone: '', company: '', address: '' }); setCustomerSearch(''); } }}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
          {showNewCustomerForm ? (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                <DialogTitle className="text-lg font-semibold">New Client</DialogTitle>
              </DialogHeader>
              <div className="px-6 py-5">
                <div className="flex justify-center mb-5">
                  <RadioGroup value={customerType} onValueChange={setCustomerType} className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="person" id="person" className="text-[#0069AF] border-slate-300" />
                      <Label htmlFor="person" className="cursor-pointer">Person</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="company" id="company" className="text-[#0069AF] border-slate-300" />
                      <Label htmlFor="company" className="cursor-pointer">Company</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-4">
                  {customerType === 'person' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-slate-500 mb-1.5 block">First Name</Label>
                        <Input value={newCustomer.first_name} onChange={(e) => setNewCustomer(prev => ({ ...prev, first_name: e.target.value }))} className="h-10" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 mb-1.5 block">Last Name</Label>
                        <Input value={newCustomer.last_name} onChange={(e) => setNewCustomer(prev => ({ ...prev, last_name: e.target.value }))} className="h-10" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs text-slate-500 mb-1.5 block">Company Name</Label>
                      <Input value={newCustomer.company} onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))} className="h-10" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1.5 block">Email</Label>
                      <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))} className="h-10" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1.5 block">Phone</Label>
                      <Input value={newCustomer.phone} onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))} className="h-10" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-500 mb-1.5 block">Address (Optional)</Label>
                    <Input value={newCustomer.address} onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))} className="h-10" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                <Button variant="outline" onClick={() => setShowNewCustomerForm(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleCreateCustomer} className="flex-1 bg-[#0069AF] hover:bg-[#005a94]">Create Client</Button>
              </div>
            </>
          ) : (
            <>
              <div className="px-6 pt-6 pb-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input 
                    placeholder="Search clients by name, email, or company..." 
                    className="pl-12 h-12 text-base bg-slate-50 border-slate-200 focus:bg-white" 
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="px-6 pb-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewCustomerForm(true)} 
                  className="w-full h-12 border-dashed border-2 hover:border-[#0069AF] hover:bg-[#0069AF]/5 text-slate-600 hover:text-[#0069AF]"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Client
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto px-3 pb-4">
                {filteredCustomers.length > 0 ? (
                  <div className="space-y-1">
                    {filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-100 text-left transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0069AF] to-[#133F5C] flex items-center justify-center text-white font-semibold text-base flex-shrink-0">
                          {(customer.company || customer.name)?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {customer.company || customer.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            {customer.company && customer.name && (
                              <span className="truncate">{customer.name}</span>
                            )}
                            {customer.email && (
                              <>
                                {customer.company && customer.name && <span>·</span>}
                                <span className="truncate">{customer.email}</span>
                              </>
                            )}
                          </div>
                          {customer.phone && (
                            <p className="text-xs text-slate-400 mt-0.5">{customer.phone}</p>
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-[#0069AF] flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : customerSearch ? (
                  <div className="text-center py-12">
                    <Search className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No clients found for "{customerSearch}"</p>
                    <p className="text-sm text-slate-400 mt-1">Try a different search or create a new client</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No clients yet</p>
                    <p className="text-sm text-slate-400 mt-1">Create your first client to get started</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Item Modal */}
      <CustomItemModal
        open={showCustomItemModal}
        onClose={() => setShowCustomItemModal(false)}
        onAdd={(item) => {
          if (editingAreaIndex !== null) {
            addItemToArea(editingAreaIndex, item);
          }
        }}
        markupType={markupType}
        markupValue={markupValue}
      />

      {/* AI Search Modal */}
      <AIProposalSearchModal
        open={showAISearchModal}
        onClose={() => setShowAISearchModal(false)}
        onAddItem={(item) => {
          // Add to first area or create new one
          if (formData.areas.length === 0) {
            setFormData(prev => ({
              ...prev,
              areas: [{ name: 'Items', items: [item], is_optional: false }]
            }));
            setExpandedAreas({ 0: true });
          } else {
            addItemToArea(0, item);
          }
        }}
        markupType={markupType}
        markupValue={markupValue}
      />

      {/* AI Proposal Generator */}
      <AIProposalGenerator
        open={showAIGeneratorModal}
        onClose={() => setShowAIGeneratorModal(false)}
        customer={formData.customer_name ? { name: formData.customer_name, email: formData.customer_email, company: formData.customer_company } : null}
        project={projects.find(p => p.id === formData.project_id)}
        inventory={inventory}
        onGenerated={(generatedProposal) => {
          // Apply the generated proposal
          setFormData(prev => ({
            ...prev,
            title: generatedProposal.title || prev.title,
            areas: generatedProposal.areas?.map(area => ({
              name: area.name,
              description: area.description,
              is_optional: false,
              items: area.items?.map(item => ({
                type: 'custom',
                name: item.name,
                description: item.description,
                quantity: item.quantity || 1,
                unit_cost: item.unit_price || 0,
                unit_price: calculateMarkup(item.unit_price || 0),
              })) || []
            })) || prev.areas,
            terms_conditions: generatedProposal.terms || prev.terms_conditions
          }));
          // Expand all areas
          const expanded = {};
          generatedProposal.areas?.forEach((_, idx) => { expanded[idx] = true; });
          setExpandedAreas(expanded);
        }}
      />
    </div>
  );

  function calculateMarkup(cost) {
    if (markupType === 'percentage') return cost * (1 + markupValue / 100);
    if (markupType === 'fixed') return cost + markupValue;
    return cost;
  }
}

function AIProposalSearchModal({ open, onClose, onAddItem, markupType, markupValue }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const calculateMarkup = (cost) => {
    if (markupType === 'percentage') return cost * (1 + markupValue / 100);
    if (markupType === 'fixed') return cost + markupValue;
    return cost;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find real product information for: "${searchQuery}"

Search online and return 3-5 REAL products with:
- name: Actual product name
- description: Brief description
- category: Category
- estimated_cost: Real market price in USD
- image_search: Exact product model/name for finding real images

Be specific with actual product names and real pricing.`,
      response_json_schema: {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                estimated_cost: { type: "number" },
                image_search: { type: "string" }
              }
            }
          }
        }
      },
      add_context_from_internet: true
    });

    // Search for real product images online
    const productsWithImages = (result.products || []).map(product => ({
      ...product,
      image_url: `https://source.unsplash.com/400x400/?${encodeURIComponent(product.image_search)}`
    }));

    setSuggestions(productsWithImages);
    setSearching(false);
  };

  const handleSelectProduct = (product) => {
    const unitPrice = calculateMarkup(product.estimated_cost || 0);
    onAddItem({
      type: 'custom',
      name: product.name,
      description: product.description,
      quantity: 1,
      unit_cost: product.estimated_cost || 0,
      unit_price: unitPrice,
      image_url: product.image_url || ''
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Quick Add to Proposal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-500">
            Describe what you need and AI will suggest items with pricing and images.
          </p>
          
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., security camera system, network installation, cabling..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              onClick={handleSearch} 
              disabled={searching || !searchQuery.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-2" />Search</>}
            </Button>
          </div>

          {searching && (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-3" />
              <p className="text-sm text-slate-500">Searching and generating suggestions...</p>
              <p className="text-xs text-slate-400 mt-1">This may take 10-20 seconds</p>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-slate-900">Suggestions</h3>
              {suggestions.map((product, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 border rounded-xl hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer transition-all"
                  onClick={() => handleSelectProduct(product)}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-20 h-20 rounded-lg object-contain bg-white border p-1" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Package className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900">{product.name}</h4>
                    <p className="text-sm text-slate-500 mt-1">{product.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-xs">{product.category}</Badge>
                      <span className="text-xs text-slate-400">Cost: ${product.estimated_cost}</span>
                      <span className="text-sm font-medium text-emerald-600">Price: ${calculateMarkup(product.estimated_cost || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
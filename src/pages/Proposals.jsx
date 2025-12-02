import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Plus, Search, Filter, MoreHorizontal, Send, Eye, 
  CheckCircle2, XCircle, Clock, Edit2, Trash2, Copy, Download,
  Users, DollarSign, TrendingUp, Calendar, ExternalLink, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { format, isPast, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProposalModal from '@/components/proposals/ProposalModal';
import ProposalStats from '@/components/proposals/ProposalStats';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Edit2 },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Eye },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: Clock }
};

export default function Proposals() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, proposal: null });
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: proposals = [], refetch } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date')
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list()
  });

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.proposal_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSave = async (data) => {
    if (editingProposal) {
      await base44.entities.Proposal.update(editingProposal.id, data);
    } else {
      const proposalNumber = `PROP-${Date.now().toString(36).toUpperCase()}`;
      const approvalToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await base44.entities.Proposal.create({
        ...data,
        proposal_number: proposalNumber,
        approval_token: approvalToken,
        created_by_email: currentUser?.email,
        created_by_name: currentUser?.full_name
      });
    }
    refetch();
    setShowModal(false);
    setEditingProposal(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm.proposal) {
      await base44.entities.Proposal.delete(deleteConfirm.proposal.id);
      refetch();
    }
    setDeleteConfirm({ open: false, proposal: null });
  };

  const handleDuplicate = async (proposal) => {
    const { id, created_date, updated_date, proposal_number, approval_token, status, ...rest } = proposal;
    await base44.entities.Proposal.create({
      ...rest,
      title: `${rest.title} (Copy)`,
      proposal_number: `PROP-${Date.now().toString(36).toUpperCase()}`,
      approval_token: Math.random().toString(36).substring(2) + Date.now().toString(36),
      status: 'draft',
      signature_data: null,
      signer_name: null,
      signed_date: null
    });
    refetch();
  };

  const handleSendProposal = async (proposal) => {
    await base44.entities.Proposal.update(proposal.id, { 
      status: 'sent', 
      sent_date: new Date().toISOString() 
    });
    
    const approvalLink = `${window.location.origin}/ProposalApproval?token=${proposal.approval_token}`;
    
    await base44.integrations.Core.SendEmail({
      to: proposal.customer_email,
      subject: `Proposal: ${proposal.title}`,
      body: `
        <h2>You have received a proposal</h2>
        <p>Dear ${proposal.customer_name},</p>
        <p>Please review and approve the following proposal:</p>
        <p><strong>${proposal.title}</strong></p>
        <p>Total: $${proposal.total?.toLocaleString()}</p>
        <p><a href="${approvalLink}" style="background: #0069AF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Review & Sign Proposal</a></p>
        <p>This proposal is valid until ${proposal.valid_until ? format(new Date(proposal.valid_until), 'MMMM d, yyyy') : 'further notice'}.</p>
      `
    });
    
    refetch();
  };

  const copyApprovalLink = (proposal) => {
    const link = `${window.location.origin}/ProposalApproval?token=${proposal.approval_token}`;
    navigator.clipboard.writeText(link);
  };

  const handleStatusChange = async (proposal, newStatus) => {
    await base44.entities.Proposal.update(proposal.id, { status: newStatus });
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Proposals</h1>
            <p className="text-slate-500 mt-1">Create and manage customer proposals</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('QuoteRequests')}>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Quote Requests
              </Button>
            </Link>
            <Link to={createPageUrl('Customers')}>
              <Button variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Customers
              </Button>
            </Link>
            <Link to={createPageUrl('ProposalReports')}>
              <Button variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                Reports
              </Button>
            </Link>
            <Link to={createPageUrl('ProposalEditor')}>
              <Button className="bg-[#0069AF] hover:bg-[#133F5C]">
                <Plus className="w-4 h-4 mr-2" />
                New Proposal
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <ProposalStats proposals={proposals} />

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-100 p-4 mb-6"
        >
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search proposals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Proposals List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredProposals.length > 0 ? (
              filteredProposals.map((proposal, idx) => {
                const status = statusConfig[proposal.status] || statusConfig.draft;
                const StatusIcon = status.icon;
                const isExpired = proposal.valid_until && isPast(new Date(proposal.valid_until)) && proposal.status !== 'approved';
                const daysLeft = proposal.valid_until ? differenceInDays(new Date(proposal.valid_until), new Date()) : null;

                return (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => window.location.href = createPageUrl('ProposalEditor') + `?id=${proposal.id}`}
                    className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-lg hover:border-slate-200 transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={cn("p-2.5 rounded-xl", status.color.split(' ')[0])}>
                          <StatusIcon className={cn("w-5 h-5", status.color.split(' ')[1])} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-slate-400">{proposal.proposal_number}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <button className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", status.color)}>
                                  {status.label}
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                {Object.entries(statusConfig).map(([key, config]) => (
                                  <DropdownMenuItem key={key} onClick={() => handleStatusChange(proposal, key)}>
                                    <config.icon className={cn("w-4 h-4 mr-2", config.color.split(' ')[1])} />
                                    {config.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {isExpired && proposal.status !== 'approved' && (
                              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Expired</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900 mb-1">{proposal.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              {proposal.customer_name}
                              {proposal.customer_company && <span className="text-slate-400">({proposal.customer_company})</span>}
                            </span>
                            {proposal.valid_until && (
                              <span className={cn("flex items-center gap-1.5", daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && "text-amber-600")}>
                                <Calendar className="w-4 h-4" />
                                Valid until {format(new Date(proposal.valid_until), 'MMM d, yyyy')}
                                {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && ` (${daysLeft} days left)`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900">${proposal.total?.toLocaleString() || '0'}</p>
                          <p className="text-xs text-slate-500">{proposal.items?.length || 0} items</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl('ProposalEditor') + `?id=${proposal.id}`}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(proposal)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {proposal.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleSendProposal(proposal)}>
                                <Send className="w-4 h-4 mr-2" />
                                Send to Customer
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => copyApprovalLink(proposal)}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Copy Approval Link
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl('ProposalView') + `?id=${proposal.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View / Download PDF
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteConfirm({ open: true, proposal })} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
              >
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No proposals yet</h3>
                <p className="text-slate-500 mb-6">Create your first proposal to get started</p>
                <Link to={createPageUrl('ProposalEditor')}>
                  <Button className="bg-[#0069AF] hover:bg-[#133F5C]">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Proposal
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ProposalModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingProposal(null); }}
        proposal={editingProposal}
        customers={customers}
        inventory={inventory}
        onSave={handleSave}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, proposal: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete proposal?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Package, 
  Plus, 
  Search,
  Edit2,
  Trash2,
  User,
  Calendar,
  Upload,
  Loader2,
  UserPlus,
  CheckSquare,
  Square,
  X,
  FileCheck,
  PackageCheck,
  Wrench,
  Check,
  Truck,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
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
import { format, isToday, isPast } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import PartModal from '@/components/modals/PartModal';
import PartDetailModal from '@/components/modals/PartDetailModal';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';
import PartsUploader from '@/components/parts/PartsUploader';

const statusConfig = {
  needed: { label: 'Needed', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  received: { label: 'Received', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  ready_to_install: { label: 'Ready to Install', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  installed: { label: 'Installed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
};

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const getColorForEmail = (email) => {
  if (!email) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function ProjectParts() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPartModal, setShowPartModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, part: null });
  const [uploading, setUploading] = useState(false);
  const [selectedPartDetail, setSelectedPartDetail] = useState(null);
  
  // Multi-select state
  const [selectedParts, setSelectedParts] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Receive dialog state
  const [receiveDialog, setReceiveDialog] = useState({ open: false, part: null, installer: '', location: '', createTask: false });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: parts = [], refetch: refetchParts } = useQuery({
    queryKey: ['parts', projectId],
    queryFn: () => base44.entities.Part.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  // Check for approved proposals linked to this project
  const { data: approvedProposals = [] } = useQuery({
    queryKey: ['approvedProposals', projectId],
    queryFn: async () => {
      const proposals = await base44.entities.Proposal.filter({ project_id: projectId, status: 'approved' });
      return proposals;
    },
    enabled: !!projectId
  });

  const hasApprovedProposal = approvedProposals.length > 0;

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.part_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || part.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSavePart = async (data) => {
    if (editingPart) {
      await base44.entities.Part.update(editingPart.id, data);
    } else {
      await base44.entities.Part.create(data);
    }
    refetchParts();
    setShowPartModal(false);
    setEditingPart(null);
  };

  const handleStatusChange = async (part, status) => {
    await base44.entities.Part.update(part.id, { ...part, status });
    refetchParts();
  };

  const handleDelete = async () => {
    if (deleteConfirm.part) {
      await base44.entities.Part.delete(deleteConfirm.part.id);
      refetchParts();
    }
    setDeleteConfirm({ open: false, part: null });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            parts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  part_number: { type: "string" },
                  quantity: { type: "number" },
                  unit_cost: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.parts) {
        for (const part of result.output.parts) {
          await base44.entities.Part.create({
            ...part,
            project_id: projectId,
            status: 'needed'
          });
        }
        refetchParts();
      }
    } catch (err) {
      console.error('Failed to extract parts:', err);
    }
    setUploading(false);
  };

  const totalCost = parts.reduce((sum, p) => sum + ((p.unit_cost || 0) * (p.quantity || 1)), 0);
  const unassignedParts = parts.filter(p => !p.assigned_to);

  // Multi-select handlers
  const togglePartSelection = (partId) => {
    const newSelected = new Set(selectedParts);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedParts(newSelected);
    if (newSelected.size === 0) setSelectionMode(false);
  };

  const selectAllParts = () => {
    if (selectedParts.size === filteredParts.length) {
      setSelectedParts(new Set());
      setSelectionMode(false);
    } else {
      setSelectedParts(new Set(filteredParts.map(p => p.id)));
    }
  };

  const selectAllUnassigned = () => {
    setSelectedParts(new Set(unassignedParts.map(p => p.id)));
    setSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedParts(new Set());
    setSelectionMode(false);
  };

  const handleBulkAssign = async (email) => {
    const member = teamMembers.find(m => m.email === email);
    for (const partId of selectedParts) {
      await base44.entities.Part.update(partId, {
        assigned_to: email,
        assigned_name: member?.name || email
      });
    }
    refetchParts();
    clearSelection();
  };

  const handleBulkStatusChange = async (status) => {
    for (const partId of selectedParts) {
      await base44.entities.Part.update(partId, { status });
    }
    refetchParts();
    clearSelection();
  };

  const handleBulkDelete = async () => {
    for (const partId of selectedParts) {
      await base44.entities.Part.delete(partId);
    }
    refetchParts();
    clearSelection();
  };

  const handleQuickAssign = async (part, email) => {
    const member = teamMembers.find(m => m.email === email);
    await base44.entities.Part.update(part.id, {
      assigned_to: email,
      assigned_name: member?.name || email
    });
    refetchParts();
  };

  const handleSetDeliveryDate = async (part, date) => {
    await base44.entities.Part.update(part.id, { est_delivery_date: format(date, 'yyyy-MM-dd') });
    refetchParts();
  };

  const openReceiveDialog = (part, installerEmail) => {
    setReceiveDialog({ open: true, part, installer: installerEmail, location: '' });
  };

  const handleConfirmReceive = async () => {
    const { part, installer, location } = receiveDialog;
    if (!part || !installer) return;
    
    const member = teamMembers.find(m => m.email === installer);
    await base44.entities.Part.update(part.id, {
      status: 'ready_to_install',
      installer_email: installer,
      installer_name: member?.name || installer,
      received_date: format(new Date(), 'yyyy-MM-dd'),
      notes: location ? `${part.notes || ''}\n📍 Location: ${location}`.trim() : part.notes
    });
    refetchParts();
    setReceiveDialog({ open: false, part: null, installer: '', location: '' });
  };

  const handleMarkInstalled = async (part) => {
    await base44.entities.Part.update(part.id, {
      status: 'installed',
      installed_date: format(new Date(), 'yyyy-MM-dd')
    });
    refetchParts();
  };

  // Group parts by status for sections
  const readyToInstallParts = parts.filter(p => p.status === 'ready_to_install');
  const otherParts = filteredParts.filter(p => p.status !== 'ready_to_install');

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      <ProjectNavHeader project={project} currentPage="ProjectParts" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Approved Proposal Banner */}
        {hasApprovedProposal && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-4 mb-6 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3">
              <FileCheck className="w-6 h-6" />
              <div>
                <p className="font-semibold">Proposal Approved!</p>
                <p className="text-sm text-emerald-100">Assign team members to parts to get started</p>
              </div>
            </div>
            {unassignedParts.length > 0 && (
              <Button 
                onClick={selectAllUnassigned} 
                variant="secondary" 
                className="bg-white text-emerald-700 hover:bg-emerald-50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Assign {unassignedParts.length} Unassigned
              </Button>
            )}
          </motion.div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500 shadow-lg shadow-amber-200">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Parts & Materials</h1>
              <p className="text-slate-500">
                {parts.length} items · Total: ${totalCost.toLocaleString()}
                {unassignedParts.length > 0 && (
                  <span className="text-amber-600 ml-2">· {unassignedParts.length} unassigned</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <div className="text-right">
              <PartsUploader 
                projectId={projectId} 
                onPartsExtracted={refetchParts} 
                compact={true}
              />
            </div>
            <Button onClick={() => { setEditingPart(null); setShowPartModal(true); }} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Part
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectionMode && selectedParts.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-600 text-white rounded-xl p-3 mb-4 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3">
              <button onClick={clearSelection} className="p-1 hover:bg-amber-500 rounded">
                <X className="w-4 h-4" />
              </button>
              <span className="font-medium">{selectedParts.size} selected</span>
              <button onClick={selectAllParts} className="text-sm underline hover:no-underline">
                {selectedParts.size === filteredParts.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Assign */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-8 text-xs">
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Assign
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {teamMembers.map((member) => (
                    <DropdownMenuItem key={member.id} onClick={() => handleBulkAssign(member.email)}>
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>
                        {getInitials(member.name)}
                      </div>
                      {member.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-8 text-xs">
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => handleBulkStatusChange(key)}>
                      <Badge className={cn("mr-2", config.color)}>{config.label}</Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Delete */}
              <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={handleBulkDelete}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['all', ...Object.keys(statusConfig)].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    statusFilter === status 
                      ? "bg-amber-100 text-amber-700" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {status === 'all' ? 'All' : statusConfig[status].label}
                </button>
              ))}
            </div>
            <Button 
              variant={selectionMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) clearSelection(); }}
              className={cn("h-9", selectionMode && "bg-amber-600")}
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              {selectionMode ? 'Done' : 'Select'}
            </Button>
          </div>
        </div>

        {/* Ready to Install Section */}
        {readyToInstallParts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Wrench className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Ready to Install ({readyToInstallParts.length})</h2>
            </div>
            <div className="space-y-2">
              {readyToInstallParts.map((part) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-purple-50 rounded-xl border border-purple-200 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <Package className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="font-medium text-slate-900">{part.name}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        {part.part_number && <span>#{part.part_number}</span>}
                        {part.quantity > 1 && <span>Qty: {part.quantity}</span>}
                        {part.installer_name && (
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            Installer: {part.installer_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleMarkInstalled(part)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark Installed
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Parts List */}
        <div className="space-y-3">
          <AnimatePresence>
            {otherParts.length > 0 ? (
              filteredParts.map((part, idx) => {
                const isSelected = selectedParts.has(part.id);
                const estDeliveryDateValid = part.est_delivery_date && !isNaN(new Date(part.est_delivery_date).getTime());
                const isDeliveryDue = estDeliveryDateValid && (isToday(new Date(part.est_delivery_date)) || isPast(new Date(part.est_delivery_date)));
                return (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => selectionMode ? togglePartSelection(part.id) : setSelectedPartDetail(part)}
                  className={cn(
                    "bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-all group cursor-pointer",
                    isSelected && "ring-2 ring-amber-500 bg-amber-50/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Selection checkbox */}
                    {selectionMode && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); togglePartSelection(part.id); }}
                        className="p-1 mt-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>
                    )}
                    <div className="p-2 rounded-lg bg-amber-100">
                      <Package className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-slate-900">{part.name}</h4>
                        {part.part_number && (
                          <p className="text-sm text-slate-500">#{part.part_number}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Badge variant="outline" className={cn("cursor-pointer hover:opacity-80", statusConfig[part.status]?.color)}>
                              {statusConfig[part.status]?.label || part.status}
                            </Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <DropdownMenuItem key={key} onClick={(e) => { e.stopPropagation(); handleStatusChange(part, key); }}>
                                <Badge className={cn("mr-2", config.color)}>{config.label}</Badge>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        {part.quantity > 1 && (
                          <Badge variant="outline">Qty: {part.quantity}</Badge>
                        )}
                        {part.unit_cost > 0 && (
                          <span className="text-sm text-slate-600">${(part.unit_cost * (part.quantity || 1)).toLocaleString()}</span>
                        )}
                        {part.supplier && (
                          <span className="text-sm text-slate-500">{part.supplier}</span>
                        )}
                        {part.assigned_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(part.assigned_to))}>
                              {getInitials(part.assigned_name)}
                            </div>
                            <span className="text-sm text-slate-600">{part.assigned_name}</span>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-xs font-medium text-amber-700">Unassigned</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                              {teamMembers.map((member) => (
                                <DropdownMenuItem key={member.id} onClick={() => handleQuickAssign(part, member.email)}>
                                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>
                                    {getInitials(member.name)}
                                  </div>
                                  {member.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {estDeliveryDateValid && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "flex items-center gap-1",
                              isDeliveryDue ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                            )}
                          >
                            <Truck className="w-3 h-3" />
                            ETA: {format(new Date(part.est_delivery_date), 'MMM d')}
                            {isDeliveryDue && " ⚠️"}
                          </Badge>
                        )}
                        {part.due_date && !isNaN(new Date(part.due_date).getTime()) && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{format(new Date(part.due_date), 'MMM d')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 items-center">
                      {/* Quick set ETA button */}
                      {!part.est_delivery_date && (part.status === 'ordered' || part.status === 'needed') && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Truck className="w-3.5 h-3.5 mr-1" />
                              Set ETA
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
                            <CalendarPicker
                              mode="single"
                              selected={undefined}
                              onSelect={(date) => date && handleSetDeliveryDate(part, date)}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                      
                      {/* Receive Button - shows for ordered parts */}
                      {part.status === 'ordered' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className={cn(
                                "h-8",
                                isDeliveryDue 
                                  ? "border-orange-400 text-orange-700 bg-orange-50 hover:bg-orange-100 animate-pulse" 
                                  : "border-amber-300 text-amber-700 hover:bg-amber-50"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <PackageCheck className="w-4 h-4 mr-1.5" />
                              {isDeliveryDue ? "Check Delivery" : "Receive"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            <div className="px-2 py-1.5 text-xs text-slate-500 font-medium">Assign installer:</div>
                            {teamMembers.map((member) => (
                              <DropdownMenuItem key={member.id} onClick={() => openReceiveDialog(part, member.email)}>
                                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>
                                  {getInitials(member.name)}
                                </div>
                                {member.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Quick mark as received for non-ordered */}
                      {part.status === 'received' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 border-purple-300 text-purple-700 hover:bg-purple-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Wrench className="w-4 h-4 mr-1.5" />
                              Assign Install
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            <div className="px-2 py-1.5 text-xs text-slate-500 font-medium">Assign installer:</div>
                            {teamMembers.map((member) => (
                              <DropdownMenuItem key={member.id} onClick={() => openReceiveDialog(part, member.email)}>
                                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>
                                  {getInitials(member.name)}
                                </div>
                                {member.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingPart(part); setShowPartModal(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, part }); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );})
            ) : filteredParts.length === 0 && readyToInstallParts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
              >
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No parts found</h3>
                <p className="text-slate-500 mb-6">Add parts to track materials for this project</p>
                <Button onClick={() => setShowPartModal(true)} className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Part
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <PartModal
        open={showPartModal}
        onClose={() => { setShowPartModal(false); setEditingPart(null); }}
        part={editingPart}
        projectId={projectId}
        teamMembers={teamMembers}
        onSave={handleSavePart}
      />

      <PartDetailModal
        open={!!selectedPartDetail}
        onClose={() => setSelectedPartDetail(null)}
        part={selectedPartDetail}
        teamMembers={teamMembers}
        currentUser={currentUser}
        onEdit={(part) => { setSelectedPartDetail(null); setEditingPart(part); setShowPartModal(true); }}
        onStatusChange={(part, status) => { handleStatusChange(part, status); setSelectedPartDetail({ ...part, status }); }}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, part: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete part?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receive Part Dialog with Location */}
      <AlertDialog open={receiveDialog.open} onOpenChange={(open) => !open && setReceiveDialog({ open: false, part: null, installer: '', location: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-amber-600" />
              Receive Part
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-slate-900">{receiveDialog.part?.name}</span>
              {receiveDialog.part?.part_number && <span className="text-slate-500"> (#{receiveDialog.part?.part_number})</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4" />
              Where is the item stored? (optional)
            </label>
            <Textarea
              value={receiveDialog.location}
              onChange={(e) => setReceiveDialog(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Warehouse shelf B3, Office storage closet, Customer site..."
              className="h-20"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReceive} className="bg-amber-600 hover:bg-amber-700">
              <PackageCheck className="w-4 h-4 mr-2" />
              Confirm Received
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
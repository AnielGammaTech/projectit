import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
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
  MapPin,
  ShoppingCart,
  ImagePlus,
  Eye,
  ClipboardCheck,
  ChevronDown
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
import { parseLocalDate } from '@/utils/dateUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import PartModal from '@/components/modals/PartModal';
import PartDetailModal from '@/components/modals/PartDetailModal';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';
import PartsUploader from '@/components/parts/PartsUploader';

const statusConfig = {
  needed: { label: 'Needed', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600', borderColor: 'border-l-orange-400', dot: 'bg-orange-400' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700', borderColor: 'border-l-sky-400', dot: 'bg-sky-400' },
  received: { label: 'Received', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700', borderColor: 'border-l-amber-400', dot: 'bg-amber-400' },
  ready_to_install: { label: 'Ready to Install', color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700', borderColor: 'border-l-teal-400', dot: 'bg-teal-400' },
  installed: { label: 'Installed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700', borderColor: 'border-l-emerald-400', dot: 'bg-emerald-400' }
};

import { getColorForEmail, getInitials } from '@/constants/colors';

export default function ProjectParts() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const autoOpenPartId = urlParams.get('part');
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
  const [collapsedStatuses, setCollapsedStatuses] = useState(new Set());
  
  // Receive dialog state
  const [receiveDialog, setReceiveDialog] = useState({ open: false, part: null, installer: '', location: '', createTask: false });

  // Order dialog state
  const [orderDialog, setOrderDialog] = useState({ open: false, part: null, screenshot: null, eta: null, notes: '' });
  const [orderScreenshotPreview, setOrderScreenshotPreview] = useState(null);

  // Order proof viewer
  const [viewingProof, setViewingProof] = useState(null);

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await api.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: parts = [], refetch: refetchParts } = useQuery({
    queryKey: ['parts', projectId],
    queryFn: () => api.entities.Part.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  // Auto-open part detail if ?part= param is in URL (once only)
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenPartId && parts.length > 0 && !autoOpenedRef.current) {
      const part = parts.find(p => p.id === autoOpenPartId);
      if (part) {
        setSelectedPartDetail(part);
        autoOpenedRef.current = true;
        // Clean the URL param so it doesn't block closing
        const url = new URL(window.location);
        url.searchParams.delete('part');
        window.history.replaceState({}, '', url);
      }
    }
  }, [autoOpenPartId, parts]);

  // Filter to only project members for assignment dropdowns
  const projectMembers = useMemo(() => {
    if (!project?.team_members?.length) return [];
    return teamMembers.filter(tm => project.team_members.includes(tm.email));
  }, [teamMembers, project]);

  // Check for approved proposals linked to this project
  const { data: approvedProposals = [] } = useQuery({
    queryKey: ['approvedProposals', projectId],
    queryFn: async () => {
      const proposals = await api.entities.Proposal.filter({ project_id: projectId, status: 'approved' });
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
      await api.entities.Part.update(editingPart.id, data);
    } else {
      await api.entities.Part.create(data);
    }
    refetchParts();
    setShowPartModal(false);
    setEditingPart(null);
  };

  const handleStatusChange = async (part, status) => {
    await api.entities.Part.update(part.id, { ...part, status });
    refetchParts();
  };

  const handleDelete = async () => {
    if (deleteConfirm.part) {
      await api.entities.Part.delete(deleteConfirm.part.id);
      refetchParts();
    }
    setDeleteConfirm({ open: false, part: null });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      
      const result = await api.integrations.Core.ExtractDataFromUploadedFile({
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
          await api.entities.Part.create({
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
      await api.entities.Part.update(partId, {
        assigned_to: email,
        assigned_name: member?.name || email
      });
    }
    refetchParts();
    clearSelection();
  };

  const handleBulkStatusChange = async (status) => {
    for (const partId of selectedParts) {
      await api.entities.Part.update(partId, { status });
    }
    refetchParts();
    clearSelection();
  };

  const handleBulkDelete = async () => {
    for (const partId of selectedParts) {
      await api.entities.Part.delete(partId);
    }
    refetchParts();
    clearSelection();
  };

  const handleQuickAssign = async (part, email) => {
    const member = teamMembers.find(m => m.email === email);
    await api.entities.Part.update(part.id, {
      assigned_to: email,
      assigned_name: member?.name || email
    });
    refetchParts();
  };

  const handleSetDeliveryDate = async (part, date) => {
    await api.entities.Part.update(part.id, { est_delivery_date: format(date, 'yyyy-MM-dd') });
    refetchParts();
  };

  const openReceiveDialog = (part, installerEmail) => {
    setReceiveDialog({ open: true, part, installer: installerEmail, location: '' });
  };

  const handleConfirmReceive = async () => {
    const { part, installer, location, createTask } = receiveDialog;
    if (!part || !installer) return;
    
    const member = teamMembers.find(m => m.email === installer);
    await api.entities.Part.update(part.id, {
      status: 'ready_to_install',
      installer_email: installer,
      installer_name: member?.name || installer,
      received_date: format(new Date(), 'yyyy-MM-dd'),
      notes: location ? `${part.notes || ''}\n📍 Location: ${location}`.trim() : part.notes
    });
    
    // Create installation task if checkbox is checked
    if (createTask) {
      await api.entities.Task.create({
        title: `Install: ${part.name}`,
        description: `Install part${part.part_number ? ` #${part.part_number}` : ''}${location ? `\n📍 Location: ${location}` : ''}`,
        project_id: projectId,
        assigned_to: installer,
        assigned_name: member?.name || installer,
        status: 'todo',
        priority: 'medium'
      });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
    
    refetchParts();
    setReceiveDialog({ open: false, part: null, installer: '', location: '', createTask: false });
  };

  const handleMarkInstalled = async (part) => {
    await api.entities.Part.update(part.id, {
      status: 'installed',
      installed_date: format(new Date(), 'yyyy-MM-dd')
    });
    refetchParts();
  };

  const openOrderDialog = (part) => {
    setOrderDialog({ open: true, part, screenshot: null, eta: null, notes: '' });
    setOrderScreenshotPreview(null);
  };

  const handleOrderScreenshot = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setOrderDialog(prev => ({ ...prev, screenshot: ev.target.result }));
      setOrderScreenshotPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleOrderPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => {
          setOrderDialog(prev => ({ ...prev, screenshot: ev.target.result }));
          setOrderScreenshotPreview(ev.target.result);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleConfirmOrder = async () => {
    const { part, screenshot, eta, notes } = orderDialog;
    if (!part) return;

    const updateData = {
      status: 'ordered',
      order_proof: screenshot || null,
      order_date: format(new Date(), 'yyyy-MM-dd'),
    };
    if (eta) {
      updateData.est_delivery_date = format(eta, 'yyyy-MM-dd');
    }
    if (notes) {
      updateData.notes = part.notes ? `${part.notes}\n📦 Order notes: ${notes}` : `📦 Order notes: ${notes}`;
    }

    await api.entities.Part.update(part.id, updateData);
    refetchParts();
    setOrderDialog({ open: false, part: null, screenshot: null, eta: null, notes: '' });
    setOrderScreenshotPreview(null);
  };

  // Group parts by status for sections
  const readyToInstallParts = parts.filter(p => p.status === 'ready_to_install');
  const otherParts = filteredParts.filter(p => p.status !== 'ready_to_install');

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProjectNavHeader project={project} currentPage="ProjectParts" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

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
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Parts & Materials</h2>
              <span className="text-xs text-muted-foreground">
                {parts.length} items · Total: ${totalCost.toLocaleString()}
                {unassignedParts.length > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 ml-1">· {unassignedParts.length} unassigned</span>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <PartsUploader
                projectId={projectId}
                onPartsExtracted={refetchParts}
                compact={true}
              />
            </div>
            <Button onClick={() => { setEditingPart(null); setShowPartModal(true); }} className="bg-[#0F2F44] hover:bg-[#1a4a6e]" size="sm">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Part</span>
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
                  {projectMembers.map((member) => (
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
        <div className="bg-card rounded-2xl border border-slate-100 dark:border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto flex-nowrap pb-1 -mb-1 scrollbar-hide">
              {['all', ...Object.keys(statusConfig)].map(status => {
                const shortLabels = { ready_to_install: 'Ready', installed: 'Done' };
                const label = status === 'all' ? 'All' : (shortLabels[status] || statusConfig[status].label);
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0",
                      statusFilter === status
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="hidden sm:block">
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
        </div>

        {/* Desktop: Two-column layout — parts list + delivery calendar */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_280px] gap-4 items-start">
          {/* LEFT COLUMN: Parts list */}
          <div className="space-y-4">
            {/* Ready to Install Section */}
            {readyToInstallParts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Wrench className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-semibold text-foreground">Ready to Install ({readyToInstallParts.length})</h3>
                </div>
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  {readyToInstallParts.map((part) => (
                    <motion.div
                      key={part.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedPartDetail(part)}
                      className="px-4 py-3 flex items-center justify-between border-b border-border last:border-b-0 hover:bg-muted/30 cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-2.5 h-2.5 rounded-full", statusConfig.ready_to_install.dot)} />
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate block">{part.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {part.quantity > 1 && <span>Qty: {part.quantity}</span>}
                            {part.installer_name && (
                              <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{part.installer_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleMarkInstalled(part); }}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Installed
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Parts List Table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <AnimatePresence>
                {otherParts.length > 0 ? (
                  filteredParts.map((part, idx) => {
                    const isSelected = selectedParts.has(part.id);
                    const estDeliveryDate = parseLocalDate(part.est_delivery_date);
                    const estDeliveryDateValid = !!estDeliveryDate;
                    const isDeliveryDue = estDeliveryDateValid && (isToday(estDeliveryDate) || isPast(estDeliveryDate));
                    const dueDateParsed = parseLocalDate(part.due_date);
                    const hasDueDate = !!dueDateParsed;
                    const isDuePast = hasDueDate && isPast(dueDateParsed) && !isToday(dueDateParsed);
                    return (
                    <motion.div
                      key={part.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: idx * 0.015 }}
                      onClick={() => selectionMode ? togglePartSelection(part.id) : setSelectedPartDetail(part)}
                      className={cn(
                        "px-5 py-3.5 hover:bg-muted/30 transition-all group border-b border-border last:border-b-0 cursor-pointer",
                        isSelected && "bg-amber-50/60 dark:bg-amber-900/10"
                      )}
                    >
                      {/* Top row: status dot + name + right side info */}
                      <div className="flex items-center gap-3">
                        {selectionMode && (
                          <button onClick={(e) => { e.stopPropagation(); togglePartSelection(part.id); }} className="shrink-0">
                            {isSelected ? <CheckSquare className="w-4.5 h-4.5 text-amber-600" /> : <Square className="w-4.5 h-4.5 text-muted-foreground/40" />}
                          </button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="shrink-0 group/status">
                              <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all group-hover/status:ring-primary/40", statusConfig[part.status]?.dot || "bg-slate-400", "ring-transparent")} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <DropdownMenuItem key={key} onClick={(e) => { e.stopPropagation(); handleStatusChange(part, key); }}>
                                <div className={cn("w-2 h-2 rounded-full mr-2", config.dot)} />
                                {config.label}
                                {part.status === key && <Check className="w-4 h-4 ml-auto text-primary" />}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-foreground truncate">{part.name}</span>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", statusConfig[part.status]?.color)}>
                              {statusConfig[part.status]?.label || part.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {part.assigned_name ? (
                            <div className="flex items-center gap-1.5" title={part.assigned_name}>
                              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold", getColorForEmail(part.assigned_to))}>
                                {getInitials(part.assigned_name)}
                              </div>
                              <span className="text-xs text-muted-foreground">{part.assigned_name.split(' ')[0]}</span>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 transition-colors" title="Assign">
                                  <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                {projectMembers.map((member) => (
                                  <DropdownMenuItem key={member.id} onClick={() => handleQuickAssign(part, member.email)}>
                                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>{getInitials(member.name)}</div>
                                    {member.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          {estDeliveryDateValid && (
                            <span className={cn("text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1", isDeliveryDue ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "text-muted-foreground")}>
                              <Truck className="w-3 h-3" />{format(estDeliveryDate, 'MMM d')}
                            </span>
                          )}
                          {hasDueDate && !estDeliveryDateValid && (
                            <span className={cn("text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1", isDuePast ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "text-muted-foreground")}>
                              <Calendar className="w-3 h-3" />{format(dueDateParsed, 'MMM d')}
                            </span>
                          )}

                          <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {part.status === 'needed' && (
                              <Button variant="outline" size="sm" className="h-7 text-xs border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-semibold" onClick={(e) => { e.stopPropagation(); openOrderDialog(part); }}>
                                <ShoppingCart className="w-3 h-3 mr-1" />Order
                              </Button>
                            )}
                            {part.status === 'ordered' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className={cn("h-7 text-xs font-semibold", isDeliveryDue ? "border-orange-400 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 !opacity-100 animate-pulse" : "border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20")} onClick={(e) => e.stopPropagation()}>
                                    <PackageCheck className="w-3 h-3 mr-1" />{isDeliveryDue ? "Check" : "Receive"}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Assign installer:</div>
                                  {projectMembers.map((member) => (
                                    <DropdownMenuItem key={member.id} onClick={() => openReceiveDialog(part, member.email)}>
                                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>{getInitials(member.name)}</div>
                                      {member.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {part.status === 'ordered' && part.order_proof && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setViewingProof(part); }}>
                                <Eye className="w-3 h-3 mr-1" />Proof
                              </Button>
                            )}
                            {part.status === 'ordered' && !part.est_delivery_date && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => e.stopPropagation()}>
                                    <Truck className="w-3 h-3 mr-1" />ETA
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
                                  <CalendarPicker mode="single" selected={undefined} onSelect={(date) => date && handleSetDeliveryDate(part, date)} />
                                </PopoverContent>
                              </Popover>
                            )}
                            {part.status === 'received' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 text-xs border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-semibold" onClick={(e) => e.stopPropagation()}>
                                    <Wrench className="w-3 h-3 mr-1" />Install
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Assign installer:</div>
                                  {projectMembers.map((member) => (
                                    <DropdownMenuItem key={member.id} onClick={() => openReceiveDialog(part, member.email)}>
                                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(member.email))}>{getInitials(member.name)}</div>
                                      {member.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {part.status === 'ready_to_install' && (
                              <Button variant="outline" size="sm" className="h-7 text-xs border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 font-semibold" onClick={(e) => { e.stopPropagation(); handleMarkInstalled(part); }}>
                                <Check className="w-3 h-3 mr-1" />Installed
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingPart(part); setShowPartModal(true); }}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, part }); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: metadata */}
                      <div className="flex items-center gap-3 mt-1.5 ml-[22px]">
                        {part.supplier && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" />{part.supplier}</span>
                        )}
                        {part.quantity > 1 && <span className="text-xs text-muted-foreground">Qty: {part.quantity}</span>}
                        {part.unit_cost > 0 && (
                          <span className="text-xs font-medium text-foreground">${(part.unit_cost * (part.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        )}
                        {part.part_number && <span className="text-xs text-muted-foreground/60">#{part.part_number}</span>}
                        {part.order_proof && (
                          <button onClick={(e) => { e.stopPropagation(); setViewingProof(part); }} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                            <img src={part.order_proof} alt="" className="w-3.5 h-3.5 rounded object-cover" />
                            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">proof</span>
                          </button>
                        )}
                        {part.order_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{format(parseLocalDate(part.order_date) || new Date(), 'MMM d')}</span>
                        )}
                      </div>
                    </motion.div>
                  );})
                ) : null}
              </AnimatePresence>
              {filteredParts.length === 0 && readyToInstallParts.length === 0 && (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No parts found</h3>
                  <p className="text-muted-foreground mb-6">Add parts to track materials for this project</p>
                  <Button onClick={() => setShowPartModal(true)} className="bg-amber-500 hover:bg-amber-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Part
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Delivery Calendar */}
          <div className="sticky top-4">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  Delivery Schedule
                </h3>
              </div>
              <div className="p-2">
                <CalendarPicker
                  mode="multiple"
                  selected={parts
                    .filter(p => p.est_delivery_date)
                    .map(p => parseLocalDate(p.est_delivery_date))
                    .filter(Boolean)}
                  className="w-full"
                  modifiers={{
                    due: parts
                      .filter(p => p.est_delivery_date && (isToday(parseLocalDate(p.est_delivery_date)) || isPast(parseLocalDate(p.est_delivery_date))))
                      .map(p => parseLocalDate(p.est_delivery_date))
                      .filter(Boolean),
                    ordered: parts
                      .filter(p => p.order_date)
                      .map(p => parseLocalDate(p.order_date))
                      .filter(Boolean)
                  }}
                  modifiersClassNames={{
                    due: '!bg-orange-500 !text-white font-bold',
                    ordered: 'ring-2 ring-blue-400 ring-inset'
                  }}
                />
              </div>
              {/* Upcoming deliveries list */}
              <div className="px-3 pb-3">
                <div className="space-y-1">
                  {parts
                    .filter(p => p.est_delivery_date && p.status === 'ordered')
                    .sort((a, b) => new Date(a.est_delivery_date) - new Date(b.est_delivery_date))
                    .slice(0, 6)
                    .map(p => {
                      const d = parseLocalDate(p.est_delivery_date);
                      const isDue = d && (isToday(d) || isPast(d));
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPartDetail(p)}
                          className={cn(
                            "flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs",
                            isDue ? "bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30" : "hover:bg-muted/50"
                          )}
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isDue ? "bg-orange-500" : "bg-sky-400")} />
                          <span className="font-medium text-foreground truncate flex-1">{p.name}</span>
                          <span className={cn("shrink-0 font-medium", isDue ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>
                            {d ? format(d, 'MMM d') : ''}
                          </span>
                        </div>
                      );
                    })}
                  {parts.filter(p => p.est_delivery_date && p.status === 'ordered').length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No upcoming deliveries</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Grouped parts by status */}
        <div className="sm:hidden space-y-3">
          {(() => {
            const statusOrder = ['needed', 'ordered', 'received', 'ready_to_install', 'installed'];
            const grouped = {};
            filteredParts.forEach(p => {
              const s = p.status || 'needed';
              if (!grouped[s]) grouped[s] = [];
              grouped[s].push(p);
            });
            return statusOrder.filter(s => grouped[s]?.length > 0).map(status => {
              const config = statusConfig[status];
              const groupParts = grouped[status];
              const isCollapsed = collapsedStatuses.has(status);
              return (
                <div key={status} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <button
                    onClick={() => setCollapsedStatuses(prev => {
                      const next = new Set(prev);
                      next.has(status) ? next.delete(status) : next.add(status);
                      return next;
                    })}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", config?.color)}>{config?.label || status}</span>
                      <span className="text-xs text-muted-foreground">{groupParts.length}</span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                  </button>
                  {!isCollapsed && (
                    <div>
                      {groupParts.map(part => {
                        const estDeliveryDate = parseLocalDate(part.est_delivery_date);
                        const estDeliveryDateValid = !!estDeliveryDate;
                        const isDeliveryDue = estDeliveryDateValid && (isToday(estDeliveryDate) || isPast(estDeliveryDate));
                        const dueDateParsed = parseLocalDate(part.due_date);
                        const hasDueDate = !!dueDateParsed;
                        return (
                          <div
                            key={part.id}
                            onClick={() => setSelectedPartDetail(part)}
                            className="px-4 py-3 border-t border-border cursor-pointer active:bg-muted/50"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-foreground truncate">{part.name}</p>
                              {part.part_number && <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">#{part.part_number}</span>}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                              {part.assigned_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{part.assigned_name.split(' ')[0]}</span>}
                              {hasDueDate && <span>Due {format(dueDateParsed, 'MMM d')}</span>}
                              {estDeliveryDateValid && <span className={isDeliveryDue ? "text-orange-500 font-semibold" : ""}>ETA {format(estDeliveryDate, 'MMM d')}</span>}
                              <span>Qty {part.quantity || 1}</span>
                              {part.unit_cost > 0 && <span>${(part.unit_cost * (part.quantity || 1)).toFixed(0)}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
          {filteredParts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No parts found</p>
            </div>
          )}
        </div>
      </div>

      <PartModal
        open={showPartModal}
        onClose={() => { setShowPartModal(false); setEditingPart(null); }}
        part={editingPart}
        projectId={projectId}
        teamMembers={projectMembers}
        onSave={handleSavePart}
      />

      <PartDetailModal
        open={!!selectedPartDetail}
        onClose={() => setSelectedPartDetail(null)}
        part={selectedPartDetail}
        teamMembers={projectMembers}
        currentUser={currentUser}
        onStatusChange={(part, status) => { handleStatusChange(part, status); setSelectedPartDetail({ ...part, status }); }}
        onDelete={(part) => { setSelectedPartDetail(null); setDeleteConfirm({ open: true, part }); }}
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
      <AlertDialog open={receiveDialog.open} onOpenChange={(open) => !open && setReceiveDialog({ open: false, part: null, installer: '', location: '', createTask: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-amber-600" />
              Receive Part
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{receiveDialog.part?.name}</span>
              {receiveDialog.part?.part_number && <span className="text-muted-foreground"> (#{receiveDialog.part?.part_number})</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
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
            <div className="flex items-center space-x-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <Checkbox
                id="createTask"
                checked={receiveDialog.createTask}
                onCheckedChange={(checked) => setReceiveDialog(prev => ({ ...prev, createTask: checked }))}
              />
              <Label htmlFor="createTask" className="text-sm font-medium text-indigo-900 dark:text-indigo-300 cursor-pointer">
                Create installation task for installer
              </Label>
            </div>
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

      {/* Order Part Dialog */}
      <AlertDialog open={orderDialog.open} onOpenChange={(open) => { if (!open) { setOrderDialog({ open: false, part: null, screenshot: null, eta: null, notes: '' }); setOrderScreenshotPreview(null); } }}>
        <AlertDialogContent className="max-w-md" onPaste={handleOrderPaste}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Order Part
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span className="font-medium text-foreground">{orderDialog.part?.name}</span>
                {orderDialog.part?.part_number && <span className="text-muted-foreground"> (#{orderDialog.part?.part_number})</span>}
                {orderDialog.part?.quantity > 1 && <span className="text-muted-foreground"> · Qty: {orderDialog.part?.quantity}</span>}
                {orderDialog.part?.supplier && <span className="text-muted-foreground"> · {orderDialog.part?.supplier}</span>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            {/* Screenshot upload */}
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <ImagePlus className="w-4 h-4" />
                Order Confirmation Screenshot (optional)
              </label>
              {orderScreenshotPreview ? (
                <div className="relative rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden bg-muted/50">
                  <img src={orderScreenshotPreview} alt="Order proof" className="w-full max-h-48 object-contain" />
                  <button
                    onClick={() => { setOrderScreenshotPreview(null); setOrderDialog(prev => ({ ...prev, screenshot: null })); }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
                  <ImagePlus className="w-6 h-6 text-muted-foreground mb-1.5" />
                  <span className="text-xs text-primary font-medium">Click to upload or paste screenshot</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Ctrl+V to paste from clipboard</span>
                  <input type="file" accept="image/*" onChange={handleOrderScreenshot} className="hidden" />
                </label>
              )}
            </div>

            {/* ETA Date Picker */}
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4" />
                Estimated Delivery Date (optional)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                    {orderDialog.eta ? format(orderDialog.eta, 'MMMM d, yyyy') : <span className="text-slate-400">Pick a date...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker
                    mode="single"
                    selected={orderDialog.eta}
                    onSelect={(date) => setOrderDialog(prev => ({ ...prev, eta: date }))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Order notes */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Order Notes (optional)</label>
              <Textarea
                value={orderDialog.notes}
                onChange={(e) => setOrderDialog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Order #, tracking info, vendor details..."
                className="h-16 bg-transparent"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOrder} className="bg-blue-600 hover:bg-blue-700">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Mark as Ordered
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order Proof Viewer */}
      <AlertDialog open={!!viewingProof} onOpenChange={(open) => !open && setViewingProof(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Order Proof
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span className="font-medium text-slate-900">{viewingProof?.name}</span>
                {viewingProof?.order_date && (
                  <span className="text-slate-500"> · Ordered {format(parseLocalDate(viewingProof.order_date) || new Date(), 'MMM d, yyyy')}</span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {viewingProof?.order_proof && (
            <div className="rounded-lg border overflow-hidden bg-slate-50">
              <img src={viewingProof.order_proof} alt="Order proof" className="w-full max-h-96 object-contain" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
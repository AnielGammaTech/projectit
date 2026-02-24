import { useState, useEffect, useMemo } from 'react';
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
  ClipboardCheck
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b] flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b]">
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
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Parts & Materials</h1>
              <p className="text-slate-500 dark:text-slate-400">
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
        <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 mb-6">
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ready to Install ({readyToInstallParts.length})</h2>
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
        <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-hidden">
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
                    "px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-all group cursor-pointer border-b border-slate-100 dark:border-slate-700/30 last:border-b-0",
                    isSelected && "bg-amber-50/60 dark:bg-amber-900/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Selection checkbox */}
                    {selectionMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePartSelection(part.id); }}
                        className="shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4.5 h-4.5 text-amber-600" />
                        ) : (
                          <Square className="w-4.5 h-4.5 text-slate-300" />
                        )}
                      </button>
                    )}

                    {/* Status badge - clickable */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Badge variant="outline" className={cn("cursor-pointer hover:opacity-80 shrink-0 text-[10px] px-1.5 py-0.5", statusConfig[part.status]?.color)}>
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

                    {/* Name + part number */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{part.name}</span>
                        {part.part_number && (
                          <span className="text-xs text-slate-400 shrink-0">#{part.part_number}</span>
                        )}
                      </div>
                      {/* Second row: metadata */}
                      <div className="flex items-center gap-2.5 mt-0.5">
                        {part.supplier && (
                          <span className="text-[11px] text-slate-400">{part.supplier}</span>
                        )}
                        {part.quantity > 1 && (
                          <span className="text-[11px] text-slate-400">Qty: {part.quantity}</span>
                        )}
                        {part.unit_cost > 0 && (
                          <span className="text-[11px] text-slate-500 font-medium">${(part.unit_cost * (part.quantity || 1)).toLocaleString()}</span>
                        )}
                        {/* Order proof thumbnail inline */}
                        {part.order_proof && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewingProof(part); }}
                            className="flex items-center gap-1 px-1 py-0 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            <img src={part.order_proof} alt="" className="w-3.5 h-3.5 rounded object-cover" />
                            <span className="text-[9px] font-medium text-blue-600">proof</span>
                          </button>
                        )}
                        {part.order_date && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <ShoppingCart className="w-2.5 h-2.5" />
                            {format(parseLocalDate(part.order_date) || new Date(), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side: key info + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Assignee */}
                      {part.assigned_name ? (
                        <div className="flex items-center gap-1" title={part.assigned_name}>
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold", getColorForEmail(part.assigned_to))}>
                            {getInitials(part.assigned_name)}
                          </div>
                          <span className="text-[11px] text-slate-500 max-w-[60px] truncate hidden sm:inline">{part.assigned_name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors"
                              title="Assign"
                            >
                              <UserPlus className="w-3 h-3 text-amber-600" />
                              <span className="text-[10px] font-medium text-amber-700 hidden sm:inline">Assign</span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            {projectMembers.map((member) => (
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

                      {/* ETA / Due date */}
                      {estDeliveryDateValid && (
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5",
                          isDeliveryDue ? "bg-orange-100 text-orange-700" : "bg-cyan-50 text-cyan-700"
                        )}>
                          <Truck className="w-2.5 h-2.5" />
                          {format(estDeliveryDate, 'MMM d')}
                          {isDeliveryDue && " ⚠️"}
                        </span>
                      )}
                      {hasDueDate && !estDeliveryDateValid && (
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5",
                          isDuePast ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                        )}>
                          <Calendar className="w-2.5 h-2.5" />
                          {format(dueDateParsed, 'MMM d')}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5 items-center shrink-0">
                      {/* ORDER button - for needed parts */}
                      {part.status === 'needed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity font-semibold"
                          onClick={(e) => { e.stopPropagation(); openOrderDialog(part); }}
                        >
                          <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                          Order
                        </Button>
                      )}

                      {/* RECEIVE button - for ordered parts */}
                      {part.status === 'ordered' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 opacity-0 group-hover:opacity-100 transition-opacity font-semibold",
                                isDeliveryDue
                                  ? "border-orange-400 text-orange-700 bg-orange-50 hover:bg-orange-100 !opacity-100 animate-pulse"
                                  : "border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
                              {isDeliveryDue ? "Check Delivery" : "Receive"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            <div className="px-2 py-1.5 text-xs text-slate-500 font-medium">Assign installer:</div>
                            {projectMembers.map((member) => (
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

                      {/* View order proof - for ordered parts with proof */}
                      {part.status === 'ordered' && part.order_proof && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setViewingProof(part); }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Proof
                        </Button>
                      )}

                      {/* Quick set ETA - for ordered parts without ETA */}
                      {part.status === 'ordered' && !part.est_delivery_date && (
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

                      {/* ASSIGN INSTALL - for received parts */}
                      {part.status === 'received' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-purple-300 text-purple-700 hover:bg-purple-50 opacity-0 group-hover:opacity-100 transition-opacity font-semibold"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Wrench className="w-3.5 h-3.5 mr-1.5" />
                              Assign Install
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            <div className="px-2 py-1.5 text-xs text-slate-500 font-medium">Assign installer:</div>
                            {projectMembers.map((member) => (
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

                      {/* MARK INSTALLED - for ready_to_install */}
                      {part.status === 'ready_to_install' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity font-semibold"
                          onClick={(e) => { e.stopPropagation(); handleMarkInstalled(part); }}
                        >
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          Mark Installed
                        </Button>
                      )}

                      {/* Edit & Delete - always shown on hover */}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingPart(part); setShowPartModal(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, part }); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );})
            ) : null}
          </AnimatePresence>
          {filteredParts.length === 0 && readyToInstallParts.length === 0 && (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No parts found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Add parts to track materials for this project</p>
              <Button onClick={() => setShowPartModal(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Part
              </Button>
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
              <span className="font-medium text-slate-900">{receiveDialog.part?.name}</span>
              {receiveDialog.part?.part_number && <span className="text-slate-500"> (#{receiveDialog.part?.part_number})</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
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
            <div className="flex items-center space-x-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <Checkbox
                id="createTask"
                checked={receiveDialog.createTask}
                onCheckedChange={(checked) => setReceiveDialog(prev => ({ ...prev, createTask: checked }))}
              />
              <Label htmlFor="createTask" className="text-sm font-medium text-indigo-900 cursor-pointer">
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
                <span className="font-medium text-slate-900">{orderDialog.part?.name}</span>
                {orderDialog.part?.part_number && <span className="text-slate-500"> (#{orderDialog.part?.part_number})</span>}
                {orderDialog.part?.quantity > 1 && <span className="text-slate-500"> · Qty: {orderDialog.part?.quantity}</span>}
                {orderDialog.part?.supplier && <span className="text-slate-500"> · {orderDialog.part?.supplier}</span>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            {/* Screenshot upload */}
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <ImagePlus className="w-4 h-4" />
                Order Confirmation Screenshot (optional)
              </label>
              {orderScreenshotPreview ? (
                <div className="relative rounded-lg border border-blue-200 overflow-hidden bg-slate-50">
                  <img src={orderScreenshotPreview} alt="Order proof" className="w-full max-h-48 object-contain" />
                  <button
                    onClick={() => { setOrderScreenshotPreview(null); setOrderDialog(prev => ({ ...prev, screenshot: null })); }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition-colors">
                  <ImagePlus className="w-6 h-6 text-blue-400 mb-1.5" />
                  <span className="text-xs text-blue-600 font-medium">Click to upload or paste screenshot</span>
                  <span className="text-[10px] text-blue-400 mt-0.5">Ctrl+V to paste from clipboard</span>
                  <input type="file" accept="image/*" onChange={handleOrderScreenshot} className="hidden" />
                </label>
              )}
            </div>

            {/* ETA Date Picker */}
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
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
              <label className="text-sm font-medium text-slate-700 mb-2 block">Order Notes (optional)</label>
              <Textarea
                value={orderDialog.notes}
                onChange={(e) => setOrderDialog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Order #, tracking info, vendor details..."
                className="h-16"
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
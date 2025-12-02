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
  Loader2
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import PartModal from '@/components/modals/PartModal';

const statusConfig = {
  needed: { label: 'Needed', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  received: { label: 'Received', color: 'bg-amber-100 text-amber-700 border-amber-200' },
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link to={createPageUrl('ProjectDetail') + `?id=${projectId}`} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {project.name}
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500 shadow-lg shadow-amber-200">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Parts & Materials</h1>
              <p className="text-slate-500">{parts.length} items · Total: ${totalCost.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <Button variant="outline" disabled={uploading} asChild>
                <span>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload PDF
                </span>
              </Button>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
            <Button onClick={() => { setEditingPart(null); setShowPartModal(true); }} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Part
            </Button>
          </div>
        </div>

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
          </div>
        </div>

        {/* Parts List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredParts.length > 0 ? (
              filteredParts.map((part, idx) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => { setEditingPart(part); setShowPartModal(true); }}
                  className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex items-start gap-4">
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
                            <DropdownMenuTrigger asChild>
                              <Badge variant="outline" className={cn("cursor-pointer hover:opacity-80", statusConfig[part.status]?.color)}>
                                {statusConfig[part.status]?.label || part.status}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {Object.entries(statusConfig).map(([key, config]) => (
                                <DropdownMenuItem key={key} onClick={() => handleStatusChange(part, key)}>
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
                        {part.assigned_name && (
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(part.assigned_to))}>
                              {getInitials(part.assigned_name)}
                            </div>
                            <span className="text-sm text-slate-600">{part.assigned_name}</span>
                          </div>
                        )}
                        {part.due_date && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{format(new Date(part.due_date), 'MMM d')}</span>
                          </div>
                        )}
                      </div>
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
              ))
            ) : (
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
            )}
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
    </div>
  );
}
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, User, Calendar, MoreHorizontal, Edit2, Trash2, Upload, Loader2, ChevronLeft, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PartsUploader from '@/components/parts/PartsUploader';

const statusConfig = {
  needed: { label: 'Needed', color: 'bg-red-100 text-red-700' },
  ordered: { label: 'Ordered', color: 'bg-amber-100 text-amber-700' },
  received: { label: 'Received', color: 'bg-blue-100 text-blue-700' },
  installed: { label: 'Installed', color: 'bg-emerald-100 text-emerald-700' }
};

export default function PartsViewModal({ 
  open, 
  onClose, 
  parts = [], 
  projectId,
  onAdd,
  onEdit, 
  onDelete, 
  onStatusChange,
  onPartsExtracted
}) {
  const [uploading, setUploading] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const totalCost = parts.reduce((sum, p) => sum + ((p.unit_cost || 0) * (p.quantity || 1)), 0);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

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
                  unit_cost: { type: "number" },
                  description: { type: "string" }
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
        onPartsExtracted?.();
      }
    } catch (err) {
      console.error('Failed to extract parts:', err);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleAssign = async (part, email) => {
    const member = teamMembers.find(m => m.email === email);
    await base44.entities.Part.update(part.id, {
      ...part,
      assigned_to: email,
      assigned_name: member?.name || email
    });
    onPartsExtracted?.();
  };

  const handleUnassign = async (part) => {
    await base44.entities.Part.update(part.id, {
      ...part,
      assigned_to: '',
      assigned_name: ''
    });
    onPartsExtracted?.();
  };

  // Part detail view
  if (selectedPart) {
    const part = parts.find(p => p.id === selectedPart);
    if (!part) {
      setSelectedPart(null);
      return null;
    }
    const status = statusConfig[part.status] || statusConfig.needed;

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPart(null)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              Part Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{part.name}</h2>
              {part.part_number && <p className="text-sm text-slate-500">#{part.part_number}</p>}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge className={cn("cursor-pointer text-sm", status.color)}>
                    {status.label}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => onStatusChange(part, key)}>
                      <Badge className={cn("mr-2", config.color)}>{config.label}</Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Quantity</span>
                <p className="font-medium">{part.quantity || 1}</p>
              </div>
              {part.unit_cost > 0 && (
                <div>
                  <span className="text-slate-500">Unit Cost</span>
                  <p className="font-medium">${part.unit_cost}</p>
                </div>
              )}
              {part.supplier && (
                <div>
                  <span className="text-slate-500">Supplier</span>
                  <p className="font-medium">{part.supplier}</p>
                </div>
              )}
              {part.due_date && (
                <div>
                  <span className="text-slate-500">Due Date</span>
                  <p className="font-medium">{format(new Date(part.due_date), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>

            {part.notes && (
              <div>
                <span className="text-sm text-slate-500">Notes</span>
                <p className="text-slate-700 mt-1">{part.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t flex justify-between">
              <Button variant="outline" onClick={() => onEdit(part)}>
                <Edit2 className="w-4 h-4 mr-2" />Edit
              </Button>
              <Button variant="outline" onClick={() => { onDelete(part); setSelectedPart(null); }} className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Parts & Materials</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-normal text-slate-500">
                Total: ${totalCost.toLocaleString()}
              </span>
              <PartsUploader 
                projectId={projectId} 
                onPartsExtracted={onPartsExtracted} 
                compact={true}
              />
              <Button size="sm" onClick={onAdd} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-1" />
                Add Part
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
          {parts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>No parts added yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {parts.map((part) => {
                const status = statusConfig[part.status] || statusConfig.needed;
                return (
                  <motion.div
                    key={part.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedPart(part.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-slate-900">{part.name}</h4>
                          {part.part_number && (
                            <span className="text-xs text-slate-400">#{part.part_number}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Badge className={cn("cursor-pointer", status.color)}>
                                {status.label}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {Object.entries(statusConfig).map(([key, config]) => (
                                <DropdownMenuItem key={key} onClick={() => onStatusChange(part, key)}>
                                  <Badge className={cn("mr-2", config.color)}>{config.label}</Badge>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <span className="text-slate-500">Qty: {part.quantity || 1}</span>
                          {part.unit_cost > 0 && (
                            <span className="text-slate-500">${part.unit_cost} each</span>
                          )}
                          {part.supplier && (
                            <span className="text-slate-400">• {part.supplier}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          {/* Quick Assign Button */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              {part.assigned_name ? (
                                <button className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors">
                                  <User className="w-3 h-3" />
                                  {part.assigned_name}
                                </button>
                              ) : (
                                <button className="flex items-center gap-1 px-2 py-1 rounded border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors text-slate-500">
                                  <UserPlus className="w-3 h-3" />
                                  Unassigned
                                </button>
                              )}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {part.assigned_to && (
                                <DropdownMenuItem onClick={() => handleUnassign(part)} className="text-slate-500">
                                  <User className="w-4 h-4 mr-2" />
                                  Unassign
                                </DropdownMenuItem>
                              )}
                              {teamMembers.map((member) => (
                                <DropdownMenuItem key={member.id} onClick={() => handleAssign(part, member.email)}>
                                  <User className="w-4 h-4 mr-2" />
                                  {member.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {part.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(part.due_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(part)}>
                            <Edit2 className="w-4 h-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(part)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, User, Calendar, MoreHorizontal, Edit2, Trash2, Upload, Loader2, FileText } from 'lucide-react';
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
  const totalCost = parts.reduce((sum, p) => sum + ((p.unit_cost || 0) * (p.quantity || 1)), 0);

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
              <label className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors",
                uploading ? "bg-slate-100 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              )}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Scan Doc
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" disabled={uploading} />
              </label>
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
                    className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all"
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
                            <DropdownMenuTrigger asChild>
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
                        {(part.assigned_name || part.due_date) && (
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            {part.assigned_name && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {part.assigned_name}
                              </span>
                            )}
                            {part.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(part.due_date), 'MMM d')}
                              </span>
                            )}
                          </div>
                        )}
                        {part.notes && (
                          <p className="text-xs text-slate-500 mt-2">{part.notes}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
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
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Tag, Plus, Edit2, Trash2, GripVertical, Check, X, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';

const colorOptions = [
  { name: 'slate', bg: 'bg-slate-500', light: 'bg-slate-100 text-slate-700 border-slate-200' },
  { name: 'red', bg: 'bg-red-500', light: 'bg-red-100 text-red-700 border-red-200' },
  { name: 'orange', bg: 'bg-orange-500', light: 'bg-orange-100 text-orange-700 border-orange-200' },
  { name: 'amber', bg: 'bg-amber-500', light: 'bg-amber-100 text-amber-700 border-amber-200' },
  { name: 'yellow', bg: 'bg-yellow-500', light: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { name: 'lime', bg: 'bg-lime-500', light: 'bg-lime-100 text-lime-700 border-lime-200' },
  { name: 'green', bg: 'bg-green-500', light: 'bg-green-100 text-green-700 border-green-200' },
  { name: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { name: 'teal', bg: 'bg-teal-500', light: 'bg-teal-100 text-teal-700 border-teal-200' },
  { name: 'cyan', bg: 'bg-cyan-500', light: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { name: 'sky', bg: 'bg-sky-500', light: 'bg-sky-100 text-sky-700 border-sky-200' },
  { name: 'blue', bg: 'bg-blue-500', light: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { name: 'violet', bg: 'bg-violet-500', light: 'bg-violet-100 text-violet-700 border-violet-200' },
  { name: 'purple', bg: 'bg-purple-500', light: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'fuchsia', bg: 'bg-fuchsia-500', light: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' },
  { name: 'pink', bg: 'bg-pink-500', light: 'bg-pink-100 text-pink-700 border-pink-200' },
  { name: 'rose', bg: 'bg-rose-500', light: 'bg-rose-100 text-rose-700 border-rose-200' },
];

export default function ProjectStatuses() {
  const [showModal, setShowModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: statuses = [], refetch } = useQuery({
    queryKey: ['projectStatuses'],
    queryFn: () => base44.entities.ProjectStatus.list('order')
  });

  const handleSave = async (data) => {
    if (editingStatus) {
      await base44.entities.ProjectStatus.update(editingStatus.id, data);
    } else {
      const maxOrder = Math.max(0, ...statuses.map(s => s.order || 0));
      await base44.entities.ProjectStatus.create({ ...data, order: maxOrder + 1 });
    }
    refetch();
    setShowModal(false);
    setEditingStatus(null);
  };

  const handleDelete = async () => {
    await base44.entities.ProjectStatus.delete(deleteConfirm.id);
    refetch();
    setDeleteConfirm(null);
  };

  const handleSetDefault = async (status) => {
    // Remove default from all others
    for (const s of statuses) {
      if (s.is_default && s.id !== status.id) {
        await base44.entities.ProjectStatus.update(s.id, { is_default: false });
      }
    }
    await base44.entities.ProjectStatus.update(status.id, { is_default: true });
    refetch();
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(statuses);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order in database
    for (let i = 0; i < items.length; i++) {
      if (items[i].order !== i) {
        await base44.entities.ProjectStatus.update(items[i].id, { order: i });
      }
    }
    refetch();
  };

  const getColorConfig = (colorName) => {
    return colorOptions.find(c => c.name === colorName) || colorOptions[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-[#0069AF] shadow-lg shadow-[#0069AF]/20">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Project Statuses</h1>
            </div>
            <p className="text-slate-500">Customize project statuses and their display</p>
          </div>
          <Button onClick={() => { setEditingStatus(null); setShowModal(true); }} className="bg-[#0069AF] hover:bg-[#133F5C]">
            <Plus className="w-4 h-4 mr-2" />
            Add Status
          </Button>
        </motion.div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="statuses">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                {statuses.length === 0 ? (
                  <div className="bg-white rounded-2xl border p-12 text-center">
                    <Tag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No custom statuses yet</h3>
                    <p className="text-slate-500 mb-4">Create statuses like "Planning", "In Progress", "Completed"</p>
                    <Button onClick={() => setShowModal(true)} className="bg-[#0069AF] hover:bg-[#133F5C]">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Status
                    </Button>
                  </div>
                ) : (
                  statuses.map((status, idx) => {
                    const colorConfig = getColorConfig(status.color);
                    return (
                      <Draggable key={status.id} draggableId={status.id} index={idx}>
                        {(provided, snapshot) => (
                          <motion.div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={cn(
                              "bg-white rounded-xl border p-4 hover:shadow-md transition-all",
                              snapshot.isDragging && "shadow-lg ring-2 ring-[#0069AF]"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1">
                                  <GripVertical className="w-5 h-5 text-slate-400" />
                                </div>
                                <div className={cn("w-4 h-4 rounded-full", colorConfig.bg)} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn("text-xs", colorConfig.light)}>
                                      {status.name}
                                    </Badge>
                                    {status.is_default && (
                                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                        <Star className="w-3 h-3 mr-1 fill-current" />
                                        Default
                                      </Badge>
                                    )}
                                    {status.is_completed && (
                                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                        <Check className="w-3 h-3 mr-1" />
                                        Completed Status
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">Key: {status.key}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!status.is_default && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSetDefault(status)}
                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  >
                                    <Star className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setEditingStatus(status); setShowModal(true); }}
                                >
                                  <Edit2 className="w-4 h-4 text-slate-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(status)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </Draggable>
                    );
                  })
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <StatusModal
          open={showModal}
          onClose={() => { setShowModal(false); setEditingStatus(null); }}
          status={editingStatus}
          onSave={handleSave}
        />

        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Status?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this status. Projects using this status will need to be updated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function StatusModal({ open, onClose, status, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    color: 'slate',
    is_completed: false
  });

  useState(() => {
    if (status) {
      setFormData({
        name: status.name || '',
        key: status.key || '',
        color: status.color || 'slate',
        is_completed: status.is_completed || false
      });
    } else {
      setFormData({
        name: '',
        key: '',
        color: 'slate',
        is_completed: false
      });
    }
  }, [status, open]);

  const handleNameChange = (name) => {
    setFormData(prev => ({
      ...prev,
      name,
      key: status ? prev.key : name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.key) return;
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{status ? 'Edit Status' : 'Add Status'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Status Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., In Progress"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Key (used internally)</Label>
            <Input
              value={formData.key}
              onChange={(e) => setFormData(p => ({ ...p, key: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') }))}
              placeholder="e.g., in_progress"
              className="mt-1"
              disabled={!!status}
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="grid grid-cols-9 gap-2 mt-2">
              {colorOptions.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setFormData(p => ({ ...p, color: c.name }))}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all hover:scale-110",
                    c.bg,
                    formData.color === c.name && "ring-2 ring-offset-2 ring-[#0069AF]"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label>Completed Status</Label>
              <p className="text-xs text-slate-500">Mark this as a completion status</p>
            </div>
            <Switch
              checked={formData.is_completed}
              onCheckedChange={(checked) => setFormData(p => ({ ...p, is_completed: checked }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.key} className="bg-[#0069AF] hover:bg-[#133F5C]">
              {status ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
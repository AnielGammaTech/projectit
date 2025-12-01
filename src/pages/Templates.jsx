import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { FileStack, Plus, Edit2, Trash2, ListTodo, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import TemplateModal from '@/components/modals/TemplateModal';

export default function Templates() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.ProjectTemplate.list('-created_date')
  });

  const handleSave = async (data) => {
    if (editingTemplate) {
      await base44.entities.ProjectTemplate.update(editingTemplate.id, data);
    } else {
      await base44.entities.ProjectTemplate.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['templates'] });
    setShowModal(false);
    setEditingTemplate(null);
  };

  const handleDelete = async () => {
    await base44.entities.ProjectTemplate.delete(deleteConfirm.id);
    queryClient.invalidateQueries({ queryKey: ['templates'] });
    setDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Templates</h1>
            <p className="text-slate-500 mt-1">Create reusable project templates</p>
          </div>
          <Button
            onClick={() => { setEditingTemplate(null); setShowModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </motion.div>

        {templates.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template, idx) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-indigo-50">
                    <FileStack className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditingTemplate(template); setShowModal(true); }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(template)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-2">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{template.description}</p>
                )}

                <div className="flex gap-3">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <ListTodo className="w-3 h-3" />
                    {template.default_tasks?.length || 0} tasks
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {template.default_parts?.length || 0} parts
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
          >
            <FileStack className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No templates yet</h3>
            <p className="text-slate-500 mb-6">Create templates to quickly set up new projects</p>
            <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </motion.div>
        )}
      </div>

      <TemplateModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingTemplate(null); }}
        template={editingTemplate}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
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
  );
}
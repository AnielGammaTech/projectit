import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { FileStack, Plus, Edit2, Trash2, ListTodo, Package, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
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

  const handleCreateProject = async (template) => {
    const newProject = await base44.entities.Project.create({
      name: `New Project from ${template.name}`,
      status: 'planning',
      priority: 'medium'
    });
    
    // Create default tasks
    if (template.default_tasks?.length) {
      for (const task of template.default_tasks) {
        await base44.entities.Task.create({ ...task, project_id: newProject.id, status: 'todo' });
      }
    }
    
    // Create default parts
    if (template.default_parts?.length) {
      for (const part of template.default_parts) {
        await base44.entities.Part.create({ ...part, project_id: newProject.id, status: 'needed' });
      }
    }
    
    window.location.href = createPageUrl('ProjectDetail') + `?id=${newProject.id}`;
  };

  const templateColors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-500',
    'from-amber-500 to-orange-500',
    'from-green-500 to-emerald-500'
  ];

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
            {templates.map((template, idx) => {
              const colorClass = templateColors[idx % templateColors.length];
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all group"
                >
                  {/* Colored Header */}
                  <div className={`bg-gradient-to-r ${colorClass} p-4`}>
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur">
                        <FileStack className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setEditingTemplate(template); setShowModal(true); }}
                          className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteConfirm(template)}
                          className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">{template.description}</p>
                    )}

                    <div className="flex gap-3 mb-4">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <ListTodo className="w-3 h-3" />
                        {template.default_tasks?.length || 0} tasks
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {template.default_parts?.length || 0} parts
                      </Badge>
                    </div>

                    <Button 
                      onClick={() => handleCreateProject(template)}
                      className={`w-full bg-gradient-to-r ${colorClass} hover:opacity-90 text-white`}
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                </motion.div>
              );
            })}
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
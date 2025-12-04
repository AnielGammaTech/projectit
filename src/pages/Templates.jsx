import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { FileStack, Plus, Edit2, Trash2, ListTodo, Package, PlayCircle, FolderKanban, CheckSquare, MoreHorizontal, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TemplateModal from '@/components/modals/TemplateModal';

export default function Templates() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('project');
  const [newTemplateType, setNewTemplateType] = useState('project');
  const [createFromTemplate, setCreateFromTemplate] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.ProjectTemplate.list('-created_date')
  });

  // Separate templates by type
  const projectTemplates = templates.filter(t => t.template_type !== 'todo');
  const todoTemplates = templates.filter(t => t.template_type === 'todo');

  const handleSave = async (data) => {
    const templateData = { ...data, template_type: newTemplateType };
    if (editingTemplate) {
      await base44.entities.ProjectTemplate.update(editingTemplate.id, templateData);
    } else {
      await base44.entities.ProjectTemplate.create(templateData);
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

  const handleOpenCreateModal = (template) => {
    setCreateFromTemplate(template);
    setProjectName(`New Project from ${template.name}`);
  };

  const handleCreateProject = async () => {
    if (!createFromTemplate || !projectName.trim()) return;
    
    setCreating(true);
    
    // Get highest project number and increment
    const allProjects = await base44.entities.Project.list('-project_number', 1);
    const nextNumber = (allProjects[0]?.project_number || 1000) + 1;
    
    const newProject = await base44.entities.Project.create({
      name: projectName.trim(),
      status: 'planning',
      project_number: nextNumber
    });
    
    if (createFromTemplate.default_tasks?.length) {
      for (const task of createFromTemplate.default_tasks) {
        await base44.entities.Task.create({ ...task, project_id: newProject.id, status: 'todo' });
      }
    }
    
    if (createFromTemplate.default_parts?.length) {
      for (const part of createFromTemplate.default_parts) {
        await base44.entities.Part.create({ ...part, project_id: newProject.id, status: 'needed' });
      }
    }
    
    setCreating(false);
    setCreateFromTemplate(null);
    window.location.href = createPageUrl('ProjectDetail') + `?id=${newProject.id}`;
  };

  const handleNewTemplate = (type) => {
    setNewTemplateType(type);
    setEditingTemplate(null);
    setShowModal(true);
  };

  const handleEditTemplate = (template) => {
    setNewTemplateType(template.template_type || 'project');
    setEditingTemplate(template);
    setShowModal(true);
  };

  const TemplateCard = ({ template, index }) => {
    const isProject = template.template_type !== 'todo';
    
    return (
      <motion.div
        key={template.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.03 }}
        className={cn(
          "relative group rounded-2xl border-2 border-dashed p-5 transition-all cursor-pointer hover:shadow-lg",
          isProject 
            ? "border-[#0F2F44]/30 bg-[#0F2F44]/5 hover:border-[#0F2F44] hover:bg-[#0F2F44]/10" 
            : "border-emerald-400/30 bg-emerald-50/50 hover:border-emerald-500 hover:bg-emerald-50"
        )}
        onClick={() => handleOpenCreateModal(template)}
      >
        {/* Menu Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditTemplate(template); }}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteConfirm(template); }} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Template Icon */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
          isProject ? "bg-[#0F2F44]" : "bg-emerald-500"
        )}>
          {isProject ? (
            <FolderKanban className="w-5 h-5 text-white" />
          ) : (
            <CheckSquare className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Template Name */}
        <h3 className={cn(
          "font-semibold text-base mb-1 line-clamp-2",
          isProject ? "text-[#0F2F44]" : "text-emerald-700"
        )}>
          {template.name}
        </h3>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-slate-500 line-clamp-2 mb-3">{template.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-2 mt-auto">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
            isProject ? "bg-[#0F2F44]/10 text-[#0F2F44]" : "bg-emerald-100 text-emerald-700"
          )}>
            <ListTodo className="w-3 h-3" />
            {template.default_tasks?.length || 0}
          </div>
          {isProject && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">
              <Package className="w-3 h-3" />
              {template.default_parts?.length || 0}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const NewTemplateCard = ({ type }) => {
    const isProject = type === 'project';
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => handleNewTemplate(type)}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-5 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px]",
          isProject 
            ? "border-[#0F2F44]/20 hover:border-[#0F2F44] hover:bg-[#0F2F44]/5" 
            : "border-emerald-300/50 hover:border-emerald-500 hover:bg-emerald-50/50"
        )}
      >
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
          isProject ? "bg-[#0F2F44]/10" : "bg-emerald-100"
        )}>
          <Plus className={cn("w-6 h-6", isProject ? "text-[#0F2F44]" : "text-emerald-600")} />
        </div>
        <span className={cn("font-medium", isProject ? "text-[#0F2F44]" : "text-emerald-700")}>
          New Template
        </span>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">Project Templates</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Save yourself time by creating project templates with frequently-used tools, to-do lists, files, and more. 
            Anyone on your account who can create projects can use and edit these templates.
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger 
                value="project" 
                className="data-[state=active]:bg-[#0F2F44] data-[state=active]:text-white text-slate-600 px-6"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Project Templates
              </TabsTrigger>
              <TabsTrigger 
                value="todo" 
                className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-600 px-6"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                To-Do Templates
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Project Templates */}
          <TabsContent value="project">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <NewTemplateCard type="project" />
              {projectTemplates.map((template, idx) => (
                <TemplateCard key={template.id} template={template} index={idx} />
              ))}
            </div>
            {projectTemplates.length === 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-slate-500 mt-8"
              >
                No project templates yet. Create one to get started!
              </motion.p>
            )}
          </TabsContent>

          {/* To-Do Templates */}
          <TabsContent value="todo">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <NewTemplateCard type="todo" />
              {todoTemplates.map((template, idx) => (
                <TemplateCard key={template.id} template={template} index={idx} />
              ))}
            </div>
            {todoTemplates.length === 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-slate-500 mt-8"
              >
                No to-do templates yet. Create one to get started!
              </motion.p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TemplateModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingTemplate(null); }}
        template={editingTemplate}
        onSave={handleSave}
        templateType={newTemplateType}
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

      {/* Create Project from Template Modal */}
      <Dialog open={!!createFromTemplate} onOpenChange={(open) => !open && setCreateFromTemplate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project from Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="mt-2"
              autoFocus
            />
            {createFromTemplate && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">This template includes:</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm text-slate-700">
                    <ListTodo className="w-4 h-4 text-indigo-500" />
                    {createFromTemplate.default_tasks?.length || 0} tasks
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-700">
                    <Package className="w-4 h-4 text-amber-500" />
                    {createFromTemplate.default_parts?.length || 0} parts
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFromTemplate(null)} disabled={creating}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject} 
              disabled={!projectName.trim() || creating}
              className="bg-[#0F2F44] hover:bg-[#1a4a6e]"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { FileStack, Plus, Edit2, Trash2, ListTodo, Package, PlayCircle, FolderKanban, CheckSquare, MoreHorizontal, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import { toast } from 'sonner';
import ProjectModal from '@/components/modals/ProjectModal';

export default function Templates() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('project');
  const [createFromTemplate, setCreateFromTemplate] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.auth.me().then(user => { if (mounted) setCurrentUser(user); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.entities.ProjectTemplate.list('-created_date')
  });

  // Separate templates by type
  const projectTemplates = templates.filter(t => t.template_type !== 'todo');
  const todoTemplates = templates.filter(t => t.template_type === 'todo');

  const handleDelete = async () => {
    try {
      await api.entities.ProjectTemplate.delete(deleteConfirm.id);
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    } catch (err) {
      toast.error('Failed to delete template');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleOpenCreateModal = (template) => {
    setCreateFromTemplate(template);
  };

  const handleCreateProject = async (data, template, extractedParts) => {
    try {
      const allProjects = await api.entities.Project.list('-project_number', 1);
      const nextNumber = (allProjects[0]?.project_number || 1000) + 1;

      const allTags = await api.entities.ProjectTag.list();
      const inProgressTag = allTags.find(t => t.name === 'In Progress');

      const teamMembersList = currentUser?.email && !(data.team_members || []).includes(currentUser.email)
        ? [...(data.team_members || []), currentUser.email]
        : [...(data.team_members || [])];

      const newProject = await api.entities.Project.create({
        ...data,
        project_number: nextNumber,
        tags: inProgressTag ? [inProgressTag.id] : [],
        team_members: teamMembersList
      });

      for (const memberEmail of teamMembersList) {
        if (memberEmail !== currentUser?.email) {
          try {
            await api.entities.UserNotification.create({
              user_email: memberEmail,
              type: 'project_assigned',
              title: 'You have been added to a project',
              message: `${currentUser?.full_name || currentUser?.email} added you to "${newProject.name}"`,
              project_id: newProject.id,
              project_name: newProject.name,
              from_user_email: currentUser?.email,
              from_user_name: currentUser?.full_name || currentUser?.email,
              link: `/ProjectDetail?id=${newProject.id}`,
              is_read: false
            });
            await api.functions.invoke('sendNotificationEmail', {
              to: memberEmail,
              type: 'project_assigned',
              title: 'You have been added to a project',
              message: `${currentUser?.full_name || currentUser?.email} added you to "${newProject.name}"`,
              projectId: newProject.id,
              projectName: newProject.name,
              fromUserName: currentUser?.full_name || currentUser?.email,
              link: `${window.location.origin}/ProjectDetail?id=${newProject.id}`
            });
          } catch {/* notify failure non-critical */}
        }
      }

      // Apply template content (groups → tasks → parts → messages)
      const groupIdMap = {};
      if (template?.default_groups?.length) {
        for (const group of template.default_groups) {
          const created = await api.entities.TaskGroup.create({
            name: group.name,
            color: group.color,
            project_id: newProject.id
          });
          if (group._template_id) groupIdMap[group._template_id] = created.id;
        }
      }

      if (template?.default_tasks?.length) {
        for (const task of template.default_tasks) {
          const taskData = { ...task, project_id: newProject.id, status: 'todo' };
          if (taskData.group_id && groupIdMap[taskData.group_id]) {
            taskData.group_id = String(groupIdMap[taskData.group_id]);
          } else {
            delete taskData.group_id;
          }
          await api.entities.Task.create(taskData);
        }
      }

      if (template?.default_parts?.length) {
        for (const part of template.default_parts) {
          await api.entities.Part.create({ ...part, project_id: newProject.id, status: 'needed' });
        }
      }

      if (template?.default_messages?.length) {
        for (const msg of template.default_messages) {
          await api.entities.ProjectNote.create({
            project_id: newProject.id,
            title: msg.title || '',
            content: msg.content || '',
            type: msg.type || 'note'
          });
        }
      }

      if (extractedParts?.length) {
        for (const part of extractedParts) {
          await api.entities.Part.create({ ...part, project_id: newProject.id, status: 'needed' });
        }
      }

      setCreateFromTemplate(null);
      navigate(createPageUrl('ProjectDetail') + `?id=${newProject.id}`);
    } catch (err) {
      toast.error('Failed to create project. Please try again.');
      setCreateFromTemplate(null);
    }
  };

  const handleNewTemplate = () => {
    navigate(createPageUrl('TemplateEditor'));
  };

  const handleEditTemplate = (template) => {
    navigate(createPageUrl('TemplateEditor') + `?id=${template.id}`);
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
            ? "border-primary/30 bg-muted/50 hover:border-primary hover:bg-muted dark:bg-slate-700/30 dark:border-slate-600/50 dark:hover:border-slate-500 dark:hover:bg-slate-700/50"
            : "border-emerald-400/30 bg-emerald-50/50 hover:border-emerald-500 hover:bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700/50 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/30"
        )}
        onClick={() => handleOpenCreateModal(template)}
      >
        {/* Menu Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-card/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card shadow-sm"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
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
          isProject ? "bg-primary" : "bg-emerald-500"
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
          isProject ? "text-foreground" : "text-emerald-700 dark:text-emerald-300"
        )}>
          {template.name}
        </h3>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{template.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-2 mt-auto">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
            isProject ? "bg-muted text-foreground dark:bg-slate-700/50 dark:text-slate-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          )}>
            <ListTodo className="w-3 h-3" />
            {template.default_tasks?.length || 0}
          </div>
          {isProject && (
            <>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                <Package className="w-3 h-3" />
                {template.default_parts?.length || 0}
              </div>
              {(template.default_messages?.length || 0) > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 text-xs font-medium">
                  <MessageSquare className="w-3 h-3" />
                  {template.default_messages.length}
                </div>
              )}
            </>
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
        onClick={() => handleNewTemplate()}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-5 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px]",
          isProject
            ? "border-primary/20 hover:border-primary hover:bg-muted/50 dark:border-slate-600/50 dark:hover:border-slate-500 dark:hover:bg-slate-700/30"
            : "border-emerald-300/50 hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-emerald-700/50 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20"
        )}
      >
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
          isProject ? "bg-muted" : "bg-emerald-100 dark:bg-emerald-900/30"
        )}>
          <Plus className={cn("w-6 h-6", isProject ? "text-foreground" : "text-emerald-600 dark:text-emerald-400")} />
        </div>
        <span className={cn("font-medium", isProject ? "text-foreground" : "text-emerald-700 dark:text-emerald-300")}>
          New Template
        </span>
      </motion.div>
    );
  };

  if (loadingTemplates) return <CardGridSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">Project Templates</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Save yourself time by creating project templates with frequently-used tools, to-do lists, files, and more.
            Anyone on your account who can create projects can use and edit these templates.
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-muted dark:bg-slate-700/50 p-1">
              <TabsTrigger
                value="project"
                className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground px-6"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Project Templates
              </TabsTrigger>
              <TabsTrigger
                value="todo"
                className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-muted-foreground px-6"
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
                className="text-center text-muted-foreground mt-8"
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
                className="text-center text-muted-foreground mt-8"
              >
                No to-do templates yet. Create one to get started!
              </motion.p>
            )}
          </TabsContent>
        </Tabs>
      </div>

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

      {/* Create Project from Template — uses ProjectModal for richer UX */}
      <ProjectModal
        open={!!createFromTemplate}
        onClose={() => setCreateFromTemplate(null)}
        templates={templates}
        prefillTemplateId={createFromTemplate?.id || null}
        onSave={handleCreateProject}
        currentUserEmail={currentUser?.email}
      />
    </div>
  );
}

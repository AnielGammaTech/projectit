import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Edit2, 
  CheckCircle2,
  ListTodo,
  Package,
  Plus,
  MessageSquare,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

import ProgressNeedle from '@/components/project/ProgressNeedle';
import TeamAvatars from '@/components/project/TeamAvatars';
import TaskModal from '@/components/modals/TaskModal';
import TaskDetailModal from '@/components/modals/TaskDetailModal';
import TasksViewModal from '@/components/modals/TasksViewModal';
import PartModal from '@/components/modals/PartModal';
import PartsViewModal from '@/components/modals/PartsViewModal';
import NotesViewModal from '@/components/modals/NotesViewModal';
import ProjectModal from '@/components/modals/ProjectModal';
import GroupModal from '@/components/modals/GroupModal';
import FilesViewModal from '@/components/modals/FilesViewModal';
import { cn } from '@/lib/utils';

const statusColors = {
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  on_hold: 'bg-slate-50 text-slate-700 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const statusOptions = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' }
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const priorityColors = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200'
};

export default function ProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showTasksView, setShowTasksView] = useState(false);
  const [showPartsView, setShowPartsView] = useState(false);
  const [showNotesView, setShowNotesView] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showFilesView, setShowFilesView] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, item: null });

  const { data: project, isLoading: loadingProject, refetch: refetchProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: taskGroups = [], refetch: refetchGroups } = useQuery({
    queryKey: ['taskGroups', projectId],
    queryFn: () => base44.entities.TaskGroup.filter({ project_id: projectId }),
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

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.ProjectTemplate.list()
  });

  // Tasks
  const handleSaveTask = async (data) => {
    if (editingTask) {
      await base44.entities.Task.update(editingTask.id, data);
    } else {
      await base44.entities.Task.create(data);
    }
    refetchTasks();
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleTaskStatusChange = async (task, status) => {
    await base44.entities.Task.update(task.id, { ...task, status });
    refetchTasks();
  };

  // Groups
  const handleCreateGroup = async (data) => {
    await base44.entities.TaskGroup.create({ ...data, project_id: projectId });
    refetchGroups();
  };

  const handleSaveGroup = async (data) => {
    if (editingGroup) {
      await base44.entities.TaskGroup.update(editingGroup.id, data);
    } else {
      await base44.entities.TaskGroup.create(data);
    }
    refetchGroups();
    setShowGroupModal(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (group) => {
    await base44.entities.TaskGroup.delete(group.id);
    // Ungroup tasks
    const groupTasks = tasks.filter(t => t.group_id === group.id);
    for (const task of groupTasks) {
      await base44.entities.Task.update(task.id, { ...task, group_id: '' });
    }
    refetchGroups();
    refetchTasks();
  };

  // Parts
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

  const handlePartStatusChange = async (part, status) => {
    await base44.entities.Part.update(part.id, { ...part, status });
    refetchParts();
  };

  // Project
  const handleUpdateProject = async (data) => {
    await base44.entities.Project.update(projectId, data);
    // Auto-archive when completed
    if (data.status === 'completed') {
      await base44.entities.Project.update(projectId, { ...data, status: 'archived' });
    }
    refetchProject();
    setShowProjectModal(false);
  };

  // Quick inline update
  const handleQuickUpdate = async (field, value) => {
    await base44.entities.Project.update(projectId, { ...project, [field]: value });
    refetchProject();
  };

  const handleTeamUpdate = async (emails) => {
    await base44.entities.Project.update(projectId, { ...project, team_members: emails });
    refetchProject();
  };

  // Save as Template
  const handleSaveAsTemplate = async () => {
    const templateData = {
      name: `${project.name} Template`,
      description: project.description || '',
      default_tasks: tasks.map(t => ({
        title: t.title,
        description: t.description || '',
        priority: t.priority || 'medium'
      })),
      default_parts: parts.map(p => ({
        name: p.name,
        part_number: p.part_number || '',
        quantity: p.quantity || 1
      }))
    };
    await base44.entities.ProjectTemplate.create(templateData);
    alert('Project saved as template!');
  };

  // Archive project
  const handleArchiveProject = async () => {
    await base44.entities.Project.update(projectId, { ...project, status: 'archived' });
    window.location.href = createPageUrl('Dashboard');
  };

  // Delete project
  const handleDeleteProject = async () => {
    if (confirm('Are you sure you want to delete this project? This will also delete all tasks, parts, and notes.')) {
      // Delete related items
      for (const task of tasks) await base44.entities.Task.delete(task.id);
      for (const part of parts) await base44.entities.Part.delete(part.id);
      for (const group of taskGroups) await base44.entities.TaskGroup.delete(group.id);
      await base44.entities.Project.delete(projectId);
      window.location.href = createPageUrl('Dashboard');
    }
  };

  // Progress update
  const handleProgressUpdate = async (progressValue) => {
    await base44.entities.Project.update(projectId, { ...project, progress: progressValue });
    refetchProject();
  };

  // Delete
  const handleDelete = async () => {
    const { type, item } = deleteConfirm;
    if (type === 'task') {
      await base44.entities.Task.delete(item.id);
      refetchTasks();
    } else if (type === 'part') {
      await base44.entities.Part.delete(item.id);
      refetchParts();
    }
    setDeleteConfirm({ open: false, type: null, item: null });
  };

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Project not found</h2>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link to={createPageUrl('Dashboard')} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Progress Needle at Top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <ProgressNeedle 
            projectId={projectId} 
            value={project.progress || 0} 
            onSave={handleProgressUpdate} 
            currentUser={currentUser}
          />
        </motion.div>

        {/* Project Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {/* Inline Status Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge variant="outline" className={cn("cursor-pointer hover:opacity-80", statusColors[project.status])}>
                      {project.status?.replace('_', ' ')}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {statusOptions.map((opt) => (
                      <DropdownMenuItem key={opt.value} onClick={() => handleQuickUpdate('status', opt.value)}>
                        <Badge className={cn("mr-2", statusColors[opt.value])}>{opt.label}</Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Inline Priority Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge variant="outline" className={cn("cursor-pointer hover:opacity-80", priorityColors[project.priority])}>
                      {project.priority} priority
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {priorityOptions.map((opt) => (
                      <DropdownMenuItem key={opt.value} onClick={() => handleQuickUpdate('priority', opt.value)}>
                        <Badge className={cn("mr-2", priorityColors[opt.value])}>{opt.label}</Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{project.name}</h1>
              {project.client && <p className="text-slate-500 mb-4">{project.client}</p>}
              {project.description && <p className="text-slate-600 mb-4">{project.description}</p>}

              <div className="flex flex-wrap gap-4 text-sm">
                {project.start_date && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>Start: {format(new Date(project.start_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {project.due_date && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {format(new Date(project.due_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>

              {/* Team Avatars */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <TeamAvatars
                  members={project.team_members || []}
                  teamMembers={teamMembers}
                  onUpdate={handleTeamUpdate}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowProjectModal(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSaveAsTemplate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Save as Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleArchiveProject}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDeleteProject} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks Card - Clickable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setShowTasksView(true)}
          >
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-indigo-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
                    <ListTodo className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Tasks</h3>
                    <p className="text-sm text-slate-500">{completedTasks}/{tasks.length} completed</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setEditingTask(null); setShowTaskModal(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tasks.length > 0 && (
                <div className="mt-4">
                  <Progress value={taskProgress} className="h-2" />
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-500 text-center">Click to view all tasks by group</p>
              {taskGroups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                  {taskGroups.map(g => (
                    <Badge key={g.id} variant="outline" className="text-xs">{g.name}</Badge>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Parts Card - Clickable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setShowPartsView(true)}
          >
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500 shadow-lg shadow-amber-200">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Parts</h3>
                    <p className="text-sm text-slate-500">{parts.length} items tracked</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setEditingPart(null); setShowPartModal(true); }}
                  className="bg-amber-500 hover:bg-amber-600 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-500 text-center">Click to view all parts</p>
              {parts.filter(p => p.assigned_to).length > 0 && (
                <p className="text-xs text-slate-400 text-center mt-1">
                  {parts.filter(p => p.assigned_to).length} assigned
                </p>
              )}
            </div>
          </motion.div>

          {/* Notes & Messages Card - Clickable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setShowNotesView(true)}
          >
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-100/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-600 shadow-lg shadow-violet-200">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Notes & Messages</h3>
                  <p className="text-sm text-slate-500">Project communication</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-500 text-center">Click to view notes & messages</p>
            </div>
          </motion.div>

          {/* Files Card - Clickable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setShowFilesView(true)}
          >
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-100/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-600 shadow-lg shadow-teal-200">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Documents & Files</h3>
                  <p className="text-sm text-slate-500">Upload and manage files</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-500 text-center">Click to view files</p>
            </div>
          </motion.div>
          </div>
      </div>

      {/* Modals */}
      <ProjectModal
        open={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        project={project}
        templates={templates}
        onSave={handleUpdateProject}
      />

      <TaskModal
        open={showTaskModal}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        task={editingTask}
        projectId={projectId}
        teamMembers={teamMembers}
        groups={taskGroups}
        onSave={handleSaveTask}
      />

      <PartModal
        open={showPartModal}
        onClose={() => { setShowPartModal(false); setEditingPart(null); }}
        part={editingPart}
        projectId={projectId}
        teamMembers={teamMembers}
        onSave={handleSavePart}
      />

      <PartsViewModal
        open={showPartsView}
        onClose={() => setShowPartsView(false)}
        parts={parts}
        projectId={projectId}
        onAdd={() => { setShowPartsView(false); setEditingPart(null); setShowPartModal(true); }}
        onEdit={(part) => { setShowPartsView(false); setEditingPart(part); setShowPartModal(true); }}
        onDelete={(part) => setDeleteConfirm({ open: true, type: 'part', item: part })}
        onStatusChange={handlePartStatusChange}
        onPartsExtracted={refetchParts}
      />

      <NotesViewModal
        open={showNotesView}
        onClose={() => setShowNotesView(false)}
        projectId={projectId}
        currentUser={currentUser}
        teamMembers={teamMembers}
        onTasksCreated={refetchTasks}
      />

      <TasksViewModal
        open={showTasksView}
        onClose={() => setShowTasksView(false)}
        tasks={tasks}
        groups={taskGroups}
        teamMembers={teamMembers}
        currentUser={currentUser}
        onStatusChange={handleTaskStatusChange}
        onEdit={(task) => { setShowTasksView(false); setEditingTask(task); setShowTaskModal(true); }}
        onDelete={(task) => setDeleteConfirm({ open: true, type: 'task', item: task })}
        onTaskClick={(task) => { setShowTasksView(false); setSelectedTask(task); }}
        onCreateGroup={handleCreateGroup}
        onEditGroup={(group) => { setEditingGroup(group); setShowGroupModal(true); }}
        onDeleteGroup={handleDeleteGroup}
        onAddTask={() => { setShowTasksView(false); setEditingTask(null); setShowTaskModal(true); }}
        currentUserEmail={currentUser?.email}
      />

      <GroupModal
        open={showGroupModal}
        onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
        group={editingGroup}
        projectId={projectId}
        onSave={handleSaveGroup}
      />

      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        teamMembers={teamMembers}
        currentUser={currentUser}
        onEdit={(task) => { setSelectedTask(null); setEditingTask(task); setShowTaskModal(true); }}
      />

      <FilesViewModal
        open={showFilesView}
        onClose={() => setShowFilesView(false)}
        projectId={projectId}
        currentUser={currentUser}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, type: null, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm.type}?</AlertDialogTitle>
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
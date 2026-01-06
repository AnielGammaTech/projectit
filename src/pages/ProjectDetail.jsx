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
  FileText,
  Clock,
  GanttChart,
  Truck,
  CircleDot,
  Folder,
  File,
  Users,
  Globe,
  RotateCcw,
  Tag
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
import ProjectActivityFeed from '@/components/project/ProjectActivityFeed';
import UpcomingDueDates from '@/components/project/UpcomingDueDates';
import TimeTracker from '@/components/project/TimeTracker';
import HaloPSATicketLink from '@/components/project/HaloPSATicketLink';
import ProjectInsightsWidget from '@/components/dashboard/ProjectInsightsWidget';
import ProjectSidebar from '@/components/project/ProjectSidebar';
import UpcomingTasksWidget from '@/components/project/UpcomingTasksWidget';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';
import { logActivity, ActivityActions } from '@/components/project/ActivityLogger';
import ArchiveProjectModal from '@/components/modals/ArchiveProjectModal';
import { cn } from '@/lib/utils';

const statusColors = {
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  on_hold: 'bg-slate-50 text-slate-700 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const statusOptions = [
  { value: 'planning', label: 'Planning' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' }
];

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
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const { data: projectNotes = [] } = useQuery({
    queryKey: ['projectNotes', projectId],
    queryFn: () => base44.entities.ProjectNote.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: projectFiles = [] } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => base44.entities.ProjectFile.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: fileFolders = [] } = useQuery({
    queryKey: ['fileFolders', projectId],
    queryFn: () => base44.entities.FileFolder.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: progressUpdates = [] } = useQuery({
    queryKey: ['progressUpdates', projectId],
    queryFn: () => base44.entities.ProgressUpdate.filter({ project_id: projectId }, '-created_date', 10),
    enabled: !!projectId
  });

  const { data: integrationSettings } = useQuery({
    queryKey: ['integrationSettings'],
    queryFn: async () => {
      const settings = await base44.entities.IntegrationSettings.filter({ setting_key: 'main' });
      return settings[0] || {};
    }
  });

  const { data: linkedQuote } = useQuery({
    queryKey: ['linkedQuote', project?.incoming_quote_id],
    queryFn: async () => {
      if (!project?.incoming_quote_id) return null;
      const quotes = await base44.entities.IncomingQuote.filter({ id: project.incoming_quote_id });
      return quotes[0];
    },
    enabled: !!project?.incoming_quote_id
  });

  const { data: appSettings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const settings = await base44.entities.ProposalSettings.filter({ setting_key: 'main' });
      return settings[0] || {};
    }
  });

  const { data: projectTags = [] } = useQuery({
    queryKey: ['projectTags'],
    queryFn: () => base44.entities.ProjectTag.list()
  });

  const appLogoUrl = appSettings?.app_logo_url;

  const tagColors = {
    slate: 'bg-slate-100 text-slate-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    amber: 'bg-amber-100 text-amber-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    lime: 'bg-lime-100 text-lime-700',
    green: 'bg-green-100 text-green-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    teal: 'bg-teal-100 text-teal-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    sky: 'bg-sky-100 text-sky-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    violet: 'bg-violet-100 text-violet-700',
    purple: 'bg-purple-100 text-purple-700',
    fuchsia: 'bg-fuchsia-100 text-fuchsia-700',
    pink: 'bg-pink-100 text-pink-700',
    rose: 'bg-rose-100 text-rose-700',
  };

  const getProjectTags = () => {
    if (!project?.tags || project.tags.length === 0) return [];
    return project.tags.map(tagId => projectTags.find(t => t.id === tagId)).filter(Boolean);
  };

  // Tasks
    const handleSaveTask = async (data) => {
      const wasAssigned = editingTask?.assigned_to;
      const isNewlyAssigned = data.assigned_to && data.assigned_to !== 'unassigned' && data.assigned_to !== wasAssigned;

      if (editingTask) {
        await base44.entities.Task.update(editingTask.id, data);
        await logActivity(projectId, ActivityActions.TASK_UPDATED, `updated task "${data.title}"`, currentUser, 'task', editingTask.id);
      } else {
        const newTask = await base44.entities.Task.create(data);
        await logActivity(projectId, ActivityActions.TASK_CREATED, `created task "${data.title}"`, currentUser, 'task', newTask.id);
      }

      // Send notification if task is newly assigned to someone
      if (isNewlyAssigned && data.assigned_to !== currentUser?.email) {
        try {
          // Create in-app notification
          await base44.entities.UserNotification.create({
            user_email: data.assigned_to,
            type: 'task_assigned',
            title: 'New task assigned to you',
            message: `"${data.title}" has been assigned to you by ${currentUser?.full_name || currentUser?.email}`,
            project_id: projectId,
            project_name: project?.name,
            from_user_email: currentUser?.email,
            from_user_name: currentUser?.full_name || currentUser?.email,
            link: `/ProjectDetail?id=${projectId}`,
            is_read: false
          });

          // Send email notification via Resend
          await base44.functions.invoke('sendNotificationEmail', {
            to: data.assigned_to,
            type: 'task_assigned',
            title: 'New task assigned to you',
            message: `"${data.title}" has been assigned to you by ${currentUser?.full_name || currentUser?.email}`,
            projectId: projectId,
            projectName: project?.name,
            fromUserName: currentUser?.full_name || currentUser?.email,
            link: `${window.location.origin}/ProjectDetail?id=${projectId}`
          });
        } catch (notifErr) {
          console.error('Failed to send task notification:', notifErr);
        }
      }

      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ['projectActivity', projectId] });
      setShowTaskModal(false);
      setEditingTask(null);
    };

  const handleTaskStatusChange = async (task, status) => {
    await base44.entities.Task.update(task.id, { ...task, status });
    if (status === 'completed') {
      await logActivity(projectId, ActivityActions.TASK_COMPLETED, `completed task "${task.title}"`, currentUser, 'task', task.id);

      // Notify people who should be notified on task completion
      if (task.notify_on_complete?.length > 0) {
        for (const email of task.notify_on_complete) {
          if (email !== currentUser?.email) {
            try {
              await base44.entities.UserNotification.create({
                user_email: email,
                type: 'task_completed',
                title: 'Task completed',
                message: `"${task.title}" was completed by ${currentUser?.full_name || currentUser?.email}`,
                project_id: projectId,
                project_name: project?.name,
                from_user_email: currentUser?.email,
                from_user_name: currentUser?.full_name || currentUser?.email,
                link: `/ProjectDetail?id=${projectId}`,
                is_read: false
              });

              await base44.functions.invoke('sendNotificationEmail', {
                to: email,
                type: 'task_completed',
                title: 'Task completed',
                message: `"${task.title}" was completed by ${currentUser?.full_name || currentUser?.email}`,
                projectId: projectId,
                projectName: project?.name,
                fromUserName: currentUser?.full_name || currentUser?.email,
                link: `${window.location.origin}/ProjectDetail?id=${projectId}`
              });
            } catch (err) {
              console.error('Failed to send completion notification:', err);
            }
          }
        }
      }
    } else {
      await logActivity(projectId, ActivityActions.TASK_UPDATED, `changed task "${task.title}" status to ${status.replace('_', ' ')}`, currentUser, 'task', task.id);
    }
    refetchTasks();
    queryClient.invalidateQueries({ queryKey: ['projectActivity', projectId] });
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
      await logActivity(projectId, ActivityActions.PART_UPDATED, `updated part "${data.name}"`, currentUser, 'part', editingPart.id);
    } else {
      const newPart = await base44.entities.Part.create(data);
      await logActivity(projectId, ActivityActions.PART_CREATED, `added part "${data.name}"`, currentUser, 'part', newPart.id);
    }
    refetchParts();
    queryClient.invalidateQueries({ queryKey: ['projectActivity', projectId] });
    setShowPartModal(false);
    setEditingPart(null);
  };

  const handlePartStatusChange = async (part, status) => {
    await base44.entities.Part.update(part.id, { ...part, status });
    const actionMap = {
      ordered: ActivityActions.PART_ORDERED,
      received: ActivityActions.PART_RECEIVED,
      installed: ActivityActions.PART_INSTALLED
    };
    await logActivity(projectId, actionMap[status] || ActivityActions.PART_UPDATED, `changed part "${part.name}" status to ${status}`, currentUser, 'part', part.id);

    // Notify assigned installer when part is ready to install
    if (status === 'ready_to_install' && part.installer_email && part.installer_email !== currentUser?.email) {
      try {
        await base44.entities.UserNotification.create({
          user_email: part.installer_email,
          type: 'part_status',
          title: 'Part ready for installation',
          message: `"${part.name}" is now ready to be installed`,
          project_id: projectId,
          project_name: project?.name,
          from_user_email: currentUser?.email,
          from_user_name: currentUser?.full_name || currentUser?.email,
          link: `/ProjectDetail?id=${projectId}`,
          is_read: false
        });

        await base44.functions.invoke('sendNotificationEmail', {
          to: part.installer_email,
          type: 'part_status',
          title: 'Part ready for installation',
          message: `"${part.name}" is now ready to be installed`,
          projectId: projectId,
          projectName: project?.name,
          fromUserName: currentUser?.full_name || currentUser?.email,
          link: `${window.location.origin}/ProjectDetail?id=${projectId}`
        });
      } catch (err) {
        console.error('Failed to send part notification:', err);
      }
    }

    refetchParts();
    queryClient.invalidateQueries({ queryKey: ['projectActivity', projectId] });
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
  const handleArchiveProject = async (archiveData) => {
    await base44.entities.Project.update(projectId, { 
      ...project, 
      status: 'archived',
      archive_reason: archiveData.reason,
      archive_type: archiveData.archiveType,
      archived_date: new Date().toISOString()
    });
    await logActivity(projectId, 'project_archived', `archived project: ${archiveData.reason}`, currentUser);
    setShowArchiveModal(false);
    window.location.href = createPageUrl('Dashboard');
  };

  // Move project to trash (soft delete)
  const handleDeleteProject = async () => {
    await base44.entities.Project.update(projectId, {
      status: 'deleted',
      deleted_date: new Date().toISOString()
    });
    await logActivity(projectId, 'project_deleted', `moved project to trash`, currentUser);
    setShowDeleteConfirm(false);
    window.location.href = createPageUrl('Dashboard');
  };

  // Progress update
  const handleProgressUpdate = async (progressValue) => {
    await base44.entities.Project.update(projectId, { ...project, progress: progressValue });
    await logActivity(projectId, ActivityActions.PROGRESS_UPDATED, `updated progress to ${progressValue}%`, currentUser);
    refetchProject();
    queryClient.invalidateQueries({ queryKey: ['projectActivity', projectId] });
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
      <ProjectNavHeader project={project} currentPage="ProjectDetail" />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Archived Banner */}
        {(project.status === 'archived' || project.status === 'completed') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Archive className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">This project is archived</p>
                {project.archive_reason && (
                  <p className="text-sm text-amber-600">{project.archive_reason}</p>
                )}
              </div>
            </div>
            <Button
              onClick={async () => {
                await base44.entities.Project.update(projectId, { 
                  status: 'planning',
                  archive_reason: '',
                  archive_type: '',
                  archived_date: ''
                });
                refetchProject();
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Restore Project
            </Button>
          </motion.div>
        )}

        {/* Project Header - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Status + Project Number Row */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {project.project_number && (
                  <span className="px-2 py-0.5 bg-slate-800 text-white rounded text-xs font-mono font-semibold">
                    #{project.project_number}
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all",
                      project.status === 'planning' && "bg-amber-100 text-amber-700",
                      project.status === 'on_hold' && "bg-slate-100 text-slate-700",
                      project.status === 'completed' && "bg-emerald-100 text-emerald-700"
                    )}>
                      {project.status === 'planning' && 'planning'}
                      {project.status === 'on_hold' && 'on hold'}
                      {project.status === 'completed' && 'completed'}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {statusOptions.map((opt) => (
                      <DropdownMenuItem key={opt.value} onClick={() => handleQuickUpdate('status', opt.value)} className="cursor-pointer">
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Project Title */}
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>

              {project.client && (
                <Link 
                  to={createPageUrl('Customers') + (project.customer_id ? `?view=${project.customer_id}` : '')} 
                  className="text-[#0069AF] hover:underline text-sm block"
                >
                  {project.client} →
                </Link>
              )}

              {(integrationSettings?.quoteit_api_url && (project.quoteit_quote_id || linkedQuote?.quoteit_id)) && (
                <a 
                  href={`${integrationSettings.quoteit_api_url}/QuoteView?id=${project.quoteit_quote_id || linkedQuote?.quoteit_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors border border-orange-200"
                >
                  <FileText className="w-3 h-3" />
                  View Quote on QuoteIT
                </a>
              )}

              {project.description && <p className="text-slate-600 text-sm mt-2">{project.description}</p>}

              {/* Team Avatars */}
              <div className="mt-3">
                <TeamAvatars
                  members={project.team_members || []}
                  teamMembers={teamMembers}
                  onUpdate={handleTeamUpdate}
                />
              </div>
            </div>

            {/* Actions Row */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <HaloPSATicketLink 
                  project={project} 
                  onUpdate={refetchProject}
                />
                <TimeTracker 
                  projectId={projectId} 
                  currentUser={currentUser} 
                  timeBudgetHours={project.time_budget_hours || 0} 
                />
                <Button variant="outline" size="sm" onClick={() => setShowProjectModal(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.location.href = createPageUrl('TimeReport') + `?project_id=${projectId}`}>
                    <Clock className="w-4 h-4 mr-2" />
                    Time Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSaveAsTemplate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Save as Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowArchiveModal(true)}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive Project
                    </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Move to Trash
                  </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>

                <div className="flex items-stretch gap-4">
                  {/* Upcoming Tasks Widget */}
                  <div className="hidden xl:block w-[300px]">
                    <UpcomingTasksWidget projectId={projectId} tasks={tasks} />
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full max-w-xs">
                    <ProgressNeedle 
                      projectId={projectId} 
                      value={project.progress || 0} 
                      onSave={handleProgressUpdate} 
                      currentUser={currentUser}
                      onStatusChange={(status) => handleQuickUpdate('status', status)}
                      halopsaTicketId={project.halopsa_ticket_id}
                      hasUpdates={progressUpdates.length > 0}
                      lastUpdateNote={progressUpdates[0]?.note}
                    />
                  </div>
                </div>
                </div>
                </div>
                </motion.div>

      {/* Cards Grid with Sidebar */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Main Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
          {/* Tasks Card - Clickable */}
          <Link to={createPageUrl('ProjectTasks') + `?id=${projectId}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all"
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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingTask(null); setShowTaskModal(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

            </div>
            <div className="p-4">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">{completedTasks}</span>
                  <span className="text-slate-400">done</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <CircleDot className="w-4 h-4" />
                  <span className="font-medium">{tasks.length - completedTasks}</span>
                  <span className="text-slate-400">remaining</span>
                </div>
              </div>
            </div>
          </motion.div>
          </Link>

          {/* Parts Card - Clickable */}
          <Link to={createPageUrl('ProjectParts') + `?id=${projectId}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all"
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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingPart(null); setShowPartModal(true); }}
                  className="bg-amber-500 hover:bg-amber-600 shadow-md flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-center gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-1 text-blue-600">
                  <Package className="w-3.5 h-3.5" />
                  <span className="font-medium">{parts.filter(p => p.status === 'ordered').length}</span>
                  <span className="text-slate-400">ordered</span>
                </div>
                <div className="flex items-center gap-1 text-amber-600">
                  <Truck className="w-3.5 h-3.5" />
                  <span className="font-medium">{parts.filter(p => p.status === 'received' || p.status === 'ready_to_install').length}</span>
                  <span className="text-slate-400">received</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="font-medium">{parts.filter(p => p.status === 'installed').length}</span>
                  <span className="text-slate-400">installed</span>
                </div>
              </div>
            </div>
          </motion.div>
          </Link>

          {/* Messages & Meetings Card - Clickable */}
          <Link to={createPageUrl('ProjectNotes') + `?id=${projectId}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-100/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-600 shadow-lg shadow-violet-200">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Messages & Meetings</h3>
                  <p className="text-sm text-slate-500">Project communication</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-violet-600">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium">{projectNotes.filter(n => n.type === 'message' || n.type === 'note').length}</span>
                  <span className="text-slate-400">messages</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{projectNotes.filter(n => n.type === 'update').length}</span>
                  <span className="text-slate-400">meetings</span>
                </div>
              </div>
            </div>
          </motion.div>
          </Link>

          {/* Files Card - Clickable */}
          <Link to={createPageUrl('ProjectFiles') + `?id=${projectId}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all"
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
              <div className="flex items-center justify-center gap-4 text-sm">
                {fileFolders.length > 0 && (
                  <div className="flex items-center gap-1.5 text-teal-600">
                    <Folder className="w-4 h-4" />
                    <span className="font-medium">{fileFolders.length}</span>
                    <span className="text-slate-400">folders</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-slate-600">
                  <File className="w-4 h-4" />
                  <span className="font-medium">{projectFiles.length}</span>
                  <span className="text-slate-400">files</span>
                </div>
              </div>
            </div>
          </motion.div>
          </Link>

          {/* AI Project Assistant Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-fit"
          >
            <ProjectInsightsWidget projectId={projectId} tasks={tasks} parts={parts} />
          </motion.div>

          </div>

        {/* Sidebar - Calendar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="hidden lg:block"
        >
          <ProjectSidebar projectId={projectId} tasks={tasks} parts={parts} />
        </motion.div>
        </div>

      {/* Activity Feed - Full Width Below */}
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
              <h3 className="font-semibold text-slate-900 text-lg">Recent Activity</h3>
              <p className="text-sm text-slate-500">Track all project updates and changes</p>
            </div>
            <div className="p-6">
              <ProjectActivityFeed projectId={projectId} progressUpdates={progressUpdates} />
            </div>
          </div>
      </motion.div>

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
        projectId={projectId}
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
        onTasksRefresh={refetchTasks}
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

      {/* Archive Project Modal */}
      <ArchiveProjectModal
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        project={project}
        onConfirm={handleArchiveProject}
      />

      {/* Delete Task/Part Confirmation */}
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

      {/* Delete Project Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{project?.name}" will be moved to the trash. You can restore it later from Adminland → Deleted Projects.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Move to Trash
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      </div>
      );
      }
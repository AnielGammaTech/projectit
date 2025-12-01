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
  Plus
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
import { format } from 'date-fns';

import TaskList from '@/components/project/TaskList';
import PartsList from '@/components/project/PartsList';
import TaskModal from '@/components/modals/TaskModal';
import TaskDetailModal from '@/components/modals/TaskDetailModal';
import PartModal from '@/components/modals/PartModal';
import ProjectModal from '@/components/modals/ProjectModal';

const statusColors = {
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  on_hold: 'bg-slate-50 text-slate-700 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

export default function ProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const [activeTab, setActiveTab] = useState('tasks');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
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

  const { data: parts = [], refetch: refetchParts } = useQuery({
    queryKey: ['parts', projectId],
    queryFn: () => base44.entities.Part.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
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
    refetchProject();
    setShowProjectModal(false);
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
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link to={createPageUrl('Dashboard')} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Project Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className={statusColors[project.status]}>
                  {project.status?.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="border-slate-200">
                  {project.priority} priority
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{project.name}</h1>
              {project.client && (
                <p className="text-slate-500 mb-4">{project.client}</p>
              )}
              {project.description && (
                <p className="text-slate-600 mb-4">{project.description}</p>
              )}

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
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowProjectModal(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>

          {/* Progress */}
          {tasks.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Overall Progress</span>
                <span className="font-medium">{completedTasks}/{tasks.length} tasks • {Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

        </motion.div>

        {/* Enhanced Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
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
                  onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tasks.length > 0 && (
                <div className="mt-4">
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto">
              <TaskList
                tasks={tasks}
                onStatusChange={handleTaskStatusChange}
                onEdit={(task) => { setEditingTask(task); setShowTaskModal(true); }}
                onDelete={(task) => setDeleteConfirm({ open: true, type: 'task', item: task })}
                onTaskClick={(task) => setSelectedTask(task)}
                currentUserEmail={currentUser?.email}
              />
            </div>
          </motion.div>

          {/* Parts Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
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
                  onClick={() => { setEditingPart(null); setShowPartModal(true); }}
                  className="bg-amber-500 hover:bg-amber-600 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto">
              <PartsList
                parts={parts}
                onStatusChange={handlePartStatusChange}
                onEdit={(part) => { setEditingPart(part); setShowPartModal(true); }}
                onDelete={(part) => setDeleteConfirm({ open: true, type: 'part', item: part })}
              />
            </div>
          </motion.div>

          </div>
      </div>

      {/* Modals */}
      <ProjectModal
        open={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        project={project}
        onSave={handleUpdateProject}
      />

      <TaskModal
        open={showTaskModal}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        task={editingTask}
        projectId={projectId}
        teamMembers={teamMembers}
        onSave={handleSaveTask}
      />

      <PartModal
        open={showPartModal}
        onClose={() => { setShowPartModal(false); setEditingPart(null); }}
        part={editingPart}
        projectId={projectId}
        onSave={handleSavePart}
      />

      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        teamMembers={teamMembers}
        currentUser={currentUser}
        onEdit={(task) => { setSelectedTask(null); setEditingTask(task); setShowTaskModal(true); }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, type: null, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteConfirm.type}.
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
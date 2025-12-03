import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Calendar, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays, differenceInDays, max, parseISO } from 'date-fns';
import GanttChart from '@/components/project/GanttChart';
import TaskModal from '@/components/modals/TaskModal';
import TaskDetailModal from '@/components/modals/TaskDetailModal';

export default function ProjectTimeline() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: project, isLoading: loadingProject } = useQuery({
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

  const { data: taskGroups = [] } = useQuery({
    queryKey: ['taskGroups', projectId],
    queryFn: () => base44.entities.TaskGroup.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const handleTaskUpdate = async (taskId, updates) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await base44.entities.Task.update(taskId, { ...task, ...updates });
      refetchTasks();
      
      // Recalculate project end date based on tasks
      await recalculateProjectDates();
    }
  };

  const recalculateProjectDates = async () => {
    const tasksWithDates = tasks.filter(t => t.due_date);
    if (tasksWithDates.length === 0) return;
    
    const latestDate = max(tasksWithDates.map(t => parseISO(t.due_date)));
    const currentDueDate = project?.due_date ? parseISO(project.due_date) : null;
    
    // Only update if tasks extend beyond current due date
    if (!currentDueDate || latestDate > currentDueDate) {
      await base44.entities.Project.update(projectId, {
        ...project,
        due_date: format(latestDate, 'yyyy-MM-dd')
      });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    }
  };

  const handleSaveTask = async (data) => {
    if (editingTask) {
      await base44.entities.Task.update(editingTask.id, data);
    } else {
      await base44.entities.Task.create(data);
    }
    refetchTasks();
    setShowTaskModal(false);
    setEditingTask(null);
    await recalculateProjectDates();
  };

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading timeline...</div>
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

  // Calculate project stats
  const tasksWithDates = tasks.filter(t => t.start_date || t.due_date);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const estimatedEndDate = tasks.length > 0 && tasksWithDates.length > 0
    ? format(max(tasksWithDates.filter(t => t.due_date).map(t => parseISO(t.due_date))), 'MMM d, yyyy')
    : 'Not set';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('ProjectDetail') + `?id=${projectId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Project
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{project.name} - Timeline</h1>
              <p className="text-sm text-slate-500">
                Drag tasks to reschedule • Drag edges to resize
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('ProjectTasks') + `?id=${projectId}`}>
              <Button variant="outline" size="sm">
                <LayoutList className="w-4 h-4 mr-2" />
                List View
              </Button>
            </Link>
            <Button 
              onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
              className="bg-[#0069AF] hover:bg-[#133F5C]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Project Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Project Start</div>
            <div className="text-lg font-semibold text-slate-900">
              {project.start_date ? format(parseISO(project.start_date), 'MMM d, yyyy') : 'Not set'}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Calculated End Date</div>
            <div className="text-lg font-semibold text-slate-900">{estimatedEndDate}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Tasks</div>
            <div className="text-lg font-semibold text-slate-900">{tasks.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Completed</div>
            <div className="text-lg font-semibold text-emerald-600">
              {completedTasks} / {tasks.length}
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        {tasks.length > 0 ? (
          <GanttChart
            tasks={tasks}
            groups={taskGroups}
            project={project}
            onTaskUpdate={handleTaskUpdate}
            onTaskClick={setSelectedTask}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks yet</h3>
            <p className="text-slate-500 mb-6">Add tasks to see them on the timeline</p>
            <Button 
              onClick={() => setShowTaskModal(true)}
              className="bg-[#0069AF] hover:bg-[#133F5C]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Task
            </Button>
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        open={showTaskModal}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        task={editingTask}
        projectId={projectId}
        teamMembers={teamMembers}
        groups={taskGroups}
        onSave={handleSaveTask}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        teamMembers={teamMembers}
        currentUser={currentUser}
        onEdit={(task) => { 
          setSelectedTask(null); 
          setEditingTask(task); 
          setShowTaskModal(true); 
        }}
      />
    </div>
  );
}
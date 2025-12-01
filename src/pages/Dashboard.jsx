import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { FolderKanban, CheckCircle2, Package, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import StatsCard from '@/components/dashboard/StatsCard';
import ProjectCard from '@/components/dashboard/ProjectCard';
import RecentActivity from '@/components/dashboard/RecentActivity';
import ProjectModal from '@/components/modals/ProjectModal';

export default function Dashboard() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: () => base44.entities.Part.list('-created_date')
  });

  const activeProjects = projects.filter(p => p.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingParts = parts.filter(p => p.status === 'needed' || p.status === 'ordered');

  const filteredProjects = activeProjects.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTasksForProject = (projectId) => tasks.filter(t => t.project_id === projectId);

  const handleCreateProject = async (data) => {
    await base44.entities.Project.create(data);
    refetchProjects();
    setShowProjectModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome back! Here's your project overview.</p>
          </div>
          <Button
            onClick={() => setShowProjectModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Active Projects"
            value={activeProjects.length}
            icon={FolderKanban}
            color="bg-indigo-600"
            subtitle={`${projects.filter(p => p.status === 'completed').length} completed`}
          />
          <StatsCard
            title="Tasks"
            value={tasks.length}
            icon={CheckCircle2}
            color="bg-emerald-600"
            subtitle={`${completedTasks.length} completed`}
          />

          <StatsCard
            title="Parts Tracking"
            value={pendingParts.length}
            icon={Package}
            color="bg-amber-600"
            subtitle="needed/ordered"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Projects Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Active Projects</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-white"
                />
              </div>
            </div>

            {filteredProjects.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredProjects.map((project, idx) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    tasks={getTasksForProject(project.id)}
                    index={idx}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
              >
                <FolderKanban className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No projects yet</h3>
                <p className="text-slate-500 mb-6">Get started by creating your first project</p>
                <Button onClick={() => setShowProjectModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <RecentActivity tasks={tasks} parts={parts} />
          </div>
        </div>
      </div>

      <ProjectModal
        open={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleCreateProject}
      />
    </div>
  );
}
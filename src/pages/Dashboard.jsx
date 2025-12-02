import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { FolderKanban, CheckCircle2, Package, Plus, Search, ChevronDown, ChevronRight, Archive, FileStack, Bell, FileText, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

import StatsCard from '@/components/dashboard/StatsCard';
import ProjectCard from '@/components/dashboard/ProjectCard';
import MyTasksCard from '@/components/dashboard/MyTasksCard';
import ProjectModal from '@/components/modals/ProjectModal';

export default function Dashboard() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  const [prefillData, setPrefillData] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    
    // Check for proposal-based project creation
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const proposalId = urlParams.get('proposalId');
    
    if (action === 'createFromProposal' && proposalId) {
      base44.entities.Proposal.filter({ id: proposalId }).then(proposals => {
        if (proposals[0]) {
          const proposal = proposals[0];
          setPrefillData({
            name: proposal.title,
            client: proposal.customer_name,
            customer_id: proposal.customer_id,
            proposalItems: proposal.items || []
          });
          setShowProjectModal(true);
        }
      });
    }
  }, []);

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

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.ProjectTemplate.list()
  });

  const { data: quoteRequests = [] } = useQuery({
    queryKey: ['quoteRequests'],
    queryFn: () => base44.entities.QuoteRequest.list()
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date')
  });

  const pendingQuotes = quoteRequests.filter(q => !['received'].includes(q.status));
  const approvedProposals = proposals.filter(p => p.status === 'approved');
  const approvedTotal = approvedProposals.reduce((sum, p) => sum + (p.total || 0), 0);

  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'archived');
  const archivedProjects = projects.filter(p => p.status === 'archived' || p.status === 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingParts = parts.filter(p => p.status === 'needed' || p.status === 'ordered');

  const displayProjects = showArchived ? archivedProjects : activeProjects;
  const filteredProjects = displayProjects.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group projects
  const groupedProjects = filteredProjects.reduce((acc, project) => {
    const group = project.group || 'Ungrouped';
    if (!acc[group]) acc[group] = [];
    acc[group].push(project);
    return acc;
  }, {});

  const sortedGroups = Object.keys(groupedProjects).sort((a, b) => {
    if (a === 'Ungrouped') return 1;
    if (b === 'Ungrouped') return -1;
    return a.localeCompare(b);
  });

  const getTasksForProject = (projectId) => tasks.filter(t => t.project_id === projectId);

  const toggleGroup = (group) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const allGroups = [...new Set(projects.map(p => p.group).filter(Boolean))];

  const handleProjectColorChange = async (project, color) => {
    await base44.entities.Project.update(project.id, { color });
    refetchProjects();
  };

  const handleProjectGroupChange = async (project, group) => {
    await base44.entities.Project.update(project.id, { group });
    refetchProjects();
  };

  const handleProjectStatusChange = async (project, status) => {
    await base44.entities.Project.update(project.id, { status });
    refetchProjects();
  };

  const handleProjectDueDateChange = async (project, date) => {
    await base44.entities.Project.update(project.id, { due_date: date ? format(date, 'yyyy-MM-dd') : '' });
    refetchProjects();
  };

  const handleTaskComplete = async (task) => {
    await base44.entities.Task.update(task.id, { ...task, status: 'completed' });
    refetchTasks();
  };

  const handleCreateProject = async (data, template, extractedParts) => {
    const newProject = await base44.entities.Project.create(data);
    
    if (template?.default_tasks?.length) {
      for (const task of template.default_tasks) {
        await base44.entities.Task.create({ ...task, project_id: newProject.id });
      }
      refetchTasks();
    }
    
    if (template?.default_parts?.length) {
      for (const part of template.default_parts) {
        await base44.entities.Part.create({ ...part, project_id: newProject.id, status: 'needed' });
      }
    }

    if (extractedParts?.length) {
      for (const part of extractedParts) {
        await base44.entities.Part.create({ ...part, project_id: newProject.id, status: 'needed' });
      }
    }

    refetchProjects();
    setShowProjectModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome back{currentUser?.full_name ? `, ${currentUser.full_name.split(' ')[0]}` : ''}! Here's your project overview.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl('Templates')}>
              <Button variant="outline" size="sm">
                <FileStack className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </Link>
            <Link to={createPageUrl('NotificationSettings')}>
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
            </Link>
            <Button
              onClick={() => setShowProjectModal(true)}
              className="bg-[#0069AF] hover:bg-[#133F5C] shadow-lg shadow-[#0069AF]/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid - Clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Active Projects"
            value={activeProjects.length}
            icon={FolderKanban}
            color="bg-indigo-600"
            subtitle={`${projects.filter(p => p.status === 'completed').length} done`}
            href={createPageUrl('Dashboard')}
          />
          <StatsCard
            title="Approved Proposals"
            value={`$${approvedTotal.toLocaleString()}`}
            icon={DollarSign}
            color="bg-emerald-600"
            subtitle={`${approvedProposals.length} approved`}
            href={createPageUrl('Proposals')}
          />
          <StatsCard
            title="Parts"
            value={pendingParts.length}
            icon={Package}
            color="bg-amber-600"
            subtitle="pending"
            href={createPageUrl('AllTasks') + '?tab=parts'}
          />
          <StatsCard
            title="Quote Requests"
            value={pendingQuotes.length}
            icon={FileText}
            color="bg-violet-600"
            subtitle="pending"
            href={createPageUrl('QuoteRequests')}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Projects Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {showArchived ? 'Archived Projects' : 'Active Projects'}
                </h2>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
                >
                  <Archive className="w-4 h-4" />
                  {showArchived ? 'Show Active' : `Archived (${archivedProjects.length})`}
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-white h-9"
                />
              </div>
            </div>

            {filteredProjects.length > 0 ? (
              <div className="space-y-4">
                {sortedGroups.map(group => {
                  const groupProjects = groupedProjects[group];
                  const isCollapsed = collapsedGroups[group];
                  const showGroupHeader = sortedGroups.length > 1 || group !== 'Ungrouped';

                  return (
                    <div key={group}>
                      {showGroupHeader && (
                        <button
                          onClick={() => toggleGroup(group)}
                          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-3"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          {group} ({groupProjects.length})
                        </button>
                      )}
                      {!isCollapsed && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {groupProjects.map((project, idx) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              tasks={getTasksForProject(project.id)}
                              index={idx}
                              groups={allGroups}
                              onColorChange={handleProjectColorChange}
                              onGroupChange={handleProjectGroupChange}
                              onStatusChange={handleProjectStatusChange}
                              onDueDateChange={handleProjectDueDateChange}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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

          {/* Sidebar - My Tasks */}
          <div>
            <MyTasksCard 
              tasks={tasks} 
              parts={parts} 
              projects={projects}
              currentUserEmail={currentUser?.email}
              onTaskComplete={handleTaskComplete}
            />
          </div>
        </div>

      </div>

      <ProjectModal
        open={showProjectModal}
        onClose={() => { setShowProjectModal(false); setPrefillData(null); }}
        templates={templates}
        onSave={handleCreateProject}
        prefillData={prefillData}
      />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FolderKanban, CheckCircle2, Package, Plus, Search, ChevronDown, ChevronRight, Archive, FileText, DollarSign, AlertTriangle, Clock, X, Briefcase, TrendingUp, Box, ClipboardList, FileStack, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

import StatsCard from '@/components/dashboard/StatsCard';
import ProjectCard from '@/components/dashboard/ProjectCard';
import DashboardWidgets from '@/components/dashboard/DashboardWidgets';

// Filter out in_progress and medium priority from dashboard display
// These values are removed from the system
import MyTasksCard from '@/components/dashboard/MyTasksCard';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import ProjectModal from '@/components/modals/ProjectModal';

export default function Dashboard() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  const [prefillData, setPrefillData] = useState(null);
  const [pinnedProjectIds, setPinnedProjectIds] = useState(() => {
    const saved = localStorage.getItem('pinnedProjects');
    return saved ? JSON.parse(saved) : [];
  });

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

  // Get user's overdue and due today tasks
  const myUrgentTasks = tasks.filter(t => {
    if (t.assigned_to !== currentUser?.email) return false;
    if (t.status === 'completed' || t.status === 'archived') return false;
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return isPast(dueDate) || isToday(dueDate) || isTomorrow(dueDate);
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const overdueTasks = myUrgentTasks.filter(t => isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const dueTodayTasks = myUrgentTasks.filter(t => isToday(new Date(t.due_date)));
  const dueTomorrowTasks = myUrgentTasks.filter(t => isTomorrow(new Date(t.due_date)));

  const [dismissedAlert, setDismissedAlert] = useState(false);

  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'archived');
  const archivedProjects = projects.filter(p => p.status === 'archived' || p.status === 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingParts = parts.filter(p => p.status === 'needed' || p.status === 'ordered');

  const displayProjects = showArchived ? archivedProjects : activeProjects;
  const filteredProjects = displayProjects.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedProjects = filteredProjects.filter(p => pinnedProjectIds.includes(p.id))
    .sort((a, b) => pinnedProjectIds.indexOf(a.id) - pinnedProjectIds.indexOf(b.id));
  const unpinnedProjects = filteredProjects.filter(p => !pinnedProjectIds.includes(p.id));

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

  const handlePinToggle = (project) => {
    setPinnedProjectIds(prev => {
      const newPinned = prev.includes(project.id) 
        ? prev.filter(id => id !== project.id)
        : [project.id, ...prev];
      localStorage.setItem('pinnedProjects', JSON.stringify(newPinned));
      return newPinned;
    });
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    
    // If dropped on pinned area, pin it
    if (destination.droppableId === 'pinned' && source.droppableId !== 'pinned') {
      setPinnedProjectIds(prev => {
        const newPinned = [draggableId, ...prev.filter(id => id !== draggableId)];
        localStorage.setItem('pinnedProjects', JSON.stringify(newPinned));
        return newPinned;
      });
    }
    // If dragged from pinned to unpinned area
    else if (source.droppableId === 'pinned' && destination.droppableId !== 'pinned') {
      setPinnedProjectIds(prev => {
        const newPinned = prev.filter(id => id !== draggableId);
        localStorage.setItem('pinnedProjects', JSON.stringify(newPinned));
        return newPinned;
      });
    }
    // Reorder within pinned
    else if (source.droppableId === 'pinned' && destination.droppableId === 'pinned') {
      setPinnedProjectIds(prev => {
        const newPinned = [...prev];
        newPinned.splice(source.index, 1);
        newPinned.splice(destination.index, 0, draggableId);
        localStorage.setItem('pinnedProjects', JSON.stringify(newPinned));
        return newPinned;
      });
    }
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
            <Button
              onClick={() => setShowProjectModal(true)}
              className="bg-[#0069AF] hover:bg-[#133F5C] shadow-lg shadow-[#0069AF]/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </motion.div>

        {/* Urgent Tasks Alert */}
        {!dismissedAlert && myUrgentTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "mb-6 rounded-2xl p-4 border-2 shadow-lg relative overflow-hidden",
              overdueTasks.length > 0 
                ? "bg-gradient-to-r from-red-500 to-red-600 border-red-400 text-white" 
                : "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-white"
            )}
          >
            {/* Animated background pulse for overdue */}
            {overdueTasks.length > 0 && (
              <div className="absolute inset-0 bg-red-400/30 animate-pulse" />
            )}
            
            <div className="relative flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl shadow-lg",
                  overdueTasks.length > 0 ? "bg-white/20" : "bg-white/20"
                )}>
                  {overdueTasks.length > 0 ? (
                    <AlertTriangle className="w-6 h-6 animate-bounce" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {overdueTasks.length > 0 ? (
                      <>
                        <span className="animate-pulse">⚠️</span> 
                        You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}!
                      </>
                    ) : (
                      <>Tasks due soon</>
                    )}
                  </h3>
                  <div className="mt-2 space-y-1">
                    {overdueTasks.slice(0, 3).map(task => {
                      const daysOverdue = differenceInDays(new Date(), new Date(task.due_date));
                      return (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{task.title}</span>
                          <span className="text-white/80">• {daysOverdue} day{daysOverdue > 1 ? 's' : ''} overdue</span>
                        </div>
                      );
                    })}
                    {dueTodayTasks.slice(0, 2).map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{task.title}</span>
                        <span className="text-white/80">• Due today</span>
                      </div>
                    ))}
                    {dueTomorrowTasks.slice(0, 2).map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{task.title}</span>
                        <span className="text-white/80">• Due tomorrow</span>
                      </div>
                    ))}
                    {myUrgentTasks.length > 5 && (
                      <p className="text-sm text-white/80 mt-1">
                        +{myUrgentTasks.length - 5} more task{myUrgentTasks.length - 5 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={createPageUrl('AllTasks') + '?view=mine_due'}>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className={cn(
                      "font-semibold shadow-lg",
                      overdueTasks.length > 0 
                        ? "bg-white text-red-600 hover:bg-red-50" 
                        : "bg-white text-amber-600 hover:bg-amber-50"
                    )}
                  >
                    View Tasks
                  </Button>
                </Link>
                <button 
                  onClick={() => setDismissedAlert(true)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pinned Projects - Top Section */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="pinned" direction="horizontal">
            {(provided, snapshot) => (
              <motion.div
                ref={provided.innerRef}
                {...provided.droppableProps}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={cn(
                  "mb-6 p-4 rounded-2xl border-2 border-dashed transition-all min-h-[100px]",
                  snapshot.isDraggingOver ? "border-amber-400 bg-amber-50" : pinnedProjects.length > 0 ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-slate-50/50"
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Pin className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Pinned Projects</span>
                  {pinnedProjects.length === 0 && (
                    <span className="text-xs text-slate-400 ml-2">Drag projects here to pin them</span>
                  )}
                </div>
                {pinnedProjects.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {pinnedProjects.map((project, idx) => (
                      <Draggable key={project.id} draggableId={project.id} index={idx}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            style={dragProvided.draggableProps.style}
                          >
                            <ProjectCard
                              project={project}
                              tasks={getTasksForProject(project.id)}
                              index={idx}
                              groups={allGroups}
                              onColorChange={handleProjectColorChange}
                              onGroupChange={handleProjectGroupChange}
                              onStatusChange={handleProjectStatusChange}
                              onDueDateChange={handleProjectDueDateChange}
                              onPinToggle={handlePinToggle}
                              isPinned={true}
                              dragHandleProps={dragProvided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4 text-slate-400">
                    <span className="text-sm">No pinned projects yet</span>
                  </div>
                )}
                {provided.placeholder}
              </motion.div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Customizable Widgets */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <DashboardWidgets />
        </motion.div>

        {/* Stats Grid - Focused */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatsCard
            title="Active Projects"
            value={activeProjects.length}
            icon={Briefcase}
            iconColor="bg-[#0069AF]"
            href={createPageUrl('Dashboard')}
          />
          <StatsCard
            title="Quotes to Convert"
            value={approvedProposals.length}
            subtitle={approvedProposals.length > 0 ? `$${approvedTotal.toLocaleString()}` : null}
            icon={FileText}
            iconColor="bg-emerald-500"
            href={createPageUrl('Proposals') + '?status=approved'}
          />
          <StatsCard
            title="Parts Tracking"
            value={pendingParts.length}
            subtitle={parts.filter(p => p.status === 'ready_to_install').length > 0 ? `${parts.filter(p => p.status === 'ready_to_install').length} ready` : null}
            icon={Box}
            iconColor="bg-amber-500"
            href={createPageUrl('AllTasks') + '?tab=parts'}
          />
          <StatsCard
            title="Overdue Tasks"
            value={tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length}
            icon={AlertTriangle}
            iconColor="bg-red-500"
            href={createPageUrl('AllTasks')}
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
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-4">

                  {/* Unpinned Projects */}
                  <Droppable droppableId="unpinned">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {sortedGroups.map(group => {
                          const groupProjects = (groupedProjects[group] || []).filter(p => !pinnedProjectIds.includes(p.id));
                          if (groupProjects.length === 0) return null;
                          const isCollapsed = collapsedGroups[group];
                          const showGroupHeader = sortedGroups.length > 1 || group !== 'Ungrouped';

                          return (
                            <div key={group} className="mb-4">
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
                                    <Draggable key={project.id} draggableId={project.id} index={idx}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          style={provided.draggableProps.style}
                                        >
                                          <ProjectCard
                                            project={project}
                                            tasks={getTasksForProject(project.id)}
                                            index={idx}
                                            groups={allGroups}
                                            onColorChange={handleProjectColorChange}
                                            onGroupChange={handleProjectGroupChange}
                                            onStatusChange={handleProjectStatusChange}
                                            onDueDateChange={handleProjectDueDateChange}
                                            onPinToggle={handlePinToggle}
                                            isPinned={false}
                                            dragHandleProps={provided.dragHandleProps}
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </DragDropContext>
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
          <div className="space-y-6">
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
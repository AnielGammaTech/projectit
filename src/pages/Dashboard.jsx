import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { RefreshCw, FolderKanban, CheckCircle2, Package, Plus, Search, ChevronDown, ChevronRight, Archive, FileText, DollarSign, AlertTriangle, Clock, X, Briefcase, TrendingUp, Box, ClipboardList, FileStack, Pin, Settings, LayoutGrid, List, Star, Trash2, MoreHorizontal, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

import StatsCard from '@/components/dashboard/StatsCard';
import ProjectCard from '@/components/dashboard/ProjectCard';
import ProjectStackCard from '@/components/dashboard/ProjectStackCard';

import DashboardWidgets from '@/components/dashboard/DashboardWidgets';
import PendingProposalsModal from '@/components/dashboard/PendingProposalsModal';

// Filter out in_progress and medium priority from dashboard display
// These values are removed from the system
import MyTasksCard from '@/components/dashboard/MyTasksCard';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import ProjectModal from '@/components/modals/ProjectModal';
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
import { Checkbox } from '@/components/ui/checkbox';

export default function Dashboard() {
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  const [prefillData, setPrefillData] = useState(null);
  const [pinnedProjectIds, setPinnedProjectIds] = useState(() => {
    const saved = localStorage.getItem('pinnedProjects');
    return saved ? JSON.parse(saved) : [];
  });
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'
  const [listFilter, setListFilter] = useState('all'); // 'all', 'pinned', 'projects', 'teams', 'clients', 'archived'
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeLetter, setActiveLetter] = useState(null);
  const PROJECTS_PER_PAGE = 25;

  // Dashboard Views
  const [currentView, setCurrentView] = useState(null);
  const [viewName, setViewName] = useState('');
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [isSyncingQuotes, setIsSyncingQuotes] = useState(false);
  const [showProposalsModal, setShowProposalsModal] = useState(false);

  const handleCreateProjectFromQuote = (quote) => {
    setPrefillData({
      name: quote.title,
      client: quote.customer_name,
      customer_id: quote.customer_id, // Pass matched customer ID
      budget: quote.amount || quote.raw_data?.total_amount || 0,
      quoteit_quote_id: quote.quoteit_id, // Pass ID to link
      incoming_quote_id: quote.id, // Pass internal ID to update status later
      description: quote.raw_data?.other_relevant_details || '',
      proposalItems: quote.raw_data?.items || []
    });
    setShowProjectModal(true);
  };

  const handleDismissQuote = async (quote) => {
    await base44.entities.IncomingQuote.update(quote.id, { status: 'dismissed' });
    refetchIncomingQuotes();
  };

  const { data: incomingQuotesRaw = [], refetch: refetchIncomingQuotes } = useQuery({
    queryKey: ['incomingQuotes'],
    queryFn: () => base44.entities.IncomingQuote.filter({ status: 'pending' }),
    staleTime: 300000,
    gcTime: 600000
  });

  const handleSyncQuotes = async () => {
    setIsSyncingQuotes(true);
    try {
      await base44.functions.invoke('pullQuoteITQuotes', {});
      refetchIncomingQuotes();
    } catch (error) {
      console.error("Sync failed", error);
    }
    setIsSyncingQuotes(false);
  };

  const { data: dashboardViews = [], refetch: refetchViews } = useQuery({
    queryKey: ['dashboardViews', currentUser?.id],
    queryFn: () => base44.entities.DashboardView.filter({ user_id: currentUser?.id }),
    enabled: !!currentUser?.id,
    staleTime: 600000,
    gcTime: 900000
  });

  useEffect(() => {
    let mounted = true;
    base44.auth.me().then(user => {
      if (mounted) {
        setCurrentUser(user);
        setIsAdmin(user?.role === 'admin');
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    staleTime: 120000, // 2 minutes
    gcTime: 300000
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
    staleTime: 120000,
    gcTime: 300000
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: () => base44.entities.Part.list('-created_date'),
    staleTime: 180000, // 3 minutes
    gcTime: 300000
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.ProjectTemplate.list(),
    staleTime: 600000 // 10 minutes
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    staleTime: 600000
  });

  const { data: quoteRequests = [] } = useQuery({
    queryKey: ['quoteRequests'],
    queryFn: () => base44.entities.QuoteRequest.list(),
    staleTime: 300000 // 5 minutes - synced by scheduled task
  });

  const { data: customStatuses = [] } = useQuery({
    queryKey: ['projectStatuses'],
    queryFn: () => base44.entities.ProjectStatus.list('order'),
    staleTime: 600000
  });

  const { data: projectStacksData = [], refetch: refetchStacks } = useQuery({
    queryKey: ['projectStacks'],
    queryFn: () => base44.entities.ProjectStack.list('order'),
    staleTime: 300000
  });
  
  // Local state for optimistic updates
  const [localStacks, setLocalStacks] = useState(null);
  const projectStacks = localStacks || projectStacksData;
  
  // Sync local state when data changes
  useEffect(() => {
    if (projectStacksData.length > 0 || localStacks === null) {
      setLocalStacks(null); // Reset to use server data
    }
  }, [projectStacksData]);

  // Helper to check if user has access to a project
  const userHasProjectAccess = useCallback((project) => {
    // Admins can see everything
    if (isAdmin) return true;
    // If project has no team_members defined, it's visible to everyone (legacy behavior)
    if (!project.team_members || project.team_members.length === 0) return true;
    // Otherwise check if current user is in team_members
    return project.team_members.includes(currentUser?.email);
  }, [isAdmin, currentUser?.email]);

  // Memoize expensive computations
  const { activeProjects, archivedProjects, deletedProjects, activeProjectIds } = useMemo(() => {
    const accessibleProjects = projects.filter(userHasProjectAccess);
    const active = accessibleProjects.filter(p => p.status !== 'completed' && p.status !== 'archived' && p.status !== 'deleted');
    const archived = accessibleProjects.filter(p => (p.status === 'archived' || p.status === 'completed') && p.status !== 'deleted');
    const deleted = accessibleProjects.filter(p => p.status === 'deleted');
    return { activeProjects: active, archivedProjects: archived, deletedProjects: deleted, activeProjectIds: active.map(p => p.id) };
  }, [projects, userHasProjectAccess]);

  const { activeTasks, activeParts, pendingParts, completedTasks } = useMemo(() => {
    const activeT = tasks.filter(t => activeProjectIds.includes(t.project_id));
    const activeP = parts.filter(p => activeProjectIds.includes(p.project_id));
    return {
      activeTasks: activeT,
      activeParts: activeP,
      pendingParts: activeP.filter(p => p.status === 'needed' || p.status === 'ordered'),
      completedTasks: activeT.filter(t => t.status === 'completed')
    };
  }, [tasks, parts, activeProjectIds]);

  const { myUrgentTasks, overdueTasks, dueTodayTasks, dueTomorrowTasks } = useMemo(() => {
    const urgent = activeTasks.filter(t => {
      if (t.assigned_to !== currentUser?.email) return false;
      if (t.status === 'completed' || t.status === 'archived') return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return isPast(dueDate) || isToday(dueDate) || isTomorrow(dueDate);
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    
    return {
      myUrgentTasks: urgent,
      overdueTasks: urgent.filter(t => isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))),
      dueTodayTasks: urgent.filter(t => isToday(new Date(t.due_date))),
      dueTomorrowTasks: urgent.filter(t => isTomorrow(new Date(t.due_date)))
    };
  }, [activeTasks, currentUser?.email]);

  const displayProjects = showArchived ? archivedProjects : activeProjects;
  
  const filteredProjects = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return displayProjects.filter(p =>
      p.name?.toLowerCase().includes(query) ||
      p.client?.toLowerCase().includes(query)
    );
  }, [displayProjects, searchQuery]);

  const { pinnedProjects, unpinnedProjects } = useMemo(() => {
    const pinned = filteredProjects.filter(p => pinnedProjectIds.includes(p.id))
      .sort((a, b) => pinnedProjectIds.indexOf(a.id) - pinnedProjectIds.indexOf(b.id));
    const unpinned = filteredProjects.filter(p => !pinnedProjectIds.includes(p.id));
    return { pinnedProjects: pinned, unpinnedProjects: unpinned };
  }, [filteredProjects, pinnedProjectIds]);

  const letterFilteredProjects = useMemo(() => {
    const projectsInStacksSet = new Set(projectStacks.flatMap(s => s.project_ids || []));
    const unstacked = unpinnedProjects.filter(p => !projectsInStacksSet.has(p.id));
    return activeLetter ? unstacked.filter(p => (p.name || '')[0].toUpperCase() === activeLetter) : unstacked;
  }, [unpinnedProjects, activeLetter, projectStacks]);

  const totalPages = Math.ceil(letterFilteredProjects.length / PROJECTS_PER_PAGE);
  const paginatedProjects = letterFilteredProjects.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE
  );

  const availableLetters = useMemo(() => 
    [...new Set(unpinnedProjects.map(p => (p.name || '?')[0].toUpperCase()))].sort()
  , [unpinnedProjects]);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const { groupedProjects, sortedGroups } = useMemo(() => {
    const grouped = filteredProjects.reduce((acc, project) => {
      const group = project.group || 'Ungrouped';
      if (!acc[group]) acc[group] = [];
      acc[group].push(project);
      return acc;
    }, {});
    const sorted = Object.keys(grouped).sort((a, b) => {
      if (a === 'Ungrouped') return 1;
      if (b === 'Ungrouped') return -1;
      return a.localeCompare(b);
    });
    return { groupedProjects: grouped, sortedGroups: sorted };
  }, [filteredProjects]);

  // Memoize task/part lookups
  const tasksByProject = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!map[t.project_id]) map[t.project_id] = [];
      map[t.project_id].push(t);
    });
    return map;
  }, [tasks]);

  const partsByProject = useMemo(() => {
    const map = {};
    parts.forEach(p => {
      if (!map[p.project_id]) map[p.project_id] = [];
      map[p.project_id].push(p);
    });
    return map;
  }, [parts]);

  const getTasksForProject = useCallback((projectId) => tasksByProject[projectId] || [], [tasksByProject]);
  const getPartsForProject = useCallback((projectId) => partsByProject[projectId] || [], [partsByProject]);

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

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, combine } = result;
    
    const sourceIsStack = source.droppableId.startsWith('stack-');
    const destIsStack = destination?.droppableId?.startsWith('stack-');

    // Helper to optimistically update local stacks
    const optimisticUpdate = (updater) => {
      setLocalStacks(prev => {
        const current = prev || projectStacksData;
        return updater(current);
      });
    };

    // Helper to remove project from its current stack (optimistic + server)
    const removeFromCurrentStack = async (projectId) => {
      const currentStack = projectStacks.find(s => s.project_ids?.includes(projectId));
      if (currentStack) {
        const newIds = currentStack.project_ids.filter(id => id !== projectId);
        
        // Optimistic update
        optimisticUpdate(stacks => {
          if (newIds.length === 0) {
            return stacks.filter(s => s.id !== currentStack.id);
          }
          return stacks.map(s => s.id === currentStack.id ? { ...s, project_ids: newIds } : s);
        });
        
        // Server update (fire and forget, refetch will sync)
        if (newIds.length === 0) {
          base44.entities.ProjectStack.delete(currentStack.id).then(() => refetchStacks());
        } else {
          base44.entities.ProjectStack.update(currentStack.id, { project_ids: newIds }).then(() => refetchStacks());
        }
        return true;
      }
      return false;
    };

    // Handle combining projects to create a stack
    if (combine) {
      const targetProjectId = combine.draggableId;
      const draggedProjectId = draggableId;

      // Check if target is in a stack - add dragged to that stack
      const targetStack = projectStacks.find(s => s.project_ids?.includes(targetProjectId));
      if (targetStack) {
        // Optimistic: remove from old stack, add to target
        optimisticUpdate(stacks => stacks.map(s => {
          if (s.project_ids?.includes(draggedProjectId) && s.id !== targetStack.id) {
            return { ...s, project_ids: s.project_ids.filter(id => id !== draggedProjectId) };
          }
          if (s.id === targetStack.id && !s.project_ids?.includes(draggedProjectId)) {
            return { ...s, project_ids: [...(s.project_ids || []), draggedProjectId] };
          }
          return s;
        }).filter(s => s.project_ids?.length > 0));
        
        await removeFromCurrentStack(draggedProjectId);
        if (!targetStack.project_ids?.includes(draggedProjectId)) {
          base44.entities.ProjectStack.update(targetStack.id, {
            project_ids: [...targetStack.project_ids, draggedProjectId]
          }).then(() => refetchStacks());
        }
        return;
      }

      // Neither is in a stack - create new stack
      const tempId = 'temp-' + Date.now();
      optimisticUpdate(stacks => [...stacks, {
        id: tempId,
        name: 'New Stack',
        color: 'slate',
        project_ids: [targetProjectId, draggedProjectId],
        order: stacks.length
      }]);
      
      base44.entities.ProjectStack.create({
        name: 'New Stack',
        color: 'slate',
        project_ids: [targetProjectId, draggedProjectId],
        order: projectStacks.length
      }).then(() => refetchStacks());
      return;
    }

    // No destination - if from stack, remove from stack
    if (!destination) {
      if (sourceIsStack) {
        await removeFromCurrentStack(draggableId);
      }
      return;
    }

    // Same position - no change needed
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Dropping INTO a stack
    if (destIsStack) {
      const stackId = destination.droppableId.replace('stack-', '');
      const stack = projectStacks.find(s => s.id === stackId);
      
      if (stack && !stack.project_ids?.includes(draggableId)) {
        // Optimistic update
        optimisticUpdate(stacks => stacks.map(s => {
          // Remove from old stack
          if (sourceIsStack && s.project_ids?.includes(draggableId) && s.id !== stackId) {
            return { ...s, project_ids: s.project_ids.filter(id => id !== draggableId) };
          }
          // Add to new stack
          if (s.id === stackId) {
            return { ...s, project_ids: [...(s.project_ids || []), draggableId] };
          }
          return s;
        }).filter(s => s.project_ids?.length > 0));
        
        // Server updates
        if (sourceIsStack && source.droppableId !== destination.droppableId) {
          removeFromCurrentStack(draggableId);
        }
        base44.entities.ProjectStack.update(stackId, {
          project_ids: [...(stack.project_ids || []), draggableId]
        }).then(() => refetchStacks());
      }
      return;
    }

    // Dropping OUT of a stack (to unpinned/pinned)
    if (sourceIsStack && !destIsStack) {
      await removeFromCurrentStack(draggableId);
    }

    // Handle pinned area
    if (destination.droppableId === 'pinned') {
      setPinnedProjectIds(prev => {
        const withoutCurrent = prev.filter(id => id !== draggableId);
        const newPinned = [...withoutCurrent];
        newPinned.splice(destination.index, 0, draggableId);
        localStorage.setItem('pinnedProjects', JSON.stringify(newPinned));
        return newPinned;
      });
    } else if (source.droppableId === 'pinned') {
      setPinnedProjectIds(prev => {
        const newPinned = prev.filter(id => id !== draggableId);
        localStorage.setItem('pinnedProjects', JSON.stringify(newPinned));
        return newPinned;
      });
    }
  };

  // Stack handlers
  const handleStackToggleCollapse = async (stack) => {
    await base44.entities.ProjectStack.update(stack.id, { is_collapsed: !stack.is_collapsed });
    refetchStacks();
  };

  const handleStackRename = async (stack, newName) => {
    await base44.entities.ProjectStack.update(stack.id, { name: newName });
    refetchStacks();
  };

  const handleStackDelete = async (stack) => {
    await base44.entities.ProjectStack.delete(stack.id);
    refetchStacks();
  };

  const handleStackColorChange = async (stack, color) => {
    await base44.entities.ProjectStack.update(stack.id, { color });
    refetchStacks();
  };

  // Get projects not in any stack
  const projectsInStacks = projectStacks.flatMap(s => s.project_ids || []);
  const unstackedProjects = unpinnedProjects.filter(p => !projectsInStacks.includes(p.id));

  const handleTaskComplete = async (task) => {
    await base44.entities.Task.update(task.id, { ...task, status: 'completed' });
    refetchTasks();
  };

  const toggleProjectSelection = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const selectAllProjects = () => {
    if (selectedProjects.length === filteredProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredProjects.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    for (const projectId of selectedProjects) {
      await base44.entities.Project.update(projectId, {
        status: 'deleted',
        deleted_date: new Date().toISOString()
      });
    }
    setSelectedProjects([]);
    setSelectionMode(false);
    setShowBulkDeleteConfirm(false);
    refetchProjects();
  };

  const handleRestoreProject = async (project) => {
    await base44.entities.Project.update(project.id, {
      status: 'planning', // Default back to planning
      deleted_date: null
    });
    refetchProjects();
  };

  const handleSaveView = async () => {
    if (!viewName.trim()) return;
    
    const viewConfig = {
      filters: { status: listFilter },
      layout: viewMode,
      pinned: pinnedProjectIds,
      collapsed: collapsedGroups
    };

    await base44.entities.DashboardView.create({
      name: viewName,
      user_id: currentUser.id,
      config: viewConfig,
      is_default: false
    });

    setViewName('');
    setShowSaveViewModal(false);
    refetchViews();
  };

  const applyView = (view) => {
    setCurrentView(view);
    if (view.config.layout) setViewMode(view.config.layout);
    if (view.config.pinned) setPinnedProjectIds(view.config.pinned);
    if (view.config.filters?.status) setListFilter(view.config.filters.status);
    if (view.config.collapsed) setCollapsedGroups(view.config.collapsed);
  };

  const handleBulkArchive = async () => {
    for (const projectId of selectedProjects) {
      await base44.entities.Project.update(projectId, {
        status: 'archived',
        archived_date: new Date().toISOString()
      });
    }
    setSelectedProjects([]);
    setSelectionMode(false);
    setShowBulkArchiveConfirm(false);
    refetchProjects();
  };

  const handleCreateProject = async (data, template, extractedParts) => {
        // Get highest project number and increment
        const allProjects = await base44.entities.Project.list('-project_number', 1);
        const nextNumber = (allProjects[0]?.project_number || 1000) + 1;

        // Get "In Progress" tag to auto-assign
        const allTags = await base44.entities.ProjectTag.list();
        const inProgressTag = allTags.find(t => t.name === 'In Progress');

        // Ensure team_members includes the creator if not already
        const teamMembersList = data.team_members || [];
        if (currentUser?.email && !teamMembersList.includes(currentUser.email)) {
          teamMembersList.push(currentUser.email);
        }

        // Ensure customer_id is correctly passed
        const projectData = {
          ...data,
          project_number: nextNumber,
          customer_id: data.customer_id || prefillData?.customer_id || null,
          quoteit_quote_id: prefillData?.quoteit_quote_id || null,
          incoming_quote_id: prefillData?.incoming_quote_id || null,
          tags: inProgressTag ? [inProgressTag.id] : [],
          team_members: teamMembersList
        };

        const newProject = await base44.entities.Project.create(projectData);

        // Send project assignment notifications to team members (excluding creator)
        for (const memberEmail of teamMembersList) {
          if (memberEmail !== currentUser?.email) {
            try {
              // Create in-app notification
              await base44.entities.UserNotification.create({
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

              // Send email notification
              await base44.functions.invoke('sendNotificationEmail', {
                to: memberEmail,
                type: 'project_assigned',
                title: 'You have been added to a project',
                message: `${currentUser?.full_name || currentUser?.email} added you to "${newProject.name}"`,
                projectId: newProject.id,
                projectName: newProject.name,
                fromUserName: currentUser?.full_name || currentUser?.email,
                link: `${window.location.origin}/ProjectDetail?id=${newProject.id}`
              });
            } catch (notifErr) {
              console.error('Failed to send project assignment notification:', notifErr);
            }
          }
        }

        // If created from IncomingQuote, delete it (no longer needed)
        if (prefillData?.incoming_quote_id) {
          // Link project on QuoteIT if ID is available
          if (prefillData.quoteit_quote_id) {
            try {
              await base44.functions.invoke('linkQuoteToProject', { 
                quote_id: prefillData.quoteit_quote_id, 
                project_id: newProject.id,
                project_number: newProject.project_number
              });
            } catch (err) {
              console.error('Failed to link project on QuoteIT:', err);
            }
          }

          // Delete the incoming quote record
          await base44.entities.IncomingQuote.delete(prefillData.incoming_quote_id);

          // Refresh the list
          if (typeof refetchIncomingQuotes === 'function') refetchIncomingQuotes();
        }

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
        {/* Welcome Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#133F5C]">Howdy, Fellow Tech Enthusiast! 🤠</h1>

            </div>
            <div className="flex items-start gap-6">
              <div className="text-right text-sm">
                <p className="font-medium text-slate-700">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <p className="text-slate-500">{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} • Naples, FL</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button
                  onClick={() => setShowProjectModal(true)}
                  size="lg"
                  className="bg-[#0F2F44] hover:bg-[#1a4a6e] shadow-lg text-base px-6 py-3 h-12"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New Project
                </Button>
                <Link to={createPageUrl('Templates')} className="text-sm text-[#0069AF] hover:text-[#133F5C] font-medium transition-colors underline underline-offset-2">
                  or use a template →
                </Link>
              </div>
            </div>
          </div>
        </div>



        {/* Urgent Tasks Alert */}
        {!dismissedAlert && myUrgentTasks.length > 0 && (
          <div className={cn(
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
          </div>
        )}

        {/* Customizable Widgets - Optional based on user settings */}
        {currentUser?.show_dashboard_widgets === true && (
          <div className="mb-8">
            <DashboardWidgets />
          </div>
        )}

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
            title="Parts Tracking"
            value={pendingParts.length}
            subtitle={activeParts.filter(p => p.status === 'ready_to_install').length > 0 ? `${activeParts.filter(p => p.status === 'ready_to_install').length} ready` : null}
            icon={Box}
            iconColor="bg-amber-500"
            href={createPageUrl('AllTasks') + '?tab=parts'}
          />
          <StatsCard
            title="All Tasks"
            value={activeTasks.filter(t => t.status !== 'completed' && t.status !== 'archived').length}
            subtitle={activeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length > 0 ? `${activeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length} overdue` : null}
            icon={ClipboardList}
            iconColor="bg-[#0069AF]"
            href={createPageUrl('AllTasks')}
          />
          <StatsCard
            title="Proposals Pending"
            value={incomingQuotes.length}
            subtitle={incomingQuotes.length > 0 ? 'awaiting project' : null}
            icon={FileText}
            iconColor={incomingQuotes.length > 0 ? "bg-orange-500" : "bg-emerald-500"}
            highlight={incomingQuotes.length > 0}
            onClick={() => setShowProposalsModal(true)}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Projects Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-[#0F2F44]">
                  {showArchived ? 'Archived Projects' : 'Active Projects'}
                </h2>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-1.5 text-sm text-[#0F2F44]/60 hover:text-[#0F2F44]"
                >
                  <Archive className="w-4 h-4" />
                  {showArchived ? 'Show Active' : `Archived (${archivedProjects.length})`}
                </button>
              </div>
              <div className="flex items-center gap-2">
                {/* Selection Mode Toggle */}
                {!showArchived && (
                  <button
                    onClick={() => { setSelectionMode(!selectionMode); setSelectedProjects([]); }}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      selectionMode ? "bg-[#0069AF] text-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    )}
                    title="Select multiple projects"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                )}
                {/* View Mode Toggle */}
                <div className="flex items-center bg-[#0F2F44]/10 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={cn(
                        "p-1.5 rounded-md transition-all",
                        viewMode === 'cards' ? "bg-white shadow-sm text-[#0F2F44]" : "text-[#0F2F44]/60 hover:text-[#0F2F44]"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "p-1.5 rounded-md transition-all",
                        viewMode === 'list' ? "bg-white shadow-sm text-[#0F2F44]" : "text-[#0F2F44]/60 hover:text-[#0F2F44]"
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F2F44]/40" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48 bg-[#0F2F44]/5 border-[#0F2F44]/10 h-9"
                    />
                  </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectionMode && (
              <div className="mb-4 p-3 bg-[#0069AF]/10 rounded-xl border border-[#0069AF]/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllProjects}
                    className="flex items-center gap-2 text-sm font-medium text-[#0069AF] hover:text-[#133F5C]"
                  >
                    {selectedProjects.length === filteredProjects.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {selectedProjects.length === filteredProjects.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-slate-600">
                    {selectedProjects.length} selected
                  </span>
                </div>
                {selectedProjects.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkArchiveConfirm(true)}
                      className="text-amber-600 border-amber-300 hover:bg-amber-50"
                    >
                      <Archive className="w-4 h-4 mr-1" />
                      Archive
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Alphabet Quick Filter - shows when more than 25 projects */}
            {unpinnedProjects.length > 25 && viewMode === 'cards' && !showArchived && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs text-slate-500 mr-2">Jump to:</span>
                <div className="flex items-center gap-0.5 bg-white rounded-xl border border-slate-200 p-1.5">
                  <button
                    onClick={() => { setActiveLetter(null); setCurrentPage(1); }}
                    className={cn(
                      "px-2 py-1 rounded-lg text-xs font-medium transition-all",
                      !activeLetter ? "bg-[#0069AF] text-white" : "text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    All
                  </button>
                  {alphabet.map(letter => {
                    const hasProjects = availableLetters.includes(letter);
                    const count = unpinnedProjects.filter(p => (p.name || '')[0].toUpperCase() === letter).length;
                    return (
                      <button
                        key={letter}
                        onClick={() => { if (hasProjects) { setActiveLetter(letter === activeLetter ? null : letter); setCurrentPage(1); }}}
                        disabled={!hasProjects}
                        className={cn(
                          "w-7 h-7 rounded-lg text-xs font-medium transition-all relative group",
                          activeLetter === letter 
                            ? "bg-[#0069AF] text-white scale-110 shadow-lg z-10" 
                            : hasProjects 
                              ? "text-slate-700 hover:bg-slate-100 hover:scale-125 hover:shadow-lg hover:z-10" 
                              : "text-slate-300 cursor-not-allowed"
                        )}
                      >
                        {letter}
                        {hasProjects && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {count} project{count > 1 ? 's' : ''}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {activeLetter && (
                  <span className="text-sm text-slate-600">
                    Showing {letterFilteredProjects.length} project{letterFilteredProjects.length !== 1 ? 's' : ''} starting with "{activeLetter}"
                  </span>
                )}
              </div>
            )}

            {filteredProjects.length > 0 ? (
              viewMode === 'list' ? (
                /* List View */
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {/* List Header */}
                  <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-2xl font-bold text-slate-900 text-center mb-4">All Projects</h2>
                    <div className="relative max-w-xl mx-auto mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Find a project..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white border-slate-200 h-10 pr-10"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {/* Filter Pills */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        { key: 'alpha', label: 'A-Z' },
                        { key: 'pinned', label: 'Pinned' },
                        { key: 'clients', label: 'With Clients' },
                        { key: 'all', label: 'All' },
                        { key: 'archived', label: 'Archived' },
                        { key: 'deleted', label: 'Trash' },
                      ].map(filter => (
                        <button
                          key={filter.key}
                          onClick={() => setListFilter(filter.key)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                            listFilter === filter.key
                              ? "bg-[#0F2F44] text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Project List */}
                  <div className="divide-y divide-slate-100">
                    {(() => {
                      let projectsToShow = [...filteredProjects];
                      
                      // Apply filters
                      if (listFilter === 'pinned') {
                        projectsToShow = projectsToShow.filter(p => pinnedProjectIds.includes(p.id));
                      } else if (listFilter === 'clients') {
                        projectsToShow = projectsToShow.filter(p => p.client);
                      } else if (listFilter === 'archived') {
                        projectsToShow = archivedProjects.filter(p =>
                          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.client?.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                      } else if (listFilter === 'deleted') {
                        projectsToShow = deletedProjects.filter(p =>
                          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.client?.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                      } else if (listFilter === 'alpha') {
                        projectsToShow = projectsToShow.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                      }

                      // Group by first letter for alpha view
                      if (listFilter === 'alpha') {
                        const grouped = projectsToShow.reduce((acc, project) => {
                          const letter = (project.name || '?')[0].toUpperCase();
                          if (!acc[letter]) acc[letter] = [];
                          acc[letter].push(project);
                          return acc;
                        }, {});

                        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([letter, projects]) => (
                          <div key={letter}>
                            {projects.map((project, idx) => (
                              <Link
                                key={project.id}
                                to={createPageUrl('ProjectDetail') + `?id=${project.id}`}
                                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                              >
                                {idx === 0 && (
                                  <span className="w-6 text-slate-400 font-semibold">{letter}</span>
                                )}
                                {idx > 0 && <span className="w-6" />}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-900 truncate">{project.name}</h3>
                                    {project.client && (
                                      <span className="text-[#0F2F44]/60 text-sm">• {project.client}</span>
                                    )}
                                    {project.status === 'deleted' && (
                                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded">Deleted</span>
                                    )}
                                  </div>
                                  {project.description && (
                                    <p className="text-sm text-slate-500 truncate">{project.description}</p>
                                  )}
                                </div>
                                {project.status === 'deleted' ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="ml-4 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRestoreProject(project); }}
                                  >
                                    Restore
                                  </Button>
                                ) : (
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePinToggle(project); }}
                                    className={cn(
                                    "p-2 rounded-lg transition-all",
                                    pinnedProjectIds.includes(project.id)
                                      ? "text-amber-500 hover:text-amber-600"
                                      : "text-slate-300 hover:text-amber-500 opacity-0 group-hover:opacity-100"
                                  )}
                                >
                                  <Star className={cn("w-5 h-5", pinnedProjectIds.includes(project.id) && "fill-current")} />
                                </button>
                                )}
                              </Link>
                            ))}
                          </div>
                        ));
                      }

                      return projectsToShow.map(project => (
                        <Link
                          key={project.id}
                          to={createPageUrl('ProjectDetail') + `?id=${project.id}`}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 truncate">{project.name}</h3>
                              {project.client && (
                                <span className="text-[#0F2F44]/60 text-sm">• {project.client}</span>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-sm text-slate-500 truncate">{project.description}</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePinToggle(project); }}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              pinnedProjectIds.includes(project.id)
                                ? "text-amber-500 hover:text-amber-600"
                                : "text-slate-300 hover:text-amber-500 opacity-0 group-hover:opacity-100"
                            )}
                          >
                            <Star className={cn("w-5 h-5", pinnedProjectIds.includes(project.id) && "fill-current")} />
                          </button>
                        </Link>
                      ));
                    })()}
                  </div>
                </div>
              ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-4">
                  {/* Pinned Projects Section */}
                  {pinnedProjects.length > 0 && (
                    <Droppable droppableId="pinned" direction="horizontal">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "mb-6 p-4 rounded-2xl border-2 border-dashed transition-all",
                            snapshot.isDraggingOver ? "border-amber-400 bg-amber-50" : "border-amber-200 bg-amber-50/50"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Pin className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-semibold text-amber-700">Pinned Projects</span>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {pinnedProjects.map((project, idx) => (
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
                                                                                      parts={getPartsForProject(project.id)}
                                                                                      index={idx}
                                                                                      groups={allGroups}
                                                                                      onColorChange={handleProjectColorChange}
                                                                                      onGroupChange={handleProjectGroupChange}
                                                                                      onStatusChange={handleProjectStatusChange}
                                                                                      onDueDateChange={handleProjectDueDateChange}
                                                                                      onPinToggle={handlePinToggle}
                                                                                      isPinned={true}
                                                                                      dragHandleProps={provided.dragHandleProps}
                                                                                      teamMembers={teamMembers}
                                                                                      selectionMode={selectionMode}
                                                                                      isSelected={selectedProjects.includes(project.id)}
                                                                                      onSelectionToggle={toggleProjectSelection}
                                                                                      customStatuses={customStatuses}
                                                                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  )}

                  {/* Drop zone when no pinned projects */}
                  {pinnedProjects.length === 0 && (
                    <Droppable droppableId="pinned">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "mb-4 p-4 rounded-2xl border-2 border-dashed text-center transition-all",
                            snapshot.isDraggingOver ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50/50"
                          )}
                        >
                          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                            <Pin className="w-4 h-4" />
                            <span>Drag projects here to pin them</span>
                          </div>
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  )}

                  {/* Stacks Section */}
                  {projectStacks.length > 0 && (
                    <div className="mb-6 grid sm:grid-cols-2 gap-4">
                      {projectStacks.map(stack => (
                        <ProjectStackCard
                          key={stack.id}
                          stack={stack}
                          projects={projects}
                          tasks={tasks}
                          parts={parts}
                          teamMembers={teamMembers}
                          customStatuses={customStatuses}
                          onToggleCollapse={handleStackToggleCollapse}
                          onRename={handleStackRename}
                          onDelete={handleStackDelete}
                          onColorChange={handleStackColorChange}
                          onProjectColorChange={handleProjectColorChange}
                          onProjectStatusChange={handleProjectStatusChange}
                          onProjectDueDateChange={handleProjectDueDateChange}
                          onPinToggle={handlePinToggle}
                          getTasksForProject={getTasksForProject}
                          getPartsForProject={getPartsForProject}
                          currentUserEmail={currentUser?.email}
                          isAdmin={isAdmin}
                        />
                      ))}
                    </div>
                  )}

                  {/* Unpinned Projects */}
                  <Droppable droppableId="unpinned" isCombineEnabled>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {sortedGroups.map(group => {
                                  const allGroupProjects = (groupedProjects[group] || []).filter(p => !pinnedProjectIds.includes(p.id) && !projectsInStacks.includes(p.id));
                                  // Apply letter filter and pagination to group projects
                                  const groupProjects = allGroupProjects.filter(p => 
                                    !activeLetter || (p.name || '')[0].toUpperCase() === activeLetter
                                  );
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
                                  {groupProjects.slice((currentPage - 1) * PROJECTS_PER_PAGE, currentPage * PROJECTS_PER_PAGE).map((project, idx) => (
                                    <Draggable key={project.id} draggableId={project.id} index={idx}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          style={provided.draggableProps.style}
                                          className={snapshot.combineTargetFor ? 'ring-2 ring-indigo-400 ring-offset-2 rounded-2xl' : ''}
                                        >
                                          <ProjectCard
                                                                                            project={project}
                                                                                            tasks={getTasksForProject(project.id)}
                                                                                            parts={getPartsForProject(project.id)}
                                                                                            index={idx}
                                                                                            groups={allGroups}
                                                                                            onColorChange={handleProjectColorChange}
                                                                                            onGroupChange={handleProjectGroupChange}
                                                                                            onStatusChange={handleProjectStatusChange}
                                                                                            onDueDateChange={handleProjectDueDateChange}
                                                                                            onPinToggle={handlePinToggle}
                                                                                            isPinned={false}
                                                                                            dragHandleProps={provided.dragHandleProps}
                                                                                            teamMembers={teamMembers}
                                                                                            selectionMode={selectionMode}
                                                                                            isSelected={selectedProjects.includes(project.id)}
                                                                                            onSelectionToggle={toggleProjectSelection}
                                                                                            customStatuses={customStatuses}
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-100">
                        <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        Previous
                        </button>
                        <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                              currentPage === page 
                                ? "bg-[#0069AF] text-white" 
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {page}
                          </button>
                        ))}
                        </div>
                        <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        Next
                        </button>
                        </div>
                        )}
                        </div>
                        </DragDropContext>
                        )
            ) : (
              <div className="bg-[#0F2F44]/5 rounded-2xl border border-[#0F2F44]/10 p-12 text-center">
                  <FolderKanban className="w-12 h-12 mx-auto text-[#0F2F44]/30 mb-4" />
                  <h3 className="text-lg font-medium text-[#0F2F44] mb-2">No projects yet</h3>
                  <p className="text-[#0F2F44]/60 mb-6">Get started by creating your first project</p>
                  <Button onClick={() => setShowProjectModal(true)} className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </div>
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
        currentUserEmail={currentUser?.email}
      />

      {/* Adminland Corner Link (Admin Only) */}
      {isAdmin && (
        <Link 
          to={createPageUrl('Adminland')}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 bg-[#133F5C] hover:bg-[#0F2F44] text-white rounded-lg shadow-lg transition-all"
        >
          <Settings className="w-4 h-4" />
          Adminland
        </Link>
      )}

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              These projects will be moved to the trash. You can restore them later from Adminland → Deleted Projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Projects
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pending Proposals Modal */}
      <PendingProposalsModal
        open={showProposalsModal}
        onClose={() => setShowProposalsModal(false)}
        quotes={incomingQuotes}
        onCreateProject={handleCreateProjectFromQuote}
        onSync={handleSyncQuotes}
        isSyncing={isSyncingQuotes}
      />

      {/* Bulk Archive Confirmation */}
      <AlertDialog open={showBulkArchiveConfirm} onOpenChange={setShowBulkArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              These projects will be archived. You can restore them later from Adminland → Archived Projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkArchive} className="bg-amber-600 hover:bg-amber-700">
              <Archive className="w-4 h-4 mr-2" />
              Archive Projects
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
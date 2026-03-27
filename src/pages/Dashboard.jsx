import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { RefreshCw, FolderKanban, CheckCircle2, Package, Plus, Search, ChevronDown, ChevronRight, Archive, FileText, DollarSign, AlertTriangle, Clock, X, Briefcase, TrendingUp, Box, ClipboardList, FileStack, Pin, LayoutGrid, List, Star, Trash2, MoreHorizontal, CheckSquare, Square, ListTodo, Activity as ActivityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import { format, isPast, isToday, isTomorrow, differenceInDays, formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { parseLocalDate } from '@/utils/dateUtils';

import { useIsMobile } from '@/hooks/use-mobile';
import StatsCard from '@/components/dashboard/StatsCard';
import PullToRefresh from '@/components/PullToRefresh';
import ProjectCard from '@/components/dashboard/ProjectCard';
import ProjectStackCard from '@/components/dashboard/ProjectStackCard';

import PendingProposalsModal from '@/components/dashboard/PendingProposalsModal';
import ProjectHealthGrid from '@/components/dashboard/ProjectHealthGrid';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import IncomingQuoteBanner from '@/components/dashboard/IncomingQuoteBanner';

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
import { toast } from 'sonner';
import ProcessingOverlay from '@/components/ui/ProcessingOverlay';
import { fireTaskConfetti, fireSubtleConfetti } from '@/utils/confetti';
import { DashboardSkeleton } from '@/components/ui/PageSkeletons';

export default function Dashboard() {
    const isMobile = useIsMobile();
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
  const [activeWidget, setActiveWidget] = useState(() => localStorage.getItem('dashboard-active-widget') || 'tasks');
  const [listFilter, setListFilter] = useState('all'); // 'all', 'pinned', 'projects', 'teams', 'clients', 'archived'
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeLetter, setActiveLetter] = useState(null);
  const [projectLeadFilter, setProjectLeadFilter] = useState('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const PROJECTS_PER_PAGE = 25;

  // Dashboard Views
  const [currentView, setCurrentView] = useState(null);
  const [viewName, setViewName] = useState('');
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [isSyncingQuotes, setIsSyncingQuotes] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState({ open: false, project: null });
  const [showProposalsModal, setShowProposalsModal] = useState(false);

  const handleCreateProjectFromQuote = (quote) => {
    // Use matched_items if available (includes product matching from sync),
    // otherwise fall back to raw items
    const items = quote.matched_items?.length > 0
      ? quote.matched_items
      : (quote.raw_data?.items || []);

    setPrefillData({
      name: quote.title,
      client: quote.customer_name,
      customer_id: quote.customer_id || '',
      budget: quote.amount || quote.raw_data?.total_amount || 0,
      quoteit_quote_id: quote.quoteit_id,
      incoming_quote_id: quote.id,
      description: quote.raw_data?.other_relevant_details || '',
      proposalItems: items,
    });
    setShowProjectModal(true);
  };

  const handleDismissQuote = async (quote) => {
    // Optimistically remove from cache immediately
    queryClient.setQueryData(['incomingQuotes'], (old) =>
      (old || []).filter(q => q.id !== quote.id)
    );
    try {
      await api.entities.IncomingQuote.update(quote.id, { status: 'dismissed' });
    } catch (err) {
      // If update fails, try delete as fallback
      try {
        await api.entities.IncomingQuote.delete(quote.id);
      } catch (delErr) {
        console.error('Failed to dismiss quote:', delErr);
      }
    }
    refetchIncomingQuotes();
  };

  const { data: incomingQuotesRaw = [], refetch: refetchIncomingQuotes } = useQuery({
    queryKey: ['incomingQuotes'],
    queryFn: () => api.entities.IncomingQuote.filter({ status: 'pending' }),
    staleTime: 30000,
    gcTime: 600000,
    enabled: !isMobile
  });

  const handleSyncQuotes = async () => {
    setIsSyncingQuotes(true);
    try {
      await api.functions.invoke('pullQuoteITQuotes', {});
      refetchIncomingQuotes();
    } catch (error) {
      console.error("Sync failed", error);
    }
    setIsSyncingQuotes(false);
  };

  const { data: dashboardViews = [], refetch: refetchViews } = useQuery({
    queryKey: ['dashboardViews', currentUser?.id],
    queryFn: () => api.entities.DashboardView.filter({ user_id: currentUser?.id }),
    enabled: !!currentUser?.id,
    staleTime: 300000,
    gcTime: 900000
  });

  useEffect(() => {
    let mounted = true;
    api.auth.me().then(user => {
      if (mounted) {
        setCurrentUser(user);
        setIsAdmin(user?.role === 'admin');
        if (user.pinned_projects) {
          setPinnedProjectIds(user.pinned_projects);
          localStorage.setItem('pinnedProjects', JSON.stringify(user.pinned_projects));
        }
        if (user.dashboard_widget_tab) {
          setActiveWidget(user.dashboard_widget_tab);
        }
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Fetch unread notifications for "While you were away" banner
  const { data: missedNotifications = [], refetch: refetchMissed } = useQuery({
    queryKey: ['dashboardMissedNotifications', currentUser?.email],
    queryFn: () => api.entities.UserNotification.filter(
      { user_email: currentUser.email, is_read: false }, '-created_date', 20
    ),
    enabled: !!currentUser?.email,
    staleTime: 30000,
  });

  const { data: projects = [], isLoading: loadingProjects, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list('-created_date'),
    staleTime: 300000, // 5 minutes
    gcTime: 300000
  });

  // Filter out quotes that already have projects created
  const incomingQuotes = useMemo(() => {
    const projectQuoteIds = new Set(projects.filter(p => p.quoteit_quote_id).map(p => p.quoteit_quote_id));
    return incomingQuotesRaw.filter(q => !projectQuoteIds.has(q.quoteit_id));
  }, [incomingQuotesRaw, projects]);

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list('-created_date'),
    staleTime: 300000,
    gcTime: 300000
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: () => api.entities.Part.list('-created_date'),
    staleTime: 300000, // 5 minutes
    gcTime: 300000
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.entities.ProjectTemplate.list(),
    staleTime: 300000 // 5 minutes
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list(),
    staleTime: 300000
  });

  const { data: quoteRequests = [] } = useQuery({
    queryKey: ['quoteRequests'],
    queryFn: () => api.entities.QuoteRequest.list(),
    staleTime: 300000,
    enabled: !isMobile
  });

  const { data: customStatuses = [] } = useQuery({
    queryKey: ['projectStatuses'],
    queryFn: () => api.entities.ProjectStatus.list('order'),
    staleTime: 300000
  });

  const { data: projectStacksData = [], refetch: refetchStacks } = useQuery({
    queryKey: ['projectStacks'],
    queryFn: () => api.entities.ProjectStack.list('order'),
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
      const dueDate = parseLocalDate(t.due_date);
      return dueDate && (isPast(dueDate) || isToday(dueDate) || isTomorrow(dueDate));
    }).sort((a, b) => (parseLocalDate(a.due_date) || 0) - (parseLocalDate(b.due_date) || 0));

    return {
      myUrgentTasks: urgent,
      overdueTasks: urgent.filter(t => { const d = parseLocalDate(t.due_date); return d && isPast(d) && !isToday(d); }),
      dueTodayTasks: urgent.filter(t => { const d = parseLocalDate(t.due_date); return d && isToday(d); }),
      dueTomorrowTasks: urgent.filter(t => { const d = parseLocalDate(t.due_date); return d && isTomorrow(d); })
    };
  }, [activeTasks, currentUser?.email]);

  const displayProjects = showArchived ? archivedProjects : activeProjects;
  
  const filteredProjects = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return displayProjects.filter(p => {
      if (query && !p.name?.toLowerCase().includes(query) && !p.client?.toLowerCase().includes(query)) return false;
      if (projectLeadFilter !== 'all' && p.project_lead !== projectLeadFilter) return false;
      if (projectStatusFilter !== 'all' && p.status !== projectStatusFilter) return false;
      return true;
    });
  }, [displayProjects, searchQuery, projectLeadFilter, projectStatusFilter]);

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
    await api.entities.Project.update(project.id, { color });
    refetchProjects();
  };

  const handleProjectGroupChange = async (project, group) => {
    await api.entities.Project.update(project.id, { group });
    refetchProjects();
  };

  const handleProjectStatusChange = async (project, status) => {
    await api.entities.Project.update(project.id, { status });
    refetchProjects();
  };

  const handleProjectDueDateChange = async (project, date) => {
    await api.entities.Project.update(project.id, { due_date: date ? format(date, 'yyyy-MM-dd') : '' });
    refetchProjects();
  };

  const handlePinToggle = (project) => {
    setPinnedProjectIds(prev => {
      const newPinned = prev.includes(project.id)
        ? prev.filter(id => id !== project.id)
        : [project.id, ...prev];
      localStorage.setItem('pinnedProjects', JSON.stringify(newPinned));
      api.auth.updateMe({ pinned_projects: newPinned }).catch(() => {});
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
          api.entities.ProjectStack.delete(currentStack.id).then(() => refetchStacks());
        } else {
          api.entities.ProjectStack.update(currentStack.id, { project_ids: newIds }).then(() => refetchStacks());
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
          api.entities.ProjectStack.update(targetStack.id, {
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
      
      api.entities.ProjectStack.create({
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
        api.entities.ProjectStack.update(stackId, {
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
        api.auth.updateMe({ pinned_projects: newPinned }).catch(() => {});
        return newPinned;
      });
    } else if (source.droppableId === 'pinned') {
      setPinnedProjectIds(prev => {
        const newPinned = prev.filter(id => id !== draggableId);
        localStorage.setItem('pinnedProjects', JSON.stringify(newPinned));
        api.auth.updateMe({ pinned_projects: newPinned }).catch(() => {});
        return newPinned;
      });
    }
  };

  // Stack handlers
  const handleStackToggleCollapse = async (stack) => {
    await api.entities.ProjectStack.update(stack.id, { is_collapsed: !stack.is_collapsed });
    refetchStacks();
  };

  const handleStackRename = async (stack, newName) => {
    await api.entities.ProjectStack.update(stack.id, { name: newName });
    refetchStacks();
  };

  const handleStackDelete = async (stack) => {
    await api.entities.ProjectStack.delete(stack.id);
    refetchStacks();
  };

  const handleStackColorChange = async (stack, color) => {
    await api.entities.ProjectStack.update(stack.id, { color });
    refetchStacks();
  };

  // Get projects not in any stack
  const projectsInStacks = projectStacks.flatMap(s => s.project_ids || []);
  const unstackedProjects = unpinnedProjects.filter(p => !projectsInStacks.includes(p.id));

  const handleTaskComplete = async (task) => {
    await api.entities.Task.update(task.id, { ...task, status: 'completed' });
    fireSubtleConfetti();
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
    setShowBulkDeleteConfirm(false);
    setIsProcessing(true);
    setProcessingType('delete');
    try {
      for (const projectId of selectedProjects) {
        await api.entities.Project.delete(projectId);
      }
      toast.success(`${selectedProjects.length} project(s) permanently deleted`);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast.error('Some projects could not be deleted. Please try again.');
    } finally {
      setSelectedProjects([]);
      setSelectionMode(false);
      setIsProcessing(false);
      setProcessingType(null);
      refetchProjects();
    }
  };

  const handleRestoreProject = async (project) => {
    await api.entities.Project.update(project.id, {
      status: 'planning',
      deleted_date: null
    });
    toast.success('Project restored');
    refetchProjects();
  };

  const handlePermanentDelete = async (project) => {
    setPermanentDeleteConfirm({ open: false, project: null });
    setIsProcessing(true);
    setProcessingType('delete');
    try {
      await api.entities.Project.delete(project.id);
      toast.success('Project permanently deleted');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
      refetchProjects();
    }
  };

  const handleSaveView = async () => {
    if (!viewName.trim()) return;
    
    const viewConfig = {
      filters: { status: listFilter },
      layout: viewMode,
      pinned: pinnedProjectIds,
      collapsed: collapsedGroups
    };

    await api.entities.DashboardView.create({
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
    setShowBulkArchiveConfirm(false);
    setIsProcessing(true);
    setProcessingType('archive');
    try {
      for (const projectId of selectedProjects) {
        await api.entities.Project.update(projectId, {
          status: 'archived',
          archived_date: new Date().toISOString()
        });
      }
      toast.success(`${selectedProjects.length} project(s) archived`);
    } catch (error) {
      toast.error('Failed to archive some projects');
    } finally {
      setSelectedProjects([]);
      setSelectionMode(false);
      setIsProcessing(false);
      setProcessingType(null);
      refetchProjects();
    }
  };

  const handleCreateProject = async (data, template, extractedParts) => {
        // Get highest project number and increment
        const allProjects = await api.entities.Project.list('-project_number', 1);
        const nextNumber = (allProjects[0]?.project_number || 1000) + 1;

        // Get "In Progress" tag to auto-assign
        const allTags = await api.entities.ProjectTag.list();
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

        const newProject = await api.entities.Project.create(projectData);

        // Send project assignment notifications to team members (excluding creator)
        for (const memberEmail of teamMembersList) {
          if (memberEmail !== currentUser?.email) {
            try {
              // Create in-app notification
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

              // Send email notification
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
              await api.functions.invoke('linkQuoteToProject', { 
                quote_id: prefillData.quoteit_quote_id, 
                project_id: newProject.id,
                project_number: newProject.project_number
              });
            } catch (err) {
              console.error('Failed to link project on QuoteIT:', err);
            }
          }

          // Delete the incoming quote record
          await api.entities.IncomingQuote.delete(prefillData.incoming_quote_id);

          // Refresh the list
          if (typeof refetchIncomingQuotes === 'function') refetchIncomingQuotes();
        }

        // Create task groups first and map template IDs to real IDs
        const groupIdMap = {};
        if (template?.default_groups?.length) {
          for (const group of template.default_groups) {
            const created = await api.entities.TaskGroup.create({
              name: group.name,
              color: group.color,
              project_id: newProject.id
            });
            if (group._template_id) {
              groupIdMap[group._template_id] = created.id;
            }
          }
        }

        if (template?.default_tasks?.length) {
          for (const task of template.default_tasks) {
            const taskData = { ...task, project_id: newProject.id };
            if (taskData.group_id && groupIdMap[taskData.group_id]) {
              taskData.group_id = String(groupIdMap[taskData.group_id]);
            } else {
              delete taskData.group_id;
            }
            await api.entities.Task.create(taskData);
          }
          refetchTasks();
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

        refetchProjects();
        setShowProjectModal(false);
      };

  if (loadingProjects || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-4 w-40 bg-slate-100 dark:bg-slate-700/50 rounded mt-2" />
              </div>
              <div className="h-12 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700/50 rounded-full" />
                  <div className="flex gap-4">
                    <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-16" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-16" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadingProjects) return <DashboardSkeleton />;

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([refetchProjects(), refetchTasks()]);
  }, [refetchProjects, refetchTasks]);

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
    <div className="min-h-screen bg-background">
      <ProcessingOverlay isVisible={isProcessing} type={processingType} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Search Bar */}
        <div className="sm:hidden mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-10 pr-4 h-11 text-sm rounded-xl bg-card border shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Greeting + CTA */}
        <div className="mb-6 hidden sm:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {currentUser?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Templates')} className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
              Templates
            </Link>
            <Button
              onClick={() => setShowProjectModal(true)}
              className="bg-[#0F2F44] hover:bg-[#1a4a6e] dark:bg-blue-600 dark:hover:bg-blue-700 shadow-lg px-5 py-2.5 h-10"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>


        {/* Greeting — mobile only */}
        {isMobile && currentUser && (
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">
              Hi, {currentUser.full_name?.split(' ')[0] || 'there'}
            </h2>
            <p className="text-xs text-muted-foreground">Here's your overview for today</p>
          </div>
        )}

        {/* -- TOP ZONE: KPIs -- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <StatsCard
            title="Active Projects"
            value={activeProjects.length}
            icon={Briefcase}
            iconColor="bg-[#0069AF]"
            href={createPageUrl('Dashboard')}
          />
          <StatsCard
            title="Pending Parts"
            value={pendingParts.length}
            subtitle={activeParts.filter(p => p.status === 'ready_to_install').length > 0 ? `${activeParts.filter(p => p.status === 'ready_to_install').length} ready` : null}
            icon={Box}
            iconColor="bg-amber-500"
            href={createPageUrl('AllTasks') + '?tab=parts'}
          />
          <StatsCard
            title="Overdue Tasks"
            value={activeTasks.filter(t => { const d = parseLocalDate(t.due_date); return d && isPast(d) && !isToday(d) && t.status !== 'completed' && t.status !== 'archived'; }).length}
            icon={AlertTriangle}
            iconColor="bg-red-500"
            highlight={activeTasks.filter(t => { const d = parseLocalDate(t.due_date); return d && isPast(d) && !isToday(d) && t.status !== 'completed' && t.status !== 'archived'; }).length > 0}
            href={createPageUrl('AllTasks') + '?view=mine_due'}
          />
          <StatsCard
            title="Completed Tasks"
            value={completedTasks.length}
            icon={CheckCircle2}
            iconColor="bg-emerald-500"
            href={createPageUrl('AllTasks') + '?view=completed'}
          />
        </div>

        {/* ── OVERDUE ALERT BANNER ── */}
        {(() => {
          const overdueList = activeTasks.filter(t => {
            if (t.status === 'completed' || t.status === 'archived') return false;
            if (!t.due_date) return false;
            const d = parseLocalDate(t.due_date);
            return d && isPast(d) && !isToday(d);
          });
          if (overdueList.length === 0) return null;
          return (
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 p-4 shadow-lg shadow-red-500/20 text-white animate-pulse-slow">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20 shrink-0">
                  <AlertTriangle className="w-6 h-6 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg">
                    {overdueList.length} Overdue Task{overdueList.length > 1 ? 's' : ''}!
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    {overdueList.slice(0, 3).map(t => (
                      <span key={t.id} className="text-sm text-white/90">{t.title}</span>
                    ))}
                    {overdueList.length > 3 && (
                      <span className="text-sm text-white/70">+{overdueList.length - 3} more</span>
                    )}
                  </div>
                </div>
                <Link to={createPageUrl('AllTasks') + '?view=mine_due'}>
                  <Button variant="secondary" size="sm" className="bg-white text-red-600 hover:bg-red-50 font-semibold shadow-lg shrink-0">
                    View All
                  </Button>
                </Link>
              </div>
            </div>
          );
        })()}

        {/* -- TOP ZONE: Incoming Quotes — desktop only -- */}
        {!isMobile && (
          <div className="mb-6">
            <IncomingQuoteBanner
              quotes={incomingQuotes}
              onCreateProject={handleCreateProjectFromQuote}
              onDismiss={handleDismissQuote}
              onSync={handleSyncQuotes}
              isSyncing={isSyncingQuotes}
            />
          </div>
        )}

        {/* -- BELOW FOLD: Tabbed Widget Card -- */}
        {(() => {
          const healthCount = activeProjects.filter(p => p.status === 'on_hold').length + activeProjects.filter(p => { if (!p.due_date) return false; const d = parseLocalDate(p.due_date); return d && isPast(d) && !isToday(d); }).length;
          const myParts = activeParts.filter(p => p.assigned_to === currentUser?.email && p.status !== 'installed');
          const upcomingDeadlines = [...activeTasks, ...activeProjects].filter(item => {
            if (item.status === 'completed' || item.status === 'archived') return false;
            if (!item.due_date) return false;
            const d = parseLocalDate(item.due_date);
            if (!d) return false;
            const daysUntil = differenceInDays(d, new Date());
            return daysUntil >= 0 && daysUntil <= 7;
          }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
          const widgetTabs = [
            { id: 'tasks', label: 'My Tasks', icon: ListTodo, badge: myUrgentTasks.length > 0 ? myUrgentTasks.length : null },
            { id: 'parts', label: 'My Parts', icon: Box, badge: myParts.length > 0 ? myParts.length : null },
            { id: 'deadlines', label: 'Deadlines', icon: Clock, badge: upcomingDeadlines.length > 0 ? upcomingDeadlines.length : null },
            { id: 'activity', label: 'Activity', icon: ActivityIcon, badge: missedNotifications.length > 0 ? missedNotifications.length : null },
            { id: 'health', label: 'Attention', icon: AlertTriangle, badge: healthCount > 0 ? healthCount : null },
          ];
          const handleWidgetTab = (id) => { setActiveWidget(id); localStorage.setItem('dashboard-active-widget', id); if (currentUser) api.auth.updateMe({ dashboard_widget_tab: id }).catch(() => {}); };
          return (
            <>
            {/* Mobile: Just My Tasks, collapsed */}
            <div className="sm:hidden mb-4">
              <CollapsibleSection
                id="mobile-my-tasks"
                title="My Tasks"
                icon={ListTodo}
                summary={`${myUrgentTasks.length} due soon`}
                defaultOpen={false}
              >
                <MyTasksCard
                  tasks={tasks}
                  parts={parts}
                  projects={projects}
                  currentUserEmail={currentUser?.email}
                  onTaskComplete={handleTaskComplete}
                  inline
                />
              </CollapsibleSection>
            </div>

            {/* Desktop: Full tabbed widget */}
            <div className="hidden sm:block rounded-2xl border bg-card shadow-warm mb-4 overflow-hidden">
              <div className="flex border-b">
                {widgetTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeWidget === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleWidgetTab(tab.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.badge && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          tab.id === 'health' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          tab.id === 'activity' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        )}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="p-4">
                {activeWidget === 'tasks' && (
                  <MyTasksCard
                    tasks={tasks}
                    parts={parts}
                    projects={projects}
                    currentUserEmail={currentUser?.email}
                    onTaskComplete={handleTaskComplete}
                    inline
                  />
                )}
                {activeWidget === 'parts' && (
                  <div className="space-y-2">
                    {myParts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No parts assigned to you</p>
                    ) : (
                      myParts.slice(0, 10).map(part => {
                        const proj = projects.find(p => p.id === part.project_id);
                        return (
                          <Link key={part.id} to={createPageUrl('ProjectParts') + `?id=${part.project_id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{part.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{proj?.name || 'Unknown project'}</p>
                            </div>
                            <span className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-md capitalize",
                              part.status === 'needed' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                              part.status === 'ordered' ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" :
                              part.status === 'ready_to_install' ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" :
                              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            )}>
                              {part.status?.replace(/_/g, ' ')}
                            </span>
                          </Link>
                        );
                      })
                    )}
                  </div>
                )}
                {activeWidget === 'deadlines' && (
                  <div className="space-y-1">
                    {upcomingDeadlines.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No deadlines in the next 7 days</p>
                    ) : (
                      upcomingDeadlines.slice(0, 10).map((item, i) => {
                        const dueDate = parseLocalDate(item.due_date);
                        const daysUntil = differenceInDays(dueDate, new Date());
                        const isProject = !!item.client;
                        const proj = isProject ? item : projects.find(p => p.id === item.project_id);
                        const assignee = item.assigned_to ? (item.assigned_name || item.assigned_to?.split('@')[0]) : null;
                        const linkUrl = isProject
                          ? createPageUrl('ProjectDetail') + `?id=${item.id}`
                          : createPageUrl('ProjectTasks') + `?id=${item.project_id}`;
                        return (
                          <Link key={item.id + '-' + i} to={linkUrl} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{item.name || item.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                {proj?.project_number && (
                                  <span className="px-1.5 py-0 rounded bg-muted font-mono">#{proj.project_number}</span>
                                )}
                                {proj?.client && (
                                  <span className="truncate max-w-[120px]">{proj.client}</span>
                                )}
                                {proj?.name && !isProject && (
                                  <span className="truncate max-w-[120px]">{proj.name}</span>
                                )}
                                {assignee && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-3.5 h-3.5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold">{assignee[0]?.toUpperCase()}</span>
                                    {assignee}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-md shrink-0",
                              daysUntil === 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                              daysUntil <= 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            )}>
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                            </span>
                          </Link>
                        );
                      })
                    )}
                  </div>
                )}
                {activeWidget === 'activity' && (
                  <ActivityTimeline
                    projects={projects}
                    proposals={quoteRequests}
                  />
                )}
                {activeWidget === 'health' && (
                  <ProjectHealthGrid
                    projects={activeProjects}
                    tasks={activeTasks}
                  />
                )}
              </div>
            </div>
            </>
          );
        })()}

        {/* -- BELOW FOLD: Projects -- */}
        <CollapsibleSection
          id="projects"
          title={showArchived ? 'Archived Projects' : 'Active Projects'}
          icon={FolderKanban}
          summary={`${activeProjects.length} active`}
          defaultOpen={true}
        >
        <div>
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">
                  {showArchived ? 'Archived Projects' : 'Active Projects'}
                </h2>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
                >
                  <Archive className="w-4 h-4" />
                  <span className="hidden sm:inline">{showArchived ? 'Show Active' : `Archived (${archivedProjects.length})`}</span>
                  <span className="sm:hidden">{showArchived ? 'Active' : `(${archivedProjects.length})`}</span>
                </button>
              </div>
              <div className="hidden sm:flex items-center gap-2 w-full sm:w-auto">
                {/* Selection Mode Toggle */}
                {!showArchived && (
                  <button
                    onClick={() => { setSelectionMode(!selectionMode); setSelectedProjects([]); }}
                    className={cn(
                      "p-2 rounded-md transition-all",
                      selectionMode ? "bg-primary text-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    )}
                    title="Select multiple projects"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                )}
                {/* View Mode Toggle */}
                <div className="flex items-center bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === 'cards' ? "bg-white dark:bg-slate-600 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === 'list' ? "bg-white dark:bg-slate-600 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full sm:w-48 bg-muted/50 border h-9"
                    />
                  </div>
              </div>
            </div>

            {/* Mobile: simple search */}
            <div className="sm:hidden mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm rounded-xl bg-muted/50 border"
                />
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectionMode && (
              <div className="mb-4 p-3 bg-primary/10 dark:bg-blue-900/30 rounded-xl border border-primary/20 dark:border-blue-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllProjects}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:text-foreground dark:text-blue-400 dark:hover:text-blue-300"
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
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-xs text-slate-500 sm:mr-2 shrink-0">Jump to:</span>
                <div className="flex items-center gap-0.5 bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-slate-700 p-1.5 overflow-x-auto max-w-full scrollbar-thin">
                  <button
                    onClick={() => { setActiveLetter(null); setCurrentPage(1); }}
                    className={cn(
                      "px-2 py-1 rounded-lg text-xs font-medium transition-all",
                      !activeLetter ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100"
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
                            ? "bg-primary text-white scale-110 shadow-lg z-10"
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
                <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                  {/* List Header */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2535]">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-4">All Projects</h2>
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
                              ? "bg-primary dark:bg-blue-600 text-white"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
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
                                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                              >
                                {idx === 0 && (
                                  <span className="w-6 text-slate-400 dark:text-slate-500 font-semibold">{letter}</span>
                                )}
                                {idx > 0 && <span className="w-6" />}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{project.name}</h3>
                                    {project.client && (
                                      <span className="text-muted-foreground dark:text-slate-400 text-sm">• {project.client}</span>
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
                                  <div className="flex items-center gap-2 ml-4">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRestoreProject(project); }}
                                    >
                                      Restore
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPermanentDeleteConfirm({ open: true, project }); }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                                      Delete
                                    </Button>
                                  </div>
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
                          className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{project.name}</h3>
                              {project.client && (
                                <span className="text-muted-foreground dark:text-slate-400 text-sm">• {project.client}</span>
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
                  {/* Pinned Projects Section — hidden on mobile */}
                  <div className="hidden sm:block">
                  {pinnedProjects.length > 0 && (
                    <Droppable droppableId="pinned" direction="horizontal">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "mb-6 p-4 rounded-2xl border-2 border-dashed transition-all",
                            snapshot.isDraggingOver ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600" : "border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Pin className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-semibold text-amber-700">Pinned Projects</span>
                          </div>
                          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {pinnedProjects.map((project, idx) => (
                              <Draggable key={project.id} draggableId={project.id} index={idx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    style={provided.draggableProps.style}
                                    className="h-full"
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
                            snapshot.isDraggingOver ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600" : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
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
                  </div>

                  {/* Stacks Section */}
                  {projectStacks.length > 0 && (
                    <div className="mb-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {groupProjects.slice((currentPage - 1) * PROJECTS_PER_PAGE, currentPage * PROJECTS_PER_PAGE).map((project, idx) => (
                                    <Draggable key={project.id} draggableId={project.id} index={idx}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          style={provided.draggableProps.style}
                                          className={cn("h-full", snapshot.combineTargetFor ? 'ring-2 ring-primary ring-offset-2 rounded-2xl scale-[1.02] shadow-lg transition-all' : 'transition-all')}
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
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                ? "bg-primary text-white"
                                : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
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
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-card dark:to-card rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-8 sm:p-16 text-center shadow-card">
                  <div className="w-16 h-16 rounded-2xl bg-muted dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-5">
                    <FolderKanban className="w-8 h-8 text-muted-foreground dark:text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground dark:text-slate-100 mb-2">No projects yet</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">Create your first project to start tracking tasks, parts, and progress.</p>
                  <Button onClick={() => setShowProjectModal(true)} size="lg" className="bg-primary hover:bg-primary/80 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Project
                  </Button>
                </div>
            )}
          </div>

        </div>
        </CollapsibleSection>

      </div>

      <ProjectModal
        open={showProjectModal}
        onClose={() => { setShowProjectModal(false); setPrefillData(null); }}
        templates={templates}
        onSave={handleCreateProject}
        prefillData={prefillData}
        currentUserEmail={currentUser?.email}
      />


      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Permanently Delete {selectedProjects.length} Project{selectedProjects.length > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">This will permanently delete the selected project{selectedProjects.length > 1 ? 's' : ''} and ALL associated data including tasks, parts, notes, files, time entries, and proposals.</span>
              <span className="block font-semibold text-red-600">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation (individual) */}
      <AlertDialog open={permanentDeleteConfirm.open} onOpenChange={(open) => !open && setPermanentDeleteConfirm({ open: false, project: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Permanently Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">This will permanently delete <strong>"{permanentDeleteConfirm.project?.name}"</strong> and ALL associated data including tasks, parts, notes, files, time entries, and proposals.</span>
              <span className="block font-semibold text-red-600">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handlePermanentDelete(permanentDeleteConfirm.project)} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permanently
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
    </PullToRefresh>
  );
}
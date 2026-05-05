import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Square, Trash2 } from 'lucide-react';
import { stopTimerLiveActivity } from '@/hooks/useLiveActivity';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function GlobalTimerBanner({ currentUser }) {
  const { isAuthenticated } = useAuth();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopDescription, setStopDescription] = useState('');
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef(null);
  const wasAuthenticatedRef = useRef(isAuthenticated);
  const autoStopFiredRef = useRef(false);

  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => api.entities.TimeEntry.list('-created_date', 200),
    enabled: !!currentUser?.email,
    refetchInterval: 30000,
  });

  const activeEntry = allTimeEntries.find(
    (e) => e.is_running && e.user_email === currentUser?.email
  );

  const projectId = activeEntry?.project_id;

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () =>
      api.entities.Project.filter({ id: projectId }).then((results) => results[0] || null),
    enabled: !!projectId,
  });

  const projectName = project?.project_name || project?.name || 'Project';

  useEffect(() => {
    if (!activeEntry) {
      setElapsedSeconds(0);
      return;
    }
    const startTime = new Date(activeEntry.start_time);
    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  const stopTimerSilently = useCallback(async (entry, reason) => {
    if (!entry || autoStopFiredRef.current) return;
    autoStopFiredRef.current = true;
    try {
      const endTime = new Date();
      const startTime = new Date(entry.start_time);
      const durationMinutes = Math.round((endTime - startTime) / 60000);
      await api.entities.TimeEntry.update(entry.id, {
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        is_running: false,
        description: reason,
      });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['allTimeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      stopTimerLiveActivity();
      toast(reason);
    } catch {
      autoStopFiredRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    if (activeEntry) autoStopFiredRef.current = false;
  }, [activeEntry?.id]);

  // Auto-stop on sign-out
  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated && activeEntry) {
      stopTimerSilently(activeEntry, 'Auto-stopped: signed out');
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, activeEntry, stopTimerSilently]);

  // Auto-stop after 10 minutes of inactivity
  useEffect(() => {
    if (!activeEntry) return;
    const resetActivity = () => { lastActivityRef.current = Date.now(); };
    const checkInactivity = () => {
      if (!activeEntry || autoStopFiredRef.current) return;
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        stopTimerSilently(activeEntry, 'Auto-stopped: 10 min inactivity');
      }
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));
    inactivityTimerRef.current = setInterval(checkInactivity, 30000);
    resetActivity();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivity));
      clearInterval(inactivityTimerRef.current);
    };
  }, [activeEntry, stopTimerSilently]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    queryClient.invalidateQueries({ queryKey: ['allTimeEntries'] });
    queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
  };

  const stopMutation = useMutation({
    mutationFn: async (description) => {
      const endTime = new Date();
      const startTime = new Date(activeEntry.start_time);
      const durationMinutes = Math.round((endTime - startTime) / 60000);

      await api.entities.TimeEntry.update(activeEntry.id, {
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        is_running: false,
        description,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setShowStopModal(false);
      setStopDescription('');
      stopTimerLiveActivity();
    },
    onError: () => {
      toast.error('Failed to stop timer');
    },
  });

  const discardMutation = useMutation({
    mutationFn: async () => {
      await api.entities.TimeEntry.delete(activeEntry.id);
    },
    onSuccess: () => {
      invalidateAll();
      setShowStopModal(false);
      setStopDescription('');
      stopTimerLiveActivity();
      toast('Timer discarded');
    },
    onError: () => {
      toast.error('Failed to discard timer');
    },
  });

  const handleStopClick = () => {
    setPendingNavigation(null);
    setStopDescription('');
    setShowStopModal(true);
  };

  const finishPendingNavigation = () => {
    if (pendingNavigation && pendingNavigation !== '__back__') {
      navigate(pendingNavigation);
    }
    // For '__back__' the browser already navigated back; nothing to do.
    setPendingNavigation(null);
  };

  const handleConfirmStop = () => {
    stopMutation.mutate(stopDescription, {
      onSuccess: () => finishPendingNavigation(),
    });
  };

  const handleDiscard = () => {
    discardMutation.mutate(undefined, {
      onSuccess: () => finishPendingNavigation(),
    });
  };

  const handleKeepRunning = () => {
    setShowStopModal(false);
    finishPendingNavigation();
  };

  const handleStay = () => {
    // If back-button triggered, undo the browser back by going forward
    if (pendingNavigation === '__back__') {
      navigate(1);
    }
    setPendingNavigation(null);
    setShowStopModal(false);
  };

  const isPending = stopMutation.isPending || discardMutation.isPending;
  const isNavigationTriggered = !!pendingNavigation;

  // Intercept link clicks document-wide while a timer is running
  useEffect(() => {
    if (!activeEntry) return;
    const activeProjectId = activeEntry.project_id;

    const handleClick = (e) => {
      // Ignore modifier keys (cmd/ctrl-click opens new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0 && e.button !== undefined) return;
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      // External or hash links — don't intercept
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
      // Same-project links allowed
      if (activeProjectId && href.includes(activeProjectId)) return;
      // Same URL — no actual navigation
      if (href === window.location.pathname + window.location.search) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingNavigation(href);
      setStopDescription('');
      setShowStopModal(true);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [activeEntry]);

  // Warn on browser close/refresh while timer running
  useEffect(() => {
    if (!activeEntry) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You have an active timer running.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeEntry]);

  // Intercept browser back/forward while timer running
  useEffect(() => {
    if (!activeEntry) return;
    const activeProjectId = activeEntry.project_id;

    const handlePopState = () => {
      // Don't intercept if back navigated within the same project
      const stillOnProject =
        activeProjectId &&
        (window.location.search.includes(activeProjectId) ||
          window.location.pathname.includes(activeProjectId));
      if (stillOnProject) return;

      setPendingNavigation('__back__');
      setStopDescription('');
      setShowStopModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeEntry]);

  if (!activeEntry) {
    return null;
  }

  const projectUrl = createPageUrl('ProjectDetail') + `?id=${projectId}`;

  return (
    <>
      <div
        className={cn(
          'fixed bottom-20 lg:bottom-6 right-4 z-40',
          'bg-red-600 dark:bg-red-700',
          'rounded-2xl shadow-2xl shadow-red-600/30 border border-red-500/20',
          'text-white text-xs',
          'animate-in slide-in-from-bottom-4 fade-in duration-300'
        )}
      >
        <div className="flex items-center gap-3 pl-4 pr-2 py-2.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>

          <Link
            to={projectUrl}
            className="truncate font-medium text-white/90 hover:text-white transition-colors max-w-[160px]"
          >
            {projectName}
          </Link>

          <span className="font-mono text-sm font-bold tabular-nums text-white tracking-wide">
            {formatElapsed(elapsedSeconds)}
          </span>

          <button
            onClick={handleStopClick}
            disabled={isPending}
            className="flex items-center gap-1.5 h-7 px-3 rounded-xl text-[11px] font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors ml-1"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            Stop
          </button>
        </div>
      </div>

      <Dialog open={showStopModal} onOpenChange={(open) => { if (!open) handleStay(); }}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <p className="text-lg font-bold text-foreground text-center">{isNavigationTriggered ? 'Timer Running' : 'Stop Timer'}</p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {isNavigationTriggered ? <>You have an active timer on <strong>{projectName}</strong></> : projectName}
            </p>
            <p className="text-3xl font-mono font-bold text-center text-red-600 dark:text-red-400 mt-2 tabular-nums">
              {formatElapsed(elapsedSeconds)}
            </p>
            <Textarea
              value={stopDescription}
              onChange={(e) => setStopDescription(e.target.value)}
              placeholder="What did you work on?"
              className="mt-4 min-h-[80px] bg-muted/30 border-border rounded-xl text-sm"
              autoFocus
            />
          </div>
          {isNavigationTriggered ? (
            <div className="flex flex-col border-t border-border">
              <button
                onClick={handleConfirmStop}
                disabled={isPending}
                className="py-3 text-sm font-bold text-[#0F2F44] dark:text-blue-400 hover:bg-blue-500/10 transition-colors border-b border-border"
              >
                Save & Stop Timer
              </button>
              <button
                onClick={handleDiscard}
                disabled={isPending}
                className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors border-b border-border"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Stop & Discard
              </button>
              <button
                onClick={handleKeepRunning}
                disabled={isPending}
                className="py-3 text-sm font-medium text-blue-600 hover:bg-blue-500/10 transition-colors border-b border-border"
              >
                Keep Running & Leave
              </button>
              <button
                onClick={handleStay}
                disabled={isPending}
                className="py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Stay on Project
              </button>
            </div>
          ) : (
          <div className="flex border-t border-border">
            <button
              onClick={handleStay}
              disabled={isPending}
              className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-r border-border"
            >
              Cancel
            </button>
            <button
              onClick={handleDiscard}
              disabled={isPending}
              className="flex items-center justify-center gap-1.5 flex-1 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors border-r border-border"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Discard
            </button>
            <button
              onClick={handleConfirmStop}
              disabled={isPending}
              className="flex-1 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Save & Stop
            </button>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { Square, Timer } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { stopTimerLiveActivity } from '@/hooks/useLiveActivity';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

export default function GlobalActiveTimer() {
  const { user: authUser, isAuthenticated } = useAuth();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopDescription, setStopDescription] = useState('');
  const queryClient = useQueryClient();
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef(null);
  const wasAuthenticatedRef = useRef(isAuthenticated);
  const autoStopFiredRef = useRef(false);

  const { data: activeEntries = [] } = useQuery({
    queryKey: ['globalActiveTimer', authUser?.email],
    queryFn: async () => {
      const entries = await api.entities.TimeEntry.filter({ is_running: true });
      return entries.filter(e => e.user_email === authUser?.email);
    },
    enabled: !!authUser?.email,
    refetchInterval: 30000,
  });

  const activeEntry = activeEntries[0];

  const { data: project } = useQuery({
    queryKey: ['timerProject', activeEntry?.project_id],
    queryFn: () => api.entities.Project.get(activeEntry.project_id),
    enabled: !!activeEntry?.project_id,
  });

  useEffect(() => {
    if (!activeEntry) {
      setElapsedSeconds(0);
      return;
    }
    const startTime = new Date(activeEntry.start_time);
    const update = () => setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
    update();
    const interval = setInterval(update, 1000);
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
      queryClient.invalidateQueries({ queryKey: ['globalActiveTimer'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      stopTimerLiveActivity();
    } catch {
      autoStopFiredRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    if (activeEntry) {
      autoStopFiredRef.current = false;
    }
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

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = () => {
      if (!activeEntry || autoStopFiredRef.current) return;
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= INACTIVITY_TIMEOUT_MS) {
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
      queryClient.invalidateQueries({ queryKey: ['globalActiveTimer'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setShowStopModal(false);
      setStopDescription('');
      stopTimerLiveActivity();
    },
  });

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!activeEntry) return null;

  const projectName = project?.name || 'Project';

  return (
    <>
      <div className="lg:hidden fixed bottom-[4.5rem] left-3 right-3 z-50 animate-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3 bg-red-600 text-white rounded-2xl px-4 py-2.5 shadow-lg shadow-red-600/30">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          <Link
            to={createPageUrl('ProjectDetail') + `?id=${activeEntry.project_id}`}
            className="flex-1 min-w-0 truncate text-sm font-medium hover:underline"
          >
            {projectName}
          </Link>
          <span className="font-mono text-sm font-bold tabular-nums shrink-0">
            {formatTime(elapsedSeconds)}
          </span>
          <button
            onClick={() => { setStopDescription(''); setShowStopModal(true); }}
            className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg transition-colors shrink-0"
            disabled={stopMutation.isPending}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="hidden lg:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3 bg-red-600 text-white rounded-2xl px-5 py-2.5 shadow-lg shadow-red-600/30">
          <Timer className="w-4 h-4 shrink-0" />
          <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          <Link
            to={createPageUrl('ProjectDetail') + `?id=${activeEntry.project_id}`}
            className="text-sm font-medium hover:underline max-w-[200px] truncate"
          >
            {projectName}
          </Link>
          <span className="font-mono text-sm font-bold tabular-nums shrink-0">
            {formatTime(elapsedSeconds)}
          </span>
          <button
            onClick={() => { setStopDescription(''); setShowStopModal(true); }}
            className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg transition-colors shrink-0"
            disabled={stopMutation.isPending}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <Dialog open={showStopModal} onOpenChange={setShowStopModal}>
        <DialogContent className="sm:max-w-sm p-0">
          <div className="px-5 pt-5 pb-4">
            <p className="text-lg font-bold text-foreground text-center">Stop Timer</p>
            <p className="text-xs text-muted-foreground text-center mt-1">{projectName}</p>
            <p className="text-3xl font-mono font-bold text-center text-red-600 mt-2 tabular-nums">
              {formatTime(elapsedSeconds)}
            </p>
            <Textarea
              value={stopDescription}
              onChange={(e) => setStopDescription(e.target.value)}
              placeholder="What did you work on?"
              className="mt-4 min-h-[80px] bg-muted/30 border-border rounded-xl text-sm"
              autoFocus
            />
          </div>
          <div className="flex border-t border-border">
            <button
              onClick={() => setShowStopModal(false)}
              className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-r border-border"
            >
              Cancel
            </button>
            <button
              onClick={() => stopMutation.mutate(stopDescription)}
              disabled={stopMutation.isPending}
              className="flex-1 py-3 text-sm font-bold text-red-600 hover:bg-red-500/10 transition-colors"
            >
              Save & Stop
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

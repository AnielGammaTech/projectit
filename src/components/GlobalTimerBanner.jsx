import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Square, Trash2 } from 'lucide-react';
import { stopTimerLiveActivity } from '@/hooks/useLiveActivity';
import { toast } from 'sonner';

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function GlobalTimerBanner({ currentUser }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopDescription, setStopDescription] = useState('');
  const queryClient = useQueryClient();

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
    setStopDescription('');
    setShowStopModal(true);
  };

  const handleConfirmStop = () => {
    stopMutation.mutate(stopDescription);
  };

  const handleDiscard = () => {
    discardMutation.mutate();
  };

  const isPending = stopMutation.isPending || discardMutation.isPending;

  if (!activeEntry) {
    return null;
  }

  const projectUrl = createPageUrl('ProjectDetail') + `?id=${projectId}`;

  return (
    <>
      <div
        className={cn(
          'fixed top-[56px] left-0 right-0 z-30 h-8',
          'bg-[#0F2F44] dark:bg-[#0a1f2e]',
          'flex items-center justify-between px-4',
          'text-white text-xs shadow-md'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-emerald-400 font-medium text-[10px] uppercase tracking-wider">Live</span>
          </div>

          <span className="text-white/30">|</span>

          <Link
            to={projectUrl}
            className="truncate font-medium text-white/90 hover:text-white transition-colors"
          >
            {projectName}
          </Link>

          <span className="font-mono font-bold tabular-nums text-white tracking-wide">
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>

        <button
          onClick={handleStopClick}
          disabled={isPending}
          className="flex items-center gap-1.5 h-5.5 px-2.5 rounded-md text-[10px] font-semibold bg-red-500/90 hover:bg-red-500 text-white transition-colors"
        >
          <Square className="w-2.5 h-2.5 fill-current" />
          Stop
        </button>
      </div>

      <Dialog open={showStopModal} onOpenChange={setShowStopModal}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <p className="text-lg font-bold text-foreground text-center">Stop Timer</p>
            <p className="text-xs text-muted-foreground text-center mt-1">{projectName}</p>
            <p className="text-3xl font-mono font-bold text-center text-[#0F2F44] dark:text-blue-400 mt-2 tabular-nums">
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
          <div className="flex border-t border-border">
            <button
              onClick={() => setShowStopModal(false)}
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
              className="flex-1 py-3 text-sm font-bold text-[#0F2F44] dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
            >
              Save & Stop
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

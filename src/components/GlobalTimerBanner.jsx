import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Square } from 'lucide-react';
import { stopTimerLiveActivity } from '@/hooks/useLiveActivity';

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
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries', projectId] });
      queryClient.invalidateQueries({ queryKey: ['allTimeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      setShowStopModal(false);
      setStopDescription('');
      stopTimerLiveActivity();
    },
  });

  const handleStopClick = () => {
    setStopDescription('');
    setShowStopModal(true);
  };

  const handleConfirmStop = () => {
    stopMutation.mutate(stopDescription);
  };

  if (!activeEntry) {
    return null;
  }

  const projectUrl = createPageUrl('ProjectDetail') + `?id=${projectId}`;

  return (
    <>
      <div
        className={cn(
          'fixed top-[56px] left-0 right-0 z-30 h-9',
          'bg-gradient-to-r from-emerald-600 to-emerald-500',
          'flex items-center justify-between px-4',
          'text-white text-sm shadow-md'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>

          <Link
            to={projectUrl}
            className="truncate font-medium hover:underline underline-offset-2"
          >
            {projectName}
          </Link>

          <span className="font-mono font-semibold tabular-nums tracking-wide">
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>

        <Button
          onClick={handleStopClick}
          size="sm"
          className="h-6 px-2.5 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
          disabled={stopMutation.isPending}
        >
          <Square className="w-3 h-3 mr-1" />
          Stop
        </Button>
      </div>

      <Dialog open={showStopModal} onOpenChange={setShowStopModal}>
        <DialogContent className="sm:max-w-sm p-0">
          <div className="px-5 pt-5 pb-4">
            <p className="text-lg font-bold text-foreground text-center">Stop Timer</p>
            <p className="text-xs text-muted-foreground text-center mt-1">{projectName}</p>
            <p className="text-3xl font-mono font-bold text-center text-emerald-600 mt-2 tabular-nums">
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
              className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-r border-border"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmStop}
              disabled={stopMutation.isPending}
              className="flex-1 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-500/10 transition-colors"
            >
              Save & Stop
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Play, Square, Timer, Clock, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { startTimerLiveActivity, stopTimerLiveActivity } from '@/hooks/useLiveActivity';
import { toast } from 'sonner';

export default function TimeTracker({ projectId, projectName = '', currentUser, timeBudgetHours = 0, variant = 'inline' }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopDescription, setStopDescription] = useState('');
  const queryClient = useQueryClient();

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries', projectId],
    queryFn: () => api.entities.TimeEntry.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId
  });

  const activeEntry = timeEntries.find(e => e.is_running && e.user_email === currentUser?.email);

  const totalMinutes = timeEntries
    .filter(e => !e.is_running && e.duration_minutes)
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const totalHours = totalMinutes / 60;
  const budgetPercent = timeBudgetHours > 0 ? (totalHours / timeBudgetHours) * 100 : 0;

  useEffect(() => {
    if (activeEntry) {
      const startTime = new Date(activeEntry.start_time);
      const updateElapsed = () => {
        setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
      };
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [activeEntry]);

  const startMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();

      // Stop ALL running timers for this user across every project
      const allRunning = await api.entities.TimeEntry.filter({
        user_email: currentUser.email,
        is_running: true
      });
      for (const entry of allRunning) {
        const startTime = new Date(entry.start_time);
        const durationMinutes = Math.round((now - startTime) / 60000);
        await api.entities.TimeEntry.update(entry.id, {
          end_time: now.toISOString(),
          duration_minutes: durationMinutes,
          is_running: false,
          description: entry.description || '(auto-stopped)'
        });
      }

      return api.entities.TimeEntry.create({
        project_id: projectId,
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        start_time: now.toISOString(),
        is_running: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      startTimerLiveActivity(projectName || 'Project Timer', new Date().toISOString());
    },
    onError: () => {
      toast.error('Failed to start timer');
    }
  });

  const stopMutation = useMutation({
    mutationFn: async (description) => {
      const endTime = new Date();
      const startTime = new Date(activeEntry.start_time);
      const durationMinutes = Math.round((endTime - startTime) / 60000);

      await api.entities.TimeEntry.update(activeEntry.id, {
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        is_running: false,
        description
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setShowStopModal(false);
      setStopDescription('');
      stopTimerLiveActivity();
    },
    onError: () => {
      toast.error('Failed to stop timer. Please try again.');
    }
  });

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatHours = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const handleStopClick = () => {
    setStopDescription('');
    setShowStopModal(true);
  };

  const handleConfirmStop = () => {
    stopMutation.mutate(stopDescription);
  };

  // Compact variant - minimal card style
  if (variant === 'compact') {
    return (
      <>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Clock className="w-4 h-4 text-cyan-600" />
              <span className="font-semibold text-sm">{formatHours(totalMinutes)}</span>
            </div>
            {timeBudgetHours > 0 && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span className={cn(
                  budgetPercent > 100 ? "text-red-500" : budgetPercent > 80 ? "text-amber-500" : ""
                )}>
                  {Math.round(budgetPercent)}% of {timeBudgetHours}h
                </span>
              </div>
            )}
          </div>
          
          {!activeEntry ? (
            <Button 
              onClick={() => startMutation.mutate()}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 h-7 px-2.5 text-xs"
              disabled={startMutation.isPending}
            >
              <Play className="w-3 h-3 mr-1" />
              Start
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded border border-green-200">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-xs font-semibold text-green-700">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <Button 
                onClick={handleStopClick}
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs"
                disabled={stopMutation.isPending}
              >
                <Square className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Stop Timer Modal */}
        <Dialog open={showStopModal} onOpenChange={setShowStopModal}>
          <DialogContent className="sm:max-w-sm p-0">
            <div className="px-5 pt-5 pb-4">
              <p className="text-lg font-bold text-foreground text-center">Stop Timer</p>
              <p className="text-3xl font-mono font-bold text-center text-[#0069AF] mt-2 tabular-nums">{formatTime(elapsedSeconds)}</p>
              <Textarea
                value={stopDescription}
                onChange={(e) => setStopDescription(e.target.value)}
                placeholder="What did you work on?"
                className="mt-4 min-h-[80px] bg-muted/30 border-border rounded-xl text-sm"
                autoFocus
              />
            </div>
            <div className="flex border-t border-border">
              <button onClick={() => setShowStopModal(false)} className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-r border-border">
                Cancel
              </button>
              <button onClick={handleConfirmStop} disabled={stopMutation.isPending} className="flex-1 py-3 text-sm font-bold text-[#0069AF] hover:bg-blue-500/10 transition-colors">
                Save & Stop
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Card variant - shows more details in a box
  if (variant === 'card') {
    return (
      <>
        <div className="space-y-4">
          {/* Time Summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatHours(totalMinutes)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total logged</p>
            </div>
            {timeBudgetHours > 0 && (
              <div className="text-right">
                <p className={cn(
                  "text-lg font-semibold",
                  budgetPercent > 100 ? "text-red-600" : budgetPercent > 80 ? "text-amber-600" : "text-slate-600"
                )}>
                  {Math.round(budgetPercent)}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">of {timeBudgetHours}h budget</p>
              </div>
            )}
          </div>

          {/* Budget Progress Bar */}
          {timeBudgetHours > 0 && (
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  budgetPercent > 100 ? "bg-red-500" : budgetPercent > 80 ? "bg-amber-500" : "bg-cyan-500"
                )}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
          )}

          {/* Timer Controls */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            {!activeEntry ? (
              <Button 
                onClick={() => startMutation.mutate()}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                disabled={startMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-mono text-xl font-bold text-green-700">
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>
                <Button 
                  onClick={handleStopClick}
                  variant="destructive"
                  className="w-full"
                  disabled={stopMutation.isPending}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Timer
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stop Timer Modal */}
        <Dialog open={showStopModal} onOpenChange={setShowStopModal}>
          <DialogContent className="sm:max-w-sm p-0">
            <div className="px-5 pt-5 pb-4">
              <p className="text-lg font-bold text-foreground text-center">Stop Timer</p>
              <p className="text-3xl font-mono font-bold text-center text-[#0069AF] mt-2 tabular-nums">{formatTime(elapsedSeconds)}</p>
              <Textarea
                value={stopDescription}
                onChange={(e) => setStopDescription(e.target.value)}
                placeholder="What did you work on?"
                className="mt-4 min-h-[80px] bg-muted/30 border-border rounded-xl text-sm"
                autoFocus
              />
            </div>
            <div className="flex border-t border-border">
              <button onClick={() => setShowStopModal(false)} className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-r border-border">
                Cancel
              </button>
              <button onClick={handleConfirmStop} disabled={stopMutation.isPending} className="flex-1 py-3 text-sm font-bold text-[#0069AF] hover:bg-blue-500/10 transition-colors">
                Save & Stop
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Default inline variant
  return (
    <>
      <div className="flex items-center gap-2">
        {!activeEntry ? (
          <Button 
            onClick={() => startMutation.mutate()}
            size="sm"
            className="bg-[#0069AF] hover:bg-[#133F5C] dark:bg-blue-600 dark:hover:bg-blue-700 h-8 px-3"
            disabled={startMutation.isPending}
          >
            <Play className="w-3 h-3 mr-1.5" />
            Start Timer
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-sm font-semibold text-green-700">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
            <Button 
              onClick={handleStopClick}
              size="sm"
              variant="destructive"
              className="h-8 px-3"
              disabled={stopMutation.isPending}
            >
              <Square className="w-3 h-3 mr-1.5" />
              Stop
            </Button>
          </div>
        )}
        
        {/* Time info */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Timer className="w-3 h-3" />
          <span>{formatHours(totalMinutes)}</span>
          {timeBudgetHours > 0 && (
            <span className={cn(
              budgetPercent > 100 ? "text-red-500" : budgetPercent > 80 ? "text-amber-500" : ""
            )}>
              / {timeBudgetHours}h
            </span>
          )}
        </div>
      </div>

      {/* Stop Timer Modal */}
      <Dialog open={showStopModal} onOpenChange={setShowStopModal}>
          <DialogContent className="sm:max-w-sm p-0">
            <div className="px-5 pt-5 pb-4">
              <p className="text-lg font-bold text-foreground text-center">Stop Timer</p>
              <p className="text-3xl font-mono font-bold text-center text-[#0069AF] mt-2 tabular-nums">{formatTime(elapsedSeconds)}</p>
              <Textarea
                value={stopDescription}
                onChange={(e) => setStopDescription(e.target.value)}
                placeholder="What did you work on?"
                className="mt-4 min-h-[80px] bg-muted/30 border-border rounded-xl text-sm"
                autoFocus
              />
            </div>
            <div className="flex border-t border-border">
              <button onClick={() => setShowStopModal(false)} className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-r border-border">
                Cancel
              </button>
              <button onClick={handleConfirmStop} disabled={stopMutation.isPending} className="flex-1 py-3 text-sm font-bold text-[#0069AF] hover:bg-blue-500/10 transition-colors">
                Save & Stop
              </button>
            </div>
          </DialogContent>
      </Dialog>
    </>
  );
}
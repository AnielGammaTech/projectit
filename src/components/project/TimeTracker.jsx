import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Play, Square, Timer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function TimeTracker({ projectId, currentUser, timeBudgetHours = 0, variant = 'inline' }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopDescription, setStopDescription] = useState('');
  const queryClient = useQueryClient();

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries', projectId],
    queryFn: () => base44.entities.TimeEntry.filter({ project_id: projectId }, '-created_date'),
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
    mutationFn: () => base44.entities.TimeEntry.create({
      project_id: projectId,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      start_time: new Date().toISOString(),
      is_running: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', projectId] });
    }
  });

  const stopMutation = useMutation({
    mutationFn: async (description) => {
      const endTime = new Date();
      const startTime = new Date(activeEntry.start_time);
      const durationMinutes = Math.round((endTime - startTime) / 60000);
      
      await base44.entities.TimeEntry.update(activeEntry.id, {
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        is_running: false,
        description
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', projectId] });
      setShowStopModal(false);
      setStopDescription('');
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

  return (
    <>
      <div className="flex items-center gap-2">
        {!activeEntry ? (
          <Button 
            onClick={() => startMutation.mutate()}
            size="sm"
            className="bg-[#0069AF] hover:bg-[#133F5C] h-8 px-3"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What did you work on?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">Time logged</p>
              <p className="text-2xl font-mono font-bold text-slate-900">{formatTime(elapsedSeconds)}</p>
            </div>
            <Textarea
              value={stopDescription}
              onChange={(e) => setStopDescription(e.target.value)}
              placeholder="Describe what you worked on..."
              className="min-h-[100px]"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowStopModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmStop}
                className="bg-[#0069AF] hover:bg-[#133F5C]"
                disabled={stopMutation.isPending}
              >
                Save & Stop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
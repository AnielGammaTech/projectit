import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Square, Clock, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TimeTracker({ projectId, currentUser, timeBudgetHours = 0 }) {
  const [description, setDescription] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const queryClient = useQueryClient();

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries', projectId],
    queryFn: () => base44.entities.TimeEntry.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId
  });

  const activeEntry = timeEntries.find(e => e.is_running && e.user_email === currentUser?.email);

  // Calculate total logged time
  const totalMinutes = timeEntries
    .filter(e => !e.is_running && e.duration_minutes)
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const totalHours = totalMinutes / 60;
  const budgetPercent = timeBudgetHours > 0 ? (totalHours / timeBudgetHours) * 100 : 0;

  // Timer effect
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
      is_running: true,
      description
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', projectId] });
      setDescription('');
    }
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const endTime = new Date();
      const startTime = new Date(activeEntry.start_time);
      const durationMinutes = Math.round((endTime - startTime) / 60000);
      
      await base44.entities.TimeEntry.update(activeEntry.id, {
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        is_running: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries', projectId] });
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

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-purple-600 shadow-lg shadow-purple-200">
          <Timer className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Time Tracking</h3>
          <p className="text-sm text-slate-500">
            {formatHours(totalMinutes)} logged
            {timeBudgetHours > 0 && ` / ${timeBudgetHours}h budget`}
          </p>
        </div>
      </div>

      {/* Budget Progress */}
      {timeBudgetHours > 0 && (
        <div className="mb-4">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all",
                budgetPercent > 100 ? "bg-red-500" : budgetPercent > 80 ? "bg-amber-500" : "bg-purple-500"
              )}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {budgetPercent.toFixed(0)}% of budget used
            {budgetPercent > 100 && <span className="text-red-500 ml-1">({(totalHours - timeBudgetHours).toFixed(1)}h over)</span>}
          </p>
        </div>
      )}

      {/* Timer Controls */}
      <div className="flex gap-2 mb-4">
        {!activeEntry ? (
          <>
            <Input
              placeholder="What are you working on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={() => startMutation.mutate()}
              className="bg-green-600 hover:bg-green-700"
              disabled={startMutation.isPending}
            >
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          </>
        ) : (
          <>
            <div className="flex-1 flex items-center gap-3 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-lg font-semibold text-green-700">
                {formatTime(elapsedSeconds)}
              </span>
              {activeEntry.description && (
                <span className="text-sm text-green-600 truncate">{activeEntry.description}</span>
              )}
            </div>
            <Button 
              onClick={() => stopMutation.mutate()}
              variant="destructive"
              disabled={stopMutation.isPending}
            >
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          </>
        )}
      </div>

      {/* Recent Entries */}
      {timeEntries.filter(e => !e.is_running).length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-slate-500 mb-2">Recent Entries</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {timeEntries.filter(e => !e.is_running).slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-600">{entry.description || 'No description'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span>{formatHours(entry.duration_minutes)}</span>
                  <span className="text-xs">{format(new Date(entry.start_time), 'MMM d')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
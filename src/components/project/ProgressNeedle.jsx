import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Gauge, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function ProgressNeedle({ projectId, value = 0, onSave, currentUser }) {
  const queryClient = useQueryClient();
  const [localValue, setLocalValue] = useState(value);
  const [note, setNote] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: updates = [] } = useQuery({
    queryKey: ['progressUpdates', projectId],
    queryFn: () => base44.entities.ProgressUpdate.filter({ project_id: projectId }, '-created_date', 10),
    enabled: !!projectId
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ProgressUpdate.create({
        project_id: projectId,
        progress_value: localValue,
        note: note,
        author_email: currentUser?.email,
        author_name: currentUser?.full_name || currentUser?.email
      });
      onSave(localValue);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progressUpdates', projectId] });
      setNote('');
      setIsDirty(false);
    }
  });

  const handleChange = (newValue) => {
    setLocalValue(newValue[0]);
    setIsDirty(true);
  };

  const getColor = () => {
    if (localValue < 25) return 'bg-red-500';
    if (localValue < 50) return 'bg-amber-500';
    if (localValue < 75) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-slate-600" />
          <span className="font-semibold text-slate-900">Progress Update</span>
        </div>
        <span className={cn(
          "text-3xl font-bold",
          localValue < 25 ? "text-red-600" :
          localValue < 50 ? "text-amber-600" :
          localValue < 75 ? "text-blue-600" : "text-emerald-600"
        )}>
          {localValue}%
        </span>
      </div>
      
      <div className="relative pt-2 pb-4">
        <Slider
          value={[localValue]}
          onValueChange={handleChange}
          max={100}
          step={5}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      <div className={cn("h-2 rounded-full transition-all mb-4", getColor())} style={{ width: `${localValue}%` }} />

      <Textarea
        value={note}
        onChange={(e) => { setNote(e.target.value); setIsDirty(true); }}
        placeholder="Add a note about this progress update..."
        className="min-h-[60px] mb-3"
      />

      {isDirty && (
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700">
          <Check className="w-4 h-4 mr-1.5" />
          Save Progress Update
        </Button>
      )}

      {/* History */}
      {updates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Recent Updates ({updates.length})
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {updates.map((update) => (
                <div key={update.id} className="text-sm bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900">{update.progress_value}%</span>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(update.created_date), { addSuffix: true })}
                    </span>
                  </div>
                  {update.note && <p className="text-slate-600">{update.note}</p>}
                  <p className="text-xs text-slate-400 mt-1">by {update.author_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
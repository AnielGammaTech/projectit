import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Gauge, Check, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProgressNeedle({ projectId, value = 0, onSave, currentUser }) {
  const queryClient = useQueryClient();
  const [localValue, setLocalValue] = useState(value);
  const [note, setNote] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);

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
      setShowNoteInput(false);
    }
  });

  const handleChange = (newValue) => {
    setLocalValue(newValue[0]);
    setIsDirty(true);
  };

  const getGradient = () => {
    if (localValue < 25) return 'from-red-500 to-red-400';
    if (localValue < 50) return 'from-amber-500 to-orange-400';
    if (localValue < 75) return 'from-blue-500 to-indigo-400';
    return 'from-emerald-500 to-teal-400';
  };

  const getTextColor = () => {
    if (localValue < 25) return 'text-red-600';
    if (localValue < 50) return 'text-amber-600';
    if (localValue < 75) return 'text-blue-600';
    return 'text-emerald-600';
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg", getGradient())}>
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Project Progress</h3>
              <p className="text-xs text-slate-500">Drag to update completion</p>
            </div>
          </div>
          <div className="text-right">
            <span className={cn("text-4xl font-bold tracking-tight", getTextColor())}>
              {localValue}
            </span>
            <span className={cn("text-xl font-medium", getTextColor())}>%</span>
          </div>
        </div>
      </div>
      
      {/* Slider Section */}
      <div className="px-6 py-5">
        <div className="relative">
          {/* Progress bar background */}
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
            <motion.div 
              className={cn("h-full rounded-full bg-gradient-to-r", getGradient())}
              initial={{ width: 0 }}
              animate={{ width: `${localValue}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          
          <Slider
            value={[localValue]}
            onValueChange={handleChange}
            max={100}
            step={5}
            className="cursor-pointer"
          />
          
          {/* Markers */}
          <div className="flex justify-between mt-2">
            {[0, 25, 50, 75, 100].map((mark) => (
              <div key={mark} className="flex flex-col items-center">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full mb-1",
                  localValue >= mark ? "bg-slate-400" : "bg-slate-200"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  localValue >= mark ? "text-slate-600" : "text-slate-400"
                )}>{mark}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 space-y-3"
            >
              {!showNoteInput ? (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => saveMutation.mutate()} 
                    disabled={saveMutation.isPending} 
                    className={cn("flex-1 bg-gradient-to-r shadow-md", getGradient())}
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Save Progress
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowNoteInput(true)}
                    className="shrink-0"
                  >
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Add Note
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note about this update..."
                    className="min-h-[80px] bg-white border-slate-200"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => saveMutation.mutate()} 
                      disabled={saveMutation.isPending} 
                      className={cn("flex-1 bg-gradient-to-r shadow-md", getGradient())}
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Save with Note
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => { setShowNoteInput(false); setNote(''); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History */}
      {updates.length > 0 && (
        <div className="border-t border-slate-100 bg-white/50">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Recent Updates ({updates.length})
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                  {updates.map((update, idx) => (
                    <motion.div 
                      key={update.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br shrink-0",
                        update.progress_value < 25 ? "from-red-500 to-red-400" :
                        update.progress_value < 50 ? "from-amber-500 to-orange-400" :
                        update.progress_value < 75 ? "from-blue-500 to-indigo-400" : "from-emerald-500 to-teal-400"
                      )}>
                        {update.progress_value}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium text-slate-900">{update.author_name}</span>
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(update.created_date), { addSuffix: true })}
                          </span>
                        </div>
                        {update.note && <p className="text-sm text-slate-600 line-clamp-2">{update.note}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
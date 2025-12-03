import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const stages = [
  { label: 'Not Started', min: 0, max: 0, color: 'bg-slate-500' },
  { label: 'Just Started', min: 1, max: 24, color: 'bg-red-500' },
  { label: 'In Progress', min: 25, max: 49, color: 'bg-amber-500' },
  { label: 'On Track', min: 50, max: 74, color: 'bg-yellow-500' },
  { label: 'Almost Done', min: 75, max: 99, color: 'bg-lime-500' },
  { label: 'Complete', min: 100, max: 100, color: 'bg-emerald-500' },
];

export default function ProgressNeedle({ projectId, value = 0, onSave, currentUser }) {
  const queryClient = useQueryClient();
  const [localValue, setLocalValue] = useState(value);
  const [note, setNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const trackRef = useRef(null);

  const { data: updates = [] } = useQuery({
    queryKey: ['progressUpdates', projectId],
    queryFn: () => base44.entities.ProgressUpdate.filter({ project_id: projectId }, '-created_date', 1),
    enabled: !!projectId
  });

  const lastUpdate = updates[0];

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
      setShowNoteInput(false);
    }
  });

  const getCurrentStage = () => {
    return stages.find(s => localValue >= s.min && localValue <= s.max) || stages[0];
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    updateValue(e);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    updateValue(e);
  };

  const handleMouseUp = () => {
    if (isDragging && localValue !== value) {
      setShowNoteInput(true);
    }
    setIsDragging(false);
  };

  const updateValue = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setLocalValue(Math.round(percentage));
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    updateValue(e);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    updateValue(e);
  };

  const handleTouchEnd = () => {
    if (isDragging && localValue !== value) {
      setShowNoteInput(true);
    }
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, localValue, value]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleCancel = () => {
    setLocalValue(value);
    setShowNoteInput(false);
    setNote('');
  };

  const currentStage = getCurrentStage();

  return (
    <div className="bg-slate-900 rounded-2xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm font-medium">Project Progress</span>
        <span className={cn(
          "px-2.5 py-1 rounded-full text-xs font-semibold",
          currentStage.color,
          "text-white"
        )}>
          {currentStage.label}
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative mb-3">
        {/* Track Background */}
        <div 
          ref={trackRef}
          className="h-3 bg-slate-700 rounded-full cursor-pointer relative overflow-hidden"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Gradient Fill */}
          <motion.div 
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 25%, #eab308 50%, #84cc16 75%, #22c55e 100%)',
              width: `${localValue}%`,
            }}
            animate={{ width: `${localValue}%` }}
            transition={{ duration: isDragging ? 0 : 0.2 }}
          />
        </div>
        
        {/* Draggable Handle */}
        <motion.div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-lg cursor-grab active:cursor-grabbing",
            "bg-white border-2 border-slate-300",
            "flex items-center justify-center",
            isDragging && "scale-110 shadow-xl border-slate-400"
          )}
          style={{ left: `calc(${localValue}% - 12px)` }}
          animate={{ 
            left: `calc(${localValue}% - 12px)`,
            scale: isDragging ? 1.15 : 1
          }}
          transition={{ duration: isDragging ? 0 : 0.2 }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="w-2 h-2 rounded-full bg-slate-400" />
        </motion.div>
      </div>

      {/* Percentage Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">{localValue}</span>
          <span className="text-slate-400 text-lg">%</span>
        </div>
        
        {lastUpdate && !showNoteInput && (
          <div className="text-right">
            <p className="text-slate-500 text-xs flex items-center gap-1">
              Updated {formatDistanceToNow(new Date(lastUpdate.created_date), { addSuffix: true })}
              {lastUpdate.note && <MessageSquare className="w-3 h-3" />}
            </p>
          </div>
        )}
      </div>

      {/* Quick Presets */}
      {!showNoteInput && (
        <div className="flex gap-1.5 mt-4">
          {[0, 25, 50, 75, 100].map(preset => (
            <button
              key={preset}
              onClick={() => {
                setLocalValue(preset);
                if (preset !== value) setShowNoteInput(true);
              }}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                localValue === preset 
                  ? "bg-slate-700 text-white" 
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              )}
            >
              {preset}%
            </button>
          ))}
        </div>
      )}

      {/* Note Input */}
      <AnimatePresence>
        {showNoteInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this update (optional)..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 min-h-[60px] text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <Button 
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending}
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Save Progress
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCancel}
                className="text-slate-400 hover:text-white hover:bg-slate-700 px-3"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
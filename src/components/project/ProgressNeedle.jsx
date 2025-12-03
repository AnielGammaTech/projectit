import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProgressNeedle({ projectId, value = 0, onSave, currentUser }) {
  const queryClient = useQueryClient();
  const [localValue, setLocalValue] = useState(value);
  const [note, setNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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

  const getGradient = () => {
    return 'linear-gradient(90deg, #ef4444 0%, #f59e0b 30%, #eab308 50%, #84cc16 70%, #22c55e 100%)';
  };

  const getThumbColor = () => {
    if (localValue < 25) return '#ef4444';
    if (localValue < 50) return '#f59e0b';
    if (localValue < 75) return '#eab308';
    if (localValue < 100) return '#84cc16';
    return '#22c55e';
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

  const isActive = isHovered || isDragging || showNoteInput;

  return (
    <motion.div 
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isDragging && !showNoteInput && setIsHovered(false)}
      animate={{ 
        boxShadow: isActive ? '0 8px 30px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
        borderColor: isActive ? 'rgba(148, 163, 184, 0.4)' : 'rgba(226, 232, 240, 0.6)'
      }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn("p-4 transition-all duration-300", isActive && "pb-5")}>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Progress</span>
            {lastUpdate && !isActive && (
              <span className="text-[10px] text-slate-300">
                • {formatDistanceToNow(new Date(lastUpdate.created_date), { addSuffix: true })}
              </span>
            )}
          </div>
          <motion.div 
            className="flex items-baseline gap-0.5"
            animate={{ scale: isDragging ? 1.1 : 1 }}
          >
            <span className="text-2xl font-bold text-slate-900">{localValue}</span>
            <span className="text-sm font-medium text-slate-400">%</span>
          </motion.div>
        </div>

        {/* Slider Track */}
        <div 
          ref={trackRef}
          className="relative cursor-pointer group"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Track Background */}
          <motion.div 
            className="h-2 bg-slate-100 rounded-full overflow-hidden"
            animate={{ height: isActive ? 10 : 8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Gradient Track */}
            <div 
              className="h-full rounded-full opacity-20"
              style={{ background: getGradient() }}
            />
          </motion.div>

          {/* Progress Fill */}
          <motion.div 
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ 
              background: getGradient(),
              width: `${localValue}%`
            }}
            animate={{ 
              height: isActive ? 10 : 8,
              width: `${localValue}%`
            }}
            transition={{ duration: isDragging ? 0 : 0.15, ease: 'easeOut' }}
          />

          {/* Thumb */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
            style={{ left: `${localValue}%` }}
            animate={{ 
              left: `${localValue}%`,
              scale: isDragging ? 1.3 : isActive ? 1.1 : 0.9,
              opacity: isActive ? 1 : 0.7
            }}
            transition={{ duration: isDragging ? 0 : 0.15 }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div 
              className="w-5 h-5 -ml-2.5 rounded-full shadow-lg border-[3px] border-white"
              style={{ 
                background: getThumbColor(),
                boxShadow: isDragging 
                  ? `0 0 0 4px ${getThumbColor()}30, 0 4px 12px rgba(0,0,0,0.2)` 
                  : '0 2px 8px rgba(0,0,0,0.15)'
              }}
            />
            {/* Value tooltip on drag */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.9 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-xs font-medium rounded-md whitespace-nowrap"
                >
                  {localValue}%
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Quick Presets */}
        <AnimatePresence>
          {isActive && !showNoteInput && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between mt-4"
            >
              <div className="flex gap-1.5">
                {[0, 25, 50, 75, 100].map(preset => (
                  <motion.button
                    key={preset}
                    onClick={() => {
                      setLocalValue(preset);
                      if (preset !== value) setShowNoteInput(true);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "w-10 h-7 rounded-lg text-xs font-semibold transition-all",
                      localValue === preset 
                        ? "bg-slate-900 text-white shadow-md" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    )}
                  >
                    {preset}
                  </motion.button>
                ))}
              </div>
              {lastUpdate && (
                <span className="text-xs text-slate-400">
                  Updated {formatDistanceToNow(new Date(lastUpdate.created_date), { addSuffix: true })}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Note Input */}
        <AnimatePresence>
          {showNoteInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-slate-100">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note about this update..."
                  className="min-h-[60px] text-sm resize-none bg-slate-50 border-slate-200 focus:bg-white"
                  autoFocus
                />
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={() => saveMutation.mutate()} 
                    disabled={saveMutation.isPending}
                    size="sm"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 h-9 rounded-lg font-medium"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Save Progress
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancel}
                    className="h-9 px-3 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
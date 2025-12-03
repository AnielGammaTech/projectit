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
      <div className={cn("px-3 py-2.5 transition-all duration-300", isActive && "pb-3")}>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Progress</span>
          <motion.div 
            className="flex items-baseline gap-0.5"
            animate={{ scale: isDragging ? 1.05 : 1 }}
          >
            <span className="text-lg font-bold text-slate-900">{localValue}</span>
            <span className="text-xs font-medium text-slate-400">%</span>
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

        {/* Last update info */}
        <AnimatePresence>
          {isActive && !showNoteInput && lastUpdate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-right"
            >
              <span className="text-[10px] text-slate-400">
                Updated {formatDistanceToNow(new Date(lastUpdate.created_date), { addSuffix: true })}
              </span>
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
              <div className="mt-3 pt-3 border-t border-slate-100">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note (optional)..."
                  className="min-h-[50px] text-xs resize-none bg-slate-50 border-slate-200 focus:bg-white rounded-lg"
                  autoFocus
                />
                <div className="flex gap-2 mt-3">
                  <motion.button 
                    onClick={() => saveMutation.mutate()} 
                    disabled={saveMutation.isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-medium shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 transition-shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save
                  </motion.button>
                  <motion.button 
                    onClick={handleCancel}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
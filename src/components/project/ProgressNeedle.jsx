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

  const getColor = () => {
    if (localValue < 30) return { bg: 'bg-slate-400', hex: '#94a3b8' };
    if (localValue < 60) return { bg: 'bg-blue-500', hex: '#3b82f6' };
    if (localValue < 90) return { bg: 'bg-indigo-500', hex: '#6366f1' };
    return { bg: 'bg-emerald-500', hex: '#10b981' };
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

  const color = getColor();

  return (
    <div className="flex justify-center">
      <motion.div 
        className="bg-white rounded-xl border border-slate-200 shadow-sm inline-flex items-center gap-3 max-w-md w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => !isDragging && !showNoteInput && setIsHovered(false)}
        animate={{ 
          boxShadow: isActive ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.04)'
        }}
        transition={{ duration: 0.2 }}
      >
        <div className={cn("px-4 py-3 w-full transition-all duration-200")}>
          {/* Compact inline layout */}
          <div className="flex items-center gap-3">
            {/* Percentage */}
            <motion.div 
              className={cn(
                "flex items-center justify-center w-12 h-8 rounded-lg text-sm font-bold text-white",
                color.bg
              )}
              animate={{ scale: isDragging ? 1.05 : 1 }}
            >
              {localValue}
            </motion.div>

            {/* Slider Track */}
            <div 
              ref={trackRef}
              className="flex-1 relative cursor-pointer h-8 flex items-center"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Track Background */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                {/* Progress Fill */}
                <motion.div 
                  className={cn("h-full rounded-full", color.bg)}
                  animate={{ width: `${localValue}%` }}
                  transition={{ duration: isDragging ? 0 : 0.15, ease: 'easeOut' }}
                />
              </div>

              {/* Thumb */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
                style={{ left: `${localValue}%` }}
                animate={{ 
                  left: `${localValue}%`,
                  scale: isDragging ? 1.2 : isActive ? 1 : 0.85
                }}
                transition={{ duration: isDragging ? 0 : 0.15 }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                <div 
                  className={cn(
                    "w-4 h-4 -ml-2 rounded-md shadow-sm border-2 border-white transition-colors",
                    color.bg
                  )}
                  style={{ 
                    boxShadow: isDragging 
                      ? `0 0 0 3px ${color.hex}25, 0 2px 8px rgba(0,0,0,0.15)` 
                      : '0 1px 4px rgba(0,0,0,0.1)'
                  }}
                />
              </motion.div>
            </div>
          </div>

          {/* Note Input */}
          <AnimatePresence>
            {showNoteInput && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note..."
                  className="w-24 h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300"
                  autoFocus
                />
                <motion.button 
                  onClick={() => saveMutation.mutate()} 
                  disabled={saveMutation.isPending}
                  whileTap={{ scale: 0.95 }}
                  className="h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                </motion.button>
                <motion.button 
                  onClick={handleCancel}
                  whileTap={{ scale: 0.95 }}
                  className="h-8 w-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
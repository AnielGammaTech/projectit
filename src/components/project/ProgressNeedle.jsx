import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProgressNeedle({ projectId, value = 0, onSave, currentUser }) {
  const queryClient = useQueryClient();
  const [localValue, setLocalValue] = useState(value);
  const [note, setNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
      setIsExpanded(false);
    }
  });

  const getColor = () => {
    if (localValue < 25) return 'bg-red-500';
    if (localValue < 50) return 'bg-amber-500';
    if (localValue < 75) return 'bg-yellow-500';
    if (localValue < 100) return 'bg-lime-500';
    return 'bg-emerald-500';
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setIsExpanded(true);
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
    setIsExpanded(true);
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
    setIsExpanded(false);
  };

  return (
    <motion.div 
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-200",
        isExpanded ? "p-4" : "p-3 hover:shadow-md cursor-pointer"
      )}
      onMouseEnter={() => !showNoteInput && setIsExpanded(true)}
      onMouseLeave={() => !showNoteInput && !isDragging && setIsExpanded(false)}
      layout
    >
      {/* Compact View */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Progress</span>
          <span className={cn("text-sm font-bold", localValue === 100 ? "text-emerald-600" : "text-slate-900")}>
            {localValue}%
          </span>
        </div>
        
        {/* Track */}
        <div className="flex-1 relative">
          <div 
            ref={trackRef}
            className={cn(
              "h-2 bg-slate-100 rounded-full cursor-pointer relative overflow-hidden transition-all",
              isExpanded && "h-3"
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <motion.div 
              className={cn("absolute inset-y-0 left-0 rounded-full", getColor())}
              animate={{ width: `${localValue}%` }}
              transition={{ duration: isDragging ? 0 : 0.2 }}
            />
          </div>
          
          {/* Handle - only show when expanded */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md cursor-grab active:cursor-grabbing",
                  getColor().replace('bg-', 'border-')
                )}
                style={{ left: `calc(${localValue}% - 8px)` }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Last update info - compact */}
        {lastUpdate && !isExpanded && (
          <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:block">
            {formatDistanceToNow(new Date(lastUpdate.created_date), { addSuffix: true })}
          </span>
        )}
        
        {!isExpanded && (
          <ChevronDown className="w-4 h-4 text-slate-300" />
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && !showNoteInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div className="flex gap-1">
                {[0, 25, 50, 75, 100].map(preset => (
                  <button
                    key={preset}
                    onClick={() => {
                      setLocalValue(preset);
                      if (preset !== value) setShowNoteInput(true);
                    }}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-medium transition-all",
                      localValue === preset 
                        ? "bg-slate-900 text-white" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
              {lastUpdate && (
                <span className="text-xs text-slate-400">
                  Updated {formatDistanceToNow(new Date(lastUpdate.created_date), { addSuffix: true })}
                </span>
              )}
            </div>
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
                className="min-h-[50px] text-sm resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button 
                  onClick={() => saveMutation.mutate()} 
                  disabled={saveMutation.isPending}
                  size="sm"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 h-8"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Save
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 px-2"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Check, X } from 'lucide-react';
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

  const getStatusLabel = () => {
    if (localValue < 25) return 'Just Started';
    if (localValue < 50) return 'In Progress';
    if (localValue < 75) return 'On Track';
    if (localValue < 100) return 'Almost Done';
    return 'Complete';
  };

  const handleMouseDown = (e) => {
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
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setLocalValue(Math.round(percentage / 5) * 5);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleCancel = () => {
    setLocalValue(value);
    setShowNoteInput(false);
    setNote('');
  };

  return (
    <div 
      className="bg-[#1e293b] rounded-2xl p-4 shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Arc Track */}
      <div className="relative h-16 mb-2">
        {/* SVG Arc Background */}
        <svg viewBox="0 0 200 60" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 50 Q 100 0 180 50"
            fill="none"
            stroke="#334155"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 20 50 Q 100 0 180 50"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="200"
            strokeDashoffset={200 - (localValue / 100) * 200}
            style={{ transition: isDragging ? 'none' : 'stroke-dashoffset 0.3s ease' }}
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="33%" stopColor="#f59e0b" />
              <stop offset="66%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          {/* Needle indicator */}
          <g transform={`translate(${20 + (localValue / 100) * 160}, ${50 - Math.sin((localValue / 100) * Math.PI) * 40})`}>
            <rect x="-8" y="-20" width="16" height="24" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <rect x="-5" y="-16" width="10" height="16" rx="2" fill="#64748b" />
          </g>
        </svg>
        
        {/* Invisible clickable track */}
        <div 
          ref={trackRef}
          className="absolute inset-x-4 top-0 bottom-0 cursor-pointer"
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* Status Label */}
      <div className="text-center">
        <p className="text-white font-medium">{getStatusLabel()}</p>
        {lastUpdate && !showNoteInput && (
          <p className="text-slate-400 text-xs mt-0.5 flex items-center justify-center gap-1">
            Updated {formatDistanceToNow(new Date(lastUpdate.created_date), { addSuffix: true })}
            {lastUpdate.note && <MessageSquare className="w-3 h-3" />}
          </p>
        )}
        {isHovered && !showNoteInput && !isDragging && (
          <p className="text-slate-500 text-xs mt-1">Drag needle to update</p>
        )}
      </div>

      {/* Note Input */}
      <AnimatePresence>
        {showNoteInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this update..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 min-h-[60px] text-sm"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button 
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending}
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Save ({localValue}%)
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCancel}
                className="text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
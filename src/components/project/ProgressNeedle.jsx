import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, PartyPopper, MessageCircle, CircleDot, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Project health status options
const healthOptions = [
  { value: 'good', label: 'On Track', icon: CheckCircle2, color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { value: 'concern', label: 'Some Concerns', icon: CircleDot, color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50' },
  { value: 'issue', label: 'Has Issues', icon: AlertTriangle, color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' },
];

export default function ProgressNeedle({ projectId, value = 0, onSave, currentUser, onStatusChange, halopsaTicketId, hasUpdates = false, lastUpdateNote = '' }) {
  const queryClient = useQueryClient();
  const [localValue, setLocalValue] = useState(value);
  const [note, setNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [projectHealth, setProjectHealth] = useState('good');
  const trackRef = useRef(null);

  const { data: updates = [] } = useQuery({
    queryKey: ['progressUpdates', projectId],
    queryFn: () => base44.entities.ProgressUpdate.filter({ project_id: projectId }, '-created_date', 1),
    enabled: !!projectId
  });

  const lastUpdate = updates[0];

  // Push note to HaloPSA ticket
  const pushToHalo = async (noteText, progressValue) => {
    if (!halopsaTicketId) return;
    try {
      const haloNote = `[Progress Update: ${progressValue}%] ${noteText || 'Progress updated'}`;
      await base44.functions.invoke('haloPSATicket', {
        action: 'addNote',
        ticketId: halopsaTicketId,
        note: haloNote,
        noteIsPrivate: true
      });
    } catch (err) {
      console.error('Failed to push note to HaloPSA:', err);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (skipCompletionCheck = false) => {
      // Check if hitting 100% for the first time
      if (localValue === 100 && value !== 100 && !skipCompletionCheck) {
        setPendingSave(true);
        setShowCompletionDialog(true);
        return;
      }
      
      await base44.entities.ProgressUpdate.create({
        project_id: projectId,
        progress_value: localValue,
        note: note,
        author_email: currentUser?.email,
        author_name: currentUser?.full_name || currentUser?.email
      });
      
      // Push to HaloPSA as private note
      await pushToHalo(note, localValue);
      
      onSave(localValue);
    },
    onSuccess: () => {
      if (!pendingSave) {
        queryClient.invalidateQueries({ queryKey: ['progressUpdates', projectId] });
        setNote('');
        setShowUpdateModal(false);
        setProjectHealth('good');
      }
    }
  });

  const handleCompletionConfirm = async () => {
    const completionNote = note || 'Project completed and ready for billing';
    await base44.entities.ProgressUpdate.create({
      project_id: projectId,
      progress_value: 100,
      note: completionNote,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name || currentUser?.email
    });
    
    // Push to HaloPSA
    await pushToHalo(completionNote, 100);
    
    onSave(100);
    onStatusChange?.('completed');
    queryClient.invalidateQueries({ queryKey: ['progressUpdates', projectId] });
    setNote('');
    setShowUpdateModal(false);
    setShowCompletionDialog(false);
    setPendingSave(false);
    setProjectHealth('good');
  };

  const handleCompletionCancel = async () => {
    // Save progress without changing status
    await base44.entities.ProgressUpdate.create({
      project_id: projectId,
      progress_value: 100,
      note: note,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name || currentUser?.email
    });
    
    // Push to HaloPSA
    await pushToHalo(note, 100);
    
    onSave(100);
    queryClient.invalidateQueries({ queryKey: ['progressUpdates', projectId] });
    setNote('');
    setShowUpdateModal(false);
    setShowCompletionDialog(false);
    setPendingSave(false);
    setProjectHealth('good');
  };



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
      setShowUpdateModal(true);
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
      setShowUpdateModal(true);
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
    setShowUpdateModal(false);
    setNote('');
    setProjectHealth('good');
  };

  const handleSaveUpdate = () => {
    saveMutation.mutate();
  };

  const isActive = isHovered || isDragging;

  const color = getColor();

  // Get current health option for display
  const currentHealth = healthOptions.find(h => h.value === projectHealth) || healthOptions[0];
  const HealthIcon = currentHealth.icon;

  return (
    <>
      <div className="w-full">
        <motion.div 
          className="bg-slate-50 rounded-xl border border-slate-200 w-full cursor-pointer hover:border-slate-300 transition-colors"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => !isDragging && setIsHovered(false)}
          onClick={() => !isDragging && setShowUpdateModal(true)}
          animate={{ 
            boxShadow: isActive ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.04)'
          }}
          transition={{ duration: 0.2 }}
        >
          <div className={cn("px-4 py-3 w-full transition-all duration-200")}>
            {/* Top row with label and percentage */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Update Bar</span>
                {hasUpdates && lastUpdateNote && (
                  <div className="relative">
                    <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full" />
                  </div>
                )}
              </div>
              <motion.div 
                className={cn(
                  "flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold text-white",
                  color.bg
                )}
                animate={{ scale: isDragging ? 1.05 : 1 }}
              >
                {localValue}%
              </motion.div>
            </div>

            {/* Slider Track */}
            <div 
              ref={trackRef}
              className="relative h-6 flex items-center"
              onClick={(e) => e.stopPropagation()}
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
        </motion.div>
      </div>

      {/* Update Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", color.bg)}>
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              Progress Update
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress Display */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">New Progress</span>
              <div className={cn("px-3 py-1 rounded-lg text-white font-bold", color.bg)}>
                {localValue}%
              </div>
            </div>

            {/* Project Health Status */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Project Status</label>
              <div className="grid grid-cols-3 gap-2">
                {healthOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = projectHealth === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setProjectHealth(option.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                        isSelected 
                          ? cn(option.bgColor, "border-current", option.textColor)
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isSelected ? option.textColor : "text-slate-400")} />
                      <span className={cn("text-xs font-medium", isSelected ? option.textColor : "text-slate-500")}>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Add a Note (optional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's the latest on this project?"
                className="min-h-[80px] text-sm resize-none"
              />
            </div>

            {/* Last Update Note */}
            {lastUpdateNote && (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-[10px] font-medium text-indigo-500 uppercase mb-1">Last Update</p>
                <p className="text-sm text-indigo-700">{lastUpdateNote}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleCancel}
                className="flex-1 h-10 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUpdate}
                disabled={saveMutation.isPending}
                className={cn(
                  "flex-1 h-10 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2",
                  "bg-[#0F2F44] hover:bg-[#1a4a6e]"
                )}
              >
                <Check className="w-4 h-4" />
                Save Update
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion Dialog */}
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <PartyPopper className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Project at 100%!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Is this project completed and ready to be billed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleCompletionCancel} className="flex-1">
              Not yet
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCompletionConfirm}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              Yes, mark complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
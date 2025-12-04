import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, PartyPopper, MessageCircle, CircleDot, AlertTriangle, CheckCircle2, History, AtSign } from 'lucide-react';
import { format } from 'date-fns';
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
  const [showHistory, setShowHistory] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
  const trackRef = useRef(null);

  const { data: updates = [] } = useQuery({
    queryKey: ['progressUpdates', projectId],
    queryFn: () => base44.entities.ProgressUpdate.filter({ project_id: projectId }, '-created_date', 50),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    enabled: showUpdateModal
  });

  const lastUpdate = updates[0];

  // Set initial health from last update
  useEffect(() => {
    if (lastUpdate?.health_status) {
      setProjectHealth(lastUpdate.health_status);
    }
  }, [lastUpdate?.health_status]);

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
        health_status: projectHealth,
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
      health_status: 'good',
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
      health_status: projectHealth,
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
    // Color based on project health status
    if (projectHealth === 'issue') return { bg: 'bg-red-500', hex: '#ef4444' };
    if (projectHealth === 'concern') return { bg: 'bg-amber-500', hex: '#f59e0b' };
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

  const handleSaveUpdate = async () => {
    // Extract mentions from note and create notifications
    const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
    const mentions = note.match(mentionRegex) || [];
    
    for (const mention of mentions) {
      const name = mention.slice(1).trim();
      const member = teamMembers.find(m => 
        m.name?.toLowerCase().includes(name.toLowerCase()) ||
        m.email?.toLowerCase().includes(name.toLowerCase())
      );
      if (member?.email && member.email !== currentUser?.email) {
        await base44.entities.UserNotification.create({
          user_email: member.email,
          type: 'mention',
          title: 'You were mentioned in a progress update',
          message: note,
          project_id: projectId,
          from_user_email: currentUser?.email,
          from_user_name: currentUser?.full_name || currentUser?.email,
          link: `/ProjectDetail?id=${projectId}`,
          is_read: false
        });
      }
    }
    
    saveMutation.mutate();
  };

  const handleNoteChange = (e) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setNote(value);
    setCursorPosition(position);
    
    // Check for @ trigger
    const textBeforeCursor = value.slice(0, position);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      if (!textAfterAt.includes(' ') || textAfterAt.split(' ').length <= 2) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (member) => {
    const textBeforeCursor = note.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = note.slice(cursorPosition);
    const newNote = textBeforeCursor.slice(0, atIndex) + `@${member.name} ` + textAfterCursor;
    setNote(newNote);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredMembers = teamMembers.filter(m => 
    m.name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  const isActive = isHovered || isDragging;

  const color = getColor();

  // Get current health option for display
  const currentHealth = healthOptions.find(h => h.value === projectHealth) || healthOptions[0];
  const HealthIcon = currentHealth.icon;

  return (
    <>
      <div className="w-full">
        <div 
          className="bg-white rounded-xl border border-slate-200 w-full cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all group"
          onClick={() => setShowUpdateModal(true)}
        >
          <div className="px-4 py-3 w-full">
            {/* Top row with label, note indicator, and percentage */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Progress</span>
                {hasUpdates && lastUpdateNote && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 rounded-full">
                    <MessageCircle className="w-3 h-3 text-indigo-500" />
                    <span className="text-[10px] text-indigo-600 font-medium max-w-[120px] truncate">{lastUpdateNote}</span>
                  </div>
                )}
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-lg text-sm font-bold text-white",
                color.bg
              )}>
                {localValue}%
              </div>
            </div>

            {/* Progress Bar - Clean Style */}
            <div className="relative h-3 flex items-center">
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-300", color.bg)}
                  style={{ width: `${localValue}%` }}
                />
              </div>
            </div>
            
            {/* Click hint */}
            <p className="text-[10px] text-slate-400 mt-2 group-hover:text-indigo-500 transition-colors">Click to update progress</p>
          </div>
        </div>
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
            {/* Progress Slider in Modal */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">Progress</span>
                <div className={cn("px-3 py-1 rounded-lg text-white font-bold text-sm", color.bg)}>
                  {localValue}%
                </div>
              </div>
              <div 
                ref={trackRef}
                className="relative h-8 flex items-center cursor-pointer"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                {/* Track Background */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
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
                  animate={{ left: `${localValue}%`, scale: isDragging ? 1.15 : 1 }}
                  transition={{ duration: isDragging ? 0 : 0.15 }}
                >
                  <div 
                    className={cn("w-5 h-5 -ml-2.5 rounded-full shadow-md border-2 border-white", color.bg)}
                    style={{ boxShadow: isDragging ? `0 0 0 4px ${color.hex}25, 0 2px 8px rgba(0,0,0,0.2)` : '0 2px 6px rgba(0,0,0,0.15)' }}
                  />
                </motion.div>
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

            {/* Note Input with @ mentions */}
            <div className="relative">
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                Add a Note (optional)
                <span className="text-xs text-slate-400 font-normal">Type @ to mention someone</span>
              </label>
              <Textarea
                ref={textareaRef}
                value={note}
                onChange={handleNoteChange}
                placeholder="What's the latest on this project? Use @ to mention team members..."
                className="min-h-[80px] text-sm resize-none"
              />
              {showMentions && filteredMembers.length > 0 && (
                <div className="absolute z-50 bottom-full mb-1 left-0 w-full bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden">
                  {filteredMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => insertMention(member)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600">
                        {member.name?.[0] || member.email?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Progress History */}
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
              >
                <History className="w-4 h-4" />
                Update History ({updates.length})
              </button>
              
              {showHistory && updates.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50">
                  <div className="p-3 space-y-3">
                    {updates.map((update) => (
                      <div key={update.id} className={cn(
                        "rounded-lg p-3 border overflow-hidden",
                        update.health_status === 'issue' ? "bg-red-50 border-red-200" :
                        update.health_status === 'concern' ? "bg-amber-50 border-amber-200" :
                        "bg-white border-slate-100"
                      )}>
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                              update.health_status === 'issue' ? "bg-red-100 text-red-600" :
                              update.health_status === 'concern' ? "bg-amber-100 text-amber-600" :
                              "bg-emerald-100 text-emerald-600"
                            )}>
                              {update.author_name?.[0] || '?'}
                            </div>
                            <span className="text-xs font-medium text-slate-700 truncate">{update.author_name || 'Unknown'}</span>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0",
                              update.health_status === 'issue' ? "bg-red-100 text-red-700" :
                              update.health_status === 'concern' ? "bg-amber-100 text-amber-700" :
                              "bg-emerald-100 text-emerald-700"
                            )}>
                              {update.health_status === 'issue' ? 'Has Issues' :
                               update.health_status === 'concern' ? 'Some Concerns' : 'On Track'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={cn(
                              "text-xs font-bold",
                              update.health_status === 'issue' ? "text-red-600" :
                              update.health_status === 'concern' ? "text-amber-600" :
                              "text-emerald-600"
                            )}>{update.progress_value}%</span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {format(new Date(update.created_date), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                        {update.note && (
                          <p className={cn(
                            "text-sm mt-2 break-all whitespace-pre-wrap",
                            update.health_status === 'issue' ? "text-red-700" :
                            update.health_status === 'concern' ? "text-amber-700" :
                            "text-slate-600"
                          )} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{update.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {showHistory && updates.length === 0 && (
                <p className="mt-2 text-sm text-slate-400">No updates yet</p>
              )}
            </div>

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
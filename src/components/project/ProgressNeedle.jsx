import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, PartyPopper, MessageCircle, CircleDot, AlertTriangle, CheckCircle2, History, Send, TrendingUp, Minus, Plus } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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
  { value: 'good', label: 'On Track', icon: CheckCircle2, color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300', ring: 'ring-emerald-200' },
  { value: 'concern', label: 'At Risk', icon: CircleDot, color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', ring: 'ring-amber-200' },
  { value: 'issue', label: 'Blocked', icon: AlertTriangle, color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300', ring: 'ring-red-200' },
];

export default function ProgressNeedle({ projectId, value = 0, onSave, currentUser, onStatusChange, halopsaTicketId, hasUpdates = false, lastUpdateNote = '' }) {
  const queryClient = useQueryClient();
  const [localValue, setLocalValue] = useState(value);
  const [note, setNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [projectHealth, setProjectHealth] = useState('good');
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

      await pushToHalo(note, localValue);
      onSave(localValue);
    },
    onSuccess: () => {
      if (!pendingSave) {
        queryClient.invalidateQueries({ queryKey: ['progressUpdates', projectId] });
        setNote('');
        setShowUpdateModal(false);
        setProjectHealth('good');
        toast.success('Progress updated');
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
    await base44.entities.ProgressUpdate.create({
      project_id: projectId,
      progress_value: 100,
      note: note,
      health_status: projectHealth,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name || currentUser?.email
    });
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
    if (projectHealth === 'issue') return { bg: 'bg-red-500', hex: '#ef4444' };
    if (projectHealth === 'concern') return { bg: 'bg-amber-500', hex: '#f59e0b' };
    return { bg: 'bg-emerald-500', hex: '#10b981' };
  };

  // Slider drag handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    updateValue(e);
  };
  const handleMouseMove = (e) => { if (isDragging) updateValue(e); };
  const handleMouseUp = () => { setIsDragging(false); };
  const updateValue = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setLocalValue(Math.round(percentage));
  };
  const handleTouchStart = (e) => { setIsDragging(true); updateValue(e); };
  const handleTouchMove = (e) => { if (isDragging) updateValue(e); };
  const handleTouchEnd = () => { setIsDragging(false); };

  useEffect(() => {
    if (isDragging) {
      const onMove = (e) => handleMouseMove(e);
      const onUp = () => handleMouseUp();
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging]);

  useEffect(() => { setLocalValue(value); }, [value]);

  const handleCancel = () => {
    setLocalValue(value);
    setShowUpdateModal(false);
    setNote('');
    setProjectHealth(lastUpdate?.health_status || 'good');
  };

  const handleSaveUpdate = async () => {
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
        try {
          await base44.functions.invoke('sendNotificationEmail', {
            to: member.email,
            type: 'mention',
            title: 'You were mentioned in a progress update',
            message: note,
            projectId: projectId,
            fromUserName: currentUser?.full_name || currentUser?.email,
            link: `${window.location.origin}/ProjectDetail?id=${projectId}`
          });
        } catch (emailErr) {
          console.error('Failed to send notification email:', emailErr);
        }
      }
    }
    saveMutation.mutate();
  };

  // Mention handling
  const handleNoteChange = (e) => {
    const val = e.target.value;
    const position = e.target.selectionStart;
    setNote(val);
    setCursorPosition(position);
    const textBeforeCursor = val.slice(0, position);
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

  const color = getColor();
  const currentHealth = healthOptions.find(h => h.value === projectHealth) || healthOptions[0];
  const HealthIcon = currentHealth.icon;

  // Quick increment/decrement
  const adjustProgress = (delta) => {
    setLocalValue(prev => Math.max(0, Math.min(100, prev + delta)));
  };

  return (
    <>
      {/* Compact inline progress bar — click to open modal */}
      <div className="w-full">
        <button
          className="w-full text-left group cursor-pointer"
          onClick={() => setShowUpdateModal(true)}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <HealthIcon className={cn("w-3.5 h-3.5", currentHealth.textColor)} />
              <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Progress</span>
              {hasUpdates && lastUpdateNote && (
                <span className="text-[10px] text-slate-400 max-w-[140px] truncate hidden sm:inline">
                  · {lastUpdateNote}
                </span>
              )}
            </div>
            <span className={cn("text-xs font-bold tabular-nums", currentHealth.textColor)}>
              {localValue}%
            </span>
          </div>
          <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden group-hover:h-2.5 transition-all">
            <motion.div
              className={cn("h-full rounded-full", color.bg)}
              initial={{ width: 0 }}
              animate={{ width: `${localValue}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div
                className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"
                style={{ left: `${localValue * 0.5}%` }}
              />
            </div>
          </div>
        </button>
      </div>

      {/* ─── UPDATE MODAL ─── */}
      <Dialog open={showUpdateModal} onOpenChange={(open) => { if (!open) handleCancel(); else setShowUpdateModal(true); }}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          {/* Header with large progress display */}
          <div className={cn("px-6 pt-6 pb-4", currentHealth.bgColor)}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className={cn("w-5 h-5", currentHealth.textColor)} />
                <h2 className="text-base font-semibold text-slate-900">Progress Update</h2>
              </div>
              {lastUpdate && (
                <span className="text-[11px] text-slate-400">
                  Last: {formatDistanceToNow(new Date(lastUpdate.created_date), { addSuffix: true })}
                </span>
              )}
            </div>

            {/* Big progress number + stepper */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => adjustProgress(-5)}
                className="w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all shadow-sm"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center">
                <div className={cn("text-5xl font-bold tabular-nums tracking-tight", currentHealth.textColor)}>
                  {localValue}
                  <span className="text-2xl">%</span>
                </div>
              </div>
              <button
                onClick={() => adjustProgress(5)}
                className="w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Slider track */}
            <div
              ref={trackRef}
              className="relative h-10 flex items-center cursor-pointer px-1"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden backdrop-blur-sm border border-white/40">
                <motion.div
                  className={cn("h-full rounded-full", color.bg)}
                  animate={{ width: `${localValue}%` }}
                  transition={{ duration: isDragging ? 0 : 0.15, ease: 'easeOut' }}
                />
              </div>
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
                style={{ left: `calc(${localValue}% + 4px)` }}
                animate={{ left: `calc(${localValue}% + 4px)`, scale: isDragging ? 1.2 : 1 }}
                transition={{ duration: isDragging ? 0 : 0.15 }}
              >
                <div
                  className={cn("w-5 h-5 -ml-2.5 rounded-full shadow-lg border-[3px] border-white", color.bg)}
                  style={{ boxShadow: isDragging ? `0 0 0 4px ${color.hex}30, 0 2px 8px rgba(0,0,0,0.2)` : '0 2px 8px rgba(0,0,0,0.15)' }}
                />
              </motion.div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Health status — horizontal pills */}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5 block">How's the project going?</label>
              <div className="flex gap-2">
                {healthOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = projectHealth === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setProjectHealth(option.value)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all text-sm font-medium",
                        isSelected
                          ? cn(option.bgColor, option.borderColor, option.textColor, "ring-2", option.ring)
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note — prominent, feels like a chat/post input */}
            <div className="relative">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
                What's new?
                <span className="text-slate-400 font-normal normal-case tracking-normal ml-1.5">@ to mention</span>
              </label>
              <Textarea
                ref={textareaRef}
                value={note}
                onChange={handleNoteChange}
                placeholder="Share a quick update with your team..."
                className="min-h-[80px] text-sm resize-none rounded-xl border-slate-200 focus:border-[#0069AF] focus:ring-[#0069AF]/20"
              />
              {/* Mention dropdown */}
              <AnimatePresence>
                {showMentions && filteredMembers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute z-50 bottom-full mb-1 left-0 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden"
                  >
                    {filteredMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => insertMention(member)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-xs font-semibold text-[#0069AF]">
                          {member.name?.[0] || member.email?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-400">{member.email}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 h-11 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveUpdate}
                disabled={saveMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-[#0069AF] hover:bg-[#0F2F44] text-white gap-2"
              >
                <Send className="w-4 h-4" />
                Post Update
              </Button>
            </div>

            {/* Timeline / History — always visible, scrollable */}
            {updates.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Timeline</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">{updates.length}</span>
                </div>
                <div className="max-h-56 overflow-y-auto -mx-1 px-1 space-y-0">
                  {updates.map((update, idx) => {
                    const health = healthOptions.find(h => h.value === update.health_status) || healthOptions[0];
                    const UpdateIcon = health.icon;
                    return (
                      <div key={update.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {/* Timeline line */}
                        {idx < updates.length - 1 && (
                          <div className="absolute left-[13px] top-8 bottom-0 w-px bg-slate-200" />
                        )}
                        {/* Avatar dot */}
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border-2 border-white shadow-sm",
                          health.bgColor, health.textColor
                        )}>
                          {update.author_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-800">{update.author_name || 'Unknown'}</span>
                            <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full", health.bgColor, health.textColor)}>
                              <UpdateIcon className="w-2.5 h-2.5" />
                              {health.label}
                            </span>
                            <span className={cn("text-xs font-bold tabular-nums", health.textColor)}>{update.progress_value}%</span>
                            <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">
                              {format(new Date(update.created_date), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          {update.note && (
                            <p className="text-sm text-slate-600 mt-1 break-words whitespace-pre-wrap leading-relaxed">{update.note}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

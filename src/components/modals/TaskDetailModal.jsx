import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Calendar as CalendarIcon, Edit2, Trash2, Paperclip, X,
  FileText, Image, Loader2, Check, MoreHorizontal, Bell,
  User, Clock, Flag, MessageSquare, ChevronDown, ChevronUp,
  ListChecks, Plus, GripVertical, Notebook, StickyNote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';
import { sendTaskAssignmentNotification } from '@/utils/notifications';

const priorityConfig = {
  low: { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-100', dot: 'bg-slate-400' },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  high: { label: 'High', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' }
};

const statusPillConfig = {
  todo: { label: 'To Do', classes: 'bg-slate-100 text-slate-600 hover:bg-slate-200', dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', classes: 'bg-blue-100 text-blue-700 hover:bg-blue-200', dot: 'bg-blue-500' },
  review: { label: 'Review', classes: 'bg-amber-100 text-amber-700 hover:bg-amber-200', dot: 'bg-amber-500' },
  completed: { label: 'Done', classes: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200', dot: 'bg-emerald-500' },
  archived: { label: 'Archived', classes: 'bg-slate-100 text-slate-400', dot: 'bg-slate-300' }
};

const getFileIcon = (type) => type?.startsWith('image') ? Image : FileText;

export default function TaskDetailModal({ open, onClose, task, teamMembers = [], onEdit, currentUser, project }) {
  const [comment, setComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [notes, setNotes] = useState('');
  const [notifyOnComplete, setNotifyOnComplete] = useState([]);
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [uploadingCommentFile, setUploadingCommentFile] = useState(false);
  const [uploadingTaskFile, setUploadingTaskFile] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [expandedChecklistItem, setExpandedChecklistItem] = useState(null);
  const [groupCompletedAtBottom, setGroupCompletedAtBottom] = useState(true);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const textareaRef = useRef(null);
  const commentFileInputRef = useRef(null);
  const taskFileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => { if (task) { setNotes(task.notes || ''); setNotifyOnComplete(task.notify_on_complete || []); setChecklistItems(task.checklist_items || []); } }, [task?.id]);

  const { data: comments = [], refetch: refetchComments } = useQuery({ queryKey: ['taskComments', task?.id], queryFn: () => base44.entities.TaskComment.filter({ task_id: task?.id }, '-created_date'), enabled: !!task?.id && open });

  const addCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      const newComment = await base44.entities.TaskComment.create(commentData);
      if (commentData.mentions?.length > 0) {
        for (const email of commentData.mentions) {
          if (email !== currentUser?.email) {
            try {
              await base44.entities.UserNotification.create({ user_email: email, type: 'mention', title: 'You were mentioned in a comment', message: `${currentUser?.full_name || currentUser?.email} mentioned you on "${task.title}"`, project_id: task.project_id, project_name: project?.name, from_user_email: currentUser?.email, from_user_name: currentUser?.full_name || currentUser?.email, link: `/ProjectDetail?id=${task.project_id}`, is_read: false });
              await base44.functions.invoke('sendNotificationEmail', { to: email, type: 'mention', title: 'You were mentioned in a comment', message: `${currentUser?.full_name || currentUser?.email} mentioned you on "${task.title}": "${commentData.content}"`, projectId: task.project_id, projectName: project?.name, fromUserName: currentUser?.full_name || currentUser?.email, link: `${window.location.origin}/ProjectDetail?id=${task.project_id}` });
            } catch (err) { console.error('Failed to send mention notification:', err); }
          }
        }
      }
      return newComment;
    },
    onSuccess: () => { refetchComments(); setComment(''); setCommentAttachments([]); }
  });

  const handleUpdateTask = async (updates) => { await base44.entities.Task.update(task.id, updates); queryClient.invalidateQueries({ queryKey: ['tasks'] }); };
  const handleStatusToggle = async () => { const newStatus = task.status === 'completed' ? 'todo' : 'completed'; await handleUpdateTask({ status: newStatus }); };
  const handleStatusChange = async (status) => { await handleUpdateTask({ status }); setShowStatusDropdown(false); };

  const handleAssign = async (email) => {
    const member = teamMembers.find(m => m.email === email);
    const wasAssigned = task.assigned_to;
    const newEmail = email === 'unassigned' ? '' : email;
    await handleUpdateTask({ assigned_to: newEmail, assigned_name: email === 'unassigned' ? '' : (member?.name || email) });
    if (newEmail && newEmail !== wasAssigned) { await sendTaskAssignmentNotification({ assigneeEmail: newEmail, taskTitle: task.title, projectId: task.project_id, projectName: project?.name || '', currentUser }); }
  };

  const [localPriority, setLocalPriority] = useState(task?.priority || 'medium');
  useEffect(() => { if (task?.priority) setLocalPriority(task.priority); }, [task?.priority]);
  const handlePriorityChange = async (priority) => { setLocalPriority(priority); await handleUpdateTask({ priority }); };

  const [localDueDate, setLocalDueDate] = useState(null);
  useEffect(() => { if (task?.due_date) { setLocalDueDate(new Date(task.due_date.split('T')[0] + 'T12:00:00')); } else { setLocalDueDate(null); } }, [task?.due_date]);
  const handleDueDateChange = (date) => { setLocalDueDate(date); handleUpdateTask({ due_date: date ? format(date, 'yyyy-MM-dd') : '' }); };
  const handleNotesBlur = async () => { if (notes !== task.notes) await handleUpdateTask({ notes }); };

  const handleToggleNotify = async (email) => {
    const current = task.notify_on_complete || [];
    const updated = current.includes(email) ? current.filter(e => e !== email) : [...current, email];
    await handleUpdateTask({ notify_on_complete: updated });
    setNotifyOnComplete(updated);
  };

  const handleCommentChange = (e) => { const value = e.target.value; const pos = e.target.selectionStart; setComment(value); setCursorPosition(pos); const textBeforeCursor = value.slice(0, pos); const atMatch = textBeforeCursor.match(/@(\w*)$/); if (atMatch) { setShowMentions(true); setMentionSearch(atMatch[1].toLowerCase()); } else { setShowMentions(false); } };
  const insertMention = (member) => { const textBeforeCursor = comment.slice(0, cursorPosition); const textAfterCursor = comment.slice(cursorPosition); const atIndex = textBeforeCursor.lastIndexOf('@'); const newText = textBeforeCursor.slice(0, atIndex) + `@${member.name} ` + textAfterCursor; setComment(newText); setShowMentions(false); setTimeout(() => textareaRef.current?.focus(), 0); };

  const handleSubmitComment = async () => {
    if ((!comment.trim() && commentAttachments.length === 0) || !currentUser) return;
    const mentionRegex = /@(\w+(?:\s\w+)?)/g; const mentionedNames = []; let match;
    while ((match = mentionRegex.exec(comment)) !== null) { mentionedNames.push(match[1]); }
    const mentionedEmails = teamMembers.filter(m => mentionedNames.some(name => m.name.toLowerCase().includes(name.toLowerCase()))).map(m => m.email);
    await addCommentMutation.mutateAsync({ task_id: task.id, content: comment, author_email: currentUser.email, author_name: currentUser.full_name || currentUser.email, mentions: mentionedEmails, attachments: commentAttachments.length > 0 ? commentAttachments : undefined });
  };

  const handleCommentFileUpload = async (e) => { const file = e.target.files?.[0]; if (!file) return; setUploadingCommentFile(true); try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setCommentAttachments(prev => [...prev, { name: file.name, url: file_url, type: file.type }]); } catch (err) { console.error('Failed to upload file:', err); } setUploadingCommentFile(false); };

  const handlePaste = async (e) => { const items = e.clipboardData?.items; if (!items) return; for (const item of items) { if (item.type.startsWith('image/')) { e.preventDefault(); const file = item.getAsFile(); if (!file) continue; setUploadingCommentFile(true); try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setCommentAttachments(prev => [...prev, { name: `pasted-image-${Date.now()}.png`, url: file_url, type: file.type }]); } catch (err) { console.error('Failed to upload pasted image:', err); } setUploadingCommentFile(false); break; } } };

  const handleTaskFileUpload = async (e) => { const file = e.target.files?.[0]; if (!file) return; setUploadingTaskFile(true); try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); const currentAttachments = task.attachments || []; await handleUpdateTask({ attachments: [...currentAttachments, { name: file.name, url: file_url, type: file.type }] }); } catch (err) { console.error('Failed to upload file:', err); } setUploadingTaskFile(false); };
  const handleRemoveAttachment = async (index) => { const newAttachments = [...(task.attachments || [])]; newAttachments.splice(index, 1); await handleUpdateTask({ attachments: newAttachments }); };

  const handleAddChecklistItem = async () => { if (!newChecklistItem.trim()) return; const newItem = { id: Date.now().toString(36) + Math.random().toString(36).substr(2), title: newChecklistItem.trim(), completed: false, due_date: null, assigned_to: null, assigned_name: null }; const updated = [...checklistItems, newItem]; setChecklistItems(updated); setNewChecklistItem(''); await handleUpdateTask({ checklist_items: updated }); };
  const handleToggleChecklistItem = async (itemId) => { const updated = checklistItems.map(item => item.id === itemId ? { ...item, completed: !item.completed, completed_date: !item.completed ? new Date().toISOString() : null } : item); setChecklistItems(updated); await handleUpdateTask({ checklist_items: updated }); };
  const handleRemoveChecklistItem = async (itemId) => { const updated = checklistItems.filter(item => item.id !== itemId); setChecklistItems(updated); if (expandedChecklistItem === itemId) setExpandedChecklistItem(null); await handleUpdateTask({ checklist_items: updated }); };
  const handleChecklistItemDueDate = async (itemId, date) => { const updated = checklistItems.map(item => item.id === itemId ? { ...item, due_date: date ? format(date, 'yyyy-MM-dd') : null } : item); setChecklistItems(updated); await handleUpdateTask({ checklist_items: updated }); };
  const handleChecklistItemAssign = async (itemId, email) => { const member = teamMembers.find(m => m.email === email); const updated = checklistItems.map(item => item.id === itemId ? { ...item, assigned_to: email || null, assigned_name: email ? (member?.name || email) : null } : item); setChecklistItems(updated); await handleUpdateTask({ checklist_items: updated }); };

  const handleChecklistDragEnd = useCallback(async (result) => {
    if (!result.destination) return;
    const sourceIdx = result.source.index; const destIdx = result.destination.index;
    if (sourceIdx === destIdx) return;
    const activeItems = checklistItems.filter(i => !i.completed);
    const completedItems = checklistItems.filter(i => i.completed);
    const displayedItems = groupCompletedAtBottom ? [...activeItems, ...completedItems] : checklistItems;
    const reordered = Array.from(displayedItems);
    const [removed] = reordered.splice(sourceIdx, 1);
    reordered.splice(destIdx, 0, removed);
    setChecklistItems(reordered);
    await handleUpdateTask({ checklist_items: reordered });
  }, [checklistItems, groupCompletedAtBottom]);

  const filteredMembers = teamMembers.filter(m => m.name.toLowerCase().includes(mentionSearch));
  if (!task) return null;

  const currentPriority = priorityConfig[localPriority] || priorityConfig.medium;
  const isCompleted = task.status === 'completed';
  const currentStatus = statusPillConfig[task.status] || statusPillConfig.todo;
  const completedChecklistCount = checklistItems.filter(i => i.completed).length;
  const checklistProgress = checklistItems.length > 0 ? Math.round((completedChecklistCount / checklistItems.length) * 100) : 0;
  const activeChecklistItems = checklistItems.filter(i => !i.completed);
  const completedChecklistItems = checklistItems.filter(i => i.completed);
  const displayedChecklistItems = groupCompletedAtBottom ? [...activeChecklistItems, ...completedChecklistItems] : checklistItems;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 flex-shrink-0" />
        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <motion.button onClick={handleStatusToggle} whileTap={{ scale: 0.85 }} className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5", isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400")}>
              <AnimatePresence>{isCompleted && (<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}><Check className="w-4 h-4" /></motion.div>)}</AnimatePresence>
            </motion.button>
            <div className="flex-1 min-w-0">
              <h2 className={cn("text-xl font-semibold text-slate-900 leading-tight", isCompleted && "line-through text-slate-400")}>{task.title}</h2>
              <p className="text-sm text-slate-500 mt-1">Added by {task.created_by || 'Unknown'} · {format(new Date(task.created_date), 'MMM d, yyyy')}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(task)} className="h-8 w-8 rounded-xl hover:bg-slate-100"><Edit2 className="w-4 h-4" /></Button>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete Task</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <div className="relative">
              <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all", currentStatus.classes)}>
                <div className={cn("w-2 h-2 rounded-full", currentStatus.dot)} />{currentStatus.label}<ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
              </button>
              <AnimatePresence>{showStatusDropdown && (<><div className="fixed inset-0 z-[99]" onClick={() => setShowStatusDropdown(false)} /><motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[100] overflow-hidden min-w-[160px]">
                {Object.entries(statusPillConfig).filter(([k]) => k !== 'archived').map(([key, config]) => (<button key={key} onClick={() => handleStatusChange(key)} className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left", task.status === key && "bg-slate-50 font-medium")}><div className={cn("w-2.5 h-2.5 rounded-full", config.dot)} />{config.label}{task.status === key && <Check className="w-3.5 h-3.5 ml-auto text-emerald-500" />}</button>))}
              </motion.div></>)}</AnimatePresence>
            </div>
            <DropdownMenu><DropdownMenuTrigger asChild><button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm">{task.assigned_name ? (<><UserAvatar email={task.assigned_to} name={task.assigned_name} avatarUrl={teamMembers.find(m => m.email === task.assigned_to)?.avatar_url} size="xs" />{task.assigned_name}</>) : (<><User className="w-4 h-4 text-slate-400" /><span className="text-slate-500">Assign</span></>)}<ChevronDown className="w-3 h-3 text-slate-400" /></button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => handleAssign('unassigned')}><User className="w-4 h-4 mr-2 text-slate-400" />Unassigned</DropdownMenuItem><DropdownMenuSeparator />{teamMembers.map(m => (<DropdownMenuItem key={m.id} onClick={() => handleAssign(m.email)}><UserAvatar email={m.email} name={m.name} avatarUrl={m.avatar_url} size="xs" className="mr-2" />{m.name}{task.assigned_to === m.email && <Check className="w-4 h-4 ml-auto" />}</DropdownMenuItem>))}</DropdownMenuContent></DropdownMenu>
            <Popover><PopoverTrigger asChild><button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm"><CalendarIcon className="w-4 h-4 text-slate-400" />{localDueDate ? <span>{format(localDueDate, 'MMM d')}</span> : <span className="text-slate-500">Due date</span>}</button></PopoverTrigger><PopoverContent className="w-auto p-0 z-[100]" align="start"><Calendar mode="single" selected={localDueDate} onSelect={handleDueDateChange} />{task.due_date && (<div className="p-2 border-t"><Button variant="ghost" size="sm" onClick={() => handleDueDateChange(null)} className="w-full text-red-600">Clear date</Button></div>)}</PopoverContent></Popover>
            <DropdownMenu><DropdownMenuTrigger asChild><button className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-sm", currentPriority.bg, "border-transparent")}><Flag className={cn("w-4 h-4", currentPriority.color)} /><span className={currentPriority.color}>{currentPriority.label}</span><ChevronDown className="w-3 h-3 text-slate-400" /></button></DropdownMenuTrigger><DropdownMenuContent>{Object.entries(priorityConfig).map(([key, config]) => (<DropdownMenuItem key={key} onClick={() => handlePriorityChange(key)}><Flag className={cn("w-4 h-4 mr-2", config.color)} />{config.label}{task.priority === key && <Check className="w-4 h-4 ml-auto" />}</DropdownMenuItem>))}</DropdownMenuContent></DropdownMenu>
            <DropdownMenu><DropdownMenuTrigger asChild><button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm"><Bell className="w-4 h-4 text-slate-400" />{notifyOnComplete.length > 0 ? <span>{notifyOnComplete.length} notified</span> : <span className="text-slate-500">Notify</span>}</button></DropdownMenuTrigger><DropdownMenuContent><p className="px-2 py-1.5 text-xs text-slate-500">Notify when completed:</p>{teamMembers.map(m => (<DropdownMenuItem key={m.id} onClick={() => handleToggleNotify(m.email)}><UserAvatar email={m.email} name={m.name} avatarUrl={m.avatar_url} size="xs" className="mr-2" />{m.name}{notifyOnComplete.includes(m.email) && <Check className="w-4 h-4 ml-auto text-emerald-600" />}</DropdownMenuItem>))}</DropdownMenuContent></DropdownMenu>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5"><div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500"><StickyNote className="w-3.5 h-3.5 text-white" /></div><label className="text-sm font-semibold text-slate-700">Notes</label></div>
              <Button variant="outline" size="sm" onClick={() => taskFileInputRef.current?.click()} disabled={uploadingTaskFile} className="h-7 text-xs rounded-lg">{uploadingTaskFile ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Paperclip className="w-3 h-3 mr-1" />}Attach file</Button>
              <input ref={taskFileInputRef} type="file" className="hidden" onChange={handleTaskFileUpload} />
            </div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={handleNotesBlur} placeholder="Add notes or details..." className="min-h-[80px] resize-none border-slate-200 rounded-xl focus:ring-[#0069AF]/20 focus:border-[#0069AF]/40" />
            {task.attachments?.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {task.attachments.filter(att => att.type?.startsWith('image/')).length > 0 && (<div className="flex flex-wrap gap-2 mb-2">{task.attachments.filter(att => att.type?.startsWith('image/')).map((att, idx) => (<a key={`img-${idx}`} href={att.url} target="_blank" rel="noopener noreferrer" className="relative group"><img src={att.url} alt={att.name} className="h-20 w-auto rounded-lg object-cover border border-slate-200 hover:opacity-90 transition-opacity" /><button onClick={(e) => { e.preventDefault(); handleRemoveAttachment(task.attachments.indexOf(att)); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><X className="w-3 h-3" /></button></a>))}</div>)}
                {task.attachments.filter(att => !att.type?.startsWith('image/')).map((att, idx) => { const FileIcon = getFileIcon(att.type); const realIdx = task.attachments.indexOf(att); return (<div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl group"><div className="p-1.5 rounded-lg bg-slate-100"><FileIcon className="w-3.5 h-3.5 text-slate-500" /></div><a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-[#0069AF] hover:underline truncate">{att.name}</a><button onClick={() => handleRemoveAttachment(realIdx)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded-lg transition-all"><X className="w-3 h-3 text-slate-500" /></button></div>); })}
              </div>
            )}
          </div>

          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5"><div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500"><ListChecks className="w-3.5 h-3.5 text-white" /></div><label className="text-sm font-semibold text-slate-700">Checklist</label>{checklistItems.length > 0 && (<span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{completedChecklistCount}/{checklistItems.length}</span>)}</div>
              {checklistItems.length > 0 && (<button onClick={() => setGroupCompletedAtBottom(!groupCompletedAtBottom)} className={cn("text-[11px] px-2 py-1 rounded-lg transition-colors font-medium", groupCompletedAtBottom ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-slate-50 text-slate-500 hover:bg-slate-100")}>{groupCompletedAtBottom ? 'Sorted ✓' : 'Sort done'}</button>)}
            </div>
            {checklistItems.length > 0 && (<div className="flex items-center gap-2.5 mb-3"><div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden"><motion.div className={cn("h-2 rounded-full", checklistProgress === 100 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-blue-500 to-indigo-400")} initial={{ width: 0 }} animate={{ width: `${checklistProgress}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} /></div><span className={cn("text-xs font-bold tabular-nums min-w-[32px] text-right", checklistProgress === 100 ? "text-emerald-600" : "text-slate-500")}>{checklistProgress}%</span></div>)}

            <DragDropContext onDragEnd={handleChecklistDragEnd}>
              <Droppable droppableId="checklist-items">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-0.5">
                    {displayedChecklistItems.map((item, index) => {
                      const isFirstCompleted = groupCompletedAtBottom && item.completed && (index === 0 || !displayedChecklistItems[index - 1]?.completed);
                      const isExpanded = expandedChecklistItem === item.id;
                      return (
                        <div key={item.id}>
                          {isFirstCompleted && activeChecklistItems.length > 0 && (<div className="flex items-center gap-2 py-2 px-2"><div className="flex-1 border-t border-dashed border-slate-200" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</span><div className="flex-1 border-t border-dashed border-slate-200" /></div>)}
                          <Draggable draggableId={item.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className={cn("rounded-xl transition-all", dragSnapshot.isDragging && "shadow-lg ring-2 ring-blue-200 bg-white z-50")}>
                                <div className={cn("flex items-center gap-2 group py-2 px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer", item.completed && "opacity-50")} onClick={() => setExpandedChecklistItem(isExpanded ? null : item.id)}>
                                  <div {...dragProvided.dragHandleProps} className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}><GripVertical className="w-3.5 h-3.5 text-slate-300" /></div>
                                  <motion.button onClick={(e) => { e.stopPropagation(); handleToggleChecklistItem(item.id); }} whileTap={{ scale: 0.85 }} className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0", item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400")}><AnimatePresence>{item.completed && (<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}><Check className="w-3 h-3" /></motion.div>)}</AnimatePresence></motion.button>
                                  <span className={cn("flex-1 text-sm min-w-0 truncate", item.completed && "line-through text-slate-400")}>{item.title}</span>
                                  {!isExpanded && (<div className="flex items-center gap-1.5 flex-shrink-0">{item.due_date && (<span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">{format(new Date(item.due_date + 'T12:00:00'), 'MMM d')}</span>)}{item.assigned_to && (<UserAvatar email={item.assigned_to} name={item.assigned_name} avatarUrl={teamMembers.find(m => m.email === item.assigned_to)?.avatar_url} size="xs" />)}</div>)}
                                  <div className={cn("flex-shrink-0 transition-all", isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-60")}>{isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}</div>
                                  <button onClick={(e) => { e.stopPropagation(); handleRemoveChecklistItem(item.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"><X className="w-3 h-3 text-slate-400 hover:text-red-500" /></button>
                                </div>
                                <AnimatePresence>{isExpanded && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"><div className="pl-12 pr-2 pb-2 flex items-center gap-3">
                                  <Popover><PopoverTrigger asChild><button className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors", item.due_date ? "bg-slate-50 border-slate-200 text-slate-600" : "border-dashed border-slate-300 text-slate-400 hover:border-slate-400")}><CalendarIcon className="w-3.5 h-3.5" />{item.due_date ? format(new Date(item.due_date + 'T12:00:00'), 'MMM d, yyyy') : 'Set due date'}</button></PopoverTrigger><PopoverContent className="w-auto p-0 z-[100]" align="start"><Calendar mode="single" selected={item.due_date ? new Date(item.due_date + 'T12:00:00') : undefined} onSelect={(date) => handleChecklistItemDueDate(item.id, date)} />{item.due_date && (<div className="p-2 border-t"><button onClick={() => handleChecklistItemDueDate(item.id, null)} className="w-full text-center text-xs text-red-600 hover:bg-red-50 py-1 rounded">Clear date</button></div>)}</PopoverContent></Popover>
                                  <DropdownMenu><DropdownMenuTrigger asChild><button className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors", item.assigned_to ? "bg-slate-50 border-slate-200 text-slate-600" : "border-dashed border-slate-300 text-slate-400 hover:border-slate-400")}>{item.assigned_to ? (<><UserAvatar email={item.assigned_to} name={item.assigned_name} avatarUrl={teamMembers.find(m => m.email === item.assigned_to)?.avatar_url} size="xs" />{item.assigned_name}</>) : (<><User className="w-3.5 h-3.5" />Assign</>)}</button></DropdownMenuTrigger><DropdownMenuContent align="start">{item.assigned_to && (<><DropdownMenuItem onClick={() => handleChecklistItemAssign(item.id, '')}><User className="w-4 h-4 mr-2 text-slate-400" />Unassign</DropdownMenuItem><DropdownMenuSeparator /></>)}{teamMembers.map(m => (<DropdownMenuItem key={m.id} onClick={() => handleChecklistItemAssign(item.id, m.email)}><UserAvatar email={m.email} name={m.name} avatarUrl={m.avatar_url} size="xs" className="mr-2" />{m.name}</DropdownMenuItem>))}</DropdownMenuContent></DropdownMenu>
                                </div></motion.div>)}</AnimatePresence>
                              </div>
                            )}
                          </Draggable>
                        </div>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <div className="flex items-center gap-2 mt-2 px-2">
              <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newChecklistItem.trim()) { e.preventDefault(); handleAddChecklistItem(); } }} placeholder="Add an item... press Enter" className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 py-1.5" />
              {newChecklistItem.trim() && (<button onClick={handleAddChecklistItem} className="text-xs text-[#0069AF] hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">Add</button>)}
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-2.5 mb-4"><div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500"><MessageSquare className="w-3.5 h-3.5 text-white" /></div><label className="text-sm font-semibold text-slate-700">Comments</label>{comments.length > 0 && (<span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{comments.length}</span>)}</div>
            <div className="space-y-4">
              {comments.map((c) => (<div key={c.id} className="flex gap-3"><UserAvatar email={c.author_email} name={c.author_name} avatarUrl={teamMembers.find(m => m.email === c.author_email)?.avatar_url} size="md" /><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="font-medium text-slate-900 text-sm">{c.author_name}</span><span className="text-xs text-slate-400">{formatDistanceToNow(new Date(c.created_date), { addSuffix: true })}</span></div><p className="text-sm text-slate-600 whitespace-pre-wrap">{c.content.split(/(@\w+(?:\s\w+)?)/g).map((part, i) => part.startsWith('@') ? <span key={i} className="text-[#0069AF] font-medium">{part}</span> : part)}</p>{c.attachments?.length > 0 && (<div className="mt-2 flex flex-wrap gap-2">{c.attachments.map((att, idx) => { const isImage = att.type?.startsWith('image/'); const FileIcon = getFileIcon(att.type); return isImage ? (<a key={idx} href={att.url} target="_blank" rel="noopener noreferrer"><img src={att.url} alt={att.name} className="h-24 w-auto rounded-xl object-cover border border-slate-200 hover:opacity-90 transition-opacity" /></a>) : (<a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1 text-xs text-[#0069AF] hover:bg-slate-200"><FileIcon className="w-3 h-3" /><span className="truncate max-w-[100px]">{att.name}</span></a>); })}</div>)}</div></div>))}
              {comments.length === 0 && (<div className="text-center py-6"><MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" /><p className="text-sm text-slate-400">No comments yet</p></div>)}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
          <div className="flex gap-3">
            <UserAvatar email={currentUser?.email} name={currentUser?.full_name} avatarUrl={currentUser?.avatar_url} size="md" />
            <div className="flex-1 relative">
              <Textarea ref={textareaRef} value={comment} onChange={handleCommentChange} onPaste={handlePaste} placeholder="Add a comment... Use @ to mention (paste images supported)" className="min-h-[60px] resize-none pr-10 bg-white rounded-xl focus:ring-[#0069AF]/20 focus:border-[#0069AF]/40" />
              <button type="button" onClick={() => commentFileInputRef.current?.click()} disabled={uploadingCommentFile} className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">{uploadingCommentFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}</button>
              <input ref={commentFileInputRef} type="file" className="hidden" onChange={handleCommentFileUpload} />
              {commentAttachments.length > 0 && (<div className="mt-2 flex flex-wrap gap-2">{commentAttachments.map((att, idx) => { const isImage = att.type?.startsWith('image/'); const FileIcon = getFileIcon(att.type); return (<div key={idx} className="relative group">{isImage ? (<div className="relative"><img src={att.url} alt={att.name} className="h-16 w-auto rounded-xl object-cover border border-slate-200" /><button onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button></div>) : (<div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1 text-xs"><FileIcon className="w-3 h-3 text-slate-500" /><span className="truncate max-w-[100px]">{att.name}</span><button onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button></div>)}</div>); })}</div>)}
              {showMentions && filteredMembers.length > 0 && (<div className="absolute bottom-full left-0 mb-1 w-56 bg-white border rounded-xl shadow-lg max-h-40 overflow-y-auto z-50">{filteredMembers.map((member) => (<button key={member.id} onClick={() => insertMention(member)} className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"><UserAvatar email={member.email} name={member.name} avatarUrl={member.avatar_url} size="sm" /><span className="text-sm">{member.name}</span></button>))}</div>)}
            </div>
            <Button onClick={handleSubmitComment} disabled={(!comment.trim() && commentAttachments.length === 0) || addCommentMutation.isPending} size="icon" className="h-10 w-10 bg-[#0069AF] hover:bg-[#005a96] rounded-xl"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Send, Calendar as CalendarIcon, Edit2, Trash2, Paperclip, X, 
  FileText, Image, Loader2, Check, MoreHorizontal, Bell, 
  User, Clock, Flag, MessageSquare, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

const priorityConfig = {
  low: { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-100' },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50' },
  high: { label: 'High', color: 'text-red-600', bg: 'bg-red-50' }
};

const statusConfig = {
  todo: { label: 'To Do', color: 'bg-slate-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500' },
  review: { label: 'Review', color: 'bg-purple-500' },
  completed: { label: 'Completed', color: 'bg-emerald-500' }
};

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const getColorForEmail = (email) => {
  if (!email) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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
  const textareaRef = useRef(null);
  const commentFileInputRef = useRef(null);
  const taskFileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (task) {
      setNotes(task.notes || '');
      setNotifyOnComplete(task.notify_on_complete || []);
    }
  }, [task?.id]);

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['taskComments', task?.id],
    queryFn: () => base44.entities.TaskComment.filter({ task_id: task?.id }, '-created_date'),
    enabled: !!task?.id && open
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      const newComment = await base44.entities.TaskComment.create(commentData);
      if (commentData.mentions?.length > 0) {
        for (const email of commentData.mentions) {
          if (email !== currentUser?.email) {
            try {
              await base44.entities.UserNotification.create({
                user_email: email,
                type: 'mention',
                title: 'You were mentioned in a comment',
                message: `${currentUser?.full_name || currentUser?.email} mentioned you on "${task.title}"`,
                project_id: task.project_id,
                project_name: project?.name,
                from_user_email: currentUser?.email,
                from_user_name: currentUser?.full_name || currentUser?.email,
                link: `/ProjectDetail?id=${task.project_id}`,
                is_read: false
              });
            } catch (err) {
              console.error('Failed to send mention notification:', err);
            }
          }
        }
      }
      return newComment;
    },
    onSuccess: () => {
      refetchComments();
      setComment('');
      setCommentAttachments([]);
    }
  });

  const handleUpdateTask = async (updates) => {
    await base44.entities.Task.update(task.id, updates);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleStatusToggle = async () => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await handleUpdateTask({ status: newStatus });
  };

  const handleStatusChange = async (status) => {
    await handleUpdateTask({ status });
  };

  const handleAssign = async (email) => {
    const member = teamMembers.find(m => m.email === email);
    await handleUpdateTask({
      assigned_to: email === 'unassigned' ? '' : email,
      assigned_name: email === 'unassigned' ? '' : (member?.name || email)
    });
  };

  const handlePriorityChange = async (priority) => {
    await handleUpdateTask({ priority });
  };

  const handleDueDateChange = async (date) => {
    await handleUpdateTask({ due_date: date ? format(date, 'yyyy-MM-dd') : '' });
  };

  const handleNotesBlur = async () => {
    if (notes !== task.notes) {
      await handleUpdateTask({ notes });
    }
  };

  const handleToggleNotify = async (email) => {
    const current = task.notify_on_complete || [];
    const updated = current.includes(email) 
      ? current.filter(e => e !== email)
      : [...current, email];
    await handleUpdateTask({ notify_on_complete: updated });
    setNotifyOnComplete(updated);
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    setComment(value);
    setCursorPosition(pos);
    const textBeforeCursor = value.slice(0, pos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionSearch(atMatch[1].toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member) => {
    const textBeforeCursor = comment.slice(0, cursorPosition);
    const textAfterCursor = comment.slice(cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.slice(0, atIndex) + `@${member.name} ` + textAfterCursor;
    setComment(newText);
    setShowMentions(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSubmitComment = async () => {
    if ((!comment.trim() && commentAttachments.length === 0) || !currentUser) return;
    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
    const mentionedNames = [];
    let match;
    while ((match = mentionRegex.exec(comment)) !== null) {
      mentionedNames.push(match[1]);
    }
    const mentionedEmails = teamMembers
      .filter(m => mentionedNames.some(name => m.name.toLowerCase().includes(name.toLowerCase())))
      .map(m => m.email);

    await addCommentMutation.mutateAsync({
      task_id: task.id,
      content: comment,
      author_email: currentUser.email,
      author_name: currentUser.full_name || currentUser.email,
      mentions: mentionedEmails,
      attachments: commentAttachments.length > 0 ? commentAttachments : undefined
    });
  };

  const handleCommentFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCommentFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCommentAttachments(prev => [...prev, { name: file.name, url: file_url, type: file.type }]);
    } catch (err) {
      console.error('Failed to upload file:', err);
    }
    setUploadingCommentFile(false);
  };

  const handleTaskFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTaskFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const currentAttachments = task.attachments || [];
      await handleUpdateTask({ attachments: [...currentAttachments, { name: file.name, url: file_url, type: file.type }] });
    } catch (err) {
      console.error('Failed to upload file:', err);
    }
    setUploadingTaskFile(false);
  };

  const handleRemoveAttachment = async (index) => {
    const newAttachments = [...(task.attachments || [])];
    newAttachments.splice(index, 1);
    await handleUpdateTask({ attachments: newAttachments });
  };

  const filteredMembers = teamMembers.filter(m => m.name.toLowerCase().includes(mentionSearch));

  if (!task) return null;

  const currentStatus = statusConfig[task.status] || statusConfig.todo;
  const currentPriority = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            {/* Checkbox */}
            <button 
              onClick={handleStatusToggle}
              className={cn(
                "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5",
                task.status === 'completed' 
                  ? "bg-emerald-500 border-emerald-500 text-white" 
                  : "border-slate-300 hover:border-emerald-400"
              )}
            >
              {task.status === 'completed' && <Check className="w-4 h-4" />}
            </button>
            
            {/* Title & Meta */}
            <div className="flex-1 min-w-0">
              <h2 className={cn(
                "text-xl font-semibold text-slate-900 leading-tight",
                task.status === 'completed' && "line-through text-slate-400"
              )}>
                {task.title}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Added by {task.created_by || 'Unknown'} · {format(new Date(task.created_date), 'MMM d, yyyy')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(task)} className="h-8 w-8">
                <Edit2 className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {/* Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm">
                  <div className={cn("w-2 h-2 rounded-full", currentStatus.color)} />
                  {currentStatus.label}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => handleStatusChange(key)}>
                    <div className={cn("w-2 h-2 rounded-full mr-2", config.color)} />
                    {config.label}
                    {task.status === key && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Assignee */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm">
                  {task.assigned_name ? (
                    <>
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(task.assigned_to))}>
                        {getInitials(task.assigned_name)}
                      </div>
                      {task.assigned_name}
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-500">Assign</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleAssign('unassigned')}>
                  <User className="w-4 h-4 mr-2 text-slate-400" />
                  Unassigned
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {teamMembers.map(m => (
                  <DropdownMenuItem key={m.id} onClick={() => handleAssign(m.email)}>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(m.email))}>
                      {getInitials(m.name)}
                    </div>
                    {m.name}
                    {task.assigned_to === m.email && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Due Date */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  {task.due_date ? (
                    <span>{format(new Date(task.due_date.split('T')[0] + 'T12:00:00'), 'MMM d')}</span>
                  ) : (
                    <span className="text-slate-500">Due date</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.due_date ? new Date(task.due_date.split('T')[0] + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    handleDueDateChange(date);
                  }}
                  initialFocus
                />
                {task.due_date && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => handleDueDateChange(null)} className="w-full text-red-600">
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Priority */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-sm",
                  currentPriority.bg, "border-transparent"
                )}>
                  <Flag className={cn("w-4 h-4", currentPriority.color)} />
                  <span className={currentPriority.color}>{currentPriority.label}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => handlePriorityChange(key)}>
                    <Flag className={cn("w-4 h-4 mr-2", config.color)} />
                    {config.label}
                    {task.priority === key && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notify */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm">
                  <Bell className="w-4 h-4 text-slate-400" />
                  {notifyOnComplete.length > 0 ? (
                    <span>{notifyOnComplete.length} notified</span>
                  ) : (
                    <span className="text-slate-500">Notify</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <p className="px-2 py-1.5 text-xs text-slate-500">Notify when completed:</p>
                {teamMembers.map(m => (
                  <DropdownMenuItem key={m.id} onClick={() => handleToggleNotify(m.email)}>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(m.email))}>
                      {getInitials(m.name)}
                    </div>
                    {m.name}
                    {notifyOnComplete.includes(m.email) && <Check className="w-4 h-4 ml-auto text-emerald-600" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Notes Section */}
          <div className="p-6 border-b border-slate-100">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes or details..."
              className="min-h-[80px] resize-none border-slate-200"
            />
          </div>

          {/* Attachments */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700">
                Attachments {task.attachments?.length > 0 && `(${task.attachments.length})`}
              </label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => taskFileInputRef.current?.click()}
                disabled={uploadingTaskFile}
                className="h-7 text-xs"
              >
                {uploadingTaskFile ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Paperclip className="w-3 h-3 mr-1" />}
                Add file
              </Button>
              <input ref={taskFileInputRef} type="file" className="hidden" onChange={handleTaskFileUpload} />
            </div>
            {task.attachments?.length > 0 ? (
              <div className="space-y-1">
                {task.attachments.map((att, idx) => {
                  const FileIcon = getFileIcon(att.type);
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg group">
                      <FileIcon className="w-4 h-4 text-slate-400" />
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-indigo-600 hover:underline truncate">
                        {att.name}
                      </a>
                      <button onClick={() => handleRemoveAttachment(idx)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded">
                        <X className="w-3 h-3 text-slate-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No files attached</p>
            )}
          </div>

          {/* Comments */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <label className="text-sm font-medium text-slate-700">Comments ({comments.length})</label>
            </div>
            
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-medium", getColorForEmail(c.author_email))}>
                    {getInitials(c.author_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 text-sm">{c.author_name}</span>
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(c.created_date), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {c.content.split(/(@\w+(?:\s\w+)?)/g).map((part, i) => 
                        part.startsWith('@') ? <span key={i} className="text-indigo-600 font-medium">{part}</span> : part
                      )}
                    </p>
                    {c.attachments?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.attachments.map((att, idx) => {
                          const FileIcon = getFileIcon(att.type);
                          return (
                            <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-xs text-indigo-600 hover:bg-slate-200">
                              <FileIcon className="w-3 h-3" />
                              <span className="truncate max-w-[100px]">{att.name}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No comments yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex gap-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0", getColorForEmail(currentUser?.email))}>
              {getInitials(currentUser?.full_name)}
            </div>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={comment}
                onChange={handleCommentChange}
                placeholder="Add a comment... Use @ to mention"
                className="min-h-[60px] resize-none pr-10 bg-white"
              />
              <button
                type="button"
                onClick={() => commentFileInputRef.current?.click()}
                disabled={uploadingCommentFile}
                className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
              >
                {uploadingCommentFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <input ref={commentFileInputRef} type="file" className="hidden" onChange={handleCommentFileUpload} />
              
              {commentAttachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {commentAttachments.map((att, idx) => {
                    const FileIcon = getFileIcon(att.type);
                    return (
                      <div key={idx} className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-xs">
                        <FileIcon className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[100px]">{att.name}</span>
                        <button onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {showMentions && filteredMembers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-56 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => insertMention(member)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                    >
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(member.email))}>
                        {getInitials(member.name)}
                      </div>
                      <span className="text-sm">{member.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button 
              onClick={handleSubmitComment} 
              disabled={(!comment.trim() && commentAttachments.length === 0) || addCommentMutation.isPending}
              size="icon"
              className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
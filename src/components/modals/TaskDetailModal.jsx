import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, User, Calendar as CalendarIcon, Clock, AlertTriangle, Edit2, Trash2, Paperclip, X, FileText, Image, Loader2, CheckSquare, MoreHorizontal, Bell, StickyNote, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import AITaskAssistant from '@/components/tasks/AITaskAssistant';

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700'
};

const statusLabels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed'
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

const getFileIcon = (type) => {
  if (type?.startsWith('image')) return Image;
  return FileText;
};

export default function TaskDetailModal({ open, onClose, task, teamMembers = [], onEdit, currentUser, project }) {
  const [comment, setComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [notifyOnComplete, setNotifyOnComplete] = useState([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState(null);
  const [savingDate, setSavingDate] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [uploadingCommentFile, setUploadingCommentFile] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const commentFileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Initialize notes and due date from task
  useEffect(() => {
    if (task) {
      setNotes(task.notes || '');
      setNotifyOnComplete(task.notify_on_complete || []);
      // Parse the date properly using UTC to avoid timezone shifts
      if (task.due_date) {
        const dateStr = task.due_date.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        setSelectedDueDate(new Date(year, month - 1, day));
      } else {
        setSelectedDueDate(null);
      }
    }
  }, [task?.id, task?.due_date]);

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['taskComments', task?.id],
    queryFn: () => base44.entities.TaskComment.filter({ task_id: task?.id }, '-created_date'),
    enabled: !!task?.id && open
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      const newComment = await base44.entities.TaskComment.create(commentData);
      
      // Send notifications for mentions
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

              // Send email notification
              await base44.functions.invoke('sendNotificationEmail', {
                to: email,
                type: 'mention',
                title: 'You were mentioned in a comment',
                message: `${currentUser?.full_name || currentUser?.email} mentioned you on "${task.title}": "${commentData.content.slice(0, 100)}${commentData.content.length > 100 ? '...' : ''}"`,
                projectId: task.project_id,
                projectName: project?.name,
                fromUserName: currentUser?.full_name || currentUser?.email,
                link: `${window.location.origin}/ProjectDetail?id=${task.project_id}`
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
    }
  });

  const handleCommentChange = (e) => {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    setComment(value);
    setCursorPosition(pos);

    // Check for @ mentions
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
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSubmitComment = async () => {
    if ((!comment.trim() && commentAttachments.length === 0) || !currentUser) return;

    // Extract mentions
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
    setCommentAttachments([]);
  };

  const handleCommentFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCommentFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCommentAttachments(prev => [...prev, {
        name: file.name,
        url: file_url,
        type: file.type
      }]);
    } catch (err) {
      console.error('Failed to upload file:', err);
    }
    setUploadingCommentFile(false);
  };

  const removeCommentAttachment = (index) => {
    setCommentAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const filteredMembers = teamMembers.filter(m => 
    m.name.toLowerCase().includes(mentionSearch)
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    const newAttachment = {
      name: file.name,
      url: file_url,
      type: file.type
    };

    const currentAttachments = task.attachments || [];
    await base44.entities.Task.update(task.id, {
      attachments: [...currentAttachments, newAttachment]
    });
    
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleRemoveAttachment = async (index) => {
    const newAttachments = [...(task.attachments || [])];
    newAttachments.splice(index, 1);
    await base44.entities.Task.update(task.id, { attachments: newAttachments });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleUpdateTask = async (updates) => {
    await base44.entities.Task.update(task.id, updates);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleAssign = async (email) => {
    const member = teamMembers.find(m => m.email === email);
    await handleUpdateTask({
      assigned_to: email,
      assigned_name: member?.name || email
    });
  };

  const handleDueDateSelect = (date) => {
    setSelectedDueDate(date);
  };

  const handleSaveDueDate = async () => {
    setSavingDate(true);
    await handleUpdateTask({
      due_date: selectedDueDate ? format(selectedDueDate, 'yyyy-MM-dd') : ''
    });
    setSavingDate(false);
    setDatePickerOpen(false);
  };

  const handleClearDueDate = async () => {
    setSavingDate(true);
    setSelectedDueDate(null);
    await handleUpdateTask({ due_date: '' });
    setSavingDate(false);
    setDatePickerOpen(false);
  };

  const handleNotesChange = async () => {
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

  const handleStatusToggle = async () => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await handleUpdateTask({ status: newStatus });
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header with checkbox and title */}
        <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
          <button 
            onClick={handleStatusToggle}
            className={cn(
              "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all mt-1",
              task.status === 'completed' 
                ? "bg-emerald-600 border-emerald-600 text-white" 
                : "border-slate-300 hover:border-emerald-500"
            )}
          >
            {task.status === 'completed' && <CheckSquare className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <h2 className={cn(
              "text-xl font-semibold text-slate-900",
              task.status === 'completed' && "line-through text-slate-400"
            )}>
              {task.title}
            </h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit2 className="w-4 h-4 mr-2" />Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Task Properties Grid */}
          <div className="space-y-3">
            {/* Assigned to */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 w-32 text-right">Assigned to</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1 transition-colors">
                    {task.assigned_name ? (
                      <>
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(task.assigned_to))}>
                          {getInitials(task.assigned_name)}
                        </div>
                        <span className="text-sm text-slate-700">{task.assigned_name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400 flex items-center gap-1">
                        <UserPlus className="w-4 h-4" /> Click to assign...
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {teamMembers.map(m => (
                    <DropdownMenuItem key={m.id} onClick={() => handleAssign(m.email)}>
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(m.email))}>
                        {getInitials(m.name)}
                      </div>
                      {m.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Due on */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 w-32 text-right">Due on</span>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1 transition-colors">
                    {task.due_date ? (
                      <>
                        <div className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center text-white">
                          <CalendarIcon className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-slate-700">{(() => {
                          const dateStr = task.due_date.split('T')[0];
                          const [year, month, day] = dateStr.split('-').map(Number);
                          return format(new Date(year, month - 1, day), 'EEE, MMM d');
                        })()}</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400">Set due date...</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDueDate}
                    onSelect={handleDueDateSelect}
                    defaultMonth={selectedDueDate || new Date()}
                  />
                  <div className="p-3 border-t flex items-center justify-between gap-2">
                    {task.due_date && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleClearDueDate}
                        disabled={savingDate}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Clear
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button 
                      size="sm" 
                      onClick={handleSaveDueDate}
                      disabled={savingDate}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {savingDate ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* When done, notify */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 w-32 text-right">When done, notify</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1 transition-colors">
                    {notifyOnComplete.length > 0 ? (
                      <div className="flex -space-x-1">
                        {notifyOnComplete.slice(0, 3).map((email, idx) => {
                          const member = teamMembers.find(m => m.email === email);
                          return (
                            <div key={idx} className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] border-2 border-white", getColorForEmail(email))}>
                              {getInitials(member?.name || email)}
                            </div>
                          );
                        })}
                        {notifyOnComplete.length > 3 && (
                          <span className="text-xs text-slate-500 ml-1">+{notifyOnComplete.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Type names to notify...</span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {teamMembers.map(m => (
                    <DropdownMenuItem 
                      key={m.id} 
                      onClick={() => handleToggleNotify(m.email)}
                    >
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] mr-2", getColorForEmail(m.email))}>
                        {getInitials(m.name)}
                      </div>
                      {m.name}
                      {notifyOnComplete.includes(m.email) && (
                        <CheckSquare className="w-4 h-4 ml-auto text-emerald-600" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Notes */}
            <div className="flex items-start gap-4">
              <span className="text-sm text-slate-500 w-32 text-right pt-2">Notes</span>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesChange}
                placeholder="Add extra details or attach a file..."
                className="flex-1 border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 min-h-[60px] resize-none"
              />
            </div>

            {/* Added by */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 w-32 text-right">Added by</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-700">{task.created_by || 'Unknown'}</span>
                <span className="text-sm text-slate-400">on {format(new Date(task.created_date), 'MMMM d')}</span>
              </div>
            </div>
          </div>

          {/* Separator with avatar */}
          <div className="flex items-center gap-3 py-4 border-t border-slate-200">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm", getColorForEmail(currentUser?.email))}>
              {getInitials(currentUser?.full_name)}
            </div>
          </div>

          {/* AI Assistant */}
          <div className="border-t border-slate-200 pt-4">
            <AITaskAssistant 
              task={task} 
              project={project}
              onSubTasksGenerated={async (subTasks) => {
                for (const st of subTasks) {
                  await base44.entities.Task.create({
                    title: st.title,
                    description: st.description || '',
                    project_id: task.project_id,
                    status: 'todo',
                    priority: 'medium'
                  });
                }
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
              }}
              onPriorityUpdate={async (priority) => {
                await base44.entities.Task.update(task.id, { priority });
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
              }}
            />
          </div>

          {/* Attachments Section */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments ({task.attachments?.length || 0})
              </h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4 mr-1" />}
                Add
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            {task.attachments?.length > 0 ? (
              <div className="space-y-2">
                {task.attachments.map((att, idx) => {
                  const FileIcon = getFileIcon(att.type);
                  return (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg group">
                      <FileIcon className="w-4 h-4 text-slate-500" />
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-indigo-600 hover:underline truncate">
                        {att.name}
                      </a>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveAttachment(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">No attachments</p>
            )}
          </div>

          {/* Comments Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-900 mb-4">Comments ({comments.length})</h4>
            
            <div className="space-y-4 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-medium", getColorForEmail(c.author_email))}>
                    {getInitials(c.author_name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 text-sm">{c.author_name}</span>
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(c.created_date), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg px-3 py-2">
                      {c.content.split(/(@\w+(?:\s\w+)?)/g).map((part, i) => 
                        part.startsWith('@') ? (
                          <span key={i} className="text-indigo-600 font-medium">{part}</span>
                        ) : part
                      )}
                    </p>
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
        <div className="border-t border-slate-200 pt-4 relative">
          <div className="flex gap-2 items-start">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0", getColorForEmail(currentUser?.email))}>
              {getInitials(currentUser?.full_name)}
            </div>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={comment}
                onChange={handleCommentChange}
                placeholder="Add a comment... Type @ to mention someone"
                className="min-h-[60px] resize-none pr-10"
              />
              
              {/* Attach file button inside textarea area */}
              <button
                type="button"
                onClick={() => commentFileInputRef.current?.click()}
                disabled={uploadingCommentFile}
                className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                title="Attach file"
              >
                {uploadingCommentFile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>
              <input
                ref={commentFileInputRef}
                type="file"
                className="hidden"
                onChange={handleCommentFileUpload}
              />
              
              {/* Comment Attachments Preview */}
              {commentAttachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {commentAttachments.map((att, idx) => {
                    const FileIcon = getFileIcon(att.type);
                    return (
                      <div key={idx} className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2 py-1 text-xs">
                        <FileIcon className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-700 truncate max-w-[120px]">{att.name}</span>
                        <button
                          onClick={() => removeCommentAttachment(idx)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Mentions Dropdown */}
              {showMentions && filteredMembers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => insertMention(member)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                    >
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(member.email))}>
                        {getInitials(member.name)}
                      </div>
                      <span className="text-sm text-slate-700">{member.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button 
              onClick={handleSubmitComment} 
              disabled={(!comment.trim() && commentAttachments.length === 0) || addCommentMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, User, Calendar, Clock, AlertTriangle, Edit2, Trash2, Paperclip, X, FileText, Image, Loader2 } from 'lucide-react';
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
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['taskComments', task?.id],
    queryFn: () => base44.entities.TaskComment.filter({ task_id: task?.id }, '-created_date'),
    enabled: !!task?.id && open
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      return base44.entities.TaskComment.create(commentData);
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
    if (!comment.trim() || !currentUser) return;

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
      mentions: mentionedEmails
    });
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

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{task.title}</DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={priorityColors[task.priority]}>
                  {task.priority}
                </Badge>
                <Badge variant="outline" className="bg-slate-100">
                  {statusLabels[task.status]}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Task Details */}
          <div className="space-y-3">
            {task.description && (
              <p className="text-slate-600">{task.description}</p>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm">
              {task.assigned_name && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <User className="w-4 h-4" />
                  <span>{task.assigned_name}</span>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Assistant */}
          <div className="border-t pt-4">
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
          <div className="border-t pt-4">
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
          <div className="border-t pt-4">
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
        <div className="border-t pt-4 relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={comment}
                onChange={handleCommentChange}
                placeholder="Add a comment... Use @ to mention team members"
                className="min-h-[80px] resize-none"
              />
              
              {/* Mentions Dropdown */}
              {showMentions && filteredMembers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => insertMention(member)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600">
                          {member.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm">{member.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button 
              onClick={handleSubmitComment} 
              disabled={!comment.trim() || addCommentMutation.isPending}
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
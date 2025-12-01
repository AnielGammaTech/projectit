import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, User, Calendar, Clock, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function TaskDetailModal({ open, onClose, task, teamMembers = [], onEdit, currentUser }) {
  const [comment, setComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
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

          {/* Comments Section */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-slate-900 mb-4">Comments ({comments.length})</h4>
            
            <div className="space-y-4 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-indigo-600">
                      {c.author_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 text-sm">{c.author_name}</span>
                      <span className="text-xs text-slate-400">
                        {format(new Date(c.created_date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
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
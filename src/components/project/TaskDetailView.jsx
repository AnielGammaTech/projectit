import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Trash2, User, Calendar, UserPlus, Send, MessageCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusConfig = {
  todo: { label: 'To Do', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  review: { label: 'Review', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  high: { label: 'High', color: 'bg-red-100 text-red-700 border-red-200' }
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

export default function TaskDetailView({ 
  task, 
  teamMembers = [], 
  currentUser, 
  onStatusChange, 
  onPriorityChange,
  onAssigneeChange,
  onEdit, 
  onDelete 
}) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  const { data: comments = [] } = useQuery({
    queryKey: ['taskComments', task?.id],
    queryFn: () => api.entities.TaskComment.filter({ task_id: task?.id }, '-created_date'),
    enabled: !!task?.id
  });

  const addCommentMutation = useMutation({
    mutationFn: (data) => api.entities.TaskComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskComments', task?.id] });
      setComment('');
    }
  });

  const handleAssign = async (email) => {
    const member = teamMembers.find(m => m.email === email);
    if (onAssigneeChange) {
      onAssigneeChange(email, member?.name || email);
    } else {
      await api.entities.Task.update(task.id, {
        ...task,
        assigned_to: email,
        assigned_name: member?.name || email
      });
    }
  };

  const handleUnassign = async () => {
    if (onAssigneeChange) {
      onAssigneeChange('', '');
    } else {
      await api.entities.Task.update(task.id, {
        ...task,
        assigned_to: '',
        assigned_name: ''
      });
    }
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
    if (!comment.trim() || !currentUser) return;

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

  const status = statusConfig[task.status] || statusConfig.todo;
  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <div className="flex flex-col h-full -mt-2">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-3">{task.title}</h2>
        
        {/* Inline Editable Badges */}
        <div className="flex flex-wrap gap-2">
          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant="outline" className={cn("cursor-pointer hover:opacity-80 transition-opacity", status.color)}>
                {status.label}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(statusConfig).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={() => onStatusChange(key)}>
                  <Badge className={cn("mr-2", config.color)}>{config.label}</Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant="outline" className={cn("cursor-pointer hover:opacity-80 transition-opacity", priority.color)}>
                {priority.label} priority
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={() => onPriorityChange?.(key)}>
                  <Badge className={cn("mr-2", config.color)}>{config.label}</Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        {/* Description */}
        {task.description && (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-slate-700 text-sm leading-relaxed">{task.description}</p>
          </div>
        )}

        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-4">
          {/* Assignee */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <User className="w-3.5 h-3.5" />
              Assigned to
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {task.assigned_name ? (
                  <button className="flex items-center gap-2 hover:bg-slate-50 rounded-lg p-1.5 -m-1.5 transition-colors w-full">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium", getColorForEmail(task.assigned_to))}>
                      {getInitials(task.assigned_name)}
                    </div>
                    <span className="font-medium text-slate-900">{task.assigned_name}</span>
                  </button>
                ) : (
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all w-full text-slate-500">
                    <UserPlus className="w-4 h-4" />
                    <span className="text-sm">Unassigned</span>
                  </button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {task.assigned_to && (
                  <DropdownMenuItem onClick={handleUnassign} className="text-slate-500">
                    <User className="w-4 h-4 mr-2" />
                    Unassign
                  </DropdownMenuItem>
                )}
                {teamMembers.map((member) => (
                  <DropdownMenuItem key={member.id} onClick={() => handleAssign(member.email)}>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-xs mr-2", getColorForEmail(member.email))}>
                      {getInitials(member.name)}
                    </div>
                    {member.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Due Date */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Due Date
            </span>
            {task.due_date ? (
              <p className="font-medium text-slate-900">{format(parseLocalDate(task.due_date), 'MMM d, yyyy')}</p>
            ) : (
              <p className="text-sm text-slate-400">No due date</p>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-slate-500" />
              Comments
              {comments.length > 0 && (
                <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                  {comments.length}
                </span>
              )}
            </h4>
          </div>
          
          <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {comments.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex gap-3"
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0", getColorForEmail(c.author_email))}>
                    {getInitials(c.author_name)}
                  </div>
                  <div className="flex-1 min-w-0">
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
                </motion.div>
              ))}
            </AnimatePresence>

            {comments.length === 0 && (
              <div className="text-center py-6 text-slate-400">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No comments yet</p>
              </div>
            )}
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/30">
            <div className="flex gap-2 relative">
              <Textarea
                ref={textareaRef}
                value={comment}
                onChange={handleCommentChange}
                placeholder="Add a comment... Use @ to mention"
                className="min-h-[60px] resize-none bg-white text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
              
              {showMentions && filteredMembers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-56 bg-white border rounded-xl shadow-lg max-h-40 overflow-y-auto z-50">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => insertMention(member)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm"
                    >
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-xs", getColorForEmail(member.email))}>
                        {getInitials(member.name)}
                      </div>
                      {member.name}
                    </button>
                  ))}
                </div>
              )}
              
              <Button 
                onClick={handleSubmitComment} 
                disabled={!comment.trim() || addCommentMutation.isPending}
                size="icon"
                className="bg-indigo-600 hover:bg-indigo-700 shrink-0 h-[60px] w-10"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-slate-100 flex justify-between">
        <Button variant="outline" onClick={onEdit} className="gap-2">
          <Edit2 className="w-4 h-4" />
          Edit Task
        </Button>
        <Button variant="outline" onClick={onDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2">
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
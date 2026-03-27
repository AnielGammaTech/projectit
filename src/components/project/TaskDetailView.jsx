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
import UserAvatar from '@/components/UserAvatar';

const statusConfig = {
  todo: { label: 'To Do', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  review: { label: 'Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  high: { label: 'High', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800' }
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
      <div className="pb-4 sm:pb-4 pb-5 border-b border-border">
        <h2 className="text-xl font-bold text-foreground mb-1 sm:mb-3">{task.title}</h2>
        {task.created_date && (
          <p className="text-xs text-muted-foreground mb-3 sm:mb-3">
            Created {formatDistanceToNow(new Date(task.created_date), { addSuffix: true })}
          </p>
        )}

        {/* Desktop inline badges — hidden on mobile */}
        <div className="hidden sm:flex flex-wrap gap-2">
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

      {/* Mobile details card — visible only on mobile */}
      <div className="sm:hidden rounded-xl border border-border bg-muted/30 p-3 space-y-3 my-4">
        {/* Status row */}
        <div className="flex items-center justify-between min-h-[44px]">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant="outline" className={cn("cursor-pointer hover:opacity-80 transition-opacity min-h-[44px] flex items-center", status.color)}>
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
        </div>
        <div className="border-t border-border" />

        {/* Assignee row */}
        <div className="flex items-center justify-between min-h-[44px]">
          <span className="text-xs font-medium text-muted-foreground">Assignee</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {task.assigned_name ? (
                <button className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors min-h-[44px]">
                  <UserAvatar
                    email={task.assigned_to}
                    name={task.assigned_name}
                    avatarUrl={teamMembers.find(m => m.email === task.assigned_to)?.avatar_url}
                    size="sm"
                  />
                  <span className="font-medium text-foreground text-sm">{task.assigned_name}</span>
                </button>
              ) : (
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted transition-all text-muted-foreground min-h-[44px]">
                  <UserPlus className="w-4 h-4" />
                  <span className="text-sm">Unassigned</span>
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {task.assigned_to && (
                <DropdownMenuItem onClick={handleUnassign} className="text-muted-foreground">
                  <User className="w-4 h-4 mr-2" />
                  Unassign
                </DropdownMenuItem>
              )}
              {teamMembers.map((member) => (
                <DropdownMenuItem key={member.id} onClick={() => handleAssign(member.email)}>
                  <UserAvatar email={member.email} name={member.name} avatarUrl={member.avatar_url} size="xs" className="mr-2" />
                  {member.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="border-t border-border" />

        {/* Due Date row */}
        <div className="flex items-center justify-between min-h-[44px]">
          <span className="text-xs font-medium text-muted-foreground">Due Date</span>
          {task.due_date ? (
            <span className="font-medium text-foreground text-sm">{format(parseLocalDate(task.due_date), 'MMM d, yyyy')}</span>
          ) : (
            <span className="text-sm text-muted-foreground">No due date</span>
          )}
        </div>
        <div className="border-t border-border" />

        {/* Priority row */}
        <div className="flex items-center justify-between min-h-[44px]">
          <span className="text-xs font-medium text-muted-foreground">Priority</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant="outline" className={cn("cursor-pointer hover:opacity-80 transition-opacity min-h-[44px] flex items-center", priority.color)}>
                {priority.label}
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

      {/* Content - flex-col on mobile, flex-row on sm+ */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col sm:flex-row gap-5">
        {/* Main content column */}
        <div className="flex-1 space-y-0 sm:space-y-5 min-w-0">
          {/* Description */}
          {task.description && (
            <div className="border-t border-border pt-4 mt-4 sm:border-t-0 sm:pt-0 sm:mt-0">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-foreground text-sm leading-relaxed min-h-[100px] sm:min-h-0">{task.description}</p>
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t border-border pt-4 mt-4 sm:border-t-0 sm:pt-0 sm:mt-0">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activity</h4>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  Comments
                  {comments.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
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
                      <UserAvatar
                        email={c.author_email}
                        name={c.author_name}
                        avatarUrl={teamMembers.find(m => m.email === c.author_email)?.avatar_url}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground text-sm">{c.author_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(c.created_date), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap bg-muted rounded-lg px-3 py-2">
                          {c.content.split(/(@\w+(?:\s\w+)?)/g).map((part, i) =>
                            part.startsWith('@') ? (
                              <span key={i} className="text-indigo-600 dark:text-indigo-400 font-medium">{part}</span>
                            ) : part
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {comments.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No comments yet</p>
                  </div>
                )}
              </div>

              {/* Comment Input — sticky on mobile */}
              <div className="sticky bottom-0 bg-card border-t border-border p-3 -mx-0 sm:relative sm:border-t sm:p-4 sm:m-0 bg-muted/30">
                <div className="flex gap-2 relative">
                  <Textarea
                    ref={textareaRef}
                    value={comment}
                    onChange={handleCommentChange}
                    placeholder="Add a comment... Use @ to mention"
                    className="min-h-[100px] sm:min-h-[60px] resize-none bg-card border border-border text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                  />

                  {showMentions && filteredMembers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1 w-56 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto z-50">
                      {filteredMembers.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => insertMention(member)}
                          className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm text-foreground min-h-[44px]"
                        >
                          <UserAvatar email={member.email} name={member.name} avatarUrl={member.avatar_url} size="sm" />
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
        </div>

        {/* Details sidebar - desktop only, hidden on mobile (mobile card is above) */}
        <div className="hidden sm:block sm:w-56 space-y-3 shrink-0">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</h4>

          {/* Assignee */}
          <div className="bg-card rounded-xl border border-border p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <User className="w-3.5 h-3.5" />
              Assigned to
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {task.assigned_name ? (
                  <button className="flex items-center gap-2 hover:bg-muted rounded-lg p-1.5 -m-1.5 transition-colors w-full">
                    <UserAvatar
                      email={task.assigned_to}
                      name={task.assigned_name}
                      avatarUrl={teamMembers.find(m => m.email === task.assigned_to)?.avatar_url}
                      size="md"
                    />
                    <span className="font-medium text-foreground">{task.assigned_name}</span>
                  </button>
                ) : (
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted transition-all w-full text-muted-foreground">
                    <UserPlus className="w-4 h-4" />
                    <span className="text-sm">Unassigned</span>
                  </button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {task.assigned_to && (
                  <DropdownMenuItem onClick={handleUnassign} className="text-muted-foreground">
                    <User className="w-4 h-4 mr-2" />
                    Unassign
                  </DropdownMenuItem>
                )}
                {teamMembers.map((member) => (
                  <DropdownMenuItem key={member.id} onClick={() => handleAssign(member.email)}>
                    <UserAvatar email={member.email} name={member.name} avatarUrl={member.avatar_url} size="xs" className="mr-2" />
                    {member.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Due Date */}
          <div className="bg-card rounded-xl border border-border p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Due Date
            </span>
            {task.due_date ? (
              <p className="font-medium text-foreground">{format(parseLocalDate(task.due_date), 'MMM d, yyyy')}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No due date</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-border flex justify-between">
        <Button variant="outline" onClick={onEdit} className="gap-2 min-h-[44px] sm:min-h-0">
          <Edit2 className="w-4 h-4" />
          Edit Task
        </Button>
        <Button variant="outline" onClick={onDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-2 min-h-[44px] sm:min-h-0">
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}

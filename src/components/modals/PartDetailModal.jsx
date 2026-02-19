import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Package, Calendar, User, MessageSquare, Send, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

const statusConfig = {
  needed: { label: 'Needed', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  received: { label: 'Received', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  ready_to_install: { label: 'Ready to Install', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  installed: { label: 'Installed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
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

export default function PartDetailModal({ open, onClose, part, teamMembers = [], currentUser, onEdit, onStatusChange }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['partComments', part?.id],
    queryFn: () => base44.entities.TaskComment.filter({ task_id: part?.id }),
    enabled: !!part?.id
  });

  const handleAddComment = async () => {
    if (!newComment.trim() || !part) return;
    setSubmitting(true);
    await base44.entities.TaskComment.create({
      task_id: part.id,
      content: newComment,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name
    });
    setNewComment('');
    refetchComments();
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId) => {
    await base44.entities.TaskComment.delete(commentId);
    refetchComments();
  };

  if (!part) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-lg">{part.name}</DialogTitle>
                {part.part_number && (
                  <p className="text-sm text-slate-500">#{part.part_number}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit?.(part)}>
              <Edit2 className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status & Details */}
          <div className="flex flex-wrap gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge variant="outline" className={cn("cursor-pointer hover:opacity-80", statusConfig[part.status]?.color)}>
                  {statusConfig[part.status]?.label || part.status}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => onStatusChange?.(part, key)}>
                    <Badge className={cn("mr-2", config.color)}>{config.label}</Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {part.quantity > 1 && (
              <Badge variant="outline">Qty: {part.quantity}</Badge>
            )}
            {part.unit_cost > 0 && (
              <Badge variant="outline">${(part.unit_cost * (part.quantity || 1)).toLocaleString()}</Badge>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {part.supplier && (
              <div>
                <p className="text-slate-500">Supplier</p>
                <p className="font-medium">{part.supplier}</p>
              </div>
            )}
            {part.assigned_name && (
              <div>
                <p className="text-slate-500">Assigned To</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-xs", getColorForEmail(part.assigned_to))}>
                    {getInitials(part.assigned_name)}
                  </div>
                  <span className="font-medium">{part.assigned_name}</span>
                </div>
              </div>
            )}
            {part.installer_name && (
              <div>
                <p className="text-slate-500">Installer</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-xs", getColorForEmail(part.installer_email))}>
                    {getInitials(part.installer_name)}
                  </div>
                  <span className="font-medium">{part.installer_name}</span>
                </div>
              </div>
            )}
            {part.est_delivery_date && (
              <div>
                <p className="text-slate-500">Est. Delivery</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {format(parseLocalDate(part.est_delivery_date), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            {part.due_date && (
              <div>
                <p className="text-slate-500">Due Date</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {format(parseLocalDate(part.due_date), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            {part.received_date && (
              <div>
                <p className="text-slate-500">Received</p>
                <p className="font-medium">{format(parseLocalDate(part.received_date), 'MMM d, yyyy')}</p>
              </div>
            )}
            {part.installed_date && (
              <div>
                <p className="text-slate-500">Installed</p>
                <p className="font-medium">{format(parseLocalDate(part.installed_date), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {part.notes && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Notes</p>
              <p className="text-sm bg-slate-50 rounded-lg p-3">{part.notes}</p>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h4 className="font-medium text-slate-900">Comments</h4>
              <span className="text-xs text-slate-400">({comments.length})</span>
            </div>

            {/* Comment Input */}
            <div className="flex gap-2 mb-4">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0", getColorForEmail(currentUser?.email))}>
                {getInitials(currentUser?.full_name)}
              </div>
              <div className="flex-1 flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                />
                <Button 
                  size="icon" 
                  onClick={handleAddComment} 
                  disabled={!newComment.trim() || submitting}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 group">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0", getColorForEmail(comment.author_email))}>
                      {getInitials(comment.author_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                        </span>
                        {comment.author_email === currentUser?.email && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No comments yet</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
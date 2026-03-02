import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { formatDistanceToNow, format } from 'date-fns';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Download, ChevronLeft, ChevronRight, Send,
  File, Trash2, MessageSquare, Loader2, ExternalLink
} from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatFileSize, getFileIcon } from '@/lib/fileConstants';

function FilePreviewContent({ file, onNavigate, hasPrev, hasNext, currentUser, teamMembers, comments, addCommentMutation, deleteCommentMutation }) {
  const [comment, setComment] = useState('');

  const handleSubmitComment = () => {
    if (!comment.trim() || !currentUser) return;
    addCommentMutation.mutate({
      file_id: file.id,
      content: comment.trim(),
      author_email: currentUser.email,
      author_name: currentUser.full_name || currentUser.email,
    }, {
      onSuccess: () => setComment(''),
    });
  };

  const isImage = file.file_type?.includes('image');
  const isPdf = file.file_type?.includes('pdf');
  const FileIcon = getFileIcon(file.file_type);

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex-shrink-0">
            <FileIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{file.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {file.uploaded_by_name} · {file.created_date && format(new Date(file.created_date), 'MMM d, yyyy')}
              {file.size ? ` · ${formatFileSize(file.size)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasPrev} onClick={() => onNavigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasNext} onClick={() => onNavigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={file.file_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={file.file_url} download>
              <Download className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Preview Area */}
        <div className="p-4">
          {isImage && (
            <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center p-2">
              <img
                src={file.file_url}
                alt={file.name}
                className="max-w-full max-h-[50vh] object-contain rounded-lg"
              />
            </div>
          )}
          {isPdf && (
            <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50">
              <iframe
                src={file.file_url}
                title={file.name}
                className="w-full h-[60vh] border-0 rounded-lg"
              />
            </div>
          )}
          {!isImage && !isPdf && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-10 text-center">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-700/50 inline-block mb-4 shadow-sm">
                <FileIcon className="w-12 h-12 text-slate-300 dark:text-slate-500" />
              </div>
              <h4 className="font-medium text-slate-700 dark:text-slate-200 mb-1">{file.name}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {formatFileSize(file.size)}{file.file_type ? ` · ${file.file_type}` : ''}
              </p>
              <Button asChild className="bg-teal-600 hover:bg-teal-700">
                <a href={file.file_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Comments ({comments.length})
            </span>
          </div>

          {/* Comments list */}
          <div className="space-y-4 mb-4">
            {comments.map((c) => {
              const member = teamMembers.find(m => m.email === c.author_email);
              return (
                <div key={c.id} className="flex gap-3 group">
                  <UserAvatar
                    email={c.author_email}
                    name={c.author_name}
                    avatarUrl={member?.avatar_url}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">{c.author_name}</span>
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(c.created_date), { addSuffix: true })}
                      </span>
                      {c.author_email === currentUser?.email && (
                        <button
                          onClick={() => deleteCommentMutation.mutate(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              );
            })}
            {comments.length === 0 && (
              <div className="text-center py-6">
                <MessageSquare className="w-6 h-6 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No comments yet. Be the first to leave a note.</p>
              </div>
            )}
          </div>

          {/* Comment Input */}
          <div className="flex gap-3 items-end">
            <UserAvatar
              email={currentUser?.email}
              name={currentUser?.full_name}
              avatarUrl={currentUser?.avatar_url}
              size="md"
              className="mb-1"
            />
            <div className="flex-1">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[48px] resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleSubmitComment}
              disabled={!comment.trim() || addCommentMutation.isPending}
              size="icon"
              className="h-10 w-10 bg-teal-600 hover:bg-teal-700 rounded-xl flex-shrink-0 mb-0.5"
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function FilePreviewPanel({
  file,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentUser,
  teamMembers = [],
}) {
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['fileComments', file?.id],
    queryFn: () => api.entities.FileComment.filter({ file_id: file?.id }, '-created_date'),
    enabled: !!file?.id,
  });

  const addCommentMutation = useMutation({
    mutationFn: (data) => api.entities.FileComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileComments', file?.id] });
      queryClient.invalidateQueries({ queryKey: ['allFileComments'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => api.entities.FileComment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileComments', file?.id] });
      queryClient.invalidateQueries({ queryKey: ['allFileComments'] });
      toast.success('Comment deleted');
    },
  });

  return (
    <Sheet open={!!file} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden"
      >
        <SheetTitle className="sr-only">{file?.name || 'File Preview'}</SheetTitle>
        <SheetDescription className="sr-only">Preview and comment on this file</SheetDescription>
        {file && (
          <FilePreviewContent
            file={file}
            onNavigate={onNavigate}
            hasPrev={hasPrev}
            hasNext={hasNext}
            currentUser={currentUser}
            teamMembers={teamMembers}
            comments={comments}
            addCommentMutation={addCommentMutation}
            deleteCommentMutation={deleteCommentMutation}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

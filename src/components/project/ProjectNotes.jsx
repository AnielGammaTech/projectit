import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, StickyNote, Bell, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const typeConfig = {
  note: { icon: StickyNote, color: 'bg-amber-100 text-amber-700', label: 'Note' },
  message: { icon: MessageSquare, color: 'bg-blue-100 text-blue-700', label: 'Message' },
  update: { icon: Bell, color: 'bg-emerald-100 text-emerald-700', label: 'Update' }
};

export default function ProjectNotes({ projectId, currentUser }) {
  const queryClient = useQueryClient();
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('note');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['projectNotes', projectId],
    queryFn: () => api.entities.ProjectNote.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId
  });

  const addNoteMutation = useMutation({
    mutationFn: (data) => api.entities.ProjectNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectNotes', projectId] });
      setNewContent('');
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => api.entities.ProjectNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectNotes', projectId] })
  });

  const handleSubmit = () => {
    if (!newContent.trim()) return;
    addNoteMutation.mutate({
      project_id: projectId,
      content: newContent,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name || currentUser?.email,
      type: newType
    });
  };

  return (
    <div className="space-y-4">
      {/* Add new note */}
      <div className="bg-slate-50 dark:bg-[#151d2b] rounded-xl p-4">
        <div className="flex gap-2 mb-3">
          {Object.entries(typeConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setNewType(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  newType === key ? config.color : "bg-white dark:bg-[#1e2a3a] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label}
              </button>
            );
          })}
        </div>
        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder={`Add a ${newType}...`}
          className="bg-white dark:bg-[#1e2a3a] min-h-[80px] mb-3"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!newContent.trim() || addNoteMutation.isPending}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Post
          </Button>
        </div>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No notes yet. Add one above!</p>
          </div>
        ) : (
          <AnimatePresence>
            {notes.map((note) => {
              const config = typeConfig[note.type] || typeConfig.note;
              const Icon = config.icon;
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white dark:bg-[#1e2a3a] rounded-xl border border-slate-100 dark:border-slate-700/50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", config.color.split(' ')[0])}>
                      <Icon className={cn("w-4 h-4", config.color.split(' ')[1])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{note.author_name}</span>
                          <Badge variant="outline" className={cn("text-xs", config.color)}>
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(note.created_date), { addSuffix: true })}
                          </span>
                          {note.author_email === currentUser?.email && (
                            <button
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
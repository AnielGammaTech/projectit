import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, StickyNote, Bell, Send, Trash2, CalendarCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import MeetingUpdateModal from './MeetingUpdateModal';

const typeConfig = {
  note: { icon: StickyNote, color: 'bg-slate-100 text-slate-700', label: 'Note' },
  message: { icon: MessageSquare, color: 'bg-blue-100 text-blue-700', label: 'Message' },
  update: { icon: Bell, color: 'bg-amber-100 text-amber-700', label: 'Update' }
};

export default function NotesViewModal({ open, onClose, projectId, currentUser, teamMembers = [], onTasksCreated }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('note');
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState(new Set());

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['projectNotes', projectId],
    queryFn: () => base44.entities.ProjectNote.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId && open
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectNotes', projectId] });
      setNewContent('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectNotes', projectId] })
  });

  const handleAdd = () => {
    if (!newContent.trim()) return;
    addMutation.mutate({
      project_id: projectId,
      title: newTitle.trim() || undefined,
      content: newContent,
      type: newType,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name || currentUser?.email
    });
    setNewTitle('');
  };

  const toggleNote = (noteId) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };



  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Notes & Messages</DialogTitle>
        </DialogHeader>

        {/* Add New */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
          <div className="flex gap-2 mb-3 flex-wrap">
            {Object.entries(typeConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setNewType(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    newType === key ? config.color : "bg-white text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </button>
              );
            })}
            <button
              onClick={() => setShowMeetingModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-indigo-100 text-indigo-700 hover:bg-indigo-200 ml-auto"
            >
              <CalendarCheck className="w-4 h-4" />
              Meeting Update
            </button>
          </div>
          <div className="space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (optional)"
              className="bg-white"
            />
            <div className="flex gap-2">
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={`Write a ${newType}...`}
                className="min-h-[60px] bg-white"
              />
              <Button
                onClick={handleAdd}
                disabled={!newContent.trim() || addMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>No notes or messages yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {notes.map((note) => {
                const config = typeConfig[note.type] || typeConfig.note;
                const Icon = config.icon;
                const isOwn = note.author_email === currentUser?.email;
                const isExpanded = expandedNotes.has(note.id);
                const hasTitle = note.title?.trim();

                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Header - Always visible */}
                    <div 
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer",
                        hasTitle && "border-b border-slate-100"
                      )}
                      onClick={() => hasTitle && toggleNote(note.id)}
                    >
                      <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {hasTitle ? (
                            <>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                              <span className="font-semibold text-slate-900">{note.title}</span>
                            </>
                          ) : (
                            <span className="text-slate-700 line-clamp-1">{note.content}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{note.author_name}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-400">
                            {format(new Date(note.created_date), 'MMM d, h:mm a')}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                      {isOwn && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(note.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Content - Expandable if has title */}
                    {hasTitle && (
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4"
                          >
                            <p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed pt-3">
                              {note.content}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>

      <MeetingUpdateModal
        open={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        projectId={projectId}
        currentUser={currentUser}
        teamMembers={teamMembers}
        onNoteSaved={() => queryClient.invalidateQueries({ queryKey: ['projectNotes', projectId] })}
        onTasksCreated={onTasksCreated}
      />
    </Dialog>
  );
}
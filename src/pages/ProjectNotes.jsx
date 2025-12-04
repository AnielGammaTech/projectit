import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  MessageSquare, 
  StickyNote,
  Bell,
  Plus, 
  Search,
  Trash2,
  Send,
  CalendarCheck,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import MeetingUpdateModal from '@/components/modals/MeetingUpdateModal';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';

const typeConfig = {
  note: { icon: StickyNote, color: 'bg-slate-100 text-slate-700', label: 'Note' },
  message: { icon: MessageSquare, color: 'bg-blue-100 text-blue-700', label: 'Message' },
  update: { icon: Bell, color: 'bg-amber-100 text-amber-700', label: 'Update' }
};

export default function ProjectNotes() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('note');
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['projectNotes', projectId],
    queryFn: () => base44.entities.ProjectNote.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectNotes', projectId] });
      setNewContent('');
      setNewTitle('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectNotes', projectId] })
  });

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || note.type === typeFilter;
    return matchesSearch && matchesType;
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <ProjectNavHeader project={project} currentPage="ProjectNotes" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-600 shadow-lg shadow-violet-200">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Notes & Messages</h1>
              <p className="text-slate-500">{notes.length} entries</p>
            </div>
          </div>
          <Button onClick={() => setShowMeetingModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <CalendarCheck className="w-4 h-4 mr-2" />
            Meeting Update
          </Button>
        </div>

        {/* Add New */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
          <div className="flex gap-2 mb-3 flex-wrap">
            {Object.entries(typeConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setNewType(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    newType === key ? config.color : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (optional)"
            />
            <div className="flex gap-2">
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={`Write a ${newType}...`}
                className="min-h-[80px]"
              />
              <Button
                onClick={handleAdd}
                disabled={!newContent.trim() || addMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['all', ...Object.keys(typeConfig)].map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  typeFilter === type 
                    ? "bg-violet-100 text-violet-700" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {type === 'all' ? 'All' : typeConfig[type].label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No notes found</h3>
              <p className="text-slate-500">Start adding notes and messages to this project</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotes.map((note, idx) => {
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
                    transition={{ delay: idx * 0.02 }}
                    className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div 
                      className={cn(
                        "flex items-center gap-3 p-4",
                        hasTitle && "cursor-pointer",
                        hasTitle && !isExpanded && "border-b-0"
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
                            <span className="text-slate-700">{note.content}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{note.author_name}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-400">
                            {format(new Date(note.created_date), 'MMM d, yyyy h:mm a')}
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

                    {/* Content - Expandable */}
                    {hasTitle && (
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-100"
                          >
                            <div className="px-4 py-4">
                              <p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">
                                {note.content}
                              </p>
                            </div>
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
      </div>

      <MeetingUpdateModal
        open={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        projectId={projectId}
        currentUser={currentUser}
        teamMembers={teamMembers}
        onNoteSaved={() => queryClient.invalidateQueries({ queryKey: ['projectNotes', projectId] })}
        onTasksCreated={() => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })}
      />
    </div>
  );
}
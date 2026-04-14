import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ListTodo, Package, MessageSquare, FileStack, Plus, Trash2,
  CheckCircle2, X, StickyNote, Bell, Save, FolderKanban, Layers,
  Check, ChevronDown, ChevronRight, Search, Edit2, MoreHorizontal,
  GripVertical, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Design constants (matching real project pages) ---

const groupColorMap = {
  slate: { bg: 'bg-slate-500', accent: 'border-l-slate-400', dot: 'bg-slate-400', progress: 'bg-slate-400' },
  red: { bg: 'bg-red-500', accent: 'border-l-red-500', dot: 'bg-red-500', progress: 'bg-gradient-to-r from-red-500 to-rose-400' },
  amber: { bg: 'bg-amber-500', accent: 'border-l-amber-500', dot: 'bg-amber-500', progress: 'bg-gradient-to-r from-amber-500 to-orange-400' },
  emerald: { bg: 'bg-emerald-500', accent: 'border-l-emerald-500', dot: 'bg-emerald-500', progress: 'bg-gradient-to-r from-emerald-500 to-teal-400' },
  blue: { bg: 'bg-blue-500', accent: 'border-l-blue-500', dot: 'bg-blue-500', progress: 'bg-gradient-to-r from-blue-500 to-indigo-400' },
  violet: { bg: 'bg-violet-500', accent: 'border-l-violet-500', dot: 'bg-violet-500', progress: 'bg-gradient-to-r from-violet-500 to-purple-400' },
  pink: { bg: 'bg-pink-500', accent: 'border-l-pink-500', dot: 'bg-pink-500', progress: 'bg-gradient-to-r from-pink-500 to-rose-400' }
};

const priorityConfig = {
  high: { label: 'High', color: 'bg-red-100 text-red-600' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  low: { label: 'Low', color: 'bg-slate-100 text-slate-500' },
};

const typeConfig = {
  note: { icon: StickyNote, color: 'bg-slate-100 text-slate-700', label: 'Note' },
  message: { icon: MessageSquare, color: 'bg-blue-100 text-blue-700', label: 'Message' },
  update: { icon: Bell, color: 'bg-amber-100 text-amber-700', label: 'Update' }
};

export default function TemplateEditor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const templateId = searchParams.get('id');
  const activeView = searchParams.get('view') || 'overview';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState([]);
  const [parts, setParts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);

  // Load existing template
  const { data: existingTemplate, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const all = await api.entities.ProjectTemplate.list();
      return all.find(t => t.id === templateId) || null;
    },
    enabled: !!templateId
  });

  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name || '');
      setDescription(existingTemplate.description || '');
      setTasks(existingTemplate.default_tasks?.map((t, i) => ({ ...t, _id: `t_${i}` })) || []);
      setParts(existingTemplate.default_parts?.map((p, i) => ({ ...p, _id: `p_${i}` })) || []);
      setMessages(existingTemplate.default_messages?.map((m, i) => ({ ...m, _id: `m_${i}` })) || []);
      setGroups(existingTemplate.default_groups?.map((g, i) => ({ ...g, _id: g._template_id || `g_${i}` })) || []);
    }
  }, [existingTemplate]);

  const setView = (view) => {
    const params = new URLSearchParams(searchParams);
    if (view === 'overview') {
      params.delete('view');
    } else {
      params.set('view', view);
    }
    setSearchParams(params);
  };

  // --- Save ---
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const templateData = {
        name: name.trim(),
        description: description.trim(),
        template_type: 'project',
        default_tasks: tasks.map(({ _id, ...rest }) => rest),
        default_parts: parts.map(({ _id, ...rest }) => rest),
        default_messages: messages.map(({ _id, ...rest }) => rest),
        default_groups: groups.map(({ _id, ...rest }) => ({ ...rest, _template_id: _id }))
      };

      if (templateId && existingTemplate) {
        await api.entities.ProjectTemplate.update(templateId, templateData);
      } else {
        await api.entities.ProjectTemplate.create(templateData);
      }
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      navigate(createPageUrl('Templates'));
    } catch (err) {
      toast.error('Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background  flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background ">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6">

        {/* Back link */}
        <button
          onClick={() => activeView !== 'overview' ? setView('overview') : navigate(createPageUrl('Templates'))}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {activeView !== 'overview' ? 'Back to Template' : 'Back to Templates'}
        </button>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-slate-100 dark:border-border shadow-sm p-4 mb-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">Template</Badge>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name..."
                  className="text-lg font-bold border-0 bg-transparent px-0 h-auto focus-visible:ring-0 placeholder:text-slate-300 max-w-md"
                />
              </div>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description..."
                className="text-sm text-slate-500 border-0 bg-transparent px-0 h-auto mt-1 focus-visible:ring-0 placeholder:text-slate-300 max-w-lg"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" onClick={() => navigate(createPageUrl('Templates'))}>Cancel</Button>
              <Button onClick={handleSave} disabled={!name.trim() || saving} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : (templateId ? 'Update Template' : 'Save Template')}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-slate-500">
            <span className="flex items-center gap-1"><ListTodo className="w-3.5 h-3.5 text-blue-500" /> {tasks.length} tasks</span>
            <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-emerald-500" /> {parts.length} parts</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-violet-500" /> {messages.length} messages</span>
            <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-amber-500" /> {groups.length} groups</span>
          </div>
        </motion.div>

        {/* ── View content ── */}
        {activeView === 'overview' && (
          <OverviewView
            tasks={tasks} parts={parts} messages={messages} groups={groups}
            onOpenTasks={() => setView('tasks')}
            onOpenMessages={() => setView('messages')}
            onOpenParts={() => setView('parts')}
          />
        )}
        {activeView === 'tasks' && (
          <TasksView
            tasks={tasks} setTasks={setTasks}
            groups={groups} setGroups={setGroups}
          />
        )}
        {activeView === 'messages' && (
          <MessagesView messages={messages} setMessages={setMessages} />
        )}
        {activeView === 'parts' && (
          <PartsView parts={parts} setParts={setParts} />
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════
// OVERVIEW VIEW — Project-style cards grid
// ═══════════════════════════════════════════
function OverviewView({ tasks, parts, messages, groups, onOpenTasks, onOpenMessages, onOpenParts }) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Tasks Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        onClick={onOpenTasks}
        className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 min-h-[220px] max-h-[220px] border border-blue-100/60 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />
        <div className="p-3.5 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200/50">
                <ListTodo className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm leading-none">Tasks</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-500 font-medium">{tasks.length} tasks</span>
                  {tasks.length > 0 && (
                    <div className="w-12 h-1.5 rounded-full bg-blue-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${taskProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-7 w-7 rounded-lg flex items-center justify-center shadow-md shadow-blue-200/40">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
        <div className="px-3 pb-2 space-y-0.5">
          {tasks.filter(t => t.status !== 'completed').slice(0, 5).map(t => {
            const group = t.group_id ? groups.find(g => g._id === t.group_id) : null;
            return (
              <div key={t._id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                <span className="text-xs text-slate-700 font-medium truncate flex-1 min-w-0">{t.title}</span>
                {t.priority && t.priority !== 'none' && (
                  <span className={cn("text-[8px] px-1 py-0 rounded font-semibold uppercase shrink-0", priorityConfig[t.priority]?.color)}>{t.priority}</span>
                )}
              </div>
            );
          })}
          {tasks.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No tasks yet</p>}
        </div>
      </motion.div>

      {/* Messages Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        onClick={onOpenMessages}
        className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 min-h-[220px] max-h-[220px] border border-violet-100/60 bg-gradient-to-br from-white via-violet-50/30 to-purple-50/40 hover:shadow-lg hover:shadow-violet-100/50 hover:-translate-y-0.5"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400" />
        <div className="p-3.5 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200/50">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm leading-none">Messages</h3>
                <span className="text-[11px] text-slate-500 font-medium">{messages.length} total</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-3 pb-3 space-y-0.5">
          {messages.slice(0, 5).map(msg => {
            const cfg = typeConfig[msg.type] || typeConfig.note;
            return (
              <div key={msg._id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg">
                <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0", cfg.color)}>{cfg.label}</span>
                <p className="text-xs text-slate-600 truncate flex-1 min-w-0">{msg.title || msg.content}</p>
              </div>
            );
          })}
          {messages.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No messages yet</p>}
        </div>
      </motion.div>

      {/* Parts Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        onClick={onOpenParts}
        className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 min-h-[220px] max-h-[220px] border border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 hover:shadow-lg hover:shadow-emerald-100/50 hover:-translate-y-0.5"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400" />
        <div className="p-3.5 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/50">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm leading-none">Parts</h3>
                <span className="text-[11px] text-slate-500 font-medium">{parts.length} parts</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-7 w-7 rounded-lg flex items-center justify-center shadow-md shadow-emerald-200/40">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
        <div className="px-3 pb-2 space-y-0.5">
          {parts.slice(0, 5).map(p => (
            <div key={p._id} className="flex items-center gap-2 px-2 py-1 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs text-slate-700 font-medium truncate flex-1">{p.name}</span>
              {p.part_number && <span className="text-[10px] text-slate-400">{p.part_number}</span>}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">x{p.quantity}</Badge>
            </div>
          ))}
          {parts.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No parts yet</p>}
        </div>
      </motion.div>

      {/* Files Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="relative rounded-2xl overflow-hidden min-h-[220px] max-h-[220px] border border-amber-100/60 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400" />
        <div className="p-3.5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-200/50">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-none">Files</h3>
              <span className="text-[11px] text-slate-500 font-medium">0 files</span>
            </div>
          </div>
        </div>
        <div className="px-3 pb-3">
          <p className="text-xs text-slate-400 text-center py-6">Files are added after the project is created</p>
        </div>
      </motion.div>
    </div>
  );
}


// ═══════════════════════════════════════════
// TASKS VIEW — Full task management like ProjectTasks
// ═══════════════════════════════════════════
function TasksView({ tasks, setTasks, groups, setGroups }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: '', color: 'slate' });
  const [inlineGroupId, setInlineGroupId] = useState(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [editingTask, setEditingTask] = useState(null);

  let idCounter = Date.now();
  const genId = () => `t_${idCounter++}`;

  const filteredTasks = tasks.filter(t =>
    !searchQuery || t.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleGroup = (gid) => {
    const s = new Set(collapsedGroups);
    s.has(gid) ? s.delete(gid) : s.add(gid);
    setCollapsedGroups(s);
  };

  // Group CRUD
  const openGroupModal = (group = null) => {
    setEditingGroup(group);
    setGroupForm(group ? { name: group.name, color: group.color } : { name: '', color: 'slate' });
    setShowGroupModal(true);
  };

  const saveGroup = () => {
    if (!groupForm.name.trim()) return;
    if (editingGroup) {
      setGroups(prev => prev.map(g => g._id === editingGroup._id ? { ...g, ...groupForm } : g));
    } else {
      setGroups(prev => [...prev, { _id: `grp_${Date.now()}`, ...groupForm }]);
    }
    setShowGroupModal(false);
  };

  const deleteGroup = (gid) => {
    setGroups(prev => prev.filter(g => g._id !== gid));
    setTasks(prev => prev.map(t => t.group_id === gid ? { ...t, group_id: '' } : t));
  };

  // Task CRUD
  const addTask = (groupId) => {
    if (!inlineTitle.trim()) return;
    setTasks(prev => [...prev, { _id: genId(), title: inlineTitle.trim(), description: '', priority: 'medium', group_id: groupId || '', status: 'todo' }]);
    setInlineTitle('');
  };

  const updateTask = (taskId, updates) => {
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, ...updates } : t));
    setEditingTask(null);
  };

  const deleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t._id !== taskId));
  };

  const ungroupedTasks = filteredTasks.filter(t => !t.group_id);
  const getGroupTasks = (gid) => filteredTasks.filter(t => t.group_id === gid);

  // Inline task creator
  const InlineCreator = ({ groupId }) => {
    const isActive = inlineGroupId === groupId;
    if (!isActive) {
      return (
        <button
          onClick={() => { setInlineGroupId(groupId); setInlineTitle(''); }}
          className="flex items-center gap-2 text-sm text-primary hover:text-foreground py-2 pl-1 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add a task
        </button>
      );
    }
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-blue-50/30 p-3">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <Input
            value={inlineTitle}
            onChange={(e) => setInlineTitle(e.target.value)}
            placeholder="Task name..."
            className="flex-1 h-9 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm font-medium"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTask(groupId);
              if (e.key === 'Escape') setInlineGroupId(null);
            }}
          />
          <span className="text-xs text-slate-400 hidden sm:inline">Press Enter</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInlineGroupId(null)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  // Task row
  const TaskRow = ({ task }) => {
    const pri = priorityConfig[task.priority] || priorityConfig.medium;
    return (
      <div
        className="group flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200/80 hover:shadow-sm hover:border-slate-300 hover:bg-slate-50/50 transition-all cursor-pointer"
        onClick={() => setEditingTask(task)}
      >
        <div className="w-[17px] h-[17px] rounded-full border-2 border-slate-300 shrink-0" />
        <span className="flex-1 font-medium text-[13px] truncate min-w-0">{task.title}</span>
        {task.description && <MessageSquare className="w-3 h-3 text-slate-300 shrink-0" />}
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase shrink-0", pri.color)}>{task.priority}</span>
        <button
          onClick={(e) => { e.stopPropagation(); deleteTask(task._id); }}
          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  // Group section
  const GroupSection = ({ group }) => {
    const gc = groupColorMap[group.color] || groupColorMap.slate;
    const groupTasks = getGroupTasks(group._id);
    const isCollapsed = collapsedGroups.has(group._id);

    return (
      <div className={cn("rounded-xl border border-slate-200 overflow-hidden", `border-l-4 ${gc.accent}`)}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/50">
          <button onClick={() => toggleGroup(group._id)} className="p-0.5">
            {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <div className={cn("w-3 h-3 rounded-full", gc.dot)} />
          <span className="font-semibold text-sm text-slate-700 flex-1">{group.name}</span>
          <span className="text-xs text-slate-400">{groupTasks.length} tasks</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-slate-200 transition-colors">
                <MoreHorizontal className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openGroupModal(group)}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit Group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteGroup(group._id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!isCollapsed && (
          <div className="px-4 py-2 space-y-1.5">
            {groupTasks.map(t => <TaskRow key={t._id} task={t} />)}
            <InlineCreator groupId={group._id} />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Stats bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-slate-900">Tasks</h2>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>{tasks.length} total</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-9 h-9 w-52"
              />
            </div>
            <Button variant="outline" onClick={() => openGroupModal()} className="h-9 gap-1.5">
              <Layers className="w-4 h-4" /> New Group
            </Button>
            <Button onClick={() => { setInlineGroupId('__ungrouped__'); setInlineTitle(''); }} className="h-9 bg-primary hover:bg-primary/80 gap-1.5">
              <Plus className="w-4 h-4" /> Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Task groups */}
      <div className="space-y-3">
        {groups.map(g => <GroupSection key={g._id} group={g} />)}

        {/* Ungrouped */}
        {(ungroupedTasks.length > 0 || groups.length === 0 || inlineGroupId === '__ungrouped__') && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {groups.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/50">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="font-semibold text-sm text-slate-500 flex-1">Ungrouped</span>
                <span className="text-xs text-slate-400">{ungroupedTasks.length} tasks</span>
              </div>
            )}
            <div className="px-4 py-2 space-y-1.5">
              {ungroupedTasks.map(t => <TaskRow key={t._id} task={t} />)}
              <InlineCreator groupId="" />
            </div>
          </div>
        )}
      </div>

      {/* Group Modal */}
      <Dialog open={showGroupModal} onOpenChange={() => setShowGroupModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'New Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Group Name</label>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Phase 1"
                className="mt-1.5"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveGroup()}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 mt-2">
                {Object.entries(groupColorMap).map(([color, cfg]) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setGroupForm(p => ({ ...p, color }))}
                    className={cn("w-8 h-8 rounded-full transition-all", cfg.bg, groupForm.color === color ? "ring-2 ring-offset-2 ring-indigo-500" : "")}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowGroupModal(false)}>Cancel</Button>
              <Button onClick={saveGroup} disabled={!groupForm.name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Edit Modal */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskEditForm
              task={editingTask}
              groups={groups}
              onSave={(updates) => updateTask(editingTask._id, updates)}
              onCancel={() => setEditingTask(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskEditForm({ task, groups, onSave, onCancel }) {
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [groupId, setGroupId] = useState(task.group_id || '');

  return (
    <div className="space-y-4 mt-4">
      <div>
        <label className="text-sm font-medium">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" autoFocus />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 h-20" placeholder="Add details..." />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">Group</label>
          <Select value={groupId || '__none__'} onValueChange={(v) => setGroupId(v === '__none__' ? '' : v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No group</SelectItem>
              {groups.map(g => (
                <SelectItem key={g._id} value={g._id}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", groupColorMap[g.color]?.dot || 'bg-slate-400')} />
                    {g.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave({ title, description, priority, group_id: groupId })} disabled={!title.trim()} className="bg-indigo-600 hover:bg-indigo-700">
          Save
        </Button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════
// MESSAGES VIEW — Like ProjectNotes
// ═══════════════════════════════════════════
function MessagesView({ messages, setMessages }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('note');
  const [expandedNotes, setExpandedNotes] = useState(new Set());

  let idCounter = Date.now();
  const genId = () => `m_${idCounter++}`;

  const filteredMessages = messages.filter(m => {
    const matchesSearch = !searchQuery ||
      m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleAdd = () => {
    if (!newContent.trim()) return;
    setMessages(prev => [...prev, {
      _id: genId(),
      title: newTitle.trim(),
      content: newContent.trim(),
      type: newType
    }]);
    setNewTitle('');
    setNewContent('');
  };

  const handleDelete = (msgId) => {
    setMessages(prev => prev.filter(m => m._id !== msgId));
  };

  const toggleExpand = (id) => {
    const s = new Set(expandedNotes);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedNotes(s);
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-500" />
            <h2 className="text-lg font-bold text-slate-900">Messages</h2>
            <span className="text-sm text-slate-500">{messages.length} total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9 h-9 w-52" />
            </div>
            <div className="flex gap-1 ml-2">
              {['all', 'note', 'message', 'update'].map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                    typeFilter === type
                      ? type === 'all' ? 'bg-slate-800 text-white' : (typeConfig[type]?.color || '') + ' ring-1 ring-offset-1 ring-indigo-300'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  )}
                >
                  {type === 'all' ? 'All' : typeConfig[type]?.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add message form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-slate-700">New message</span>
          <div className="flex gap-1 ml-auto">
            {Object.entries(typeConfig).map(([type, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() => setNewType(type)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all",
                    newType === type ? cfg.color + " ring-1 ring-offset-1 ring-indigo-300" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  )}
                >
                  <Icon className="w-3 h-3" /> {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title (optional)" className="mb-2 h-9" />
        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Write your message..."
          className="h-24 resize-none mb-3"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(); }}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Ctrl+Enter to submit</span>
          <Button onClick={handleAdd} disabled={!newContent.trim()} className="bg-violet-500 hover:bg-violet-600 gap-1.5">
            <Plus className="w-4 h-4" /> Add Message
          </Button>
        </div>
      </div>

      {/* Message list */}
      <div className="space-y-2">
        {filteredMessages.map(msg => {
          const cfg = typeConfig[msg.type] || typeConfig.note;
          const Icon = cfg.icon;
          const isExpanded = expandedNotes.has(msg._id);
          return (
            <motion.div
              key={msg._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 group"
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", cfg.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", cfg.color)}>{cfg.label}</span>
                    {msg.title && <h4 className="font-semibold text-sm text-slate-800">{msg.title}</h4>}
                  </div>
                  <p className={cn("text-sm text-slate-600 whitespace-pre-wrap", !isExpanded && "line-clamp-3")}>{msg.content}</p>
                  {msg.content.length > 200 && (
                    <button onClick={() => toggleExpand(msg._id)} className="text-xs text-violet-500 hover:text-violet-700 mt-1">
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(msg._id)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
        {filteredMessages.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No messages yet</p>
          </div>
        )}
      </div>
    </>
  );
}


// ═══════════════════════════════════════════
// PARTS VIEW — Like ProjectParts
// ═══════════════════════════════════════════
function PartsView({ parts, setParts }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newQty, setNewQty] = useState(1);

  let idCounter = Date.now();
  const genId = () => `p_${idCounter++}`;

  const filteredParts = parts.filter(p =>
    !searchQuery ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.part_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!newName.trim()) return;
    setParts(prev => [...prev, { _id: genId(), name: newName.trim(), part_number: newPartNumber.trim(), quantity: newQty || 1 }]);
    setNewName('');
    setNewPartNumber('');
    setNewQty(1);
  };

  const handleDelete = (partId) => {
    setParts(prev => prev.filter(p => p._id !== partId));
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900">Parts</h2>
            <span className="text-sm text-slate-500">{parts.length} total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search parts..." className="pl-9 h-9 w-52" />
            </div>
            <Button onClick={() => setShowAddForm(true)} className="h-9 bg-primary hover:bg-primary/80 gap-1.5">
              <Plus className="w-4 h-4" /> Add Part
            </Button>
          </div>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">New Part</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-500">Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Part name" className="mt-1 h-9" autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            </div>
            <div className="w-32">
              <label className="text-xs text-slate-500">Part #</label>
              <Input value={newPartNumber} onChange={(e) => setNewPartNumber(e.target.value)} placeholder="Part #" className="mt-1 h-9" />
            </div>
            <div className="w-20">
              <label className="text-xs text-slate-500">Qty</label>
              <Input type="number" value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value) || 1)} className="mt-1 h-9 text-center" />
            </div>
            <Button onClick={handleAdd} disabled={!newName.trim()} className="bg-emerald-500 hover:bg-emerald-600 h-9">Add</Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)} className="h-9">Cancel</Button>
          </div>
        </motion.div>
      )}

      {/* Parts list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredParts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredParts.map(part => (
              <div key={part._id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/50 transition-colors group">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="flex-1 font-medium text-sm text-slate-700 min-w-0 truncate">{part.name}</span>
                {part.part_number && (
                  <span className="text-xs text-slate-400 font-mono shrink-0">{part.part_number}</span>
                )}
                <Badge variant="outline" className="text-xs shrink-0">Qty: {part.quantity}</Badge>
                <button
                  onClick={() => handleDelete(part._id)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No parts yet</p>
          </div>
        )}
      </div>
    </>
  );
}

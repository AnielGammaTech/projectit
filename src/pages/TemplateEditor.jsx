import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ListTodo, Package, MessageSquare, FileStack, Plus, Trash2,
  CheckCircle2, X, StickyNote, Bell, Save, FolderKanban, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const groupColors = {
  slate: { bg: 'bg-slate-500', light: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  red: { bg: 'bg-red-500', light: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-400' },
  amber: { bg: 'bg-amber-500', light: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  blue: { bg: 'bg-blue-500', light: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  violet: { bg: 'bg-violet-500', light: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-400' },
  pink: { bg: 'bg-pink-500', light: 'bg-pink-100 text-pink-700 border-pink-200', dot: 'bg-pink-400' }
};

const typeConfig = {
  note: { icon: StickyNote, color: 'bg-slate-100 text-slate-700', label: 'Note' },
  message: { icon: MessageSquare, color: 'bg-blue-100 text-blue-700', label: 'Message' },
  update: { icon: Bell, color: 'bg-amber-100 text-amber-700', label: 'Update' }
};

const priorityColors = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
};

export default function TemplateEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const templateId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState([]);
  const [parts, setParts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);

  // Group modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: '', color: 'slate' });

  // Task inline add
  const [addingTaskInGroup, setAddingTaskInGroup] = useState(null); // group_id or '__none__'
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Message add
  const [newMsgTitle, setNewMsgTitle] = useState('');
  const [newMsgContent, setNewMsgContent] = useState('');
  const [newMsgType, setNewMsgType] = useState('note');

  // Part inline add
  const [addingPart, setAddingPart] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartQty, setNewPartQty] = useState(1);

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
      setTasks(existingTemplate.default_tasks || []);
      setParts(existingTemplate.default_parts || []);
      setMessages(existingTemplate.default_messages || []);
      setGroups(existingTemplate.default_groups || []);
    }
  }, [existingTemplate]);

  // --- Group CRUD ---
  const handleOpenGroupModal = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({ name: group.name, color: group.color });
    } else {
      setEditingGroup(null);
      setGroupForm({ name: '', color: 'slate' });
    }
    setShowGroupModal(true);
  };

  const handleSaveGroup = () => {
    if (!groupForm.name.trim()) return;
    if (editingGroup) {
      setGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, ...groupForm } : g));
    } else {
      setGroups(prev => [...prev, { id: `grp_${Date.now()}`, ...groupForm }]);
    }
    setShowGroupModal(false);
  };

  const handleDeleteGroup = (groupId) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setTasks(prev => prev.map(t => t.group_id === groupId ? { ...t, group_id: '' } : t));
  };

  // --- Task CRUD ---
  const handleAddTask = (groupId) => {
    if (!newTaskTitle.trim()) return;
    setTasks(prev => [...prev, {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      description: '',
      priority: 'medium',
      group_id: groupId === '__none__' ? '' : groupId
    }]);
    setNewTaskTitle('');
    setAddingTaskInGroup(null);
  };

  const handleUpdateTask = (taskId, field, value) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
  };

  const handleDeleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // --- Part CRUD ---
  const handleAddPart = () => {
    if (!newPartName.trim()) return;
    setParts(prev => [...prev, {
      id: `part_${Date.now()}`,
      name: newPartName.trim(),
      part_number: newPartNumber.trim(),
      quantity: newPartQty || 1
    }]);
    setNewPartName('');
    setNewPartNumber('');
    setNewPartQty(1);
    setAddingPart(false);
  };

  const handleDeletePart = (partId) => {
    setParts(prev => prev.filter(p => p.id !== partId));
  };

  // --- Message CRUD ---
  const handleAddMessage = () => {
    if (!newMsgContent.trim() && !newMsgTitle.trim()) return;
    setMessages(prev => [...prev, {
      id: `msg_${Date.now()}`,
      title: newMsgTitle.trim(),
      content: newMsgContent.trim(),
      type: newMsgType
    }]);
    setNewMsgTitle('');
    setNewMsgContent('');
    setNewMsgType('note');
  };

  const handleDeleteMessage = (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  // --- Save ---
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const templateData = {
      name: name.trim(),
      description: description.trim(),
      template_type: 'project',
      default_tasks: tasks.map(({ id, ...rest }) => rest),
      default_parts: parts.map(({ id, ...rest }) => rest),
      default_messages: messages.map(({ id, ...rest }) => rest),
      default_groups: groups.map(({ id, ...rest }) => ({ ...rest, _template_id: id }))
    };

    if (templateId && existingTemplate) {
      await api.entities.ProjectTemplate.update(templateId, templateData);
    } else {
      await api.entities.ProjectTemplate.create(templateData);
    }
    queryClient.invalidateQueries({ queryKey: ['templates'] });
    setSaving(false);
    navigate(createPageUrl('Templates'));
  };

  // Group tasks by group
  const ungroupedTasks = tasks.filter(t => !t.group_id);
  const tasksByGroup = {};
  groups.forEach(g => { tasksByGroup[g.id] = tasks.filter(t => t.group_id === g.id); });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Back link */}
        <button
          onClick={() => navigate(createPageUrl('Templates'))}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </button>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-4 mb-5"
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
              <Button variant="outline" onClick={() => navigate(createPageUrl('Templates'))}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : (templateId ? 'Update Template' : 'Save Template')}
              </Button>
            </div>
          </div>
          {/* Stats bar */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-slate-500">
            <span className="flex items-center gap-1"><ListTodo className="w-3.5 h-3.5 text-blue-500" /> {tasks.length} tasks</span>
            <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-emerald-500" /> {parts.length} parts</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-violet-500" /> {messages.length} messages</span>
            <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-amber-500" /> {groups.length} groups</span>
          </div>
        </motion.div>

        {/* ── Cards Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* ─── Tasks Card ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl overflow-hidden border border-blue-100/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 dark:from-[#1e2a3a] dark:via-[#1e2a3a] dark:to-[#1e2a3a]"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />
            <div className="p-3.5 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200/50">
                    <ListTodo className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Tasks</h3>
                    <span className="text-[11px] text-slate-500 font-medium">{tasks.length} tasks</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => handleOpenGroupModal()} className="h-7 text-xs gap-1 px-2">
                    <Layers className="w-3 h-3" /> Group
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setAddingTaskInGroup('__none__'); setNewTaskTitle(''); }}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-200/40 h-7 w-7 p-0 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="px-3 pb-3 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {/* Grouped tasks */}
              {groups.map(group => {
                const gc = groupColors[group.color] || groupColors.slate;
                const groupTasks = tasksByGroup[group.id] || [];
                return (
                  <div key={group.id} className="space-y-1">
                    <div className="flex items-center gap-2 px-1 py-1">
                      <div className={cn("w-2.5 h-2.5 rounded-full", gc.dot)} />
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex-1">{group.name}</span>
                      <span className="text-[10px] text-slate-400">{groupTasks.length}</span>
                      <button onClick={() => handleOpenGroupModal(group)} className="text-slate-300 hover:text-slate-500">
                        <StickyNote className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDeleteGroup(group.id)} className="text-slate-300 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => { setAddingTaskInGroup(group.id); setNewTaskTitle(''); }}
                        className="text-slate-300 hover:text-blue-500"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {groupTasks.map(task => (
                      <TaskRow key={task.id} task={task} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
                    ))}
                    {addingTaskInGroup === group.id && (
                      <InlineTaskAdd
                        value={newTaskTitle}
                        onChange={setNewTaskTitle}
                        onSubmit={() => handleAddTask(group.id)}
                        onCancel={() => setAddingTaskInGroup(null)}
                      />
                    )}
                  </div>
                );
              })}

              {/* Ungrouped tasks */}
              {(ungroupedTasks.length > 0 || groups.length === 0) && (
                <div className="space-y-1">
                  {groups.length > 0 && ungroupedTasks.length > 0 && (
                    <div className="flex items-center gap-2 px-1 py-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ungrouped</span>
                      <span className="text-[10px] text-slate-400">{ungroupedTasks.length}</span>
                    </div>
                  )}
                  {ungroupedTasks.map(task => (
                    <TaskRow key={task.id} task={task} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
                  ))}
                </div>
              )}

              {addingTaskInGroup === '__none__' && (
                <InlineTaskAdd
                  value={newTaskTitle}
                  onChange={setNewTaskTitle}
                  onSubmit={() => handleAddTask('__none__')}
                  onCancel={() => setAddingTaskInGroup(null)}
                />
              )}

              {tasks.length === 0 && addingTaskInGroup === null && (
                <p className="text-xs text-slate-400 text-center py-6">No tasks yet</p>
              )}
            </div>
          </motion.div>

          {/* ─── Messages Card ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative rounded-2xl overflow-hidden border border-violet-100/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-violet-50/30 to-purple-50/40 dark:from-[#1e2a3a] dark:via-[#1e2a3a] dark:to-[#1e2a3a]"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400" />
            <div className="p-3.5 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200/50">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Messages</h3>
                    <span className="text-[11px] text-slate-500 font-medium">{messages.length} total</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-3 pb-3 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {/* New message form */}
              <div className="bg-white/80 dark:bg-slate-800/50 rounded-xl border border-violet-100 dark:border-slate-700/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {/* Type selector */}
                  <div className="flex gap-1">
                    {Object.entries(typeConfig).map(([type, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewMsgType(type)}
                          className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all",
                            newMsgType === type ? cfg.color + " ring-1 ring-offset-1 ring-indigo-300" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Input
                  value={newMsgTitle}
                  onChange={(e) => setNewMsgTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="h-7 text-xs"
                />
                <Textarea
                  value={newMsgContent}
                  onChange={(e) => setNewMsgContent(e.target.value)}
                  placeholder="Write a message..."
                  className="text-xs h-16 resize-none"
                />
                <Button
                  size="sm"
                  onClick={handleAddMessage}
                  disabled={!newMsgContent.trim() && !newMsgTitle.trim()}
                  className="bg-violet-500 hover:bg-violet-600 text-xs h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Message
                </Button>
              </div>

              {/* Message list */}
              {messages.map(msg => {
                const cfg = typeConfig[msg.type] || typeConfig.note;
                const Icon = cfg.icon;
                return (
                  <div key={msg.id} className="flex items-start gap-2 px-2 py-2 rounded-xl bg-white/60 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 group">
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0 mt-0.5", cfg.color)}>
                      {cfg.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      {msg.title && <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{msg.title}</p>}
                      <p className="text-[11px] text-slate-500 line-clamp-2">{msg.content}</p>
                    </div>
                    <button onClick={() => handleDeleteMessage(msg.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {messages.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No messages yet</p>
              )}
            </div>
          </motion.div>

          {/* ─── Parts Card ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden border border-emerald-100/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 dark:from-[#1e2a3a] dark:via-[#1e2a3a] dark:to-[#1e2a3a]"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400" />
            <div className="p-3.5 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/50">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Parts</h3>
                    <span className="text-[11px] text-slate-500 font-medium">{parts.length} parts</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => { setAddingPart(true); setNewPartName(''); setNewPartNumber(''); setNewPartQty(1); }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-200/40 h-7 w-7 p-0 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="px-3 pb-3 space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar">
              {addingPart && (
                <div className="bg-white/80 dark:bg-slate-800/50 rounded-xl border border-emerald-100 dark:border-slate-700/50 p-2.5 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      placeholder="Part name"
                      className="h-7 text-xs flex-1"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPart()}
                    />
                    <Input
                      value={newPartNumber}
                      onChange={(e) => setNewPartNumber(e.target.value)}
                      placeholder="Part #"
                      className="h-7 text-xs w-24"
                    />
                    <Input
                      type="number"
                      value={newPartQty}
                      onChange={(e) => setNewPartQty(parseInt(e.target.value) || 1)}
                      className="h-7 text-xs w-16 text-center"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddPart} disabled={!newPartName.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-xs h-6">
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingPart(false)} className="text-xs h-6">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {parts.map(part => (
                <div key={part.id} className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/60 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 group">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">{part.name}</span>
                  {part.part_number && <span className="text-[10px] text-slate-400 shrink-0">{part.part_number}</span>}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">x{part.quantity}</Badge>
                  <button onClick={() => handleDeletePart(part.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {parts.length === 0 && !addingPart && (
                <p className="text-xs text-slate-400 text-center py-6">No parts yet</p>
              )}
            </div>
          </motion.div>

          {/* ─── Files Card ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative rounded-2xl overflow-hidden border border-amber-100/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40 dark:from-[#1e2a3a] dark:via-[#1e2a3a] dark:to-[#1e2a3a]"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400" />
            <div className="p-3.5 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-200/50">
                  <FileStack className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Files</h3>
                  <span className="text-[11px] text-slate-500 font-medium">0 files</span>
                </div>
              </div>
            </div>
            <div className="px-3 pb-3">
              <p className="text-xs text-slate-400 text-center py-6">Files are added after the project is created</p>
            </div>
          </motion.div>
        </div>
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
                onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Phase 1"
                className="mt-1.5"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveGroup()}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 mt-2">
                {Object.entries(groupColors).map(([color, cfg]) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setGroupForm(prev => ({ ...prev, color }))}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      cfg.bg,
                      groupForm.color === color ? "ring-2 ring-offset-2 ring-indigo-500" : ""
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowGroupModal(false)}>Cancel</Button>
              <Button onClick={handleSaveGroup} disabled={!groupForm.name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Inline components ---

function TaskRow({ task, onUpdate, onDelete }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/60 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 group">
      <CheckCircle2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate flex-1 min-w-0">{task.title}</span>
      <Select value={task.priority} onValueChange={(v) => onUpdate(task.id, 'priority', v)}>
        <SelectTrigger className="h-5 w-auto text-[10px] border-0 bg-transparent p-0 px-0.5 gap-0 focus:ring-0 shrink-0">
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
            priorityColors[task.priority] || priorityColors.medium
          )}>{task.priority}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>
      <button onClick={() => onDelete(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function InlineTaskAdd({ value, onChange, onSubmit, onCancel }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50/60 border border-blue-200/50">
      <CheckCircle2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Task title..."
        className="h-6 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 flex-1"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <Button size="sm" onClick={onSubmit} disabled={!value.trim()} className="bg-blue-500 hover:bg-blue-600 h-5 text-[10px] px-2">
        Add
      </Button>
      <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

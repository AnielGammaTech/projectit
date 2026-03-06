import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ListTodo, Package, MessageSquare, FileStack, CheckCircle2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function TemplateModal({ open, onClose, template, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_tasks: [],
    default_parts: [],
    default_messages: []
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        default_tasks: template.default_tasks || [],
        default_parts: template.default_parts || [],
        default_messages: template.default_messages || []
      });
    } else {
      setFormData({ name: '', description: '', default_tasks: [], default_parts: [], default_messages: [] });
    }
  }, [template, open]);

  // Tasks
  const addTask = () => {
    setFormData(prev => ({
      ...prev,
      default_tasks: [...prev.default_tasks, { title: '', description: '', priority: 'medium' }]
    }));
  };
  const updateTask = (index, field, value) => {
    const updated = [...formData.default_tasks];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, default_tasks: updated }));
  };
  const removeTask = (index) => {
    setFormData(prev => ({ ...prev, default_tasks: prev.default_tasks.filter((_, i) => i !== index) }));
  };

  // Parts
  const addPart = () => {
    setFormData(prev => ({
      ...prev,
      default_parts: [...prev.default_parts, { name: '', part_number: '', quantity: 1 }]
    }));
  };
  const updatePart = (index, field, value) => {
    const updated = [...formData.default_parts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, default_parts: updated }));
  };
  const removePart = (index) => {
    setFormData(prev => ({ ...prev, default_parts: prev.default_parts.filter((_, i) => i !== index) }));
  };

  // Messages
  const addMessage = () => {
    setFormData(prev => ({
      ...prev,
      default_messages: [...prev.default_messages, { title: '', content: '', type: 'note' }]
    }));
  };
  const updateMessage = (index, field, value) => {
    const updated = [...formData.default_messages];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, default_messages: updated }));
  };
  const removeMessage = (index) => {
    setFormData(prev => ({ ...prev, default_messages: prev.default_messages.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const taskCount = formData.default_tasks.length;
  const partCount = formData.default_parts.length;
  const messageCount = formData.default_messages.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header — like a project header */}
        <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-[#1e2a3a] dark:to-[#1e2a3a]">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">Template</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Template name..."
                required
                className="text-lg font-bold border-0 bg-transparent px-0 h-auto focus-visible:ring-0 placeholder:text-slate-300"
              />
            </div>
            <div>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                className="text-sm border-0 bg-transparent px-0 h-auto focus-visible:ring-0 placeholder:text-slate-300 text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Project-style cards grid */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* ─── Tasks Card ─── */}
            <div className="relative rounded-2xl overflow-hidden border border-blue-100/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 dark:from-[#1e2a3a] dark:via-[#1e2a3a] dark:to-[#1e2a3a]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-400" />
              <div className="p-3.5 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200/50">
                      <ListTodo className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Tasks</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{taskCount} tasks</p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={addTask} className="h-7 w-7 p-0 rounded-full bg-blue-500 hover:bg-blue-600 text-white">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="px-3 pb-3 space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar">
                {taskCount === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No tasks yet</p>
                )}
                {formData.default_tasks.map((task, idx) => (
                  <div key={idx} className="bg-white/60 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <Input
                        value={task.title}
                        onChange={(e) => updateTask(idx, 'title', e.target.value)}
                        placeholder="Task title"
                        className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0"
                      />
                      <Select value={task.priority} onValueChange={(v) => updateTask(idx, 'priority', v)}>
                        <SelectTrigger className="h-5 w-auto text-[10px] border-0 bg-transparent p-0 px-1 gap-0.5 focus:ring-0">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                            task.priority === 'high' ? "bg-red-100 text-red-700" :
                            task.priority === 'medium' ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-500"
                          )}>{task.priority}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <button type="button" onClick={() => removeTask(idx)} className="text-slate-300 hover:text-red-500 shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Input
                      value={task.description}
                      onChange={(e) => updateTask(idx, 'description', e.target.value)}
                      placeholder="Description..."
                      className="h-6 text-[11px] text-slate-400 border-0 bg-transparent p-0 pl-5.5 focus-visible:ring-0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Messages Card ─── */}
            <div className="relative rounded-2xl overflow-hidden border border-violet-100/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-violet-50/30 to-purple-50/40 dark:from-[#1e2a3a] dark:via-[#1e2a3a] dark:to-[#1e2a3a]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400" />
              <div className="p-3.5 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200/50">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Messages</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{messageCount} total</p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={addMessage} className="h-7 w-7 p-0 rounded-full bg-violet-500 hover:bg-violet-600 text-white">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="px-3 pb-3 space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar">
                {messageCount === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No messages yet</p>
                )}
                {formData.default_messages.map((msg, idx) => (
                  <div key={idx} className="bg-white/60 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Select value={msg.type || 'note'} onValueChange={(v) => updateMessage(idx, 'type', v)}>
                        <SelectTrigger className="h-5 w-auto text-[10px] border-0 bg-transparent p-0 px-1 gap-0.5 focus:ring-0">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-semibold",
                            msg.type === 'update' ? "bg-amber-100 text-amber-700" :
                            msg.type === 'message' ? "bg-blue-100 text-blue-700" :
                            "bg-slate-100 text-slate-600"
                          )}>{msg.type === 'update' ? 'Update' : msg.type === 'message' ? 'Message' : 'Note'}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="update">Update</SelectItem>
                          <SelectItem value="message">Message</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={msg.title}
                        onChange={(e) => updateMessage(idx, 'title', e.target.value)}
                        placeholder="Title"
                        className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 flex-1"
                      />
                      <button type="button" onClick={() => removeMessage(idx)} className="text-slate-300 hover:text-red-500 shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Textarea
                      value={msg.content}
                      onChange={(e) => updateMessage(idx, 'content', e.target.value)}
                      placeholder="Content..."
                      className="text-[11px] text-slate-500 border-0 bg-transparent p-0 focus-visible:ring-0 resize-none h-12 min-h-0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Parts Card ─── */}
            <div className="relative rounded-2xl overflow-hidden border border-emerald-100/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 dark:from-[#1e2a3a] dark:via-[#1e2a3a] dark:to-[#1e2a3a]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400" />
              <div className="p-3.5 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/50">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Parts</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{partCount} parts</p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={addPart} className="h-7 w-7 p-0 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="px-3 pb-3 space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar">
                {partCount === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No parts yet</p>
                )}
                {formData.default_parts.map((part, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white/60 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 rounded-xl p-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <Input
                      value={part.name}
                      onChange={(e) => updatePart(idx, 'name', e.target.value)}
                      placeholder="Part name"
                      className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 flex-1"
                    />
                    <Input
                      value={part.part_number}
                      onChange={(e) => updatePart(idx, 'part_number', e.target.value)}
                      placeholder="Part #"
                      className="h-7 text-[11px] text-slate-400 border-0 bg-transparent p-0 focus-visible:ring-0 w-20"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-400">Qty:</span>
                      <Input
                        type="number"
                        value={part.quantity}
                        onChange={(e) => updatePart(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-6 text-xs border-0 bg-slate-50 dark:bg-slate-800 p-0 px-1.5 focus-visible:ring-0 w-12 text-center rounded"
                      />
                    </div>
                    <button type="button" onClick={() => removePart(idx)} className="text-slate-300 hover:text-red-500 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Files Card (placeholder/info) ─── */}
            <div className="relative rounded-2xl overflow-hidden border border-amber-100/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40 dark:from-[#1e2a3a] dark:via-[#1e2a3a] dark:to-[#1e2a3a]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400" />
              <div className="p-3.5 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-200/50">
                    <FileStack className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Files</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">0 files</p>
                  </div>
                </div>
              </div>
              <div className="px-3 pb-3">
                <p className="text-xs text-slate-400 text-center py-6">Files are added after the project is created</p>
              </div>
            </div>

          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 dark:bg-[#151d2b]">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><ListTodo className="w-3.5 h-3.5 text-blue-500" /> {taskCount} tasks</span>
            <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-emerald-500" /> {partCount} parts</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-violet-500" /> {messageCount} messages</span>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700" disabled={!formData.name.trim()}>
              {template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

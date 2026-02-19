import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, FileStack, Check, X, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/api/apiClient';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function TaskModal({ open, onClose, task, projectId, teamMembers = [], groups = [], onSave, onBulkCreate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: projectId,
    group_id: '',
    assigned_to: '',
    assigned_name: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    notify_on_complete: []
  });
  const [notifySearch, setNotifySearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Fetch todo templates
  const { data: todoTemplates = [] } = useQuery({
    queryKey: ['todoTemplates'],
    queryFn: async () => {
      const templates = await api.entities.ProjectTemplate.list();
      return templates.filter(t => t.template_type === 'todo');
    },
    enabled: open
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        project_id: task.project_id || projectId,
        group_id: task.group_id || '',
        assigned_to: task.assigned_to || '',
        assigned_name: task.assigned_name || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        due_date: task.due_date || '',
        notify_on_complete: task.notify_on_complete || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        project_id: projectId,
        group_id: '',
        assigned_to: '',
        assigned_name: '',
        status: 'todo',
        priority: 'medium',
        due_date: '',
        notify_on_complete: []
      });
    }
    setSelectedTemplate(null);
    setNotifySearch('');
  }, [task, open, projectId]);

  const handleAddNotifyPerson = (email) => {
    if (!formData.notify_on_complete.includes(email)) {
      setFormData(prev => ({
        ...prev,
        notify_on_complete: [...prev.notify_on_complete, email]
      }));
    }
    setNotifySearch('');
  };

  const handleRemoveNotifyPerson = (email) => {
    setFormData(prev => ({
      ...prev,
      notify_on_complete: prev.notify_on_complete.filter(e => e !== email)
    }));
  };

  const getMemberName = (email) => {
    const member = teamMembers.find(m => m.email === email);
    return member?.name || email;
  };

  const filteredNotifyMembers = teamMembers.filter(m => 
    !formData.notify_on_complete.includes(m.email) &&
    (m.name?.toLowerCase().includes(notifySearch.toLowerCase()) ||
     m.email?.toLowerCase().includes(notifySearch.toLowerCase()))
  );

  const handleAssigneeChange = (email) => {
    const member = teamMembers.find(m => m.email === email);
    setFormData(prev => ({
      ...prev,
      assigned_to: email,
      assigned_name: member?.name || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    
    // If a template is selected, create all tasks from template
    if (selectedTemplate && onBulkCreate) {
      const tasksToCreate = selectedTemplate.default_tasks.map(t => ({
        ...t,
        project_id: projectId,
        status: 'todo'
      }));
      await onBulkCreate(tasksToCreate);
    } else {
      await onSave(formData);
    }
    
    setSelectedTemplate(null);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Template Picker - only when creating new task */}
          {!task && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-2 h-9 px-3 rounded-lg border transition-all text-sm",
                      selectedTemplate
                        ? "border-[#0069AF] bg-[#0069AF]/5 text-[#0069AF]"
                        : "border-slate-200 dark:border-slate-600 hover:border-slate-300 bg-white dark:bg-[#151d2b] text-slate-600 dark:text-slate-300"
                    )}
                  >
                    <FileStack className="w-4 h-4" />
                    <span>{selectedTemplate ? selectedTemplate.name : 'From Template'}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <p className="text-xs font-medium text-slate-500 px-2 py-1.5">Add tasks from template</p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate(null)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm transition-colors",
                        !selectedTemplate ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <X className="w-4 h-4 text-slate-400" />
                      No Template
                    </button>
                    {todoTemplates.length > 0 ? todoTemplates.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplate(t)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm transition-colors",
                          selectedTemplate?.id === t.id 
                            ? "bg-[#0069AF]/10 text-[#0069AF]" 
                            : "hover:bg-slate-50 text-slate-600"
                        )}
                      >
                        <FileStack className="w-4 h-4" />
                        <div className="flex-1 min-w-0">
                          <span className="truncate block">{t.name}</span>
                          {t.default_tasks?.length > 0 && (
                            <span className="text-xs text-slate-400">{t.default_tasks.length} tasks</span>
                          )}
                        </div>
                        {selectedTemplate?.id === t.id && <Check className="w-4 h-4" />}
                      </button>
                    )) : (
                      <p className="text-xs text-slate-400 px-2 py-2">No todo templates yet</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedTemplate && (
                <span className="text-xs text-slate-500">
                  Will add {selectedTemplate.default_tasks?.length || 0} tasks
                </span>
              )}
            </div>
          )}

          {/* Only show form fields if no template selected */}
          {!selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Install network cables"
                  required
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Task details..."
                  className="mt-1.5 h-20"
                />
              </div>

              {groups.length > 0 && (
                <div>
                  <Label>Group</Label>
                  <Select value={formData.group_id || 'none'} onValueChange={(v) => setFormData(prev => ({ ...prev, group_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Group</SelectItem>
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assign To</Label>
                  <Select value={formData.assigned_to || 'unassigned'} onValueChange={handleAssigneeChange}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.email}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? format(new Date(formData.due_date.split('T')[0] + 'T12:00:00'), 'MMM d, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.due_date ? new Date(formData.due_date.split('T')[0] + 'T12:00:00') : undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Notify on Complete */}
              <div>
                <Label className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-500" />
                  When done, notify
                </Label>
                <div className="mt-1.5 space-y-2">
                  {formData.notify_on_complete.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.notify_on_complete.map(email => (
                        <Badge key={email} variant="secondary" className="gap-1 pr-1">
                          {getMemberName(email)}
                          <button
                            type="button"
                            onClick={() => handleRemoveNotifyPerson(email)}
                            className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Input
                      value={notifySearch}
                      onChange={(e) => setNotifySearch(e.target.value)}
                      placeholder="Type names to notify..."
                      className="text-sm"
                    />
                    {notifySearch && filteredNotifyMembers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e2a3a] border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                        {filteredNotifyMembers.slice(0, 5).map(member => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleAddNotifyPerson(member.email)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-sm text-left"
                          >
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                              {member.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{member.name}</p>
                              <p className="text-xs text-slate-500 truncate">{member.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving || (!selectedTemplate && !formData.title)}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedTemplate 
                ? `Add ${selectedTemplate.default_tasks?.length || 0} Tasks` 
                : (task ? 'Update Task' : 'Create Task')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
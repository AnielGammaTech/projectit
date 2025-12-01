import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Send, UserPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MeetingUpdateModal({ 
  open, 
  onClose, 
  projectId, 
  currentUser, 
  teamMembers = [],
  onNoteSaved,
  onTasksCreated
}) {
  const [formData, setFormData] = useState({
    doneLastWeek: [''],
    plannedThisWeek: [''],
    blockers: [''],
    issues: [''],
    actionItems: [{ title: '', assigned_to: '', assigned_name: '' }]
  });
  const [saving, setSaving] = useState(false);

  const addItem = (field) => {
    if (field === 'actionItems') {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], { title: '', assigned_to: '', assigned_name: '' }]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], '']
      }));
    }
  };

  const removeItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateItem = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const updateActionItem = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      actionItems: prev.actionItems.map((item, i) => i === index ? { ...item, ...updates } : item)
    }));
  };

  const handleAssigneeChange = (index, email) => {
    const member = teamMembers.find(m => m.email === email);
    updateActionItem(index, { 
      assigned_to: email, 
      assigned_name: member?.name || email 
    });
  };

  const formatList = (items) => items.filter(i => i.trim()).map(i => `- ${i}`).join('\n') || '- None';

  const handleSubmit = async () => {
    setSaving(true);
    
    // Create the note content
    const noteContent = `📋 Project Weekly Update Meeting

1. 🔄 Project Updates

What was done last week:
${formatList(formData.doneLastWeek)}

What's planned this week:
${formatList(formData.plannedThisWeek)}

Any blockers or help needed:
${formatList(formData.blockers)}

2. ⚠️ Issues & Risks
${formatList(formData.issues)}

3. ✅ Action Items
${formData.actionItems.filter(a => a.title.trim()).map(a => `- ${a.title}${a.assigned_name ? ` (@${a.assigned_name})` : ''}`).join('\n') || '- None'}`;

    // Save the note
    await base44.entities.ProjectNote.create({
      project_id: projectId,
      content: noteContent,
      type: 'update',
      author_email: currentUser?.email,
      author_name: currentUser?.full_name || currentUser?.email
    });

    // Create tasks for action items
    const tasksToCreate = formData.actionItems.filter(a => a.title.trim());
    for (const action of tasksToCreate) {
      await base44.entities.Task.create({
        title: action.title,
        project_id: projectId,
        assigned_to: action.assigned_to || '',
        assigned_name: action.assigned_name || '',
        status: 'todo',
        priority: 'medium'
      });
    }

    setSaving(false);
    onNoteSaved?.();
    onTasksCreated?.();
    onClose();
    
    // Reset form
    setFormData({
      doneLastWeek: [''],
      plannedThisWeek: [''],
      blockers: [''],
      issues: [''],
      actionItems: [{ title: '', assigned_to: '', assigned_name: '' }]
    });
  };

  const renderListSection = (field, label, placeholder) => (
    <div>
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <div className="space-y-2 mt-2">
        {formData[field].map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => updateItem(field, idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
            {formData[field].length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeItem(field, idx)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => addItem(field)} className="w-full border-dashed">
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📋 Project Weekly Update Meeting</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Section 1: Project Updates */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-4">🔄 Project Updates</h3>
            <div className="space-y-4">
              {renderListSection('doneLastWeek', 'What was done last week:', 'Completed task...')}
              {renderListSection('plannedThisWeek', "What's planned this week:", 'Planned task...')}
              {renderListSection('blockers', 'Any blockers or help needed:', 'Blocker...')}
            </div>
          </div>

          {/* Section 2: Issues & Risks */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <h3 className="font-semibold text-amber-900 mb-4">⚠️ Issues & Risks</h3>
            {renderListSection('issues', 'Issues that need escalation or decisions:', 'Issue...')}
          </div>

          {/* Section 3: Action Items */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <h3 className="font-semibold text-emerald-900 mb-4">✅ Action Items (will create tasks)</h3>
            <div className="space-y-3">
              {formData.actionItems.map((action, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Input
                    value={action.title}
                    onChange={(e) => updateActionItem(idx, { title: e.target.value })}
                    placeholder="Action item..."
                    className="flex-1 bg-white"
                  />
                  <Select value={action.assigned_to} onValueChange={(v) => handleAssigneeChange(idx, v)}>
                    <SelectTrigger className="w-40 bg-white">
                      <SelectValue placeholder="Assign to...">
                        {action.assigned_name || 'Assign to...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Unassigned</SelectItem>
                      {teamMembers.map(m => (
                        <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.actionItems.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem('actionItems', idx)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addItem('actionItems')} className="w-full border-dashed bg-white">
                <Plus className="w-4 h-4 mr-1" /> Add Action Item
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            <Send className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save & Create Tasks'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Send, UserPlus, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { api } from '@/api/apiClient';
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

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

export default function MeetingUpdateModal({ 
  open, 
  onClose, 
  projectId, 
  currentUser, 
  teamMembers = [],
  onNoteSaved,
  onTasksCreated
}) {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [formData, setFormData] = useState({
    projectStatus: '',
    accomplishments: [''],
    challenges: [''],
    nextSteps: [{ title: '', assigned_to: '', assigned_name: '', due_date: null }],
    clientFeedback: '',
    additionalNotes: ''
  });
  const [saving, setSaving] = useState(false);

  const addItem = (field) => {
    if (field === 'nextSteps') {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], { title: '', assigned_to: '', assigned_name: '', due_date: null }]
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

  const updateNextStep = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      nextSteps: prev.nextSteps.map((item, i) => i === index ? { ...item, ...updates } : item)
    }));
  };

  const handleAssigneeChange = (index, email) => {
    const member = teamMembers.find(m => m.email === email);
    updateNextStep(index, { 
      assigned_to: email, 
      assigned_name: member?.name || email 
    });
  };

  const formatList = (items) => items.filter(i => i.trim()).map(i => `• ${i}`).join('\n') || '• None';

  const handleSubmit = async () => {
    setSaving(true);
    
    // Create the note content
    const noteContent = `📋 Weekly Meeting Update

**Project Status:** ${formData.projectStatus || 'Not specified'}

**Accomplishments This Week:**
${formatList(formData.accomplishments)}

**Challenges/Blockers:**
${formatList(formData.challenges)}

**Next Steps (Action Items):**
${formData.nextSteps.filter(a => a.title.trim()).map(a => {
  let item = `• ${a.title}`;
  if (a.assigned_name) item += ` → @${a.assigned_name}`;
  if (a.due_date) item += ` (Due: ${format(parseLocalDate(a.due_date), 'MMM d')})`;
  return item;
}).join('\n') || '• None'}

**Client Feedback:**
${formData.clientFeedback || 'None'}

**Additional Notes:**
${formData.additionalNotes || 'None'}`;

    // Save the note with title
    const today = new Date();
    const defaultTitle = `Weekly Update - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    await api.entities.ProjectNote.create({
      project_id: projectId,
      title: meetingTitle.trim() || defaultTitle,
      content: noteContent,
      type: 'update',
      author_email: currentUser?.email,
      author_name: currentUser?.full_name || currentUser?.email
    });

    // Create tasks for next steps
    const tasksToCreate = formData.nextSteps.filter(a => a.title.trim());
    for (const action of tasksToCreate) {
      await api.entities.Task.create({
        title: action.title,
        project_id: projectId,
        assigned_to: action.assigned_to || '',
        assigned_name: action.assigned_name || '',
        due_date: action.due_date ? format(action.due_date, 'yyyy-MM-dd') : '',
        status: 'todo',
        priority: 'medium'
      });
    }

    setSaving(false);
    onNoteSaved?.();
    onTasksCreated?.();
    onClose();
    
    // Reset form
    setMeetingTitle('');
    setFormData({
      projectStatus: '',
      accomplishments: [''],
      challenges: [''],
      nextSteps: [{ title: '', assigned_to: '', assigned_name: '', due_date: null }],
      clientFeedback: '',
      additionalNotes: ''
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
              className="flex-1 bg-white"
            />
            {formData[field].length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeItem(field, idx)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => addItem(field)} className="w-full border-dashed bg-white/50">
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Weekly Meeting Update
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Meeting Title */}
          <div>
            <Label className="text-sm font-medium text-slate-700">Meeting Title</Label>
            <Input
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder={`Weekly Update - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              className="mt-2"
            />
          </div>

          {/* Project Status */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <Label className="text-sm font-medium text-slate-700">How is the project going overall?</Label>
            <Select value={formData.projectStatus} onValueChange={(v) => setFormData(p => ({ ...p, projectStatus: v }))}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_track">🟢 On Track</SelectItem>
                <SelectItem value="at_risk">🟡 At Risk</SelectItem>
                <SelectItem value="behind">🔴 Behind Schedule</SelectItem>
                <SelectItem value="ahead">🚀 Ahead of Schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Accomplishments */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <h3 className="font-semibold text-emerald-900 mb-4 flex items-center gap-2">
              ✅ What was accomplished this week?
            </h3>
            {renderListSection('accomplishments', '', 'Completed item...')}
          </div>

          {/* Challenges */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
              ⚠️ Challenges or blockers?
            </h3>
            {renderListSection('challenges', '', 'Challenge or blocker...')}
          </div>

          {/* Next Steps - These become tasks */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              📋 What are the next steps?
            </h3>
            <p className="text-xs text-blue-700 mb-4">These will be created as tasks and assigned to team members</p>
            <div className="space-y-3">
              {formData.nextSteps.map((step, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-blue-200 space-y-2">
                  <Input
                    value={step.title}
                    onChange={(e) => updateNextStep(idx, { title: e.target.value })}
                    placeholder="What needs to be done..."
                    className="font-medium"
                  />
                  <div className="flex gap-2 items-center">
                    <Select value={step.assigned_to} onValueChange={(v) => handleAssigneeChange(idx, v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Assign to...">
                          {step.assigned_name ? (
                            <div className="flex items-center gap-2">
                              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(step.assigned_to))}>
                                {getInitials(step.assigned_name)}
                              </div>
                              {step.assigned_name}
                            </div>
                          ) : 'Assign to...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map(m => (
                          <SelectItem key={m.id} value={m.email}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]", getColorForEmail(m.email))}>
                                {getInitials(m.name)}
                              </div>
                              {m.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-32">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          {step.due_date ? format(step.due_date, 'MMM d') : 'Due date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={step.due_date}
                          onSelect={(date) => updateNextStep(idx, { due_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {formData.nextSteps.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem('nextSteps', idx)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addItem('nextSteps')} className="w-full border-dashed bg-white/50">
                <Plus className="w-4 h-4 mr-1" /> Add Next Step
              </Button>
            </div>
          </div>

          {/* Client Feedback */}
          <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
            <h3 className="font-semibold text-violet-900 mb-4 flex items-center gap-2">
              💬 Any client feedback?
            </h3>
            <Textarea
              value={formData.clientFeedback}
              onChange={(e) => setFormData(p => ({ ...p, clientFeedback: e.target.value }))}
              placeholder="Notes from client communication..."
              className="bg-white min-h-[80px]"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <Label className="text-sm font-medium text-slate-700">Additional Notes</Label>
            <Textarea
              value={formData.additionalNotes}
              onChange={(e) => setFormData(p => ({ ...p, additionalNotes: e.target.value }))}
              placeholder="Any other notes..."
              className="mt-2 min-h-[60px]"
            />
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
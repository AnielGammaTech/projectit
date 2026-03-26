import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Plus, Trash2, Send, Calendar as CalendarIcon, CheckCircle2, Loader2, ClipboardList, Target, AlertTriangle, MessageCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';
import { toast } from 'sonner';

export default function WeeklyMeetingUpdate() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    projectStatus: '',
    accomplishments: [''],
    challenges: [''],
    nextSteps: [{ title: '', assigned_to: '', assigned_name: '', due_date: null }],
    clientFeedback: '',
    additionalNotes: ''
  });

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.entities.Project.get(projectId),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list(),
    staleTime: 300000
  });

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
    toast.success('Meeting update saved and tasks created');
    navigate(`/ProjectNotes?id=${projectId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Link */}
        <Link
          to={createPageUrl('ProjectNotes') + `?id=${projectId}`}
          className="inline-flex items-center text-[#0069AF] hover:text-[#133F5C] mb-5 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Notes
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Weekly Meeting Update</h1>
            {project && <p className="text-sm text-slate-500 dark:text-slate-400">{project.name}</p>}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Meeting Title */}
          <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Meeting Title</Label>
            <Input
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder={`Weekly Update - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              className="dark:bg-[#151d2b] dark:border-slate-600"
            />
          </div>

          {/* Project Status */}
          <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Project Status</Label>
            <Select value={formData.projectStatus} onValueChange={(v) => setFormData(p => ({ ...p, projectStatus: v }))}>
              <SelectTrigger className="dark:bg-[#151d2b] dark:border-slate-600">
                <SelectValue placeholder="How is the project going?" />
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
          <SectionCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            title="Accomplishments"
            subtitle="What was completed this week?"
            color="emerald"
          >
            <ListSection
              items={formData.accomplishments}
              placeholder="Completed item..."
              onUpdate={(idx, val) => updateItem('accomplishments', idx, val)}
              onRemove={(idx) => removeItem('accomplishments', idx)}
              onAdd={() => addItem('accomplishments')}
            />
          </SectionCard>

          {/* Challenges */}
          <SectionCard
            icon={<AlertTriangle className="w-4 h-4" />}
            title="Challenges & Blockers"
            subtitle="Any obstacles or risks?"
            color="amber"
          >
            <ListSection
              items={formData.challenges}
              placeholder="Challenge or blocker..."
              onUpdate={(idx, val) => updateItem('challenges', idx, val)}
              onRemove={(idx) => removeItem('challenges', idx)}
              onAdd={() => addItem('challenges')}
            />
          </SectionCard>

          {/* Next Steps */}
          <SectionCard
            icon={<Target className="w-4 h-4" />}
            title="Next Steps"
            subtitle="These become tasks assigned to team members"
            color="blue"
          >
            <div className="space-y-3">
              {formData.nextSteps.map((step, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-[#151d2b] rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                  <Input
                    value={step.title}
                    onChange={(e) => updateNextStep(idx, { title: e.target.value })}
                    placeholder="What needs to be done..."
                    className="font-medium dark:bg-[#1a2535] dark:border-slate-600"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={step.assigned_to} onValueChange={(v) => handleAssigneeChange(idx, v)}>
                      <SelectTrigger className="flex-1 dark:bg-[#1a2535] dark:border-slate-600">
                        <SelectValue placeholder="Assign to...">
                          {step.assigned_name ? (
                            <div className="flex items-center gap-2">
                              <UserAvatar email={step.assigned_to} name={step.assigned_name} avatarUrl={teamMembers.find(m => m.email === step.assigned_to)?.avatar_url} size="xs" />
                              {step.assigned_name}
                            </div>
                          ) : 'Assign to...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map(m => (
                          <SelectItem key={m.id} value={m.email}>
                            <div className="flex items-center gap-2">
                              <UserAvatar email={m.email} name={m.name} avatarUrl={m.avatar_url} size="xs" />
                              {m.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full sm:w-32 dark:bg-[#1a2535] dark:border-slate-600">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          {step.due_date ? format(step.due_date, 'MMM d') : 'Due date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={step.due_date}
                          onSelect={(date) => updateNextStep(idx, { due_date: date })}
                        />
                      </PopoverContent>
                    </Popover>

                    {formData.nextSteps.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem('nextSteps', idx)} className="text-slate-400 hover:text-red-500 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addItem('nextSteps')} className="w-full border-dashed dark:bg-transparent dark:border-slate-600">
                <Plus className="w-4 h-4 mr-1" /> Add Next Step
              </Button>
            </div>
          </SectionCard>

          {/* Client Feedback */}
          <SectionCard
            icon={<MessageCircle className="w-4 h-4" />}
            title="Client Feedback"
            subtitle="Notes from client communication"
            color="violet"
          >
            <Textarea
              value={formData.clientFeedback}
              onChange={(e) => setFormData(p => ({ ...p, clientFeedback: e.target.value }))}
              placeholder="Notes from client communication..."
              className="min-h-[80px] dark:bg-[#151d2b] dark:border-slate-600"
            />
          </SectionCard>

          {/* Additional Notes */}
          <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Additional Notes</Label>
            <Textarea
              value={formData.additionalNotes}
              onChange={(e) => setFormData(p => ({ ...p, additionalNotes: e.target.value }))}
              placeholder="Any other notes..."
              className="min-h-[60px] dark:bg-[#151d2b] dark:border-slate-600"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Link to={createPageUrl('ProjectNotes') + `?id=${projectId}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={saving} className="bg-[#0069AF] hover:bg-[#0F2F44]">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {saving ? 'Saving...' : 'Save & Create Tasks'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ icon, title, subtitle, color, children }) {
  const colorMap = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30',
    amber: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30',
    blue: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30',
    violet: 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800/30',
  };
  const iconColorMap = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
    violet: 'text-violet-600 dark:text-violet-400',
  };
  const titleColorMap = {
    emerald: 'text-emerald-900 dark:text-emerald-200',
    amber: 'text-amber-900 dark:text-amber-200',
    blue: 'text-blue-900 dark:text-blue-200',
    violet: 'text-violet-900 dark:text-violet-200',
  };

  return (
    <div className={cn("rounded-2xl border p-5", colorMap[color])}>
      <div className="flex items-center gap-2 mb-1">
        <span className={iconColorMap[color]}>{icon}</span>
        <h3 className={cn("font-semibold text-sm", titleColorMap[color])}>{title}</h3>
      </div>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{subtitle}</p>}
      {children}
    </div>
  );
}

function ListSection({ items, placeholder, onUpdate, onRemove, onAdd }) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => onUpdate(idx, e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-white dark:bg-[#151d2b] dark:border-slate-600"
          />
          {items.length > 1 && (
            <Button variant="ghost" size="icon" onClick={() => onRemove(idx)} className="text-slate-400 hover:text-red-500 shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onAdd} className="w-full border-dashed bg-white/50 dark:bg-transparent dark:border-slate-600">
        <Plus className="w-4 h-4 mr-1" /> Add Item
      </Button>
    </div>
  );
}

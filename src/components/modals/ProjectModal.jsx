import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarIcon, Loader2, Users, Search, Building2, User, Check, Clock, X,
  FileStack, UserPlus, ChevronDown, Crown, Sparkles, FolderOpen, Palette,
  Timer, ArrowRight, Plus, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/api/apiClient';
import { cn } from '@/lib/utils';

const colorOptions = [
  { value: 'slate', color: '#64748b' },
  { value: 'red', color: '#ef4444' },
  { value: 'orange', color: '#f97316' },
  { value: 'amber', color: '#f59e0b' },
  { value: 'yellow', color: '#eab308' },
  { value: 'lime', color: '#84cc16' },
  { value: 'green', color: '#22c55e' },
  { value: 'emerald', color: '#10b981' },
  { value: 'teal', color: '#14b8a6' },
  { value: 'cyan', color: '#06b6d4' },
  { value: 'sky', color: '#0ea5e9' },
  { value: 'blue', color: '#3b82f6' },
  { value: 'indigo', color: '#6366f1' },
  { value: 'violet', color: '#8b5cf6' },
  { value: 'purple', color: '#a855f7' },
  { value: 'fuchsia', color: '#d946ef' },
  { value: 'pink', color: '#ec4899' },
  { value: 'rose', color: '#f43f5e' },
];

export default function ProjectModal({ open, onClose, project, templates = [], onSave, onPartsExtracted, prefillData, currentUserEmail }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client: '',
    customer_id: '',
    status: 'in_progress',
    start_date: '',
    due_date: '',
    color: 'blue',
    group: '',
    user_groups: [],
    team_members: [],
    time_budget_hours: 0,
    project_lead: ''
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [extractedParts, setExtractedParts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const { data: userGroups = [] } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => api.entities.UserGroup.list(),
    enabled: open
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.entities.Customer.list('name'),
    enabled: open
  });

  const { data: projectStatuses = [] } = useQuery({
    queryKey: ['projectStatuses'],
    queryFn: () => api.entities.ProjectStatus.list('order'),
    enabled: open
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list('name'),
    enabled: open
  });

  const defaultStatus = projectStatuses.find(s => s.is_default)?.key || 'in_progress';

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        client: project.client || '',
        customer_id: project.customer_id || '',
        status: project.status || 'in_progress',
        start_date: project.start_date || '',
        due_date: project.due_date || '',
        color: project.color || 'blue',
        group: project.group || '',
        user_groups: project.user_groups || [],
        team_members: project.team_members || [],
        time_budget_hours: project.time_budget_hours || 0,
        project_lead: project.project_lead || ''
      });
      setExtractedParts([]);
    } else if (prefillData) {
      let customerId = prefillData.customer_id || '';
      let clientName = prefillData.client || '';
      if (!customerId && clientName && customers.length > 0) {
        const found = customers.find(c =>
          c.name?.toLowerCase() === clientName.toLowerCase() ||
          c.company?.toLowerCase() === clientName.toLowerCase()
        );
        if (found) {
          customerId = found.id;
          clientName = found.name || clientName;
        }
      }
      setFormData({
        name: prefillData.name || '',
        description: prefillData.description || '',
        client: clientName,
        customer_id: customerId,
        status: defaultStatus,
        start_date: '',
        due_date: '',
        color: 'blue',
        group: '',
        user_groups: [],
        team_members: currentUserEmail ? [currentUserEmail] : [],
        time_budget_hours: 0,
        project_lead: currentUserEmail || ''
      });
      if (prefillData.proposalItems && prefillData.proposalItems.length > 0) {
        setExtractedParts(prefillData.proposalItems.map(item => ({
          name: item.name || 'Unnamed Item',
          quantity: item.quantity || 1,
          unit_cost: item.unit_cost || item.unit_price || 0,
          description: item.description || ''
        })));
      } else {
        setExtractedParts([]);
      }
    } else {
      setFormData({
        name: '',
        description: '',
        client: '',
        customer_id: '',
        status: defaultStatus,
        start_date: '',
        due_date: '',
        color: 'blue',
        group: '',
        user_groups: [],
        team_members: currentUserEmail ? [currentUserEmail] : [],
        time_budget_hours: 0,
        project_lead: currentUserEmail || ''
      });
      setExtractedParts([]);
    }
    setSelectedTemplate('');
    setPeopleSearch('');
    setShowLeadPicker(false);
    setShowColorPicker(false);
    setShowTemplatePicker(false);
  }, [project, open, prefillData, defaultStatus, currentUserEmail, customers]);

  const toggleTeamMember = (email) => {
    setFormData(prev => ({
      ...prev,
      team_members: prev.team_members.includes(email)
        ? prev.team_members.filter(e => e !== email)
        : [...prev.team_members, email]
    }));
  };

  const addGroupMembers = (group) => {
    if (!group.member_emails?.length) return;
    setFormData(prev => ({
      ...prev,
      team_members: [...new Set([...prev.team_members, ...group.member_emails])]
    }));
  };

  const getMemberName = (email) => {
    const member = teamMembers.find(m => m.email === email);
    return member?.name || email;
  };

  const getMember = (email) => {
    return teamMembers.find(m => m.email === email);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      const result = await api.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            parts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  part_number: { type: "string" },
                  quantity: { type: "number" },
                  unit_cost: { type: "number" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });
      if (result.status === 'success' && result.output?.parts) {
        setExtractedParts(result.output.parts);
      }
    } catch (err) {
      console.error('Failed to extract parts:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const template = selectedTemplate && selectedTemplate !== 'none' ? templates.find(t => t.id === selectedTemplate) : null;
    await onSave(formData, template, extractedParts);
    setSaving(false);
  };

  const selectedColor = colorOptions.find(c => c.value === formData.color)?.color || '#3b82f6';
  const isEdit = !!project;
  const canSubmit = formData.name && formData.customer_id && formData.description;
  const leadMember = formData.project_lead ? getMember(formData.project_lead) : null;

  const filteredAvailableMembers = teamMembers.filter(m =>
    !formData.team_members.includes(m.email) &&
    (m.name?.toLowerCase().includes(peopleSearch.toLowerCase()) ||
     m.email?.toLowerCase().includes(peopleSearch.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh] gap-0 dark:bg-[#1e2a3a]">

        {/* ── Colored Header ── */}
        <div
          className="px-6 pt-6 pb-4 transition-colors duration-300"
          style={{ background: `linear-gradient(135deg, ${selectedColor}18, ${selectedColor}08)` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors duration-300"
                style={{ backgroundColor: selectedColor + '20', color: selectedColor }}
              >
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isEdit ? 'Edit Project' : 'New Project'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEdit ? 'Update project details' : 'Set up a new project for your team'}
                </p>
              </div>
            </div>

            {/* Color Picker Trigger */}
            <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="group relative w-8 h-8 rounded-lg border-2 border-white shadow-sm hover:shadow-md transition-all hover:scale-110"
                  style={{ backgroundColor: selectedColor }}
                  title="Project color"
                >
                  <Palette className="w-3.5 h-3.5 text-white absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="end" sideOffset={8}>
                <p className="text-xs font-semibold text-slate-500 mb-2.5">Pick a color</p>
                <div className="grid grid-cols-6 gap-2">
                  {colorOptions.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, color: c.value }));
                        setShowColorPicker(false);
                      }}
                      className={cn(
                        "w-7 h-7 rounded-full transition-all",
                        formData.color === c.value
                          ? "ring-2 ring-offset-2 ring-slate-400 scale-110"
                          : "hover:scale-125"
                      )}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Project Name — Large, prominent */}
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="What's the project called?"
            className="text-lg font-semibold h-12 bg-white/80 dark:bg-[#151d2b]/80 backdrop-blur-sm border-white/50 dark:border-slate-600 shadow-sm placeholder:text-slate-400 placeholder:font-normal focus-visible:ring-2 dark:text-slate-100"
            style={{ '--tw-ring-color': selectedColor + '40' }}
            required
          />
        </div>

        {/* ── Scrollable Body ── */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="px-6 py-5 space-y-5">

            {/* Client + Description row */}
            <div className="space-y-4">
              {/* Client Selection — Modern dropdown */}
              <div className="relative">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                  Client
                </Label>
                <div
                  className={cn(
                    "flex items-center gap-3 w-full h-11 px-3 rounded-xl border-2 bg-white dark:bg-[#151d2b] cursor-pointer transition-all",
                    showCustomerDropdown ? "border-blue-400 shadow-sm" : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500",
                  )}
                  style={showCustomerDropdown ? { borderColor: selectedColor + '80' } : undefined}
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                >
                  {formData.customer_id ? (
                    <>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedColor + '15' }}>
                        <Building2 className="w-3.5 h-3.5" style={{ color: selectedColor }} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{formData.client}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData(prev => ({ ...prev, client: '', customer_id: '' }));
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 text-slate-400" />
                      <span className="flex-1 text-sm text-slate-400">Search for a client...</span>
                    </>
                  )}
                </div>

                {showCustomerDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCustomerDropdown(false)} />
                    <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#1e2a3a] rounded-xl border border-slate-200 dark:border-slate-600 shadow-xl max-h-64 overflow-hidden">
                      <div className="p-2.5 border-b border-slate-100 dark:border-slate-700">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            placeholder="Search customers..."
                            className="pl-8 h-9 text-sm rounded-lg"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1.5">
                        {customers
                          .filter(c =>
                            c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.company?.toLowerCase().includes(customerSearch.toLowerCase())
                          )
                          .map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, client: customer.name || '', customer_id: customer.id }));
                                setShowCustomerDropdown(false);
                                setCustomerSearch('');
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all",
                                formData.customer_id === customer.id
                                  ? "bg-blue-50"
                                  : "hover:bg-slate-50"
                              )}
                              style={formData.customer_id === customer.id ? { backgroundColor: selectedColor + '10' } : undefined}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                customer.type === 'company' ? "bg-blue-50" : "bg-slate-100"
                              )}>
                                {customer.type === 'company' ? (
                                  <Building2 className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <User className="w-4 h-4 text-slate-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{customer.name}</p>
                                {customer.company && customer.type !== 'company' && (
                                  <p className="text-xs text-slate-500 truncate">{customer.company}</p>
                                )}
                              </div>
                              {formData.customer_id === customer.id && (
                                <Check className="w-4 h-4" style={{ color: selectedColor }} />
                              )}
                            </button>
                          ))
                        }
                        {customers.filter(c =>
                          c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.company?.toLowerCase().includes(customerSearch.toLowerCase())
                        ).length === 0 && (
                          <p className="text-sm text-slate-500 text-center py-4">No customers found</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                  Description
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief summary of what this project is about..."
                  required
                  className="h-20 resize-none rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-[#151d2b] dark:text-slate-100 focus-visible:border-blue-400 text-sm"
                />
              </div>
            </div>

            {/* ── Team Section ── */}
            <div className="rounded-xl border-2 border-slate-200 dark:border-slate-600 overflow-hidden">
              {/* Team Header */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-[#151d2b] border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Team</span>
                  <span className="text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
                    {formData.team_members.length}
                  </span>
                </div>

                {/* Quick add groups */}
                {userGroups.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {userGroups.slice(0, 3).map(group => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => addGroupMembers(group)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        {group.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3">
                {/* Project Lead */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                    <Crown className="w-3 h-3" />
                    Lead
                  </div>
                  {leadMember ? (
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold", leadMember.avatar_color || "bg-blue-500")}
                      >
                        {getInitials(leadMember.name)}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{leadMember.name}</span>
                      <button
                        type="button"
                        onClick={() => setShowLeadPicker(!showLeadPicker)}
                        className="ml-auto text-xs text-slate-400 hover:text-slate-600"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLeadPicker(!showLeadPicker)}
                      className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Assign a lead...
                    </button>
                  )}
                </div>

                {/* Lead picker dropdown */}
                {showLeadPicker && (
                  <div className="mb-3 bg-slate-50 rounded-lg border border-slate-200 p-2 max-h-32 overflow-y-auto">
                    {teamMembers.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, project_lead: member.email }));
                          if (!formData.team_members.includes(member.email)) {
                            setFormData(prev => ({ ...prev, team_members: [...prev.team_members, member.email] }));
                          }
                          setShowLeadPicker(false);
                        }}
                        className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-white transition-colors text-left"
                      >
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold", member.avatar_color || "bg-blue-500")}>
                          {getInitials(member.name)}
                        </div>
                        <span className="text-sm text-slate-700">{member.name}</span>
                        {formData.project_lead === member.email && (
                          <Check className="w-3.5 h-3.5 text-amber-500 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Members — Avatar row */}
                {formData.team_members.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {formData.team_members.map(email => {
                      const member = getMember(email);
                      const isLead = email === formData.project_lead;
                      return (
                        <div
                          key={email}
                          className={cn(
                            "group flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border text-xs transition-all",
                            isLead ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold",
                            member?.avatar_color || "bg-blue-500"
                          )}>
                            {getInitials(getMemberName(email))}
                          </div>
                          <span className="text-slate-700 font-medium">{getMemberName(email).split(' ')[0]}</span>
                          {isLead && <Crown className="w-3 h-3 text-amber-500" />}
                          {email !== currentUserEmail && (
                            <button
                              type="button"
                              onClick={() => toggleTeamMember(email)}
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add people search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    placeholder="Search to add people..."
                    className="pl-8 h-9 text-sm rounded-lg border-slate-200"
                  />
                </div>

                {/* Available members to add */}
                {(peopleSearch || filteredAvailableMembers.length <= 8) && filteredAvailableMembers.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
                    {filteredAvailableMembers.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleTeamMember(member.email)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold",
                          member.avatar_color || "bg-blue-500"
                        )}>
                          {getInitials(member.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{member.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                        </div>
                        <Plus className="w-4 h-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}

                {peopleSearch && filteredAvailableMembers.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">
                    {teamMembers.filter(m => !formData.team_members.includes(m.email)).length === 0
                      ? 'Everyone is added!'
                      : 'No match found'}
                  </p>
                )}
              </div>
            </div>

            {/* ── Options Row — Dates, Budget, Template ── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Start Date */}
              <div>
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                  Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 h-10 px-3 rounded-xl border-2 text-sm text-left transition-all",
                        formData.start_date
                          ? "border-slate-200 dark:border-slate-600 bg-white dark:bg-[#151d2b] text-slate-800 dark:text-slate-100"
                          : "border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-[#151d2b] text-slate-400 hover:border-slate-300"
                      )}
                    >
                      <CalendarIcon className="w-4 h-4 flex-shrink-0 text-slate-400" />
                      <span className="truncate">
                        {formData.start_date
                          ? format(new Date(formData.start_date.split('T')[0] + 'T12:00:00'), 'MMM d, yyyy')
                          : 'Optional'}
                      </span>
                      {formData.start_date && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, start_date: '' }));
                          }}
                          className="ml-auto text-slate-300 hover:text-slate-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date ? new Date(formData.start_date.split('T')[0] + 'T12:00:00') : undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Due Date */}
              <div>
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                  Due Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 h-10 px-3 rounded-xl border-2 text-sm text-left transition-all",
                        formData.due_date
                          ? "border-slate-200 dark:border-slate-600 bg-white dark:bg-[#151d2b] text-slate-800 dark:text-slate-100"
                          : "border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-[#151d2b] text-slate-400 hover:border-slate-300"
                      )}
                    >
                      <CalendarIcon className="w-4 h-4 flex-shrink-0 text-slate-400" />
                      <span className="truncate">
                        {formData.due_date
                          ? format(new Date(formData.due_date.split('T')[0] + 'T12:00:00'), 'MMM d, yyyy')
                          : 'Optional'}
                      </span>
                      {formData.due_date && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, due_date: '' }));
                          }}
                          className="ml-auto text-slate-300 hover:text-slate-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </button>
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

              {/* Time Budget */}
              <div>
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                  Time Budget
                </Label>
                <div className="relative">
                  <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.time_budget_hours || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_budget_hours: e.target.value ? Number(e.target.value) : 0 }))}
                    placeholder="Hours"
                    className="pl-9 h-10 text-sm rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-[#151d2b] dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Template — only show on create */}
              {!isEdit && (
                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                    Template
                  </Label>
                  <Popover open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "w-full flex items-center gap-2 h-10 px-3 rounded-xl border-2 text-sm text-left transition-all",
                          selectedTemplate && selectedTemplate !== 'none'
                            ? "border-slate-200 dark:border-slate-600 bg-white dark:bg-[#151d2b] text-slate-800 dark:text-slate-100"
                            : "border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-[#151d2b] text-slate-400 hover:border-slate-300"
                        )}
                        style={selectedTemplate && selectedTemplate !== 'none' ? { borderColor: selectedColor + '60' } : undefined}
                      >
                        <FileStack className="w-4 h-4 flex-shrink-0 text-slate-400" />
                        <span className="truncate">
                          {selectedTemplate && selectedTemplate !== 'none'
                            ? templates.find(t => t.id === selectedTemplate)?.name
                            : 'None'}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1.5" align="start">
                      <button
                        type="button"
                        onClick={() => { setSelectedTemplate('none'); setShowTemplatePicker(false); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                          (!selectedTemplate || selectedTemplate === 'none') ? "bg-slate-100" : "hover:bg-slate-50"
                        )}
                      >
                        <X className="w-4 h-4 text-slate-400" />
                        No template
                      </button>
                      {templates.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => { setSelectedTemplate(t.id); setShowTemplatePicker(false); }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                            selectedTemplate === t.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                          )}
                        >
                          <FileStack className="w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">{t.name}</span>
                            {t.default_tasks?.length > 0 && (
                              <span className="text-[11px] text-slate-400">{t.default_tasks.length} tasks</span>
                            )}
                          </div>
                          {selectedTemplate === t.id && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      ))}
                      {templates.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-3">No templates created yet</p>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-[#151d2b] border-t border-slate-200 dark:border-slate-600 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              className="h-10 px-6 rounded-xl font-semibold text-sm shadow-sm transition-all hover:shadow-md disabled:opacity-40"
              style={{
                backgroundColor: canSubmit ? '#0F2F44' : undefined,
              }}
              disabled={saving || !canSubmit}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {isEdit ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

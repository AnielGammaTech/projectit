import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Loader2, Users, Search, Building2, User, Check, Clock, X, Palette, FileStack, UserPlus, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
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
    color: 'slate',
    group: '',
    user_groups: [],
    team_members: [],
    time_budget_hours: 0
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [extractedParts, setExtractedParts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [showPeopleSelector, setShowPeopleSelector] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');

  const { data: userGroups = [] } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => base44.entities.UserGroup.list(),
    enabled: open
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('name'),
    enabled: open
  });

  const { data: projectStatuses = [] } = useQuery({
    queryKey: ['projectStatuses'],
    queryFn: () => base44.entities.ProjectStatus.list('order'),
    enabled: open
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list('name'),
    enabled: open
  });

  // Get default status key
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
        color: project.color || 'slate',
        group: project.group || '',
        user_groups: project.user_groups || [],
        team_members: project.team_members || [],
        time_budget_hours: project.time_budget_hours || 0
      });
      setShowDates(!!(project.start_date || project.due_date));
      setExtractedParts([]);
    } else if (prefillData) {
      // Try to find customer by name if ID is missing
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
        color: 'slate',
        group: '',
        user_groups: [],
        team_members: currentUserEmail ? [currentUserEmail] : [],
        time_budget_hours: 0
      });
      setShowDates(false);
      // Convert proposal items to parts
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
        color: 'slate',
        group: '',
        user_groups: [],
        team_members: currentUserEmail ? [currentUserEmail] : [],
        time_budget_hours: 0
      });
      setShowDates(false);
      setExtractedParts([]);
    }
    setSelectedTemplate('');
    setShowPeopleSelector(false);
    setPeopleSearch('');
  }, [project, open, prefillData, defaultStatus, currentUserEmail, customers]);

  const toggleUserGroup = (groupId) => {
    setFormData(prev => ({
      ...prev,
      user_groups: prev.user_groups.includes(groupId)
        ? prev.user_groups.filter(id => id !== groupId)
        : [...prev.user_groups, groupId]
    }));
  };

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

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
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
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const template = selectedTemplate && selectedTemplate !== 'none' ? templates.find(t => t.id === selectedTemplate) : null;
    await onSave(formData, template, extractedParts);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Project Name */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Office Network Upgrade"
              required
              className="mt-1.5 h-11"
            />
          </div>

          {/* Client Selection */}
          <div className="relative">
            <Label htmlFor="client" className="text-sm font-medium">
              Client <span className="text-red-500">*</span>
            </Label>
            <div className="relative mt-1.5">
              <div 
                className={cn(
                  "flex items-center gap-2 w-full h-11 px-3 rounded-md border bg-white cursor-pointer transition-all",
                  showCustomerDropdown ? "border-[#0069AF] ring-2 ring-[#0069AF]/20" : "border-slate-200 hover:border-slate-300",
                  !formData.customer_id && "text-slate-400"
                )}
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              >
                {formData.customer_id ? (
                  <>
                    <Building2 className="w-4 h-4 text-[#0069AF]" />
                    <span className="flex-1 text-sm truncate text-slate-900">{formData.client}</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-slate-400" />
                    <span className="flex-1 text-sm">Select customer...</span>
                  </>
                )}
              </div>
              
              {showCustomerDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-xl max-h-64 overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customers..."
                        className="pl-8 h-9 text-sm"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
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
                            "w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-all",
                            formData.customer_id === customer.id 
                              ? "bg-[#0069AF]/10 text-[#0069AF]" 
                              : "hover:bg-slate-50"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            customer.type === 'company' ? "bg-[#0069AF]/10" : "bg-slate-100"
                          )}>
                            {customer.type === 'company' ? (
                              <Building2 className="w-4 h-4 text-[#0069AF]" />
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
                            <Check className="w-4 h-4 text-[#0069AF]" />
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
              )}
            </div>
            {showCustomerDropdown && (
              <div className="fixed inset-0 z-40" onClick={() => setShowCustomerDropdown(false)} />
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What is this project about?"
              required
              className="mt-1.5 h-24 resize-none"
            />
          </div>

          {/* Time Budget */}
          <div>
            <Label htmlFor="time_budget_hours" className="text-sm font-medium">Time Budget (hours)</Label>
            <Input
              id="time_budget_hours"
              type="number"
              step="0.5"
              value={formData.time_budget_hours || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, time_budget_hours: e.target.value ? Number(e.target.value) : 0 }))}
              placeholder="e.g., 40"
              className="mt-1.5 h-11"
            />
          </div>

          {/* Add People Section */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <Label className="text-blue-900 font-semibold text-sm">Project Access</Label>
              </div>
              <button
                type="button"
                onClick={() => setShowPeopleSelector(!showPeopleSelector)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                Add People
                <ChevronDown className={cn("w-4 h-4 transition-transform", showPeopleSelector && "rotate-180")} />
              </button>
            </div>

            {/* Selected Members Display */}
            {formData.team_members.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.team_members.map(email => (
                  <div 
                    key={email} 
                    className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border border-blue-200 text-sm"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-medium">
                      {getInitials(getMemberName(email))}
                    </div>
                    <span className="text-slate-700">{getMemberName(email)}</span>
                    {email !== currentUserEmail && (
                      <button
                        type="button"
                        onClick={() => toggleTeamMember(email)}
                        className="text-slate-400 hover:text-red-500 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-blue-600 mb-3">Only you will have access to this project</p>
            )}

            {/* People Selector */}
            {showPeopleSelector && (
              <div className="mt-3 pt-3 border-t border-blue-200 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    placeholder="Search people..."
                    className="pl-8 h-9 text-sm bg-white"
                  />
                </div>

                {/* Teams (UserGroups) */}
                {userGroups.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-700 mb-2">Add by Team</p>
                    <div className="flex flex-wrap gap-2">
                      {userGroups.map(group => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => addGroupMembers(group)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span>{group.name}</span>
                          <span className="text-xs text-slate-400">({group.member_emails?.length || 0})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Members */}
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-2">Add Individual</p>
                  <div className="max-h-40 overflow-y-auto space-y-1 bg-white rounded-lg border border-blue-200 p-2">
                    {teamMembers
                      .filter(m => 
                        !formData.team_members.includes(m.email) &&
                        (m.name?.toLowerCase().includes(peopleSearch.toLowerCase()) ||
                         m.email?.toLowerCase().includes(peopleSearch.toLowerCase()))
                      )
                      .map(member => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleTeamMember(member.email)}
                          className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium",
                            member.avatar_color || "bg-blue-500"
                          )}>
                            {getInitials(member.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{member.name}</p>
                            <p className="text-xs text-slate-500 truncate">{member.email}</p>
                          </div>
                        </button>
                      ))
                    }
                    {teamMembers.filter(m => 
                      !formData.team_members.includes(m.email) &&
                      (m.name?.toLowerCase().includes(peopleSearch.toLowerCase()) ||
                       m.email?.toLowerCase().includes(peopleSearch.toLowerCase()))
                    ).length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-3">
                        {peopleSearch ? 'No matching people' : 'All team members added'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Template & Color Row */}
          <div className="flex items-center gap-2">
            {/* Template Picker Button - only show when creating new project */}
            {!project && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-2 h-10 px-3 rounded-lg border transition-all text-sm",
                      selectedTemplate && selectedTemplate !== 'none'
                        ? "border-[#0069AF] bg-[#0069AF]/5 text-[#0069AF]"
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                    )}
                  >
                    <FileStack className="w-4 h-4" />
                    <span>{selectedTemplate && selectedTemplate !== 'none' 
                      ? templates.find(t => t.id === selectedTemplate)?.name || 'Template' 
                      : 'Template'}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <p className="text-xs font-medium text-slate-500 px-2 py-1.5">Start with a template</p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('none')}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm transition-colors",
                        (!selectedTemplate || selectedTemplate === 'none') 
                          ? "bg-slate-100 text-slate-900" 
                          : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <X className="w-4 h-4 text-slate-400" />
                      No Template
                    </button>
                    {templates.length > 0 ? templates.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplate(t.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm transition-colors",
                          selectedTemplate === t.id 
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
                        {selectedTemplate === t.id && <Check className="w-4 h-4" />}
                      </button>
                    )) : (
                      <p className="text-xs text-slate-400 px-2 py-2">No templates yet</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Color Picker Button */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors"
                >
                  <div 
                    className="w-5 h-5 rounded-full shadow-sm"
                    style={{ backgroundColor: colorOptions.find(c => c.value === formData.color)?.color || '#64748b' }}
                  />
                  <span className="text-sm text-slate-600 capitalize">{formData.color}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <p className="text-xs font-medium text-slate-500 mb-2">Project Color</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {colorOptions.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: c.value }))}
                      className={cn(
                        "w-6 h-6 rounded-full transition-all",
                        formData.color === c.value 
                          ? "ring-2 ring-offset-1 ring-slate-400 scale-110" 
                          : "hover:scale-110"
                      )}
                      style={{ backgroundColor: c.color }}
                      title={c.value}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Optional Dates Toggle */}
          <div>
            {!showDates ? (
              <button
                type="button"
                onClick={() => setShowDates(true)}
                className="flex items-center gap-2 text-sm text-[#0069AF] hover:text-[#005a9e] font-medium transition-colors"
              >
                <Clock className="w-4 h-4" />
                Add start & due dates
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Project Dates</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDates(false);
                      setFormData(prev => ({ ...prev, start_date: '', due_date: '' }));
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1 justify-start font-normal h-10 text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                          {formData.start_date ? format(new Date(formData.start_date.split('T')[0] + 'T12:00:00'), 'MMM d, yyyy') : 'Pick date'}
                        </Button>
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
                  <div>
                    <Label className="text-xs text-slate-500">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1 justify-start font-normal h-10 text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
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
              </div>
            )}
          </div>



          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="px-6">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-[#0F2F44] hover:bg-[#1a4a6e] px-6" 
              disabled={saving || !formData.name || !formData.customer_id || !formData.description}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {project ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
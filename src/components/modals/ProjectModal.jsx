import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Upload, Loader2, FileText, Users, Search, Building2, User, Check } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function ProjectModal({ open, onClose, project, templates = [], onSave, onPartsExtracted, prefillData }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client: '',
    customer_id: '',
    status: 'planning',
    start_date: '',
    due_date: '',
    color: 'slate',
    group: '',
    user_groups: [],
    time_budget_hours: 0
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [extractedParts, setExtractedParts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

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

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        client: project.client || '',
        customer_id: project.customer_id || '',
        status: project.status || 'planning',
        start_date: project.start_date || '',
        due_date: project.due_date || '',
        color: project.color || 'slate',
        group: project.group || '',
        user_groups: project.user_groups || [],
        time_budget_hours: project.time_budget_hours || 0
      });
      setExtractedParts([]);
    } else if (prefillData) {
      // Try to find customer by name if ID is missing
      let customerId = prefillData.customer_id || '';
      if (!customerId && prefillData.client && customers.length > 0) {
        const found = customers.find(c => c.name?.toLowerCase() === prefillData.client.toLowerCase() || c.company?.toLowerCase() === prefillData.client.toLowerCase());
        if (found) customerId = found.id;
      }

      setFormData({
        name: prefillData.name || '',
        description: '',
        client: prefillData.client || '',
        customer_id: customerId,
        status: 'planning',
        start_date: '',
        due_date: '',
        color: 'slate',
        group: '',
        user_groups: [],
        time_budget_hours: 0
      });
      // Convert proposal items to parts
      if (prefillData.proposalItems) {
        setExtractedParts(prefillData.proposalItems.map(item => ({
          name: item.name,
          quantity: item.quantity || 1,
          unit_cost: item.unit_cost || 0,
          description: item.description || ''
        })));
      }
    } else {
      setFormData({
        name: '',
        description: '',
        client: '',
        customer_id: '',
        status: 'planning',
        start_date: '',
        due_date: '',
        color: 'slate',
        group: '',
        user_groups: [],
        time_budget_hours: 0
      });
      setExtractedParts([]);
    }
    setSelectedTemplate('');
  }, [project, open, prefillData]);

  const toggleUserGroup = (groupId) => {
    setFormData(prev => ({
      ...prev,
      user_groups: prev.user_groups.includes(groupId)
        ? prev.user_groups.filter(id => id !== groupId)
        : [...prev.user_groups, groupId]
    }));
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const template = selectedTemplate && selectedTemplate !== 'none' ? templates.find(t => t.id === selectedTemplate) : null;
    onSave(formData, template, extractedParts);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Office Network Upgrade"
              required
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <Label htmlFor="client">Client</Label>
                            <div className="relative mt-1.5">
                              <div 
                                className={cn(
                                  "flex items-center gap-2 w-full h-10 px-3 rounded-md border bg-white cursor-pointer transition-all",
                                  showCustomerDropdown ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200 hover:border-slate-300"
                                )}
                                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                              >
                                {formData.customer_id ? (
                                  <>
                                    <Building2 className="w-4 h-4 text-indigo-500" />
                                    <span className="flex-1 text-sm truncate">{formData.client}</span>
                                  </>
                                ) : (
                                  <>
                                    <Search className="w-4 h-4 text-slate-400" />
                                    <span className="flex-1 text-sm text-slate-400">Select customer...</span>
                                  </>
                                )}
                              </div>
                              
                              {showCustomerDropdown && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg max-h-64 overflow-hidden">
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
                                              ? "bg-indigo-50 text-indigo-700" 
                                              : "hover:bg-slate-50"
                                          )}
                                        >
                                          <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center",
                                            customer.type === 'company' ? "bg-indigo-100" : "bg-slate-100"
                                          )}>
                                            {customer.type === 'company' ? (
                                              <Building2 className="w-4 h-4 text-indigo-600" />
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
                                            <Check className="w-4 h-4 text-indigo-600" />
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
                            {/* Click outside to close */}
                            {showCustomerDropdown && (
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setShowCustomerDropdown(false)}
                              />
                            )}
                          </div>
                          <div>
                            <Label htmlFor="time_budget_hours">Time Budget (hours)</Label>
                            <Input
                              id="time_budget_hours"
                              type="number"
                              step="0.5"
                              value={formData.time_budget_hours || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, time_budget_hours: e.target.value ? Number(e.target.value) : 0 }))}
                              placeholder="e.g., 40"
                              className="mt-1.5"
                            />
                          </div>
                        </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Project details..."
              className="mt-1.5 h-20"
            />
          </div>

          {!project && (
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <Label className="text-indigo-900 font-semibold">Create from Template</Label>
              <p className="text-xs text-indigo-600 mb-2">Start with predefined tasks and parts</p>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="mt-1.5 bg-white">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Template - Start Fresh</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.default_tasks?.length > 0 && ` (${t.default_tasks.length} tasks)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}



          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Color</Label>
              <Select value={formData.color} onValueChange={(v) => setFormData(prev => ({ ...prev, color: v }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['slate', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'].map(c => (
                    <SelectItem key={c} value={c}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-${c}-500`} style={{ backgroundColor: `var(--${c}-500, ${c === 'slate' ? '#64748b' : c === 'red' ? '#ef4444' : c === 'orange' ? '#f97316' : c === 'amber' ? '#f59e0b' : c === 'yellow' ? '#eab308' : c === 'lime' ? '#84cc16' : c === 'green' ? '#22c55e' : c === 'emerald' ? '#10b981' : c === 'teal' ? '#14b8a6' : c === 'cyan' ? '#06b6d4' : c === 'sky' ? '#0ea5e9' : c === 'blue' ? '#3b82f6' : c === 'indigo' ? '#6366f1' : c === 'violet' ? '#8b5cf6' : c === 'purple' ? '#a855f7' : c === 'fuchsia' ? '#d946ef' : c === 'pink' ? '#ec4899' : '#f43f5e'})` }} />
                        <span className="capitalize">{c}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="group">Project Group</Label>
              <Input
                id="group"
                value={formData.group}
                onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
                placeholder="e.g., Client A, Phase 1"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* User Groups Access */}
          {userGroups.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-slate-600" />
                <Label className="text-slate-900 font-semibold">Access Control</Label>
              </div>
              <p className="text-xs text-slate-500 mb-3">Select which user groups can access this project</p>
              <div className="space-y-2">
                {userGroups.map((group) => (
                  <label
                    key={group.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      formData.user_groups.includes(group.id)
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <Checkbox
                      checked={formData.user_groups.includes(group.id)}
                      onCheckedChange={() => toggleUserGroup(group.id)}
                    />
                    <div className="flex-1">
                      <span className="font-medium text-slate-900">{group.name}</span>
                      {group.member_emails?.length > 0 && (
                        <span className="text-xs text-slate-500 ml-2">
                          ({group.member_emails.length} members)
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              {formData.user_groups.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">No groups selected - project will be visible to all users</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(new Date(formData.start_date), 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(new Date(formData.due_date), 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date ? new Date(formData.due_date) : undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {project ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
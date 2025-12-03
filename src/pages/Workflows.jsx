import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Zap, Plus, Edit2, Trash2, MoreHorizontal, Play, Pause,
  Mail, Bell, ListTodo, Users, FileText, Clock, CheckCircle2,
  ArrowRight, Activity, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const triggerTypes = {
  project_status_change: { label: 'Project Status Change', icon: Activity, color: 'bg-blue-500' },
  proposal_accepted: { label: 'Proposal Accepted', icon: CheckCircle2, color: 'bg-green-500' },
  proposal_sent: { label: 'Proposal Sent', icon: Mail, color: 'bg-indigo-500' },
  task_completed: { label: 'Task Completed', icon: ListTodo, color: 'bg-emerald-500' },
  task_overdue: { label: 'Task Overdue', icon: Clock, color: 'bg-red-500' },
  part_received: { label: 'Part Received', icon: CheckCircle2, color: 'bg-amber-500' },
  part_installed: { label: 'Part Installed', icon: CheckCircle2, color: 'bg-teal-500' },
  new_customer: { label: 'New Customer Created', icon: Users, color: 'bg-purple-500' },
  quote_request_created: { label: 'Quote Request Created', icon: FileText, color: 'bg-orange-500' },
};

const actionTypes = {
  send_email: { label: 'Send Email', icon: Mail, color: 'text-blue-600' },
  send_notification: { label: 'Send Notification', icon: Bell, color: 'text-amber-600' },
  create_task: { label: 'Create Task', icon: ListTodo, color: 'text-indigo-600' },
  assign_task: { label: 'Assign Task', icon: Users, color: 'text-green-600' },
  update_project_status: { label: 'Update Project Status', icon: Activity, color: 'text-purple-600' },
  create_invoice_draft: { label: 'Create Invoice Draft', icon: FileText, color: 'text-emerald-600' },
  add_note: { label: 'Add Note', icon: FileText, color: 'text-slate-600' },
};

export default function Workflows() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('workflows');

  const { data: workflows = [], refetch } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => base44.entities.Workflow.list('-created_date')
  });

  const { data: workflowLogs = [] } = useQuery({
    queryKey: ['workflowLogs'],
    queryFn: () => base44.entities.WorkflowLog.list('-created_date', 50)
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const handleSave = async (data) => {
    if (editingWorkflow) {
      await base44.entities.Workflow.update(editingWorkflow.id, data);
    } else {
      await base44.entities.Workflow.create(data);
    }
    refetch();
    setShowModal(false);
    setEditingWorkflow(null);
  };

  const handleDelete = async () => {
    await base44.entities.Workflow.delete(deleteConfirm.id);
    refetch();
    setDeleteConfirm(null);
  };

  const handleToggleActive = async (workflow) => {
    await base44.entities.Workflow.update(workflow.id, { ...workflow, is_active: !workflow.is_active });
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-[#0069AF] shadow-lg shadow-[#0069AF]/20">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Workflows</h1>
            </div>
            <p className="text-slate-500">Automate actions based on triggers</p>
          </div>
          <Button onClick={() => { setEditingWorkflow(null); setShowModal(true); }} className="bg-[#0069AF] hover:bg-[#133F5C]">
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="workflows" className="gap-2">
              <Zap className="w-4 h-4" />
              Workflows ({workflows.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflows">
            <div className="grid gap-4">
              {workflows.length === 0 ? (
                <div className="bg-white rounded-2xl border p-12 text-center">
                  <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No workflows yet</h3>
                  <p className="text-slate-500 mb-4">Create your first workflow to automate repetitive tasks</p>
                  <Button onClick={() => setShowModal(true)} className="bg-[#0069AF] hover:bg-[#133F5C]">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Workflow
                  </Button>
                </div>
              ) : (
                workflows.map((workflow, idx) => {
                  const trigger = triggerTypes[workflow.trigger_type];
                  const TriggerIcon = trigger?.icon || Zap;
                  return (
                    <motion.div
                      key={workflow.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        "bg-white rounded-xl border p-5 hover:shadow-md transition-all",
                        !workflow.is_active && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn("p-2.5 rounded-xl text-white", trigger?.color || 'bg-slate-500')}>
                            <TriggerIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{workflow.name}</h3>
                            {workflow.description && (
                              <p className="text-sm text-slate-500 mt-0.5">{workflow.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="outline" className="text-xs">
                                {trigger?.label || workflow.trigger_type}
                              </Badge>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <div className="flex gap-1">
                                {workflow.actions?.map((action, i) => {
                                  const actionConfig = actionTypes[action.action_type];
                                  const ActionIcon = actionConfig?.icon || Zap;
                                  return (
                                    <Badge key={i} variant="outline" className={cn("text-xs gap-1", actionConfig?.color)}>
                                      <ActionIcon className="w-3 h-3" />
                                      {actionConfig?.label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                            {workflow.trigger_count > 0 && (
                              <p className="text-xs text-slate-400 mt-2">
                                Triggered {workflow.trigger_count} times
                                {workflow.last_triggered && ` • Last: ${format(new Date(workflow.last_triggered), 'MMM d, h:mm a')}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={workflow.is_active}
                            onCheckedChange={() => handleToggleActive(workflow)}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingWorkflow(workflow); setShowModal(true); }}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteConfirm(workflow)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-4 border-b bg-slate-50">
                <h3 className="font-semibold text-slate-900">Recent Workflow Executions</h3>
              </div>
              {workflowLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No workflow executions yet
                </div>
              ) : (
                <div className="divide-y">
                  {workflowLogs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{log.workflow_name}</p>
                          <p className="text-sm text-slate-500">
                            {triggerTypes[log.trigger_type]?.label || log.trigger_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={cn(
                            log.status === 'success' ? 'bg-green-100 text-green-700' :
                            log.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          )}>
                            {log.status}
                          </Badge>
                          <p className="text-xs text-slate-400 mt-1">
                            {format(new Date(log.created_date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <WorkflowModal
          open={showModal}
          onClose={() => { setShowModal(false); setEditingWorkflow(null); }}
          workflow={editingWorkflow}
          teamMembers={teamMembers}
          onSave={handleSave}
        />

        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this workflow and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function WorkflowModal({ open, onClose, workflow, teamMembers, onSave }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    trigger_type: '',
    trigger_conditions: {},
    actions: []
  });

  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name || '',
        description: workflow.description || '',
        is_active: workflow.is_active !== false,
        trigger_type: workflow.trigger_type || '',
        trigger_conditions: workflow.trigger_conditions || {},
        actions: workflow.actions || []
      });
      setStep(1);
    } else {
      setFormData({
        name: '',
        description: '',
        is_active: true,
        trigger_type: '',
        trigger_conditions: {},
        actions: []
      });
      setStep(1);
    }
  }, [workflow, open]);

  const addAction = (actionType) => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { action_type: actionType, config: {} }]
    }));
  };

  const updateAction = (index, config) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((a, i) => i === index ? { ...a, config: { ...a.config, ...config } } : a)
    }));
  };

  const removeAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workflow ? 'Edit Workflow' : 'Create Workflow'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={cn(
                  "flex-1 h-2 rounded-full transition-colors",
                  step >= s ? "bg-[#0069AF]" : "bg-slate-200"
                )}
              />
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Basic Information</h3>
              <div>
                <Label>Workflow Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Notify on Proposal Accepted"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="What does this workflow do?"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 2: Trigger */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Select Trigger</h3>
              <p className="text-sm text-slate-500">Choose what event starts this workflow</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(triggerTypes).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setFormData(p => ({ ...p, trigger_type: key }))}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all hover:shadow-md",
                        formData.trigger_type === key
                          ? "border-[#0069AF] bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white mb-2", config.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="font-medium text-slate-900">{config.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Actions */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Configure Actions</h3>
              <p className="text-sm text-slate-500">Add actions to execute when triggered</p>

              {formData.actions.length > 0 && (
                <div className="space-y-3">
                  {formData.actions.map((action, idx) => {
                    const actionConfig = actionTypes[action.action_type];
                    const ActionIcon = actionConfig?.icon || Zap;
                    return (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ActionIcon className={cn("w-4 h-4", actionConfig?.color)} />
                            <span className="font-medium">{actionConfig?.label}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeAction(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>

                        {/* Action-specific config */}
                        {action.action_type === 'send_email' && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs">To (use {{customer_email}} for dynamic)</Label>
                              <Input
                                value={action.config.email_to || ''}
                                onChange={(e) => updateAction(idx, { email_to: e.target.value })}
                                placeholder="{{customer_email}} or specific@email.com"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Subject</Label>
                              <Input
                                value={action.config.email_subject || ''}
                                onChange={(e) => updateAction(idx, { email_subject: e.target.value })}
                                placeholder="Your proposal has been accepted!"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Body</Label>
                              <Textarea
                                value={action.config.email_body || ''}
                                onChange={(e) => updateAction(idx, { email_body: e.target.value })}
                                placeholder="Use {{project_name}}, {{customer_name}}, etc."
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}

                        {action.action_type === 'send_notification' && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs">Notify</Label>
                              <select
                                value={action.config.assignee_email || ''}
                                onChange={(e) => updateAction(idx, { assignee_email: e.target.value })}
                                className="mt-1 w-full h-10 rounded-md border px-3 text-sm"
                              >
                                <option value="">Select team member</option>
                                {teamMembers.map(m => (
                                  <option key={m.id} value={m.email}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs">Message</Label>
                              <Textarea
                                value={action.config.notification_message || ''}
                                onChange={(e) => updateAction(idx, { notification_message: e.target.value })}
                                placeholder="A new proposal was accepted for {{project_name}}"
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}

                        {action.action_type === 'create_task' && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs">Task Title</Label>
                              <Input
                                value={action.config.task_title || ''}
                                onChange={(e) => updateAction(idx, { task_title: e.target.value })}
                                placeholder="Follow up with {{customer_name}}"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Assign To</Label>
                              <select
                                value={action.config.assignee_email || ''}
                                onChange={(e) => updateAction(idx, { assignee_email: e.target.value })}
                                className="mt-1 w-full h-10 rounded-md border px-3 text-sm"
                              >
                                <option value="">Select team member</option>
                                {teamMembers.map(m => (
                                  <option key={m.id} value={m.email}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs">Description</Label>
                              <Textarea
                                value={action.config.task_description || ''}
                                onChange={(e) => updateAction(idx, { task_description: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}

                        {action.action_type === 'add_note' && (
                          <div>
                            <Label className="text-xs">Note Content</Label>
                            <Textarea
                              value={action.config.note_content || ''}
                              onChange={(e) => updateAction(idx, { note_content: e.target.value })}
                              placeholder="Proposal accepted on {{date}}"
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-sm text-slate-500 mb-3">Add an action:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(actionTypes).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={() => addAction(key)}
                        className="gap-1"
                      >
                        <Icon className={cn("w-3 h-3", config.color)} />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !formData.name || step === 2 && !formData.trigger_type}
                className="bg-[#0069AF] hover:bg-[#133F5C]"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={formData.actions.length === 0}
                className="bg-[#0069AF] hover:bg-[#133F5C]"
              >
                {workflow ? 'Update Workflow' : 'Create Workflow'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
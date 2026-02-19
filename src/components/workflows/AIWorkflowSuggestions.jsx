import { useState } from 'react';
import { api } from '@/api/apiClient';
import { 
  Sparkles, Loader2, Zap, Mail, Bell, ListTodo, 
  CheckCircle2, Clock, Users, FileText, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const triggerIcons = {
  proposal_accepted: CheckCircle2,
  proposal_sent: Mail,
  task_completed: ListTodo,
  task_overdue: Clock,
  part_received: CheckCircle2,
  part_installed: CheckCircle2,
  new_customer: Users,
  quote_request_created: FileText,
  project_status_change: Zap,
  invoice_created: FileText
};

const triggerColors = {
  proposal_accepted: 'bg-emerald-500',
  proposal_sent: 'bg-indigo-500',
  task_completed: 'bg-green-500',
  task_overdue: 'bg-red-500',
  part_received: 'bg-amber-500',
  part_installed: 'bg-teal-500',
  new_customer: 'bg-purple-500',
  quote_request_created: 'bg-orange-500',
  project_status_change: 'bg-blue-500',
  invoice_created: 'bg-cyan-500'
};

const commonWorkflows = [
  {
    name: "Notify on Proposal Accepted",
    description: "Send notification when a proposal is approved",
    trigger_type: "proposal_accepted",
    actions: [
      { action_type: "send_notification", config: { notification_message: "Proposal {{proposal_title}} has been accepted by {{customer_name}}!" } },
      { action_type: "create_task", config: { task_title: "Schedule kickoff meeting for {{project_name}}" } }
    ]
  },
  {
    name: "Task Overdue Alert",
    description: "Alert assignee and manager when task becomes overdue",
    trigger_type: "task_overdue",
    actions: [
      { action_type: "send_email", config: { email_subject: "Task Overdue: {{task_title}}", email_body: "The task '{{task_title}}' is now overdue. Please update the status." } }
    ]
  },
  {
    name: "Welcome New Customer",
    description: "Send welcome email when new customer is created",
    trigger_type: "new_customer",
    actions: [
      { action_type: "send_email", config: { email_to: "{{customer_email}}", email_subject: "Welcome to {{company_name}}!", email_body: "Thank you for choosing us. We look forward to working with you." } }
    ]
  },
  {
    name: "Part Received Notification",
    description: "Notify installer when part is received",
    trigger_type: "part_received",
    actions: [
      { action_type: "send_notification", config: { notification_message: "Part {{part_name}} has been received and is ready for installation." } }
    ]
  },
  {
    name: "Invoice Created Alert",
    description: "Notify accounting when invoice is created",
    trigger_type: "invoice_created",
    actions: [
      { action_type: "send_notification", config: { notification_message: "New invoice created for {{customer_name}}" } }
    ]
  }
];

export default function AIWorkflowSuggestions({ existingWorkflows = [], onCreateWorkflow }) {
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAI, setShowAI] = useState(false);

  const generateAISuggestions = async () => {
    setLoading(true);
    setShowAI(true);

    const existingTriggers = existingWorkflows.map(w => w.trigger_type);
    
    const prompt = `Based on a project management system with the following existing workflows: ${existingWorkflows.map(w => w.name).join(', ') || 'None yet'}

The system has these available triggers:
- proposal_accepted: When customer approves a proposal
- proposal_sent: When proposal is emailed
- task_completed: When task is marked complete
- task_overdue: When task passes due date
- part_received: When ordered part arrives
- part_installed: When part is installed
- new_customer: When customer record is created
- project_status_change: When project status changes
- invoice_created: When invoice is generated

Available actions:
- send_email: Send email (needs email_to, email_subject, email_body)
- send_notification: In-app notification (needs notification_message)
- create_task: Create new task (needs task_title, task_description)
- add_note: Add note to project

Suggest 3 useful automation workflows that DON'T already exist. Focus on common business needs like follow-ups, reminders, and team coordination.`;

    const result = await api.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                trigger_type: { type: "string" },
                actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action_type: { type: "string" },
                      config: { type: "object" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    setAiSuggestions(result.suggestions || []);
    setLoading(false);
  };

  const handleQuickCreate = (workflow) => {
    onCreateWorkflow({
      ...workflow,
      is_active: true
    });
  };

  // Filter out workflows that already exist
  const availableCommon = commonWorkflows.filter(
    cw => !existingWorkflows.some(ew => ew.trigger_type === cw.trigger_type && ew.name === cw.name)
  );

  return (
    <div className="space-y-6">
      {/* Quick Setup Templates */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Quick Setup Templates
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          {availableCommon.slice(0, 4).map((workflow, idx) => {
            const TriggerIcon = triggerIcons[workflow.trigger_type] || Zap;
            return (
              <div
                key={idx}
                className="p-4 bg-white rounded-xl border hover:border-[#0069AF] hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg text-white", triggerColors[workflow.trigger_type] || 'bg-slate-500')}>
                    <TriggerIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 text-sm">{workflow.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{workflow.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {workflow.actions.map((a, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {a.action_type.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleQuickCreate(workflow)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {availableCommon.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">All common templates already created!</p>
        )}
      </div>

      {/* AI Suggestions */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            AI-Powered Suggestions
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={generateAISuggestions}
            disabled={loading}
            className="gap-1"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {showAI ? 'Regenerate' : 'Get Suggestions'}
          </Button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Analyzing your workflows...</p>
          </div>
        )}

        {showAI && !loading && aiSuggestions.length > 0 && (
          <div className="space-y-3">
            {aiSuggestions.map((workflow, idx) => {
              const TriggerIcon = triggerIcons[workflow.trigger_type] || Zap;
              return (
                <div
                  key={idx}
                  className="p-4 bg-purple-50 rounded-xl border border-purple-200 hover:border-purple-300 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg text-white", triggerColors[workflow.trigger_type] || 'bg-purple-500')}>
                      <TriggerIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900 text-sm">{workflow.name}</h4>
                        <Badge className="bg-purple-100 text-purple-700 text-[10px]">AI</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{workflow.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {workflow.actions?.map((a, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {a.action_type?.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleQuickCreate(workflow)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Create
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showAI && !loading && aiSuggestions.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No additional suggestions available</p>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Sparkles, Loader2, ListTree, MessageSquare, 
  Lightbulb, FileText, ChevronDown, ChevronUp,
  Plus, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function AITaskAssistant({ task, project, onSubTasksGenerated, onPriorityUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const [suggestedPriority, setSuggestedPriority] = useState(null);
  const [subTasks, setSubTasks] = useState([]);
  const [summary, setSummary] = useState('');
  const [draftReply, setDraftReply] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSuggestPriority = async () => {
    setLoading('priority');
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze this task and suggest an appropriate priority level (low, medium, or high).

Task Title: ${task.title}
Task Description: ${task.description || 'No description'}
Project Name: ${project?.name || 'Unknown'}
Project Due Date: ${project?.due_date || 'Not set'}
Task Due Date: ${task.due_date || 'Not set'}
Current Status: ${task.status}

Consider:
1. How urgent is this based on due dates?
2. How important is this for the project's success?
3. Dependencies or blockers

Respond with JSON only.`,
        response_json_schema: {
          type: 'object',
          properties: {
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            reasoning: { type: 'string' }
          },
          required: ['priority', 'reasoning']
        }
      });
      setSuggestedPriority(result);
    } catch (err) {
      console.error('Failed to suggest priority:', err);
    }
    setLoading(null);
  };

  const handleGenerateSubTasks = async () => {
    setLoading('subtasks');
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Break down this task into smaller, actionable sub-tasks.

Task Title: ${task.title}
Task Description: ${task.description || 'No description provided'}
Project Context: ${project?.name || 'Unknown project'}

Generate 3-6 specific, actionable sub-tasks that would help complete this main task.
Each sub-task should be clear and completable in a reasonable time.

Respond with JSON only.`,
        response_json_schema: {
          type: 'object',
          properties: {
            subtasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  estimated_time: { type: 'string' }
                }
              }
            }
          },
          required: ['subtasks']
        }
      });
      setSubTasks(result.subtasks || []);
    } catch (err) {
      console.error('Failed to generate sub-tasks:', err);
    }
    setLoading(null);
  };

  const handleSummarize = async () => {
    setLoading('summary');
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Summarize this task in 2-3 concise sentences:

Task Title: ${task.title}
Task Description: ${task.description || 'No description'}
Status: ${task.status}
Priority: ${task.priority}
Assigned to: ${task.assigned_name || 'Unassigned'}
Due date: ${task.due_date || 'Not set'}

Provide a brief, actionable summary.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' }
          },
          required: ['summary']
        }
      });
      setSummary(result.summary);
    } catch (err) {
      console.error('Failed to summarize:', err);
    }
    setLoading(null);
  };

  const handleDraftReply = async () => {
    setLoading('reply');
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Draft a professional response or update for this task:

Task Title: ${task.title}
Task Description: ${task.description || 'No description'}
Current Status: ${task.status}
Assigned to: ${task.assigned_name || 'Unassigned'}

Generate a brief, professional message that could be used as a task comment or status update. Keep it concise and actionable.`,
        response_json_schema: {
          type: 'object',
          properties: {
            reply: { type: 'string' }
          },
          required: ['reply']
        }
      });
      setDraftReply(result.reply);
    } catch (err) {
      console.error('Failed to draft reply:', err);
    }
    setLoading(null);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const priorityColors = {
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-red-100 text-red-700 border-red-200'
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-between bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-200 hover:border-violet-300"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-violet-700 font-medium">AI Assistant</span>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-violet-500" /> : <ChevronDown className="w-4 h-4 text-violet-500" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-4 bg-gradient-to-br from-violet-50/50 to-indigo-50/50 rounded-xl border border-violet-100 space-y-4"
        >
          {/* AI Actions Grid */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuggestPriority}
              disabled={loading === 'priority'}
              className="justify-start h-auto py-2 px-3"
            >
              {loading === 'priority' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
              )}
              <span className="text-xs">Suggest Priority</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateSubTasks}
              disabled={loading === 'subtasks'}
              className="justify-start h-auto py-2 px-3"
            >
              {loading === 'subtasks' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ListTree className="w-4 h-4 mr-2 text-blue-500" />
              )}
              <span className="text-xs">Generate Sub-tasks</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSummarize}
              disabled={loading === 'summary'}
              className="justify-start h-auto py-2 px-3"
            >
              {loading === 'summary' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2 text-emerald-500" />
              )}
              <span className="text-xs">Summarize Task</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDraftReply}
              disabled={loading === 'reply'}
              className="justify-start h-auto py-2 px-3"
            >
              {loading === 'reply' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2 text-violet-500" />
              )}
              <span className="text-xs">Draft Reply</span>
            </Button>
          </div>

          {/* Results */}
          <AnimatePresence>
            {suggestedPriority && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-white rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">Suggested Priority</span>
                  <Badge className={cn("text-xs", priorityColors[suggestedPriority.priority])}>
                    {suggestedPriority.priority}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">{suggestedPriority.reasoning}</p>
                {onPriorityUpdate && suggestedPriority.priority !== task.priority && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full text-xs"
                    onClick={() => onPriorityUpdate(suggestedPriority.priority)}
                  >
                    Apply this priority
                  </Button>
                )}
              </motion.div>
            )}

            {subTasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-white rounded-lg border border-slate-200"
              >
                <span className="text-xs font-medium text-slate-500 mb-2 block">Generated Sub-tasks</span>
                <div className="space-y-2">
                  {subTasks.map((st, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-medium mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900">{st.title}</p>
                        {st.description && (
                          <p className="text-[10px] text-slate-500 mt-0.5">{st.description}</p>
                        )}
                        {st.estimated_time && (
                          <Badge variant="outline" className="text-[10px] mt-1">{st.estimated_time}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {onSubTasksGenerated && (
                  <Button
                    size="sm"
                    className="mt-3 w-full text-xs bg-blue-600 hover:bg-blue-700"
                    onClick={() => onSubTasksGenerated(subTasks)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create these as tasks
                  </Button>
                )}
              </motion.div>
            )}

            {summary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-white rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">Summary</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleCopy(summary)}
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-700">{summary}</p>
              </motion.div>
            )}

            {draftReply && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-white rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">Draft Reply</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleCopy(draftReply)}
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <Textarea
                  value={draftReply}
                  onChange={(e) => setDraftReply(e.target.value)}
                  className="text-xs min-h-[60px] resize-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}
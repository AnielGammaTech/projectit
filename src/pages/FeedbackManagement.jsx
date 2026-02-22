import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  ExternalLink,
  Trash2,
  CheckCircle,
  Clock,
  Eye,
  X,
  Image,
  ChevronLeft,
  Bot,
  Sparkles,
  Loader2,
  RefreshCw,
  Cpu,
  CheckSquare,
  Square,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const typeConfig = {
  bug: { label: 'Bug', icon: Bug, color: 'bg-red-100 text-red-700 border-red-200' },
  feature_request: { label: 'Feature', icon: Lightbulb, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  question: { label: 'Question', icon: HelpCircle, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  general: { label: 'General', icon: MessageCircle, color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', icon: null },
  in_review: { label: 'In Review', color: 'bg-amber-100 text-amber-700', icon: null },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
};

const aiStatusConfig = {
  pending: { label: 'AI Pending', color: 'bg-violet-100 text-violet-700' },
  in_progress: { label: 'AI Working', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'AI Done', color: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'AI Failed', color: 'bg-red-100 text-red-700' },
};

export default function FeedbackManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, feedback: null });
  const [sendingAI, setSendingAI] = useState(null);
  const [refreshingAI, setRefreshingAI] = useState(null);

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchSending, setBatchSending] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  // AI config state
  const [aiConfig, setAiConfig] = useState({ gammaai_enabled: false, has_local_ai: false });

  const { data: feedbackList = [], isLoading } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => api.entities.Feedback.list('-created_date')
  });

  // Load AI config on mount
  useEffect(() => {
    api.functions.invoke('agentBridge', { action: 'getConfig' })
      .then(r => { if (r.data) setAiConfig(r.data); })
      .catch(() => {});
  }, []);

  const filteredFeedback = feedbackList.filter(f => {
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchesType = typeFilter === 'all' || f.type === typeFilter;
    return matchesStatus && matchesType;
  });

  const handleStatusChange = async (feedback, status) => {
    const finalStatus = status === 'resolved' ? 'closed' : status;
    await api.entities.Feedback.update(feedback.id, { status: finalStatus });
    queryClient.invalidateQueries({ queryKey: ['feedback'] });
    if (selectedFeedback?.id === feedback.id) {
      setSelectedFeedback({ ...selectedFeedback, status: finalStatus });
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.feedback) {
      await api.entities.Feedback.delete(deleteConfirm.feedback.id);
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      if (selectedFeedback?.id === deleteConfirm.feedback.id) {
        setSelectedFeedback(null);
      }
      setSelectedIds(prev => { const next = new Set(prev); next.delete(deleteConfirm.feedback.id); return next; });
    }
    setDeleteConfirm({ open: false, feedback: null });
  };

  const handleSendToAI = async (e, feedback) => {
    e.stopPropagation();
    setSendingAI(feedback.id);
    try {
      const response = await api.functions.invoke('agentBridge', {
        action: 'sendFeedback',
        feedback: {
          id: feedback.id,
          title: feedback.title,
          description: feedback.description,
          type: feedback.type,
          priority: feedback.priority,
          submitter_name: feedback.submitter_name,
          submitter_email: feedback.submitter_email,
          page_url: feedback.page_url,
        },
      });
      if (response.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['feedback'] });
      }
    } catch (err) {
      console.error('Failed to send to AI:', err);
    }
    setSendingAI(null);
  };

  const handleAnalyzeLocal = async (e, feedback) => {
    e.stopPropagation();
    setSendingAI(feedback.id);
    try {
      const response = await api.functions.invoke('agentBridge', {
        action: 'analyzeLocal',
        feedback: {
          id: feedback.id,
          title: feedback.title,
          description: feedback.description,
          type: feedback.type,
          priority: feedback.priority,
          submitter_name: feedback.submitter_name,
          submitter_email: feedback.submitter_email,
          page_url: feedback.page_url,
        },
      });
      if (response.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['feedback'] });
        if (selectedFeedback?.id === feedback.id) {
          const updated = await api.entities.Feedback.filter({ id: feedback.id });
          if (updated[0]) setSelectedFeedback(updated[0]);
        }
      }
    } catch (err) {
      console.error('Failed local AI analysis:', err);
    }
    setSendingAI(null);
  };

  const handleRefreshAIStatus = async (e, feedback) => {
    if (e) e.stopPropagation();
    if (!feedback.ai_task_id) return;
    setRefreshingAI(feedback.id);
    try {
      const response = await api.functions.invoke('agentBridge', {
        action: 'getTaskStatus',
        task_id: feedback.ai_task_id,
      });
      if (response.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['feedback'] });
        if (selectedFeedback?.id === feedback.id) {
          const updated = await api.entities.Feedback.filter({ id: feedback.id });
          if (updated[0]) setSelectedFeedback(updated[0]);
        }
      }
    } catch (err) {
      console.error('Failed to refresh AI status:', err);
    }
    setRefreshingAI(null);
  };

  // Batch selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFeedback.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFeedback.map(f => f.id)));
    }
  };

  const handleBatchSend = async () => {
    if (selectedIds.size === 0) return;
    setBatchSending(true);
    setBatchResult(null);
    try {
      const response = await api.functions.invoke('agentBridge', {
        action: 'sendBatch',
        feedback_ids: [...selectedIds],
      });
      if (response.data) {
        setBatchResult(response.data);
        queryClient.invalidateQueries({ queryKey: ['feedback'] });
        setSelectedIds(new Set());
      }
    } catch (err) {
      setBatchResult({ success: false, message: err.message || 'Batch send failed' });
    }
    setBatchSending(false);
  };

  const hasAnyAI = aiConfig.gammaai_enabled || aiConfig.has_local_ai;

  const stats = {
    new: feedbackList.filter(f => f.status === 'new').length,
    in_review: feedbackList.filter(f => f.status === 'in_review').length,
    resolved: feedbackList.filter(f => f.status === 'resolved' || f.status === 'closed').length,
    bugs: feedbackList.filter(f => f.type === 'bug').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl('Adminland')} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Adminland
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#0069AF] shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Feedback</h1>
                <p className="text-slate-500">{feedbackList.length} submissions</p>
              </div>
            </div>
            {/* Batch actions */}
            {selectedIds.size > 0 && hasAnyAI && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{selectedIds.size} selected</span>
                <Button
                  onClick={handleBatchSend}
                  disabled={batchSending}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  size="sm"
                >
                  {batchSending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Send {selectedIds.size} to AI</>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Batch result banner */}
        {batchResult && (
          <div className={cn(
            "mb-4 p-3 rounded-lg text-sm flex items-center justify-between",
            batchResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
          )}>
            <span>{batchResult.message}</span>
            <button onClick={() => setBatchResult(null)} className="text-current hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.new}</p>
                <p className="text-xs text-slate-500">New</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Eye className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.in_review}</p>
                <p className="text-xs text-slate-500">In Review</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.resolved}</p>
                <p className="text-xs text-slate-500">Resolved</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Bug className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.bugs}</p>
                <p className="text-xs text-slate-500">Bug Reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6 flex items-center gap-4">
          {hasAnyAI && filteredFeedback.length > 0 && (
            <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-700 px-2">
              {selectedIds.size === filteredFeedback.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </Button>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
              <SelectItem value="question">Question</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Feedback List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
              <p className="text-slate-400">Loading...</p>
            </div>
          ) : filteredFeedback.length > 0 ? (
            filteredFeedback.map((feedback, idx) => {
              const type = typeConfig[feedback.type] || typeConfig.general;
              const status = statusConfig[feedback.status] || statusConfig.new;
              const priority = priorityConfig[feedback.priority] || priorityConfig.medium;
              const TypeIcon = type.icon;
              const isSelected = selectedIds.has(feedback.id);

              return (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => setSelectedFeedback(feedback)}
                  className={cn(
                    "rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer group",
                    isSelected ? "bg-violet-50/50 border-violet-200" :
                    feedback.status === 'closed' || feedback.status === 'resolved'
                      ? "bg-emerald-50/50 border-emerald-200"
                      : "bg-white border-slate-100"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Batch checkbox */}
                    {hasAnyAI && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(feedback.id); }}
                        className="mt-1 text-slate-400 hover:text-violet-600 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-violet-600" />
                        ) : (
                          <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    )}
                    <div className={cn("p-2 rounded-lg", type.color.split(' ')[0])}>
                      <TypeIcon className={cn("w-5 h-5", type.color.split(' ')[1])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                          {(feedback.status === 'closed' || feedback.status === 'resolved') && (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          )}
                          {feedback.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge className={priority.color}>{priority.label}</Badge>
                          <Select
                            value={feedback.status}
                            onValueChange={(value) => handleStatusChange(feedback, value)}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="in_review">In Review</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                          {feedback.ai_status && (
                            <Badge className={cn("text-[10px]", aiStatusConfig[feedback.ai_status]?.color || 'bg-slate-100 text-slate-600')}>
                              {feedback.ai_provider === 'local' ? <Cpu className="w-3 h-3 mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                              {aiStatusConfig[feedback.ai_status]?.label || feedback.ai_status}
                            </Badge>
                          )}
                          {!feedback.ai_task_id && !feedback.ai_status ? (
                            <div className="flex items-center gap-1">
                              {aiConfig.gammaai_enabled && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-violet-500 hover:text-violet-600 hover:bg-violet-50 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => handleSendToAI(e, feedback)}
                                  disabled={sendingAI === feedback.id}
                                  title="Send to GammaAi Agent"
                                >
                                  {sendingAI === feedback.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                </Button>
                              )}
                              {aiConfig.has_local_ai && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => handleAnalyzeLocal(e, feedback)}
                                  disabled={sendingAI === feedback.id}
                                  title="Analyze with Claude AI"
                                >
                                  {sendingAI === feedback.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                                </Button>
                              )}
                            </div>
                          ) : (feedback.ai_status === 'pending' || feedback.ai_status === 'in_progress') && feedback.ai_provider !== 'local' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-violet-500 hover:text-violet-600 hover:bg-violet-50 opacity-0 group-hover:opacity-100"
                              onClick={(e) => handleRefreshAIStatus(e, feedback)}
                              disabled={refreshingAI === feedback.id}
                              title="Refresh AI Status"
                            >
                              {refreshingAI === feedback.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, feedback }); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{feedback.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                        <Badge variant="outline" className={type.color}>{type.label}</Badge>
                        <span>{feedback.submitter_name || 'Anonymous'}</span>
                        {feedback.submitter_email && <span>{feedback.submitter_email}</span>}
                        <span>{format(new Date(feedback.created_date), 'MMM d, yyyy h:mm a')}</span>
                        {feedback.screenshots?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Image className="w-3 h-3" />
                            {feedback.screenshots.length} screenshot{feedback.screenshots.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No feedback yet</h3>
              <p className="text-slate-500">Feedback submissions will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const type = typeConfig[selectedFeedback.type] || typeConfig.general;
                  const TypeIcon = type.icon;
                  return (
                    <Badge className={type.color}>
                      <TypeIcon className="w-3 h-3 mr-1" />
                      {type.label}
                    </Badge>
                  );
                })()}
                <Badge className={priorityConfig[selectedFeedback.priority]?.color}>
                  {priorityConfig[selectedFeedback.priority]?.label || 'Medium'}
                </Badge>
                <Select
                  value={selectedFeedback.status}
                  onValueChange={(value) => handleStatusChange(selectedFeedback, value)}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900">{selectedFeedback.title}</h3>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500">Description</label>
                <p className="text-slate-700 mt-1 whitespace-pre-wrap">{selectedFeedback.description}</p>
              </div>

              {selectedFeedback.screenshots?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-2 block">Screenshots</label>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedFeedback.screenshots.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={url} alt={`Screenshot ${idx + 1}`} className="rounded-lg border border-slate-200 hover:shadow-md transition-shadow" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis Section */}
              {(selectedFeedback.ai_task_id || selectedFeedback.ai_status) && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {selectedFeedback.ai_provider === 'local' ? (
                        <Cpu className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-violet-600" />
                      )}
                      <label className="text-sm font-medium text-slate-700">
                        {selectedFeedback.ai_provider === 'local' ? 'Claude AI Analysis' : 'AI Agent Analysis'}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedFeedback.ai_status && (
                        <Badge className={cn("text-[10px]", aiStatusConfig[selectedFeedback.ai_status]?.color)}>
                          {aiStatusConfig[selectedFeedback.ai_status]?.label || selectedFeedback.ai_status}
                        </Badge>
                      )}
                      {(selectedFeedback.ai_status === 'pending' || selectedFeedback.ai_status === 'in_progress') && selectedFeedback.ai_provider !== 'local' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-violet-600"
                          onClick={(e) => handleRefreshAIStatus(e, selectedFeedback)}
                          disabled={refreshingAI === selectedFeedback.id}
                        >
                          {refreshingAI === selectedFeedback.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                          Refresh
                        </Button>
                      )}
                    </div>
                  </div>

                  {selectedFeedback.ai_status === 'pending' && (
                    <div className="p-4 rounded-lg bg-violet-50 border border-violet-100 text-sm text-violet-700">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Task sent to AI agent. Waiting for analysis...
                      </div>
                      {selectedFeedback.ai_sent_at && (
                        <p className="text-xs text-violet-500 mt-1">Sent {format(new Date(selectedFeedback.ai_sent_at), 'MMM d, yyyy h:mm a')}</p>
                      )}
                    </div>
                  )}

                  {selectedFeedback.ai_status === 'in_progress' && (
                    <div className="p-4 rounded-lg bg-purple-50 border border-purple-100 text-sm text-purple-700">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI is working on this feedback...
                      </div>
                    </div>
                  )}

                  {selectedFeedback.ai_status === 'failed' && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                      <p>AI analysis failed. You can try sending this feedback again.</p>
                      {typeof selectedFeedback.ai_analysis === 'string' && selectedFeedback.ai_analysis && (
                        <p className="mt-1 text-xs">{selectedFeedback.ai_analysis}</p>
                      )}
                    </div>
                  )}

                  {selectedFeedback.ai_status === 'completed' && selectedFeedback.ai_analysis && (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 space-y-2">
                      {typeof selectedFeedback.ai_analysis === 'string' ? (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedFeedback.ai_analysis}</p>
                      ) : (
                        <div className="text-sm text-slate-700 space-y-2">
                          {selectedFeedback.ai_analysis.analysis && (
                            <div>
                              <label className="text-xs font-medium text-slate-500">Analysis</label>
                              <p className="whitespace-pre-wrap">{selectedFeedback.ai_analysis.analysis}</p>
                            </div>
                          )}
                          {selectedFeedback.ai_analysis.recommendation && (
                            <div>
                              <label className="text-xs font-medium text-slate-500">Recommendation</label>
                              <p className="whitespace-pre-wrap">{selectedFeedback.ai_analysis.recommendation}</p>
                            </div>
                          )}
                          {selectedFeedback.ai_analysis.effort && (
                            <div>
                              <label className="text-xs font-medium text-slate-500">Estimated Effort</label>
                              <Badge className={cn(
                                "text-xs",
                                selectedFeedback.ai_analysis.effort === 'low' ? 'bg-green-100 text-green-700' :
                                selectedFeedback.ai_analysis.effort === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              )}>
                                {selectedFeedback.ai_analysis.effort}
                              </Badge>
                            </div>
                          )}
                          {selectedFeedback.ai_analysis.risks && (
                            <div>
                              <label className="text-xs font-medium text-slate-500">Risks & Considerations</label>
                              <p className="whitespace-pre-wrap">{selectedFeedback.ai_analysis.risks}</p>
                            </div>
                          )}
                          {selectedFeedback.ai_analysis.category && (
                            <div>
                              <label className="text-xs font-medium text-slate-500">Suggested Category</label>
                              <Badge variant="outline">{selectedFeedback.ai_analysis.category}</Badge>
                            </div>
                          )}
                          {/* Fallback: render all keys if no known structure */}
                          {!selectedFeedback.ai_analysis.analysis && !selectedFeedback.ai_analysis.recommendation && (
                            <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-60">
                              {JSON.stringify(selectedFeedback.ai_analysis, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                      {selectedFeedback.ai_completed_at && (
                        <p className="text-xs text-emerald-600 mt-2">
                          Completed {format(new Date(selectedFeedback.ai_completed_at), 'MMM d, yyyy h:mm a')}
                          {selectedFeedback.ai_provider === 'local' && ' (Claude AI)'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Send to AI buttons if not yet sent */}
              {!selectedFeedback.ai_task_id && !selectedFeedback.ai_status && hasAnyAI && (
                <div className="pt-4 border-t flex gap-3">
                  {aiConfig.gammaai_enabled && (
                    <Button
                      variant="outline"
                      className="text-violet-600 border-violet-200 hover:bg-violet-50"
                      onClick={(e) => handleSendToAI(e, selectedFeedback)}
                      disabled={sendingAI === selectedFeedback.id}
                    >
                      {sendingAI === selectedFeedback.id ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                      ) : (
                        <><Bot className="w-4 h-4 mr-2" />Send to GammaAi</>
                      )}
                    </Button>
                  )}
                  {aiConfig.has_local_ai && (
                    <Button
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={(e) => handleAnalyzeLocal(e, selectedFeedback)}
                      disabled={sendingAI === selectedFeedback.id}
                    >
                      {sendingAI === selectedFeedback.id ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                      ) : (
                        <><Cpu className="w-4 h-4 mr-2" />Analyze with Claude</>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Re-analyze option for completed/failed */}
              {(selectedFeedback.ai_status === 'completed' || selectedFeedback.ai_status === 'failed') && hasAnyAI && (
                <div className="flex gap-3">
                  {aiConfig.has_local_ai && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 text-xs"
                      onClick={(e) => handleAnalyzeLocal(e, selectedFeedback)}
                      disabled={sendingAI === selectedFeedback.id}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Re-analyze with Claude
                    </Button>
                  )}
                  {aiConfig.gammaai_enabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-violet-600 text-xs"
                      onClick={(e) => handleSendToAI(e, selectedFeedback)}
                      disabled={sendingAI === selectedFeedback.id}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Re-send to GammaAi
                    </Button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
                <div>
                  <label className="text-slate-500">Submitted by</label>
                  <p className="font-medium">{selectedFeedback.submitter_name || 'Anonymous'}</p>
                  {selectedFeedback.submitter_email && (
                    <p className="text-slate-500">{selectedFeedback.submitter_email}</p>
                  )}
                </div>
                <div>
                  <label className="text-slate-500">Date</label>
                  <p className="font-medium">{format(new Date(selectedFeedback.created_date), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {selectedFeedback.page_url && (
                  <div className="col-span-2">
                    <label className="text-slate-500">Page URL</label>
                    <a href={selectedFeedback.page_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#0069AF] hover:underline">
                      {selectedFeedback.page_url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, feedback: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

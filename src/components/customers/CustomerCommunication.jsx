import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { 
  Mail, MessageSquare, Phone, Send, Loader2, Sparkles, 
  Clock, CheckCircle2, XCircle, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function CustomerCommunication({ customer, proposals = [], onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('email');
  const [sending, setSending] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', body: '' });
  const [smsData, setSmsData] = useState({ message: '' });
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const { data: commLogs = [] } = useQuery({
    queryKey: ['commLogs', customer?.id],
    queryFn: () => api.entities.CommunicationLog.filter({ customer_id: customer.id }, '-created_date', 20),
    enabled: !!customer?.id
  });

  const { data: integrationSettings } = useQuery({
    queryKey: ['integrationSettings'],
    queryFn: async () => {
      const settings = await api.entities.IntegrationSettings.filter({ setting_key: 'main' });
      return settings[0];
    }
  });

  const generateAISuggestions = async () => {
    setGeneratingAI(true);
    const recentProposals = proposals.filter(p => p.customer_id === customer.id || p.customer_email === customer.email);
    const pendingProposals = recentProposals.filter(p => p.status === 'sent' || p.status === 'viewed');
    const acceptedProposals = recentProposals.filter(p => p.status === 'approved');
    
    const prompt = `Generate 3 professional follow-up email suggestions for a customer named "${customer.name}" (company: ${customer.company || 'N/A'}).

Context:
- Total proposals: ${recentProposals.length}
- Pending proposals: ${pendingProposals.length} (status: sent/viewed)
- Accepted proposals: ${acceptedProposals.length}
- Recent communication count: ${commLogs.length}
${pendingProposals.length > 0 ? `- Pending proposal titles: ${pendingProposals.map(p => p.title).join(', ')}` : ''}
${acceptedProposals.length > 0 ? `- Recent accepted: ${acceptedProposals[0]?.title}` : ''}

Generate suggestions for different scenarios (follow-up, thank you, check-in). Each should have a subject and short body.`;

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
                type: { type: "string" },
                subject: { type: "string" },
                body: { type: "string" }
              }
            }
          }
        }
      }
    });

    setAiSuggestions(result.suggestions || []);
    setShowAISuggestions(true);
    setGeneratingAI(false);
  };

  const handleSendEmail = async () => {
    if (!emailData.subject || !emailData.body) return;
    setSending(true);
    
    const user = await api.auth.me();
    
    // Log communication
    await api.entities.CommunicationLog.create({
      customer_id: customer.id,
      type: 'email',
      direction: 'outbound',
      subject: emailData.subject,
      content: emailData.body,
      recipient: customer.email,
      status: 'sent',
      sent_by_email: user.email,
      sent_by_name: user.full_name
    });

    // Send via Emailit if configured
    if (integrationSettings?.emailit_enabled) {
      await api.functions.invoke('sendEmailit', {
        to: customer.email,
        subject: emailData.subject,
        html: emailData.body.replace(/\n/g, '<br/>')
      });
    }

    queryClient.invalidateQueries({ queryKey: ['commLogs', customer.id] });
    setEmailData({ subject: '', body: '' });
    setSending(false);
  };

  const handleSendSMS = async () => {
    if (!smsData.message || !customer.phone) return;
    setSending(true);
    
    const user = await api.auth.me();
    
    await api.entities.CommunicationLog.create({
      customer_id: customer.id,
      type: 'sms',
      direction: 'outbound',
      content: smsData.message,
      recipient: customer.phone,
      status: integrationSettings?.twilio_enabled ? 'sent' : 'pending',
      sent_by_email: user.email,
      sent_by_name: user.full_name
    });

    queryClient.invalidateQueries({ queryKey: ['commLogs', customer.id] });
    setSmsData({ message: '' });
    setSending(false);
  };

  const useSuggestion = (suggestion) => {
    setEmailData({ subject: suggestion.subject, body: suggestion.body });
    setShowAISuggestions(false);
  };

  const statusIcons = {
    sent: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
    delivered: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
    failed: <XCircle className="w-3 h-3 text-red-500" />,
    pending: <Clock className="w-3 h-3 text-amber-500" />
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('email')}
          className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'email' ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
          )}
        >
          <Mail className="w-4 h-4" /> Email
        </button>
        <button
          onClick={() => setActiveTab('sms')}
          className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'sms' ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
          )}
          disabled={!customer?.phone}
        >
          <MessageSquare className="w-4 h-4" /> SMS
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'history' ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
          )}
        >
          <Clock className="w-4 h-4" /> History ({commLogs.length})
        </button>
      </div>

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-500">To: {customer?.email}</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={generateAISuggestions}
              disabled={generatingAI}
              className="gap-1 text-xs"
            >
              {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              AI Suggest
            </Button>
          </div>

          {showAISuggestions && aiSuggestions.length > 0 && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
              <p className="text-xs font-medium text-purple-700">AI Suggestions:</p>
              {aiSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => useSuggestion(s)}
                  className="w-full text-left p-2 bg-white rounded-lg border hover:border-purple-300 transition-colors"
                >
                  <p className="text-xs font-medium text-slate-900">{s.subject}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{s.body}</p>
                </button>
              ))}
            </div>
          )}

          <Input
            placeholder="Subject"
            value={emailData.subject}
            onChange={(e) => setEmailData(p => ({ ...p, subject: e.target.value }))}
          />
          <Textarea
            placeholder="Write your message..."
            value={emailData.body}
            onChange={(e) => setEmailData(p => ({ ...p, body: e.target.value }))}
            className="min-h-[120px]"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">
              {integrationSettings?.emailit_enabled ? '✓ Emailit connected' : '⚠ Email integration not configured'}
            </p>
            <Button 
              onClick={handleSendEmail} 
              disabled={sending || !emailData.subject || !emailData.body}
              className="bg-[#0069AF] hover:bg-[#133F5C]"
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Email
            </Button>
          </div>
        </div>
      )}

      {/* SMS Tab */}
      {activeTab === 'sms' && (
        <div className="space-y-3">
          <Label className="text-xs text-slate-500">To: {customer?.phone || 'No phone number'}</Label>
          <Textarea
            placeholder="Write your SMS message..."
            value={smsData.message}
            onChange={(e) => setSmsData({ message: e.target.value })}
            className="min-h-[100px]"
            maxLength={160}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">
              {smsData.message.length}/160 characters
              {integrationSettings?.twilio_enabled ? ' • ✓ Twilio connected' : ' • ⚠ SMS not configured'}
            </p>
            <Button 
              onClick={handleSendSMS} 
              disabled={sending || !smsData.message || !customer?.phone}
              className="bg-[#0069AF] hover:bg-[#133F5C]"
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send SMS
            </Button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {commLogs.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No communication history</p>
          ) : (
            commLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {log.type === 'email' ? <Mail className="w-3.5 h-3.5 text-blue-500" /> : 
                     log.type === 'sms' ? <MessageSquare className="w-3.5 h-3.5 text-green-500" /> :
                     <Phone className="w-3.5 h-3.5 text-amber-500" />}
                    <span className="font-medium text-sm">{log.subject || log.type.toUpperCase()}</span>
                    {statusIcons[log.status]}
                  </div>
                  <span className="text-xs text-slate-400">
                    {format(new Date(log.created_date), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{log.content}</p>
                <p className="text-xs text-slate-400 mt-1">by {log.sent_by_name || log.sent_by_email}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
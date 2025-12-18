import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bot, Send, Loader2, X, Ticket, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function CustomerTicketAI({ customer, onClose }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const { data: tickets = [], isLoading: loadingTickets, refetch: refetchTickets } = useQuery({
    queryKey: ['customerTickets', customer.id],
    queryFn: () => base44.entities.Ticket.filter({ customer_id: customer.id }, '-date_created'),
    enabled: !!customer.id
  });

  const openTickets = tickets.filter(t => !t.date_closed);
  const closedTickets = tickets.filter(t => t.date_closed);

  const handleAsk = async () => {
    if (!question.trim() || loading) return;

    const userMessage = question;
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Build context from tickets
      const ticketContext = tickets.map(t => {
        return `Ticket #${t.external_id}: "${t.summary}"
Status: ${t.status || 'Unknown'}
Priority: ${t.priority || 'Normal'}
Type: ${t.ticket_type || 'N/A'}
Created: ${t.date_created ? format(new Date(t.date_created), 'MMM d, yyyy') : 'Unknown'}
${t.date_closed ? `Closed: ${format(new Date(t.date_closed), 'MMM d, yyyy')}` : 'Open'}
Assigned: ${t.assigned_agent || 'Unassigned'}
Details: ${t.details?.substring(0, 500) || 'No details'}
---`;
      }).join('\n');

      const prompt = `You are an AI assistant helping analyze support tickets for a customer named "${customer.name}" (${customer.company || 'Individual'}).

Here are their ${tickets.length} tickets:

${ticketContext || 'No tickets found for this customer.'}

User Question: ${userMessage}

Provide a helpful, concise answer based on the ticket history. If asked about patterns, issues, or recommendations, analyze the data and provide insights. Format your response clearly.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" }
          }
        }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${error.message}` }]);
    }

    setLoading(false);
  };

  const suggestedQuestions = [
    "What are the most common issues this customer has?",
    "Summarize this customer's ticket history",
    "Are there any recurring problems?",
    "What's the current status of open tickets?",
    "How long do their tickets typically take to resolve?"
  ];

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Ticket AI Assistant</h3>
            <p className="text-xs text-slate-500">Ask questions about {customer.name}'s tickets</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Ticket Summary */}
      <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Ticket className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{tickets.length}</span>
            <span className="text-slate-500">total</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-600">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{openTickets.length}</span>
            <span className="text-slate-500">open</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">{closedTickets.length}</span>
            <span className="text-slate-500">closed</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refetchTickets()}
          className="text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            {loadingTickets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500">No tickets found for this customer.</p>
                <p className="text-xs text-slate-400 mt-1">Sync tickets from HaloPSA first.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 text-center mb-4">
                  Ask me anything about {customer.name}'s {tickets.length} tickets
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400 uppercase">Suggested Questions</p>
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setQuestion(q)}
                      className="w-full text-left p-3 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-sm text-slate-700"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-xl max-w-[85%]",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white ml-auto" 
                    : "bg-white border border-slate-200"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing tickets...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about this customer's tickets..."
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            disabled={loading || tickets.length === 0}
            className="flex-1"
          />
          <Button 
            onClick={handleAsk} 
            disabled={loading || !question.trim() || tickets.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
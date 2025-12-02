import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, ExternalLink, RefreshCw, User, Building2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HaloTicketInfo({ ticketId, compact = false }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTicket = async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await base44.functions.halopsa.getTicket({ ticketId });
      if (result.error) {
        setError(result.error);
        setTicket(null);
      } else {
        setTicket(result);
      }
    } catch (err) {
      setError('Failed to load ticket');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  if (!ticketId) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading ticket...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  if (!ticket) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1.5">
          <Ticket className="w-3 h-3" />
          #{ticketId}
        </Badge>
        <span className="text-sm text-slate-600 truncate max-w-[200px]">{ticket.summary}</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-100">
            <Ticket className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Ticket #{ticketId}</p>
            <p className="text-sm text-slate-600">{ticket.summary}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchTicket} title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Badge className={cn(
            ticket.status?.toLowerCase().includes('closed') ? 'bg-emerald-100 text-emerald-700' :
            ticket.status?.toLowerCase().includes('progress') ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-700'
          )}>
            {ticket.status}
          </Badge>
        </div>
        {ticket.priority && (
          <Badge variant="outline">{ticket.priority}</Badge>
        )}
        {ticket.client && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Building2 className="w-3.5 h-3.5" />
            {ticket.client}
          </div>
        )}
        {ticket.assignedTo && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <User className="w-3.5 h-3.5" />
            {ticket.assignedTo}
          </div>
        )}
      </div>
    </div>
  );
}
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  History, FileText, Send, Eye, CheckCircle2, XCircle, 
  Edit2, MessageSquare, User, Globe 
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const actionIcons = {
  created: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  sent: { icon: Send, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  viewed: { icon: Eye, color: 'text-amber-500', bg: 'bg-amber-50' },
  approved: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  changes_requested: { icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-50' },
  updated: { icon: Edit2, color: 'text-slate-500', bg: 'bg-slate-50' }
};

const actionLabels = {
  created: 'Proposal Created',
  sent: 'Proposal Sent',
  viewed: 'Proposal Viewed',
  approved: 'Proposal Approved',
  rejected: 'Proposal Declined',
  changes_requested: 'Changes Requested',
  updated: 'Proposal Updated'
};

export default function ProposalActivityFeed({ proposalId }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['proposalActivity', proposalId],
    queryFn: () => base44.entities.ProposalActivity.filter({ proposal_id: proposalId }, '-created_date'),
    enabled: !!proposalId
  });

  if (isLoading) {
    return <div className="p-4 text-center text-slate-400 text-sm">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="p-8 text-center">
        <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6 pl-2">
        {activities.map((activity, idx) => {
          const config = actionIcons[activity.action] || actionIcons.updated;
          const Icon = config.icon;
          
          return (
            <div key={activity.id} className="relative flex gap-4">
              {/* Timeline line */}
              {idx !== activities.length - 1 && (
                <div className="absolute left-[19px] top-10 bottom-[-24px] w-px bg-slate-200" />
              )}
              
              <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center border border-white shadow-sm`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              
              <div className="flex-1 pt-1 pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">
                      {actionLabels[activity.action] || activity.action}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        {activity.ip_address ? <Globe className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {activity.actor_name || 'Unknown User'}
                      </span>
                      {activity.ip_address && (
                        <span>• {activity.ip_address}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {format(new Date(activity.created_date), 'MMM d, h:mm a')}
                  </span>
                </div>
                {activity.details && (
                  <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {activity.details}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
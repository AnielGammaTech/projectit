import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  FileText, CheckCircle2, Clock, Package, Send, 
  ThumbsUp, ThumbsDown, Eye, UserPlus, Briefcase,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const eventIcons = {
  proposal_sent: { icon: Send, color: 'bg-blue-500', label: 'Proposal Sent' },
  proposal_approved: { icon: ThumbsUp, color: 'bg-emerald-500', label: 'Proposal Approved' },
  proposal_rejected: { icon: ThumbsDown, color: 'bg-red-500', label: 'Proposal Rejected' },
  proposal_viewed: { icon: Eye, color: 'bg-amber-500', label: 'Proposal Viewed' },
  project_created: { icon: Briefcase, color: 'bg-indigo-500', label: 'Project Created' },
  project_completed: { icon: CheckCircle2, color: 'bg-emerald-500', label: 'Project Completed' },
  task_completed: { icon: CheckCircle2, color: 'bg-green-500', label: 'Task Completed' },
  part_received: { icon: Package, color: 'bg-orange-500', label: 'Part Received' },
};

export default function ActivityTimeline({ proposals = [], projects = [] }) {
  const [showAll, setShowAll] = useState(false);

  // Build timeline events from proposals and projects
  const events = [];

  proposals.forEach(p => {
    if (p.sent_date) {
      events.push({
        id: `${p.id}-sent`,
        type: 'proposal_sent',
        title: p.title,
        customer: p.customer_name,
        date: new Date(p.sent_date),
        link: createPageUrl('ProposalView') + `?id=${p.id}`,
        value: p.total
      });
    }
    if (p.viewed_date && p.status !== 'draft') {
      events.push({
        id: `${p.id}-viewed`,
        type: 'proposal_viewed',
        title: p.title,
        customer: p.customer_name,
        date: new Date(p.viewed_date),
        link: createPageUrl('ProposalView') + `?id=${p.id}`
      });
    }
    if (p.signed_date && p.status === 'approved') {
      events.push({
        id: `${p.id}-approved`,
        type: 'proposal_approved',
        title: p.title,
        customer: p.customer_name,
        date: new Date(p.signed_date),
        link: createPageUrl('ProposalView') + `?id=${p.id}`,
        value: p.total
      });
    }
    if (p.status === 'rejected' && p.updated_date) {
      events.push({
        id: `${p.id}-rejected`,
        type: 'proposal_rejected',
        title: p.title,
        customer: p.customer_name,
        date: new Date(p.updated_date),
        link: createPageUrl('ProposalView') + `?id=${p.id}`
      });
    }
  });

  // Only show activity for active projects (not archived)
  projects.filter(p => p.status !== 'archived').forEach(p => {
    events.push({
      id: `${p.id}-created`,
      type: 'project_created',
      title: p.name,
      customer: p.client,
      date: new Date(p.created_date),
      link: createPageUrl('ProjectDetail') + `?id=${p.id}`
    });
    if (p.status === 'completed' && p.updated_date) {
      events.push({
        id: `${p.id}-completed`,
        type: 'project_completed',
        title: p.name,
        customer: p.client,
        date: new Date(p.updated_date),
        link: createPageUrl('ProjectDetail') + `?id=${p.id}`
      });
    }
  });

  // Sort by date descending
  events.sort((a, b) => b.date - a.date);

  const displayEvents = showAll ? events : events.slice(0, 6);

  const formatEventDate = (date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    const days = differenceInDays(new Date(), date);
    if (days < 7) return `${days} days ago`;
    return format(date, 'MMM d');
  };

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100" />
        
        <div className="space-y-4">
          {displayEvents.map((event, idx) => {
            const config = eventIcons[event.type] || eventIcons.project_created;
            const Icon = config.icon;
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={event.link}
                  className="flex items-start gap-4 group p-2 -ml-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className={cn(
                    "relative z-10 p-2 rounded-full shadow-sm transition-transform group-hover:scale-110",
                    config.color
                  )}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-[#0069AF]">
                      {config.label}: {event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.customer && (
                        <span className="text-xs text-slate-500">{event.customer}</span>
                      )}
                      {event.value && (
                        <span className="text-xs font-medium text-emerald-600">${event.value.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    <span className="text-xs text-slate-400">{formatEventDate(event.date)}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {events.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-4 pt-3 border-t text-sm text-[#0069AF] hover:text-[#133F5C] font-medium"
        >
          {showAll ? 'Show less' : `View all ${events.length} events`}
        </button>
      )}
    </div>
  );
}
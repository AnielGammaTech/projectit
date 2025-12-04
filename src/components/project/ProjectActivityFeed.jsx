import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle2, PlusCircle, Package, MessageSquare, Edit2, 
  Trash2, ArrowUpCircle, User, Clock, FileText, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const actionIcons = {
  task_created: { icon: PlusCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  task_updated: { icon: Edit2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  task_assigned: { icon: User, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  part_created: { icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  part_ordered: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  part_received: { icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  note_added: { icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  file_uploaded: { icon: FileText, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  progress_updated: { icon: ArrowUpCircle, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  default: { icon: Zap, color: 'text-slate-500', bg: 'bg-slate-500/10' }
};

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const getColorForEmail = (email) => {
  if (!email) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function ProjectActivityFeed({ projectId, progressUpdates = [] }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['projectActivity', projectId],
    queryFn: () => base44.entities.ProjectActivity.filter({ project_id: projectId }, '-created_date', 20),
    enabled: !!projectId,
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">No activity yet</p>
        <p className="text-sm text-slate-400">Activity will appear here as you work on this project</p>
      </div>
    );
  }

  // Combine activities with progress updates
  const allItems = [
    ...activities.map(a => ({ ...a, itemType: 'activity' })),
    ...progressUpdates.filter(p => p.note).map(p => ({
      id: p.id,
      action: 'progress_updated',
      description: `updated progress to ${p.progress_value}%`,
      actor_name: p.author_name,
      actor_email: p.author_email,
      created_date: p.created_date,
      note: p.note,
      itemType: 'progress'
    }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20);

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />
      
      <div className="space-y-1">
        <AnimatePresence>
          {allItems.map((activity, index) => {
            const config = actionIcons[activity.action] || actionIcons.default;
            const Icon = config.icon;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative flex items-start gap-4 py-3 group"
              >
                {/* Icon with glow effect */}
                <div className="relative z-10">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                    config.bg,
                    "group-hover:scale-110 group-hover:shadow-lg"
                  )}>
                    <Icon className={cn("w-5 h-5", config.color)} />
                  </div>
                  {/* Pulse animation for recent items */}
                  {index === 0 && (
                    <div className={cn(
                      "absolute inset-0 rounded-xl animate-ping opacity-20",
                      config.bg
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {activity.actor_name && (
                      <span className="font-semibold text-slate-900">{activity.actor_name} </span>
                    )}
                    {activity.description}
                  </p>
                  {/* Show note for progress updates */}
                  {activity.note && (
                    <div className="mt-1 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-600 italic">"{activity.note}"</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400 font-medium">
                      {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Actor avatar */}
                {activity.actor_name && (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity",
                    getColorForEmail(activity.actor_email)
                  )}>
                    {getInitials(activity.actor_name)}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
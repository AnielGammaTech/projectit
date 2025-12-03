import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Activity, Filter, Search, CheckCircle2, MessageSquare, 
  FileText, FolderKanban, Package, Clock, User, 
  TrendingUp, Upload, Edit2, Plus, ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const activityIcons = {
  task_created: { icon: Plus, color: 'text-blue-500', bg: 'bg-blue-100' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  task_updated: { icon: Edit2, color: 'text-amber-500', bg: 'bg-amber-100' },
  comment_added: { icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-100' },
  file_uploaded: { icon: Upload, color: 'text-cyan-500', bg: 'bg-cyan-100' },
  project_created: { icon: FolderKanban, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  project_status_change: { icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-100' },
  part_ordered: { icon: Package, color: 'text-pink-500', bg: 'bg-pink-100' },
  part_received: { icon: Package, color: 'text-teal-500', bg: 'bg-teal-100' },
  part_installed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100' },
  progress_updated: { icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-100' },
  note_added: { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-100' },
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

export default function ActivityFeed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['globalActivities'],
    queryFn: () => base44.entities.ProjectActivity.list('-created_date', 100)
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.actor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = projectFilter === 'all' || activity.project_id === projectFilter;
    const matchesUser = userFilter === 'all' || activity.actor_email === userFilter;
    const matchesType = typeFilter === 'all' || activity.action === typeFilter;
    return matchesSearch && matchesProject && matchesUser && matchesType;
  });

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = format(new Date(activity.created_date), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {});

  const activityTypes = [...new Set(activities.map(a => a.action))].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Activity Feed</h1>
              <p className="text-sm text-slate-500">All activity across your projects</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-sm"
        >
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.email}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {activityTypes.map(type => (
                  <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Activity List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedActivities).length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
          >
            <Activity className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No activity found</h3>
            <p className="text-slate-500">Activity will appear here as you work on projects</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dayActivities]) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    {format(new Date(date), 'EEEE, MMM d')}
                  </div>
                  <div className="flex-1 h-px bg-slate-200" />
                  <Badge variant="outline" className="text-xs">
                    {dayActivities.length} {dayActivities.length === 1 ? 'event' : 'events'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {dayActivities.map((activity, idx) => {
                    const config = activityIcons[activity.action] || activityIcons.task_updated;
                    const Icon = config.icon;

                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn("p-2 rounded-xl", config.bg)}>
                            <Icon className={cn("w-4 h-4", config.color)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm text-slate-900">
                                  <span className="font-medium">{activity.actor_name || 'Someone'}</span>
                                  {' '}
                                  <span className="text-slate-600">{activity.description}</span>
                                </p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <Link 
                                    to={createPageUrl('ProjectDetail') + `?id=${activity.project_id}`}
                                    className="flex items-center gap-1 text-xs text-[#0069AF] hover:underline"
                                  >
                                    <FolderKanban className="w-3 h-3" />
                                    {getProjectName(activity.project_id)}
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                  <span className="text-xs text-slate-400">
                                    {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>

                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium",
                                getColorForEmail(activity.actor_email)
                              )}>
                                {getInitials(activity.actor_name)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
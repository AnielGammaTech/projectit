import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Activity, Filter, Search, CheckCircle2, MessageSquare, 
  FileText, FolderKanban, Package, Clock, User, 
  TrendingUp, Upload, Edit2, Plus, ArrowRight, Tag
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
  const [filterTab, setFilterTab] = useState('everything'); // 'everything', 'projects', 'people'
  const [currentUser, setCurrentUser] = useState(null);
  const [showingFor, setShowingFor] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setShowingFor(user);
      setIsAdmin(user?.role === 'admin');
    }).catch(() => {
      // Redirect to login if not authenticated
      base44.auth.redirectToLogin();
    });
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

  const { data: appUsers = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: projectTags = [] } = useQuery({
    queryKey: ['projectTags'],
    queryFn: () => base44.entities.ProjectTag.list()
  });

  // Combine team members and app users, deduplicate by email
  const allPeople = [...teamMembers];
  appUsers.forEach(user => {
    if (!allPeople.find(m => m.email === user.email)) {
      allPeople.push({ id: user.id, email: user.email, name: user.full_name || user.email });
    }
  });

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  // Helper to check if user has access to a project
  const userHasProjectAccess = (project) => {
    if (isAdmin) return true;
    if (!project?.team_members || project.team_members.length === 0) return true;
    return project.team_members.includes(currentUser?.email);
  };

  // Only show activities from projects user has access to
  const accessibleProjectIds = projects.filter(userHasProjectAccess).map(p => p.id);

  const getProjectTags = (project) => {
    if (!project?.tags || project.tags.length === 0) return [];
    return project.tags.map(tagId => projectTags.find(t => t.id === tagId)).filter(Boolean);
  };

  const tagColors = {
    slate: 'bg-slate-100 text-slate-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    amber: 'bg-amber-100 text-amber-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    lime: 'bg-lime-100 text-lime-700',
    green: 'bg-green-100 text-green-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    teal: 'bg-teal-100 text-teal-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    sky: 'bg-sky-100 text-sky-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    violet: 'bg-violet-100 text-violet-700',
    purple: 'bg-purple-100 text-purple-700',
    fuchsia: 'bg-fuchsia-100 text-fuchsia-700',
    pink: 'bg-pink-100 text-pink-700',
    rose: 'bg-rose-100 text-rose-700',
  };

  const filteredActivities = activities.filter(activity => {
    // First check if user has access to the project this activity belongs to
    if (!accessibleProjectIds.includes(activity.project_id)) return false;
    
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Latest Activity</h1>
          
          {/* Filter Tabs */}
          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={() => setFilterTab('everything')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filterTab === 'everything'
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              Everything
            </button>
            <button
              onClick={() => setFilterTab('projects')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filterTab === 'projects'
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              Filter by projects
            </button>
            <button
              onClick={() => setFilterTab('people')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filterTab === 'people'
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              Filter by people
            </button>
          </div>


        </motion.div>

        {/* Additional Filters for projects/people tabs */}
        {filterTab !== 'everything' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-sm"
          >
            <div className="flex flex-wrap gap-4">
              {filterTab === 'projects' && (
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.filter(userHasProjectAccess).map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {filterTab === 'people' && (
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All People</SelectItem>
                    {allPeople.map(person => (
                      <SelectItem key={person.id} value={person.email}>{person.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </motion.div>
        )}

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
          <div className="space-y-8">
            {Object.entries(groupedActivities).map(([date, dayActivities]) => {
              const dateObj = new Date(date);
              const isActivityToday = isToday(dateObj);
              const isActivityYesterday = format(dateObj, 'yyyy-MM-dd') === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
              
              let dateLabel = format(dateObj, 'EEEE').toUpperCase();
              if (isActivityToday) dateLabel = 'TODAY';
              if (isActivityYesterday) dateLabel = 'YESTERDAY';

              return (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Date Label */}
                  <div className="flex justify-center mb-4">
                    <span className="px-4 py-1.5 bg-slate-200 rounded-full text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      {dateLabel}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {dayActivities.map((activity, idx) => {
                      const config = activityIcons[activity.action] || activityIcons.task_updated;
                      const Icon = config.icon;
                      const projectName = getProjectName(activity.project_id);
                      const project = projects.find(p => p.id === activity.project_id);

                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                        >
                          {/* Project Header */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              {project?.client && `${project.client} - `}{projectName}
                            </span>
                            {getProjectTags(project).map(tag => (
                              <span 
                                key={tag.id} 
                                className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                                  tagColors[tag.color] || tagColors.slate
                                )}
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {tag.name}
                              </span>
                            ))}
                          </div>

                          <div className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all">
                            <div className="flex items-start gap-4">
                              {/* Avatar */}
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0",
                                getColorForEmail(activity.actor_email)
                              )}>
                                {getInitials(activity.actor_name)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm text-slate-900">
                                      On{' '}
                                      <Link 
                                        to={createPageUrl('ProjectDetail') + `?id=${activity.project_id}`}
                                        className="text-[#0069AF] hover:underline font-medium"
                                      >
                                        {projectName}
                                      </Link>
                                      , <span className="font-medium">{activity.actor_name}</span>{' '}
                                      <span className="text-slate-600">{activity.description}</span>
                                    </p>
                                    
                                    {/* If it's a task completion, show the task */}
                                    {activity.action === 'task_completed' && activity.entity_id && (
                                      <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>{activity.description.replace('completed task "', '').replace('"', '')}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <span className="text-xs text-slate-400 shrink-0 ml-4">
                                    {format(new Date(activity.created_date), 'h:mma').toLowerCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
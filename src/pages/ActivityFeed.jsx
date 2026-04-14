import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
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
import UserAvatar from '@/components/UserAvatar';

const activityIcons = {
  task_created: { icon: Plus, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
  task_updated: { icon: Edit2, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/20' },
  comment_added: { icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/20' },
  file_uploaded: { icon: Upload, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/20' },
  project_created: { icon: FolderKanban, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/20' },
  project_status_change: { icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/20' },
  part_ordered: { icon: Package, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/20' },
  part_received: { icon: Package, color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/20' },
  part_installed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/20' },
  progress_updated: { icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/20' },
  note_added: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted' },
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
    api.auth.me().then(user => {
      setCurrentUser(user);
      setShowingFor(user);
      setIsAdmin(user?.role === 'admin');
    }).catch(() => {
      // Redirect to login if not authenticated
      api.auth.redirectToLogin();
    });
  }, []);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['globalActivities'],
    queryFn: () => api.entities.ProjectActivity.list('-created_date', 100)
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });


  const { data: projectTags = [] } = useQuery({
    queryKey: ['projectTags'],
    queryFn: () => api.entities.ProjectTag.list()
  });

  const getMemberAvatarUrl = (email) => {
    const member = teamMembers.find(m => m.email === email);
    return member?.avatar_url;
  };

  const allPeople = [...teamMembers];

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
    slate: 'bg-muted text-muted-foreground',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    lime: 'bg-lime-100 text-lime-700 dark:bg-lime-900/20 dark:text-lime-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    fuchsia: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-400',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-8"
        >
          <h1 className="text-lg sm:text-2xl font-bold text-foreground mb-4">Latest Activity</h1>

          {/* Filter Tabs */}
          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={() => setFilterTab('everything')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filterTab === 'everything'
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground hover:bg-muted border border-border"
              )}
            >
              Everything
            </button>
            <button
              onClick={() => setFilterTab('projects')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filterTab === 'projects'
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground hover:bg-muted border border-border"
              )}
            >
              Filter by projects
            </button>
            <button
              onClick={() => setFilterTab('people')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filterTab === 'people'
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground hover:bg-muted border border-border"
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
            className="bg-card rounded-2xl border border-border p-4 mb-6 shadow-sm"
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
              <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-muted dark:bg-slate-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-muted/50 dark:bg-slate-700/50 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedActivities).length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-2xl border border-border p-12 text-center"
          >
            <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No activity found</h3>
            <p className="text-muted-foreground">Activity will appear here as you work on projects</p>
          </motion.div>
        ) : (
          <div className="space-y-4 sm:space-y-8">
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
                    <span className="px-4 py-1.5 bg-muted dark:bg-slate-700 rounded-full text-xs font-semibold text-foreground uppercase tracking-wide">
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
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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

                          <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-border transition-all">
                            <div className="flex items-start gap-4">
                              {/* Avatar */}
                              <UserAvatar
                                email={activity.actor_email}
                                name={activity.actor_name}
                                avatarUrl={getMemberAvatarUrl(activity.actor_email)}
                                size="lg"
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm text-foreground">
                                      On{' '}
                                      <Link
                                        to={createPageUrl('ProjectDetail') + `?id=${activity.project_id}`}
                                        className="text-primary hover:underline font-medium"
                                      >
                                        {projectName}
                                      </Link>
                                      , <span className="font-medium">{activity.actor_name}</span>{' '}
                                      <span className="text-muted-foreground">{activity.description}</span>
                                    </p>

                                    {/* If it's a task completion, show the task */}
                                    {activity.action === 'task_completed' && activity.entity_id && (
                                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>{activity.description.replace('completed task "', '').replace('"', '')}</span>
                                      </div>
                                    )}
                                  </div>

                                  <span className="text-xs text-muted-foreground shrink-0 ml-4">
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

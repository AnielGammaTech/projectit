import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { Inbox, AtSign, CheckCircle2, Clock, ArrowLeft, Loader2, Package, FolderOpen, MessageSquare, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

const notificationConfig = {
  mention: { icon: AtSign, bg: 'bg-indigo-100 dark:bg-indigo-900/30', color: 'text-indigo-600 dark:text-indigo-400' },
  progress_update: { icon: CheckCircle2, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
  task_assigned: { icon: CheckCircle2, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
  task_due: { icon: Clock, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
  task_completed: { icon: CheckCircle2, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
  task_overdue: { icon: AlertTriangle, bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
  part_status: { icon: Package, bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-600 dark:text-orange-400' },
  project_update: { icon: FolderOpen, bg: 'bg-violet-100 dark:bg-violet-900/30', color: 'text-violet-600 dark:text-violet-400' },
  project_assigned: { icon: FolderOpen, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
  comment: { icon: MessageSquare, bg: 'bg-teal-100 dark:bg-teal-900/30', color: 'text-teal-600 dark:text-teal-400' }
};

export default function MyNotifications() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.me().then(user => {
      setCurrentUser(user);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const { data: allProjects = [] } = useQuery({
    queryKey: ['allProjectsForNotifPage'],
    queryFn: () => api.entities.Project.list(),
    enabled: !!currentUser?.email,
    staleTime: 60000
  });

  const archivedProjectIds = new Set(
    allProjects.filter(p => p.status === 'archived').map(p => p.id)
  );

  const { data: rawNotifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['myNotifications', currentUser?.email],
    queryFn: () => api.entities.UserNotification.filter({ user_email: currentUser.email }, '-created_date', 50),
    enabled: !!currentUser?.email
  });

  // Filter out notifications from archived projects
  const notifications = rawNotifications.filter(n =>
    !n.project_id || !archivedProjectIds.has(n.project_id)
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: (notificationId) => api.entities.UserNotification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await Promise.all(
        notifications.filter(n => !n.is_read).map(n =>
          api.entities.UserNotification.update(n.id, { is_read: true })
        )
      );
    },
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
    }
  });

  const dismissNotification = useMutation({
    mutationFn: (notificationId) => api.entities.UserNotification.delete(notificationId),
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
    }
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      await Promise.all(
        notifications.map(n => api.entities.UserNotification.delete(n.id))
      );
    },
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
    }
  });

  if (loading) return <CardGridSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Dashboard')} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground sm:hidden">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link to={createPageUrl('Dashboard')} className="hidden sm:inline-flex items-center text-primary hover:text-foreground text-sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Link>
            <h1 className="text-lg font-bold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => clearAll.mutate()}
                disabled={clearAll.isPending}
                className="text-xs font-medium text-red-400 hover:text-red-500 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Notification list */}
        {notifications.length > 0 ? (
          <div className="space-y-0.5">
            {notifications.map(notification => {
              const config = notificationConfig[notification.type] || notificationConfig.mention;
              const IconComponent = config.icon;
              const isUnread = !notification.is_read;

              return (
                <Link
                  key={notification.id}
                  to={notification.link || '#'}
                  onClick={() => { if (isUnread) markAsRead.mutate(notification.id); }}
                  className={cn(
                    "flex items-start gap-3 px-3 py-3 rounded-xl transition-colors",
                    isUnread
                      ? "bg-card border border-border"
                      : "hover:bg-muted/50"
                  )}
                >
                  {/* Icon */}
                  <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", config.bg, config.color)}>
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-snug", isUnread ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        {notification.created_date ? format(new Date(notification.created_date), 'MMM d') : ''}
                      </span>
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notification.message}</p>
                    )}
                    {notification.project_name && (
                      <span className="text-[11px] text-primary mt-0.5 inline-block">{notification.project_name}</span>
                    )}
                  </div>

                  {/* Unread dot */}
                  {isUnread && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">You're all caught up</p>
          </div>
        )}
      </div>
    </div>
  );
}
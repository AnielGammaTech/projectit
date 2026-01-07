import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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

const notificationConfig = {
  mention: { icon: AtSign, bg: 'bg-indigo-100', color: 'text-indigo-600' },
  progress_update: { icon: CheckCircle2, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  task_assigned: { icon: CheckCircle2, bg: 'bg-blue-100', color: 'text-blue-600' },
  task_due: { icon: Clock, bg: 'bg-amber-100', color: 'text-amber-600' },
  task_completed: { icon: CheckCircle2, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  task_overdue: { icon: AlertTriangle, bg: 'bg-red-100', color: 'text-red-600' },
  part_status: { icon: Package, bg: 'bg-orange-100', color: 'text-orange-600' },
  project_update: { icon: FolderOpen, bg: 'bg-violet-100', color: 'text-violet-600' },
  project_assigned: { icon: FolderOpen, bg: 'bg-blue-100', color: 'text-blue-600' },
  comment: { icon: MessageSquare, bg: 'bg-teal-100', color: 'text-teal-600' }
};

export default function MyNotifications() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['myNotifications', currentUser?.email],
    queryFn: () => base44.entities.UserNotification.filter({ user_email: currentUser.email }, '-created_date', 50),
    enabled: !!currentUser?.email
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: (notificationId) => base44.entities.UserNotification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      for (const n of notifications.filter(n => !n.is_read)) {
        await base44.entities.UserNotification.update(n.id, { is_read: true });
      }
    },
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
    }
  });

  const dismissNotification = useMutation({
    mutationFn: (notificationId) => base44.entities.UserNotification.delete(notificationId),
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0069AF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to={createPageUrl('Dashboard')} className="inline-flex items-center text-[#0069AF] hover:text-[#133F5C] mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-[#0069AF]" />
                  My Notifications
                  {unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
                  )}
                </CardTitle>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => markAllAsRead.mutate()}
                    disabled={markAllAsRead.isPending}
                    className="text-xs text-slate-500"
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <CardDescription>Mentions, assignments, and updates from your team</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {notifications.map(notification => {
                      const config = notificationConfig[notification.type] || notificationConfig.mention;
                      const IconComponent = config.icon;
                      
                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-4 rounded-xl border transition-all group relative",
                            notification.is_read 
                              ? "bg-white border-slate-100" 
                              : "bg-blue-50 border-blue-200"
                          )}
                        >
                          {/* Unread indicator dot */}
                          {!notification.is_read && (
                            <div className="absolute top-4 left-4 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                          )}
                          
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2.5 rounded-xl", config.bg, config.color, !notification.is_read && "ml-4")}>
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900">{notification.title}</p>
                                <p className="text-sm text-slate-500 mt-1">{notification.message}</p>
                                {notification.project_name && (
                                  <p className="text-xs text-[#0069AF] mt-2">Project: {notification.project_name}</p>
                                )}
                                {notification.from_user_name && (
                                  <p className="text-xs text-slate-400 mt-1">From: {notification.from_user_name}</p>
                                )}
                                <p className="text-xs text-slate-400 mt-1">
                                  {format(new Date(notification.created_date), 'MMM d, yyyy • h:mm a')}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-1">
                                {notification.link && (
                                  <Link to={notification.link}>
                                    <Button variant="outline" size="sm" className="text-xs h-8">
                                      View
                                    </Button>
                                  </Link>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => dismissNotification.mutate(notification.id)}
                                  className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Dismiss"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              {!notification.is_read && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => markAsRead.mutate(notification.id)}
                                  className="text-xs h-8"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Mark read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-16">
                  <Inbox className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No notifications</h3>
                  <p className="text-sm text-slate-500">You're all caught up! Notifications will appear here when someone mentions you or assigns you a task.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Bell, AtSign, CheckCircle2, Clock, Package, FolderOpen,
  MessageSquare, AlertTriangle, Trash2, Settings, Loader2,
  Mail, Save, Send, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const notificationConfig = {
  mention: { icon: AtSign, bg: 'bg-indigo-100', color: 'text-indigo-600' },
  task_assigned: { icon: CheckCircle2, bg: 'bg-blue-100', color: 'text-blue-600' },
  task_due: { icon: Clock, bg: 'bg-amber-100', color: 'text-amber-600' },
  task_completed: { icon: CheckCircle2, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  task_overdue: { icon: AlertTriangle, bg: 'bg-red-100', color: 'text-red-600' },
  part_status: { icon: Package, bg: 'bg-orange-100', color: 'text-orange-600' },
  project_update: { icon: FolderOpen, bg: 'bg-violet-100', color: 'text-violet-600' },
  project_assigned: { icon: FolderOpen, bg: 'bg-blue-100', color: 'text-blue-600' },
  comment: { icon: MessageSquare, bg: 'bg-teal-100', color: 'text-teal-600' },
  progress_update: { icon: CheckCircle2, bg: 'bg-emerald-100', color: 'text-emerald-600' },
};

export default function NotificationPanel({ currentUser, onClose }) {
  const queryClient = useQueryClient();

  // Fetch all projects to filter out archived ones
  const { data: projects = [] } = useQuery({
    queryKey: ['allProjectsForNotifications'],
    queryFn: () => api.entities.Project.list(),
    enabled: !!currentUser?.email,
    staleTime: 60000
  });

  const archivedProjectIds = new Set(
    projects.filter(p => p.status === 'archived').map(p => p.id)
  );

  // Fetch notifications
  const { data: rawNotifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['panelNotifications', currentUser?.email],
    queryFn: () => api.entities.UserNotification.filter(
      { user_email: currentUser.email }, '-created_date', 50
    ),
    enabled: !!currentUser?.email,
    refetchInterval: 10000
  });

  // Filter out notifications from archived projects
  const notifications = rawNotifications.filter(n =>
    !n.project_id || !archivedProjectIds.has(n.project_id)
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Notification settings
  const { data: savedSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['notificationSettings', currentUser?.email],
    queryFn: async () => {
      const results = await api.entities.NotificationSettings.filter({ user_email: currentUser.email });
      return results[0] || null;
    },
    enabled: !!currentUser?.email
  });

  const [settings, setSettings] = useState({
    notify_task_assigned: true,
    notify_task_due_soon: true,
    notify_task_overdue: true,
    notify_mentions: true,
    notify_project_assigned: true,
    due_reminder_days: 1,
    email_frequency: 'instant'
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (savedSettings) {
      setSettings({
        notify_task_assigned: savedSettings.notify_task_assigned ?? true,
        notify_task_due_soon: savedSettings.notify_task_due_soon ?? true,
        notify_task_overdue: savedSettings.notify_task_overdue ?? true,
        notify_mentions: savedSettings.notify_mentions ?? true,
        notify_project_assigned: savedSettings.notify_project_assigned ?? true,
        due_reminder_days: savedSettings.due_reminder_days ?? 1,
        email_frequency: savedSettings.email_frequency ?? 'instant'
      });
    }
  }, [savedSettings]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (savedSettings) {
        return api.entities.NotificationSettings.update(savedSettings.id, data);
      } else {
        return api.entities.NotificationSettings.create({
          ...data,
          user_email: currentUser.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      toast.success('Email preferences saved');
      setHasChanges(false);
    }
  });

  const markAsRead = useMutation({
    mutationFn: (id) => api.entities.UserNotification.update(id, { is_read: true }),
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      for (const n of notifications.filter(n => !n.is_read)) {
        await api.entities.UserNotification.update(n.id, { is_read: true });
      }
    },
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
    }
  });

  const dismissNotification = useMutation({
    mutationFn: (id) => api.entities.UserNotification.delete(id),
    onSuccess: () => {
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
    }
  });

  return (
    <div className="w-[380px] max-h-[520px] flex flex-col">
      <Tabs defaultValue="notifications" className="flex flex-col h-full">
        <div className="px-4 pt-3 pb-2 border-b border-slate-100">
          <TabsList className="w-full">
            <TabsTrigger value="notifications" className="flex-1 text-xs">
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 text-xs">
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Email Preferences
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="flex-1 m-0 overflow-hidden">
          {unreadCount > 0 && (
            <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500">{unreadCount} unread</span>
              <button
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="text-xs text-[#0069AF] hover:text-[#0F2F44] font-medium"
              >
                Mark all as read
              </button>
            </div>
          )}

          <ScrollArea className="h-[380px]">
            {notifications.length > 0 ? (
              <div className="p-2 space-y-0.5">
                {notifications.map(notification => {
                  const config = notificationConfig[notification.type] || notificationConfig.mention;
                  const IconComponent = config.icon;

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "px-3 py-2.5 rounded-lg transition-all group flex items-start gap-2.5 relative",
                        notification.is_read
                          ? "hover:bg-slate-50"
                          : "bg-blue-50/60 hover:bg-blue-50"
                      )}
                    >
                      {!notification.is_read && (
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#0069AF] rounded-full" />
                      )}
                      <div className={cn("p-1.5 rounded-lg flex-shrink-0 mt-0.5", config.bg, config.color)}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs text-slate-900 leading-tight">{notification.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {notification.project_name && (
                            <span className="text-[10px] text-[#0069AF] font-medium">{notification.project_name}</span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {notification.link && (
                          <Link to={notification.link} onClick={onClose}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-[#0069AF]">
                              <FolderOpen className="w-3 h-3" />
                            </Button>
                          </Link>
                        )}
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markAsRead.mutate(notification.id)}
                            className="h-6 w-6 text-slate-400 hover:text-emerald-600"
                            title="Mark as read"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => dismissNotification.mutate(notification.id)}
                          className="h-6 w-6 text-slate-400 hover:text-red-500"
                          title="Dismiss"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Inbox className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-900">All caught up</p>
                <p className="text-xs text-slate-500 text-center mt-1">
                  Notifications for assignments, mentions, and due tasks will appear here.
                </p>
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100">
              <Link
                to={createPageUrl('MyNotifications')}
                onClick={onClose}
                className="text-xs text-[#0069AF] hover:text-[#0F2F44] font-medium"
              >
                View all notifications
              </Link>
            </div>
          )}
        </TabsContent>

        {/* Email Settings Tab */}
        <TabsContent value="settings" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-[420px]">
            <div className="p-4 space-y-3">
              <div className="pb-2 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-900">Email Notifications</p>
                <p className="text-[11px] text-slate-500">Choose what you get emailed about</p>
              </div>

              {/* Email Frequency */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-xs font-medium text-slate-700">Delivery</Label>
                  <p className="text-[11px] text-slate-500">How often to send emails</p>
                </div>
                <Select
                  value={settings.email_frequency}
                  onValueChange={(v) => handleSettingChange('email_frequency', v)}
                >
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="daily_digest">Daily</SelectItem>
                    <SelectItem value="weekly_digest">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Notify me when...</p>
              </div>

              {/* Task Assigned */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-blue-100">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Task assigned to me</Label>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_task_assigned}
                  onCheckedChange={(v) => handleSettingChange('notify_task_assigned', v)}
                  className="scale-90"
                />
              </div>

              {/* Project Assigned */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-blue-100">
                    <FolderOpen className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Added to a project</Label>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_project_assigned}
                  onCheckedChange={(v) => handleSettingChange('notify_project_assigned', v)}
                  className="scale-90"
                />
              </div>

              {/* Mentions */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-indigo-100">
                    <AtSign className="w-3 h-3 text-indigo-600" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Someone @mentions me</Label>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_mentions}
                  onCheckedChange={(v) => handleSettingChange('notify_mentions', v)}
                  className="scale-90"
                />
              </div>

              {/* Due Tasks */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-100">
                    <Clock className="w-3 h-3 text-amber-600" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Upcoming due tasks</Label>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_task_due_soon}
                  onCheckedChange={(v) => handleSettingChange('notify_task_due_soon', v)}
                  className="scale-90"
                />
              </div>

              {/* Reminder days */}
              {settings.notify_task_due_soon && (
                <div className="ml-7 flex items-center gap-2 py-1">
                  <Label className="text-[11px] text-slate-500">Remind</Label>
                  <Select
                    value={String(settings.due_reminder_days)}
                    onValueChange={(v) => handleSettingChange('due_reminder_days', parseInt(v))}
                  >
                    <SelectTrigger className="w-28 h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day before</SelectItem>
                      <SelectItem value="2">2 days before</SelectItem>
                      <SelectItem value="3">3 days before</SelectItem>
                      <SelectItem value="7">1 week before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Overdue */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-red-100">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Overdue tasks</Label>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_task_overdue}
                  onCheckedChange={(v) => handleSettingChange('notify_task_overdue', v)}
                  className="scale-90"
                />
              </div>

              {/* Save Button */}
              {hasChanges && (
                <Button
                  onClick={() => saveMutation.mutate(settings)}
                  disabled={saveMutation.isPending}
                  size="sm"
                  className="w-full bg-[#0069AF] hover:bg-[#0F2F44] text-xs h-8 mt-2"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3 mr-1.5" />
                  )}
                  Save Preferences
                </Button>
              )}

              <p className="text-[10px] text-slate-400 text-center pt-1">
                Only notifications from active (non-archived) projects are shown and emailed.
              </p>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

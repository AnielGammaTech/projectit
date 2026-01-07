import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Bell, Mail, Clock, CheckCircle2, AlertTriangle, Save, Loader2, Package, MessageSquare, AtSign, FolderOpen, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState({
    notify_task_assigned: true,
    notify_task_due_soon: true,
    notify_task_overdue: true,
    notify_task_completed: true,
    notify_part_status_change: true,
    notify_project_updates: true,
    notify_project_assigned: true,
    notify_mentions: true,
    notify_new_comments: false,
    due_reminder_days: 1,
    email_frequency: 'instant'
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ['notificationSettings', currentUser?.email],
    queryFn: async () => {
      const results = await base44.entities.NotificationSettings.filter({ user_email: currentUser.email });
      return results[0] || null;
    },
    enabled: !!currentUser?.email
  });

  const { data: integrationSettings } = useQuery({
    queryKey: ['integrationSettings'],
    queryFn: async () => {
      const settings = await base44.entities.IntegrationSettings.filter({ setting_key: 'main' });
      return settings[0] || {};
    }
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings({
                notify_task_assigned: savedSettings.notify_task_assigned ?? true,
                notify_task_due_soon: savedSettings.notify_task_due_soon ?? true,
                notify_task_overdue: savedSettings.notify_task_overdue ?? true,
                notify_task_completed: savedSettings.notify_task_completed ?? true,
                notify_part_status_change: savedSettings.notify_part_status_change ?? true,
                notify_project_updates: savedSettings.notify_project_updates ?? true,
                notify_project_assigned: savedSettings.notify_project_assigned ?? true,
                notify_mentions: savedSettings.notify_mentions ?? true,
                notify_new_comments: savedSettings.notify_new_comments ?? false,
                due_reminder_days: savedSettings.due_reminder_days ?? 1,
                email_frequency: savedSettings.email_frequency ?? 'instant'
              });
    }
  }, [savedSettings]);

  const sendTestEmail = async () => {
    setSendingTest(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: currentUser.email,
        subject: 'Test Email from ProjectIT',
        body: `<h2>Test Email</h2><p>This is a test email to confirm your notification settings are working correctly.</p><p>Sent at ${new Date().toLocaleString()}</p>`
      });
      toast.success('Test email sent! Check your inbox.');
    } catch (err) {
      toast.error('Failed to send test email: ' + err.message);
    }
    setSendingTest(false);
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (savedSettings) {
        return base44.entities.NotificationSettings.update(savedSettings.id, data);
      } else {
        return base44.entities.NotificationSettings.create({
          ...data,
          user_email: currentUser.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      toast.success('Settings saved successfully');
      setHasChanges(false);
    }
  });

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Notification Settings</h1>
          <p className="text-slate-500 mt-1">Manage your email notification preferences</p>
        </motion.div>



        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Email Frequency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-500" />
                Email Delivery
              </CardTitle>
              <CardDescription>
                Choose how you want to receive email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <Label className="text-base font-medium text-slate-900">Delivery Frequency</Label>
                  <p className="text-sm text-slate-500 mt-0.5">How often should we send you email notifications?</p>
                </div>
                <Select 
                  value={settings.email_frequency} 
                  onValueChange={(v) => handleChange('email_frequency', v)}
                >
                  <SelectTrigger className="w-44 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="daily_digest">Daily Digest</SelectItem>
                    <SelectItem value="weekly_digest">Weekly Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="outline" 
                onClick={sendTestEmail}
                disabled={sendingTest}
                className="w-full"
              >
                {sendingTest ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Test Email
              </Button>
            </CardContent>
          </Card>

          {/* Task Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                Task Notifications
              </CardTitle>
              <CardDescription>
                Notifications about tasks assigned to you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Task Assigned */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <Label className="text-base font-medium text-slate-900">Task Assigned</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Get notified when a task is assigned to you</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_task_assigned}
                  onCheckedChange={(v) => handleChange('notify_task_assigned', v)}
                />
              </div>

              {/* Task Completed */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <Label className="text-base font-medium text-slate-900">Task Completed</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Get notified when tasks you're involved in are completed</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_task_completed}
                  onCheckedChange={(v) => handleChange('notify_task_completed', v)}
                />
              </div>

              {/* Task Due Soon */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <Label className="text-base font-medium text-slate-900">Task Due Soon</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Get reminded before a task is due</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_task_due_soon}
                  onCheckedChange={(v) => handleChange('notify_task_due_soon', v)}
                />
              </div>

              {/* Reminder Days */}
              {settings.notify_task_due_soon && (
                <div className="ml-16 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm text-slate-700">Remind me</Label>
                    <Select 
                      value={String(settings.due_reminder_days)} 
                      onValueChange={(v) => handleChange('due_reminder_days', parseInt(v))}
                    >
                      <SelectTrigger className="w-32 bg-white">
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
                </div>
              )}

              {/* Task Overdue */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-red-100">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <Label className="text-base font-medium text-slate-900">Task Overdue</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Get notified when a task becomes overdue</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_task_overdue}
                  onCheckedChange={(v) => handleChange('notify_task_overdue', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Project & Parts Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-violet-500" />
                Project & Parts
              </CardTitle>
              <CardDescription>
                Notifications about projects and materials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Project Assigned */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <Label className="text-base font-medium text-slate-900">Project Assigned</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Get notified when you are added to a project</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_project_assigned}
                  onCheckedChange={(v) => handleChange('notify_project_assigned', v)}
                />
              </div>

              {/* Project Updates */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-violet-100">
                    <FolderOpen className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <Label className="text-base font-medium text-slate-900">Project Updates</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Get notified about progress updates on your projects</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_project_updates}
                  onCheckedChange={(v) => handleChange('notify_project_updates', v)}
                />
              </div>

              {/* Part Status Changes */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <Package className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <Label className="text-base font-medium text-slate-900">Part Status Changes</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Get notified when parts are ordered, received, or installed</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_part_status_change}
                  onCheckedChange={(v) => handleChange('notify_part_status_change', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Communication Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-500" />
                Communication
              </CardTitle>
              <CardDescription>
                Notifications about messages and mentions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mentions */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-teal-100">
                    <AtSign className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <Label className="text-base font-medium text-slate-900">@Mentions</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Get notified when someone mentions you in notes or comments</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_mentions}
                  onCheckedChange={(v) => handleChange('notify_mentions', v)}
                />
              </div>

              {/* New Comments */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-slate-200">
                    <MessageSquare className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <Label className="text-base font-medium text-slate-900">New Comments</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Get notified about new comments on tasks you follow</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_new_comments}
                  onCheckedChange={(v) => handleChange('notify_new_comments', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || saveMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
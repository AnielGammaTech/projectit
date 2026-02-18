import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { User, Mail, Camera, Lock, LogOut, ArrowLeft, Loader2, Sun, Moon, Monitor, Palette, Bell, CheckCircle2, AtSign, MessageCircle, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';
import { createPageUrl, resolveUploadUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Light background with dark text' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark background with light text' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow your system preferences' },
  { value: 'high_contrast', label: 'High Contrast', icon: Palette, description: 'Enhanced visibility' }
];

export default function Profile() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: '',
    avatar_color: 'bg-blue-500',
    theme: 'light',
    show_dashboard_widgets: true
  });

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setFormData({
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || '',
        avatar_color: user.avatar_color || 'bg-blue-500',
        theme: user.theme || 'light',
        show_dashboard_widgets: user.show_dashboard_widgets !== false
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Fetch user notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['userNotifications', currentUser?.email],
    queryFn: () => base44.entities.UserNotification.filter({ user_email: currentUser.email }, '-created_date', 50),
    enabled: !!currentUser?.email
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: (notificationId) => base44.entities.UserNotification.update(notificationId, { is_read: true }),
    onSuccess: () => refetchNotifications()
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      for (const n of notifications.filter(n => !n.is_read)) {
        await base44.entities.UserNotification.update(n.id, { is_read: true });
      }
    },
    onSuccess: () => refetchNotifications()
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, avatar_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(formData);
    const updated = await base44.auth.me();
    setCurrentUser(updated);
    setSaving(false);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#0069AF]" />
                My Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  {formData.avatar_url ? (
                    <img
                      src={resolveUploadUrl(formData.avatar_url)}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className={cn(
                      "w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg",
                      formData.avatar_color
                    )}>
                      {getInitials(formData.full_name || currentUser?.email)}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#0069AF]" />
                    ) : (
                      <Camera className="w-4 h-4 text-[#0069AF]" />
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{currentUser?.full_name || 'User'}</h2>
                  <p className="text-slate-500">{currentUser?.email}</p>
                  <p className="text-xs text-slate-400 mt-1 capitalize">{currentUser?.role || 'user'}</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Avatar Color (if no image) */}
              {!formData.avatar_url && (
                <div>
                  <Label>Avatar Color</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {avatarColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, avatar_color: color }))}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          color,
                          formData.avatar_color === color && "ring-2 ring-offset-2 ring-[#0069AF]"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {formData.avatar_url && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, avatar_url: '' }))}
                >
                  Remove Photo
                </Button>
              )}

              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full bg-[#0069AF] hover:bg-[#133F5C]"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#0069AF]" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
                  )}
                </CardTitle>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => markAllAsRead.mutate()}
                    className="text-xs text-slate-500"
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <CardDescription>Mentions and updates from your team</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          notification.is_read 
                            ? "bg-white border-slate-100" 
                            : "bg-blue-50 border-blue-100"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              notification.type === 'mention' && "bg-indigo-100 text-indigo-600",
                              notification.type === 'progress_update' && "bg-emerald-100 text-emerald-600",
                              notification.type === 'task_assigned' && "bg-blue-100 text-blue-600"
                            )}>
                              {notification.type === 'mention' && <AtSign className="w-4 h-4" />}
                              {notification.type === 'progress_update' && <MessageCircle className="w-4 h-4" />}
                              {notification.type === 'task_assigned' && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                              {notification.from_user_name && (
                                <p className="text-xs text-slate-400 mt-1">From: {notification.from_user_name}</p>
                              )}
                              <p className="text-[10px] text-slate-400 mt-1">
                                {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {notification.link && (
                              <Link to={notification.link}>
                                <Button variant="ghost" size="sm" className="text-xs h-7">
                                  View
                                </Button>
                              </Link>
                            )}
                            {!notification.is_read && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => markAsRead.mutate(notification.id)}
                                className="text-xs h-7"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Bell className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No notifications yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dashboard Settings */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-[#0069AF]" />
                Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Widgets</Label>
                  <p className="text-xs text-slate-500 mt-1">Display customizable widgets on your dashboard</p>
                </div>
                <Switch
                  checked={formData.show_dashboard_widgets}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_dashboard_widgets: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#0069AF]" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="mb-4 block">Theme</Label>
              <div className="grid grid-cols-2 gap-3">
                {themeOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setFormData(prev => ({ ...prev, theme: option.value }))}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
                        formData.theme === option.value
                          ? "border-[#0069AF] bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        formData.theme === option.value ? "bg-[#0069AF] text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{option.label}</div>
                        <div className="text-xs text-slate-500">{option.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Theme settings are saved to your profile and will apply across all your devices.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <LogOut className="w-5 h-5" />
                Sign Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">Sign out of your account on this device.</p>
              <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
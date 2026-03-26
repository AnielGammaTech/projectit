import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { User, Mail, Camera, Lock, LogOut, ArrowLeft, Loader2, Sun, Moon, Monitor, Palette, Bell, CheckCircle2, AtSign, MessageCircle, LayoutGrid, Shield, ShieldCheck, ShieldAlert, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';
import { createPageUrl, resolveUploadUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/ThemeProvider';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'high_contrast', label: 'Contrast', icon: Palette }
];

export default function Profile() {
  const queryClient = useQueryClient();
  const { setTheme: applyTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: '',
    avatar_color: 'bg-blue-500',
    theme: 'light',
    show_dashboard_widgets: true
  });

  useEffect(() => {
    api.auth.me().then(user => {
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

  // MFA status
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaDeadline, setMfaDeadline] = useState(null);

  useEffect(() => {
    if (!currentUser?.email) return;
    const checkMfa = async () => {
      try {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const hasVerified = factorsData?.totp?.some(f => f.status === 'verified');
        setMfaEnabled(!!hasVerified);
        if (currentUser.mfa_enforcement_deadline) {
          setMfaDeadline(new Date(currentUser.mfa_enforcement_deadline));
        }
      } catch (err) {
        console.error('MFA status check failed:', err);
      }
    };
    checkMfa();
  }, [currentUser?.email, currentUser?.mfa_enforcement_deadline]);

  // Fetch user notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['userNotifications', currentUser?.email],
    queryFn: () => api.entities.UserNotification.filter({ user_email: currentUser.email }, '-created_date', 50),
    enabled: !!currentUser?.email
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: (notificationId) => api.entities.UserNotification.update(notificationId, { is_read: true }),
    onSuccess: () => refetchNotifications()
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      for (const n of notifications.filter(n => !n.is_read)) {
        await api.entities.UserNotification.update(n.id, { is_read: true });
      }
    },
    onSuccess: () => refetchNotifications()
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await api.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, avatar_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await api.auth.updateMe(formData);
    const updated = await api.auth.me();
    setCurrentUser(updated);
    if (formData.theme) {
      applyTheme(formData.theme);
    }
    setSaving(false);
  };

  const handleLogout = () => {
    api.auth.logout();
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0069AF]" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b]">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <Link to={createPageUrl('Dashboard')} className="inline-flex items-center text-[#0069AF] hover:text-[#133F5C] mb-5 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Dashboard
        </Link>

        {/* Profile Hero */}
        <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden mb-6">
          <div className="h-20 bg-gradient-to-r from-[#0F2F44] via-[#133F5C] to-[#0069AF]" />
          <div className="px-6 pb-5 -mt-10">
            <div className="flex items-end gap-4">
              <div className="relative">
                {formData.avatar_url ? (
                  <img
                    src={resolveUploadUrl(formData.avatar_url)}
                    alt="Avatar"
                    className="w-20 h-20 rounded-xl object-cover border-4 border-white dark:border-[#1e2a3a] shadow-lg"
                  />
                ) : (
                  <div className={cn(
                    "w-20 h-20 rounded-xl flex items-center justify-center text-white text-xl font-bold border-4 border-white dark:border-[#1e2a3a] shadow-lg",
                    formData.avatar_color
                  )}>
                    {getInitials(formData.full_name || currentUser?.email)}
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0069AF]" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-[#0069AF]" />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser?.full_name || 'User'}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{currentUser?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800/50 dark:hover:bg-red-900/20 shrink-0">
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-white dark:bg-[#1e2a3a] rounded-xl border border-slate-200 dark:border-slate-700/50 p-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center",
                  activeTab === tab.id
                    ? "bg-[#0069AF] text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge > 0 && (
                  <Badge className={cn("h-5 min-w-5 p-0 justify-center text-[10px]", activeTab === tab.id ? "bg-white/20 text-white" : "bg-red-500 text-white")}>
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
          {activeTab === 'profile' && (
            <div className="p-6 space-y-5">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>

              {/* Avatar Color (if no image) */}
              {!formData.avatar_url && (
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Avatar Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {avatarColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, avatar_color: color }))}
                        className={cn(
                          "w-7 h-7 rounded-full transition-all",
                          color,
                          formData.avatar_color === color && "ring-2 ring-offset-2 ring-[#0069AF] dark:ring-offset-[#1e2a3a]"
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

              {/* Dashboard Settings inline */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Dashboard Widgets</Label>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Show widgets on your dashboard</p>
                </div>
                <Switch
                  checked={formData.show_dashboard_widgets}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_dashboard_widgets: checked }))}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#0069AF] hover:bg-[#133F5C]"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="p-6">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 block">Theme</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {themeOptions.map(option => {
                  const Icon = option.icon;
                  const isActive = formData.theme === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, theme: option.value }));
                        applyTheme(option.value);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        isActive
                          ? "border-[#0069AF] bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-xl",
                        isActive ? "bg-[#0069AF] text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={cn("text-sm font-medium", isActive ? "text-[#0069AF] dark:text-blue-400" : "text-slate-700 dark:text-slate-300")}>{option.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">
                Theme is saved to your profile and syncs across devices.
              </p>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    mfaEnabled
                      ? "bg-emerald-100 dark:bg-emerald-900/30"
                      : "bg-amber-100 dark:bg-amber-900/30"
                  )}>
                    {mfaEnabled
                      ? <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      : <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Two-Factor Authentication</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {mfaEnabled ? 'Enabled via Authenticator App' : 'Not yet configured'}
                    </p>
                  </div>
                </div>
                <Badge className={cn(
                  "border-0",
                  mfaEnabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                )}>
                  {mfaEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              {!mfaEnabled && mfaDeadline && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    You must set up 2FA by <strong>{format(mfaDeadline, 'MMMM d, yyyy')}</strong>
                  </p>
                </div>
              )}
              <Link to={createPageUrl('SecuritySettings')}>
                <Button className="bg-[#0069AF] hover:bg-[#133F5C]">
                  {mfaEnabled ? 'Manage 2FA' : 'Set Up 2FA'}
                </Button>
              </Link>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {unreadCount > 0 && (
                <div className="px-6 py-3 flex items-center justify-between bg-slate-50/50 dark:bg-[#151d2b]/50">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{unreadCount} unread</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsRead.mutate()}
                    className="text-xs text-[#0069AF]"
                  >
                    Mark all as read
                  </Button>
                </div>
              )}
              {notifications.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={cn(
                        "px-6 py-3 flex items-start gap-3 transition-colors",
                        !notification.is_read && "bg-blue-50/50 dark:bg-blue-900/10"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg mt-0.5 shrink-0",
                        notification.type === 'mention' && "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
                        notification.type === 'progress_update' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                        notification.type === 'task_assigned' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      )}>
                        {notification.type === 'mention' && <AtSign className="w-3.5 h-3.5" />}
                        {notification.type === 'progress_update' && <MessageCircle className="w-3.5 h-3.5" />}
                        {notification.type === 'task_assigned' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{notification.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{notification.message}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {notification.from_user_name && `${notification.from_user_name} · `}
                          {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {notification.link && (
                          <Link to={notification.link}>
                            <Button variant="ghost" size="sm" className="text-xs h-7 px-2">View</Button>
                          </Link>
                        )}
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead.mutate(notification.id)}
                            className="h-7 w-7 p-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';
import { User, Mail, Camera, Lock, LogOut, ArrowLeft, Loader2, Sun, Moon, Monitor, Palette, CheckCircle2, AtSign, Shield, ShieldCheck, ShieldAlert, Save, Clock, AlertTriangle, Package, FolderOpen, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl, resolveUploadUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/ThemeProvider';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

import { avatarColors } from '@/constants/colors';

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'high_contrast', label: 'Contrast', icon: Palette }
];

export default function Profile() {
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
    show_dashboard_widgets: true,
    job_title: '',
    phone: '',
    timezone: 'America/New_York'
  });

  useEffect(() => {
    api.auth.me().then(user => {
      setCurrentUser(user);
      setFormData({
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || '',
        avatar_color: user.avatar_color || 'bg-blue-500',
        theme: user.theme || 'light',
        show_dashboard_widgets: user.show_dashboard_widgets !== false,
        job_title: user.job_title || '',
        phone: user.phone || '',
        timezone: user.timezone || 'America/New_York'
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // MFA status
  const [mfaEnabled, setMfaEnabled] = useState(null); // null = loading
  const [mfaDeadline, setMfaDeadline] = useState(null);

  // Email preferences state
  const [emailPrefs, setEmailPrefs] = useState({
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
  const [emailPrefsId, setEmailPrefsId] = useState(null);
  const [emailPrefsDirty, setEmailPrefsDirty] = useState(false);
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false);

  useEffect(() => {
    if (!currentUser?.email) return;
    const checkMfa = async () => {
      try {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        // Check both totp and all arrays for verified factors
        const totpVerified = factorsData?.totp?.some(f => f.status === 'verified');
        const allVerified = factorsData?.all?.some(f => f.status === 'verified');
        if (totpVerified || allVerified) {
          setMfaEnabled(true);
        } else {
          // Fallback: check AAL level from the session
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalData?.currentLevel === 'aal2' || aalData?.nextLevel === 'aal2') {
            setMfaEnabled(true);
          }
        }
        if (currentUser.mfa_enforcement_deadline) {
          setMfaDeadline(new Date(currentUser.mfa_enforcement_deadline));
        }
      } catch (err) {
        toast.error('Failed to load MFA status');
      }
    };
    checkMfa();
  }, [currentUser?.email, currentUser?.mfa_enforcement_deadline]);

  // Load email notification preferences
  useEffect(() => {
    if (!currentUser?.email) return;
    const loadEmailPrefs = async () => {
      try {
        const results = await api.entities.NotificationSettings.filter({ user_email: currentUser.email });
        if (results.length > 0) {
          const saved = results[0];
          setEmailPrefsId(saved.id);
          setEmailPrefs({
            notify_task_assigned: saved.notify_task_assigned ?? true,
            notify_task_due_soon: saved.notify_task_due_soon ?? true,
            notify_task_overdue: saved.notify_task_overdue ?? true,
            notify_task_completed: saved.notify_task_completed ?? true,
            notify_part_status_change: saved.notify_part_status_change ?? true,
            notify_project_updates: saved.notify_project_updates ?? true,
            notify_project_assigned: saved.notify_project_assigned ?? true,
            notify_mentions: saved.notify_mentions ?? true,
            notify_new_comments: saved.notify_new_comments ?? false,
            due_reminder_days: saved.due_reminder_days ?? 1,
            email_frequency: saved.email_frequency ?? 'instant'
          });
        }
      } catch (err) {
        toast.error('Failed to load email preferences');
      }
    };
    loadEmailPrefs();
  }, [currentUser?.email]);

  const handleEmailPrefChange = (key, value) => {
    setEmailPrefs(prev => ({ ...prev, [key]: value }));
    setEmailPrefsDirty(true);
  };

  const handleSaveEmailPrefs = async () => {
    setSavingEmailPrefs(true);
    try {
      if (emailPrefsId) {
        await api.entities.NotificationSettings.update(emailPrefsId, emailPrefs);
      } else {
        await api.entities.NotificationSettings.create({
          ...emailPrefs,
          user_email: currentUser.email
        });
      }
      setEmailPrefsDirty(false);
    } catch (err) {
      console.error('Failed to save email preferences:', err);
    }
    setSavingEmailPrefs(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, avatar_url: file_url }));
    } catch (err) {
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.auth.updateMe(formData);
      const updated = await api.auth.me();
      setCurrentUser(updated);
      if (formData.theme) {
        applyTheme(formData.theme);
      }
    } catch (err) {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'email', label: 'Email Preferences', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <Link to={createPageUrl('Dashboard')} className="inline-flex items-center text-primary hover:text-foreground mb-5 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Dashboard
        </Link>

        {/* Profile Hero */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
          <div className="h-20 bg-gradient-to-r from-[#0F2F44] to-[#1a4a6e]" />
          <div className="px-4 sm:px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {formData.avatar_url ? (
                  <img
                    src={resolveUploadUrl(formData.avatar_url)}
                    alt="Avatar"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                ) : (
                  <div className={cn(
                    "w-16 h-16 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm",
                    formData.avatar_color
                  )}>
                    {getInitials(formData.full_name || currentUser?.email)}
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  ) : (
                    <Camera className="w-3 h-3 text-primary" />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">{currentUser?.full_name || 'User'}</h1>
                <p className="text-sm text-muted-foreground truncate">{currentUser?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800/50 dark:hover:bg-red-900/20 shrink-0">
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-card rounded-xl border border-border p-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center",
                  activeTab === tab.id
                    ? "bg-[#0F2F44] dark:bg-[#0F2F44] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {activeTab === 'profile' && (
            <div className="p-4 sm:p-6 space-y-5">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="bg-muted/30 border"
                />
              </div>

              {/* Job Title / Role */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job Title</Label>
                <Input
                  value={formData.job_title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                  placeholder="e.g. Project Manager, Technician"
                  className="bg-muted/30 border"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</Label>
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="bg-muted/30 border"
                />
              </div>

              {/* Time Zone */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time Zone</Label>
                <Select value={formData.timezone || 'America/New_York'} onValueChange={(v) => setFormData(prev => ({ ...prev, timezone: v }))}>
                  <SelectTrigger className="bg-muted/30 border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska (AKT)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii (HT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Avatar Color (if no image) */}
              {!formData.avatar_url && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Avatar Color</Label>
                  <div className="grid grid-cols-6 gap-3">
                    {avatarColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, avatar_color: color }))}
                        className={cn(
                          "w-10 h-10 rounded-xl transition-all cursor-pointer flex items-center justify-center",
                          color,
                          formData.avatar_color === color ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : "hover:scale-105"
                        )}
                      >
                        {formData.avatar_color === color && <CheckCircle2 className="w-5 h-5 text-white" />}
                      </button>
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
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dashboard Widgets</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Show widgets on your dashboard</p>
                </div>
                <Switch
                  checked={formData.show_dashboard_widgets}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_dashboard_widgets: checked }))}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#0F2F44] dark:bg-[#0F2F44] hover:bg-[#1a4a6e] text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="p-4 sm:p-6">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Theme</Label>
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
                          ? "border-[#0F2F44] bg-[#0F2F44]/10 dark:bg-[#0F2F44]/20 dark:border-[#1a4a6e]"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-xl",
                        isActive ? "bg-[#0F2F44] text-white" : "bg-slate-100 dark:bg-slate-700 text-muted-foreground"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={cn("text-sm font-medium", isActive ? "text-[#0F2F44] dark:text-white" : "text-slate-700 dark:text-slate-300")}>{option.label}</span>
                    </button>
                  );
                })}
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#0F2F44] dark:bg-[#0F2F44] hover:bg-[#1a4a6e] text-white mt-5"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? 'Saving...' : 'Save Theme'}
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Theme is saved to your profile and syncs across devices.
              </p>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-4 sm:p-6 space-y-5">
              {/* MFA Status Card */}
              <div className={cn(
                "rounded-xl border p-4",
                mfaEnabled === null
                  ? "bg-slate-50/50 dark:bg-card border-border"
                  : mfaEnabled
                    ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40"
                    : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40"
              )}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    mfaEnabled === null
                      ? "bg-slate-100 dark:bg-slate-800"
                      : mfaEnabled
                        ? "bg-emerald-100 dark:bg-emerald-900/40"
                        : "bg-amber-100 dark:bg-amber-900/40"
                  )}>
                    {mfaEnabled === null
                      ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      : mfaEnabled
                        ? <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        : <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">Two-Factor Authentication</p>
                      {mfaEnabled === null ? (
                        <Badge className="border-0 text-[10px] px-2 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Checking...
                        </Badge>
                      ) : (
                        <Badge className={cn(
                          "border-0 text-[10px] px-2",
                          mfaEnabled
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                        )}>
                          {mfaEnabled ? 'Active' : 'Not Set Up'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {mfaEnabled === null
                        ? 'Checking your MFA status...'
                        : mfaEnabled
                          ? 'Your account is protected with an authenticator app'
                          : 'Add an extra layer of security to your account'
                      }
                    </p>
                  </div>
                </div>

                {!mfaEnabled && mfaDeadline && (
                  <div className="p-3 bg-amber-100/60 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/30 rounded-lg mb-3">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      You must set up 2FA by <strong>{format(mfaDeadline, 'MMMM d, yyyy')}</strong>
                    </p>
                  </div>
                )}

                <Link to={createPageUrl('SecuritySettings')}>
                  <Button className={cn(
                    "w-full",
                    mfaEnabled
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                      : "bg-[#0F2F44] dark:bg-[#0F2F44] hover:bg-[#1a4a6e] text-white"
                  )}>
                    <Shield className="w-4 h-4 mr-2" />
                    {mfaEnabled ? 'Manage 2FA Settings' : 'Set Up 2FA Now'}
                  </Button>
                </Link>
              </div>

              {/* Account Security Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Security</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Email</p>
                        <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                      </div>
                    </div>
                    <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">Verified</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Password</p>
                        <p className="text-xs text-muted-foreground">Last changed unknown</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Delivery Frequency */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Email Delivery</h3>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Delivery Frequency</p>
                    <p className="text-xs text-muted-foreground mt-0.5">How often should we send you email notifications?</p>
                  </div>
                  <Select
                    value={emailPrefs.email_frequency}
                    onValueChange={(v) => handleEmailPrefChange('email_frequency', v)}
                  >
                    <SelectTrigger className="w-44 bg-card border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="daily_digest">Daily Digest</SelectItem>
                      <SelectItem value="weekly_digest">Weekly Digest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Task Notifications */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Task Notifications</h3>
                <div className="space-y-2">
                  {[
                    { key: 'notify_task_assigned', label: 'Task Assigned', desc: 'When a task is assigned to you', icon: CheckCircle2, color: 'text-blue-600 dark:text-blue-400' },
                    { key: 'notify_task_completed', label: 'Task Completed', desc: 'When tasks you follow are completed', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
                    { key: 'notify_task_due_soon', label: 'Task Due Soon', desc: 'Reminders before a task is due', icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
                    { key: 'notify_task_overdue', label: 'Task Overdue', desc: 'When a task becomes overdue', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-3">
                          <Icon className={cn("w-4 h-4", item.color)} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={emailPrefs[item.key]}
                          onCheckedChange={(v) => handleEmailPrefChange(item.key, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project & Parts */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Projects & Parts</h3>
                <div className="space-y-2">
                  {[
                    { key: 'notify_project_assigned', label: 'Project Assigned', desc: 'When you are added to a project', icon: FolderOpen, color: 'text-blue-600 dark:text-blue-400' },
                    { key: 'notify_project_updates', label: 'Project Updates', desc: 'Progress updates on your projects', icon: FolderOpen, color: 'text-violet-600 dark:text-violet-400' },
                    { key: 'notify_part_status_change', label: 'Part Status Changes', desc: 'When parts are ordered, received, or installed', icon: Package, color: 'text-orange-600 dark:text-orange-400' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-3">
                          <Icon className={cn("w-4 h-4", item.color)} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={emailPrefs[item.key]}
                          onCheckedChange={(v) => handleEmailPrefChange(item.key, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Communication */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Communication</h3>
                <div className="space-y-2">
                  {[
                    { key: 'notify_mentions', label: '@Mentions', desc: 'When someone mentions you', icon: AtSign, color: 'text-teal-600 dark:text-teal-400' },
                    { key: 'notify_new_comments', label: 'New Comments', desc: 'New comments on tasks you follow', icon: MessageSquare, color: 'text-slate-600 dark:text-slate-400' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-3">
                          <Icon className={cn("w-4 h-4", item.color)} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={emailPrefs[item.key]}
                          onCheckedChange={(v) => handleEmailPrefChange(item.key, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={handleSaveEmailPrefs}
                disabled={!emailPrefsDirty || savingEmailPrefs}
                className="w-full bg-[#0F2F44] dark:bg-[#0F2F44] hover:bg-[#1a4a6e] text-white"
              >
                {savingEmailPrefs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {savingEmailPrefs ? 'Saving...' : 'Save Email Preferences'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

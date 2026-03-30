import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import UserAvatar from '@/components/UserAvatar';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users, Shield, Edit2, Trash2,
  Plus, MoreHorizontal, Mail, Phone, ArrowLeft,
  Building2, Tags, GitMerge,
  RefreshCw, Loader2, ChevronDown, ChevronRight, RotateCcw, Archive, Calendar,
  FileText, Layers, MessageSquare, Database, Activity,
  HardDrive, AlertTriangle, CheckCircle2, Save, Sparkles, Bot, Send, Copy, Check, Globe, KeyRound,
  Image, Search, Info, Rocket, Bug, Star, Wrench, Package, MapPin, Bell, Clock,
  Monitor, Smartphone, Wifi, Palette, Server
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { APP_VERSION, BUILD_HASH, BUILD_TIMESTAMP, BUILD_ENV } from '@/version';
import { changelog } from '@/changelog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl, resolveUploadUrl } from '@/utils';
import ApiDocsSection from '@/components/adminland/ApiDocsSection';

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const groupColors = {
  slate: 'bg-slate-500', red: 'bg-red-500', orange: 'bg-orange-500',
  amber: 'bg-amber-500', green: 'bg-green-500', emerald: 'bg-emerald-500',
  teal: 'bg-teal-500', cyan: 'bg-cyan-500', blue: 'bg-blue-500',
  indigo: 'bg-indigo-500', violet: 'bg-violet-500', purple: 'bg-purple-500', pink: 'bg-pink-500'
};

const adminMenuGroups = [
  {
    title: 'People & Access',
    icon: Users,
    color: 'from-blue-500 to-indigo-600',
    items: [
      { id: 'people', label: 'People & Teams', icon: Users, description: 'Team members, groups, and admins' },
      { id: 'roles', label: 'Roles & Permissions', icon: Shield, description: 'Access control', page: 'RolesPermissions' },
    ]
  },
  {
    title: 'Projects',
    icon: Layers,
    color: 'from-violet-500 to-purple-600',
    items: [
      { id: 'tags', label: 'Tags', icon: Tags, description: 'Project tags' },
      { id: 'statuses', label: 'Statuses', icon: Layers, description: 'Project statuses', page: 'ProjectStatuses' },
      { id: 'templates', label: 'Templates', icon: FileText, description: 'Project & task templates', page: 'Templates' },
      { id: 'project-management', label: 'Archived & Deleted', icon: Archive, description: 'Manage old projects' },
    ]
  },
  {
    title: 'Integrations & AI',
    icon: GitMerge,
    color: 'from-emerald-500 to-teal-600',
    items: [
      { id: 'integrations', label: 'Integrations', icon: GitMerge, description: 'HaloPSA & external services' },
      { id: 'workflows', label: 'Workflows', icon: GitMerge, description: 'Automation triggers', page: 'Workflows' },
      { id: 'ai-agents', label: 'AI Agents', icon: Bot, description: 'GammaAi agent connection' },
      { id: 'api-docs', label: 'API Docs & Keys', icon: Globe, description: 'External API documentation' },
    ]
  },
  {
    title: 'Inventory',
    icon: Package,
    color: 'from-amber-500 to-orange-600',
    items: [
      { id: 'inventory-settings', label: 'Inventory Settings', icon: Package, description: 'Stock locations, permissions & tools' },
    ]
  },
  {
    title: 'System',
    icon: Wrench,
    color: 'from-slate-500 to-slate-700',
    items: [
      { id: 'company', label: 'App Settings', icon: Building2, description: 'Branding & appearance' },
      { id: 'database-health', label: 'Database Health', icon: Database, description: 'Integrity checks & size' },
      { id: 'audit', label: 'Audit Logs', icon: Activity, description: 'Activity tracking', page: 'AuditLogs' },
      { id: 'feedback', label: 'Feedback', icon: MessageSquare, description: 'Bug reports', page: 'FeedbackManagement' },
      { id: 'about', label: 'About & System', icon: Info, description: 'Version, build, environment' },
    ]
  }
];

// Adminland Dashboard (Main)
export default function Adminland() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialSection = urlParams.get('section') || null;
  const [activeSection, setActiveSection] = useState(initialSection);
  const { user: currentUser, isLoadingAuth: isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Block non-admin users
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background  flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto px-4 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-48 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border dark:border-border overflow-hidden animate-pulse">
                <div className="px-4 py-3 bg-slate-50 dark:bg-background"><div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" /></div>
                <div className="p-3 space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/50" />
                      <div className="flex-1 space-y-1"><div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" /><div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-700/50 rounded" /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background  flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You need administrator privileges to access this page.</p>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'people':
        return <PeopleSection queryClient={queryClient} />;
      case 'company':
        return <CompanySettingsSection queryClient={queryClient} />;
      case 'integrations':
        return <IntegrationsSection queryClient={queryClient} />;
      case 'database-health':
        return <DatabaseHealthSection />;
      case 'tags':
        return <ProjectTagsSection queryClient={queryClient} />;
      case 'project-management':
        return <ProjectManagementSection queryClient={queryClient} />;
      case 'ai-agents':
        return <AIAgentsSection queryClient={queryClient} />;
      case 'inventory-settings':
        return <InventorySettingsSection queryClient={queryClient} />;
      case 'api-docs':
        return <ApiDocsSection queryClient={queryClient} />;
      case 'about':
        return <AboutSection />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background ">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeSection ? (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <button 
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 text-primary hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Adminland
            </button>
            {renderSection()}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-primary shadow-lg shadow-primary/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-3xl font-bold text-foreground tracking-tight">Adminland</h1>
              </div>
              <p className="text-muted-foreground">Manage your workspace settings</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {adminMenuGroups.map((group, gIdx) => (
                <motion.div
                  key={group.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gIdx * 0.1 }}
                  className="bg-card rounded-2xl border dark:border-border shadow-sm overflow-hidden"
                >
                  <div className="px-4 py-3 bg-slate-50 dark:bg-background border-b dark:border-border flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-lg bg-gradient-to-br shadow-sm", group.color)}>
                      <group.icon className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="font-semibold text-slate-700 dark:text-slate-200">{group.title}</h2>
                  </div>
                  <div className="divide-y dark:divide-slate-700/50">
                    {group.items.map((item) => {
                      const content = (
                        <>
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 group-hover:bg-primary transition-colors">
                            <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground block">{item.label}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors" />
                        </>
                      );
                      return item.page ? (
                        <Link
                          key={item.id}
                          to={createPageUrl(item.page)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group text-left"
                        >
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Consolidated People & Teams Section
function PeopleSection({ queryClient }) {
  const [activeTab, setActiveTab] = useState('members');
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resetPasswordMember, setResetPasswordMember] = useState(null);
  const [resetMfaMember, setResetMfaMember] = useState(null);

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list('name')
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => api.entities.UserGroup.list('name')
  });

  const [savingMember, setSavingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  const handleSaveMember = async (data) => {
    setSavingMember(true);
    setMemberError('');
    try {
      if (editing) {
        await api.entities.TeamMember.update(editing.id, data);
      } else {
        // Invite creates both a users row and a TeamMember entity + sends welcome email
        await api.users.inviteUser(data.email, data.role, data.name, data.avatar_color);
      }
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setShowModal(false);
      setEditing(null);
    } catch (err) {
      console.error('Failed to save member:', err);
      const msg = err?.message || err?.error || 'Failed to save team member';
      setMemberError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSavingMember(false);
    }
  };

  const handleSaveGroup = async (data) => {
    if (editingGroup) {
      await api.entities.UserGroup.update(editingGroup.id, data);
    } else {
      await api.entities.UserGroup.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['userGroups'] });
    setShowGroupModal(false);
    setEditingGroup(null);
  };

  const handleDelete = async () => {
    try {
      if (deleteConfirm.type === 'member') {
        // Full delete: removes Supabase Auth user, users table row, AND TeamMember entity
        const memberEmail = deleteConfirm.item.email;
        if (memberEmail) {
          await api.users.deleteUser(memberEmail);
        } else {
          // Fallback: just delete TeamMember entity if no email
          await api.entities.TeamMember.delete(deleteConfirm.item.id);
        }
        queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      } else {
        await api.entities.UserGroup.delete(deleteConfirm.item.id);
        queryClient.invalidateQueries({ queryKey: ['userGroups'] });
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setDeleteConfirm(null);
  };

  const [resendingInvite, setResendingInvite] = useState(null); // email of user being re-invited

  const handleResendInvite = async (member) => {
    if (!member.email) return;
    setResendingInvite(member.email);
    try {
      await api.users.resendInvite(member.email);
      alert(`Invite re-sent to ${member.email}`);
    } catch (err) {
      console.error('Resend invite failed:', err);
      alert(err?.message || 'Failed to resend invite');
    } finally {
      setResendingInvite(null);
    }
  };

  const handleResetPassword = async (email, newPassword) => {
    try {
      await api.users.resetPassword(email, newPassword);
      toast.success('Password has been reset successfully');
      setResetPasswordMember(null);
    } catch (err) {
      console.error('Reset password failed:', err);
      throw err;
    }
  };

  const handleResetMfa = async () => {
    if (!resetMfaMember) return;
    try {
      await api.users.resetMfa(resetMfaMember.email);
      toast.success('MFA has been reset successfully');
      setResetMfaMember(null);
    } catch (err) {
      console.error('Reset MFA failed:', err);
      toast.error(err?.message || 'Failed to reset MFA');
      setResetMfaMember(null);
    }
  };

  const toggleAdmin = async (member) => {
    const newRole = member.role === 'Admin' ? '' : 'Admin';
    await api.entities.TeamMember.update(member.id, { ...member, role: newRole });
    queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
  };

  const admins = members.filter(m => m.role === 'Admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMember, setExpandedMember] = useState(null);

  // Fetch user sessions/activity for online status and last sign-in
  const { data: userSessions = [] } = useQuery({
    queryKey: ['userSessions'],
    queryFn: async () => {
      try {
        const result = await api.entities.UserSession?.list?.();
        return result || [];
      } catch {
        return [];
      }
    },
    staleTime: 30000
  });

  const getSessionInfo = (email) => {
    const sessions = userSessions.filter(s => s.user_email === email);
    const latest = sessions.sort((a, b) => new Date(b.created_date || b.last_active) - new Date(a.created_date || a.last_active))[0];
    if (!latest) return null;
    const lastActive = new Date(latest.last_active || latest.created_date);
    const isOnline = (Date.now() - lastActive.getTime()) < 5 * 60 * 1000; // 5 min
    return { ...latest, isOnline, lastActive };
  };

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  return (
    <div className="bg-card rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-border overflow-hidden">
      <div className="p-6 border-b dark:border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">People & Teams</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage team members, groups, and admin access</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-border bg-slate-50/50 dark:bg-background/50">
        {[
          { id: 'members', label: 'Team Members', count: members.length },
          { id: 'groups', label: 'Groups', count: groups.length },
          { id: 'admins', label: 'Administrators', count: admins.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 py-3.5 text-sm font-medium border-b-2 transition-all",
              activeTab === tab.id
                ? "border-primary text-primary dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-muted-foreground hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            {tab.label}
            <span className={cn(
              "ml-2 px-2 py-0.5 text-xs rounded-full",
              activeTab === tab.id
                ? "bg-primary/10 text-primary dark:bg-blue-400/10 dark:text-blue-400"
                : "bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Team Members Tab */}
      {activeTab === 'members' && (
        <div>
          <div className="p-4 border-b dark:border-border flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-slate-50 dark:bg-background border-slate-200 dark:border-border"
              />
            </div>
            <Button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-primary hover:bg-primary/80 h-9">
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
          <div className="divide-y dark:divide-slate-700/50">
            {filteredMembers.map((member) => {
              const session = getSessionInfo(member.email);
              const isExpanded = expandedMember === member.id;
              return (
                <div key={member.id} className="transition-colors">
                  <div
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-700/20 cursor-pointer group"
                    onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <UserAvatar
                          email={member.email}
                          name={member.name}
                          avatarUrl={member.avatar_url}
                          avatarColor={member.avatar_color}
                          size="lg"
                          className="ring-2 ring-white dark:ring-slate-800 shadow-sm"
                        />
                        {/* Online indicator */}
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-card",
                          session?.isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
                          {member.role && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-2 py-0 h-5 font-medium shrink-0",
                                member.role === 'Admin' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50",
                                member.role === 'Manager' && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50",
                                member.role === 'Technician' && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50",
                                member.role === 'Viewer' && "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-700/30 dark:text-slate-400 dark:border-slate-600/50"
                              )}
                            >
                              {member.role}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="hidden sm:flex items-center gap-1 mr-2">
                        {session?.isOnline ? (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">Online</span>
                        ) : session?.lastActive ? (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            Last seen {(() => {
                              const diff = Date.now() - session.lastActive.getTime();
                              const mins = Math.floor(diff / 60000);
                              if (mins < 60) return `${mins}m ago`;
                              const hrs = Math.floor(mins / 60);
                              if (hrs < 24) return `${hrs}h ago`;
                              const days = Math.floor(hrs / 24);
                              return `${days}d ago`;
                            })()}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">Never signed in</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(member); setShowModal(true); }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditing(member); setShowModal(true); }}>
                              <Edit2 className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResendInvite(member)} disabled={resendingInvite === member.email}>
                              <Send className="w-4 h-4 mr-2" />
                              {resendingInvite === member.email ? 'Sending...' : 'Re-invite'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setResetPasswordMember(member)}>
                              <KeyRound className="w-4 h-4 mr-2" />Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setResetMfaMember(member)}>
                              <Shield className="w-4 h-4 mr-2" />Reset MFA
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteConfirm({ type: 'member', item: member })} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 bg-slate-50/50 dark:bg-background/50 border-t border-slate-100 dark:border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 ml-[52px]">
                        {/* Contact Info */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Contact</p>
                          <div className="space-y-1.5">
                            <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {member.email}
                            </a>
                            {member.phone ? (
                              <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {member.phone}
                              </a>
                            ) : (
                              <p className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                                <Phone className="w-3.5 h-3.5" />
                                No phone
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Last Sign-In */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Last Sign-In</p>
                          <div className="space-y-1.5">
                            {session?.lastActive ? (
                              <>
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {session.lastActive.toLocaleDateString()} at {session.lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                                  {session.ip_address || 'IP not available'}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                  {(session.device_type === 'mobile' || session.user_agent?.includes('Mobile')) ? (
                                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                                  ) : (
                                    <Monitor className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                  {session.device_type || session.user_agent?.split('(')[1]?.split(')')[0]?.slice(0, 30) || 'Unknown device'}
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No sign-in data available</p>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Status</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs">
                              <div className={cn("w-2 h-2 rounded-full", session?.isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")} />
                              <span className={cn(session?.isOnline ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground")}>
                                {session?.isOnline ? 'Currently Online' : 'Offline'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                              <Shield className="w-3.5 h-3.5 text-slate-400" />
                              {member.role || 'No role assigned'}
                            </div>
                            {member.created_date && (
                              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                Joined {new Date(member.created_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredMembers.length === 0 && members.length > 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No members match "{searchQuery}"</p>
              </div>
            )}
            {members.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-muted-foreground font-medium">No team members yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Invite someone to get started</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div>
          <div className="p-4 border-b dark:border-border flex justify-end">
            <Button onClick={() => { setEditingGroup(null); setShowGroupModal(true); }} className="bg-primary hover:bg-primary/80 h-9">
              <Plus className="w-4 h-4 mr-2" />
              Add Group
            </Button>
          </div>
          <div className="divide-y dark:divide-slate-700/50">
            {groups.map((group) => (
              <div key={group.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", groupColors[group.color] || 'bg-indigo-500')}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{group.name}</p>
                    <p className="text-sm text-muted-foreground">{group.member_emails?.length || 0} member{(group.member_emails?.length || 0) !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingGroup(group); setShowGroupModal(true); }}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingGroup(group); setShowGroupModal(true); }}>
                        <Edit2 className="w-4 h-4 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteConfirm({ type: 'group', item: group })} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {groups.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-muted-foreground font-medium">No groups yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Create a group to organize your team</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admins Tab */}
      {activeTab === 'admins' && (
        <div className="p-5 space-y-5">
          {admins.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-border overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 dark:bg-background border-b dark:border-border">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Current Administrators</h3>
              </div>
              <div className="divide-y dark:divide-slate-700/50">
                {admins.map(member => (
                  <div key={member.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        email={member.email}
                        name={member.name}
                        avatarUrl={member.avatar_url}
                        avatarColor={member.avatar_color}
                        size="md"
                      />
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" onClick={() => toggleAdmin(member)}>
                      Remove Admin
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-border overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-background border-b dark:border-border">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Make Admin</h3>
            </div>
            <div className="divide-y dark:divide-slate-700/50">
              {members.filter(m => m.role !== 'Admin').map(member => (
                <div key={member.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      email={member.email}
                      name={member.name}
                      avatarUrl={member.avatar_url}
                      avatarColor={member.avatar_color}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-primary hover:bg-primary/80 text-xs" onClick={() => toggleAdmin(member)}>
                    Make Admin
                  </Button>
                </div>
              ))}
              {members.filter(m => m.role !== 'Admin').length === 0 && (
                <p className="text-muted-foreground text-center py-6 text-sm">All team members are administrators</p>
              )}
            </div>
          </div>
        </div>
      )}

      <TeamMemberModal open={showModal} onClose={() => { setShowModal(false); setEditing(null); setMemberError(''); }} member={editing} onSave={handleSaveMember} saving={savingMember} error={memberError} />
      <UserGroupModal open={showGroupModal} onClose={() => { setShowGroupModal(false); setEditingGroup(null); }} group={editingGroup} members={members} onSave={handleSaveGroup} />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResetPasswordModal
        open={!!resetPasswordMember}
        onClose={() => setResetPasswordMember(null)}
        member={resetPasswordMember}
        onSave={handleResetPassword}
      />

      {/* Reset MFA Confirmation Dialog */}
      <AlertDialog open={!!resetMfaMember} onOpenChange={() => setResetMfaMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset MFA for {resetMfaMember?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove two-factor authentication for <strong>{resetMfaMember?.email}</strong>.
              They will need to set it up again. Their enforcement deadline will remain active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetMfa} className="bg-amber-600 hover:bg-amber-700">
              Reset MFA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResetPasswordModal({ open, onClose, member, onSave }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await onSave(member.email, newPassword);
    } catch (err) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <p className="text-sm text-slate-500">
            Set a new password for <span className="font-medium text-slate-700">{member?.name}</span> ({member?.email})
          </p>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mt-1"
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <Label>Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/80" disabled={saving}>
              {saving ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamMemberModal({ open, onClose, member, onSave, saving, error }) {
  const [formData, setFormData] = useState({ name: '', email: '', role: '', custom_role_id: '', phone: '', avatar_color: avatarColors[0] });

  const { data: customRoles = [] } = useQuery({
    queryKey: ['customRoles'],
    queryFn: () => api.entities.CustomRole.list('name'),
    enabled: open
  });

  // Default system roles for the dropdown
  const defaultRoles = [
    { id: 'admin', name: 'Admin', is_system: true },
    { id: 'manager', name: 'Manager', is_system: true },
    { id: 'technician', name: 'Technician', is_system: true },
    { id: 'viewer', name: 'Viewer', is_system: true }
  ];

  const allRoles = [...defaultRoles, ...customRoles.filter(r => !r.is_system)];

  useEffect(() => {
    if (member) {
      setFormData({ 
        name: member.name || '', 
        email: member.email || '', 
        role: member.role || '', 
        custom_role_id: member.custom_role_id || '',
        phone: member.phone || '', 
        avatar_color: member.avatar_color || avatarColors[0] 
      });
    } else {
      setFormData({ name: '', email: '', role: '', custom_role_id: '', phone: '', avatar_color: avatarColors[0] });
    }
  }, [member, open]);

  const handleRoleChange = (roleId) => {
    const selectedRole = allRoles.find(r => r.id === roleId);
    if (selectedRole) {
      // For system roles, set the role name; for custom roles, set the custom_role_id
      if (selectedRole.is_system) {
        setFormData(p => ({ 
          ...p, 
          role: selectedRole.name, 
          custom_role_id: '' 
        }));
      } else {
        setFormData(p => ({ 
          ...p, 
          role: selectedRole.name,
          custom_role_id: roleId 
        }));
      }
    } else {
      setFormData(p => ({ ...p, role: '', custom_role_id: '' }));
    }
  };

  const getCurrentRoleId = () => {
    if (formData.custom_role_id) return formData.custom_role_id;
    const systemRole = defaultRoles.find(r => r.name === formData.role);
    return systemRole?.id || '';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit Member' : 'Add Member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4 mt-4">
          <div>
            <Label>Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} required className="mt-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <select
                value={getCurrentRoleId()}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select role...</option>
                <optgroup label="System Roles">
                  {defaultRoles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </optgroup>
                {customRoles.filter(r => !r.is_system).length > 0 && (
                  <optgroup label="Custom Roles">
                    {customRoles.filter(r => !r.is_system).map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Avatar Color</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {avatarColors.map(color => (
                <button key={color} type="button" onClick={() => setFormData(p => ({ ...p, avatar_color: color }))}
                  className={cn("w-8 h-8 rounded-full", color, formData.avatar_color === color && "ring-2 ring-offset-2 ring-primary")} />
              ))}
            </div>
          </div>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/80" disabled={saving}>
              {saving ? (member ? 'Updating...' : 'Adding...') : (member ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}



function UserGroupModal({ open, onClose, group, members, onSave }) {
  const [formData, setFormData] = useState({ name: '', description: '', color: 'indigo', member_emails: [] });

  useEffect(() => {
    if (group) {
      setFormData({ name: group.name || '', description: group.description || '', color: group.color || 'indigo', member_emails: group.member_emails || [] });
    } else {
      setFormData({ name: '', description: '', color: 'indigo', member_emails: [] });
    }
  }, [group, open]);

  const toggleMember = (email) => {
    setFormData(prev => ({
      ...prev,
      member_emails: prev.member_emails.includes(email)
        ? prev.member_emails.filter(e => e !== email)
        : [...prev.member_emails, email]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? 'Edit Group' : 'Add Group'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4 mt-4">
          <div>
            <Label>Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {Object.entries(groupColors).map(([name, className]) => (
                <button key={name} type="button" onClick={() => setFormData(p => ({ ...p, color: name }))}
                  className={cn("w-8 h-8 rounded-full", className, formData.color === name && "ring-2 ring-offset-2 ring-primary")} />
              ))}
            </div>
          </div>
          <div>
            <Label>Members</Label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
              {members.map(m => (
                <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <Checkbox checked={formData.member_emails.includes(m.email)} onCheckedChange={() => toggleMember(m.email)} />
                  <span className="text-sm">{m.name}</span>
                  <span className="text-xs text-slate-500">{m.email}</span>
                </label>
              ))}
              {members.length === 0 && <p className="text-sm text-slate-500 text-center py-2">No team members available</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/80">{group ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}



// Inventory Settings Section
function InventorySettingsSection({ queryClient }) {
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ access: true });
  const [newLocation, setNewLocation] = useState('');
  const [initialized, setInitialized] = useState(false);

  const [formData, setFormData] = useState({
    inventory_view_groups: [],
    inventory_edit_groups: [],
    inventory_checkout_groups: [],
    inventory_locations: [],
    inventory_notify_low_stock: false,
    inventory_notify_out_of_stock: false,
    inventory_alert_groups: [],
    inventory_alert_frequency: 'instant',
    inventory_tool_require_project: false,
    inventory_tool_overdue_alert: false,
    inventory_tool_overdue_days: 7,
  });

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['appSettingsMain'],
    queryFn: () => api.entities.AppSettings.filter({ setting_key: 'main' }),
    refetchOnWindowFocus: false
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => api.entities.UserGroup.list('name')
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list('name')
  });

  useEffect(() => {
    if (settings[0] && !initialized) {
      const s = settings[0];
      setFormData({
        inventory_view_groups: s.inventory_view_groups || [],
        inventory_edit_groups: s.inventory_edit_groups || [],
        inventory_checkout_groups: s.inventory_checkout_groups || [],
        inventory_locations: s.inventory_locations || [],
        inventory_notify_low_stock: s.inventory_notify_low_stock || false,
        inventory_notify_out_of_stock: s.inventory_notify_out_of_stock || false,
        inventory_alert_groups: s.inventory_alert_groups || [],
        inventory_alert_frequency: s.inventory_alert_frequency || 'instant',
        inventory_tool_require_project: s.inventory_tool_require_project || false,
        inventory_tool_overdue_alert: s.inventory_tool_overdue_alert || false,
        inventory_tool_overdue_days: s.inventory_tool_overdue_days || 7,
      });
      setInitialized(true);
    }
  }, [settings, initialized]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings[0]?.id) {
        await api.entities.AppSettings.update(settings[0].id, { ...formData, setting_key: 'main' });
      } else {
        await api.entities.AppSettings.create({ ...formData, setting_key: 'main' });
      }
      refetch();
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Inventory settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  const addLocation = () => {
    const loc = newLocation.trim();
    if (!loc || formData.inventory_locations.includes(loc)) return;
    setFormData(prev => ({ ...prev, inventory_locations: [...prev.inventory_locations, loc] }));
    setNewLocation('');
  };

  const removeLocation = (loc) => {
    setFormData(prev => ({
      ...prev,
      inventory_locations: prev.inventory_locations.filter(l => l !== loc)
    }));
  };

  const toggleGroupInField = (field, groupId) => {
    setFormData(prev => {
      const current = prev[field] || [];
      return {
        ...prev,
        [field]: current.includes(groupId)
          ? current.filter(id => id !== groupId)
          : [...current, groupId]
      };
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const GroupPicker = ({ field, label, description }) => (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      {groups.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No user groups found. Create groups in People & Teams first.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => {
            const selected = (formData[field] || []).includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGroupInField(field, g.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  selected
                    ? "bg-primary text-white border-primary"
                    : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-primary"
                )}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      )}
      {(formData[field] || []).length === 0 && groups.length > 0 && (
        <p className="text-xs text-amber-600 mt-2">No groups selected — all users will have access</p>
      )}
    </div>
  );

  return (
    <div className="bg-card rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b dark:border-border flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Inventory Settings
          </h2>
          <p className="text-sm text-muted-foreground">Manage access, stock locations, notifications & tool policies</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/80">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
        </Button>
      </div>

      <div className="divide-y dark:divide-slate-700/50">
        {/* Access Control */}
        <div>
          <button
            onClick={() => toggleSection('access')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Access Control</h3>
                <p className="text-xs text-muted-foreground">Who can view, edit, and checkout inventory</p>
              </div>
            </div>
            {expandedSections.access ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </button>
          {expandedSections.access && (
            <div className="px-4 pb-4 space-y-4">
              <GroupPicker field="inventory_view_groups" label="Who can view inventory" description="Select groups allowed to see inventory items" />
              <GroupPicker field="inventory_edit_groups" label="Who can edit inventory" description="Select groups allowed to add, edit, and delete items" />
              <GroupPicker field="inventory_checkout_groups" label="Who can take / checkout" description="Select groups allowed to take stock and checkout tools" />
            </div>
          )}
        </div>

        {/* Stock Locations */}
        <div>
          <button
            onClick={() => toggleSection('locations')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Stock Locations</h3>
                <p className="text-xs text-muted-foreground">Predefined storage locations for inventory items</p>
              </div>
            </div>
            {expandedSections.locations ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </button>
          {expandedSections.locations && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g., Warehouse A, Van #1, Shelf B3"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addLocation()}
                />
                <Button onClick={addLocation} size="sm" className="bg-primary hover:bg-primary/80">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {formData.inventory_locations.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No locations added yet. Add locations where inventory items are stored.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.inventory_locations.map((loc) => (
                    <Badge key={loc} variant="secondary" className="px-3 py-1.5 text-sm flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {loc}
                      <button onClick={() => removeLocation(loc)} className="ml-1 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Low Stock Notifications */}
        <div>
          <button
            onClick={() => toggleSection('notifications')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Low Stock Notifications</h3>
                <p className="text-xs text-muted-foreground">Get alerted when items run low or out of stock</p>
              </div>
            </div>
            {expandedSections.notifications ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </button>
          {expandedSections.notifications && (
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Low stock alerts</Label>
                  <p className="text-xs text-muted-foreground">Notify when items fall below minimum quantity</p>
                </div>
                <Switch
                  checked={formData.inventory_notify_low_stock}
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, inventory_notify_low_stock: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Out of stock alerts</Label>
                  <p className="text-xs text-muted-foreground">Notify when items reach zero quantity</p>
                </div>
                <Switch
                  checked={formData.inventory_notify_out_of_stock}
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, inventory_notify_out_of_stock: checked }))}
                />
              </div>
              <GroupPicker field="inventory_alert_groups" label="Alert recipients" description="Select which groups receive stock notifications (leave empty = admins only)" />
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <Label className="text-sm font-medium">Alert frequency</Label>
                <p className="text-xs text-muted-foreground mb-2">How often to send notification digests</p>
                <Select
                  value={formData.inventory_alert_frequency}
                  onValueChange={(val) => setFormData(p => ({ ...p, inventory_alert_frequency: val }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="daily">Daily digest</SelectItem>
                    <SelectItem value="weekly">Weekly digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Tool Management */}
        <div>
          <button
            onClick={() => toggleSection('tools')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <Wrench className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Tool Management</h3>
                <p className="text-xs text-muted-foreground">Checkout policies and overdue tracking</p>
              </div>
            </div>
            {expandedSections.tools ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </button>
          {expandedSections.tools && (
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Require project for checkout</Label>
                  <p className="text-xs text-muted-foreground">Users must assign a project when checking out tools</p>
                </div>
                <Switch
                  checked={formData.inventory_tool_require_project}
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, inventory_tool_require_project: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Overdue tool alerts</Label>
                  <p className="text-xs text-muted-foreground">Alert when checked-out tools exceed the return window</p>
                </div>
                <Switch
                  checked={formData.inventory_tool_overdue_alert}
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, inventory_tool_overdue_alert: checked }))}
                />
              </div>
              {formData.inventory_tool_overdue_alert && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <Label className="text-sm font-medium">Overdue after (days)</Label>
                  <p className="text-xs text-muted-foreground mb-2">Number of days before a tool is considered overdue</p>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.inventory_tool_overdue_days}
                    onChange={(e) => setFormData(p => ({ ...p, inventory_tool_overdue_days: parseInt(e.target.value) || 7 }))}
                    className="w-24"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Consolidated Company Settings Section (App Settings)
function CompanySettingsSection({ queryClient }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ branding: true });
  const [formData, setFormData] = useState({
    app_name: '',
    app_logo_url: ''
  });
  const [initialized, setInitialized] = useState(false);

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['appSettingsMain'],
    queryFn: () => api.entities.AppSettings.filter({ setting_key: 'main' }),
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (settings[0] && !initialized) {
      setFormData({
          app_name: settings[0].app_name || '',
          app_logo_url: settings[0].app_logo_url || ''
        });
      setInitialized(true);
    }
  }, [settings, initialized]);

  const handleSave = async () => {
    setSaving(true);
    if (settings[0]?.id) {
      await api.entities.AppSettings.update(settings[0].id, { ...formData, setting_key: 'main' });
    } else {
      await api.entities.AppSettings.create({ ...formData, setting_key: 'main' });
    }
    refetch();
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await api.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, app_logo_url: file_url }));
    setUploading(false);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">App Settings</h2>
          <p className="text-sm text-slate-500">Branding and app identity</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/80">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="divide-y">
        {/* App Branding Section */}
        <div>
          <button
            onClick={() => toggleSection('branding')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">App Branding</h3>
                <p className="text-xs text-slate-500">App name and logo shown in sidebar</p>
              </div>
            </div>
            {expandedSections.branding ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </button>
          
          {expandedSections.branding && (
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-start gap-3 sm:gap-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <div className="flex-shrink-0">
                  {formData.app_logo_url ? (
                    <div className="relative">
                      <img src={resolveUploadUrl(formData.app_logo_url)} alt="App Logo" className="w-20 h-20 object-contain rounded-lg border bg-white p-2" />
                      <button 
                        onClick={() => setFormData(p => ({ ...p, app_logo_url: '' }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm hover:bg-red-600"
                      >×</button>
                    </div>
                  ) : (
                    <label className="w-20 h-20 border-2 border-dashed border-indigo-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-white transition-colors">
                      {uploading ? (
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                      ) : (
                        <>
                          <Building2 className="w-6 h-6 text-indigo-400 mb-1" />
                          <span className="text-[10px] text-indigo-400">Upload</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        const { file_url } = await api.integrations.Core.UploadFile({ file });
                        setFormData(prev => ({ ...prev, app_logo_url: file_url }));
                        setUploading(false);
                      }} disabled={uploading} />
                    </label>
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-xs">App Name</Label>
                  <Input value={formData.app_name || ''} onChange={(e) => setFormData(p => ({ ...p, app_name: e.target.value }))} placeholder="IT Projects" className="mt-1" />
                  <p className="text-xs text-slate-400 mt-1">This name appears in the sidebar header</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Project Tags Section
function ProjectTagsSection({ queryClient }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: tags = [], refetch } = useQuery({
    queryKey: ['projectTags'],
    queryFn: () => api.entities.ProjectTag.list('name')
  });

  const handleSave = async (data) => {
    if (editing) {
      await api.entities.ProjectTag.update(editing.id, data);
    } else {
      await api.entities.ProjectTag.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['projectTags'] });
    refetch();
    setShowModal(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    await api.entities.ProjectTag.delete(deleteConfirm.id);
    queryClient.invalidateQueries({ queryKey: ['projectTags'] });
    refetch();
    setDeleteConfirm(null);
  };

  const tagColors = {
    slate: 'bg-slate-500', red: 'bg-red-500', orange: 'bg-orange-500',
    amber: 'bg-amber-500', yellow: 'bg-yellow-500', lime: 'bg-lime-500',
    green: 'bg-green-500', emerald: 'bg-emerald-500', teal: 'bg-teal-500',
    cyan: 'bg-cyan-500', sky: 'bg-sky-500', blue: 'bg-blue-500',
    indigo: 'bg-indigo-500', violet: 'bg-violet-500', purple: 'bg-purple-500',
    fuchsia: 'bg-fuchsia-500', pink: 'bg-pink-500', rose: 'bg-rose-500'
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Project Tags</h2>
          <p className="text-sm text-slate-500">Create and manage tags for organizing projects</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-primary hover:bg-primary/80">
          <Plus className="w-4 h-4 mr-2" />
          Add Tag
        </Button>
      </div>

      {tags.length === 0 ? (
        <div className="p-12 text-center">
          <Tags className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No tags yet</h3>
          <p className="text-slate-500 mb-4">Create tags to organize and filter your projects</p>
          <Button onClick={() => setShowModal(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Tag
          </Button>
        </div>
      ) : (
        <div className="divide-y">
          {tags.map((tag) => (
            <div key={tag.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className={cn("w-4 h-4 rounded-full", tagColors[tag.color] || 'bg-slate-500')} />
                <div>
                  <p className="font-medium text-slate-900">{tag.name}</p>
                  {tag.description && <p className="text-sm text-slate-500">{tag.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(tag); setShowModal(true); }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(tag)} className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tag Modal */}
      <Dialog open={showModal} onOpenChange={() => { setShowModal(false); setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
          </DialogHeader>
          <ProjectTagForm tag={editing} tagColors={tagColors} onSave={handleSave} onCancel={() => { setShowModal(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tag "{deleteConfirm?.name}". Projects using this tag will no longer have it assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProjectTagForm({ tag, tagColors, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    color: 'blue',
    description: ''
  });

  useEffect(() => {
    if (tag) {
      setFormData({
        name: tag.name || '',
        color: tag.color || 'blue',
        description: tag.description || ''
      });
    } else {
      setFormData({ name: '', color: 'blue', description: '' });
    }
  }, [tag]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4 mt-4">
      <div>
        <Label>Tag Name</Label>
        <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required className="mt-1" placeholder="e.g., Urgent, VIP Client" />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Input value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} className="mt-1" placeholder="Brief description..." />
      </div>
      <div>
        <Label>Color</Label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {Object.entries(tagColors).map(([name, className]) => (
            <button key={name} type="button" onClick={() => setFormData(p => ({ ...p, color: name }))}
              className={cn("w-8 h-8 rounded-full", className, formData.color === name && "ring-2 ring-offset-2 ring-primary")} />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary hover:bg-primary/80">{tag ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}

// Combined Project Management Section (Archived + Deleted)
function ProjectManagementSection({ queryClient }) {
  const [activeTab, setActiveTab] = useState('archived');

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-amber-100">
            <Archive className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Project Management</h2>
            <p className="text-sm text-slate-500">Manage archived and deleted projects</p>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('archived')}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'archived' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Archive className="w-4 h-4" />
          Archived Projects
        </button>
        <button
          onClick={() => setActiveTab('deleted')}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'deleted' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Trash2 className="w-4 h-4" />
          Deleted Projects
        </button>
      </div>

      {activeTab === 'archived' && <ArchivedProjectsContent queryClient={queryClient} />}
      {activeTab === 'deleted' && <DeletedProjectsContent queryClient={queryClient} />}
    </div>
  );
}

// Archived Projects Content
function ArchivedProjectsContent({ queryClient }) {
  const { data: archivedProjects = [], refetch } = useQuery({
    queryKey: ['archivedProjects'],
    queryFn: async () => {
      const projects = await api.entities.Project.list('-archived_date');
      return projects.filter(p => p.status === 'archived' || p.status === 'completed');
    }
  });

  const handleRestore = async (project) => {
    await api.entities.Project.update(project.id, {
      status: 'planning',
      archive_reason: '',
      archive_type: '',
      archived_date: ''
    });
    refetch();
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const handlePermanentDelete = async (project) => {
    if (confirm(`Are you sure you want to permanently delete "${project.name}"? This action cannot be undone.`)) {
      // Delete related entities
      const tasks = await api.entities.Task.filter({ project_id: project.id });
      const parts = await api.entities.Part.filter({ project_id: project.id });
      const notes = await api.entities.ProjectNote.filter({ project_id: project.id });
      
      for (const task of tasks) await api.entities.Task.delete(task.id);
      for (const part of parts) await api.entities.Part.delete(part.id);
      for (const note of notes) await api.entities.ProjectNote.delete(note.id);
      
      await api.entities.Project.delete(project.id);
      refetch();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      {archivedProjects.length === 0 ? (
        <div className="p-12 text-center">
          <Archive className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No archived projects</h3>
          <p className="text-slate-500">Archived projects will appear here</p>
        </div>
      ) : (
        <div className="divide-y">
          {archivedProjects.map((project) => (
            <div key={project.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {project.project_number && (
                      <span className="px-2 py-0.5 bg-slate-800 text-white rounded text-xs font-mono">
                        #{project.project_number}
                      </span>
                    )}
                    <h3 className="font-semibold text-slate-900">{project.name}</h3>
                  </div>
                  {project.client && (
                    <p className="text-sm text-slate-500 mb-1">{project.client}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Archived {formatDate(project.archived_date)}</span>
                    </div>
                    {project.archive_type && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {project.archive_type.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  {project.archive_reason && (
                    <p className="text-sm text-slate-500 mt-2 italic">"{project.archive_reason}"</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    onClick={() => handleRestore(project)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restore
                  </Button>
                  <Button
                    onClick={() => handlePermanentDelete(project)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Deleted Projects Content
function DeletedProjectsContent({ queryClient }) {
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: deletedProjects = [], refetch } = useQuery({
    queryKey: ['deletedProjects'],
    queryFn: async () => {
      const projects = await api.entities.Project.list('-deleted_date');
      return projects.filter(p => p.status === 'deleted');
    }
  });

  const handleRestore = async (project) => {
    await api.entities.Project.update(project.id, {
      status: 'planning',
      deleted_date: ''
    });
    refetch();
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    setRestoreConfirm(null);
  };

  const handlePermanentDelete = async (project) => {
    // Delete related entities
    const tasks = await api.entities.Task.filter({ project_id: project.id });
    const parts = await api.entities.Part.filter({ project_id: project.id });
    const notes = await api.entities.ProjectNote.filter({ project_id: project.id });
    
    for (const task of tasks) await api.entities.Task.delete(task.id);
    for (const part of parts) await api.entities.Part.delete(part.id);
    for (const note of notes) await api.entities.ProjectNote.delete(note.id);
    
    await api.entities.Project.delete(project.id);
    refetch();
    setDeleteConfirm(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      {deletedProjects.length === 0 ? (
        <div className="p-12 text-center">
          <Trash2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Trash is empty</h3>
          <p className="text-slate-500">Deleted projects will appear here</p>
        </div>
      ) : (
        <div className="divide-y">
          {deletedProjects.map((project) => (
            <div key={project.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {project.project_number && (
                      <span className="px-2 py-0.5 bg-slate-800 text-white rounded text-xs font-mono">
                        #{project.project_number}
                      </span>
                    )}
                    <h3 className="font-semibold text-slate-900">{project.name}</h3>
                  </div>
                  {project.client && (
                    <p className="text-sm text-slate-500 mb-1">{project.client}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Deleted {formatDate(project.deleted_date)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    onClick={() => setRestoreConfirm(project)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restore
                  </Button>
                  <Button
                    onClick={() => setDeleteConfirm(project)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreConfirm} onOpenChange={() => setRestoreConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{restoreConfirm?.name}" will be restored to your active projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRestore(restoreConfirm)} className="bg-emerald-600 hover:bg-emerald-700">
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteConfirm?.name}" and all its tasks, parts, and notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handlePermanentDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


// Database Health Section
function DatabaseHealthSection() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const [healthData, setHealthData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [fixing, setFixing] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const getToken = async () => {
    try {
      const { getAccessToken } = await import('@/lib/supabase');
      return await getAccessToken();
    } catch { /* fallback */ }
    return null;
  };

  const fetchHealth = async () => {
    setRunning(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/integrations/data-health`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setHealthData(data);
    } catch (err) {
      console.error('Health check failed:', err);
    }
    setRunning(false);
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/integrations/data-health-history`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setHistory(data.checks || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const fixOrphanedRecords = async (issue) => {
    if (!issue.orphaned_ids?.length) return;
    setFixing(issue.entity);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/integrations/data-health/fix`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: issue.entity, orphaned_ids: issue.orphaned_ids }),
      });
      const data = await res.json();
      if (data.success) {
        // Re-run health check to refresh data
        await fetchHealth();
      }
    } catch (err) {
      console.error('Failed to fix orphaned records:', err);
    }
    setFixing(null);
  };

  useEffect(() => {
    fetchHealth();
    fetchHistory();
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Database Health
            </h2>
            <p className="text-sm text-slate-500 mt-1">Integrity checks run automatically every 24 hours</p>
          </div>
          <Button
            onClick={() => { fetchHealth(); fetchHistory(); }}
            disabled={running}
            className="bg-primary hover:bg-primary/80"
          >
            {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</> : <><RefreshCw className="w-4 h-4 mr-2" />Run Check</>}
          </Button>
        </div>

        {/* Status Banner */}
        {healthData && (
          <div className={cn(
            "px-6 py-4 flex items-center gap-3 border-b",
            healthData.status === 'healthy' ? "bg-emerald-50" : "bg-amber-50"
          )}>
            {healthData.status === 'healthy' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            )}
            <div>
              <p className={cn(
                "font-medium text-sm",
                healthData.status === 'healthy' ? "text-emerald-800" : "text-amber-800"
              )}>
                {healthData.status === 'healthy' ? 'Database is healthy — no issues found' : `${healthData.issues.length} issue(s) found`}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Last checked: {new Date(healthData.checked_at).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'tables', label: 'Tables' },
            { id: 'issues', label: 'Issues', count: healthData?.issues?.length || 0 },
            { id: 'history', label: 'Check History' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && healthData && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500 uppercase">Database Size</span>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">{healthData.database?.size_pretty || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500 uppercase">Connections</span>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">{healthData.database?.active_connections || 0}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500 uppercase">Total Rows</span>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">{healthData.total_rows?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border">
                      <div className="flex items-center gap-2 mb-2">
                        {healthData.status === 'healthy' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="text-xs font-medium text-slate-500 uppercase">Status</span>
                      </div>
                      <p className={cn(
                        "text-lg sm:text-2xl font-bold",
                        healthData.status === 'healthy' ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {healthData.status === 'healthy' ? 'Healthy' : 'Issues'}
                      </p>
                    </div>
                  </div>

                  {/* Top Tables by Size */}
                  {healthData.database?.table_sizes?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Largest Tables</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left px-4 py-2 font-medium text-slate-600">Table</th>
                              <th className="text-right px-4 py-2 font-medium text-slate-600">Size</th>
                              <th className="text-right px-4 py-2 font-medium text-slate-600">Rows</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {healthData.database.table_sizes.slice(0, 10).map((t, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-mono text-slate-700">{t.table}</td>
                                <td className="px-4 py-2 text-right text-slate-600">{t.size_pretty}</td>
                                <td className="px-4 py-2 text-right text-slate-600">
                                  {healthData.counts?.[t.table]?.toLocaleString() ?? '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recent Deletions */}
                  {healthData.recent_deletions?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Deletions</h3>
                      <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left px-4 py-2 font-medium text-slate-600">Entity</th>
                              <th className="text-left px-4 py-2 font-medium text-slate-600">ID</th>
                              <th className="text-left px-4 py-2 font-medium text-slate-600">By</th>
                              <th className="text-left px-4 py-2 font-medium text-slate-600">When</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {healthData.recent_deletions.slice(0, 20).map((d, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-slate-700">{d.entity_type}</td>
                                <td className="px-4 py-2 font-mono text-xs text-slate-500">{d.entity_id?.slice(0, 8)}...</td>
                                <td className="px-4 py-2 text-slate-600">{d.created_by || 'system'}</td>
                                <td className="px-4 py-2 text-slate-500">{d.deleted_at ? new Date(d.deleted_at).toLocaleDateString() : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tables Tab */}
              {activeTab === 'tables' && healthData && (
                <div>
                  <p className="text-sm text-slate-500 mb-4">All entity tables and their row counts</p>
                  <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-slate-600">Table</th>
                          <th className="text-right px-4 py-2 font-medium text-slate-600">Rows</th>
                          <th className="text-right px-4 py-2 font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(healthData.counts || {})
                          .sort(([,a], [,b]) => b - a)
                          .map(([table, count]) => (
                          <tr key={table} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono text-slate-700">{table}</td>
                            <td className="px-4 py-2 text-right text-slate-600">{count.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right">
                              {count > 0 ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0">Active</Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-400 border-slate-200">Empty</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Issues Tab */}
              {activeTab === 'issues' && healthData && (
                <div>
                  {healthData.issues.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                      <p className="text-slate-700 font-medium">No integrity issues found</p>
                      <p className="text-slate-500 text-sm mt-1">All parent-child relationships are valid</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {healthData.issues.map((issue, i) => (
                        <div key={i} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium text-amber-800">
                                {issue.type === 'orphaned_records'
                                  ? `${issue.count} orphaned ${issue.entity} record(s)`
                                  : `${issue.count} ${issue.entity} without matching user`}
                              </p>
                              <p className="text-sm text-amber-700 mt-1">
                                {issue.type === 'orphaned_records'
                                  ? `${issue.entity} references missing ${issue.parent_entity} via "${issue.foreign_key}"`
                                  : `Team members with emails that don't match any user account`}
                              </p>
                            </div>
                            {issue.type === 'orphaned_records' && issue.orphaned_ids?.length > 0 && (
                              <button
                                onClick={() => fixOrphanedRecords(issue)}
                                disabled={fixing === issue.entity}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
                              >
                                {fixing === issue.entity ? 'Fixing...' : `Delete ${issue.count} orphan${issue.count !== 1 ? 's' : ''}`}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div>
                  <p className="text-sm text-slate-500 mb-4">
                    Automated checks run every 24 hours. Manual checks also recorded.
                  </p>
                  {history.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p>No check history yet</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-slate-600">Date</th>
                            <th className="text-left px-4 py-2 font-medium text-slate-600">Status</th>
                            <th className="text-right px-4 py-2 font-medium text-slate-600">Issues</th>
                            <th className="text-right px-4 py-2 font-medium text-slate-600">Rows</th>
                            <th className="text-right px-4 py-2 font-medium text-slate-600">DB Size</th>
                            <th className="text-left px-4 py-2 font-medium text-slate-600">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {history.map((check, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-slate-700">
                                {new Date(check.checked_at).toLocaleString()}
                              </td>
                              <td className="px-4 py-2">
                                <Badge className={cn(
                                  "border-0",
                                  check.status === 'healthy' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                )}>
                                  {check.status === 'healthy' ? 'Healthy' : 'Issues'}
                                </Badge>
                              </td>
                              <td className="px-4 py-2 text-right text-slate-600">{check.issue_count}</td>
                              <td className="px-4 py-2 text-right text-slate-600">{check.total_rows?.toLocaleString() || '—'}</td>
                              <td className="px-4 py-2 text-right text-slate-600">{check.db_size || '—'}</td>
                              <td className="px-4 py-2">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  check.automated ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                                )}>
                                  {check.automated ? 'Auto' : 'Manual'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationsSection({ queryClient }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const [activeTab, setActiveTab] = useState('settings');
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [hasEnvSecret, setHasEnvSecret] = useState(null); // null = loading, true/false = result

  // Customer mapping state
  const [haloCustomers, setHaloCustomers] = useState([]);
  const [localCustomers, setLocalCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerMappings, setCustomerMappings] = useState({});

  const [formData, setFormData] = useState({
    halopsa_enabled: false,
    halopsa_auth_url: '',
    halopsa_api_url: '',
    halopsa_client_id: '',
    halopsa_tenant: '',
    halopsa_sync_customers: true,
    halopsa_sync_tickets: false,
    halopsa_excluded_ids: '',
    halopsa_field_mapping: {
      name: 'name', email: 'email', phone: 'main_phone',
      address: 'address', city: 'city', state: 'county', zip: 'postcode'
    },
  });

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['integrationSettings'],
    queryFn: () => api.entities.IntegrationSettings.filter({ setting_key: 'main' })
  });

  useEffect(() => {
    if (settings[0]) {
      setFormData(prev => ({
        ...prev,
        halopsa_enabled: settings[0].halopsa_enabled || false,
        halopsa_auth_url: settings[0].halopsa_auth_url || '',
        halopsa_api_url: settings[0].halopsa_api_url || '',
        halopsa_client_id: settings[0].halopsa_client_id || '',
        halopsa_tenant: settings[0].halopsa_tenant || '',
        halopsa_sync_customers: settings[0].halopsa_sync_customers !== false,
        halopsa_sync_tickets: settings[0].halopsa_sync_tickets || false,
        halopsa_excluded_ids: settings[0].halopsa_excluded_ids || '',
        halopsa_field_mapping: settings[0].halopsa_field_mapping || formData.halopsa_field_mapping,
      }));
    }
  }, [settings]);

  // Check if server has env vars configured for secrets
  useEffect(() => {
    api.functions.invoke('halopsa', { action: 'checkEnvStatus' })
      .then(r => setHasEnvSecret(r.hasClientSecret || false))
      .catch(() => setHasEnvSecret(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { setting_key: 'main', ...formData };
      if (settings[0]) {
        await api.entities.IntegrationSettings.update(settings[0].id, payload);
      } else {
        await api.entities.IntegrationSettings.create(payload);
      }
      refetch();
      setSyncResult({ success: true, message: 'Settings saved' });
    } catch (err) {
      setSyncResult({ success: false, message: err.message || 'Failed to save' });
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!formData.halopsa_auth_url || !formData.halopsa_client_id) {
      setSyncResult({ success: false, message: 'Please fill in the HaloPSA URL and Client ID fields first' });
      return;
    }
    if (!hasEnvSecret) {
      setSyncResult({ success: false, message: 'HALOPSA_CLIENT_SECRET is not set as an environment variable on the server. Please add it to your Railway variables.' });
      return;
    }
    setTestingConnection(true);
    setSyncResult(null);
    try {
      await handleSave();
      const response = await api.functions.invoke('halopsa', { action: 'testConnection' });
      const result = response.data;
      setSyncResult(result.success
        ? { success: true, message: 'Connection successful! Credentials are valid.' }
        : { success: false, message: result.error || 'Connection failed', details: result.details });
    } catch (error) {
      setSyncResult({ success: false, message: error.data?.error || 'Connection failed. Check your credentials.' });
    }
    setTestingConnection(false);
  };

  const handleSyncCustomers = async () => {
    if (!formData.halopsa_auth_url || !formData.halopsa_client_id) {
      setSyncResult({ success: false, message: 'Configure HaloPSA credentials first' });
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    try {
      await handleSave();
      const response = await api.functions.invoke('syncHaloPSACustomers', {
        fieldMapping: formData.halopsa_field_mapping
      });
      const result = response.data;
      if (result.success) {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setSyncResult({ success: true, message: result.message });
      } else {
        setSyncResult({ success: false, message: result.error || 'Sync failed' });
      }
    } catch (error) {
      setSyncResult({ success: false, message: error.data?.error || 'Sync failed' });
    }
    setSyncing(false);
  };

  const fetchHaloCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await api.functions.invoke('haloPSACustomerList', {});
      const result = response.data || response;
      setHaloCustomers(result.haloClients || []);
      setLocalCustomers(result.localCustomers || []);
      // Build mapping from existing synced customers
      const mappings = {};
      (result.localCustomers || []).forEach(c => {
        if (c.halo_id) mappings[c.halo_id] = c.id;
      });
      setCustomerMappings(mappings);
    } catch (err) {
      setSyncResult({ success: false, message: 'Failed to load HaloPSA customers: ' + (err.message || err.data?.error) });
    }
    setLoadingCustomers(false);
  };

  const handleMapCustomer = async (haloId, localCustomerId) => {
    setCustomerMappings(prev => ({ ...prev, [haloId]: localCustomerId }));
    // Save mapping to the local customer record
    if (localCustomerId) {
      try {
        await api.entities.Customer.update(localCustomerId, { halo_id: String(haloId) });
      } catch (err) {
        console.error('Failed to save mapping:', err);
      }
    }
  };

  const [expandedIntegration, setExpandedIntegration] = useState(null);

  const toggleIntegration = (id) => {
    setExpandedIntegration(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-slate-900">Integrations</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your connected external services</p>
      </div>

      {/* HaloPSA Integration Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Collapsible Header */}
        <button
          onClick={() => toggleIntegration('halopsa')}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <GitMerge className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-slate-900">HaloPSA</h3>
              <p className="text-xs text-slate-500 mt-0.5">PSA ticketing, customers & sync</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {formData.halopsa_enabled && (
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Connected</Badge>
            )}
            {!formData.halopsa_enabled && (
              <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">Not configured</Badge>
            )}
            <ChevronDown className={cn(
              "w-5 h-5 text-slate-400 transition-transform duration-200",
              expandedIntegration === 'halopsa' && "rotate-180"
            )} />
          </div>
        </button>

        {/* Expanded Content */}
        {expandedIntegration === 'halopsa' && (
          <div className="border-t">
            {/* Tabs */}
            <div className="flex border-b bg-slate-50/50">
              {[
                { id: 'settings', label: 'Settings' },
                { id: 'customers', label: 'Customer Mapping' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="p-3 sm:p-6 space-y-6">
                {/* Enable toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={formData.halopsa_enabled} onCheckedChange={(v) => setFormData(p => ({ ...p, halopsa_enabled: v }))} />
                  <span className="font-medium text-sm">Enable HaloPSA Integration</span>
                </label>

                {formData.halopsa_enabled && (
                  <>
                    {/* Connection */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Connection
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Authorisation Server URL</Label>
                          <Input value={formData.halopsa_auth_url} onChange={e => setFormData(p => ({ ...p, halopsa_auth_url: e.target.value }))} placeholder="https://yourcompany.halopsa.com/auth" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Resource Server URL (API)</Label>
                          <Input value={formData.halopsa_api_url} onChange={e => setFormData(p => ({ ...p, halopsa_api_url: e.target.value }))} placeholder="https://yourcompany.halopsa.com/api" className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Client ID</Label>
                          <Input value={formData.halopsa_client_id} onChange={e => setFormData(p => ({ ...p, halopsa_client_id: e.target.value }))} placeholder="Your Client ID" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Client Secret</Label>
                          <div className="mt-1">
                            {hasEnvSecret === null ? (
                              <div className="h-9 flex items-center px-3 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-400">Checking...</div>
                            ) : hasEnvSecret ? (
                              <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Configured via environment variable
                              </div>
                            ) : (
                              <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-red-200 bg-red-50 text-xs text-red-600 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Set HALOPSA_CLIENT_SECRET in Railway env vars
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Tenant (optional)</Label>
                          <Input value={formData.halopsa_tenant} onChange={e => setFormData(p => ({ ...p, halopsa_tenant: e.target.value }))} placeholder="Tenant name" className="mt-1" />
                        </div>
                      </div>
                    </div>

                    {/* Sync Options */}
                    <div className="space-y-3 pt-4 border-t">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Sync Options
                      </h3>
                      <div className="flex flex-wrap gap-3 sm:gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={formData.halopsa_sync_customers} onCheckedChange={v => setFormData(p => ({ ...p, halopsa_sync_customers: v }))} />
                          <span className="text-sm">Sync Customers</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={formData.halopsa_sync_tickets} onCheckedChange={v => setFormData(p => ({ ...p, halopsa_sync_tickets: v }))} />
                          <span className="text-sm">Sync Tickets</span>
                        </label>
                      </div>
                      <div>
                        <Label className="text-xs">Excluded Client IDs (comma-separated)</Label>
                        <Input value={formData.halopsa_excluded_ids} onChange={e => setFormData(p => ({ ...p, halopsa_excluded_ids: e.target.value }))} placeholder="101, 202, 303" className="mt-1" />
                      </div>
                    </div>

                    {/* Field Mapping (collapsible) */}
                    <div className="pt-4 border-t">
                      <button onClick={() => setShowFieldMapping(!showFieldMapping)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                        {showFieldMapping ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-medium">Field Mapping</span>
                      </button>
                      {showFieldMapping && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(formData.halopsa_field_mapping).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-500 w-16 capitalize">{key}</span>
                              <span className="text-xs text-slate-300">→</span>
                              <Input
                                value={value}
                                onChange={e => setFormData(p => ({
                                  ...p,
                                  halopsa_field_mapping: { ...p.halopsa_field_mapping, [key]: e.target.value }
                                }))}
                                className="flex-1 h-8 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/80">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Settings'}
                      </Button>
                      <Button onClick={handleTestConnection} disabled={testingConnection || syncing} variant="outline">
                        {testingConnection ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</> : 'Test Connection'}
                      </Button>
                      <Button onClick={handleSyncCustomers} disabled={syncing || testingConnection} variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                        {syncing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</> : <><RefreshCw className="w-4 h-4 mr-2" />Sync Customers</>}
                      </Button>
                      {settings[0]?.halopsa_last_sync && (
                        <span className="text-xs text-slate-400 ml-auto">
                          Last sync: {new Date(settings[0].halopsa_last_sync).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {syncResult && (
                      <div className={cn(
                        "p-3 rounded-lg text-sm",
                        syncResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                      )}>
                        <p>{syncResult.message}</p>
                        {syncResult.details && (
                          <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-x-auto">
                            {typeof syncResult.details === 'object' ? JSON.stringify(syncResult.details, null, 2) : syncResult.details}
                          </pre>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Customer Mapping Tab */}
            {activeTab === 'customers' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">HaloPSA Customer Mapping</h3>
                    <p className="text-xs text-slate-500 mt-0.5">View customers from HaloPSA and map them to local records</p>
                  </div>
                  <Button onClick={fetchHaloCustomers} disabled={loadingCustomers} className="bg-primary hover:bg-primary/80">
                    {loadingCustomers ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</> : <><RefreshCw className="w-4 h-4 mr-2" />Load Customers</>}
                  </Button>
                </div>

                {haloCustomers.length === 0 && !loadingCustomers && (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Click "Load Customers" to fetch your HaloPSA client list</p>
                  </div>
                )}

                {haloCustomers.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-medium text-slate-600">HaloPSA Customer</th>
                          <th className="text-left px-4 py-2.5 font-medium text-slate-600">Halo ID</th>
                          <th className="text-left px-4 py-2.5 font-medium text-slate-600">Mapped To</th>
                          <th className="text-right px-4 py-2.5 font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {haloCustomers.map(hc => {
                          const mappedId = customerMappings[hc.id];
                          const mappedCustomer = localCustomers.find(lc => lc.id === mappedId);
                          const autoMapped = localCustomers.find(lc => lc.halo_id === String(hc.id));

                          return (
                            <tr key={hc.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-800">{hc.name}</p>
                                {hc.email && <p className="text-xs text-slate-400">{hc.email}</p>}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">{hc.id}</td>
                              <td className="px-4 py-3">
                                {autoMapped ? (
                                  <span className="text-sm text-slate-700">{autoMapped.name || autoMapped.company_name}</span>
                                ) : (
                                  <select
                                    value={mappedId || ''}
                                    onChange={e => handleMapCustomer(hc.id, e.target.value || null)}
                                    className="text-sm border border-slate-200 rounded-md px-2 py-1.5 w-full max-w-xs bg-white"
                                  >
                                    <option value="">— Select local customer —</option>
                                    {localCustomers.filter(lc => !lc.halo_id).map(lc => (
                                      <option key={lc.id} value={lc.id}>{lc.name || lc.company_name}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {autoMapped ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-0">Synced</Badge>
                                ) : mappedId ? (
                                  <Badge className="bg-blue-100 text-blue-700 border-0">Mapped</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-slate-400 border-slate-200">Unmapped</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {syncResult && activeTab === 'customers' && (
                  <div className={cn(
                    "p-3 rounded-lg text-sm",
                    syncResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                  )}>
                    {syncResult.message}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QuoteIT Integration Card */}
      <QuoteITIntegrationCard expandedIntegration={expandedIntegration} toggleIntegration={toggleIntegration} />

      {/* PortalIT Integration Card */}
      <PortalITIntegrationCard expandedIntegration={expandedIntegration} toggleIntegration={toggleIntegration} />

      {/* Resend Integration Card */}
      <ResendIntegrationCard expandedIntegration={expandedIntegration} toggleIntegration={toggleIntegration} />

      {/* Claude AI Integration Card */}
      <ClaudeAIIntegrationCard expandedIntegration={expandedIntegration} toggleIntegration={toggleIntegration} />

      {/* GammaAi Integration Card */}
      <GammaAiIntegrationCard expandedIntegration={expandedIntegration} toggleIntegration={toggleIntegration} />

      {/* Giphy Integration Card */}
      <GiphyIntegrationCard expandedIntegration={expandedIntegration} toggleIntegration={toggleIntegration} />
    </div>
  );
}

function QuoteITIntegrationCard({ expandedIntegration, toggleIntegration }) {
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const [formData, setFormData] = useState({
    quoteit_enabled: false,
    quoteit_api_url: '',
    quoteit_api_key: '',
  });

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['integrationSettings'],
    queryFn: () => api.entities.IntegrationSettings.filter({ setting_key: 'main' })
  });

  useEffect(() => {
    if (settings[0]) {
      setFormData(prev => ({
        ...prev,
        quoteit_enabled: settings[0].quoteit_enabled || false,
        quoteit_api_url: settings[0].quoteit_api_url || '',
        quoteit_api_key: settings[0].quoteit_api_key || '',
      }));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      const payload = { setting_key: 'main', ...formData };
      if (settings[0]) {
        await api.entities.IntegrationSettings.update(settings[0].id, payload);
      } else {
        await api.entities.IntegrationSettings.create(payload);
      }
      refetch();
      setResult({ success: true, message: 'QuoteIT settings saved' });
    } catch (err) {
      setResult({ success: false, message: err.message || 'Failed to save' });
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => toggleIntegration('quoteit')}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <img src="/quoteit-favicon.svg" alt="" className="w-7 h-7" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-slate-900">Quote<span className="text-amber-500">IT</span></h3>
            <p className="text-xs text-slate-500 mt-0.5">Quoting & proposals — sync accepted quotes to projects</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {formData.quoteit_enabled ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Connected</Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">Not configured</Badge>
          )}
          <ChevronDown className={cn(
            "w-5 h-5 text-slate-400 transition-transform duration-200",
            expandedIntegration === 'quoteit' && "rotate-180"
          )} />
        </div>
      </button>

      {expandedIntegration === 'quoteit' && (
        <div className="border-t p-3 sm:p-6 space-y-5">
          {/* How it works */}
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">What this does</h4>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-amber-500" />
                Sync accepted quotes from QuoteIT into ProjectIT
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-amber-500" />
                Auto-create projects from incoming proposals
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-amber-500" />
                Link projects back to their original quotes
              </li>
            </ul>
          </div>

          {/* Enable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={formData.quoteit_enabled} onCheckedChange={(v) => setFormData(p => ({ ...p, quoteit_enabled: v }))} />
            <span className="font-medium text-sm">Enable QuoteIT Integration</span>
          </label>

          {formData.quoteit_enabled && (
            <>
              <div>
                <Label className="text-xs">QuoteIT URL</Label>
                <Input
                  value={formData.quoteit_api_url}
                  onChange={e => setFormData(p => ({ ...p, quoteit_api_url: e.target.value }))}
                  placeholder="https://quoteit.gtools.io"
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">Your QuoteIT instance URL</p>
              </div>
              <div>
                <Label className="text-xs">API Key</Label>
                <Input
                  value={formData.quoteit_api_key}
                  onChange={e => setFormData(p => ({ ...p, quoteit_api_key: e.target.value }))}
                  placeholder="Enter your QuoteIT API key"
                  type="password"
                  className="mt-1"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
          </div>

          {/* Result */}
          {result && (
            <div className={cn(
              "p-3 rounded-lg text-xs font-medium",
              result.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            )}>
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PortalITIntegrationCard({ expandedIntegration, toggleIntegration }) {
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const [formData, setFormData] = useState({
    portalit_enabled: false,
    portalit_api_url: '',
    portalit_api_key: '',
  });

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['integrationSettings'],
    queryFn: () => api.entities.IntegrationSettings.filter({ setting_key: 'main' })
  });

  useEffect(() => {
    if (settings[0]) {
      setFormData(prev => ({
        ...prev,
        portalit_enabled: settings[0].portalit_enabled || false,
        portalit_api_url: settings[0].portalit_api_url || '',
        portalit_api_key: settings[0].portalit_api_key || '',
      }));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      const payload = { setting_key: 'main', ...formData };
      if (settings[0]) {
        await api.entities.IntegrationSettings.update(settings[0].id, payload);
      } else {
        await api.entities.IntegrationSettings.create(payload);
      }
      refetch();
      setResult({ success: true, message: 'PortalIT settings saved' });
    } catch (err) {
      setResult({ success: false, message: err.message || 'Failed to save' });
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => toggleIntegration('portalit')}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <img src="/portalit-favicon.svg" alt="" className="w-7 h-7" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-slate-900">Portal<span className="text-emerald-500">IT</span></h3>
            <p className="text-xs text-slate-500 mt-0.5">Customer portal — project visibility & communication</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {formData.portalit_enabled ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Connected</Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">Not configured</Badge>
          )}
          <ChevronDown className={cn(
            "w-5 h-5 text-slate-400 transition-transform duration-200",
            expandedIntegration === 'portalit' && "rotate-180"
          )} />
        </div>
      </button>

      {expandedIntegration === 'portalit' && (
        <div className="border-t p-3 sm:p-6 space-y-5">
          {/* How it works */}
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">What this does</h4>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Give customers a self-service portal to view project progress
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Sync project data, timelines & milestones to PortalIT
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Enable customer communication & file sharing
              </li>
            </ul>
          </div>

          {/* Enable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={formData.portalit_enabled} onCheckedChange={(v) => setFormData(p => ({ ...p, portalit_enabled: v }))} />
            <span className="font-medium text-sm">Enable PortalIT Integration</span>
          </label>

          {formData.portalit_enabled && (
            <>
              <div>
                <Label className="text-xs">PortalIT URL</Label>
                <Input
                  value={formData.portalit_api_url}
                  onChange={e => setFormData(p => ({ ...p, portalit_api_url: e.target.value }))}
                  placeholder="https://portalit.gtools.io"
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">Your PortalIT instance URL</p>
              </div>
              <div>
                <Label className="text-xs">API Key</Label>
                <Input
                  value={formData.portalit_api_key}
                  onChange={e => setFormData(p => ({ ...p, portalit_api_key: e.target.value }))}
                  placeholder="Enter your PortalIT API key"
                  type="password"
                  className="mt-1"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
          </div>

          {/* Result */}
          {result && (
            <div className={cn(
              "p-3 rounded-lg text-xs font-medium",
              result.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            )}>
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GammaAiIntegrationCard({ expandedIntegration, toggleIntegration }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [agents, setAgents] = useState([]);

  const [formData, setFormData] = useState({
    gammaai_url: '',
    gammaai_api_key: '',
    gammaai_webhook_secret: '',
    gammaai_enabled: false,
    gammaai_auto_send: false,
    gammaai_default_agent_id: '',
  });

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['gammaaiSettings'],
    queryFn: () => api.entities.IntegrationSettings.filter({ provider: 'gammaai' })
  });

  useEffect(() => {
    if (settings[0]) {
      setFormData(prev => ({
        ...prev,
        gammaai_url: settings[0].gammaai_url || '',
        gammaai_api_key: settings[0].gammaai_api_key || '',
        gammaai_webhook_secret: settings[0].gammaai_webhook_secret || '',
        gammaai_enabled: settings[0].gammaai_enabled || false,
        gammaai_auto_send: settings[0].gammaai_auto_send || false,
        gammaai_default_agent_id: settings[0].gammaai_default_agent_id || '',
      }));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.functions.invoke('agentBridge', { action: 'saveSettings', ...formData });
      refetch();
      setResult({ success: true, message: 'GammaAi settings saved' });
    } catch (err) {
      setResult({ success: false, message: err.message || 'Failed to save' });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!formData.gammaai_url || !formData.gammaai_api_key) {
      setResult({ success: false, message: 'Please fill in the URL and API Key first' });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      await handleSave();
      const response = await api.functions.invoke('agentBridge', { action: 'testConnection' });
      const data = response.data || response;
      if (data.success) {
        setResult({ success: true, message: 'Connected to GammaAi!' });
        // Fetch agents
        const agentsRes = await api.functions.invoke('agentBridge', { action: 'listAgents' });
        if (agentsRes.data?.agents) setAgents(agentsRes.data.agents);
      } else {
        setResult({ success: false, message: data.message || 'Connection failed' });
      }
    } catch (error) {
      setResult({ success: false, message: error.data?.error || error.message || 'Connection failed' });
    }
    setTesting(false);
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : API_URL;
  const webhookUrl = `${API_URL}/api/webhooks/gammaai`;

  const [copiedField, setCopiedField] = useState(null);
  const copyToClipboard = (value, field) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <button
        onClick={() => toggleIntegration('gammaai')}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">GammaAi</h3>
              {formData.gammaai_enabled && (
                <Badge className="bg-emerald-50 text-emerald-600 text-[10px]">Connected</Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">AI agent orchestration — automated feedback analysis & fixes</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedIntegration === 'gammaai' ? 'rotate-180' : ''}`} />
      </button>

      {expandedIntegration === 'gammaai' && (
        <div className="border-t p-3 sm:p-6 space-y-5">
          {/* How it works */}
          <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
            <div className="flex items-start gap-3">
              <Bot className="w-5 h-5 text-teal-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-teal-900">How it works</h4>
                <ul className="text-xs text-teal-700 mt-2 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" />
                    Send feedback to GammaAi agents for analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" />
                    Agents fix issues, create PRs, and redeploy
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" />
                    Results sync back to the feedback item automatically
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* GammaAi App Registration Info */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-teal-600" />
              <h4 className="text-sm font-semibold text-slate-700">Register App in GammaAi</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4">Copy these values into GammaAi when registering your app:</p>
            <div className="space-y-3">
              {/* App Name */}
              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">App Name</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800">
                    ProjectIT
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={() => copyToClipboard('ProjectIT', 'appName')}
                  >
                    {copiedField === 'appName' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              {/* URL */}
              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">URL</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 truncate">
                    {appUrl}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={() => copyToClipboard(appUrl, 'appUrl')}
                  >
                    {copiedField === 'appUrl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              {/* Webhook URL */}
              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Webhook URL</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 truncate">
                    {webhookUrl}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={() => copyToClipboard(webhookUrl, 'webhookUrl')}
                  >
                    {copiedField === 'webhookUrl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">GammaAi will POST task completion events to the webhook URL with an <code className="bg-white px-1 rounded">x-gammaai-webhook-secret</code> header for validation.</p>
          </div>

          {/* Connection fields */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs">GammaAi URL</Label>
              <Input
                value={formData.gammaai_url}
                onChange={e => setFormData(prev => ({ ...prev, gammaai_url: e.target.value }))}
                placeholder="https://gammaai.example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">API Key</Label>
              <Input
                type="password"
                value={formData.gammaai_api_key}
                onChange={e => setFormData(prev => ({ ...prev, gammaai_api_key: e.target.value }))}
                placeholder="Paste your GammaAi API key"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Webhook Secret</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="password"
                  value={formData.gammaai_webhook_secret}
                  onChange={e => setFormData(prev => ({ ...prev, gammaai_webhook_secret: e.target.value }))}
                  placeholder="Click Generate to create a secret"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 shrink-0 text-teal-600 border-teal-200 hover:bg-teal-50"
                  onClick={() => {
                    const secret = 'whsec_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
                      .map(b => b.toString(16).padStart(2, '0')).join('');
                    setFormData(prev => ({ ...prev, gammaai_webhook_secret: secret }));
                    navigator.clipboard.writeText(secret);
                    setCopiedField('webhookSecret');
                    setTimeout(() => setCopiedField(null), 2000);
                  }}
                >
                  {copiedField === 'webhookSecret' ? (
                    <><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />Copied</>
                  ) : (
                    <><KeyRound className="w-3.5 h-3.5 mr-1.5" />Generate</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {copiedField === 'webhookSecret'
                  ? 'Secret copied to clipboard — paste it into GammaAi\'s webhook secret field, then save here.'
                  : 'Generate a secret, then paste it into GammaAi. GammaAi sends it in the x-gammaai-webhook-secret header.'}
              </p>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-3 sm:gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.gammaai_enabled}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, gammaai_enabled: !!checked }))}
                />
                <span className="text-sm text-slate-700">Enabled</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.gammaai_auto_send}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, gammaai_auto_send: !!checked }))}
                />
                <span className="text-sm text-slate-700">Auto-send new feedback</span>
              </label>
            </div>
          </div>

          {/* Default agent */}
          {agents.length > 0 && (
            <div>
              <Label className="text-xs">Default Agent</Label>
              <select
                value={formData.gammaai_default_agent_id}
                onChange={e => setFormData(prev => ({ ...prev, gammaai_default_agent_id: e.target.value }))}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Auto-assign</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                ))}
              </select>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={cn(
              "p-3 rounded-lg text-sm flex items-center gap-2",
              result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            )}>
              {result.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {result.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
            </Button>
            <Button onClick={handleTest} disabled={testing} variant="outline">
              {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</> : 'Test Connection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResendIntegrationCard({ expandedIntegration, toggleIntegration }) {
  const [fromEmail, setFromEmail] = useState('noreply@projectit.app');
  const [fromName, setFromName] = useState('ProjectIT');
  const [testEmail, setTestEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [result, setResult] = useState(null);
  const [hasEnvApiKey, setHasEnvApiKey] = useState(false);
  const [testNotifEmail, setTestNotifEmail] = useState('');
  const [sendingTestNotif, setSendingTestNotif] = useState(false);
  const [testNotifResult, setTestNotifResult] = useState(null);

  const handleSendTestNotification = async () => {
    if (!testNotifEmail) return;
    setSendingTestNotif(true);
    setTestNotifResult(null);
    try {
      // 1. Create in-app notification
      await api.entities.UserNotification.create({
        user_email: testNotifEmail,
        type: 'project_update',
        title: 'Test Notification',
        message: 'This is a test notification from Adminland. If you received this, notifications are working!',
        is_read: false,
        link: '/',
      });
      // 2. Send email + push via the notification handler
      await api.functions.invoke('sendNotificationEmail', {
        to: testNotifEmail,
        type: 'project_update',
        title: 'Test Notification',
        message: 'This is a test notification from Adminland.',
        projectName: 'Test',
        fromUserName: 'Admin',
        link: '/',
      });
      setTestNotifResult({ success: true, message: `Test notification sent to ${testNotifEmail} (in-app + email + push)` });
    } catch (err) {
      setTestNotifResult({ success: false, message: err.message || 'Failed to send test notification' });
    }
    setSendingTestNotif(false);
  };

  // Check if RESEND_API_KEY env var is set on the server
  useEffect(() => {
    api.functions.invoke('resendEmail', { action: 'checkEnvStatus' })
      .then(r => setHasEnvApiKey(r.hasApiKey || false))
      .catch(() => setHasEnvApiKey(false));
  }, []);

  // Load existing settings (from/name only — API key is env-only)
  const { data: resendSettings = [] } = useQuery({
    queryKey: ['resendSettings'],
    queryFn: () => api.entities.IntegrationSettings.filter({ provider: 'resend' })
  });

  useEffect(() => {
    if (resendSettings[0]) {
      setFromEmail(resendSettings[0].from_email || 'noreply@projectit.app');
      setFromName(resendSettings[0].from_name || 'ProjectIT');
    }
  }, [resendSettings]);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      await api.functions.invoke('resendEmail', {
        action: 'saveSettings',
        fromEmail,
        fromName,
      });
      setResult({ success: true, message: 'Settings saved successfully' });
    } catch (err) {
      setResult({ success: false, message: err.data?.error || err.message });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!hasEnvApiKey) {
      setResult({ success: false, message: 'RESEND_API_KEY environment variable is not set on the server' });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      await handleSave();
      const response = await api.functions.invoke('resendEmail', { action: 'testConnection' });
      const data = response.data || response;
      setResult(data.success
        ? { success: true, message: 'Connected to Resend successfully!' }
        : { success: false, message: data.error || 'Connection failed' });
    } catch (err) {
      setResult({ success: false, message: err.data?.error || 'Connection failed' });
    }
    setTesting(false);
  };

  const handleSendTest = async () => {
    if (!testEmail) { setResult({ success: false, message: 'Enter a test email address' }); return; }
    setSendingTest(true);
    setResult(null);
    try {
      const response = await api.functions.invoke('resendEmail', { action: 'sendTestEmail', to: testEmail });
      const data = response.data || response;
      setResult(data.success
        ? { success: true, message: `Test email sent to ${testEmail}!` }
        : { success: false, message: data.error || 'Failed to send' });
    } catch (err) {
      setResult({ success: false, message: err.data?.error || 'Failed to send test email' });
    }
    setSendingTest(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => toggleIntegration('resend')}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-slate-900">Resend</h3>
            <p className="text-xs text-slate-500 mt-0.5">Email notifications & transactional emails</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasEnvApiKey ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Connected</Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">Not configured</Badge>
          )}
          <ChevronDown className={cn(
            "w-5 h-5 text-slate-400 transition-transform duration-200",
            expandedIntegration === 'resend' && "rotate-180"
          )} />
        </div>
      </button>

      {expandedIntegration === 'resend' && (
        <div className="border-t p-3 sm:p-6 space-y-5">
          {/* API Key — env var only */}
          <div>
            <Label className="text-xs">Resend API Key</Label>
            {hasEnvApiKey ? (
              <div className="mt-1 h-9 flex items-center gap-2 px-3 rounded-md border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Configured via environment variable
              </div>
            ) : (
              <div className="mt-1 h-9 flex items-center gap-2 px-3 rounded-md border border-red-200 bg-red-50 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                Set RESEND_API_KEY in Railway env vars
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/api-keys</a></p>
          </div>

          {/* From settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">From Name</Label>
              <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="ProjectIT" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">From Email</Label>
              <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="noreply@yourdomain.com" className="mt-1" />
            </div>
          </div>

          {/* Test email */}
          {hasEnvApiKey && (
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Send Test Email
              </h3>
              <div className="flex gap-2">
                <Input
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1"
                />
                <Button onClick={handleSendTest} disabled={sendingTest} variant="outline" size="sm">
                  {sendingTest ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send Test'}
                </Button>
              </div>
            </div>
          )}

          {/* Test notification (email + push) */}
          <div className="pt-4 border-t space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Send Test Notification
            </h3>
            <p className="text-xs text-muted-foreground">Sends an in-app notification + email + push to the specified user.</p>
            <div className="flex gap-2">
              <Input
                value={testNotifEmail}
                onChange={e => setTestNotifEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1"
              />
              <Button onClick={handleSendTestNotification} disabled={sendingTestNotif} variant="outline" size="sm">
                {sendingTestNotif ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send Test'}
              </Button>
            </div>
            {testNotifResult && (
              <div className={cn(
                "p-3 rounded-lg text-sm flex items-center gap-2",
                testNotifResult.success ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              )}>
                {testNotifResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {testNotifResult.message}
              </div>
            )}
          </div>

          {/* Result message */}
          {result && (
            <div className={cn(
              "p-3 rounded-lg text-sm flex items-center gap-2",
              result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            )}>
              {result.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {result.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
            </Button>
            <Button onClick={handleTest} disabled={testing || !hasEnvApiKey} variant="outline">
              {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</> : 'Test Connection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const AI_FEATURES = [
  { key: 'task_suggestions', label: 'Task Suggestions', description: 'Priority suggestions, sub-task generation, task summaries, and draft replies' },
  { key: 'project_summary', label: 'Project Summary', description: 'AI-generated executive summaries for projects' },
  { key: 'document_analysis', label: 'Document Analysis', description: 'Extract data from invoices, quotes, spec sheets, and uploaded files' },
  { key: 'report_assistant', label: 'Report Assistant', description: 'Answer questions about your data with charts and insights' },
  { key: 'chat', label: 'AI Chat', description: 'General AI assistant for project-related questions' },
  { key: 'workflow_suggestions', label: 'Workflow Suggestions', description: 'AI-powered automation workflow recommendations' },
  { key: 'dashboard_summary', label: 'Dashboard Summary', description: 'Daily summary widget on the dashboard' },
  { key: 'manager_insights', label: 'Manager Insights', description: 'Actionable insights on the manager dashboard' },
  { key: 'parts_extraction', label: 'Parts Extraction', description: 'Identify parts from images/documents and AI product search' },
  { key: 'customer_communication', label: 'Customer Communication', description: 'AI-suggested follow-up emails for customers' },
];

function ClaudeAIIntegrationCard({ expandedIntegration, toggleIntegration }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('status');
  const [instructions, setInstructions] = useState({});
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [instructionsSaved, setInstructionsSaved] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState(null);

  useEffect(() => {
    api.entities.IntegrationSettings.filter({ provider: 'claude_ai' })
      .then(settings => {
        if (settings.length > 0) {
          if (settings[0].enabled) setConnected(true);
          if (settings[0].instructions) setInstructions(settings[0].instructions);
        }
      })
      .catch(() => {});
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await api.functions.invoke('claudeAI', { action: 'testConnection' });
      setResult({ success: true, message: res.data?.message || 'Connected!' });
      setConnected(true);
      await api.functions.invoke('claudeAI', { action: 'saveSettings', api_key_configured: true });
    } catch (err) {
      setResult({ success: false, message: err.message || 'Connection failed. Check ANTHROPIC_API_KEY env variable.' });
    }
    setTesting(false);
  };

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    setInstructionsSaved(false);
    try {
      await api.functions.invoke('claudeAI', { action: 'saveSettings', instructions });
      setInstructionsSaved(true);
      setTimeout(() => setInstructionsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save instructions:', err);
    }
    setSavingInstructions(false);
  };

  const updateInstruction = (key, value) => {
    setInstructions(prev => ({ ...prev, [key]: value }));
    setInstructionsSaved(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <button
        onClick={() => toggleIntegration('claude_ai')}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Claude AI</h3>
              {connected && (
                <Badge className="bg-emerald-50 text-emerald-600 text-[10px]">Connected</Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">AI-powered document analysis, project insights & task suggestions</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedIntegration === 'claude_ai' ? 'rotate-180' : ''}`} />
      </button>

      {expandedIntegration === 'claude_ai' && (
        <div className="border-t">
          {/* Tabs */}
          <div className="flex border-b bg-slate-50">
            <button
              onClick={() => setActiveTab('status')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === 'status'
                  ? "text-violet-700 border-b-2 border-violet-600 bg-white"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Bot className="w-4 h-4 inline mr-1.5" />
              Status
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === 'instructions'
                  ? "text-violet-700 border-b-2 border-violet-600 bg-white"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <FileText className="w-4 h-4 inline mr-1.5" />
              AI Instructions
            </button>
          </div>

          {/* Status Tab */}
          {activeTab === 'status' && (
            <div className="p-6 space-y-5">
              <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                <div className="flex items-start gap-3">
                  <Bot className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-violet-900">Claude AI Capabilities</h4>
                    <ul className="text-xs text-violet-700 mt-2 space-y-1.5">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        Document scanning — extract data from invoices, quotes, spec sheets
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        Project summaries — AI-generated executive reports
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        Task suggestions — smart task recommendations based on project context
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        AI assistant — natural language chat about your projects
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600">
                  <span className="font-medium">Configuration:</span> Set the <code className="bg-white px-1 py-0.5 rounded text-[10px]">ANTHROPIC_API_KEY</code> environment variable on your Railway backend service.
                  The API key is stored securely as an environment variable and never exposed to the frontend.
                </p>
              </div>

              {result && (
                <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {result.message}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleTest} disabled={testing} className="bg-violet-600 hover:bg-violet-700">
                  {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</> : <><Sparkles className="w-4 h-4 mr-2" />Test Connection</>}
                </Button>
              </div>
            </div>
          )}

          {/* AI Instructions Tab */}
          {activeTab === 'instructions' && (
            <div className="p-6 space-y-5">
              <div className="p-3 bg-violet-50 rounded-lg border border-violet-100">
                <p className="text-xs text-violet-700">
                  <span className="font-medium">How it works:</span> Global instructions are prepended to every AI request.
                  Per-feature instructions are added only when that specific feature is used.
                  Leave blank for default behavior.
                </p>
              </div>

              {/* Global Instructions */}
              <div>
                <Label className="text-sm font-semibold text-slate-900">Global Instructions</Label>
                <p className="text-xs text-slate-500 mt-0.5 mb-2">Applied to all AI features (e.g., company name, preferred language, tone)</p>
                <Textarea
                  value={instructions.global || ''}
                  onChange={(e) => updateInstruction('global', e.target.value)}
                  placeholder="e.g., Our company is Gamma Tech. Always use metric units. Be concise and professional."
                  className="min-h-[80px] text-sm"
                />
              </div>

              {/* Per-Feature Instructions */}
              <div>
                <Label className="text-sm font-semibold text-slate-900 mb-3 block">Per-Feature Instructions</Label>
                <div className="space-y-2">
                  {AI_FEATURES.map(({ key, label, description }) => (
                    <div key={key} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedFeature(expandedFeature === key ? null : key)}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{label}</span>
                          {instructions[key]?.trim() && (
                            <Badge className="bg-violet-100 text-violet-700 text-[10px]">Custom</Badge>
                          )}
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", expandedFeature === key && "rotate-180")} />
                      </button>
                      {expandedFeature === key && (
                        <div className="px-3 pb-3 border-t bg-slate-50/50">
                          <p className="text-xs text-slate-500 mt-2 mb-2">{description}</p>
                          <Textarea
                            value={instructions[key] || ''}
                            onChange={(e) => updateInstruction(key, e.target.value)}
                            placeholder={`Custom instructions for ${label}...`}
                            className="min-h-[60px] text-sm bg-white"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveInstructions}
                  disabled={savingInstructions}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {savingInstructions ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : instructionsSaved ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" />Saved</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Save Instructions</>
                  )}
                </Button>
                {instructionsSaved && (
                  <span className="text-xs text-emerald-600">Instructions saved and applied to all AI features</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AIAgentsSection({ queryClient }) {
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [result, setResult] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [expandedCard, setExpandedCard] = useState('connection');
  const [copiedField, setCopiedField] = useState(null);

  const [formData, setFormData] = useState({
    gammaai_url: '',
    gammaai_api_key: '',
    gammaai_webhook_secret: '',
    gammaai_enabled: false,
    gammaai_auto_send: false,
    gammaai_default_agent_id: '',
  });

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['gammaaiSettings'],
    queryFn: () => api.entities.IntegrationSettings.filter({ provider: 'gammaai' })
  });

  useEffect(() => {
    if (settings[0]) {
      setFormData(prev => ({
        ...prev,
        gammaai_url: settings[0].gammaai_url || '',
        gammaai_api_key: settings[0].gammaai_api_key || '',
        gammaai_webhook_secret: settings[0].gammaai_webhook_secret || '',
        gammaai_enabled: settings[0].gammaai_enabled || false,
        gammaai_auto_send: settings[0].gammaai_auto_send || false,
        gammaai_default_agent_id: settings[0].gammaai_default_agent_id || '',
      }));
    }
  }, [settings]);

  // Load agents when connected
  useEffect(() => {
    if (formData.gammaai_enabled && formData.gammaai_url && formData.gammaai_api_key) {
      fetchAgents();
    }
  }, [formData.gammaai_enabled]);

  const [agentError, setAgentError] = useState(null);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    setAgentError(null);
    try {
      const res = await api.functions.invoke('agentBridge', { action: 'listAgents' });
      if (res.data?.success) {
        setAgents(res.data.agents || []);
      } else {
        setAgentError(res.data?.message || 'Failed to load agents');
      }
    } catch (err) {
      setAgentError(err.data?.error || err.message || 'Failed to connect to GammaAi');
    }
    setLoadingAgents(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.functions.invoke('agentBridge', { action: 'saveSettings', ...formData });
      refetch();
      setResult({ success: true, message: 'Settings saved' });
    } catch (err) {
      setResult({ success: false, message: err.message || 'Failed to save' });
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!formData.gammaai_url || !formData.gammaai_api_key) {
      setResult({ success: false, message: 'Please fill in the GammaAi URL and API Key fields first' });
      return;
    }
    setTestingConnection(true);
    setResult(null);
    try {
      await handleSave();
      const response = await api.functions.invoke('agentBridge', { action: 'testConnection' });
      const data = response.data || response;
      if (data.success) {
        setResult({ success: true, message: 'Connected to GammaAi successfully!' });
        fetchAgents();
      } else {
        setResult({ success: false, message: data.message || 'Connection failed' });
      }
    } catch (error) {
      setResult({ success: false, message: error.data?.error || error.message || 'Connection failed' });
    }
    setTestingConnection(false);
  };

  const typeColors = {
    manager: 'bg-purple-100 text-purple-700',
    developer: 'bg-blue-100 text-blue-700',
    frontend: 'bg-cyan-100 text-cyan-700',
    backend: 'bg-indigo-100 text-indigo-700',
    reviewer: 'bg-amber-100 text-amber-700',
    security: 'bg-red-100 text-red-700',
    qa: 'bg-green-100 text-green-700',
    devops: 'bg-orange-100 text-orange-700',
    database: 'bg-teal-100 text-teal-700',
    analyst: 'bg-violet-100 text-violet-700',
  };

  const statusColors = {
    idle: 'bg-slate-400',
    working: 'bg-emerald-500 animate-pulse',
    paused: 'bg-amber-500',
    error: 'bg-red-500',
    offline: 'bg-slate-300',
  };

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-foreground">AI Agents</h2>
        <p className="text-sm text-muted-foreground mt-1">Connect to GammaAi to send feedback for automated analysis and fixes</p>
      </div>

      {/* Connection Settings Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => setExpandedCard(expandedCard === 'connection' ? null : 'connection')}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-foreground">GammaAi Connection</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Agent orchestration platform for automated feedback processing</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {formData.gammaai_enabled ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Connected</Badge>
            ) : (
              <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">Not configured</Badge>
            )}
            <ChevronDown className={cn(
              "w-5 h-5 text-slate-400 transition-transform duration-200",
              expandedCard === 'connection' && "rotate-180"
            )} />
          </div>
        </button>

        {expandedCard === 'connection' && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-3 sm:p-6 space-y-5">
            {/* Info banner */}
            <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800">
              <div className="flex items-start gap-3">
                <Bot className="w-5 h-5 text-teal-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-200">How it works</h4>
                  <ul className="text-xs text-teal-700 dark:text-teal-300 mt-2 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" />
                      Send feedback items to GammaAi agents for analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" />
                      Agents fix issues, create PRs, and redeploy automatically
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" />
                      Results and notes are synced back to the feedback item
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Connection fields */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs">GammaAi URL</Label>
                <Input
                  value={formData.gammaai_url}
                  onChange={e => setFormData(prev => ({ ...prev, gammaai_url: e.target.value }))}
                  placeholder="https://gammaai.example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">API Key</Label>
                <Input
                  type="password"
                  value={formData.gammaai_api_key}
                  onChange={e => setFormData(prev => ({ ...prev, gammaai_api_key: e.target.value }))}
                  placeholder="Enter your GammaAi API key"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Webhook Secret</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="password"
                    value={formData.gammaai_webhook_secret}
                    onChange={e => setFormData(prev => ({ ...prev, gammaai_webhook_secret: e.target.value }))}
                    placeholder="Click Generate to create a secret"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 shrink-0 text-teal-600 border-teal-200 hover:bg-teal-50"
                    onClick={() => {
                      const secret = 'whsec_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
                        .map(b => b.toString(16).padStart(2, '0')).join('');
                      setFormData(prev => ({ ...prev, gammaai_webhook_secret: secret }));
                      navigator.clipboard.writeText(secret);
                      setCopiedField('webhookSecret');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                  >
                    {copiedField === 'webhookSecret' ? (
                      <><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />Copied</>
                    ) : (
                      <><KeyRound className="w-3.5 h-3.5 mr-1.5" />Generate</>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {copiedField === 'webhookSecret'
                    ? 'Secret copied to clipboard — paste it into GammaAi\'s webhook secret field, then save here.'
                    : 'Generate a secret, then paste it into GammaAi. Used to verify callbacks.'}
                </p>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-3 sm:gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.gammaai_enabled}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, gammaai_enabled: !!checked }))}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Enabled</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.gammaai_auto_send}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, gammaai_auto_send: !!checked }))}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Auto-send new feedback</span>
                </label>
              </div>
            </div>

            {/* Result message */}
            {result && (
              <div className={cn(
                "p-3 rounded-lg text-sm flex items-center gap-2",
                result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )}>
                {result.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {result.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
              </Button>
              <Button onClick={handleTestConnection} disabled={testingConnection} variant="outline">
                {testingConnection ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</> : 'Test Connection'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Available Agents Card */}
      {formData.gammaai_enabled && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setExpandedCard(expandedCard === 'agents' ? null : 'agents')}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-foreground">Available Agents</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {loadingAgents ? 'Loading agents...' : agents.length > 0 ? `${agents.length} agents available` : agentError ? 'Connection error' : 'No agents found'}
                </p>
              </div>
            </div>
            <ChevronDown className={cn(
              "w-5 h-5 text-slate-400 transition-transform duration-200",
              expandedCard === 'agents' && "rotate-180"
            )} />
          </button>

          {expandedCard === 'agents' && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-3 sm:p-6 space-y-4">
              {loadingAgents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  <span className="ml-2 text-sm text-slate-500">Loading agents...</span>
                </div>
              ) : agents.length > 0 ? (
                <>
                  {/* Default agent selector */}
                  <div>
                    <Label className="text-xs">Default Agent for Feedback</Label>
                    <select
                      value={formData.gammaai_default_agent_id}
                      onChange={e => setFormData(prev => ({ ...prev, gammaai_default_agent_id: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                    >
                      <option value="">Auto-assign (let GammaAi decide)</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name} ({agent.type})</option>
                      ))}
                    </select>
                  </div>

                  {/* Agent list */}
                  <div className="space-y-2">
                    {agents.map(agent => (
                      <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full", statusColors[agent.status] || 'bg-slate-400')} />
                          <div>
                            <span className="text-sm font-medium text-foreground">{agent.name}</span>
                            {agent.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-[10px]", typeColors[agent.type] || 'bg-slate-100 text-slate-700')}>
                            {agent.type}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{agent.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={fetchAgents} variant="outline" size="sm">
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Refresh Agents
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <Bot className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  {agentError ? (
                    <>
                      <p className="text-sm text-red-600 font-medium">Failed to load agents</p>
                      <p className="text-xs text-red-500 mt-1 max-w-md mx-auto">{agentError}</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No agents found. Check your GammaAi connection.</p>
                  )}
                  <Button onClick={fetchAgents} variant="outline" size="sm" className="mt-3" disabled={loadingAgents}>
                    {loadingAgents ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                    Retry
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GiphyIntegrationCard({ expandedIntegration, toggleIntegration }) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [hasEnvApiKey, setHasEnvApiKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [previewGifs, setPreviewGifs] = useState([]);

  const [formData, setFormData] = useState({
    giphy_enabled: false,
    giphy_rating: 'g',
    giphy_language: 'en',
  });

  // Check env var status
  useEffect(() => {
    api.functions.invoke('giphy', { action: 'checkEnvStatus' })
      .then(r => setHasEnvApiKey(r.hasApiKey || false))
      .catch(() => setHasEnvApiKey(false));
  }, []);

  // Load existing settings
  const { data: giphySettings = [], refetch } = useQuery({
    queryKey: ['giphySettings'],
    queryFn: () => api.entities.IntegrationSettings.filter({ provider: 'giphy' })
  });

  useEffect(() => {
    if (giphySettings[0]) {
      setFormData(prev => ({
        ...prev,
        giphy_enabled: giphySettings[0].enabled || false,
        giphy_rating: giphySettings[0].rating || 'g',
        giphy_language: giphySettings[0].language || 'en',
      }));
    }
  }, [giphySettings]);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      await api.functions.invoke('giphy', {
        action: 'saveSettings',
        enabled: formData.giphy_enabled,
        rating: formData.giphy_rating,
        language: formData.giphy_language,
      });
      refetch();
      setResult({ success: true, message: 'Giphy settings saved successfully' });
    } catch (err) {
      setResult({ success: false, message: err.data?.error || err.message || 'Failed to save' });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!hasEnvApiKey) {
      setResult({ success: false, message: 'GIPHY_API_KEY environment variable is not set on the server' });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      const response = await api.functions.invoke('giphy', { action: 'testConnection' });
      const data = response.data || response;
      setResult(data.success
        ? { success: true, message: 'Connected to Giphy API successfully!' }
        : { success: false, message: data.error || 'Connection failed' });
    } catch (err) {
      setResult({ success: false, message: err.data?.error || 'Connection test failed' });
    }
    setTesting(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await api.functions.invoke('giphy', { action: 'search', query: searchQuery, limit: 6 });
      const data = response.data || response;
      if (data.success) {
        setPreviewGifs(data.gifs || []);
      } else {
        setResult({ success: false, message: data.error || 'Search failed' });
      }
    } catch (err) {
      setResult({ success: false, message: 'Search failed' });
    }
    setSearching(false);
  };

  const RATING_OPTIONS = [
    { value: 'g', label: 'G — General Audiences' },
    { value: 'pg', label: 'PG — Parental Guidance' },
    { value: 'pg-13', label: 'PG-13 — Some Material Inappropriate' },
    { value: 'r', label: 'R — Restricted' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => toggleIntegration('giphy')}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-400 flex items-center justify-center shadow-sm">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-slate-900">Giphy</h3>
            <p className="text-xs text-slate-500 mt-0.5">GIF search & reactions for messages and comments</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasEnvApiKey && formData.giphy_enabled ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Connected</Badge>
          ) : hasEnvApiKey ? (
            <Badge variant="outline" className="text-amber-500 border-amber-200 text-xs">Key Set</Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">Not configured</Badge>
          )}
          <ChevronDown className={cn(
            "w-5 h-5 text-slate-400 transition-transform duration-200",
            expandedIntegration === 'giphy' && "rotate-180"
          )} />
        </div>
      </button>

      {expandedIntegration === 'giphy' && (
        <div className="border-t p-3 sm:p-6 space-y-5">
          {/* How it works */}
          <div className="p-4 bg-gradient-to-br from-purple-50/50 to-pink-50/30 rounded-xl border border-purple-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">What this does</h4>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-purple-500" />
                Add GIF reactions to project messages and comments
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-purple-500" />
                Search Giphy's library directly from within ProjectIT
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-purple-500" />
                Content rating filter to keep it workplace appropriate
              </li>
            </ul>
          </div>

          {/* API Key — env var only */}
          <div>
            <Label className="text-xs">Giphy API Key</Label>
            {hasEnvApiKey ? (
              <div className="mt-1 h-9 flex items-center gap-2 px-3 rounded-md border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Configured via GIPHY_API_KEY environment variable
              </div>
            ) : (
              <div className="mt-1 h-9 flex items-center gap-2 px-3 rounded-md border border-red-200 bg-red-50 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                Set GIPHY_API_KEY in Railway env vars
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">Get your SDK key from <a href="https://developers.giphy.com/dashboard/" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">developers.giphy.com</a></p>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Content Rating</Label>
              <select
                value={formData.giphy_rating}
                onChange={e => setFormData(prev => ({ ...prev, giphy_rating: e.target.value }))}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                {RATING_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Language</Label>
              <select
                value={formData.giphy_language}
                onChange={e => setFormData(prev => ({ ...prev, giphy_language: e.target.value }))}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh-CN">Chinese (Simplified)</option>
              </select>
            </div>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.giphy_enabled}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, giphy_enabled: !!checked }))}
              />
              <span className="text-sm text-slate-700">Enable Giphy integration</span>
            </label>
          </div>

          {/* Test Search */}
          {hasEnvApiKey && (
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Test GIF Search
              </h3>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for GIFs... (e.g. thumbs up)"
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searching} variant="outline" size="sm">
                  {searching ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
                  Search
                </Button>
              </div>
              {previewGifs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {previewGifs.map(gif => (
                    <div key={gif.id} className="relative rounded-lg overflow-hidden bg-slate-100 aspect-square group">
                      <img
                        src={gif.images.fixed_width?.url || gif.images.downsized?.url}
                        alt={gif.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                        <p className="text-[9px] text-white font-medium truncate">{gif.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400">Powered by GIPHY</p>
            </div>
          )}

          {/* Result message */}
          {result && (
            <div className={cn(
              "p-3 rounded-lg text-sm flex items-center gap-2",
              result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            )}>
              {result.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {result.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:brightness-110 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
            </Button>
            <Button onClick={handleTest} disabled={testing || !hasEnvApiKey} variant="outline">
              {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</> : 'Test Connection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── About & System Section ──────────────────────────────────────────────────
const changeTypeConfig = {
  feature: { icon: Rocket, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'New' },
  fix: { icon: Bug, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Fix' },
  improvement: { icon: Star, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Improved' },
  breaking: { icon: Wrench, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'Breaking' },
};

function AboutSection() {
  const [copied, setCopied] = useState(false);

  const infoRows = [
    { label: 'App Version', value: `v${APP_VERSION}`, badge: true },
    { label: 'Build Hash', value: BUILD_HASH, mono: true },
    { label: 'Build Date', value: new Date(BUILD_TIMESTAMP).toLocaleString() },
    { label: 'Environment', value: BUILD_ENV, badge: true },
    { label: 'API URL', value: import.meta.env.VITE_API_URL || 'http://localhost:3001', mono: true },
    { label: 'Supabase Project', value: (import.meta.env.VITE_SUPABASE_URL || '').replace('https://', '').replace('.supabase.co', '') || 'Not configured', mono: true },
    { label: 'Hosting', value: 'Railway', badge: true },
    { label: 'Frontend', value: 'React 18 + Vite 6' },
  ];

  const handleCopyDebug = () => {
    const debugInfo = infoRows.map(r => `${r.label}: ${r.value}`).join('\n');
    navigator.clipboard.writeText(debugInfo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Debug info copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* System Info Card */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b dark:border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              About & System Info
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Build information and environment details
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyDebug} className="gap-2">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Info'}
          </Button>
        </div>

        <div className="divide-y dark:divide-border">
          {infoRows.map((row) => (
            <div key={row.label} className="px-6 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              {row.badge ? (
                <Badge variant="secondary" className="font-mono text-xs">
                  {row.value}
                </Badge>
              ) : (
                <span className={cn(
                  "text-sm text-foreground",
                  row.mono && "font-mono text-xs bg-slate-100 dark:bg-muted px-2 py-0.5 rounded"
                )}>
                  {row.value}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Design System Reference */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b dark:border-border">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Design System
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Colors, typography, spacing, and component patterns
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Colors */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Brand Colors</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Primary', hex: '#0F2F44', css: '--primary', swatch: 'bg-primary' },
                { name: 'Secondary', hex: '#133F5C', css: '--secondary', swatch: 'bg-primary' },
                { name: 'Accent', hex: '#0069AF', css: '--accent / --ring', swatch: 'bg-primary' },
                { name: 'Highlight', hex: '#74C7FF', css: '--highlight', swatch: 'bg-[#74C7FF]' },
              ].map((c) => (
                <div key={c.name} className="flex items-center gap-3 p-2 rounded-xl border bg-card">
                  <div className={`w-8 h-8 rounded-lg ${c.swatch} flex-shrink-0`} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{c.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{c.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Status Colors */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Status Colors</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { status: 'todo', color: 'bg-slate-100 text-slate-700' },
                { status: 'in_progress', color: 'bg-blue-100 text-blue-700' },
                { status: 'review', color: 'bg-violet-100 text-violet-700' },
                { status: 'completed', color: 'bg-emerald-100 text-emerald-700' },
                { status: 'on_hold', color: 'bg-amber-100 text-amber-700' },
                { status: 'needed', color: 'bg-orange-100 text-orange-700' },
                { status: 'ordered', color: 'bg-sky-100 text-sky-700' },
                { status: 'critical', color: 'bg-red-100 text-red-700' },
              ].map((s) => (
                <span key={s.status} className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${s.color}`}>
                  {s.status.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
          {/* Typography */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Typography</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Font:</span> <span className="font-semibold">Poppins</span> (300-700)</p>
              <p><span className="text-muted-foreground">Page Title:</span> <span className="text-2xl font-bold">text-2xl font-bold</span></p>
              <p><span className="text-muted-foreground">Section Header:</span> <span className="text-lg font-semibold">text-lg font-semibold</span></p>
              <p><span className="text-muted-foreground">Body:</span> <span className="text-sm">text-sm (14px)</span></p>
              <p><span className="text-muted-foreground">Caption:</span> <span className="text-xs text-muted-foreground">text-xs text-muted-foreground</span></p>
            </div>
          </div>
          {/* Spacing & Radius */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Spacing & Radius</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Card radius:</span> <span className="font-mono">rounded-2xl</span> (1rem / 16px)</p>
              <p><span className="text-muted-foreground">Button radius:</span> <span className="font-mono">rounded-lg</span> (0.5rem)</p>
              <p><span className="text-muted-foreground">Badge radius:</span> <span className="font-mono">rounded-md</span> (0.375rem)</p>
              <p><span className="text-muted-foreground">Section gap:</span> <span className="font-mono">gap-6</span> (1.5rem)</p>
              <p><span className="text-muted-foreground">Card padding:</span> <span className="font-mono">p-5</span> (1.25rem)</p>
              <p><span className="text-muted-foreground">Page max-width:</span> <span className="font-mono">max-w-7xl</span> (80rem)</p>
            </div>
          </div>
          {/* Component Patterns */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Shared Components</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                { name: 'PageShell', desc: 'Page wrapper with title, breadcrumbs, actions' },
                { name: 'InlineEdit', desc: 'Click-to-edit with Enter/Escape/blur' },
                { name: 'AnimatedList', desc: 'Framer Motion staggered list' },
                { name: 'DataTable', desc: 'Sortable, filterable, paginated table' },
                { name: 'EmptyState', desc: 'Empty state with icon, message, CTA' },
                { name: 'ConfirmDialog', desc: 'Reusable confirmation modal' },
                { name: 'StatusBadge', desc: 'Unified status/priority badge' },
                { name: 'QuickActions', desc: 'Row-level action dropdown' },
                { name: 'CollapsibleSection', desc: 'Collapsible with localStorage state' },
              ].map((comp) => (
                <div key={comp.name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  <code className="text-xs font-mono text-primary whitespace-nowrap">{comp.name}</code>
                  <span className="text-xs text-muted-foreground">{comp.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b dark:border-border">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Architecture
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tech stack, file structure, and data flow
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Tech Stack */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Tech Stack</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {[
                { category: 'Frontend', items: 'React 18, Vite 6' },
                { category: 'Styling', items: 'Tailwind CSS, shadcn/ui' },
                { category: 'State', items: 'TanStack React Query 5' },
                { category: 'Animations', items: 'Framer Motion 11' },
                { category: 'Icons', items: 'Lucide React' },
                { category: 'Backend', items: 'Supabase (Auth + DB)' },
                { category: 'Hosting', items: 'Railway' },
                { category: 'Routing', items: 'React Router 6' },
                { category: 'Charts', items: 'Recharts' },
              ].map((t) => (
                <div key={t.category} className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs font-semibold text-foreground">{t.category}</p>
                  <p className="text-xs text-muted-foreground">{t.items}</p>
                </div>
              ))}
            </div>
          </div>
          {/* File Structure */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">File Structure</h3>
            <pre className="text-xs font-mono text-muted-foreground bg-muted/50 p-4 rounded-xl overflow-x-auto">
{`src/
  api/          API client (Supabase + REST)
  components/
    ui/         Shared UI primitives (shadcn/ui + custom)
    dashboard/  Dashboard-specific components
    project/    Project page components
    modals/     Modal dialogs
    ...         Domain-grouped components
  hooks/        Custom React hooks
  pages/        Route-level page components (42 pages)
  utils/        Utility functions
  lib/          Library config (cn, etc.)`}
            </pre>
          </div>
          {/* Data Flow */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Data Flow</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>1. Pages fetch data via <code className="text-xs font-mono bg-muted px-1 rounded">useQuery</code> hooks from TanStack React Query</p>
              <p>2. API calls go through <code className="text-xs font-mono bg-muted px-1 rounded">api.entities.EntityName.method()</code></p>
              <p>3. Mutations use <code className="text-xs font-mono bg-muted px-1 rounded">useOptimisticMutation</code> for instant UI + rollback</p>
              <p>4. Auth tokens managed by Supabase client (JWT in session)</p>
              <p>5. Query staleTime: 30s (fast-changing) / 5min (slow-changing)</p>
            </div>
          </div>
          {/* API Pattern */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">API Pattern</h3>
            <pre className="text-xs font-mono text-muted-foreground bg-muted/50 p-4 rounded-xl overflow-x-auto">
{`// Fetch all
api.entities.Project.list('-created_date')

// Filter
api.entities.Task.filter({ project_id: id })

// Create
api.entities.Project.create({ name, client })

// Update
api.entities.Project.update(id, { status: 'completed' })

// Delete
api.entities.Project.delete(id)

// Cloud functions
api.functions.invoke('functionName', { params })`}
            </pre>
          </div>
        </div>
      </div>

      {/* Release History Card */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b dark:border-border">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Release History
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Recent changes and updates
          </p>
        </div>
        <div className="p-6 space-y-4">
          {changelog.slice(0, 5).map((release) => (
            <div key={release.version} className="border dark:border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono text-xs">v{release.version}</Badge>
                <span className="text-xs text-muted-foreground">{release.date}</span>
              </div>
              <h3 className="font-medium text-sm text-foreground mb-2">{release.title}</h3>
              <ul className="space-y-1.5">
                {release.changes.map((change, i) => {
                  const config = changeTypeConfig[change.type] || changeTypeConfig.feature;
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge className={`${config.color} text-[10px] px-1.5 py-0 flex-shrink-0 mt-0.5 border-0`}>
                        {config.label}
                      </Badge>
                      <span className="text-slate-600 dark:text-slate-300">{change.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

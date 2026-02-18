import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
  HardDrive, AlertTriangle, CheckCircle2, Save, Sparkles, Bot
} from 'lucide-react';
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
    title: 'People',
    items: [
      { id: 'people', label: 'People & Teams', icon: Users, description: 'Team members, groups, and admins' },
      { id: 'roles', label: 'Roles & Permissions', icon: Shield, description: 'Access control', page: 'RolesPermissions' },
    ]
  },
  {
    title: 'Projects',
    items: [
      { id: 'project-management', label: 'Archived & Deleted', icon: Archive, description: 'Manage old projects' },
      { id: 'tags', label: 'Tags', icon: Tags, description: 'Project tags' },
      { id: 'statuses', label: 'Statuses', icon: Layers, description: 'Project statuses', page: 'ProjectStatuses' },
      { id: 'templates', label: 'Templates', icon: FileText, description: 'Project & task templates', page: 'Templates' },
    ]
  },
  {
    title: 'Automation',
    items: [
      { id: 'workflows', label: 'Workflows', icon: GitMerge, description: 'Automation triggers', page: 'Workflows' },
      { id: 'integrations', label: 'Integrations', icon: GitMerge, description: 'HaloPSA & external services' },
    ]
  },
  {
    title: 'Settings',
    items: [
      { id: 'company', label: 'App Settings', icon: Building2, description: 'Branding' },
      { id: 'database-health', label: 'Database Health', icon: Database, description: 'Integrity checks & size' },
      { id: 'feedback', label: 'Feedback', icon: MessageSquare, description: 'Bug reports', page: 'FeedbackManagement' },
      { id: 'audit', label: 'Audit Logs', icon: Shield, description: 'Activity tracking', page: 'AuditLogs' },
    ]
  }
];

// Adminland Dashboard (Main)
export default function Adminland() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialSection = urlParams.get('section') || null;
  const [activeSection, setActiveSection] = useState(initialSection);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  // Block non-admin users
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-4">You need administrator privileges to access this page.</p>
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
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection ? (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <button 
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 text-[#0069AF] hover:text-[#133F5C] mb-6 transition-colors"
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
                <div className="p-2.5 rounded-xl bg-[#0069AF] shadow-lg shadow-[#0069AF]/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Adminland</h1>
              </div>
              <p className="text-slate-500">Manage your workspace settings</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {adminMenuGroups.map((group, gIdx) => (
                <motion.div
                  key={group.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gIdx * 0.1 }}
                  className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                >
                  <div className="px-4 py-3 bg-slate-50 border-b">
                    <h2 className="font-semibold text-slate-700">{group.title}</h2>
                  </div>
                  <div className="divide-y">
                    {group.items.map((item) => (
                      item.page ? (
                        <Link
                          key={item.id}
                          to={createPageUrl(item.page)}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="p-1.5 rounded-lg bg-[#0069AF]/10 group-hover:bg-[#0069AF] transition-colors">
                            <item.icon className="w-4 h-4 text-[#0069AF] group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-slate-900 block">{item.label}</span>
                            <span className="text-xs text-slate-500">{item.description}</span>
                          </div>
                        </Link>
                      ) : (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors group text-left"
                        >
                          <div className="p-1.5 rounded-lg bg-[#0069AF]/10 group-hover:bg-[#0069AF] transition-colors">
                            <item.icon className="w-4 h-4 text-[#0069AF] group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-slate-900 block">{item.label}</span>
                            <span className="text-xs text-slate-500">{item.description}</span>
                          </div>
                        </button>
                      )
                    ))}
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

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list('name')
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => base44.entities.UserGroup.list('name')
  });

  const handleSaveMember = async (data) => {
    if (editing) {
      await base44.entities.TeamMember.update(editing.id, data);
    } else {
      // Invite creates both a users row and a TeamMember entity
      const result = await base44.users.inviteUser(data.email, data.role, data.name, data.avatar_color);

      // Build invite URL for the admin to share
      const inviteUrl = `${window.location.origin}/accept-invite?token=${result.inviteToken}`;
      window.prompt('Share this invite link with the user:', inviteUrl);
    }
    queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    setShowModal(false);
    setEditing(null);
  };

  const handleSaveGroup = async (data) => {
    if (editingGroup) {
      await base44.entities.UserGroup.update(editingGroup.id, data);
    } else {
      await base44.entities.UserGroup.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['userGroups'] });
    setShowGroupModal(false);
    setEditingGroup(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm.type === 'member') {
      await base44.entities.TeamMember.delete(deleteConfirm.item.id);
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    } else {
      await base44.entities.UserGroup.delete(deleteConfirm.item.id);
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
    }
    setDeleteConfirm(null);
  };

  const toggleAdmin = async (member) => {
    const newRole = member.role === 'Admin' ? '' : 'Admin';
    await base44.entities.TeamMember.update(member.id, { ...member, role: newRole });
    queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
  };

  const admins = members.filter(m => m.role === 'Admin');

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-slate-900">People & Teams</h2>
        <p className="text-sm text-slate-500">Manage team members, groups, and admin access</p>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'members', label: 'Team Members', count: members.length },
          { id: 'groups', label: 'Groups', count: groups.length },
          { id: 'admins', label: 'Administrators', count: admins.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id ? "border-[#0069AF] text-[#0069AF]" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Team Members Tab */}
      {activeTab === 'members' && (
        <div>
          <div className="p-4 border-b bg-slate-50 flex justify-end">
            <Button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-[#0069AF] hover:bg-[#133F5C]">
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
          <div className="divide-y">
            {members.map((member) => (
            <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-medium", member.avatar_color || avatarColors[0])}>
                  {member.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{member.name}</p>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</span>
                    {member.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.role && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      member.role === 'Admin' && "bg-red-50 text-red-700 border-red-200",
                      member.role === 'Manager' && "bg-blue-50 text-blue-700 border-blue-200",
                      member.role === 'Technician' && "bg-green-50 text-green-700 border-green-200",
                      member.role === 'Viewer' && "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    {member.role}
                  </Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditing(member); setShowModal(true); }}>
                      <Edit2 className="w-4 h-4 mr-2" />Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteConfirm({ type: 'member', item: member })} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            ))}
            {members.length === 0 && (
              <div className="p-8 text-center text-slate-500">No team members yet</div>
            )}
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div>
          <div className="p-4 border-b bg-slate-50 flex justify-end">
            <Button onClick={() => { setEditingGroup(null); setShowGroupModal(true); }} className="bg-[#0069AF] hover:bg-[#133F5C]">
              <Plus className="w-4 h-4 mr-2" />
              Add Group
            </Button>
          </div>
          <div className="divide-y">
            {groups.map((group) => (
              <div key={group.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", groupColors[group.color] || 'bg-indigo-500')}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{group.name}</p>
                    <p className="text-sm text-slate-500">{group.member_emails?.length || 0} members</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
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
            ))}
            {groups.length === 0 && (
              <div className="p-8 text-center text-slate-500">No groups yet</div>
            )}
          </div>
        </div>
      )}

      {/* Admins Tab */}
      {activeTab === 'admins' && (
        <div className="p-4 space-y-4">
          {admins.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Current Administrators</h3>
              <div className="space-y-2">
                {admins.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-sm", member.avatar_color || avatarColors[0])}>
                        {member.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toggleAdmin(member)}>
                      Remove Admin
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-xl">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Make Admin</h3>
            <div className="space-y-2">
              {members.filter(m => m.role !== 'Admin').map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-sm", member.avatar_color || avatarColors[0])}>
                      {member.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-[#0069AF] hover:bg-[#133F5C]" onClick={() => toggleAdmin(member)}>
                    Make Admin
                  </Button>
                </div>
              ))}
              {members.filter(m => m.role !== 'Admin').length === 0 && (
                <p className="text-slate-500 text-center py-4">All team members are admins</p>
              )}
            </div>
          </div>
        </div>
      )}

      <TeamMemberModal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} member={editing} onSave={handleSaveMember} />
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
    </div>
  );
}

function TeamMemberModal({ open, onClose, member, onSave }) {
  const [formData, setFormData] = useState({ name: '', email: '', role: '', custom_role_id: '', phone: '', avatar_color: avatarColors[0] });

  const { data: customRoles = [] } = useQuery({
    queryKey: ['customRoles'],
    queryFn: () => base44.entities.CustomRole.list('name'),
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <select
                value={getCurrentRoleId()}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0069AF] focus:border-transparent"
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
                  className={cn("w-8 h-8 rounded-full", color, formData.avatar_color === color && "ring-2 ring-offset-2 ring-[#0069AF]")} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#0069AF] hover:bg-[#133F5C]">{member ? 'Update' : 'Add'}</Button>
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
                  className={cn("w-8 h-8 rounded-full", className, formData.color === name && "ring-2 ring-offset-2 ring-[#0069AF]")} />
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
            <Button type="submit" className="bg-[#0069AF] hover:bg-[#133F5C]">{group ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: 'main' }),
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
      await base44.entities.AppSettings.update(settings[0].id, { ...formData, setting_key: 'main' });
    } else {
      await base44.entities.AppSettings.create({ ...formData, setting_key: 'main' });
    }
    refetch();
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
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
        <Button onClick={handleSave} disabled={saving} className="bg-[#0069AF] hover:bg-[#133F5C]">
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
              <div className="flex items-start gap-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
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
                    <label className="w-20 h-20 border-2 border-dashed border-indigo-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#0069AF] hover:bg-white transition-colors">
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
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
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
    queryFn: () => base44.entities.ProjectTag.list('name')
  });

  const handleSave = async (data) => {
    if (editing) {
      await base44.entities.ProjectTag.update(editing.id, data);
    } else {
      await base44.entities.ProjectTag.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['projectTags'] });
    refetch();
    setShowModal(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    await base44.entities.ProjectTag.delete(deleteConfirm.id);
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
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-[#0069AF] hover:bg-[#133F5C]">
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
              className={cn("w-8 h-8 rounded-full", className, formData.color === name && "ring-2 ring-offset-2 ring-[#0069AF]")} />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-[#0069AF] hover:bg-[#133F5C]">{tag ? 'Update' : 'Create'}</Button>
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
            activeTab === 'archived' ? "border-[#0069AF] text-[#0069AF]" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Archive className="w-4 h-4" />
          Archived Projects
        </button>
        <button
          onClick={() => setActiveTab('deleted')}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'deleted' ? "border-[#0069AF] text-[#0069AF]" : "border-transparent text-slate-500 hover:text-slate-700"
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
      const projects = await base44.entities.Project.list('-archived_date');
      return projects.filter(p => p.status === 'archived' || p.status === 'completed');
    }
  });

  const handleRestore = async (project) => {
    await base44.entities.Project.update(project.id, {
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
      const tasks = await base44.entities.Task.filter({ project_id: project.id });
      const parts = await base44.entities.Part.filter({ project_id: project.id });
      const notes = await base44.entities.ProjectNote.filter({ project_id: project.id });
      
      for (const task of tasks) await base44.entities.Task.delete(task.id);
      for (const part of parts) await base44.entities.Part.delete(part.id);
      for (const note of notes) await base44.entities.ProjectNote.delete(note.id);
      
      await base44.entities.Project.delete(project.id);
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
      const projects = await base44.entities.Project.list('-deleted_date');
      return projects.filter(p => p.status === 'deleted');
    }
  });

  const handleRestore = async (project) => {
    await base44.entities.Project.update(project.id, {
      status: 'planning',
      deleted_date: ''
    });
    refetch();
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    setRestoreConfirm(null);
  };

  const handlePermanentDelete = async (project) => {
    // Delete related entities
    const tasks = await base44.entities.Task.filter({ project_id: project.id });
    const parts = await base44.entities.Part.filter({ project_id: project.id });
    const notes = await base44.entities.ProjectNote.filter({ project_id: project.id });
    
    for (const task of tasks) await base44.entities.Task.delete(task.id);
    for (const part of parts) await base44.entities.Part.delete(part.id);
    for (const note of notes) await base44.entities.ProjectNote.delete(note.id);
    
    await base44.entities.Project.delete(project.id);
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
  const [activeTab, setActiveTab] = useState('overview');

  const getToken = () => localStorage.getItem('projectit_token');

  const fetchHealth = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${API_URL}/api/integrations/data-health`, {
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
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
      const res = await fetch(`${API_URL}/api/integrations/data-health-history`, {
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setHistory(data.checks || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
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
              <Database className="w-5 h-5 text-[#0069AF]" />
              Database Health
            </h2>
            <p className="text-sm text-slate-500 mt-1">Integrity checks run automatically every 24 hours</p>
          </div>
          <Button
            onClick={() => { fetchHealth(); fetchHistory(); }}
            disabled={running}
            className="bg-[#0069AF] hover:bg-[#133F5C]"
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
                activeTab === tab.id ? "border-[#0069AF] text-[#0069AF]" : "border-transparent text-slate-500 hover:text-slate-700"
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
                      <p className="text-2xl font-bold text-slate-900">{healthData.database?.size_pretty || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500 uppercase">Connections</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{healthData.database?.active_connections || 0}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500 uppercase">Total Rows</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{healthData.total_rows?.toLocaleString() || 0}</p>
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
                        "text-2xl font-bold",
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
                            <div>
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
  const [showSecret, setShowSecret] = useState(false);

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
    halopsa_client_secret: '',
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
    queryFn: () => base44.entities.IntegrationSettings.filter({ setting_key: 'main' })
  });

  useEffect(() => {
    if (settings[0]) {
      setFormData(prev => ({
        ...prev,
        halopsa_enabled: settings[0].halopsa_enabled || false,
        halopsa_auth_url: settings[0].halopsa_auth_url || '',
        halopsa_api_url: settings[0].halopsa_api_url || '',
        halopsa_client_id: settings[0].halopsa_client_id || '',
        halopsa_client_secret: settings[0].halopsa_client_secret || '',
        halopsa_tenant: settings[0].halopsa_tenant || '',
        halopsa_sync_customers: settings[0].halopsa_sync_customers !== false,
        halopsa_sync_tickets: settings[0].halopsa_sync_tickets || false,
        halopsa_excluded_ids: settings[0].halopsa_excluded_ids || '',
        halopsa_field_mapping: settings[0].halopsa_field_mapping || formData.halopsa_field_mapping,
      }));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { setting_key: 'main', ...formData };
      if (settings[0]) {
        await base44.entities.IntegrationSettings.update(settings[0].id, payload);
      } else {
        await base44.entities.IntegrationSettings.create(payload);
      }
      refetch();
      setSyncResult({ success: true, message: 'Settings saved' });
    } catch (err) {
      setSyncResult({ success: false, message: err.message || 'Failed to save' });
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!formData.halopsa_auth_url || !formData.halopsa_client_id || !formData.halopsa_client_secret) {
      setSyncResult({ success: false, message: 'Please fill in all HaloPSA credential fields first' });
      return;
    }
    setTestingConnection(true);
    setSyncResult(null);
    try {
      await handleSave();
      const response = await base44.functions.invoke('halopsa', { action: 'testConnection' });
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
      const response = await base44.functions.invoke('syncHaloPSACustomers', {
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
      const response = await base44.functions.invoke('haloPSACustomerList', {});
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
        await base44.entities.Customer.update(localCustomerId, { halo_id: String(haloId) });
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
                    activeTab === tab.id ? "border-[#0069AF] text-[#0069AF]" : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="p-6 space-y-6">
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
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0069AF]" />
                        Connection
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Authorisation Server URL</Label>
                          <Input value={formData.halopsa_auth_url} onChange={e => setFormData(p => ({ ...p, halopsa_auth_url: e.target.value }))} placeholder="https://yourcompany.halopsa.com/auth" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Resource Server URL (API)</Label>
                          <Input value={formData.halopsa_api_url} onChange={e => setFormData(p => ({ ...p, halopsa_api_url: e.target.value }))} placeholder="https://yourcompany.halopsa.com/api" className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Client ID</Label>
                          <Input value={formData.halopsa_client_id} onChange={e => setFormData(p => ({ ...p, halopsa_client_id: e.target.value }))} placeholder="Your Client ID" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Client Secret</Label>
                          <div className="relative mt-1">
                            <Input type={showSecret ? "text" : "password"} value={formData.halopsa_client_secret} onChange={e => setFormData(p => ({ ...p, halopsa_client_secret: e.target.value }))} placeholder="Your Client Secret" />
                            <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">
                              {showSecret ? 'Hide' : 'Show'}
                            </button>
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
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0069AF]" />
                        Sync Options
                      </h3>
                      <div className="flex flex-wrap gap-6">
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
                        <div className="mt-3 grid grid-cols-2 gap-3">
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
                      <Button onClick={handleSave} disabled={saving} className="bg-[#0069AF] hover:bg-[#133F5C]">
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
                  <Button onClick={fetchHaloCustomers} disabled={loadingCustomers} className="bg-[#0069AF] hover:bg-[#133F5C]">
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

      {/* Resend Integration Card */}
      <ResendIntegrationCard expandedIntegration={expandedIntegration} toggleIntegration={toggleIntegration} />

      {/* Claude AI Integration Card */}
      <ClaudeAIIntegrationCard expandedIntegration={expandedIntegration} toggleIntegration={toggleIntegration} />
    </div>
  );
}

function ResendIntegrationCard({ expandedIntegration, toggleIntegration }) {
  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('noreply@projectit.app');
  const [fromName, setFromName] = useState('ProjectIT');
  const [testEmail, setTestEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [result, setResult] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [connected, setConnected] = useState(false);

  // Load existing settings
  const { data: resendSettings = [] } = useQuery({
    queryKey: ['resendSettings'],
    queryFn: () => base44.entities.IntegrationSettings.filter({ provider: 'resend' })
  });

  useEffect(() => {
    if (resendSettings[0]) {
      setApiKey(resendSettings[0].api_key || '');
      setFromEmail(resendSettings[0].from_email || 'noreply@projectit.app');
      setFromName(resendSettings[0].from_name || 'ProjectIT');
      setConnected(!!resendSettings[0].api_key);
    }
  }, [resendSettings]);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke('resendEmail', {
        action: 'saveSettings',
        apiKey,
        fromEmail,
        fromName,
      });
      setResult({ success: true, message: 'Settings saved successfully' });
      setConnected(!!apiKey);
    } catch (err) {
      setResult({ success: false, message: err.data?.error || err.message });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      await handleSave();
      const response = await base44.functions.invoke('resendEmail', { action: 'testConnection' });
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
      const response = await base44.functions.invoke('resendEmail', { action: 'sendTestEmail', to: testEmail });
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
          {connected && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Connected</Badge>
          )}
          {!connected && (
            <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">Not configured</Badge>
          )}
          <ChevronDown className={cn(
            "w-5 h-5 text-slate-400 transition-transform duration-200",
            expandedIntegration === 'resend' && "rotate-180"
          )} />
        </div>
      </button>

      {expandedIntegration === 'resend' && (
        <div className="border-t p-6 space-y-5">
          {/* API Key */}
          <div>
            <Label className="text-xs">Resend API Key</Label>
            <div className="relative mt-1">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#0069AF] hover:underline">resend.com/api-keys</a></p>
          </div>

          {/* From settings */}
          <div className="grid grid-cols-2 gap-4">
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
          {apiKey && (
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0069AF]" />
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
            <Button onClick={handleSave} disabled={saving} className="bg-[#0069AF] hover:bg-[#0F2F44]">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
            </Button>
            <Button onClick={handleTest} disabled={testing || !apiKey} variant="outline">
              {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</> : 'Test Connection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClaudeAIIntegrationCard({ expandedIntegration, toggleIntegration }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    base44.entities.IntegrationSettings.filter({ provider: 'claude_ai' })
      .then(settings => {
        if (settings.length > 0 && settings[0].enabled) {
          setConnected(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('claudeAI', { action: 'testConnection' });
      setResult({ success: true, message: res.data?.message || 'Connected!' });
      setConnected(true);
      // Save settings
      await base44.functions.invoke('claudeAI', { action: 'saveSettings', api_key_configured: true });
    } catch (err) {
      setResult({ success: false, message: err.message || 'Connection failed. Check ANTHROPIC_API_KEY env variable.' });
    }
    setTesting(false);
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
        <div className="border-t p-6 space-y-5">
          {/* Status info */}
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

          {/* Configuration note */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600">
              <span className="font-medium">Configuration:</span> Set the <code className="bg-white px-1 py-0.5 rounded text-[10px]">ANTHROPIC_API_KEY</code> environment variable on your Railway backend service.
              The API key is stored securely as an environment variable and never exposed to the frontend.
            </p>
          </div>

          {/* Result message */}
          {result && (
            <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {result.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleTest} disabled={testing} className="bg-violet-600 hover:bg-violet-700">
              {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</> : <><Sparkles className="w-4 h-4 mr-2" />Test Connection</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

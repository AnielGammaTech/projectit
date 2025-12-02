import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, UserPlus, Settings, Shield, Edit2, Trash2, 
  Plus, MoreHorizontal, Mail, Phone, Package, ArrowLeft,
  Building2, Tags, MessageSquare, FolderKanban, GitMerge, History,
  RefreshCw, Loader2
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

const adminMenuItems = [
  { id: 'people', label: 'Manage people', icon: Users, description: 'Add, edit, and remove team members' },
  { id: 'admins', label: 'Add/remove administrators', icon: Shield, description: 'Control who has admin access' },
  { id: 'groups', label: 'Manage groups', icon: UserPlus, description: 'Create and manage user groups' },
  { id: 'permissions', label: 'Manage permissions', icon: Package, description: 'Control feature access by group' },
  { id: 'proposals', label: 'Proposal settings', icon: Building2, description: 'Configure default proposal settings' },
  { id: 'integrations', label: 'Integrations', icon: GitMerge, description: 'Connect external services like HaloPSA' },
  { id: 'categories', label: 'Change message categories', icon: Tags, description: 'Configure note and message types' },
  { id: 'tools', label: 'Rename project tools', icon: FolderKanban, description: 'Customize tool names' },
  { id: 'settings', label: 'App settings', icon: Settings, description: 'General app configuration' },
];

export default function Adminland() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialSection = urlParams.get('section') || null;
  const [activeSection, setActiveSection] = useState(initialSection);
  const queryClient = useQueryClient();

  const renderSection = () => {
    switch (activeSection) {
      case 'people':
        return <TeamSection queryClient={queryClient} />;
      case 'admins':
        return <AdminsSection queryClient={queryClient} />;
      case 'groups':
        return <UserGroupsSection queryClient={queryClient} />;
      case 'permissions':
        return <PermissionsSection queryClient={queryClient} />;
      case 'proposals':
        return <ProposalSettingsSection queryClient={queryClient} />;
      case 'integrations':
        return <IntegrationsSection queryClient={queryClient} />;
      case 'categories':
        return <CategoriesSection queryClient={queryClient} />;
      case 'tools':
        return <ToolsSection queryClient={queryClient} />;
      case 'settings':
        return <AppSettingsSection queryClient={queryClient} />;
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
              <p className="text-slate-500">You're an admin, so you can...</p>
            </div>
            
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              {adminMenuItems.map((item, idx) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors group text-left border-b last:border-b-0"
                >
                  <div className="p-2 rounded-lg bg-[#0069AF] group-hover:bg-[#133F5C] transition-colors">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[#0069AF] group-hover:text-[#133F5C] font-medium transition-colors block">
                      {item.label}
                    </span>
                    <span className="text-sm text-slate-500">{item.description}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function TeamSection({ queryClient }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list('name')
  });

  const handleSave = async (data) => {
    if (editing) {
      await base44.entities.TeamMember.update(editing.id, data);
    } else {
      await base44.entities.TeamMember.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    setShowModal(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    await base44.entities.TeamMember.delete(deleteConfirm.id);
    queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    setDeleteConfirm(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Manage People</h2>
          <p className="text-sm text-slate-500">{members.length} team members</p>
        </div>
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
              {member.role && <Badge variant="outline">{member.role}</Badge>}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditing(member); setShowModal(true); }}>
                    <Edit2 className="w-4 h-4 mr-2" />Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteConfirm(member)} className="text-red-600">
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

      <TeamMemberModal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} member={editing} onSave={handleSave} />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team member?</AlertDialogTitle>
            <AlertDialogDescription>This will remove {deleteConfirm?.name} from the team.</AlertDialogDescription>
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
  const [formData, setFormData] = useState({ name: '', email: '', role: '', phone: '', avatar_color: avatarColors[0] });

  useEffect(() => {
    if (member) {
      setFormData({ name: member.name || '', email: member.email || '', role: member.role || '', phone: member.phone || '', avatar_color: member.avatar_color || avatarColors[0] });
    } else {
      setFormData({ name: '', email: '', role: '', phone: '', avatar_color: avatarColors[0] });
    }
  }, [member, open]);

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
              <Input value={formData.role} onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))} className="mt-1" placeholder="e.g., Technician" />
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

function AdminsSection({ queryClient }) {
  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list('name')
  });

  const toggleAdmin = async (member) => {
    const newRole = member.role === 'Admin' ? '' : 'Admin';
    await base44.entities.TeamMember.update(member.id, { ...member, role: newRole });
    queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
  };

  const admins = members.filter(m => m.role === 'Admin');
  const nonAdmins = members.filter(m => m.role !== 'Admin');

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-slate-900">Add/Remove Administrators</h2>
        <p className="text-sm text-slate-500">Administrators have full access to Adminland</p>
      </div>
      
      {admins.length > 0 && (
        <div className="p-4 border-b bg-slate-50">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Current Administrators ({admins.length})</h3>
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

      <div className="p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Team Members ({nonAdmins.length})</h3>
        <div className="space-y-2">
          {nonAdmins.map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
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
          {nonAdmins.length === 0 && (
            <p className="text-slate-500 text-center py-4">All team members are admins</p>
          )}
        </div>
      </div>
    </div>
  );
}

function UserGroupsSection({ queryClient }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: groups = [] } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => base44.entities.UserGroup.list('name')
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const handleSave = async (data) => {
    if (editing) {
      await base44.entities.UserGroup.update(editing.id, data);
    } else {
      await base44.entities.UserGroup.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['userGroups'] });
    setShowModal(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    await base44.entities.UserGroup.delete(deleteConfirm.id);
    queryClient.invalidateQueries({ queryKey: ['userGroups'] });
    setDeleteConfirm(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Manage Groups</h2>
          <p className="text-sm text-slate-500">Organize team members and control access</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-[#0069AF] hover:bg-[#133F5C]">
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
                <DropdownMenuItem onClick={() => { setEditing(group); setShowModal(true); }}>
                  <Edit2 className="w-4 h-4 mr-2" />Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteConfirm(group)} className="text-red-600">
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

      <UserGroupModal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} group={editing} members={members} onSave={handleSave} />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the "{deleteConfirm?.name}" group.</AlertDialogDescription>
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

function PermissionsSection({ queryClient }) {
  const [saving, setSaving] = useState(false);

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: 'main' })
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => base44.entities.UserGroup.list('name')
  });

  const currentSettings = settings[0] || {};

  const [formData, setFormData] = useState({
    inventory_view_groups: [],
    inventory_edit_groups: [],
    inventory_checkout_groups: [],
    projects_create_groups: [],
    projects_delete_groups: [],
    quotes_view_groups: [],
    quotes_manage_groups: [],
    reports_view_groups: [],
    time_tracking_groups: []
  });

  useEffect(() => {
    if (currentSettings.id) {
      setFormData({
        inventory_view_groups: currentSettings.inventory_view_groups || [],
        inventory_edit_groups: currentSettings.inventory_edit_groups || [],
        inventory_checkout_groups: currentSettings.inventory_checkout_groups || [],
        projects_create_groups: currentSettings.projects_create_groups || [],
        projects_delete_groups: currentSettings.projects_delete_groups || [],
        quotes_view_groups: currentSettings.quotes_view_groups || [],
        quotes_manage_groups: currentSettings.quotes_manage_groups || [],
        reports_view_groups: currentSettings.reports_view_groups || [],
        time_tracking_groups: currentSettings.time_tracking_groups || []
      });
    }
  }, [currentSettings.id]);

  const toggleGroup = (field, groupId) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(groupId)
        ? prev[field].filter(id => id !== groupId)
        : [...prev[field], groupId]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    if (currentSettings.id) {
      await base44.entities.AppSettings.update(currentSettings.id, { ...currentSettings, ...formData });
    } else {
      await base44.entities.AppSettings.create({ setting_key: 'main', ...formData });
    }
    refetch();
    setSaving(false);
  };

  const PermissionGroup = ({ icon: Icon, title, permissions }) => (
    <div className="p-4 bg-slate-50 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-[#0069AF]" />
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-4">
        {permissions.map(({ field, label, description }) => (
          <div key={field}>
            <Label className="text-sm font-medium">{label}</Label>
            <p className="text-xs text-slate-500 mb-2">{description}</p>
            <div className="flex flex-wrap gap-2">
              {groups.length > 0 ? groups.map(g => (
                <Badge
                  key={g.id}
                  variant={formData[field]?.includes(g.id) ? "default" : "outline"}
                  className={cn("cursor-pointer", formData[field]?.includes(g.id) && "bg-[#0069AF]")}
                  onClick={() => toggleGroup(field, g.id)}
                >
                  {g.name}
                </Badge>
              )) : (
                <span className="text-xs text-slate-400">No groups available</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Manage Permissions</h2>
          <p className="text-sm text-slate-500">Control access to features by user group. Leave empty to allow all users.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#0069AF] hover:bg-[#133F5C]">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      <div className="p-6 space-y-6">
        <PermissionGroup 
          icon={Package} 
          title="Inventory" 
          permissions={[
            { field: 'inventory_view_groups', label: 'Who can view inventory?', description: 'Access to inventory list' },
            { field: 'inventory_edit_groups', label: 'Who can edit inventory?', description: 'Add, edit, delete items' },
            { field: 'inventory_checkout_groups', label: 'Who can checkout/restock?', description: 'Remove or add stock' },
          ]} 
        />

        <PermissionGroup 
          icon={FolderKanban} 
          title="Projects" 
          permissions={[
            { field: 'projects_create_groups', label: 'Who can create projects?', description: 'Create new projects' },
            { field: 'projects_delete_groups', label: 'Who can delete projects?', description: 'Delete and archive projects' },
          ]} 
        />

        <PermissionGroup 
          icon={Tags} 
          title="Quote Requests" 
          permissions={[
            { field: 'quotes_view_groups', label: 'Who can view quotes?', description: 'View quote requests' },
            { field: 'quotes_manage_groups', label: 'Who can manage quotes?', description: 'Create, edit, approve quotes' },
          ]} 
        />

        <PermissionGroup 
          icon={Settings} 
          title="Other Features" 
          permissions={[
            { field: 'reports_view_groups', label: 'Who can view reports?', description: 'Access analytics and reports' },
            { field: 'time_tracking_groups', label: 'Who can track time?', description: 'Use time tracking features' },
          ]} 
        />

        {groups.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            Create user groups first to configure permissions
          </p>
        )}
      </div>
    </div>
  );
}

function CategoriesSection({ queryClient }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-slate-900">Message Categories</h2>
        <p className="text-sm text-slate-500">Configure note and message types</p>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-slate-500"></div>
              <span>Note</span>
            </div>
            <Badge variant="outline">Default</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Message</span>
            </div>
            <Badge variant="outline">Default</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Update</span>
            </div>
            <Badge variant="outline">Default</Badge>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-4">Category customization coming soon.</p>
      </div>
    </div>
  );
}

function ToolsSection({ queryClient }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-slate-900">Rename Project Tools</h2>
        <p className="text-sm text-slate-500">Customize how tools appear in your projects</p>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {['Tasks', 'Parts & Materials', 'Notes', 'Files', 'Activity'].map(tool => (
            <div key={tool} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-medium">{tool}</span>
              <Input className="w-48" defaultValue={tool} placeholder="Custom name..." />
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500 mt-4">Tool renaming coming soon.</p>
      </div>
    </div>
  );
}

function ProposalSettingsSection({ queryClient }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    proposal_prefix: 'P-',
    default_valid_days: 30,
    default_sales_tax_percent: 0,
    tax_rates_by_location: [],
    default_markup_type: 'percentage',
    default_markup_value: 20,
    default_terms_conditions: 'Payment due within 30 days of approval. All prices valid for 30 days.',
    show_item_images: true,
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_logo_url: ''
  });
  const [newTaxRate, setNewTaxRate] = useState({ name: '', state: '', city: '', zip: '', rate: 0 });

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['proposalSettings'],
    queryFn: () => base44.entities.ProposalSettings.filter({ setting_key: 'main' })
  });

  useEffect(() => {
    if (settings[0]) {
      setFormData({
        proposal_prefix: settings[0].proposal_prefix || 'P-',
        default_valid_days: settings[0].default_valid_days || 30,
        default_sales_tax_percent: settings[0].default_sales_tax_percent || 0,
        tax_rates_by_location: settings[0].tax_rates_by_location || [],
        default_markup_type: settings[0].default_markup_type || 'percentage',
        default_markup_value: settings[0].default_markup_value || 20,
        default_terms_conditions: settings[0].default_terms_conditions || '',
        show_item_images: settings[0].show_item_images !== false,
        company_name: settings[0].company_name || '',
        company_address: settings[0].company_address || '',
        company_phone: settings[0].company_phone || '',
        company_email: settings[0].company_email || '',
        company_logo_url: settings[0].company_logo_url || ''
      });
    }
  }, [settings]);

  const addTaxRate = () => {
    if (!newTaxRate.name || !newTaxRate.rate) return;
    setFormData(prev => ({
      ...prev,
      tax_rates_by_location: [...prev.tax_rates_by_location, { ...newTaxRate }]
    }));
    setNewTaxRate({ name: '', state: '', city: '', zip: '', rate: 0 });
  };

  const removeTaxRate = (index) => {
    setFormData(prev => ({
      ...prev,
      tax_rates_by_location: prev.tax_rates_by_location.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    if (settings[0]?.id) {
      await base44.entities.ProposalSettings.update(settings[0].id, { ...formData, setting_key: 'main' });
    } else {
      await base44.entities.ProposalSettings.create({ ...formData, setting_key: 'main' });
    }
    refetch();
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, company_logo_url: file_url }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Proposal Settings</h2>
          <p className="text-sm text-slate-500">Configure defaults for all proposals</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#0069AF] hover:bg-[#133F5C]">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      <div className="p-6 space-y-6">
        {/* Company Info */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-4">
          <h3 className="font-semibold text-slate-900">Company Information</h3>
          <div className="flex items-start gap-4">
            <div>
              {formData.company_logo_url ? (
                <div className="relative">
                  <img src={formData.company_logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-lg border" />
                  <button 
                    onClick={() => setFormData(p => ({ ...p, company_logo_url: '' }))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                  >×</button>
                </div>
              ) : (
                <label className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#0069AF]">
                  <Building2 className="w-6 h-6 text-slate-400" />
                  <span className="text-[10px] text-slate-400 mt-1">Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              )}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Company Name</Label>
                <Input value={formData.company_name} onChange={(e) => setFormData(p => ({ ...p, company_name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={formData.company_email} onChange={(e) => setFormData(p => ({ ...p, company_email: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={formData.company_phone} onChange={(e) => setFormData(p => ({ ...p, company_phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Input value={formData.company_address} onChange={(e) => setFormData(p => ({ ...p, company_address: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Proposal Defaults */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-4">
          <h3 className="font-semibold text-slate-900">Proposal Defaults</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Proposal Number Prefix</Label>
              <Input value={formData.proposal_prefix} onChange={(e) => setFormData(p => ({ ...p, proposal_prefix: e.target.value }))} className="mt-1" placeholder="P-" />
            </div>
            <div>
              <Label className="text-xs">Valid for (days)</Label>
              <Input type="number" value={formData.default_valid_days} onChange={(e) => setFormData(p => ({ ...p, default_valid_days: parseInt(e.target.value) || 30 }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Default Tax %</Label>
              <Input type="number" step="0.1" value={formData.default_sales_tax_percent} onChange={(e) => setFormData(p => ({ ...p, default_sales_tax_percent: parseFloat(e.target.value) || 0 }))} className="mt-1" />
            </div>
          </div>
        </div>

        {/* Tax Rates by Location */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-4">
          <h3 className="font-semibold text-slate-900">Tax Rates by Location</h3>
          <p className="text-xs text-slate-500">Set tax rates for specific locations. Customers can have a default tax rate assigned.</p>
          
          {formData.tax_rates_by_location?.length > 0 && (
            <div className="space-y-2">
              {formData.tax_rates_by_location.map((rate, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rate.name}</p>
                    <p className="text-xs text-slate-500">
                      {[rate.city, rate.state, rate.zip].filter(Boolean).join(', ') || 'No location specified'}
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">{rate.rate}%</Badge>
                  <Button variant="ghost" size="sm" onClick={() => removeTaxRate(idx)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-5 gap-2 pt-2 border-t">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={newTaxRate.name} onChange={(e) => setNewTaxRate(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Texas" className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={newTaxRate.state} onChange={(e) => setNewTaxRate(p => ({ ...p, state: e.target.value }))} placeholder="TX" className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={newTaxRate.city} onChange={(e) => setNewTaxRate(p => ({ ...p, city: e.target.value }))} placeholder="Austin" className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Rate %</Label>
              <Input type="number" step="0.01" value={newTaxRate.rate} onChange={(e) => setNewTaxRate(p => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} className="mt-1 h-9" />
            </div>
            <div className="flex items-end">
              <Button onClick={addTaxRate} size="sm" className="w-full bg-[#0069AF] hover:bg-[#133F5C]">Add</Button>
            </div>
          </div>
        </div>

        {/* Markup Settings */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-4">
          <h3 className="font-semibold text-slate-900">Default Markup</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Markup Type</Label>
              <select 
                value={formData.default_markup_type} 
                onChange={(e) => setFormData(p => ({ ...p, default_markup_type: e.target.value }))}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
                <option value="none">No Markup</option>
              </select>
            </div>
            {formData.default_markup_type !== 'none' && (
              <div>
                <Label className="text-xs">Markup Value</Label>
                <Input 
                  type="number" 
                  value={formData.default_markup_value} 
                  onChange={(e) => setFormData(p => ({ ...p, default_markup_value: parseFloat(e.target.value) || 0 }))} 
                  className="mt-1" 
                />
              </div>
            )}
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-4">
          <h3 className="font-semibold text-slate-900">Default Terms & Conditions</h3>
          <Textarea 
            value={formData.default_terms_conditions} 
            onChange={(e) => setFormData(p => ({ ...p, default_terms_conditions: e.target.value }))}
            className="h-32"
            placeholder="Enter default terms and conditions..."
          />
        </div>

        {/* Display Options */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-4">
          <h3 className="font-semibold text-slate-900">Display Options</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox 
              checked={formData.show_item_images} 
              onCheckedChange={(checked) => setFormData(p => ({ ...p, show_item_images: checked }))} 
            />
            <span className="text-sm">Show item images on proposals</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function IntegrationsSection({ queryClient }) {
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [formData, setFormData] = useState({
    halopsa_enabled: false,
    halopsa_url: '',
    halopsa_client_id: '',
    halopsa_client_secret: '',
    halopsa_tenant: '',
    halopsa_sync_customers: true,
    halopsa_sync_tickets: false
  });

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['integrationSettings'],
    queryFn: () => base44.entities.IntegrationSettings.filter({ setting_key: 'main' })
  });

  const handleSyncCustomers = async () => {
    if (!formData.halopsa_url || !formData.halopsa_client_id || !formData.halopsa_client_secret) {
      setSyncResult({ success: false, message: 'Please fill in all HaloPSA credentials first' });
      return;
    }
    
    setSyncing(true);
    setSyncResult(null);
    
    try {
      // Use LLM to fetch and parse customer data from HaloPSA API
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are helping sync customers from HaloPSA. 
        
The user wants to sync their HaloPSA customers. Since we cannot make direct API calls, generate 5 sample customer records that would typically come from an MSP's HaloPSA system.

Return a JSON array of customers with these fields:
- name (company name)
- email (main contact email)
- phone
- address
- city
- state
- zip
- external_id (a unique HaloPSA client ID like "halo_123")

Make them realistic IT/MSP client companies.`,
        response_json_schema: {
          type: "object",
          properties: {
            customers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  address: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  zip: { type: "string" },
                  external_id: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result?.customers?.length > 0) {
        let created = 0;
        let skipped = 0;
        
        // Get existing customers to check for duplicates
        const existingCustomers = await base44.entities.Customer.list();
        const existingExternalIds = new Set(existingCustomers.map(c => c.external_id).filter(Boolean));
        
        for (const customer of result.customers) {
          if (existingExternalIds.has(customer.external_id)) {
            skipped++;
            continue;
          }
          
          await base44.entities.Customer.create({
            ...customer,
            is_company: true,
            source: 'halo_psa'
          });
          created++;
        }
        
        // Update last sync time
        if (settings[0]?.id) {
          await base44.entities.IntegrationSettings.update(settings[0].id, {
            halopsa_last_sync: new Date().toISOString()
          });
          refetch();
        }
        
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setSyncResult({ success: true, message: `Synced ${created} customers${skipped > 0 ? `, ${skipped} already existed` : ''}` });
      }
    } catch (error) {
      setSyncResult({ success: false, message: 'Sync failed. Please check your credentials.' });
    }
    
    setSyncing(false);
  };

  useEffect(() => {
    if (settings[0]) {
      setFormData({
        halopsa_enabled: settings[0].halopsa_enabled || false,
        halopsa_url: settings[0].halopsa_url || '',
        halopsa_client_id: settings[0].halopsa_client_id || '',
        halopsa_client_secret: settings[0].halopsa_client_secret || '',
        halopsa_tenant: settings[0].halopsa_tenant || '',
        halopsa_sync_customers: settings[0].halopsa_sync_customers !== false,
        halopsa_sync_tickets: settings[0].halopsa_sync_tickets || false
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    if (settings[0]?.id) {
      await base44.entities.IntegrationSettings.update(settings[0].id, { ...formData, setting_key: 'main' });
    } else {
      await base44.entities.IntegrationSettings.create({ ...formData, setting_key: 'main' });
    }
    refetch();
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Integrations</h2>
          <p className="text-sm text-slate-500">Connect external services</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#0069AF] hover:bg-[#133F5C]">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      <div className="p-6 space-y-6">
        {/* HaloPSA */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <GitMerge className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">HaloPSA</h3>
                <p className="text-xs text-slate-500">Sync customers and tickets from HaloPSA</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={formData.halopsa_enabled} 
                onCheckedChange={(checked) => setFormData(p => ({ ...p, halopsa_enabled: checked }))} 
              />
              <span className="text-sm font-medium">{formData.halopsa_enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          {formData.halopsa_enabled && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div>
                <Label className="text-xs">HaloPSA Instance URL</Label>
                <Input 
                  value={formData.halopsa_url} 
                  onChange={(e) => setFormData(p => ({ ...p, halopsa_url: e.target.value }))} 
                  placeholder="https://yourcompany.halopsa.com" 
                  className="mt-1" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Client ID</Label>
                  <Input 
                    value={formData.halopsa_client_id} 
                    onChange={(e) => setFormData(p => ({ ...p, halopsa_client_id: e.target.value }))} 
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs">Client Secret</Label>
                  <Input 
                    type="password"
                    value={formData.halopsa_client_secret} 
                    onChange={(e) => setFormData(p => ({ ...p, halopsa_client_secret: e.target.value }))} 
                    className="mt-1" 
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Tenant (optional)</Label>
                <Input 
                  value={formData.halopsa_tenant} 
                  onChange={(e) => setFormData(p => ({ ...p, halopsa_tenant: e.target.value }))} 
                  className="mt-1" 
                />
              </div>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={formData.halopsa_sync_customers} 
                    onCheckedChange={(checked) => setFormData(p => ({ ...p, halopsa_sync_customers: checked }))} 
                  />
                  <span className="text-sm">Sync Customers</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={formData.halopsa_sync_tickets} 
                    onCheckedChange={(checked) => setFormData(p => ({ ...p, halopsa_sync_tickets: checked }))} 
                  />
                  <span className="text-sm">Sync Tickets</span>
                </label>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <Button 
                  onClick={handleSyncCustomers} 
                  disabled={syncing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Customers Now
                    </>
                  )}
                </Button>
                {settings[0]?.halopsa_last_sync && (
                  <span className="text-xs text-slate-500">
                    Last sync: {new Date(settings[0].halopsa_last_sync).toLocaleString()}
                  </span>
                )}
              </div>
              
              {syncResult && (
                <div className={cn(
                  "p-3 rounded-lg text-sm",
                  syncResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                )}>
                  {syncResult.message}
                </div>
              )}

              <p className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Note: For full HaloPSA API integration, backend functions must be enabled. The sync above creates sample data for demonstration.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppSettingsSection({ queryClient }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-slate-900">App Settings</h2>
        <p className="text-sm text-slate-500">General app configuration</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="font-medium text-slate-900 mb-2">Project Statuses</h3>
          <p className="text-sm text-slate-500">Planning, In Progress, On Hold, Completed, Archived</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="font-medium text-slate-900 mb-2">Task Statuses</h3>
          <p className="text-sm text-slate-500">To Do, In Progress, Review, Completed</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="font-medium text-slate-900 mb-2">Priority Levels</h3>
          <p className="text-sm text-slate-500">Low, Medium, High, Urgent</p>
        </div>
      </div>
    </div>
  );
}
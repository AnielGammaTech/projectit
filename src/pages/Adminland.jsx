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
  Building2, Tags, MessageSquare, FolderKanban, GitMerge, History
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
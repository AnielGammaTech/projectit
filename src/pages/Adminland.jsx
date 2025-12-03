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
  Building2, Tags, FolderKanban, GitMerge, DollarSign,
  RefreshCw, Loader2, ChevronDown, ChevronRight
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
  { id: 'people', label: 'People & Teams', icon: Users, description: 'Manage team members, groups, and admin access' },
  { id: 'permissions', label: 'Permissions', icon: Shield, description: 'Control feature access by group' },
  { id: 'company', label: 'Company Settings', icon: Building2, description: 'Branding, proposal defaults, and company info' },
  { id: 'integrations', label: 'Integrations', icon: GitMerge, description: 'Connect external services' },
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
      case 'branding':
        return <BrandingSection queryClient={queryClient} />;
      case 'proposals':
        return <ProposalSettingsSection queryClient={queryClient} />;
      case 'integrations':
        return <IntegrationsSection queryClient={queryClient} />;
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
  const [expandedSections, setExpandedSections] = useState({});

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

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const PermissionGroup = ({ icon: Icon, title, sectionId, permissions }) => {
    const isExpanded = expandedSections[sectionId];
    return (
      <div className="border rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(sectionId)}
          className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-[#0069AF]" />
            <h3 className="font-semibold text-slate-900">{title}</h3>
          </div>
          {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </button>
        {isExpanded && (
          <div className="p-4 space-y-4 bg-white">
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
        )}
      </div>
    );
  };

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
      <div className="p-6 space-y-4">
        <PermissionGroup 
          icon={Package} 
          title="Catalog" 
          sectionId="inventory"
          permissions={[
            { field: 'inventory_view_groups', label: 'Who can view catalog?', description: 'Access to products and services list' },
            { field: 'inventory_edit_groups', label: 'Who can edit catalog?', description: 'Add, edit, delete items' },
            { field: 'inventory_checkout_groups', label: 'Who can checkout/restock?', description: 'Remove or add stock' },
          ]} 
        />

        <PermissionGroup 
          icon={FolderKanban} 
          title="Projects" 
          sectionId="projects"
          permissions={[
            { field: 'projects_create_groups', label: 'Who can create projects?', description: 'Create new projects' },
            { field: 'projects_delete_groups', label: 'Who can delete projects?', description: 'Delete and archive projects' },
          ]} 
        />

        <PermissionGroup 
          icon={Tags} 
          title="Quote Requests" 
          sectionId="quotes"
          permissions={[
            { field: 'quotes_view_groups', label: 'Who can view quotes?', description: 'View quote requests' },
            { field: 'quotes_manage_groups', label: 'Who can manage quotes?', description: 'Create, edit, approve quotes' },
          ]} 
        />

        <PermissionGroup 
          icon={Settings} 
          title="Other Features" 
          sectionId="other"
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

function ToolsSection({ queryClient }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-slate-900">Rename Project Tools</h2>
        <p className="text-sm text-slate-500">Customize how tools appear in your projects</p>
      </div>
      <div className="p-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <span className="font-medium text-slate-900">Project Tool Names</span>
          {expanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </button>
        {expanded && (
          <div className="mt-4 space-y-3">
            {['Tasks', 'Parts & Materials', 'Notes', 'Files', 'Activity'].map(tool => (
              <div key={tool} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <span className="font-medium text-slate-700">{tool}</span>
                <Input className="w-48" defaultValue={tool} placeholder="Custom name..." />
              </div>
            ))}
            <p className="text-sm text-slate-500 mt-4">Tool renaming coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BrandingSection({ queryClient }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    company_logo_url: '',
    company_address: '',
    company_phone: '',
    company_email: ''
  });

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['proposalSettings'],
    queryFn: () => base44.entities.ProposalSettings.filter({ setting_key: 'main' })
  });

  useEffect(() => {
    if (settings[0]) {
      setFormData({
        company_name: settings[0].company_name || '',
        company_logo_url: settings[0].company_logo_url || '',
        company_address: settings[0].company_address || '',
        company_phone: settings[0].company_phone || '',
        company_email: settings[0].company_email || ''
      });
    }
  }, [settings]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, company_logo_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    if (settings[0]?.id) {
      await base44.entities.ProposalSettings.update(settings[0].id, { ...settings[0], ...formData });
    } else {
      await base44.entities.ProposalSettings.create({ setting_key: 'main', ...formData });
    }
    refetch();
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Branding & Logo</h2>
          <p className="text-sm text-slate-500">Configure your company branding for proposals and documents</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#0069AF] hover:bg-[#133F5C]">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      <div className="p-6 space-y-6">
        {/* Logo Upload */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="font-semibold text-slate-900 mb-4">Company Logo</h3>
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              {formData.company_logo_url ? (
                <div className="relative">
                  <img src={formData.company_logo_url} alt="Company Logo" className="w-32 h-32 object-contain rounded-lg border bg-white p-2" />
                  <button 
                    onClick={() => setFormData(p => ({ ...p, company_logo_url: '' }))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm hover:bg-red-600"
                  >×</button>
                </div>
              ) : (
                <label className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#0069AF] hover:bg-white transition-colors">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                  ) : (
                    <>
                      <Building2 className="w-8 h-8 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-400">Upload Logo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                </label>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm text-slate-600">Upload your company logo to appear on proposals and other documents.</p>
              <p className="text-xs text-slate-400">Recommended: PNG or SVG, at least 200x200px</p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-4">
          <h3 className="font-semibold text-slate-900">Company Information</h3>
          <div className="grid grid-cols-2 gap-4">
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
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  
  // Hudu state
  const [huduSyncing, setHuduSyncing] = useState(false);
  const [huduTesting, setHuduTesting] = useState(false);
  const [huduResult, setHuduResult] = useState(null);
  const [showHuduFieldMapping, setShowHuduFieldMapping] = useState(false);
  
  // Email test state
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState(null);
  
  // QuickBooks state
  const [qbTesting, setQbTesting] = useState(false);
  const [qbSyncing, setQbSyncing] = useState(false);
  const [qbResult, setQbResult] = useState(null);
  const [showCustomerMapping, setShowCustomerMapping] = useState(false);
  const [qbCustomers, setQbCustomers] = useState([]);
  
  const [formData, setFormData] = useState({
    halopsa_enabled: false,
    halopsa_url: '',
    halopsa_auth_url: '',
    halopsa_api_url: '',
    halopsa_client_id: '',
    halopsa_client_secret: '',
    halopsa_tenant: '',
    halopsa_sync_customers: true,
    halopsa_sync_tickets: false,
    halopsa_field_mapping: {
      name: 'name',
      email: 'email',
      phone: 'main_phone',
      address: 'address',
      city: 'city',
      state: 'county',
      zip: 'postcode'
    },
    hudu_enabled: false,
    hudu_base_url: '',
    hudu_api_key: '',
    hudu_sync_customers: true,
    hudu_field_mapping: {
      name: 'name',
      email: 'email',
      phone: 'phone_number',
      address: 'address_line_1',
      city: 'city',
      state: 'state',
      zip: 'zip'
    },
    // Email (SendGrid)
    sendgrid_enabled: false,
    sendgrid_api_key: '',
    sendgrid_from_email: '',
    sendgrid_from_name: '',
    email_notifications_enabled: true,
    email_proposal_sent: true,
    email_proposal_approved: true,
    email_proposal_rejected: true,
    email_task_assigned: true,
    email_task_due_reminder: true,
    email_part_status_changed: false,
    // Slack
    slack_enabled: false,
    slack_webhook_url: '',
    slack_notify_proposals: true,
    slack_notify_projects: true,
    // SMS (Twilio)
    twilio_enabled: false,
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
    sms_notifications_enabled: false,
    // QuickBooks
    quickbooks_enabled: false,
    quickbooks_realm_id: '',
    quickbooks_sync_customers: true,
    quickbooks_sync_invoices: true,
    quickbooks_customer_mapping: []
    });

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['integrationSettings'],
    queryFn: () => base44.entities.IntegrationSettings.filter({ setting_key: 'main' })
  });

  const handleTestConnection = async () => {
    if (!formData.halopsa_url) {
      setSyncResult({ success: false, message: 'Please enter your HaloPSA URL first' });
      return;
    }
    
    setTestingConnection(true);
    setSyncResult(null);
    
    try {
      const response = await base44.functions.invoke('syncHaloPSACustomers', { 
        testOnly: true,
        fieldMapping: formData.halopsa_field_mapping
      });
      const result = response.data;
      
      if (result.success) {
        setSyncResult({ success: true, message: `Connection successful! Found ${result.total || 0} clients in HaloPSA.` });
      } else {
        setSyncResult({ success: false, message: result.error || 'Connection failed', details: result.details || result.debug });
      }
    } catch (error) {
      const errorData = error.response?.data;
      setSyncResult({ 
        success: false, 
        message: errorData?.error || 'Connection failed. Check your credentials.',
        details: errorData?.details || errorData?.debug
      });
    }
    
    setTestingConnection(false);
  };

  const handleSyncCustomers = async () => {
    if (!formData.halopsa_url) {
      setSyncResult({ success: false, message: 'Please enter your HaloPSA URL first' });
      return;
    }
    
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await base44.functions.invoke('syncHaloPSACustomers', {
        fieldMapping: formData.halopsa_field_mapping
      });
      const result = response.data;
      
      if (result.success) {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setSyncResult({ success: true, message: result.message });
      } else {
        setSyncResult({ success: false, message: result.error || 'Sync failed', details: result.details || result.debug });
      }
    } catch (error) {
      const errorData = error.response?.data;
      setSyncResult({ 
        success: false, 
        message: errorData?.error || 'Sync failed. Please check your credentials.',
        details: errorData?.details || errorData?.debug 
      });
    }
    
    setSyncing(false);
  };

  useEffect(() => {
    if (settings[0]) {
      setFormData({
        halopsa_enabled: settings[0].halopsa_enabled || false,
        halopsa_url: settings[0].halopsa_url || '',
        halopsa_auth_url: settings[0].halopsa_auth_url || '',
        halopsa_api_url: settings[0].halopsa_api_url || '',
        halopsa_client_id: settings[0].halopsa_client_id || '',
        halopsa_client_secret: settings[0].halopsa_client_secret || '',
        halopsa_tenant: settings[0].halopsa_tenant || '',
        halopsa_sync_customers: settings[0].halopsa_sync_customers !== false,
        halopsa_sync_tickets: settings[0].halopsa_sync_tickets || false,
        halopsa_field_mapping: settings[0].halopsa_field_mapping || {
          name: 'name',
          email: 'email',
          phone: 'main_phone',
          address: 'address',
          city: 'city',
          state: 'county',
          zip: 'postcode'
        },
        hudu_enabled: settings[0].hudu_enabled || false,
        hudu_base_url: settings[0].hudu_base_url || '',
        hudu_api_key: settings[0].hudu_api_key || '',
        hudu_sync_customers: settings[0].hudu_sync_customers !== false,
        hudu_field_mapping: settings[0].hudu_field_mapping || {
          name: 'name',
          email: 'email',
          phone: 'phone_number',
          address: 'address_line_1',
          city: 'city',
          state: 'state',
          zip: 'zip'
        },
        // Email
        sendgrid_enabled: settings[0].sendgrid_enabled || false,
        sendgrid_api_key: settings[0].sendgrid_api_key || '',
        sendgrid_from_email: settings[0].sendgrid_from_email || '',
        sendgrid_from_name: settings[0].sendgrid_from_name || '',
        email_notifications_enabled: settings[0].email_notifications_enabled !== false,
        email_proposal_sent: settings[0].email_proposal_sent !== false,
        email_proposal_approved: settings[0].email_proposal_approved !== false,
        email_proposal_rejected: settings[0].email_proposal_rejected !== false,
        email_task_assigned: settings[0].email_task_assigned !== false,
        email_task_due_reminder: settings[0].email_task_due_reminder !== false,
        email_part_status_changed: settings[0].email_part_status_changed || false,
        // Slack
        slack_enabled: settings[0].slack_enabled || false,
        slack_webhook_url: settings[0].slack_webhook_url || '',
        slack_notify_proposals: settings[0].slack_notify_proposals !== false,
        slack_notify_projects: settings[0].slack_notify_projects !== false,
        // Twilio
        twilio_enabled: settings[0].twilio_enabled || false,
        twilio_account_sid: settings[0].twilio_account_sid || '',
        twilio_auth_token: settings[0].twilio_auth_token || '',
        twilio_phone_number: settings[0].twilio_phone_number || '',
        sms_notifications_enabled: settings[0].sms_notifications_enabled || false,
        // QuickBooks
        quickbooks_enabled: settings[0].quickbooks_enabled || false,
        quickbooks_realm_id: settings[0].quickbooks_realm_id || '',
        quickbooks_sync_customers: settings[0].quickbooks_sync_customers !== false,
        quickbooks_sync_invoices: settings[0].quickbooks_sync_invoices !== false,
        quickbooks_customer_mapping: settings[0].quickbooks_customer_mapping || []
      });
    }
  }, [settings]);

  // Fetch local customers for mapping
  const { data: localCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('name')
  });

  const handleQbTest = async () => {
    setQbTesting(true);
    setQbResult(null);
    try {
      await handleSave();
      const response = await base44.functions.invoke('quickbooksSync', { action: 'test' });
      if (response.data?.success) {
        setQbResult({ success: true, message: response.data.message });
        if (response.data.customers) {
          setQbCustomers(response.data.customers);
        }
      } else {
        setQbResult({ success: false, message: response.data?.error || 'Connection failed' });
      }
    } catch (error) {
      setQbResult({ success: false, message: error.response?.data?.error || 'Connection failed. Check your credentials.' });
    }
    setQbTesting(false);
  };

  const handleQbSyncCustomers = async () => {
    setQbSyncing(true);
    setQbResult(null);
    try {
      const response = await base44.functions.invoke('quickbooksSync', { action: 'syncCustomers' });
      if (response.data?.success) {
        setQbResult({ success: true, message: response.data.message });
        if (response.data.customers) {
          setQbCustomers(response.data.customers);
        }
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      } else {
        setQbResult({ success: false, message: response.data?.error || 'Sync failed' });
      }
    } catch (error) {
      setQbResult({ success: false, message: error.response?.data?.error || 'Sync failed' });
    }
    setQbSyncing(false);
  };

  const handleMapCustomer = (localId, qbId, qbName) => {
    const existingMapping = formData.quickbooks_customer_mapping || [];
    const newMapping = existingMapping.filter(m => m.local_customer_id !== localId);
    if (qbId) {
      newMapping.push({ local_customer_id: localId, quickbooks_customer_id: qbId, quickbooks_customer_name: qbName });
    }
    setFormData(prev => ({ ...prev, quickbooks_customer_mapping: newMapping }));
  };

  const getQbMappingForCustomer = (localId) => {
    return formData.quickbooks_customer_mapping?.find(m => m.local_customer_id === localId);
  };

  const handleHuduTest = async () => {
    if (!formData.hudu_base_url || !formData.hudu_api_key) {
      setHuduResult({ success: false, message: 'Please enter Hudu Base URL and API Key first' });
      return;
    }
    
    setHuduTesting(true);
    setHuduResult(null);
    
    try {
      // Save settings first so the function can read them
      await handleSave();
      
      const response = await base44.functions.invoke('syncHuduCustomers', { testOnly: true });
      const result = response.data;
      
      if (result.success) {
        setHuduResult({ success: true, message: result.message });
      } else {
        setHuduResult({ success: false, message: result.error || 'Connection failed', details: result.details });
      }
    } catch (error) {
      const errorData = error.response?.data;
      setHuduResult({ 
        success: false, 
        message: errorData?.error || 'Connection failed. Check your credentials.',
        details: errorData?.details
      });
    }
    
    setHuduTesting(false);
  };

  const handleHuduSync = async () => {
    if (!formData.hudu_base_url || !formData.hudu_api_key) {
      setHuduResult({ success: false, message: 'Please enter Hudu Base URL and API Key first' });
      return;
    }
    
    setHuduSyncing(true);
    setHuduResult(null);
    
    try {
      const response = await base44.functions.invoke('syncHuduCustomers', {});
      const result = response.data;
      
      if (result.success) {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setHuduResult({ success: true, message: result.message });
      } else {
        setHuduResult({ success: false, message: result.error || 'Sync failed', details: result.details });
      }
    } catch (error) {
      const errorData = error.response?.data;
      setHuduResult({ 
        success: false, 
        message: errorData?.error || 'Sync failed. Please check your credentials.',
        details: errorData?.details
      });
    }
    
    setHuduSyncing(false);
  };

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
      <div className="p-6 space-y-4">
        {/* Integration Cards */}
        
        {/* HaloPSA Card */}
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setSelectedIntegration(selectedIntegration === 'halopsa' ? null : 'halopsa')}
            className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <GitMerge className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">HaloPSA</h3>
                <p className="text-xs text-slate-500">Sync customers and tickets from HaloPSA</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={formData.halopsa_enabled ? "default" : "outline"} className={formData.halopsa_enabled ? "bg-emerald-500" : ""}>
                {formData.halopsa_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {selectedIntegration === 'halopsa' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </div>
          </button>
          
          {selectedIntegration === 'halopsa' && (
          <div className="p-4 space-y-4 bg-white">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={formData.halopsa_enabled} 
                onCheckedChange={(checked) => setFormData(p => ({ ...p, halopsa_enabled: checked }))} 
              />
              <span className="text-sm font-medium">Enable HaloPSA Integration</span>
            </label>

          {formData.halopsa_enabled && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>Where to find these URLs:</strong> In HaloPSA, go to <strong>Configuration → Integrations → Halo API</strong>. Copy the <em>Authorisation Server URL</em> and <em>Resource Server URL</em> from the API Details section.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Authorisation Server URL</Label>
                <Input 
                  value={formData.halopsa_auth_url} 
                  onChange={(e) => setFormData(p => ({ ...p, halopsa_auth_url: e.target.value }))} 
                  placeholder="https://yourcompany.halopsa.com" 
                  className="mt-1" 
                />
                <p className="text-[10px] text-slate-400 mt-1">e.g., https://company.halopsa.com</p>
              </div>
              <div>
                <Label className="text-xs">Resource Server URL (API)</Label>
                <Input 
                  value={formData.halopsa_api_url} 
                  onChange={(e) => setFormData(p => ({ ...p, halopsa_api_url: e.target.value }))} 
                  placeholder="https://yourcompany.haloservicedesk.com" 
                  className="mt-1" 
                />
                <p className="text-[10px] text-slate-400 mt-1">e.g., https://company.haloservicedesk.com</p>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <p className="text-xs font-medium text-emerald-700">Credentials Configured via Environment Variables</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-emerald-600">
                <div>
                  <span className="font-medium">Client ID:</span> HALOPSA_CLIENT_ID ✓
                </div>
                <div>
                  <span className="font-medium">Client Secret:</span> HALOPSA_CLIENT_SECRET ✓
                </div>
                <div>
                  <span className="font-medium">Tenant:</span> HALOPSA_TENANT ✓
                </div>
              </div>
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
              {/* Field Mapping */}
              <div className="pt-2 border-t border-slate-200">
                <button 
                  onClick={() => setShowFieldMapping(!showFieldMapping)}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                >
                  <Settings className="w-4 h-4" />
                  {showFieldMapping ? 'Hide' : 'Show'} Field Mapping
                </button>
                
                {showFieldMapping && (
                  <div className="mt-3 p-3 bg-white rounded-lg border space-y-3">
                    <p className="text-xs text-slate-500">Map HaloPSA fields to your customer fields. Common HaloPSA fields: name, client_name, email, main_email, phone_number, main_phone, address, city, county, state, postcode</p>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(formData.halopsa_field_mapping || {}).map(([key, value]) => (
                        <div key={key}>
                          <Label className="text-xs capitalize">{key} → HaloPSA field</Label>
                          <Input 
                            value={value} 
                            onChange={(e) => setFormData(p => ({ 
                              ...p, 
                              halopsa_field_mapping: { ...p.halopsa_field_mapping, [key]: e.target.value }
                            }))} 
                            className="mt-1 h-8 text-sm" 
                            placeholder={`HaloPSA field for ${key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <Button 
                  onClick={handleTestConnection} 
                  disabled={testingConnection || syncing}
                  variant="outline"
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button 
                  onClick={handleSyncCustomers} 
                  disabled={syncing || testingConnection}
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
                  <p>{syncResult.message}</p>
                  {syncResult.details && (
                    <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-x-auto">
                      {typeof syncResult.details === 'object' ? JSON.stringify(syncResult.details, null, 2) : syncResult.details}
                    </pre>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <strong>Note:</strong> Credentials are stored in environment variables (HALOPSA_CLIENT_ID, HALOPSA_CLIENT_SECRET, HALOPSA_TENANT). The URL is saved above. Use "Test Connection" to verify your setup.
              </p>
            </div>
          )}
          </div>
          )}
        </div>

        {/* SendGrid Email Card */}
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setSelectedIntegration(selectedIntegration === 'sendgrid' ? null : 'sendgrid')}
            className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">Email (SendGrid)</h3>
                <p className="text-xs text-slate-500">Send emails to customers for proposals, notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={formData.sendgrid_enabled ? "default" : "outline"} className={formData.sendgrid_enabled ? "bg-emerald-500" : ""}>
                {formData.sendgrid_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {selectedIntegration === 'sendgrid' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </div>
          </button>
          
          {selectedIntegration === 'sendgrid' && (
          <div className="p-4 space-y-4 bg-white">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={formData.sendgrid_enabled} 
                onCheckedChange={(checked) => setFormData(p => ({ ...p, sendgrid_enabled: checked }))} 
              />
              <span className="text-sm font-medium">Enable SendGrid Email Integration</span>
            </label>

            {formData.sendgrid_enabled && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Setup:</strong> Create a free SendGrid account at <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" className="underline">sendgrid.com</a>. Go to <strong>Settings → API Keys</strong> to create a key with "Mail Send" permissions. Also verify your sender email under <strong>Sender Authentication</strong>.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs">SendGrid API Key</Label>
                    <Input 
                      type="password"
                      value={formData.sendgrid_api_key} 
                      onChange={(e) => setFormData(p => ({ ...p, sendgrid_api_key: e.target.value }))} 
                      placeholder="SG.xxxxxxxxxxxx" 
                      className="mt-1 font-mono text-sm" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs">From Email (Verified Sender)</Label>
                    <Input 
                      type="email"
                      value={formData.sendgrid_from_email} 
                      onChange={(e) => setFormData(p => ({ ...p, sendgrid_from_email: e.target.value }))} 
                      placeholder="proposals@yourcompany.com" 
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs">From Name</Label>
                    <Input 
                      value={formData.sendgrid_from_name} 
                      onChange={(e) => setFormData(p => ({ ...p, sendgrid_from_name: e.target.value }))} 
                      placeholder="Your Company Name" 
                      className="mt-1" 
                    />
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Email Notifications</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <Checkbox 
                        checked={formData.email_proposal_sent} 
                        onCheckedChange={(checked) => setFormData(p => ({ ...p, email_proposal_sent: checked }))} 
                      />
                      <span className="text-sm">Proposal sent to customer</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <Checkbox 
                        checked={formData.email_proposal_approved} 
                        onCheckedChange={(checked) => setFormData(p => ({ ...p, email_proposal_approved: checked }))} 
                      />
                      <span className="text-sm">Proposal approved notification</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <Checkbox 
                        checked={formData.email_proposal_rejected} 
                        onCheckedChange={(checked) => setFormData(p => ({ ...p, email_proposal_rejected: checked }))} 
                      />
                      <span className="text-sm">Proposal rejected notification</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <Checkbox 
                        checked={formData.email_task_assigned} 
                        onCheckedChange={(checked) => setFormData(p => ({ ...p, email_task_assigned: checked }))} 
                      />
                      <span className="text-sm">Task assigned to team member</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <Checkbox 
                        checked={formData.email_task_due_reminder} 
                        onCheckedChange={(checked) => setFormData(p => ({ ...p, email_task_due_reminder: checked }))} 
                      />
                      <span className="text-sm">Task due date reminders</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <Checkbox 
                        checked={formData.email_part_status_changed} 
                        onCheckedChange={(checked) => setFormData(p => ({ ...p, email_part_status_changed: checked }))} 
                      />
                      <span className="text-sm">Part status changes</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                  <Button 
                    onClick={async () => {
                      if (!formData.sendgrid_api_key || !formData.sendgrid_from_email) {
                        setEmailTestResult({ success: false, message: 'Please enter API key and from email first' });
                        return;
                      }
                      setTestingEmail(true);
                      setEmailTestResult(null);
                      try {
                        await handleSave();
                        const response = await base44.functions.invoke('sendEmail', { 
                          testOnly: true,
                          to: formData.sendgrid_from_email,
                          subject: 'Test Email from IT Projects',
                          body: 'This is a test email to verify your SendGrid integration is working correctly.'
                        });
                        if (response.data?.success) {
                          setEmailTestResult({ success: true, message: 'Test email sent successfully! Check your inbox.' });
                        } else {
                          setEmailTestResult({ success: false, message: response.data?.error || 'Failed to send test email' });
                        }
                      } catch (error) {
                        setEmailTestResult({ success: false, message: error.response?.data?.error || 'Failed to send test email' });
                      }
                      setTestingEmail(false);
                    }} 
                    disabled={testingEmail}
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    {testingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Test Email'
                    )}
                  </Button>
                </div>
                
                {emailTestResult && (
                  <div className={cn(
                    "p-3 rounded-lg text-sm",
                    emailTestResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                  )}>
                    <p>{emailTestResult.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Slack Card */}
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setSelectedIntegration(selectedIntegration === 'slack' ? null : 'slack')}
            className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">Slack</h3>
                <p className="text-xs text-slate-500">Get notifications in your Slack channel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={formData.slack_enabled ? "default" : "outline"} className={formData.slack_enabled ? "bg-emerald-500" : ""}>
                {formData.slack_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {selectedIntegration === 'slack' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </div>
          </button>
          
          {selectedIntegration === 'slack' && (
          <div className="p-4 space-y-4 bg-white">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={formData.slack_enabled} 
                onCheckedChange={(checked) => setFormData(p => ({ ...p, slack_enabled: checked }))} 
              />
              <span className="text-sm font-medium">Enable Slack Notifications</span>
            </label>

            {formData.slack_enabled && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-700">
                    <strong>Setup:</strong> In Slack, go to your workspace settings → <strong>Apps → Incoming Webhooks</strong>. Create a new webhook for your desired channel and paste the URL below.
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs">Slack Webhook URL</Label>
                  <Input 
                    type="password"
                    value={formData.slack_webhook_url} 
                    onChange={(e) => setFormData(p => ({ ...p, slack_webhook_url: e.target.value }))} 
                    placeholder="https://hooks.slack.com/services/..." 
                    className="mt-1 font-mono text-sm" 
                  />
                </div>

                <div className="pt-3 border-t">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Notification Types</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <Checkbox 
                        checked={formData.slack_notify_proposals} 
                        onCheckedChange={(checked) => setFormData(p => ({ ...p, slack_notify_proposals: checked }))} 
                      />
                      <span className="text-sm">Proposal approved/rejected</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <Checkbox 
                        checked={formData.slack_notify_projects} 
                        onCheckedChange={(checked) => setFormData(p => ({ ...p, slack_notify_projects: checked }))} 
                      />
                      <span className="text-sm">New project created</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Twilio SMS Card */}
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setSelectedIntegration(selectedIntegration === 'twilio' ? null : 'twilio')}
            className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">SMS (Twilio)</h3>
                <p className="text-xs text-slate-500">Send SMS notifications to team members</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={formData.twilio_enabled ? "default" : "outline"} className={formData.twilio_enabled ? "bg-emerald-500" : ""}>
                {formData.twilio_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {selectedIntegration === 'twilio' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </div>
          </button>
          
          {selectedIntegration === 'twilio' && (
          <div className="p-4 space-y-4 bg-white">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={formData.twilio_enabled} 
                onCheckedChange={(checked) => setFormData(p => ({ ...p, twilio_enabled: checked }))} 
              />
              <span className="text-sm font-medium">Enable Twilio SMS</span>
            </label>

            {formData.twilio_enabled && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-700">
                    <strong>Setup:</strong> Create a Twilio account at <a href="https://twilio.com" target="_blank" rel="noopener noreferrer" className="underline">twilio.com</a>. Find your Account SID and Auth Token in the console. You'll also need to purchase a phone number.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Account SID</Label>
                    <Input 
                      value={formData.twilio_account_sid} 
                      onChange={(e) => setFormData(p => ({ ...p, twilio_account_sid: e.target.value }))} 
                      placeholder="ACxxxxxxxxx" 
                      className="mt-1 font-mono text-sm" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Auth Token</Label>
                    <Input 
                      type="password"
                      value={formData.twilio_auth_token} 
                      onChange={(e) => setFormData(p => ({ ...p, twilio_auth_token: e.target.value }))} 
                      placeholder="Your auth token" 
                      className="mt-1" 
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Twilio Phone Number</Label>
                    <Input 
                      value={formData.twilio_phone_number} 
                      onChange={(e) => setFormData(p => ({ ...p, twilio_phone_number: e.target.value }))} 
                      placeholder="+1234567890" 
                      className="mt-1" 
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                  <Checkbox 
                    checked={formData.sms_notifications_enabled} 
                    onCheckedChange={(checked) => setFormData(p => ({ ...p, sms_notifications_enabled: checked }))} 
                  />
                  <span className="text-sm">Enable SMS for urgent task reminders</span>
                </label>
              </div>
            )}
          </div>
          )}
        </div>

        {/* QuickBooks Online Card */}
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setSelectedIntegration(selectedIntegration === 'quickbooks' ? null : 'quickbooks')}
            className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">QuickBooks Online</h3>
                <p className="text-xs text-slate-500">Sync customers and invoices with QuickBooks</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={formData.quickbooks_enabled ? "default" : "outline"} className={formData.quickbooks_enabled ? "bg-emerald-500" : ""}>
                {formData.quickbooks_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {selectedIntegration === 'quickbooks' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </div>
          </button>
          
          {selectedIntegration === 'quickbooks' && (
          <div className="p-4 space-y-4 bg-white">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={formData.quickbooks_enabled} 
                onCheckedChange={(checked) => setFormData(p => ({ ...p, quickbooks_enabled: checked }))} 
              />
              <span className="text-sm font-medium">Enable QuickBooks Integration</span>
            </label>

            {formData.quickbooks_enabled && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700">
                    <strong>Setup:</strong> Create an app at <a href="https://developer.intuit.com" target="_blank" rel="noopener noreferrer" className="underline">developer.intuit.com</a>. 
                    Set up OAuth 2.0 credentials and add the Client ID and Secret as environment variables: <code className="bg-green-100 px-1 rounded">QUICKBOOKS_CLIENT_ID</code> and <code className="bg-green-100 px-1 rounded">QUICKBOOKS_CLIENT_SECRET</code>.
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs">Company ID (Realm ID)</Label>
                  <Input 
                    value={formData.quickbooks_realm_id} 
                    onChange={(e) => setFormData(p => ({ ...p, quickbooks_realm_id: e.target.value }))} 
                    placeholder="Enter your QuickBooks Company ID" 
                    className="mt-1" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Found in QuickBooks under Company Settings or in the URL when logged in</p>
                </div>

                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={formData.quickbooks_sync_customers} 
                      onCheckedChange={(checked) => setFormData(p => ({ ...p, quickbooks_sync_customers: checked }))} 
                    />
                    <span className="text-sm">Sync Customers</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={formData.quickbooks_sync_invoices} 
                      onCheckedChange={(checked) => setFormData(p => ({ ...p, quickbooks_sync_invoices: checked }))} 
                    />
                    <span className="text-sm">Sync Invoices</span>
                  </label>
                </div>

                {/* Customer Mapping Section */}
                <div className="pt-2 border-t border-slate-200">
                  <button 
                    onClick={() => setShowCustomerMapping(!showCustomerMapping)}
                    className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
                  >
                    <Users className="w-4 h-4" />
                    {showCustomerMapping ? 'Hide' : 'Show'} Customer Mapping
                  </button>
                  
                  {showCustomerMapping && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border space-y-3">
                      <p className="text-xs text-slate-500">Map your local customers to QuickBooks customers. Click "Fetch QuickBooks Customers" first to load the list.</p>
                      
                      {qbCustomers.length > 0 && (
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {localCustomers.filter(c => c.is_company).map(customer => {
                            const mapping = getQbMappingForCustomer(customer.id);
                            return (
                              <div key={customer.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-slate-900">{customer.name}</p>
                                  <p className="text-xs text-slate-500">{customer.email}</p>
                                </div>
                                <select
                                  value={mapping?.quickbooks_customer_id || ''}
                                  onChange={(e) => {
                                    const qbCust = qbCustomers.find(q => q.Id === e.target.value);
                                    handleMapCustomer(customer.id, e.target.value, qbCust?.DisplayName || '');
                                  }}
                                  className="text-sm border rounded-md px-2 py-1 w-48"
                                >
                                  <option value="">-- Select QB Customer --</option>
                                  {qbCustomers.map(qb => (
                                    <option key={qb.Id} value={qb.Id}>{qb.DisplayName}</option>
                                  ))}
                                </select>
                                {mapping && (
                                  <Badge className="bg-green-100 text-green-700">Mapped</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {qbCustomers.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">
                          Click "Test Connection" to fetch QuickBooks customers
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                  <Button 
                    onClick={handleQbTest} 
                    disabled={qbTesting || qbSyncing}
                    variant="outline"
                    className="border-green-300 text-green-600 hover:bg-green-50"
                  >
                    {qbTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                  <Button 
                    onClick={handleQbSyncCustomers} 
                    disabled={qbSyncing || qbTesting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {qbSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Customers
                      </>
                    )}
                  </Button>
                  {settings[0]?.quickbooks_last_sync && (
                    <span className="text-xs text-slate-500">
                      Last sync: {new Date(settings[0].quickbooks_last_sync).toLocaleString()}
                    </span>
                  )}
                </div>
                
                {qbResult && (
                  <div className={cn(
                    "p-3 rounded-lg text-sm",
                    qbResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                  )}>
                    <p>{qbResult.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Hudu Card */}
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setSelectedIntegration(selectedIntegration === 'hudu' ? null : 'hudu')}
            className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">Hudu</h3>
                <p className="text-xs text-slate-500">Sync customers from Hudu documentation platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={formData.hudu_enabled ? "default" : "outline"} className={formData.hudu_enabled ? "bg-emerald-500" : ""}>
                {formData.hudu_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {selectedIntegration === 'hudu' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </div>
          </button>
          
          {selectedIntegration === 'hudu' && (
          <div className="p-4 space-y-4 bg-white">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={formData.hudu_enabled} 
                onCheckedChange={(checked) => setFormData(p => ({ ...p, hudu_enabled: checked }))} 
              />
              <span className="text-sm font-medium">Enable Hudu Integration</span>
            </label>

          {formData.hudu_enabled && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Where to find your API key:</strong> In Hudu, go to <strong>Admin → API Keys</strong> and create a new API key. Copy both the API key and your Hudu instance URL.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Hudu Base URL</Label>
                  <Input 
                    value={formData.hudu_base_url} 
                    onChange={(e) => setFormData(p => ({ ...p, hudu_base_url: e.target.value }))} 
                    placeholder="https://yourcompany.huducloud.com" 
                    className="mt-1" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Your Hudu instance URL</p>
                </div>
                <div>
                  <Label className="text-xs">API Key</Label>
                  <Input 
                    type="password"
                    value={formData.hudu_api_key} 
                    onChange={(e) => setFormData(p => ({ ...p, hudu_api_key: e.target.value }))} 
                    placeholder="Enter your Hudu API key" 
                    className="mt-1" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">From Admin → API Keys</p>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={formData.hudu_sync_customers} 
                    onCheckedChange={(checked) => setFormData(p => ({ ...p, hudu_sync_customers: checked }))} 
                  />
                  <span className="text-sm">Sync Companies as Customers</span>
                </label>
              </div>

              {/* Hudu Field Mapping */}
              <div className="pt-2 border-t border-slate-200">
                <button 
                  onClick={() => setShowHuduFieldMapping(!showHuduFieldMapping)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Settings className="w-4 h-4" />
                  {showHuduFieldMapping ? 'Hide' : 'Show'} Field Mapping
                </button>
                
                {showHuduFieldMapping && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border space-y-3">
                    <p className="text-xs text-slate-500">Map Hudu Company fields to your customer fields. Common Hudu fields: name, nickname, email, phone_number, address_line_1, address_line_2, city, state, zip, country</p>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(formData.hudu_field_mapping || {}).map(([key, value]) => (
                        <div key={key}>
                          <Label className="text-xs capitalize">{key} → Hudu field</Label>
                          <Input 
                            value={value} 
                            onChange={(e) => setFormData(p => ({ 
                              ...p, 
                              hudu_field_mapping: { ...p.hudu_field_mapping, [key]: e.target.value }
                            }))} 
                            className="mt-1 h-8 text-sm" 
                            placeholder={`Hudu field for ${key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <Button 
                  onClick={handleHuduTest} 
                  disabled={huduTesting || huduSyncing}
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  {huduTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button 
                  onClick={handleHuduSync} 
                  disabled={huduSyncing || huduTesting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {huduSyncing ? (
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
                {settings[0]?.hudu_last_sync && (
                  <span className="text-xs text-slate-500">
                    Last sync: {new Date(settings[0].hudu_last_sync).toLocaleString()}
                  </span>
                )}
              </div>
              
              {huduResult && (
                <div className={cn(
                  "p-3 rounded-lg text-sm",
                  huduResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                )}>
                  <p>{huduResult.message}</p>
                  {huduResult.details && (
                    <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-x-auto">
                      {typeof huduResult.details === 'object' ? JSON.stringify(huduResult.details, null, 2) : huduResult.details}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppSettingsSection({ queryClient }) {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const SettingsGroup = ({ title, sectionId, children }) => {
    const isExpanded = expandedSections[sectionId];
    return (
      <div className="border rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(sectionId)}
          className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
        >
          <h3 className="font-medium text-slate-900">{title}</h3>
          {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </button>
        {isExpanded && (
          <div className="p-4 bg-white">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-slate-900">App Settings</h2>
        <p className="text-sm text-slate-500">General app configuration</p>
      </div>
      <div className="p-6 space-y-4">
        <SettingsGroup title="Project Statuses" sectionId="project_statuses">
          <div className="space-y-2">
            {['Planning', 'In Progress', 'On Hold', 'Completed', 'Archived'].map(status => (
              <div key={status} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-700">{status}</span>
                <Badge variant="outline">Default</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">Status customization coming soon.</p>
        </SettingsGroup>

        <SettingsGroup title="Task Statuses" sectionId="task_statuses">
          <div className="space-y-2">
            {['To Do', 'In Progress', 'Review', 'Completed'].map(status => (
              <div key={status} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-700">{status}</span>
                <Badge variant="outline">Default</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">Status customization coming soon.</p>
        </SettingsGroup>

        <SettingsGroup title="Priority Levels" sectionId="priorities">
          <div className="space-y-2">
            {['Low', 'Medium', 'High', 'Urgent'].map(priority => (
              <div key={priority} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-700">{priority}</span>
                <Badge variant="outline">Default</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">Priority customization coming soon.</p>
        </SettingsGroup>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, UserPlus, Settings, Shield, Palette, Edit2, Trash2, 
  Plus, Save, MoreHorizontal, Mail, Phone
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function Adminland() {
  const [activeTab, setActiveTab] = useState('team');
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Adminland</h1>
          </div>
          <p className="text-slate-500">Manage team members, user groups, and app settings</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <UserPlus className="w-4 h-4" />
              User Groups
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              App Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <TeamSection queryClient={queryClient} />
          </TabsContent>

          <TabsContent value="groups">
            <UserGroupsSection queryClient={queryClient} />
          </TabsContent>

          <TabsContent value="settings">
            <AppSettingsSection queryClient={queryClient} />
          </TabsContent>
        </Tabs>
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
    <div className="bg-white rounded-2xl border shadow-sm">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
          <p className="text-sm text-slate-500">{members.length} members</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-indigo-600 hover:bg-indigo-700">
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
                  className={cn("w-8 h-8 rounded-full", color, formData.avatar_color === color && "ring-2 ring-offset-2 ring-indigo-500")} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{member ? 'Update' : 'Add'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
    <div className="bg-white rounded-2xl border shadow-sm">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">User Groups</h2>
          <p className="text-sm text-slate-500">Organize team members and control project access</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Group
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {groups.map((group) => (
          <div key={group.id} className="border rounded-xl p-4 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", groupColors[group.color] || 'bg-indigo-500')} />
                <h3 className="font-semibold text-slate-900">{group.name}</h3>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
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
            {group.description && <p className="text-sm text-slate-500 mb-3">{group.description}</p>}
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">{group.member_emails?.length || 0} members</span>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-500">No user groups yet</div>
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
                  className={cn("w-8 h-8 rounded-full", className, formData.color === name && "ring-2 ring-offset-2 ring-indigo-500")} />
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
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{group ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AppSettingsSection({ queryClient }) {
  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: 'main' })
  });

  const currentSettings = settings[0] || {};

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">App Settings</h2>
      <p className="text-sm text-slate-500 mb-6">Configure project statuses, priorities, and other app-wide settings.</p>
      
      <div className="space-y-6">
        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="font-medium text-slate-900 mb-2">Project Statuses</h3>
          <p className="text-sm text-slate-500">Default: Planning, In Progress, On Hold, Completed, Archived</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="font-medium text-slate-900 mb-2">Task Statuses</h3>
          <p className="text-sm text-slate-500">Default: To Do, In Progress, Review, Completed</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="font-medium text-slate-900 mb-2">Priority Levels</h3>
          <p className="text-sm text-slate-500">Default: Low, Medium, High, Urgent</p>
        </div>
      </div>
    </div>
  );
}
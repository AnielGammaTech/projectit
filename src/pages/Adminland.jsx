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
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
  { id: 'roles', label: 'Roles & Permissions', icon: Shield, description: 'Custom roles and granular access control', page: 'RolesPermissions' },
  { id: 'workflows', label: 'Workflows', icon: GitMerge, description: 'Automate actions based on triggers', page: 'Workflows' },
  { id: 'templates', label: 'Email & Notification Templates', icon: Mail, description: 'Customize email templates with HTML and variables' },
  { id: 'company', label: 'Company Settings', icon: Building2, description: 'Branding, proposal defaults, and company info' },
  { id: 'integrations', label: 'Integrations', icon: GitMerge, description: 'Connect external services' },
  { id: 'audit', label: 'Audit Logs', icon: Shield, description: 'Track user actions and system changes', page: 'AuditLogs' },
];

export default function Adminland() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialSection = urlParams.get('section') || null;
  const [activeSection, setActiveSection] = useState(initialSection);
  const queryClient = useQueryClient();

  const renderSection = () => {
    switch (activeSection) {
      case 'people':
        return <PeopleSection queryClient={queryClient} />;
      case 'company':
        return <CompanySettingsSection queryClient={queryClient} />;
      case 'integrations':
        return <IntegrationsSection queryClient={queryClient} />;
      case 'templates':
        return <EmailTemplatesSection queryClient={queryClient} />;
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
                item.page ? (
                  <Link
                    key={item.id}
                    to={createPageUrl(item.page)}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
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
                    </motion.div>
                  </Link>
                ) : (
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
                )
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
      await base44.entities.TeamMember.create(data);
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
                  {member.role && <Badge variant="outline">{member.role}</Badge>}
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



// Consolidated Company Settings Section (combines Branding + Proposal Settings)
function CompanySettingsSection({ queryClient }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
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
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, company_logo_url: file_url }));
    setUploading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Company Settings</h2>
          <p className="text-sm text-slate-500">Branding, proposal defaults, and company info</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#0069AF] hover:bg-[#133F5C]">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'branding', label: 'Branding & Logo' },
          { id: 'proposals', label: 'Proposal Defaults' },
          { id: 'taxes', label: 'Tax Rates' }
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

      <div className="p-6 space-y-6">
        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <>
            <div className="p-4 bg-slate-50 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-4">Company Logo</h3>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  {formData.company_logo_url ? (
                    <div className="relative">
                      <img src={formData.company_logo_url} alt="Logo" className="w-32 h-32 object-contain rounded-lg border bg-white p-2" />
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
          </>
        )}

        {/* Proposals Tab */}
        {activeTab === 'proposals' && (
          <>
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
          </>
        )}

        {/* Tax Rates Tab */}
        {activeTab === 'taxes' && (
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
        )}
      </div>
    </div>
  );
}

// Email Templates Section
function EmailTemplatesSection({ queryClient }) {
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showVariables, setShowVariables] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'code', 'preview', 'split'

  const templateOptions = [
    { key: 'proposal_sent', name: 'Proposal Sent', description: 'When a proposal is emailed to customer' },
    { key: 'proposal_accepted', name: 'Proposal Accepted', description: 'When customer approves a proposal' },
    { key: 'proposal_rejected', name: 'Proposal Rejected', description: 'When customer rejects a proposal' },
    { key: 'task_assigned', name: 'Task Assigned', description: 'When a task is assigned to someone' },
    { key: 'task_due_reminder', name: 'Task Due Reminder', description: 'Reminder before task is due' },
    { key: 'task_overdue', name: 'Task Overdue', description: 'When a task becomes overdue' },
    { key: 'project_status_change', name: 'Project Status Change', description: 'When project status changes' },
    { key: 'part_received', name: 'Part Received', description: 'When a part is marked as received' },
    { key: 'part_installed', name: 'Part Installed', description: 'When a part is installed' },
    { key: 'invoice_created', name: 'Invoice Created', description: 'When an invoice is generated' },
    { key: 'payment_received', name: 'Payment Received', description: 'When payment is received' },
  ];

  const availableVariables = {
    proposal: ['{{proposal.number}}', '{{proposal.title}}', '{{proposal.total}}', '{{proposal.valid_until}}', '{{proposal.approval_link}}'],
    customer: ['{{customer.name}}', '{{customer.email}}', '{{customer.company}}', '{{customer.phone}}'],
    project: ['{{project.name}}', '{{project.status}}', '{{project.due_date}}', '{{project.progress}}'],
    task: ['{{task.title}}', '{{task.description}}', '{{task.due_date}}', '{{task.priority}}', '{{task.assignee}}'],
    part: ['{{part.name}}', '{{part.quantity}}', '{{part.status}}', '{{part.supplier}}'],
    company: ['{{company.name}}', '{{company.email}}', '{{company.phone}}', '{{company.address}}', '{{company.logo_url}}'],
    general: ['{{current_date}}', '{{current_time}}', '{{app_url}}'],
  };

  const { data: templates = [], refetch } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list()
  });

  const [formData, setFormData] = useState({
    template_key: '',
    name: '',
    subject: '',
    html_body: '',
    is_enabled: true
  });

  useEffect(() => {
    if (selectedTemplate) {
      const existing = templates.find(t => t.template_key === selectedTemplate);
      const defaultTemplate = templateOptions.find(t => t.key === selectedTemplate);
      if (existing) {
        setFormData({
          template_key: existing.template_key,
          name: existing.name,
          subject: existing.subject,
          html_body: existing.html_body,
          is_enabled: existing.is_enabled !== false
        });
      } else {
        setFormData({
          template_key: selectedTemplate,
          name: defaultTemplate?.name || '',
          subject: getDefaultSubject(selectedTemplate),
          html_body: getDefaultBodyForKey(selectedTemplate),
          is_enabled: true
        });
      }
    }
  }, [selectedTemplate, templates]);

  const getDefaultSubject = (key) => {
    const defaults = {
      proposal_sent: 'Proposal: {{proposal.title}}',
      proposal_accepted: 'Great news! Proposal {{proposal.number}} has been accepted',
      proposal_rejected: 'Proposal {{proposal.number}} was declined',
      task_assigned: 'New task assigned: {{task.title}}',
      task_due_reminder: 'Reminder: {{task.title}} is due {{task.due_date}}',
      task_overdue: 'Overdue: {{task.title}}',
      project_status_change: 'Project Update: {{project.name}}',
      part_received: 'Part Received: {{part.name}}',
      part_installed: 'Part Installed: {{part.name}}',
      invoice_created: 'Invoice Ready',
      payment_received: 'Payment Received - Thank you!'
    };
    return defaults[key] || '';
  };

  const getDefaultBody = (key) => {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0069AF; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .button { display: inline-block; background: #0069AF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{company.name}}</h1>
    </div>
    <div class="content">
      <p>Dear {{customer.name}},</p>
      <p>Your content goes here...</p>
      <p>Best regards,<br>{{company.name}}</p>
    </div>
    <div class="footer">
      {{company.address}} | {{company.phone}} | {{company.email}}
    </div>
  </div>
</body>
</html>`;
  };

  const handleSave = async () => {
    setSaving(true);
    const existing = templates.find(t => t.template_key === formData.template_key);
    if (existing) {
      await base44.entities.EmailTemplate.update(existing.id, formData);
    } else {
      await base44.entities.EmailTemplate.create(formData);
    }
    refetch();
    setSaving(false);
  };

  const insertVariable = (variable) => {
    setFormData(prev => ({
      ...prev,
      html_body: prev.html_body + variable
    }));
  };

  // Replace variables with sample data for preview
  const getPreviewHtml = () => {
    let html = formData.html_body || '';
    const sampleData = {
      '{{proposal.number}}': 'P-0042',
      '{{proposal.title}}': 'Network Infrastructure Upgrade',
      '{{proposal.total}}': '$12,500.00',
      '{{proposal.valid_until}}': 'December 15, 2025',
      '{{proposal.approval_link}}': '#',
      '{{customer.name}}': 'John Smith',
      '{{customer.email}}': 'john@example.com',
      '{{customer.company}}': 'Acme Corp',
      '{{customer.phone}}': '(555) 123-4567',
      '{{project.name}}': 'Office Renovation',
      '{{project.status}}': 'In Progress',
      '{{project.due_date}}': 'January 15, 2026',
      '{{project.progress}}': '65%',
      '{{task.title}}': 'Install Network Switches',
      '{{task.description}}': 'Install and configure 3 network switches',
      '{{task.due_date}}': 'December 10, 2025',
      '{{task.priority}}': 'High',
      '{{task.assignee}}': 'Mike Johnson',
      '{{part.name}}': 'Cisco Switch 24-Port',
      '{{part.quantity}}': '3',
      '{{part.status}}': 'Received',
      '{{part.supplier}}': 'Tech Distributors',
      '{{company.name}}': 'Your Company',
      '{{company.email}}': 'info@yourcompany.com',
      '{{company.phone}}': '(555) 987-6543',
      '{{company.address}}': '123 Business Ave, Suite 100',
      '{{company.logo_url}}': '',
      '{{current_date}}': new Date().toLocaleDateString(),
      '{{current_time}}': new Date().toLocaleTimeString(),
      '{{app_url}}': window.location.origin,
    };
    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    return html;
  };

  // Get pretty default body for proposal_accepted with celebration
  const getDefaultBodyForKey = (key) => {
    if (key === 'proposal_accepted') {
      return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f0fdf4; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .celebration { text-align: center; padding: 20px; }
    .celebration img { max-width: 200px; border-radius: 12px; }
    .content { padding: 30px; }
    .highlight-box { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e; }
    .details { background: #f8fafc; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .details-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-size: 14px; }
    .value { font-weight: 600; color: #1e293b; }
    .total { font-size: 24px; color: #22c55e; font-weight: bold; }
    .button { display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background: #f8fafc; }
    .confetti { font-size: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="confetti">🎉 🎊 🎉</div>
      <h1>Proposal Accepted!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Great news - your proposal has been approved!</p>
    </div>
    <div class="celebration">
      <img src="https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" alt="Celebration" />
    </div>
    <div class="content">
      <div class="highlight-box">
        <h2 style="margin: 0 0 10px 0; color: #166534;">✨ {{proposal.title}}</h2>
        <p style="margin: 0; color: #166534;">Proposal #{{proposal.number}} has been approved by {{customer.name}}</p>
      </div>
      
      <div class="details">
        <div class="details-row">
          <span class="label">Customer</span>
          <span class="value">{{customer.name}}</span>
        </div>
        <div class="details-row">
          <span class="label">Company</span>
          <span class="value">{{customer.company}}</span>
        </div>
        <div class="details-row">
          <span class="label">Approved On</span>
          <span class="value">{{current_date}}</span>
        </div>
        <div class="details-row">
          <span class="label">Total Amount</span>
          <span class="value total">{{proposal.total}}</span>
        </div>
      </div>

      <p>Time to celebrate! 🥳 The customer has signed off and you're ready to move forward with this project.</p>
      
      <center>
        <a href="{{app_url}}" class="button">View Proposal Details →</a>
      </center>
    </div>
    <div class="footer">
      <p>{{company.name}} | {{company.address}}</p>
      <p>{{company.phone}} | {{company.email}}</p>
    </div>
  </div>
</body>
</html>`;
    }
    return getDefaultBody(key);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-slate-900">Email & Notification Templates</h2>
        <p className="text-sm text-slate-500">Customize email templates with HTML and variables</p>
      </div>

      <div className="grid lg:grid-cols-4 divide-x">
        {/* Template List */}
        <div className="lg:col-span-1 p-4 bg-slate-50 max-h-[700px] overflow-y-auto">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Select Template</h3>
          <div className="space-y-1">
            {templateOptions.map((opt) => {
              const exists = templates.find(t => t.template_key === opt.key);
              return (
                <button
                  key={opt.key}
                  onClick={() => setSelectedTemplate(opt.key)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all",
                    selectedTemplate === opt.key 
                      ? "bg-[#0069AF] text-white" 
                      : "hover:bg-white"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{opt.name}</span>
                    {exists && (
                      <Badge className={cn("text-xs", selectedTemplate === opt.key ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700")}>
                        ✓
                      </Badge>
                    )}
                  </div>
                  <p className={cn("text-xs mt-0.5", selectedTemplate === opt.key ? "text-white/70" : "text-slate-500")}>
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-3 flex flex-col">
          {selectedTemplate ? (
            <>
              {/* Header */}
              <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold text-slate-900">{formData.name}</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={formData.is_enabled} 
                      onCheckedChange={(checked) => setFormData(p => ({ ...p, is_enabled: checked }))} 
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('code')}
                      className={cn("px-3 py-1.5 text-xs font-medium transition-colors", viewMode === 'code' ? "bg-[#0069AF] text-white" : "bg-white hover:bg-slate-100")}
                    >
                      Code
                    </button>
                    <button
                      onClick={() => setViewMode('split')}
                      className={cn("px-3 py-1.5 text-xs font-medium transition-colors border-x", viewMode === 'split' ? "bg-[#0069AF] text-white" : "bg-white hover:bg-slate-100")}
                    >
                      Split
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={cn("px-3 py-1.5 text-xs font-medium transition-colors", viewMode === 'preview' ? "bg-[#0069AF] text-white" : "bg-white hover:bg-slate-100")}
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-slate-500 w-16">Subject:</Label>
                  <Input 
                    value={formData.subject} 
                    onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))}
                    className="flex-1 font-mono text-sm h-9"
                    placeholder="Email subject..."
                  />
                </div>
              </div>

              {/* Variables Panel */}
              <div className="px-4 py-2 border-b bg-amber-50">
                <button 
                  onClick={() => setShowVariables(!showVariables)}
                  className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
                >
                  <span>{showVariables ? '▼' : '▶'}</span>
                  Available Variables (click to insert)
                </button>
                
                {showVariables && (
                  <div className="mt-2 text-xs grid grid-cols-2 gap-2">
                    {Object.entries(availableVariables).map(([category, vars]) => (
                      <div key={category} className="bg-white rounded-lg p-2 border border-amber-200">
                        <span className="font-semibold capitalize text-amber-800">{category}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {vars.map(v => (
                            <button
                              key={v}
                              onClick={() => insertVariable(v)}
                              className="px-1.5 py-0.5 bg-amber-100 border border-amber-300 rounded hover:bg-[#0069AF] hover:text-white hover:border-[#0069AF] transition-colors font-mono text-[10px]"
                            >
                              {v.replace(/[{}]/g, '')}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Editor / Preview Area */}
              <div className="flex-1 flex overflow-hidden" style={{ minHeight: '400px' }}>
                {/* Code Editor */}
                {(viewMode === 'code' || viewMode === 'split') && (
                  <div className={cn("flex flex-col", viewMode === 'split' ? "w-1/2 border-r" : "w-full")}>
                    <div className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs font-mono">HTML</div>
                    <textarea 
                      value={formData.html_body} 
                      onChange={(e) => setFormData(p => ({ ...p, html_body: e.target.value }))}
                      className="flex-1 font-mono text-xs p-3 bg-slate-900 text-slate-100 resize-none focus:outline-none"
                      placeholder="HTML content..."
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* Live Preview */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                  <div className={cn("flex flex-col bg-slate-100", viewMode === 'split' ? "w-1/2" : "w-full")}>
                    <div className="px-3 py-1.5 bg-slate-200 text-slate-600 text-xs font-medium flex items-center justify-between">
                      <span>Preview (with sample data)</span>
                      <span className="text-slate-400">Variables are replaced with examples</span>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <div className="bg-white rounded-lg shadow-sm border max-w-2xl mx-auto overflow-hidden">
                        <iframe
                          srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><base target="_blank"></head><body style="margin:0;padding:0;">${getPreviewHtml()}</body></html>`}
                          className="w-full border-0"
                          style={{ height: '500px', minHeight: '500px' }}
                          title="Email Preview"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="px-4 py-3 border-t bg-slate-50 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFormData(p => ({ ...p, html_body: getDefaultBodyForKey(selectedTemplate), subject: getDefaultSubject(selectedTemplate) }))}
                >
                  Reset to Default
                </Button>
                <Button onClick={handleSave} disabled={saving} size="sm" className="bg-[#0069AF] hover:bg-[#133F5C]">
                  {saving ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 py-20">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a template to customize</p>
              </div>
            </div>
          )}
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
    // Email (Emailit SMTP)
    emailit_enabled: false,
    emailit_smtp_host: 'smtp.emailit.com',
    emailit_smtp_port: '587',
    emailit_smtp_username: '',
    emailit_smtp_password: '',
    emailit_from_email: '',
    emailit_from_name: '',
    emailit_reply_to: '',
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
    if (!formData.halopsa_auth_url) { // Changed from halopsa_url to halopsa_auth_url based on the form field
      setSyncResult({ success: false, message: 'Please enter your HaloPSA Authorisation Server URL first' });
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
    if (!formData.halopsa_auth_url) { // Changed from halopsa_url to halopsa_auth_url
      setSyncResult({ success: false, message: 'Please enter your HaloPSA Authorisation Server URL first' });
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
        // Email (Emailit SMTP)
        emailit_enabled: settings[0].emailit_enabled || false,
        emailit_smtp_host: settings[0].emailit_smtp_host || 'smtp.emailit.com',
        emailit_smtp_port: settings[0].emailit_smtp_port || '587',
        emailit_smtp_username: settings[0].emailit_smtp_username || '',
        emailit_smtp_password: settings[0].emailit_smtp_password || '',
        emailit_from_email: settings[0].emailit_from_email || '',
        emailit_from_name: settings[0].emailit_from_name || '',
        emailit_reply_to: settings[0].emailit_reply_to || '',
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

        {/* Emailit Card */}
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setSelectedIntegration(selectedIntegration === 'emailit' ? null : 'emailit')}
            className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">Emailit SMTP</h3>
                <p className="text-xs text-slate-500">Transactional email delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={formData.emailit_enabled ? "default" : "outline"} className={formData.emailit_enabled ? "bg-emerald-500" : ""}>
                {formData.emailit_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {selectedIntegration === 'emailit' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </div>
          </button>
          
          {selectedIntegration === 'emailit' && (
          <div className="p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={formData.emailit_enabled} 
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, emailit_enabled: checked }))} 
                />
                <span className="text-sm font-medium">Enable</span>
              </label>
              <a href="https://app.emailit.com" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                Open Emailit Dashboard →
              </a>
            </div>

            {formData.emailit_enabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">API Key</Label>
                    <Input 
                      type="password"
                      value={formData.emailit_smtp_password} 
                      onChange={(e) => setFormData(p => ({ ...p, emailit_smtp_password: e.target.value }))} 
                      placeholder="SMTP credential key" 
                      className="mt-1 h-9" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Port</Label>
                    <select 
                      value={formData.emailit_smtp_port} 
                      onChange={(e) => setFormData(p => ({ ...p, emailit_smtp_port: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="587">587 (TLS)</option>
                      <option value="465">465 (SSL)</option>
                      <option value="25">25</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">From Email</Label>
                    <Input 
                      type="email"
                      value={formData.emailit_from_email} 
                      onChange={(e) => setFormData(p => ({ ...p, emailit_from_email: e.target.value }))} 
                      placeholder="noreply@domain.com" 
                      className="mt-1 h-9" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs">From Name</Label>
                    <Input 
                      value={formData.emailit_from_name} 
                      onChange={(e) => setFormData(p => ({ ...p, emailit_from_name: e.target.value }))} 
                      placeholder="Company Name" 
                      className="mt-1 h-9" 
                    />
                  </div>
                </div>

                <div className="flex gap-3 items-center pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={formData.emailit_secure !== false} 
                      onCheckedChange={(checked) => setFormData(p => ({ ...p, emailit_secure: checked }))} 
                    />
                    <span className="text-xs">Use TLS/SSL</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={formData.emailit_auth !== false} 
                      onCheckedChange={(checked) => setFormData(p => ({ ...p, emailit_auth: checked }))} 
                    />
                    <span className="text-xs">Authentication</span>
                  </label>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Input 
                    type="email"
                    value={formData.emailit_test_to || ''}
                    onChange={(e) => setFormData(p => ({ ...p, emailit_test_to: e.target.value }))} 
                    placeholder="Test email address..."
                    className="flex-1 h-9"
                  />
                  <Button 
                    onClick={async () => {
                      if (!formData.emailit_smtp_password || !formData.emailit_from_email) {
                        setEmailTestResult({ success: false, message: 'Enter API key and from email' });
                        return;
                      }
                      if (!formData.emailit_test_to) {
                        setEmailTestResult({ success: false, message: 'Enter test email address' });
                        return;
                      }
                      setTestingEmail(true);
                      setEmailTestResult(null);
                      try {
                        await handleSave();
                        const response = await base44.functions.invoke('sendEmailit', { 
                          testOnly: true,
                          to: formData.emailit_test_to,
                          subject: 'Test Email from IT Projects',
                          html: '<h1>Test Email</h1><p>Your Emailit integration is working correctly.</p>'
                        });
                        setEmailTestResult(response.data?.success 
                          ? { success: true, message: 'Sent!' } 
                          : { success: false, message: response.data?.error || 'Failed' }
                        );
                      } catch (error) {
                        setEmailTestResult({ success: false, message: error.response?.data?.error || 'Failed' });
                      }
                      setTestingEmail(false);
                    }} 
                    disabled={testingEmail || !formData.emailit_test_to}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 h-9"
                  >
                    {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                  </Button>
                </div>
                
                {emailTestResult && (
                  <p className={cn("text-xs", emailTestResult.success ? "text-emerald-600" : "text-red-600")}>
                    {emailTestResult.message}
                  </p>
                )}
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
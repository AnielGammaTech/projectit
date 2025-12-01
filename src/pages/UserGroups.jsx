import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Users, Plus, Edit2, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';

const groupColors = ['indigo', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'pink'];

export default function UserGroups() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: 'indigo', member_emails: [] });
  const [newEmail, setNewEmail] = useState('');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => base44.entities.UserGroup.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingGroup) {
        return base44.entities.UserGroup.update(editingGroup.id, data);
      }
      return base44.entities.UserGroup.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
      handleCloseModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UserGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
      setDeleteConfirm(null);
    }
  });

  const handleOpenModal = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name || '',
        description: group.description || '',
        color: group.color || 'indigo',
        member_emails: group.member_emails || []
      });
    } else {
      setEditingGroup(null);
      setFormData({ name: '', description: '', color: 'indigo', member_emails: [] });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGroup(null);
    setFormData({ name: '', description: '', color: 'indigo', member_emails: [] });
    setNewEmail('');
  };

  const addEmail = () => {
    if (!newEmail.trim() || formData.member_emails.includes(newEmail)) return;
    setFormData(prev => ({ ...prev, member_emails: [...prev.member_emails, newEmail.trim()] }));
    setNewEmail('');
  };

  const removeEmail = (email) => {
    setFormData(prev => ({ ...prev, member_emails: prev.member_emails.filter(e => e !== email) }));
  };

  const getColorClasses = (color) => {
    const colors = {
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
      rose: 'bg-rose-100 text-rose-700 border-rose-200',
      violet: 'bg-violet-100 text-violet-700 border-violet-200',
      cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200'
    };
    return colors[color] || colors.indigo;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Groups</h1>
            <p className="text-slate-500 mt-1">Manage access groups for projects</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            New Group
          </Button>
        </motion.div>

        {/* Groups List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : groups.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
            >
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No user groups yet</h3>
              <p className="text-slate-500 mb-6">Create groups to manage project access</p>
              <Button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </motion.div>
          ) : (
            groups.map((group, idx) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-3 rounded-xl", getColorClasses(group.color))}>
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
                      {group.description && <p className="text-slate-500 mt-1">{group.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(group.member_emails || []).map((email) => {
                          const member = teamMembers.find(m => m.email === email);
                          return (
                            <Badge key={email} variant="outline" className="text-xs">
                              {member?.name || email}
                            </Badge>
                          );
                        })}
                        {(!group.member_emails || group.member_emails.length === 0) && (
                          <span className="text-sm text-slate-400">No members</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(group)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(group)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'New User Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Group Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Development Team"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Color</label>
              <div className="flex gap-2 mt-2">
                {groupColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      `bg-${color}-500`,
                      formData.color === color ? "ring-2 ring-offset-2 ring-indigo-500" : ""
                    )}
                    style={{ backgroundColor: color === 'indigo' ? '#6366f1' : color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : color === 'rose' ? '#f43f5e' : color === 'violet' ? '#8b5cf6' : color === 'cyan' ? '#06b6d4' : '#ec4899' }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Members</label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter email..."
                  onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                />
                <Button type="button" onClick={addEmail} variant="outline">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
              {/* Quick add from team */}
              {teamMembers.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1">Quick add from team:</p>
                  <div className="flex flex-wrap gap-1">
                    {teamMembers.filter(m => !formData.member_emails.includes(m.email)).slice(0, 5).map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setFormData(prev => ({ ...prev, member_emails: [...prev.member_emails, member.email] }))}
                        className="text-xs px-2 py-1 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                      >
                        + {member.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {formData.member_emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.member_emails.map((email) => {
                    const member = teamMembers.find(m => m.email === email);
                    return (
                      <Badge key={email} variant="outline" className="flex items-center gap-1 pr-1">
                        {member?.name || email}
                        <button onClick={() => removeEmail(email)} className="ml-1 hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button 
                onClick={() => saveMutation.mutate(formData)} 
                disabled={!formData.name.trim() || saveMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {editingGroup ? 'Update' : 'Create'} Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the group "{deleteConfirm?.name}". Projects assigned to this group will no longer have this access restriction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteConfirm.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
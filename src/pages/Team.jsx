import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Mail, Phone, MoreHorizontal, Edit2, Trash2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

import TeamMemberModal from '@/components/modals/TeamMemberModal';

export default function Team() {
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, member: null });

  const { data: teamMembers = [], refetch } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  // Get active project IDs (exclude archived, deleted, completed)
  const activeProjectIds = projects
    .filter(p => p.status !== 'archived' && p.status !== 'deleted' && p.status !== 'completed')
    .map(p => p.id);

  // Only count tasks from active projects
  const activeProjectTasks = tasks.filter(t => activeProjectIds.includes(t.project_id));

  const handleSave = async (data) => {
    if (editingMember) {
      await base44.entities.TeamMember.update(editingMember.id, data);
    } else {
      await base44.entities.TeamMember.create(data);
    }
    refetch();
    setShowModal(false);
    setEditingMember(null);
  };

  const handleDelete = async () => {
    await base44.entities.TeamMember.delete(deleteConfirm.member.id);
    refetch();
    setDeleteConfirm({ open: false, member: null });
  };

  const getAssignedTasks = (email) => activeProjectTasks.filter(t => t.assigned_to === email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Team</h1>
            <p className="text-slate-500 mt-1">Manage your technicians and team members</p>
          </div>
          <Button
            onClick={() => { setEditingMember(null); setShowModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </motion.div>

        {/* Team Grid */}
        {teamMembers.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {teamMembers.map((member, idx) => {
                const assignedTasks = getAssignedTasks(member.email);
                const completedTasks = assignedTasks.filter(t => t.status === 'completed').length;

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 rounded-full ${member.avatar_color || 'bg-indigo-500'} flex items-center justify-center text-white text-lg font-semibold`}>
                        {member.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingMember(member); setShowModal(true); }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteConfirm({ open: true, member })} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900">{member.name}</h3>
                    {member.role && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        {member.role}
                      </div>
                    )}

                    <div className="mt-4 space-y-2 text-sm">
                      <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
                        <Mail className="w-4 h-4" />
                        {member.email}
                      </a>
                      {member.phone && (
                        <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
                          <Phone className="w-4 h-4" />
                          {member.phone}
                        </a>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Assigned Tasks</span>
                        <span className="font-medium text-slate-900">{assignedTasks.length}</span>
                      </div>
                      {assignedTasks.length > 0 && (
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-slate-500">Completed</span>
                          <span className="font-medium text-emerald-600">{completedTasks}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
          >
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No team members yet</h3>
            <p className="text-slate-500 mb-6">Add your first technician to start assigning tasks</p>
            <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          </motion.div>
        )}
      </div>

      <TeamMemberModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingMember(null); }}
        member={editingMember}
        onSave={handleSave}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, member: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deleteConfirm.member?.name} from your team. Any assigned tasks will remain but become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
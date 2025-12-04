import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Shield, Plus, Edit2, Trash2, Check, X, Users, 
  FolderKanban, ListTodo, FileText, Package, BarChart3,
  DollarSign, Clock, Settings, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

const roleColors = {
  slate: 'bg-slate-500', red: 'bg-red-500', orange: 'bg-orange-500',
  amber: 'bg-amber-500', green: 'bg-green-500', emerald: 'bg-emerald-500',
  teal: 'bg-teal-500', cyan: 'bg-cyan-500', blue: 'bg-blue-500',
  indigo: 'bg-indigo-500', violet: 'bg-violet-500', purple: 'bg-purple-500', 
  pink: 'bg-pink-500'
};

// Permission categories and their items
const permissionCategories = [
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    permissions: [
      { key: 'projects_view', label: 'View' },
      { key: 'projects_create', label: 'Create' },
      { key: 'projects_edit', label: 'Edit' },
      { key: 'projects_delete', label: 'Delete' },
    ]
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: ListTodo,
    permissions: [
      { key: 'tasks_view', label: 'View' },
      { key: 'tasks_create', label: 'Create' },
      { key: 'tasks_edit', label: 'Edit' },
      { key: 'tasks_delete', label: 'Delete' },
    ]
  },
  {
    id: 'proposals',
    label: 'Proposals',
    icon: FileText,
    permissions: [
      { key: 'proposals_view', label: 'View' },
      { key: 'proposals_create', label: 'Create' },
      { key: 'proposals_edit', label: 'Edit' },
      { key: 'proposals_send', label: 'Send' },
      { key: 'proposals_delete', label: 'Delete' },
    ]
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    permissions: [
      { key: 'customers_view', label: 'View' },
      { key: 'customers_create', label: 'Create' },
      { key: 'customers_edit', label: 'Edit' },
      { key: 'customers_delete', label: 'Delete' },
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    permissions: [
      { key: 'inventory_view', label: 'View' },
      { key: 'inventory_edit', label: 'Edit' },
      { key: 'inventory_checkout', label: 'Checkout' },
    ]
  },
  {
    id: 'other',
    label: 'Other',
    icon: Settings,
    permissions: [
      { key: 'reports_view', label: 'View Reports' },
      { key: 'billing_view', label: 'View Billing' },
      { key: 'billing_manage', label: 'Manage Billing' },
      { key: 'time_tracking', label: 'Time Tracking' },
      { key: 'admin_access', label: 'Admin Access' },
    ]
  },
];

// Default system roles
const defaultRoles = [
  {
    name: 'Administrator',
    description: 'Full access to all features',
    color: 'red',
    is_system: true,
    permissions: Object.fromEntries(
      permissionCategories.flatMap(c => c.permissions.map(p => [p.key, true]))
    )
  },
  {
    name: 'Manager',
    description: 'Can manage projects, tasks, and view reports',
    color: 'blue',
    is_system: true,
    permissions: {
      projects_view: true, projects_create: true, projects_edit: true, projects_delete: false,
      tasks_view: true, tasks_create: true, tasks_edit: true, tasks_delete: true,
      proposals_view: true, proposals_create: true, proposals_edit: true, proposals_send: true, proposals_delete: false,
      customers_view: true, customers_create: true, customers_edit: true, customers_delete: false,
      inventory_view: true, inventory_edit: false, inventory_checkout: true,
      reports_view: true, billing_view: true, billing_manage: false, time_tracking: true, admin_access: false,
    }
  },
  {
    name: 'Technician',
    description: 'Can work on tasks and track time',
    color: 'green',
    is_system: true,
    permissions: {
      projects_view: true, projects_create: false, projects_edit: false, projects_delete: false,
      tasks_view: true, tasks_create: true, tasks_edit: true, tasks_delete: false,
      proposals_view: false, proposals_create: false, proposals_edit: false, proposals_send: false, proposals_delete: false,
      customers_view: true, customers_create: false, customers_edit: false, customers_delete: false,
      inventory_view: true, inventory_edit: false, inventory_checkout: true,
      reports_view: false, billing_view: false, billing_manage: false, time_tracking: true, admin_access: false,
    }
  },
  {
    name: 'Viewer',
    description: 'Read-only access',
    color: 'slate',
    is_system: true,
    permissions: {
      projects_view: true, projects_create: false, projects_edit: false, projects_delete: false,
      tasks_view: true, tasks_create: false, tasks_edit: false, tasks_delete: false,
      proposals_view: true, proposals_create: false, proposals_edit: false, proposals_send: false, proposals_delete: false,
      customers_view: true, customers_create: false, customers_edit: false, customers_delete: false,
      inventory_view: true, inventory_edit: false, inventory_checkout: false,
      reports_view: true, billing_view: false, billing_manage: false, time_tracking: false, admin_access: false,
    }
  }
];

export default function RolesPermissions() {
  const queryClient = useQueryClient();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'matrix'

  const { data: customRoles = [], refetch } = useQuery({
    queryKey: ['customRoles'],
    queryFn: () => base44.entities.CustomRole.list('name')
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  // Combine system roles with custom roles
  const allRoles = [...defaultRoles, ...customRoles.filter(r => !r.is_system)];

  const handleSaveRole = async (data) => {
    if (editingRole?.id) {
      await base44.entities.CustomRole.update(editingRole.id, data);
    } else {
      await base44.entities.CustomRole.create(data);
    }
    refetch();
    setShowRoleModal(false);
    setEditingRole(null);
  };

  const handleDeleteRole = async () => {
    if (deleteConfirm?.id) {
      await base44.entities.CustomRole.delete(deleteConfirm.id);
      refetch();
    }
    setDeleteConfirm(null);
  };

  const handleDuplicateRole = (role) => {
    setEditingRole({
      ...role,
      id: undefined,
      name: `${role.name} (Copy)`,
      is_system: false
    });
    setShowRoleModal(true);
  };

  // Get members count for each role
  const getMembersWithRole = (roleName) => {
    return teamMembers.filter(m => m.role === roleName).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-[#0069AF] shadow-lg shadow-[#0069AF]/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Roles & Permissions</h1>
              </div>
              <p className="text-slate-500">Manage user roles and access control</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    viewMode === 'cards' ? "bg-[#0069AF] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('matrix')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    viewMode === 'matrix' ? "bg-[#0069AF] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Matrix
                </button>
              </div>
              <Button onClick={() => { setEditingRole(null); setShowRoleModal(true); }} className="bg-[#0069AF] hover:bg-[#133F5C]">
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </div>
          </div>
        </motion.div>

        {viewMode === 'cards' ? (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allRoles.map((role, idx) => (
              <motion.div
                key={role.id || role.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border shadow-sm overflow-hidden"
              >
                <div className={cn("h-2", roleColors[role.color] || 'bg-blue-500')} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{role.name}</h3>
                        {role.is_system && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{role.description}</p>
                    </div>
                    <div className="flex gap-1">
                      {!role.is_system ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); setEditingRole(role); setShowRoleModal(true); }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(role); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); handleDuplicateRole(role); }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
                    <Users className="w-4 h-4" />
                    <span>{getMembersWithRole(role.name)} members</span>
                  </div>

                  {/* Permission summary */}
                  <div className="space-y-2">
                    {permissionCategories.slice(0, 4).map(cat => {
                      const enabledCount = cat.permissions.filter(p => role.permissions?.[p.key]).length;
                      const Icon = cat.icon;
                      return (
                        <div key={cat.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Icon className="w-4 h-4" />
                            <span>{cat.label}</span>
                          </div>
                          <span className="text-slate-400">{enabledCount}/{cat.permissions.length}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Matrix View */
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-left p-4 font-medium text-slate-700 sticky left-0 bg-slate-50 min-w-[200px]">
                      Permission
                    </th>
                    {allRoles.map(role => (
                      <th key={role.id || role.name} className="p-4 text-center min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <div className={cn("w-3 h-3 rounded-full", roleColors[role.color])} />
                          <span className="font-medium text-slate-700 text-sm">{role.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionCategories.map(cat => (
                    <>
                      <tr key={cat.id} className="bg-slate-50/50">
                        <td colSpan={allRoles.length + 1} className="p-3">
                          <div className="flex items-center gap-2 font-medium text-slate-700">
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                          </div>
                        </td>
                      </tr>
                      {cat.permissions.map(perm => (
                        <tr key={perm.key} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-4 pl-8 text-sm text-slate-600 sticky left-0 bg-white">
                            {perm.label}
                          </td>
                          {allRoles.map(role => (
                            <td key={`${role.id || role.name}-${perm.key}`} className="p-4 text-center">
                              {role.permissions?.[perm.key] ? (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
                                  <Check className="w-4 h-4 text-emerald-600" />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100">
                                  <X className="w-4 h-4 text-slate-400" />
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Role Modal */}
        <RoleModal
          open={showRoleModal}
          onClose={() => { setShowRoleModal(false); setEditingRole(null); }}
          role={editingRole}
          onSave={handleSaveRole}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Role?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the "{deleteConfirm?.name}" role. Members with this role will need to be reassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRole} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function RoleModal({ open, onClose, role, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'blue',
    permissions: {}
  });

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        color: role.color || 'blue',
        permissions: role.permissions || {}
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: 'blue',
        permissions: {}
      });
    }
  }, [role, open]);

  const togglePermission = (key) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const toggleCategory = (category) => {
    const allEnabled = category.permissions.every(p => formData.permissions[p.key]);
    const newValue = !allEnabled;
    const newPermissions = { ...formData.permissions };
    category.permissions.forEach(p => {
      newPermissions[p.key] = newValue;
    });
    setFormData(prev => ({ ...prev, permissions: newPermissions }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role?.id ? 'Edit Role' : 'Create Role'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Project Manager"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {Object.entries(roleColors).map(([name, className]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, color: name }))}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all",
                      className,
                      formData.color === name && "ring-2 ring-offset-2 ring-[#0069AF]"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of this role..."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-base">Permissions</Label>
            <p className="text-sm text-slate-500 mb-4">Select what users with this role can do</p>
            
            <div className="space-y-4">
              {permissionCategories.map(cat => {
                const enabledCount = cat.permissions.filter(p => formData.permissions[p.key]).length;
                const allEnabled = enabledCount === cat.permissions.length;
                const someEnabled = enabledCount > 0 && !allEnabled;
                const Icon = cat.icon;

                return (
                  <div key={cat.id} className="border rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="w-full p-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={allEnabled} 
                          className={someEnabled ? "data-[state=checked]:bg-slate-400" : ""}
                        />
                        <Icon className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-slate-700">{cat.label}</span>
                      </div>
                      <span className="text-sm text-slate-500">{enabledCount}/{cat.permissions.length}</span>
                    </button>
                    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cat.permissions.map(perm => (
                        <label 
                          key={perm.key} 
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <Checkbox
                            checked={formData.permissions[perm.key] || false}
                            onCheckedChange={() => togglePermission(perm.key)}
                          />
                          <span className="text-sm text-slate-600">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#0069AF] hover:bg-[#133F5C]">
              {role?.id ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
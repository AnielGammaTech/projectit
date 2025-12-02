import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Edit2, Trash2, Mail, Phone, Building2, MapPin, MoreHorizontal, ArrowLeft } from 'lucide-react';
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
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, customer: null });
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', address: '', city: '', state: '', zip: '', notes: ''
  });
  const queryClient = useQueryClient();

  const { data: customers = [], refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date')
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list()
  });

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || '',
        email: editingCustomer.email || '',
        phone: editingCustomer.phone || '',
        company: editingCustomer.company || '',
        address: editingCustomer.address || '',
        city: editingCustomer.city || '',
        state: editingCustomer.state || '',
        zip: editingCustomer.zip || '',
        notes: editingCustomer.notes || ''
      });
    } else {
      setFormData({ name: '', email: '', phone: '', company: '', address: '', city: '', state: '', zip: '', notes: '' });
    }
  }, [editingCustomer, showModal]);

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProposalCount = (email) => proposals.filter(p => p.customer_email === email).length;
  const getTotalValue = (email) => proposals.filter(p => p.customer_email === email && p.status === 'approved').reduce((sum, p) => sum + (p.total || 0), 0);

  const handleSave = async () => {
    if (editingCustomer) {
      await base44.entities.Customer.update(editingCustomer.id, formData);
    } else {
      await base44.entities.Customer.create(formData);
    }
    refetch();
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm.customer) {
      await base44.entities.Customer.delete(deleteConfirm.customer.id);
      refetch();
    }
    setDeleteConfirm({ open: false, customer: null });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to={createPageUrl('Proposals')} className="inline-flex items-center text-[#0069AF] hover:text-[#133F5C] mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Proposals
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Customers</h1>
            <p className="text-slate-500 mt-1">Manage your customer database</p>
          </div>
          <Button onClick={() => { setEditingCustomer(null); setShowModal(true); }} className="bg-[#0069AF] hover:bg-[#133F5C]">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </motion.div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4">
          <AnimatePresence>
            {filteredCustomers.map((customer, idx) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: idx * 0.02 }}
                className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#0069AF]/10 flex items-center justify-center text-[#0069AF] font-semibold text-lg">
                      {customer.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{customer.name}</h3>
                      {customer.company && <p className="text-sm text-slate-500">{customer.company}</p>}
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{customer.email}</span>
                        {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>}
                      </div>
                      {(customer.city || customer.state) && (
                        <span className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {[customer.city, customer.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">{getProposalCount(customer.email)} proposals</p>
                      {getTotalValue(customer.email) > 0 && (
                        <p className="text-sm font-medium text-emerald-600">${getTotalValue(customer.email).toLocaleString()} won</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-5 h-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingCustomer(customer); setShowModal(true); }}>
                          <Edit2 className="w-4 h-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteConfirm({ open: true, customer })} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredCustomers.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No customers yet</h3>
              <p className="text-slate-500 mb-6">Add your first customer to get started</p>
              <Button onClick={() => setShowModal(true)} className="bg-[#0069AF] hover:bg-[#133F5C]">
                <Plus className="w-4 h-4 mr-2" />Add Customer
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setEditingCustomer(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={formData.company} onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={formData.state} onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>ZIP</Label>
                <Input value={formData.zip} onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} className="mt-1" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-[#0069AF] hover:bg-[#133F5C]">
                {editingCustomer ? 'Update' : 'Add Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, customer: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
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
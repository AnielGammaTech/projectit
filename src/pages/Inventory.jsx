import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, Plus, Search, AlertTriangle, CheckCircle2, 
  ArrowDownCircle, ArrowUpCircle, Edit2, Trash2, MoreHorizontal 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: items = [] } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => base44.entities.InventoryItem.list('name')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ status: { $ne: 'archived' } })
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['inventoryTransactions'],
    queryFn: () => base44.entities.InventoryTransaction.list('-created_date', 50)
  });

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = items.filter(i => i.quantity_in_stock <= i.minimum_stock);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventory</h1>
            <p className="text-slate-500 mt-1">Manage stock and checkout items for projects</p>
          </div>
          <Button
            onClick={() => { setEditingItem(null); setShowItemModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{items.length}</p>
                <p className="text-sm text-slate-500">Total Items</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {items.filter(i => i.quantity_in_stock > i.minimum_stock).length}
                </p>
                <p className="text-sm text-slate-500">In Stock</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{lowStockItems.length}</p>
                <p className="text-sm text-slate-500">Low Stock</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <ArrowDownCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {transactions.filter(t => t.type === 'checkout').length}
                </p>
                <p className="text-sm text-slate-500">Checkouts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Items Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isLowStock = item.quantity_in_stock <= item.minimum_stock;
            const isOutOfStock = item.quantity_in_stock === 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { setEditingItem(item); setShowItemModal(true); }}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    {item.sku && <p className="text-xs text-slate-500">SKU: {item.sku}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingItem(item); setShowItemModal(true); }}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setShowCheckoutModal(true); }}>
                        <ArrowDownCircle className="w-4 h-4 mr-2" />
                        Checkout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    "text-2xl font-bold",
                    isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-slate-900"
                  )}>
                    {item.quantity_in_stock}
                  </span>
                  <span className="text-sm text-slate-500">in stock</span>
                </div>

                {isOutOfStock ? (
                  <Badge className="bg-red-100 text-red-700 border-red-200">Out of Stock</Badge>
                ) : isLowStock ? (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">Low Stock</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    In Stock
                  </Badge>
                )}

                {item.category && (
                  <Badge variant="outline" className="ml-2">{item.category}</Badge>
                )}

                {item.location && (
                  <p className="text-xs text-slate-500 mt-2">📍 {item.location}</p>
                )}
              </motion.div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No items found</h3>
            <p className="text-slate-500">Add your first inventory item to get started</p>
          </div>
        )}
      </div>

      {/* Item Modal */}
      <ItemModal
        open={showItemModal}
        onClose={() => { setShowItemModal(false); setEditingItem(null); }}
        item={editingItem}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['inventoryItems'] })}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        open={showCheckoutModal}
        onClose={() => { setShowCheckoutModal(false); setSelectedItem(null); }}
        item={selectedItem}
        projects={projects}
        currentUser={currentUser}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
          queryClient.invalidateQueries({ queryKey: ['inventoryTransactions'] });
        }}
      />
    </div>
  );
}

function ItemModal({ open, onClose, item, onSaved }) {
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', quantity_in_stock: 0,
    minimum_stock: 0, unit_cost: '', location: '', description: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        sku: item.sku || '',
        category: item.category || '',
        quantity_in_stock: item.quantity_in_stock || 0,
        minimum_stock: item.minimum_stock || 0,
        unit_cost: item.unit_cost || '',
        location: item.location || '',
        description: item.description || ''
      });
    } else {
      setFormData({
        name: '', sku: '', category: '', quantity_in_stock: 0,
        minimum_stock: 0, unit_cost: '', location: '', description: ''
      });
    }
  }, [item, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (item) {
      await base44.entities.InventoryItem.update(item.id, formData);
    } else {
      await base44.entities.InventoryItem.create(formData);
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>SKU</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={formData.quantity_in_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity_in_stock: Number(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Min Stock Alert</Label>
              <Input
                type="number"
                value={formData.minimum_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, minimum_stock: Number(e.target.value) }))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: e.target.value ? Number(e.target.value) : '' }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {item ? 'Update' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutModal({ open, onClose, item, projects, currentUser, onSaved }) {
  const [formData, setFormData] = useState({ project_id: '', quantity: 1, notes: '' });

  useEffect(() => {
    setFormData({ project_id: '', quantity: 1, notes: '' });
  }, [item, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Create transaction
    await base44.entities.InventoryTransaction.create({
      inventory_item_id: item.id,
      project_id: formData.project_id,
      type: 'checkout',
      quantity: formData.quantity,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      notes: formData.notes
    });

    // Update stock
    await base44.entities.InventoryItem.update(item.id, {
      quantity_in_stock: item.quantity_in_stock - formData.quantity
    });

    onSaved();
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Checkout: {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Project</Label>
            <Select value={formData.project_id} onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity (Available: {item.quantity_in_stock})</Label>
            <Input
              type="number"
              min="1"
              max={item.quantity_in_stock}
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1"
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!formData.project_id || formData.quantity < 1 || formData.quantity > item.quantity_in_stock}
            >
              Checkout
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
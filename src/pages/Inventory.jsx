import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, Plus, Search, AlertTriangle, CheckCircle2, 
  ArrowDownCircle, Edit2, Trash2, MoreHorizontal, Image,
  Printer, QrCode, ShoppingCart, Scan, X, Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const groups = await base44.entities.UserGroup.list();
      const memberGroups = groups.filter(g => g.member_emails?.includes(user.email));
      setUserGroups(memberGroups);
    };
    loadUser().catch(() => {});
  }, []);

  const { data: items = [] } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => base44.entities.InventoryItem.list('name')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ status: { $ne: 'archived' } })
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: 'main' })
  });

  const appSettings = settings[0] || {};
  const isAdmin = currentUser?.role === 'admin';
  const userGroupIds = userGroups.map(g => g.id);

  // Permission checks
  const canView = isAdmin || !appSettings.inventory_view_groups?.length || 
    appSettings.inventory_view_groups.some(g => userGroupIds.includes(g));
  const canEdit = isAdmin || !appSettings.inventory_edit_groups?.length || 
    appSettings.inventory_edit_groups.some(g => userGroupIds.includes(g));
  const canCheckout = isAdmin || !appSettings.inventory_checkout_groups?.length || 
    appSettings.inventory_checkout_groups.some(g => userGroupIds.includes(g));

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = items.filter(i => i.quantity_in_stock <= i.minimum_stock && i.quantity_in_stock > 0);
  const outOfStockItems = items.filter(i => i.quantity_in_stock === 0);

  const handleDelete = async () => {
    if (deleteConfirm) {
      await base44.entities.InventoryItem.delete(deleteConfirm.id);
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      setDeleteConfirm(null);
    }
  };

  const handlePrintLabel = (item) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${item.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .label { border: 2px solid #000; padding: 15px; width: 300px; }
            .name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .sku { font-size: 14px; color: #666; margin-bottom: 5px; }
            .barcode { font-size: 24px; font-family: monospace; letter-spacing: 3px; margin: 15px 0; }
            .location { font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="name">${item.name}</div>
            ${item.sku ? `<div class="sku">SKU: ${item.sku}</div>` : ''}
            ${item.barcode ? `<div class="barcode">||||| ${item.barcode} |||||</div>` : ''}
            ${item.location ? `<div class="location">📍 ${item.location}</div>` : ''}
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500">You don't have permission to view inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#133F5C] tracking-tight">Inventory</h1>
            <p className="text-slate-500 mt-1">Manage stock, checkout items, and print labels</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowScanModal(true)}>
              <Scan className="w-4 h-4 mr-2" />
              Scan
            </Button>
            {canEdit && (
              <Button
                onClick={() => { setEditingItem(null); setShowItemModal(true); }}
                className="bg-[#0069AF] hover:bg-[#133F5C]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#74C7FF]/20">
                <Package className="w-5 h-5 text-[#0069AF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#133F5C]">{items.length}</p>
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
                <p className="text-2xl font-bold text-[#133F5C]">
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
                <p className="text-2xl font-bold text-[#133F5C]">{lowStockItems.length}</p>
                <p className="text-sm text-slate-500">Low Stock</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#133F5C]">{outOfStockItems.length}</p>
                <p className="text-sm text-slate-500">Out of Stock</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, SKU, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl border">
          <div className="grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-sm font-medium text-slate-600">
            <div className="col-span-4">Item</div>
            <div className="col-span-2">SKU / Barcode</div>
            <div className="col-span-1 text-center">Stock</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-1 text-right">Price</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y">
            {filteredItems.map((item) => {
              const isLowStock = item.quantity_in_stock <= item.minimum_stock && item.quantity_in_stock > 0;
              const isOutOfStock = item.quantity_in_stock === 0;

              return (
                <div 
                  key={item.id} 
                  onClick={() => { if (canEdit) { setEditingItem(item); setShowItemModal(true); }}}
                  className={cn(
                    "grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors",
                    canEdit && "cursor-pointer"
                  )}
                >
                  <div className="col-span-4 flex items-center gap-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      {item.category && <p className="text-xs text-slate-500">{item.category}</p>}
                    </div>
                  </div>
                  <div className="col-span-2">
                    {item.sku && <p className="text-sm text-slate-600">{item.sku}</p>}
                    {item.barcode && <p className="text-xs text-slate-400 font-mono">{item.barcode}</p>}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={cn(
                      "font-semibold",
                      isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-slate-900"
                    )}>
                      {item.quantity_in_stock}
                    </span>
                    {isOutOfStock && <Badge className="ml-2 bg-red-100 text-red-700 text-xs">Out</Badge>}
                    {isLowStock && <Badge className="ml-2 bg-amber-100 text-amber-700 text-xs">Low</Badge>}
                  </div>
                  <div className="col-span-2 text-sm text-slate-500">
                    {item.location || '-'}
                  </div>
                  <div className="col-span-1 text-right text-sm">
                    {item.sell_price ? `$${item.sell_price}` : item.unit_cost ? `$${item.unit_cost}` : '-'}
                  </div>
                  <div className="col-span-2 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {canCheckout && item.quantity_in_stock > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => { setSelectedItem(item); setShowCheckoutModal(true); }}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Checkout
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem onClick={() => { setEditingItem(item); setShowItemModal(true); }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handlePrintLabel(item)}>
                          <Printer className="w-4 h-4 mr-2" />
                          Print Label
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteConfirm(item)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredItems.length === 0 && (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No items found</h3>
              <p className="text-slate-500">Add your first inventory item to get started</p>
            </div>
          )}
        </div>
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

      {/* Scan Modal */}
      <ScanModal
        open={showScanModal}
        onClose={() => setShowScanModal(false)}
        items={items}
        onItemFound={(item) => { setShowScanModal(false); setEditingItem(item); setShowItemModal(true); }}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deleteConfirm?.name}".</AlertDialogDescription>
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

function ItemModal({ open, onClose, item, onSaved }) {
  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', category: '', image_url: '',
    quantity_in_stock: 0, minimum_stock: 0, unit_cost: '', sell_price: '',
    location: '', description: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        sku: item.sku || '',
        barcode: item.barcode || '',
        category: item.category || '',
        image_url: item.image_url || '',
        quantity_in_stock: item.quantity_in_stock || 0,
        minimum_stock: item.minimum_stock || 0,
        unit_cost: item.unit_cost || '',
        sell_price: item.sell_price || '',
        location: item.location || '',
        description: item.description || ''
      });
    } else {
      setFormData({
        name: '', sku: '', barcode: '', category: '', image_url: '',
        quantity_in_stock: 0, minimum_stock: 0, unit_cost: '', sell_price: '',
        location: '', description: ''
      });
    }
  }, [item, open]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, image_url: file_url }));
    setUploading(false);
  };

  const generateBarcode = () => {
    const code = Date.now().toString().slice(-10);
    setFormData(prev => ({ ...prev, barcode: code }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      unit_cost: formData.unit_cost ? Number(formData.unit_cost) : null,
      sell_price: formData.sell_price ? Number(formData.sell_price) : null
    };
    if (item) {
      await base44.entities.InventoryItem.update(item.id, data);
    } else {
      await base44.entities.InventoryItem.create(data);
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Image Upload */}
          <div>
            <Label>Item Image</Label>
            <div className="mt-2 flex items-center gap-4">
              {formData.image_url ? (
                <img src={formData.image_url} alt="Item" className="w-20 h-20 rounded-lg object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Image className="w-8 h-8 text-slate-300" />
                </div>
              )}
              <label className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Image className="w-4 h-4 mr-2" />}
                    {formData.image_url ? 'Change' : 'Upload'}
                  </span>
                </Button>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {formData.image_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(p => ({ ...p, image_url: '' }))}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>Name *</Label>
            <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>SKU</Label>
              <Input value={formData.sku} onChange={(e) => setFormData(p => ({ ...p, sku: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Barcode</Label>
            <div className="flex gap-2 mt-1">
              <Input value={formData.barcode} onChange={(e) => setFormData(p => ({ ...p, barcode: e.target.value }))} placeholder="Enter or generate" />
              <Button type="button" variant="outline" onClick={generateBarcode}>
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={formData.quantity_in_stock} onChange={(e) => setFormData(p => ({ ...p, quantity_in_stock: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label>Min Stock Alert</Label>
              <Input type="number" value={formData.minimum_stock} onChange={(e) => setFormData(p => ({ ...p, minimum_stock: Number(e.target.value) }))} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit Cost</Label>
              <Input type="number" step="0.01" value={formData.unit_cost} onChange={(e) => setFormData(p => ({ ...p, unit_cost: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Sell Price</Label>
              <Input type="number" step="0.01" value={formData.sell_price} onChange={(e) => setFormData(p => ({ ...p, sell_price: e.target.value }))} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <Input value={formData.location} onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} className="mt-1" placeholder="e.g., Warehouse A, Shelf 3" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} className="mt-1" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#0069AF] hover:bg-[#133F5C]">
              {item ? 'Update' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutModal({ open, onClose, item, projects, currentUser, onSaved }) {
  const [formData, setFormData] = useState({ project_id: '', quantity: 1, type: 'checkout', notes: '' });

  useEffect(() => {
    setFormData({ project_id: '', quantity: 1, type: 'checkout', notes: '' });
  }, [item, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    await base44.entities.InventoryTransaction.create({
      inventory_item_id: item.id,
      project_id: formData.project_id || null,
      type: formData.type,
      quantity: formData.quantity,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      notes: formData.notes
    });

    const newQty = formData.type === 'restock' 
      ? item.quantity_in_stock + formData.quantity 
      : item.quantity_in_stock - formData.quantity;

    await base44.entities.InventoryItem.update(item.id, {
      quantity_in_stock: Math.max(0, newQty)
    });

    onSaved();
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover inline-block mr-3" />}
            {item.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Action</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData(p => ({ ...p, type: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkout">Checkout (Remove from stock)</SelectItem>
                <SelectItem value="restock">Restock (Add to stock)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === 'checkout' && (
            <div>
              <Label>Project (Optional)</Label>
              <Select value={formData.project_id} onValueChange={(v) => setFormData(p => ({ ...p, project_id: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No project</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Quantity (Available: {item.quantity_in_stock})</Label>
            <Input
              type="number"
              min="1"
              max={formData.type === 'checkout' ? item.quantity_in_stock : 9999}
              value={formData.quantity}
              onChange={(e) => setFormData(p => ({ ...p, quantity: Number(e.target.value) }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
              className="mt-1"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              type="submit" 
              className={formData.type === 'restock' ? "bg-green-600 hover:bg-green-700" : "bg-[#0069AF] hover:bg-[#133F5C]"}
              disabled={formData.quantity < 1 || (formData.type === 'checkout' && formData.quantity > item.quantity_in_stock)}
            >
              {formData.type === 'checkout' ? 'Checkout' : 'Restock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScanModal({ open, onClose, items, onItemFound }) {
  const [scanInput, setScanInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setScanInput('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleScan = (e) => {
    e.preventDefault();
    const found = items.find(i => 
      i.barcode?.toLowerCase() === scanInput.toLowerCase() ||
      i.sku?.toLowerCase() === scanInput.toLowerCase()
    );
    if (found) {
      onItemFound(found);
    } else {
      alert('Item not found');
    }
    setScanInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-[#0069AF]" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleScan} className="space-y-4 mt-4">
          <p className="text-sm text-slate-500">Scan a barcode or enter SKU/barcode manually</p>
          <Input
            ref={inputRef}
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Scan or type barcode..."
            className="text-lg font-mono"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#0069AF] hover:bg-[#133F5C]">
              Find Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
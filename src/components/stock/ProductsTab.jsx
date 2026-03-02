import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Package, Edit2, Trash2, Filter, X, ChevronDown, Minus, RotateCcw, History, Loader2, MessageSquare, ExternalLink, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import ProductModal from './ProductModal';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export default function ProductsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedManufacturers, setSelectedManufacturers] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.filter({ status: { $ne: 'archived' } })
  });

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: products = [], refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list('-created_date'),
    staleTime: 300000
  });

  // Get unique manufacturers and tags for filters
  const allManufacturers = [...new Set(products.map(p => p.manufacturer).filter(Boolean))].sort();
  const allTags = [...new Set(products.flatMap(p => p.tags || []))].sort();

  const filteredProducts = products.filter(p => {
    // Search filter
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Stock filter
    const matchesStock = 
      stockFilter === 'all' ||
      (stockFilter === 'in_stock' && (p.quantity_on_hand || 0) > 0) ||
      (stockFilter === 'out_of_stock' && (p.quantity_on_hand || 0) === 0) ||
      (stockFilter === 'low_stock' && (p.quantity_on_hand || 0) > 0 && (p.quantity_on_hand || 0) <= 5);
    
    // Manufacturer filter
    const matchesManufacturer = selectedManufacturers.length === 0 || selectedManufacturers.includes(p.manufacturer);
    
    // Tags filter
    const matchesTags = selectedTags.length === 0 || selectedTags.some(t => p.tags?.includes(t));
    
    return matchesSearch && matchesStock && matchesManufacturer && matchesTags;
  });

  const activeFiltersCount = (stockFilter !== 'all' ? 1 : 0) + selectedManufacturers.length + selectedTags.length;

  const clearAllFilters = () => {
    setStockFilter('all');
    setSelectedManufacturers([]);
    setSelectedTags([]);
  };

  // Quick-take state (hover action on card)
  const [quickAction, setQuickAction] = useState(null); // { productId, type }
  const [quickData, setQuickData] = useState({ quantity: 1, project_id: '', notes: '' });
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState(null);

  const handleProductClick = (product) => {
    if (quickAction?.productId === product.id) return; // don't open view while quick-action is open
    setViewingProduct(product);
  };

  const openQuickAction = (e, product, type) => {
    e.stopPropagation();
    setQuickAction({ productId: product.id, type });
    setQuickData({ quantity: 1, project_id: '', notes: '' });
    setQuickError(null);
  };

  const cancelQuickAction = (e) => {
    if (e) e.stopPropagation();
    setQuickAction(null);
    setQuickData({ quantity: 1, project_id: '', notes: '' });
    setQuickError(null);
  };

  const submitQuickAction = async (e) => {
    if (e) e.stopPropagation();
    if (!quickAction || quickSubmitting) return;
    if (!quickData.notes.trim()) return; // notes mandatory
    setQuickSubmitting(true);
    setQuickError(null);
    try {
      const product = products.find(p => p.id === quickAction.productId);
      const qty = Number(quickData.quantity) || 1;
      const isRestock = quickAction.type === 'restock';

      // Record the transaction
      await api.entities.ProductTransaction.create({
        product_id: quickAction.productId,
        type: quickAction.type,
        quantity: qty,
        project_id: quickData.project_id || null,
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || currentUser?.email || '',
        notes: quickData.notes.trim()
      });

      // Update product quantity: restock adds, take subtracts
      const currentQty = product.quantity_on_hand || 0;
      const newQty = isRestock ? currentQty + qty : currentQty - qty;
      await api.entities.Product.update(quickAction.productId, { quantity_on_hand: Math.max(0, newQty) });

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productTransactions', quickAction.productId] });
      refetch();
      setQuickAction(null);
      setQuickData({ quantity: 1, project_id: '', notes: '' });
    } catch (err) {
      console.error('Quick action failed:', err);
      setQuickError(err.message || 'Action failed. Please try again.');
    }
    setQuickSubmitting(false);
  };

  const handleSave = async (data) => {
    if (editingProduct) {
      await api.entities.Product.update(editingProduct.id, data);
    } else {
      await api.entities.Product.create(data);
    }
    refetch();
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await api.entities.Product.delete(deleteConfirm.id);
      refetch();
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stock Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Stock
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuCheckboxItem checked={stockFilter === 'all'} onCheckedChange={() => setStockFilter('all')}>
              All Products
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={stockFilter === 'in_stock'} onCheckedChange={() => setStockFilter('in_stock')}>
              In Stock
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={stockFilter === 'low_stock'} onCheckedChange={() => setStockFilter('low_stock')}>
              Low Stock (≤5)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={stockFilter === 'out_of_stock'} onCheckedChange={() => setStockFilter('out_of_stock')}>
              Out of Stock
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Manufacturer Filter */}
        {allManufacturers.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Manufacturer
                {selectedManufacturers.length > 0 && (
                  <Badge className="ml-1 h-5 w-5 p-0 justify-center bg-[#0069AF]">{selectedManufacturers.length}</Badge>
                )}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {allManufacturers.map(mfr => (
                <DropdownMenuCheckboxItem 
                  key={mfr} 
                  checked={selectedManufacturers.includes(mfr)}
                  onCheckedChange={(checked) => {
                    setSelectedManufacturers(prev => 
                      checked ? [...prev, mfr] : prev.filter(m => m !== mfr)
                    );
                  }}
                >
                  {mfr}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Tags
                {selectedTags.length > 0 && (
                  <Badge className="ml-1 h-5 w-5 p-0 justify-center bg-[#0069AF]">{selectedTags.length}</Badge>
                )}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {allTags.map(tag => (
                <DropdownMenuCheckboxItem 
                  key={tag} 
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={(checked) => {
                    setSelectedTags(prev => 
                      checked ? [...prev, tag] : prev.filter(t => t !== tag)
                    );
                  }}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-slate-500 hover:text-slate-700">
            <X className="w-4 h-4 mr-1" />
            Clear filters
          </Button>
        )}

        <div className="flex-1" />

        <span className="text-sm text-slate-500">{filteredProducts.length} products</span>

        <Button onClick={() => { setEditingProduct(null); setShowModal(true); }} className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Products Grid - Compact Tiles */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-[#0F2F44]/5 rounded-2xl border border-[#0F2F44]/10">
          <Package className="w-12 h-12 mx-auto text-[#0F2F44]/30 mb-4" />
          <h3 className="text-lg font-medium text-[#0F2F44] mb-2">
            {products.length === 0 ? 'No products yet' : 'No products match filters'}
          </h3>
          <p className="text-[#0F2F44]/60 mb-4">
            {products.length === 0 ? 'Add your first product to get started' : 'Try adjusting your filters'}
          </p>
          {products.length === 0 ? (
            <Button onClick={() => setShowModal(true)} className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          ) : (
            <Button variant="outline" onClick={clearAllFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredProducts.map((product) => {
            const isQuickOpen = quickAction?.productId === product.id;
            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className={cn(
                  "bg-white rounded-lg border overflow-hidden transition-all cursor-pointer group relative",
                  isQuickOpen ? "border-[#0069AF] shadow-md ring-1 ring-[#0069AF]/20" : "border-slate-200 hover:shadow-md hover:border-[#0069AF]/30"
                )}
              >
                {/* Image - Square thumbnail */}
                <div className="aspect-square bg-slate-50 relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-slate-200" />
                    </div>
                  )}
                  {/* Stock badge overlay */}
                  <div className="absolute top-1.5 right-1.5">
                    <Badge
                      variant={product.quantity_on_hand > 0 ? "default" : "destructive"}
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        product.quantity_on_hand > 0 ? "bg-emerald-500 text-white" : ""
                      )}
                    >
                      {product.quantity_on_hand || 0}
                    </Badge>
                  </div>
                  {/* Delete button overlay */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(product); }}
                    className="absolute top-1.5 left-1.5 p-1 rounded bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Hover action buttons */}
                  {!isQuickOpen && (
                    <div className="absolute bottom-0 inset-x-0 flex gap-1 p-1.5 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openQuickAction(e, product, 'take')}
                        disabled={(product.quantity_on_hand || 0) === 0}
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-white bg-[#0069AF]/90 hover:bg-[#0069AF] rounded py-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-3 h-3" />Take
                      </button>
                      <button
                        onClick={(e) => openQuickAction(e, product, 'restock')}
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-white bg-emerald-600/90 hover:bg-emerald-600 rounded py-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />Restock
                      </button>
                    </div>
                  )}
                </div>

                {/* Details - Compact */}
                <div className="p-2">
                  <h3 className="font-medium text-slate-900 text-sm truncate" title={product.name}>{product.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">${product.cost?.toFixed(2) || '0.00'}</span>
                    <span className="text-xs font-medium text-emerald-600">${product.selling_price?.toFixed(2) || '0.00'}</span>
                  </div>
                  {product.manufacturer && (
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{product.manufacturer}</p>
                  )}
                </div>

                {/* Quick action inline panel */}
                {isQuickOpen && (
                  <div
                    className="border-t bg-slate-50 p-2.5 space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs font-semibold text-slate-700">
                      {quickAction.type === 'take' ? '📦 Take from Stock' : '📦 Restock'}
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 font-medium">Qty</label>
                        <Input
                          type="number"
                          min={1}
                          max={quickAction.type === 'take' ? (product.quantity_on_hand || 0) : 9999}
                          value={quickData.quantity}
                          onChange={(e) => setQuickData(p => ({ ...p, quantity: e.target.value }))}
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                      <div className="flex-[2]">
                        <label className="text-[10px] text-slate-500 font-medium">Project</label>
                        <Select value={quickData.project_id} onValueChange={(v) => setQuickData(p => ({ ...p, project_id: v }))}>
                          <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Comment <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        value={quickData.notes}
                        onChange={(e) => setQuickData(p => ({ ...p, notes: e.target.value }))}
                        className="mt-0.5 h-14 text-xs resize-none"
                        placeholder="Required — why are you taking/restocking?"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={cancelQuickAction} className="flex-1 h-7 text-xs">
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={submitQuickAction}
                        disabled={quickSubmitting || !quickData.notes.trim() || !quickData.quantity}
                        className={cn(
                          "flex-1 h-7 text-xs",
                          quickAction.type === 'take' ? 'bg-[#0069AF] hover:bg-[#133F5C]' : 'bg-emerald-600 hover:bg-emerald-700'
                        )}
                      >
                        {quickSubmitting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                        Confirm
                      </Button>
                    </div>
                    {!quickData.notes.trim() && (
                      <p className="text-[10px] text-red-500 text-center">A comment is required</p>
                    )}
                    {quickError && (
                      <p className="text-[10px] text-red-600 bg-red-50 rounded p-1.5 text-center">{quickError}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View Modal */}
      <ProductViewModal
        open={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        product={viewingProduct}
        projects={projects}
        currentUser={currentUser}
        queryClient={queryClient}
        onEdit={(p) => { setViewingProduct(null); setEditingProduct(p); setShowModal(true); }}
        onRefetch={refetch}
      />

      <ProductModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingProduct(null); }}
        product={editingProduct}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteConfirm?.name}".
            </AlertDialogDescription>
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

function ProductViewModal({ open, onClose, product, projects, currentUser, queryClient, onEdit, onRefetch }) {
  const [activeAction, setActiveAction] = useState(null);
  const [actionData, setActionData] = useState({ quantity: 1, project_id: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: transactions = [] } = useQuery({
    queryKey: ['productTransactions', product?.id],
    queryFn: () => api.entities.ProductTransaction.filter({ product_id: product.id }, '-created_date'),
    enabled: !!product?.id
  });

  useEffect(() => {
    setActiveAction(null);
    setActionData({ quantity: 1, project_id: '', notes: '' });
    setActionError(null);
    setShowHistory(false);
  }, [product, open]);

  if (!product) return null;

  const handleAction = async () => {
    if (!activeAction || submitting || !actionData.notes.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const qty = Number(actionData.quantity) || 1;
      const isRestock = activeAction === 'restock';

      // Record the transaction
      await api.entities.ProductTransaction.create({
        product_id: product.id,
        type: activeAction,
        quantity: qty,
        project_id: actionData.project_id || null,
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || currentUser?.email || '',
        notes: actionData.notes.trim()
      });

      // Update product quantity: restock adds, take subtracts
      const currentQty = product.quantity_on_hand || 0;
      const newQty = isRestock ? currentQty + qty : currentQty - qty;
      await api.entities.Product.update(product.id, { quantity_on_hand: Math.max(0, newQty) });

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productTransactions', product.id] });
      onRefetch();
      setActiveAction(null);
      setActionData({ quantity: 1, project_id: '', notes: '' });
    } catch (err) {
      console.error('Action failed:', err);
      setActionError(err.message || 'Action failed. Please try again.');
    }
    setSubmitting(false);
  };

  const txConfig = {
    take: { label: 'Taken', color: 'bg-blue-100 text-blue-700', sign: '-' },
    restock: { label: 'Restocked', color: 'bg-emerald-100 text-emerald-700', sign: '+' },
  };
  const displayedTx = showHistory ? transactions : transactions.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold truncate">{product.name}</p>
              {product.manufacturer && <p className="text-sm font-normal text-slate-500">{product.manufacturer}</p>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            {product.sku && <div><p className="text-xs text-slate-500">SKU</p><p className="text-sm font-medium">{product.sku}</p></div>}
            {product.tags?.length > 0 && (
              <div className="col-span-2"><p className="text-xs text-slate-500 mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">{product.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="text-center"><p className="text-xs text-slate-500">In Stock</p><p className={cn("text-lg font-bold", (product.quantity_on_hand || 0) === 0 ? "text-red-600" : "text-slate-900")}>{product.quantity_on_hand || 0}</p></div>
            <div className="text-center"><p className="text-xs text-slate-500">Cost</p><p className="text-sm font-medium text-slate-900">${product.cost?.toFixed(2) || '0.00'}</p></div>
            <div className="text-center"><p className="text-xs text-slate-500">Sell Price</p><p className="text-sm font-medium text-emerald-600">${product.selling_price?.toFixed(2) || '0.00'}</p></div>
          </div>

          {product.description && <div><p className="text-xs text-slate-500 mb-1">Description</p><p className="text-sm text-slate-700 line-clamp-3">{product.description}</p></div>}

          {/* Supplier / Where to Buy */}
          {(product.supplier_name || product.supplier_url) && (
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
              <ShoppingCart className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-blue-600 font-medium">Where to Buy</p>
                {product.supplier_url ? (
                  <a
                    href={product.supplier_url.startsWith('http') ? product.supplier_url : `https://${product.supplier_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {product.supplier_name || new URL(product.supplier_url.startsWith('http') ? product.supplier_url : `https://${product.supplier_url}`).hostname.replace('www.', '')}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-slate-700">{product.supplier_name}</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Button size="sm" variant={activeAction === 'take' ? 'default' : 'outline'} onClick={() => setActiveAction(activeAction === 'take' ? null : 'take')} disabled={(product.quantity_on_hand || 0) === 0} className={activeAction === 'take' ? 'bg-[#0069AF] hover:bg-[#133F5C]' : ''}>
              <Minus className="w-3.5 h-3.5 mr-1.5" />Take
            </Button>
            <Button size="sm" variant={activeAction === 'restock' ? 'default' : 'outline'} onClick={() => setActiveAction(activeAction === 'restock' ? null : 'restock')} className={activeAction === 'restock' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Restock
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => onEdit(product)}>
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit
            </Button>
          </div>

          {/* Inline Action Panel */}
          {activeAction && (
            <div className="p-3 bg-slate-50 rounded-lg border space-y-3">
              <p className="text-sm font-semibold text-slate-700">{activeAction === 'take' ? 'Take from Stock' : 'Restock'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" min={1} max={activeAction === 'take' ? (product.quantity_on_hand || 0) : 9999} value={actionData.quantity} onChange={(e) => setActionData(p => ({ ...p, quantity: e.target.value }))} className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">Project (optional)</Label>
                  <Select value={actionData.project_id} onValueChange={(v) => setActionData(p => ({ ...p, project_id: v }))}>
                    <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Comment <span className="text-red-500">*</span>
                </Label>
                <Textarea value={actionData.notes} onChange={(e) => setActionData(p => ({ ...p, notes: e.target.value }))} className="mt-1 h-16 text-sm" placeholder="Required — why are you taking/restocking?" />
                {!actionData.notes.trim() && <p className="text-[10px] text-red-500 mt-1">A comment is required</p>}
              </div>
              {actionError && (
                <p className="text-xs text-red-600 bg-red-50 rounded p-2">{actionError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => { setActiveAction(null); setActionError(null); }}>Cancel</Button>
                <Button size="sm" onClick={handleAction} disabled={submitting || !actionData.quantity || !actionData.notes.trim()} className={activeAction === 'take' ? 'bg-[#0069AF] hover:bg-[#133F5C]' : 'bg-emerald-600 hover:bg-emerald-700'}>
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Confirm {activeAction === 'take' ? 'Take' : 'Restock'}
                </Button>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="border-t pt-3">
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 w-full">
              <History className="w-4 h-4" />History ({transactions.length})
              {showHistory ? <X className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
            </button>
            {(showHistory || transactions.length > 0) && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {displayedTx.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">No transactions yet</p>
                ) : displayedTx.map((tx) => {
                  const cfg = txConfig[tx.type] || txConfig.take;
                  const proj = projects.find(p => p.id === tx.project_id);
                  return (
                    <div key={tx.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-slate-50">
                      <Badge className={cn("text-[10px] px-1.5 py-0", cfg.color)}>{cfg.label}</Badge>
                      <span className="font-semibold text-slate-700">{cfg.sign}{tx.quantity}</span>
                      {proj && <span className="text-slate-500 truncate">→ {proj.name}</span>}
                      <span className="text-slate-400 ml-auto shrink-0">{tx.user_name?.split(' ')[0]}</span>
                      <span className="text-slate-400 shrink-0">{tx.created_date ? format(new Date(tx.created_date), 'MMM d') : ''}</span>
                    </div>
                  );
                })}
                {!showHistory && transactions.length > 5 && (
                  <button onClick={() => setShowHistory(true)} className="text-xs text-[#0069AF] hover:underline w-full text-center py-1">Show all {transactions.length}</button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
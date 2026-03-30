import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Package, Edit2, Trash2, SlidersHorizontal, Building2, Tag, PackagePlus, X, ChevronDown, Minus, RotateCcw, History, Loader2, MessageSquare, ExternalLink, ShoppingCart, MapPin, ScanLine } from 'lucide-react';
import { isNative } from '@/lib/capacitor';
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

  const { data: products = [], refetch, isLoading } = useQuery({
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

  const handleBarcodeScan = async () => {
    if (!isNative()) return;
    try {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) return alert('Barcode scanning not supported on this device');

      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted') return alert('Camera permission required for scanning');

      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes.length > 0) {
        const scannedValue = barcodes[0].rawValue;
        // Try to find a matching product by SKU or barcode
        const match = products.find(p =>
          p.sku?.toLowerCase() === scannedValue.toLowerCase() ||
          p.barcode?.toLowerCase() === scannedValue.toLowerCase() ||
          p.name?.toLowerCase().includes(scannedValue.toLowerCase())
        );
        if (match) {
          setViewingProduct(match);
        } else {
          setSearchQuery(scannedValue);
        }
      }
    } catch (err) {
      console.error('Scan failed:', err);
    }
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
    try {
      if (editingProduct) {
        await api.entities.Product.update(editingProduct.id, data);
      } else {
        await api.entities.Product.create(data);
      }
      refetch();
      setShowModal(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Product save failed:', err);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        await api.entities.Product.delete(deleteConfirm.id);
        refetch();
        setDeleteConfirm(null);
      } catch (err) {
        console.error('Product delete failed:', err);
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="space-y-3 mb-4">
        {/* Search Row */}
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters + Actions Row */}
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap sm:flex-wrap pb-1 sm:pb-0">
          {/* Stock Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Stock</span>
                {stockFilter !== 'all' && <Badge className="h-5 w-5 p-0 justify-center bg-[#0069AF]">1</Badge>}
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
                <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex">
                  <Building2 className="w-4 h-4" />
                  <span>Manufacturer</span>
                  {selectedManufacturers.length > 0 && (
                    <Badge className="h-5 w-5 p-0 justify-center bg-[#0069AF]">{selectedManufacturers.length}</Badge>
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
                <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex">
                  <Tag className="w-4 h-4" />
                  <span>Tags</span>
                  {selectedTags.length > 0 && (
                    <Badge className="h-5 w-5 p-0 justify-center bg-[#0069AF]">{selectedTags.length}</Badge>
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
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Clear filters</span>
            </Button>
          )}

          {/* Scan button — mobile only */}
          {isNative() && (
            <Button variant="outline" size="sm" onClick={handleBarcodeScan} className="sm:hidden gap-1.5 ml-auto">
              <ScanLine className="w-4 h-4" />
            </Button>
          )}

          <div className="flex-1 hidden sm:block" />

          <div className="flex-shrink-0 flex items-center gap-3 ml-auto">
            <span className="text-xs text-muted-foreground hidden sm:inline">{filteredProducts.length} products</span>
            <Button onClick={() => { setEditingProduct(null); setShowModal(true); }} className="hidden sm:flex bg-[#0F2F44] hover:bg-[#1a4a6e] text-white" size="sm">
              <PackagePlus className="w-4 h-4 mr-1.5" />
              Add Product
            </Button>
          </div>
        </div>
      </div>

      {/* Products List — Compact rows */}
      {isLoading ? (
        <div className="rounded-2xl border bg-card overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border bg-card py-16 text-center">
          <Package className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-base font-medium text-foreground mb-1">
            {products.length === 0 ? 'No products yet' : 'No products match filters'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {products.length === 0 ? 'Add your first product to get started' : 'Try adjusting your filters'}
          </p>
          {products.length === 0 ? (
            <Button onClick={() => setShowModal(true)} className="hidden sm:flex bg-[#0F2F44] hover:bg-[#1a4a6e]">
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
        <div className="rounded-2xl border bg-card shadow-warm overflow-hidden">
          {/* List header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
            <div className="col-span-3">Product</div>
            <div className="col-span-2">Brand / Model</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-1 text-center">Stock</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">SKU</div>
          </div>

          {/* Product rows */}
          {filteredProducts.map((product) => {
            const stockLevel = product.quantity_on_hand || 0;
            const isLow = stockLevel > 0 && stockLevel <= 5;
            const isOut = stockLevel === 0;

            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className={cn(
                  "sm:grid sm:grid-cols-12 gap-2 px-4 py-2.5 sm:py-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors items-center",
                  isOut && "bg-red-50/50 dark:bg-red-900/10",
                  isLow && "bg-amber-50/50 dark:bg-amber-900/10"
                )}
              >
                {/* Mobile: full-width row */}
                <div className="sm:hidden flex items-center gap-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-11 h-11 rounded-xl object-cover border border-border flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
                      <Package className="w-4.5 h-4.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                    {product.manufacturer && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{product.manufacturer}{product.sku ? ` · ${product.sku}` : ''}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn("text-xs font-bold tabular-nums px-2 py-0.5 rounded-lg", isOut ? "text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-900/30" : isLow ? "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-900/30" : "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-900/20")}>
                      {stockLevel}
                    </span>
                    {product.selling_price > 0 && (
                      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">${(product.selling_price).toFixed(2)}</span>
                    )}
                  </div>
                </div>

                {/* Desktop: grid columns */}
                {/* Product name + image */}
                <div className="hidden sm:flex col-span-3 items-center gap-3 min-w-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    {product.tags?.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {product.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0 rounded bg-muted text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Brand / Model */}
                <div className="hidden sm:block col-span-2 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{product.manufacturer || '—'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{product.model || product.sku || '—'}</p>
                </div>

                {/* Location */}
                <div className="hidden sm:block col-span-2 min-w-0">
                  <span className="text-xs text-muted-foreground truncate">{product.stock_location || product.location || '—'}</span>
                </div>

                {/* Stock level */}
                <div className="hidden sm:flex col-span-1 justify-center">
                  <span className={cn(
                    "text-sm font-bold tabular-nums px-2 py-0.5 rounded-md",
                    isOut ? "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30" :
                    isLow ? "text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30" :
                    "text-foreground"
                  )}>
                    {stockLevel}
                  </span>
                </div>

                {/* Price */}
                <div className="hidden sm:block col-span-2">
                  <p className="text-sm font-medium text-foreground">${(product.selling_price || 0).toFixed(2)}</p>
                  {product.cost > 0 && (
                    <p className="text-[10px] text-muted-foreground">cost: ${product.cost.toFixed(2)}</p>
                  )}
                </div>

                {/* SKU */}
                <div className="hidden sm:block col-span-2 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground truncate">{product.sku || '—'}</span>
                </div>
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

  const stockLevel = product.quantity_on_hand || 0;
  const stockIsOut = stockLevel === 0;
  const stockIsLow = stockLevel > 0 && stockLevel <= 5;
  const stockColor = stockIsOut
    ? 'text-red-500 bg-red-500/10 border-red-500/20'
    : stockIsLow
    ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  const location = product.stock_location || product.location;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent hideCloseOnMobile className="sm:max-w-lg sm:max-h-[90vh] overflow-y-auto no-scrollbar !bg-white dark:!bg-[#0a1e2e] border-border p-0 pb-[env(safe-area-inset-bottom)]">
        {/* Mobile close bar */}
        <div className="sm:hidden flex items-center px-4 pt-3">
          <button onClick={() => onClose(false)} className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
            <X className="w-4 h-4" /> Close
          </button>
        </div>
        {/* Header Section */}
        <div className="flex items-start gap-4 p-6 pt-3 sm:pt-6 pb-0">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-16 h-16 rounded-2xl object-cover border border-border flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
              <Package className="w-7 h-7 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-lg font-bold text-foreground truncate leading-tight">{product.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[product.manufacturer, product.sku].filter(Boolean).join(' \u00B7 ')}
            </p>
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {product.tags.map((t, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-muted/70 text-muted-foreground border border-border/50 font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-8 sm:pb-6 space-y-5 mt-5">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className={cn(
              "rounded-xl border p-3 text-center transition-all duration-200",
              stockColor
            )}>
              <p className="text-xs text-current/70 font-medium uppercase tracking-wide">In Stock</p>
              <p className="text-xl font-bold mt-1 tabular-nums">{stockLevel}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cost</p>
              <p className="text-xl font-bold text-foreground mt-1 tabular-nums">${product.cost?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Price</p>
              <p className="text-xl font-bold text-emerald-500 mt-1 tabular-nums">${product.selling_price?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{location}</span>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Supplier / Where to Buy */}
          {(product.supplier_name || product.supplier_url) && (
            <div className="flex items-center gap-2.5 p-3 bg-blue-500/5 rounded-xl border border-blue-500/15">
              <ShoppingCart className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-blue-400 font-medium uppercase tracking-wide">Where to Buy</p>
                {product.supplier_url ? (
                  <a
                    href={product.supplier_url.startsWith('http') ? product.supplier_url : `https://${product.supplier_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 truncate transition-colors duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {product.supplier_name || new URL(product.supplier_url.startsWith('http') ? product.supplier_url : `https://${product.supplier_url}`).hostname.replace('www.', '')}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-foreground">{product.supplier_name}</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <Button
              size="sm"
              variant={activeAction === 'take' ? 'default' : 'outline'}
              onClick={() => setActiveAction(activeAction === 'take' ? null : 'take')}
              disabled={stockIsOut}
              className={cn(
                "h-10 cursor-pointer transition-all duration-200",
                activeAction === 'take'
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                  : 'hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30'
              )}
            >
              <Minus className="w-4 h-4 mr-1.5" />Take
            </Button>
            <Button
              size="sm"
              variant={activeAction === 'restock' ? 'default' : 'outline'}
              onClick={() => setActiveAction(activeAction === 'restock' ? null : 'restock')}
              className={cn(
                "h-10 cursor-pointer transition-all duration-200",
                activeAction === 'restock'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                  : 'hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30'
              )}
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />Restock
            </Button>
            <Button
              size="sm"
              onClick={() => onEdit(product)}
              className="hidden sm:flex h-10 cursor-pointer bg-[#0F2F44] hover:bg-[#1a4a6e] text-white transition-all duration-200"
            >
              <Edit2 className="w-4 h-4 mr-1.5" />Edit
            </Button>
          </div>

          {/* Inline Action Panel */}
          {activeAction && (
            <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
              <p className="text-sm font-semibold text-foreground">{activeAction === 'take' ? 'Take from Stock' : 'Restock'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input type="number" min={1} max={activeAction === 'take' ? stockLevel : 9999} value={actionData.quantity} onChange={(e) => setActionData(p => ({ ...p, quantity: e.target.value }))} className="mt-1 h-9 bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Project (optional)</Label>
                  <Select value={actionData.project_id} onValueChange={(v) => setActionData(p => ({ ...p, project_id: v }))}>
                    <SelectTrigger className="mt-1 h-9 bg-background"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Comment <span className="text-red-500">*</span>
                </Label>
                <Textarea value={actionData.notes} onChange={(e) => setActionData(p => ({ ...p, notes: e.target.value }))} className="mt-1 h-16 text-sm bg-background" placeholder="Required — why are you taking/restocking?" />
                {!actionData.notes.trim() && <p className="text-[10px] text-red-500 mt-1">A comment is required</p>}
              </div>
              {actionError && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2.5 border border-red-500/20">{actionError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => { setActiveAction(null); setActionError(null); }} className="cursor-pointer">Cancel</Button>
                <Button size="sm" onClick={handleAction} disabled={submitting || !actionData.quantity || !actionData.notes.trim()} className={cn("cursor-pointer", activeAction === 'take' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700')}>
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Confirm {activeAction === 'take' ? 'Take' : 'Restock'}
                </Button>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full cursor-pointer transition-colors duration-200"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", showHistory && "rotate-180")} />
              <History className="w-4 h-4" />
              History ({transactions.length})
            </button>
            {(showHistory || transactions.length > 0) && (
              <div className="mt-3 space-y-1 max-h-52 overflow-y-auto">
                {displayedTx.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No transactions yet</p>
                ) : displayedTx.map((tx) => {
                  const cfg = txConfig[tx.type] || txConfig.take;
                  const proj = projects.find(p => p.id === tx.project_id);
                  return (
                    <div key={tx.id} className="flex items-center gap-2.5 text-xs py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors duration-150">
                      <Badge className={cn("text-[10px] px-2 py-0.5 font-medium", cfg.color)}>{cfg.label}</Badge>
                      <span className="font-bold text-foreground tabular-nums">{cfg.sign}{tx.quantity}</span>
                      {proj && <span className="text-muted-foreground truncate">→ {proj.name}</span>}
                      <span className="text-muted-foreground ml-auto shrink-0">{tx.user_name?.split(' ')[0] || tx.user_email}</span>
                      <span className="text-muted-foreground/60 shrink-0">{tx.created_date ? format(new Date(tx.created_date), 'MMM d') : ''}</span>
                    </div>
                  );
                })}
                {!showHistory && transactions.length > 5 && (
                  <button onClick={() => setShowHistory(true)} className="text-xs text-[#22C55E] hover:underline w-full text-center py-1.5 cursor-pointer transition-colors duration-200">Show all {transactions.length}</button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Package, Edit2, Trash2, Filter, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductModal from './ProductModal';
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
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'in_stock', 'out_of_stock', 'low_stock'
  const [selectedManufacturers, setSelectedManufacturers] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

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

  const handleProductClick = (product) => {
    setEditingProduct(product);
    setShowModal(true);
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
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md hover:border-[#0069AF]/30 transition-all cursor-pointer group"
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
            </div>
          ))}
        </div>
      )}

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
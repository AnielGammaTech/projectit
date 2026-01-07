import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Package, Edit2, Trash2, ImagePlus } from 'lucide-react';
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

export default function ProductsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: products = [], refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date'),
    staleTime: 300000
  });

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSave = async (data) => {
    if (editingProduct) {
      await base44.entities.Product.update(editingProduct.id, data);
    } else {
      await base44.entities.Product.create(data);
    }
    refetch();
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await base44.entities.Product.delete(deleteConfirm.id);
      refetch();
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => { setEditingProduct(null); setShowModal(true); }} className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-[#0F2F44]/5 rounded-2xl border border-[#0F2F44]/10">
          <Package className="w-12 h-12 mx-auto text-[#0F2F44]/30 mb-4" />
          <h3 className="text-lg font-medium text-[#0F2F44] mb-2">No products yet</h3>
          <p className="text-[#0F2F44]/60 mb-4">Add your first product to get started</p>
          <Button onClick={() => setShowModal(true)} className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group"
            >
              {/* Image */}
              <div className="aspect-square bg-slate-100 relative">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-slate-300" />
                  </div>
                )}
                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingProduct(product); setShowModal(true); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(product)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 truncate">{product.name}</h3>
                {product.sku && <p className="text-xs text-slate-500 mb-2">SKU: {product.sku}</p>}
                
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs text-slate-500">Cost</span>
                    <p className="font-medium text-slate-700">${product.cost?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Price</span>
                    <p className="font-medium text-emerald-600">${product.selling_price?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant={product.quantity_on_hand > 0 ? "default" : "destructive"} className={product.quantity_on_hand > 0 ? "bg-emerald-100 text-emerald-700" : ""}>
                    {product.quantity_on_hand || 0} in stock
                  </Badge>
                  {product.manufacturer && (
                    <span className="text-xs text-slate-500 truncate max-w-[100px]">{product.manufacturer}</span>
                  )}
                </div>

                {product.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {product.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
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
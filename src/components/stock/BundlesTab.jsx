import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Layers, Edit2, Trash2, Package, Wrench } from 'lucide-react';
import BundleModal from './BundleModal';
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

export default function BundlesTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: bundles = [], refetch } = useQuery({
    queryKey: ['bundles'],
    queryFn: () => base44.entities.ServiceBundle.list('-created_date'),
    staleTime: 300000
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    staleTime: 300000
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list(),
    staleTime: 300000
  });

  const filteredBundles = bundles.filter(b =>
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getProductName = (id) => products.find(p => p.id === id)?.name || 'Unknown';
  const getServiceName = (id) => services.find(s => s.id === id)?.name || 'Unknown';

  const calculateBundleValue = (bundle) => {
    let total = 0;
    bundle.products?.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) total += (product.selling_price || 0) * (item.quantity || 1);
    });
    bundle.services?.forEach(item => {
      const service = services.find(s => s.id === item.service_id);
      const rate = service?.rates?.find(r => r.name === item.rate_name);
      if (rate) total += rate.price * (item.quantity || 1);
    });
    return total;
  };

  const handleSave = async (data) => {
    if (editingBundle) {
      await base44.entities.ServiceBundle.update(editingBundle.id, data);
    } else {
      await base44.entities.ServiceBundle.create(data);
    }
    refetch();
    setShowModal(false);
    setEditingBundle(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await base44.entities.ServiceBundle.delete(deleteConfirm.id);
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
            placeholder="Search bundles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => { setEditingBundle(null); setShowModal(true); }} className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
          <Plus className="w-4 h-4 mr-2" />
          Create Bundle
        </Button>
      </div>

      {/* Bundles Grid */}
      {filteredBundles.length === 0 ? (
        <div className="text-center py-16 bg-[#0F2F44]/5 rounded-2xl border border-[#0F2F44]/10">
          <Layers className="w-12 h-12 mx-auto text-[#0F2F44]/30 mb-4" />
          <h3 className="text-lg font-medium text-[#0F2F44] mb-2">No bundles yet</h3>
          <p className="text-[#0F2F44]/60 mb-4">Create a bundle of products and services</p>
          <Button onClick={() => setShowModal(true)} className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
            <Plus className="w-4 h-4 mr-2" />
            Create Bundle
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBundles.map((bundle) => {
            const calculatedValue = calculateBundleValue(bundle);
            const displayPrice = bundle.bundle_price || calculatedValue;
            const savings = bundle.bundle_price && calculatedValue > bundle.bundle_price 
              ? calculatedValue - bundle.bundle_price 
              : 0;

            return (
              <div
                key={bundle.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Image */}
                <div className="aspect-video bg-gradient-to-br from-[#0F2F44]/10 to-[#0F2F44]/5 relative">
                  {bundle.image_url ? (
                    <img src={bundle.image_url} alt={bundle.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers className="w-12 h-12 text-[#0F2F44]/30" />
                    </div>
                  )}
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { setEditingBundle(bundle); setShowModal(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(bundle)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">{bundle.name}</h3>
                  
                  {/* Bundle contents */}
                  <div className="space-y-1 mb-3 text-sm">
                    {bundle.products?.slice(0, 2).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-600">
                        <Package className="w-3 h-3" />
                        <span>{item.quantity}x {getProductName(item.product_id)}</span>
                      </div>
                    ))}
                    {bundle.services?.slice(0, 2).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-600">
                        <Wrench className="w-3 h-3" />
                        <span>{getServiceName(item.service_id)}</span>
                      </div>
                    ))}
                    {(bundle.products?.length > 2 || bundle.services?.length > 2) && (
                      <p className="text-xs text-slate-400">
                        +{Math.max(0, (bundle.products?.length || 0) - 2) + Math.max(0, (bundle.services?.length || 0) - 2)} more items
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-emerald-600">${displayPrice.toFixed(2)}</p>
                      {savings > 0 && (
                        <p className="text-xs text-slate-500">Save ${savings.toFixed(2)}</p>
                      )}
                    </div>
                    <Badge className="bg-[#0F2F44]/10 text-[#0F2F44]">
                      {(bundle.products?.length || 0) + (bundle.services?.length || 0)} items
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BundleModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingBundle(null); }}
        bundle={editingBundle}
        products={products}
        services={services}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bundle?</AlertDialogTitle>
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
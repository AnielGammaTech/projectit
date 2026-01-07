import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Wrench, Edit2, Trash2 } from 'lucide-react';
import ServiceModal from './ServiceModal';
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

export default function ServicesTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: services = [], refetch } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list('-created_date'),
    staleTime: 300000
  });

  const filteredServices = services.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSave = async (data) => {
    if (editingService) {
      await base44.entities.Service.update(editingService.id, data);
    } else {
      await base44.entities.Service.create(data);
    }
    refetch();
    setShowModal(false);
    setEditingService(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await base44.entities.Service.delete(deleteConfirm.id);
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
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => { setEditingService(null); setShowModal(true); }} className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-[#0F2F44]/5 rounded-2xl border border-[#0F2F44]/10">
          <Wrench className="w-12 h-12 mx-auto text-[#0F2F44]/30 mb-4" />
          <h3 className="text-lg font-medium text-[#0F2F44] mb-2">No services yet</h3>
          <p className="text-[#0F2F44]/60 mb-4">Add your first service to get started</p>
          <Button onClick={() => setShowModal(true)} className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group"
            >
              {/* Image */}
              <div className="aspect-video bg-slate-100 relative">
                {service.image_url ? (
                  <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Wrench className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingService(service); setShowModal(true); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(service)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 truncate mb-2">{service.name}</h3>
                
                {service.rates?.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {service.rates.slice(0, 3).map((rate, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{rate.name}</span>
                        <span className="font-medium text-emerald-600">${rate.price}/{rate.unit}</span>
                      </div>
                    ))}
                    {service.rates.length > 3 && (
                      <p className="text-xs text-slate-400">+{service.rates.length - 3} more rates</p>
                    )}
                  </div>
                )}

                {service.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {service.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingService(null); }}
        service={editingService}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
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
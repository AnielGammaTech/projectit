import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImagePlus, X, Plus, Trash2, Package, Wrench } from 'lucide-react';
import { api } from '@/api/apiClient';

export default function BundleModal({ open, onClose, bundle, products, services, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    products: [],
    services: [],
    bundle_price: '',
    tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (bundle) {
      setFormData({
        name: bundle.name || '',
        description: bundle.description || '',
        image_url: bundle.image_url || '',
        products: bundle.products || [],
        services: bundle.services || [],
        bundle_price: bundle.bundle_price || '',
        tags: bundle.tags || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        image_url: '',
        products: [],
        services: [],
        bundle_price: '',
        tags: []
      });
    }
  }, [bundle, open]);

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          setUploading(true);
          try {
            const { file_url } = await api.integrations.Core.UploadFile({ file });
            setFormData(prev => ({ ...prev, image_url: file_url }));
          } catch (err) {
            console.error('Upload failed:', err);
          }
          setUploading(false);
        }
      }
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        setFormData(prev => ({ ...prev, image_url: file_url }));
      } catch (err) {
        console.error('Upload failed:', err);
      }
      setUploading(false);
    }
  };

  const addProduct = (productId) => {
    if (productId && !formData.products.find(p => p.product_id === productId)) {
      setFormData(prev => ({
        ...prev,
        products: [...prev.products, { product_id: productId, quantity: 1 }]
      }));
    }
  };

  const updateProductQty = (productId, qty) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.product_id === productId ? { ...p, quantity: parseInt(qty) || 1 } : p
      )
    }));
  };

  const removeProduct = (productId) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.product_id !== productId)
    }));
  };

  const addService = (serviceId) => {
    if (serviceId) {
      const service = services.find(s => s.id === serviceId);
      const defaultRate = service?.rates?.[0]?.name || '';
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, { service_id: serviceId, rate_name: defaultRate, quantity: 1 }]
      }));
    }
  };

  const updateServiceRate = (index, rateName) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.map((s, i) => i === index ? { ...s, rate_name: rateName } : s)
    }));
  };

  const updateServiceQty = (index, qty) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.map((s, i) => i === index ? { ...s, quantity: parseInt(qty) || 1 } : s)
    }));
  };

  const removeService = (index) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const getProductName = (id) => products.find(p => p.id === id)?.name || 'Unknown';
  const getServiceName = (id) => services.find(s => s.id === id)?.name || 'Unknown';
  const getServiceRates = (id) => services.find(s => s.id === id)?.rates || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      bundle_price: formData.bundle_price ? parseFloat(formData.bundle_price) : null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle>{bundle ? 'Edit Bundle' : 'Create Bundle'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label>Image (paste or click to upload)</Label>
            <div 
              className="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#0F2F44]/50 transition-colors"
              onClick={() => document.getElementById('bundle-image-input').click()}
            >
              {formData.image_url ? (
                <div className="relative inline-block">
                  <img src={formData.image_url} alt="Bundle" className="max-h-32 rounded-lg mx-auto" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, image_url: '' })); }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="py-4">
                  <ImagePlus className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">
                    {uploading ? 'Uploading...' : 'Click or paste image'}
                  </p>
                </div>
              )}
            </div>
            <input
              id="bundle-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div>
              <Label>Bundle Price (optional)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Leave blank to auto-calculate"
                value={formData.bundle_price}
                onChange={(e) => setFormData(prev => ({ ...prev, bundle_price: e.target.value }))}
              />
            </div>
          </div>

          {/* Products */}
          <div>
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products
            </Label>
            <div className="space-y-2 mt-2">
              {formData.products.map((item) => (
                <div key={item.product_id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <span className="flex-1 font-medium truncate">{getProductName(item.product_id)}</span>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateProductQty(item.product_id, e.target.value)}
                    className="w-20"
                  />
                  <button type="button" onClick={() => removeProduct(item.product_id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <Select onValueChange={addProduct}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Add product..." />
              </SelectTrigger>
              <SelectContent>
                {products.filter(p => !formData.products.find(fp => fp.product_id === p.id)).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Services */}
          <div>
            <Label className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Services
            </Label>
            <div className="space-y-2 mt-2">
              {formData.services.map((item, i) => {
                const serviceRates = getServiceRates(item.service_id);
                return (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <span className="flex-1 font-medium truncate">{getServiceName(item.service_id)}</span>
                    {serviceRates.length > 0 && (
                      <Select value={item.rate_name} onValueChange={(v) => updateServiceRate(i, v)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceRates.map(r => (
                            <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateServiceQty(i, e.target.value)}
                      className="w-20"
                    />
                    <button type="button" onClick={() => removeService(i)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <Select onValueChange={addService}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Add service..." />
              </SelectTrigger>
              <SelectContent>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#0F2F44] hover:bg-[#1a4a6e]">
              {bundle ? 'Save Changes' : 'Create Bundle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
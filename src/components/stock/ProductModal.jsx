import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ImagePlus, X, Plus } from 'lucide-react';
import { api } from '@/api/apiClient';

export default function ProductModal({ open, onClose, product, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    image_url: '',
    cost: '',
    selling_price: '',
    quantity_on_hand: 0,
    manufacturer: '',
    tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        image_url: product.image_url || '',
        cost: product.cost || '',
        selling_price: product.selling_price || '',
        quantity_on_hand: product.quantity_on_hand || 0,
        manufacturer: product.manufacturer || '',
        tags: product.tags || []
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        description: '',
        image_url: '',
        cost: '',
        selling_price: '',
        quantity_on_hand: 0,
        manufacturer: '',
        tags: []
      });
    }
  }, [product, open]);

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

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      cost: parseFloat(formData.cost) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      quantity_on_hand: parseInt(formData.quantity_on_hand) || 0
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label>Image (paste or click to upload)</Label>
            <div 
              className="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#0F2F44]/50 transition-colors"
              onClick={() => document.getElementById('product-image-input').click()}
            >
              {formData.image_url ? (
                <div className="relative inline-block">
                  <img src={formData.image_url} alt="Product" className="max-h-32 rounded-lg mx-auto" />
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
              id="product-image-input"
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

            <div>
              <Label>SKU</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              />
            </div>

            <div>
              <Label>Manufacturer</Label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
              />
            </div>

            <div>
              <Label>Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
              />
            </div>

            <div>
              <Label>Selling Price</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
              />
            </div>

            <div>
              <Label>Quantity on Hand</Label>
              <Input
                type="number"
                value={formData.quantity_on_hand}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity_on_hand: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
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
              {product ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ImagePlus, X, Plus, Trash2 } from 'lucide-react';
import { api } from '@/api/apiClient';

export default function ServiceModal({ open, onClose, service, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    rates: [],
    tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [newRate, setNewRate] = useState({ name: '', price: '', unit: 'hour' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        description: service.description || '',
        image_url: service.image_url || '',
        rates: service.rates || [],
        tags: service.tags || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        image_url: '',
        rates: [],
        tags: []
      });
    }
  }, [service, open]);

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

  const addRate = () => {
    if (newRate.name && newRate.price) {
      setFormData(prev => ({
        ...prev,
        rates: [...prev.rates, { ...newRate, price: parseFloat(newRate.price) }]
      }));
      setNewRate({ name: '', price: '', unit: 'hour' });
    }
  };

  const removeRate = (index) => {
    setFormData(prev => ({
      ...prev,
      rates: prev.rates.filter((_, i) => i !== index)
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle>{service ? 'Edit Service' : 'Add Service'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label>Image (paste or click to upload)</Label>
            <div 
              className="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#0F2F44]/50 transition-colors"
              onClick={() => document.getElementById('service-image-input').click()}
            >
              {formData.image_url ? (
                <div className="relative inline-block">
                  <img src={formData.image_url} alt="Service" className="max-h-32 rounded-lg mx-auto" />
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
              id="service-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Rates */}
          <div>
            <Label>Pricing Rates</Label>
            <div className="space-y-2 mt-2">
              {formData.rates.map((rate, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <span className="flex-1 font-medium">{rate.name}</span>
                  <span className="text-emerald-600">${rate.price}/{rate.unit}</span>
                  <button type="button" onClick={() => removeRate(i)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Rate name"
                value={newRate.name}
                onChange={(e) => setNewRate(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Price"
                value={newRate.price}
                onChange={(e) => setNewRate(prev => ({ ...prev, price: e.target.value }))}
                className="w-24"
              />
              <Input
                placeholder="Unit"
                value={newRate.unit}
                onChange={(e) => setNewRate(prev => ({ ...prev, unit: e.target.value }))}
                className="w-20"
              />
              <Button type="button" variant="outline" onClick={addRate}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
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
              {service ? 'Save Changes' : 'Add Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
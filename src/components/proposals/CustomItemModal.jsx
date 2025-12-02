import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Image, Loader2, DollarSign, Percent, Package, Search, ShoppingCart, ExternalLink } from 'lucide-react';

export default function CustomItemModal({ 
  open, 
  onClose, 
  onAdd, 
  markupType = 'percentage',
  markupValue = 20,
  categories = [] 
}) {
  const [item, setItem] = useState({
    name: '',
    description: '',
    notes: '',
    quantity: 1,
    unit_cost: 0,
    unit_price: 0,
    image_url: ''
  });
  const [saveToInventory, setSaveToInventory] = useState(false);
  const [inventoryDetails, setInventoryDetails] = useState({
    sku: '',
    category: '',
    quantity_in_stock: 0
  });
  const [uploading, setUploading] = useState(false);
  const [useMarkup, setUseMarkup] = useState(true);
  
  // Amazon search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const calculatePrice = (cost) => {
    if (!useMarkup) return cost;
    if (markupType === 'percentage') {
      return cost * (1 + markupValue / 100);
    } else if (markupType === 'fixed') {
      return cost + markupValue;
    }
    return cost;
  };

  const handleCostChange = (cost) => {
    const newCost = parseFloat(cost) || 0;
    setItem(prev => ({
      ...prev,
      unit_cost: newCost,
      unit_price: useMarkup ? calculatePrice(newCost) : prev.unit_price
    }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setItem(prev => ({ ...prev, image_url: file_url }));
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!item.name) return;

    // If saving to inventory, create inventory item first
    if (saveToInventory) {
      await base44.entities.InventoryItem.create({
        name: item.name,
        description: item.description,
        unit_cost: item.unit_cost,
        sell_price: item.unit_price,
        image_url: item.image_url,
        sku: inventoryDetails.sku,
        category: inventoryDetails.category,
        quantity_in_stock: inventoryDetails.quantity_in_stock
      });
    }

    onAdd({
      type: 'custom',
      name: item.name,
      description: item.description,
      notes: item.notes,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      unit_price: item.unit_price,
      image_url: item.image_url
    });

    // Reset form
    setItem({ name: '', description: '', notes: '', quantity: 1, unit_cost: 0, unit_price: 0, image_url: '' });
    setSaveToInventory(false);
    setInventoryDetails({ sku: '', category: '', quantity_in_stock: 0 });
    onClose();
  };

  const profitMargin = item.unit_price > 0 && item.unit_cost > 0
    ? ((item.unit_price - item.unit_cost) / item.unit_price * 100).toFixed(1)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Custom Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Image Upload */}
          <div>
            <Label className="text-xs text-slate-500 uppercase">Item Image</Label>
            <div className="mt-1.5 flex items-start gap-3">
              {item.image_url ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setItem(p => ({ ...p, image_url: '' }))}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                  >×</button>
                </div>
              ) : (
                <label className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#0069AF] transition-colors">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <Image className="w-5 h-5 text-slate-400" />
                      <span className="text-[10px] text-slate-400 mt-1">Upload</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
              )}
              <div className="flex-1 space-y-2">
                <div>
                  <Label className="text-xs text-slate-500">Name *</Label>
                  <Input 
                    value={item.name}
                    onChange={(e) => setItem(p => ({ ...p, name: e.target.value }))}
                    className="h-9 mt-0.5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-slate-500">Description</Label>
            <Textarea
              value={item.description}
              onChange={(e) => setItem(p => ({ ...p, description: e.target.value }))}
              className="mt-1 h-16"
              placeholder="Item description shown on proposal..."
            />
          </div>

          {/* Internal Notes */}
          <div>
            <Label className="text-xs text-slate-500">Internal Notes</Label>
            <Textarea
              value={item.notes}
              onChange={(e) => setItem(p => ({ ...p, notes: e.target.value }))}
              className="mt-1 h-16"
              placeholder="Notes for your team (not shown to customer)..."
            />
          </div>

          {/* Pricing */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-900 text-sm">Pricing</h4>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={useMarkup} onCheckedChange={setUseMarkup} />
                <span className="text-slate-600">Auto markup ({markupType === 'percentage' ? `${markupValue}%` : `$${markupValue}`})</span>
              </label>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => setItem(p => ({ ...p, quantity: parseFloat(e.target.value) || 1 }))}
                  className="h-9 mt-0.5"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Cost</Label>
                <div className="relative mt-0.5">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_cost}
                    onChange={(e) => handleCostChange(e.target.value)}
                    className="h-9 pl-7"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Sell Price</Label>
                <div className="relative mt-0.5">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => setItem(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
                    className="h-9 pl-7"
                    disabled={useMarkup}
                  />
                </div>
              </div>
            </div>

            {item.unit_cost > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-600">Profit Margin</span>
                <span className={`font-semibold ${Number(profitMargin) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {profitMargin}%
                </span>
              </div>
            )}
          </div>

          {/* Save to Inventory */}
          <div className="p-4 border rounded-xl space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={saveToInventory} onCheckedChange={setSaveToInventory} />
              <div>
                <span className="font-medium text-slate-900">Save to Inventory</span>
                <p className="text-xs text-slate-500">Add this item to your inventory for future use</p>
              </div>
            </label>

            {saveToInventory && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <Label className="text-xs text-slate-500">SKU</Label>
                  <Input
                    value={inventoryDetails.sku}
                    onChange={(e) => setInventoryDetails(p => ({ ...p, sku: e.target.value }))}
                    className="h-9 mt-0.5"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Category</Label>
                  <Input
                    value={inventoryDetails.category}
                    onChange={(e) => setInventoryDetails(p => ({ ...p, category: e.target.value }))}
                    className="h-9 mt-0.5"
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Initial Stock Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={inventoryDetails.quantity_in_stock}
                    onChange={(e) => setInventoryDetails(p => ({ ...p, quantity_in_stock: parseFloat(e.target.value) || 0 }))}
                    className="h-9 mt-0.5"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#0069AF] hover:bg-[#005a94]">
              {saveToInventory ? 'Add & Save to Inventory' : 'Add Item'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
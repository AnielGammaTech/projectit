import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield, Wifi, ShoppingBag } from 'lucide-react';

const ASSET_TYPES = [
  'IT Equipment',
  'Mobile Device',
  'Software License',
  'Vehicle',
  'Physical Tool',
];

const CONDITIONS = ['New', 'Good', 'Fair', 'Damaged'];

const INITIAL_FORM = {
  name: '',
  type: '',
  serial_number: '',
  model: '',
  manufacturer: '',
  condition: '',
  location: '',
  purchase_date: '',
  purchase_cost: '',
  license_key: '',
  expiry_date: '',
  notes: '',
  warranty_start: '',
  warranty_end: '',
  mac_address: '',
  hostname: '',
  ip_address: '',
  accessories: '',
  supplier: '',
};

function buildFormData(asset) {
  if (!asset) return { ...INITIAL_FORM };
  return {
    name: asset.name || '',
    type: asset.type || '',
    serial_number: asset.serial_number || '',
    model: asset.model || '',
    manufacturer: asset.manufacturer || '',
    condition: asset.condition || '',
    location: asset.location || '',
    purchase_date: asset.purchase_date || '',
    purchase_cost: asset.purchase_cost ?? '',
    license_key: asset.license_key || '',
    expiry_date: asset.expiry_date || '',
    notes: asset.notes || '',
    warranty_start: asset.warranty_start || '',
    warranty_end: asset.warranty_end || '',
    mac_address: asset.mac_address || '',
    hostname: asset.hostname || '',
    ip_address: asset.ip_address || '',
    accessories: asset.accessories || '',
    supplier: asset.supplier || '',
  };
}

export default function AssetModal({ open, onClose, asset, onSave }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(buildFormData(asset));
    }
  }, [asset, open]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Asset name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        purchase_cost: formData.purchase_cost !== '' ? Number(formData.purchase_cost) : null,
      };

      if (asset) {
        await api.entities.Asset.update(asset.id, payload);
        toast.success('Asset updated');
      } else {
        await api.entities.Asset.create(payload);
        toast.success('Asset created');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(asset ? 'Failed to update asset' : 'Failed to create asset');
    } finally {
      setSaving(false);
    }
  };

  const isSoftware = formData.type === 'Software License';
  const isNetworkDevice = formData.type === 'IT Equipment' || formData.type === 'Mobile Device';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="asset-name">Name *</Label>
            <Input
              id="asset-name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. MacBook Pro 16"
            />
          </div>

          {/* Type */}
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={formData.type} onValueChange={(v) => updateField('type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Serial / Model / Manufacturer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="serial">Serial Number</Label>
              <Input
                id="serial"
                value={formData.serial_number}
                onChange={(e) => updateField('serial_number', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => updateField('model', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              value={formData.manufacturer}
              onChange={(e) => updateField('manufacturer', e.target.value)}
            />
          </div>

          {/* Condition / Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={(v) => updateField('condition', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
              />
            </div>
          </div>

          {/* Purchase date / cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="purchase-date">Purchase Date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => updateField('purchase_date', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="purchase-cost">Purchase Cost</Label>
              <Input
                id="purchase-cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.purchase_cost}
                onChange={(e) => updateField('purchase_cost', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Software License fields */}
          {isSoftware && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/50 border">
              <div className="grid gap-1.5">
                <Label htmlFor="license-key">License Key</Label>
                <Input
                  id="license-key"
                  value={formData.license_key}
                  onChange={(e) => updateField('license_key', e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="expiry-date">Expiry Date</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => updateField('expiry_date', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          {/* Additional Details */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-3">Additional Details</p>

            {/* Warranty section — hidden for Software License */}
            {!isSoftware && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/50 border mb-3">
                <div className="col-span-2 flex items-center gap-1.5 text-sm font-medium">
                  <Shield className="w-4 h-4" />
                  Warranty
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="warranty-start">Warranty Start</Label>
                  <Input
                    id="warranty-start"
                    type="date"
                    value={formData.warranty_start}
                    onChange={(e) => updateField('warranty_start', e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="warranty-end">Warranty End</Label>
                  <Input
                    id="warranty-end"
                    type="date"
                    value={formData.warranty_end}
                    onChange={(e) => updateField('warranty_end', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Network section — only for IT Equipment or Mobile Device */}
            {isNetworkDevice && (
              <div className="grid gap-3 p-3 rounded-xl bg-muted/50 border mb-3">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Wifi className="w-4 h-4" />
                  Network
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="mac-address">MAC Address</Label>
                    <Input
                      id="mac-address"
                      value={formData.mac_address}
                      onChange={(e) => updateField('mac_address', e.target.value)}
                      placeholder="AA:BB:CC:DD:EE:FF"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="hostname">Hostname</Label>
                    <Input
                      id="hostname"
                      value={formData.hostname}
                      onChange={(e) => updateField('hostname', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ip-address">IP Address</Label>
                  <Input
                    id="ip-address"
                    value={formData.ip_address}
                    onChange={(e) => updateField('ip_address', e.target.value)}
                    placeholder="192.168.1.x"
                  />
                </div>
              </div>
            )}

            {/* General section — always visible */}
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="accessories">Accessories</Label>
                <Input
                  id="accessories"
                  value={formData.accessories}
                  onChange={(e) => updateField('accessories', e.target.value)}
                  placeholder="Charger, dock, carrying bag..."
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="supplier">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    Supplier/Vendor
                  </span>
                </Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => updateField('supplier', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {asset ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

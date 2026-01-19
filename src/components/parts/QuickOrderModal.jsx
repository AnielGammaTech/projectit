import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Truck, Camera, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

export default function QuickOrderModal({ open, onClose, part, onSave }) {
  const [estDeliveryDate, setEstDeliveryDate] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const updateData = {
      status: 'ordered',
      est_delivery_date: estDeliveryDate ? format(estDeliveryDate, 'yyyy-MM-dd') : null,
      tracking_number: trackingNumber || null,
      carrier: carrier || null
    };
    
    // If there's an image, store it in notes or a dedicated field
    if (imageUrl) {
      updateData.notes = part.notes 
        ? `${part.notes}\n\nOrder Photo: ${imageUrl}` 
        : `Order Photo: ${imageUrl}`;
    }
    
    await onSave(part.id, updateData);
    setSaving(false);
    onClose();
  };

  if (!part) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-500" />
            Mark as Ordered
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="font-medium text-slate-900">{part.name}</p>
            {part.part_number && (
              <p className="text-sm text-slate-500">#{part.part_number}</p>
            )}
          </div>

          {/* ETA */}
          <div>
            <Label className="text-sm font-medium">Estimated Delivery Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                  {estDeliveryDate ? format(estDeliveryDate, 'MMM d, yyyy') : 'Select ETA...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={estDeliveryDate}
                  onSelect={setEstDeliveryDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Tracking Number */}
          <div>
            <Label className="text-sm font-medium">Tracking Number</Label>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number..."
              className="mt-1.5"
            />
          </div>

          {/* Carrier */}
          <div>
            <Label className="text-sm font-medium">Carrier</Label>
            <Input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g., UPS, FedEx, USPS..."
              className="mt-1.5"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <Label className="text-sm font-medium">Order Confirmation Photo</Label>
            <div className="mt-1.5">
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="Order" className="w-full h-32 object-cover rounded-lg" />
                  <button
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-500">Click to upload photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Mark as Ordered
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
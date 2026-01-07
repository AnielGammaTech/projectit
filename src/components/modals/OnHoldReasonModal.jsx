import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, PauseCircle } from 'lucide-react';

export default function OnHoldReasonModal({ open, onClose, project, onConfirm }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || saving) return;
    setSaving(true);
    await onConfirm(reason);
    setReason('');
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-amber-500" />
            Put Project On Hold
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="reason">Why is this project being put on hold?</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Waiting for parts to arrive, Client requested delay..."
              className="mt-1.5 h-24"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600" disabled={saving || !reason.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Put On Hold
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
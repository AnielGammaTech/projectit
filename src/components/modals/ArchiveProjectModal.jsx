import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Archive, AlertTriangle } from 'lucide-react';

export default function ArchiveProjectModal({ open, onClose, project, onConfirm }) {
  const [reason, setReason] = useState('');
  const [archiveType, setArchiveType] = useState('completed');

  const archiveReasons = [
    { value: 'completed', label: 'Project Completed', description: 'All work has been finished successfully' },
    { value: 'cancelled', label: 'Project Cancelled', description: 'Project was cancelled by client or team' },
    { value: 'on_hold_indefinite', label: 'On Hold Indefinitely', description: 'Project paused with no planned resume date' },
    { value: 'duplicate', label: 'Duplicate Project', description: 'This was a duplicate entry' },
    { value: 'other', label: 'Other', description: 'Specify reason below' },
  ];

  const handleConfirm = () => {
    onConfirm({
      archiveType,
      reason: reason || archiveReasons.find(r => r.value === archiveType)?.label
    });
    setReason('');
    setArchiveType('completed');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-500" />
            Archive Project
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Archiving "{project?.name}"</p>
                <p className="text-amber-700 mt-1">Archived projects won't appear in dashboards, activity feeds, or task counts.</p>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Why is this project being archived?</Label>
            <div className="mt-2 space-y-2">
              {archiveReasons.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    archiveType === option.value 
                      ? 'border-[#0069AF] bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="archiveType"
                    value={option.value}
                    checked={archiveType === option.value}
                    onChange={(e) => setArchiveType(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-sm text-slate-900">{option.label}</p>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {archiveType === 'other' && (
            <div>
              <Label className="text-sm">Additional Notes (optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for archiving..."
                className="mt-1"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} className="bg-amber-500 hover:bg-amber-600">
            <Archive className="w-4 h-4 mr-2" />
            Archive Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
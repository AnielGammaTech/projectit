import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function CompleteProjectModal({ open, onClose, project, incompleteTasks = 0, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    await onConfirm(notes);
    setNotes('');
    setSaving(false);
  };

  const canComplete = incompleteTasks === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Complete Project
          </DialogTitle>
        </DialogHeader>

        {!canComplete ? (
          <div className="py-6">
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Cannot complete project yet</p>
                <p className="text-sm text-amber-600 mt-1">
                  There {incompleteTasks === 1 ? 'is' : 'are'} still {incompleteTasks} incomplete task{incompleteTasks !== 1 ? 's' : ''}. 
                  Please complete all tasks before marking the project as complete.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-sm text-emerald-700">
                🎉 All tasks are complete! You can now mark this project as completed.
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Completion Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any final notes about this project..."
                className="mt-1.5 h-24"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Complete Project
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
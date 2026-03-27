import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const groupColors = {
  slate: 'bg-slate-500',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500'
};

export default function GroupModal({ open, onClose, group, projectId, onSave }) {
  const [formData, setFormData] = useState({ name: '', color: 'slate', project_id: projectId });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group) {
      setFormData({ name: group.name || '', color: group.color || 'slate', project_id: group.project_id || projectId });
    } else {
      setFormData({ name: '', color: 'slate', project_id: projectId });
    }
  }, [group, open, projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    await onSave(formData, group);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-border">
          <DialogHeader>
            <DialogTitle>{group ? 'Edit Group' : 'New Group'}</DialogTitle>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-4 sm:px-6 py-4">
            <div>
              <Label>Group Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Phase 1"
                required
                className="mt-1.5 text-[16px] sm:text-sm"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-3 mt-2">
                {Object.keys(groupColors).map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={cn(
                      "w-9 h-9 rounded-full transition-all",
                      groupColors[color],
                      formData.color === color ? "ring-2 ring-offset-2 ring-[#0069AF] dark:ring-offset-[#1e2a3a]" : ""
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="bg-[#0F2F44] hover:bg-[#1a4a6e]" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {group ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
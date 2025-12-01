import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  useEffect(() => {
    if (group) {
      setFormData({ name: group.name || '', color: group.color || 'slate', project_id: group.project_id || projectId });
    } else {
      setFormData({ name: '', color: 'slate', project_id: projectId });
    }
  }, [group, open, projectId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{group ? 'Edit Group' : 'New Group'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Group Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Phase 1"
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2">
              {Object.keys(groupColors).map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    groupColors[color],
                    formData.color === color ? "ring-2 ring-offset-2 ring-indigo-500" : ""
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {group ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
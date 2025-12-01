import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function ReminderModal({ open, onClose, reminder, projectId, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_date: '',
    reminder_time: ''
  });

  useEffect(() => {
    if (reminder) {
      setFormData({
        title: reminder.title || '',
        description: reminder.description || '',
        reminder_date: reminder.reminder_date || '',
        reminder_time: reminder.reminder_time || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        reminder_date: '',
        reminder_time: ''
      });
    }
  }, [reminder, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, project_id: projectId });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{reminder ? 'Edit Reminder' : 'New Reminder'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="title">Reminder Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Follow up with client"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details..."
              className="mt-1.5 h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.reminder_date ? format(new Date(formData.reminder_date), 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.reminder_date ? new Date(formData.reminder_date) : undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, reminder_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="reminder_time">Time (optional)</Label>
              <Input
                id="reminder_time"
                type="time"
                value={formData.reminder_time}
                onChange={(e) => setFormData(prev => ({ ...prev, reminder_time: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {reminder ? 'Update Reminder' : 'Create Reminder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
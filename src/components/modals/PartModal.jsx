import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function PartModal({ open, onClose, part, projectId, teamMembers = [], onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    part_number: '',
    quantity: 1,
    unit_cost: 0,
    status: 'needed',
    supplier: '',
    notes: '',
    assigned_to: '',
    assigned_name: '',
    due_date: '',
    est_delivery_date: ''
  });

  useEffect(() => {
    if (part) {
      setFormData({
        name: part.name || '',
        part_number: part.part_number || '',
        quantity: part.quantity || 1,
        unit_cost: part.unit_cost || 0,
        status: part.status || 'needed',
        supplier: part.supplier || '',
        notes: part.notes || '',
        assigned_to: part.assigned_to || '',
        assigned_name: part.assigned_name || '',
        due_date: part.due_date || '',
        est_delivery_date: part.est_delivery_date || ''
      });
    } else {
      setFormData({
        name: '',
        part_number: '',
        quantity: 1,
        unit_cost: 0,
        status: 'needed',
        supplier: '',
        notes: '',
        assigned_to: '',
        assigned_name: '',
        est_delivery_date: '',
        due_date: ''
      });
    }
  }, [part, open]);

  const handleAssigneeChange = (email) => {
    if (email === 'unassigned') {
      setFormData(prev => ({ ...prev, assigned_to: '', assigned_name: '' }));
    } else {
      const member = teamMembers.find(m => m.email === email);
      setFormData(prev => ({
        ...prev,
        assigned_to: email,
        assigned_name: member?.name || ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, project_id: projectId });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{part ? 'Edit Part' : 'Add Part'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Part Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Network Switch"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="part_number">Part Number</Label>
              <Input
                id="part_number"
                value={formData.part_number}
                onChange={(e) => setFormData(prev => ({ ...prev, part_number: e.target.value }))}
                placeholder="e.g., SW-2048G"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="unit_cost">Unit Cost ($)</Label>
              <Input
                id="unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="needed">Needed</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="ready_to_install">Ready to Install</SelectItem>
                  <SelectItem value="installed">Installed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
              placeholder="e.g., Amazon, CDW, NewEgg"
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assign To</Label>
              <Select value={formData.assigned_to || 'unassigned'} onValueChange={handleAssigneeChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.email}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(new Date(formData.due_date), 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date ? new Date(formData.due_date) : undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label>Est. Delivery Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.est_delivery_date ? format(new Date(formData.est_delivery_date), 'PPP') : 'Pick delivery date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.est_delivery_date ? new Date(formData.est_delivery_date) : undefined}
                  onSelect={(date) => setFormData(prev => ({ ...prev, est_delivery_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              className="mt-1.5 h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {part ? 'Update Part' : 'Add Part'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
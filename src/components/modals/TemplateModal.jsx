import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ListTodo, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TemplateModal({ open, onClose, template, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_tasks: [],
    default_parts: []
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        default_tasks: template.default_tasks || [],
        default_parts: template.default_parts || []
      });
    } else {
      setFormData({ name: '', description: '', default_tasks: [], default_parts: [] });
    }
  }, [template, open]);

  const addTask = () => {
    setFormData(prev => ({
      ...prev,
      default_tasks: [...prev.default_tasks, { title: '', description: '', priority: 'medium' }]
    }));
  };

  const updateTask = (index, field, value) => {
    const updated = [...formData.default_tasks];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, default_tasks: updated }));
  };

  const removeTask = (index) => {
    setFormData(prev => ({
      ...prev,
      default_tasks: prev.default_tasks.filter((_, i) => i !== index)
    }));
  };

  const addPart = () => {
    setFormData(prev => ({
      ...prev,
      default_parts: [...prev.default_parts, { name: '', part_number: '', quantity: 1 }]
    }));
  };

  const updatePart = (index, field, value) => {
    const updated = [...formData.default_parts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, default_parts: updated }));
  };

  const removePart = (index) => {
    setFormData(prev => ({
      ...prev,
      default_parts: prev.default_parts.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'New Template'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div>
            <Label>Template Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Standard Network Setup"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Template description..."
              className="mt-1.5 h-16"
            />
          </div>

          {/* Default Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="flex items-center gap-2">
                <ListTodo className="w-4 h-4" />
                Default Tasks
              </Label>
              <Button type="button" size="sm" variant="outline" onClick={addTask}>
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </Button>
            </div>
            <div className="space-y-2">
              {formData.default_tasks.map((task, idx) => (
                <div key={idx} className="flex gap-2 items-start bg-slate-50 rounded-lg p-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(idx, 'title', e.target.value)}
                      placeholder="Task title"
                      className="bg-white"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={task.description}
                        onChange={(e) => updateTask(idx, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        className="bg-white flex-1"
                      />
                      <Select value={task.priority} onValueChange={(v) => updateTask(idx, 'priority', v)}>
                        <SelectTrigger className="w-28 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeTask(idx)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Default Parts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Default Parts
              </Label>
              <Button type="button" size="sm" variant="outline" onClick={addPart}>
                <Plus className="w-4 h-4 mr-1" />
                Add Part
              </Button>
            </div>
            <div className="space-y-2">
              {formData.default_parts.map((part, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 rounded-lg p-3">
                  <Input
                    value={part.name}
                    onChange={(e) => updatePart(idx, 'name', e.target.value)}
                    placeholder="Part name"
                    className="bg-white flex-1"
                  />
                  <Input
                    value={part.part_number}
                    onChange={(e) => updatePart(idx, 'part_number', e.target.value)}
                    placeholder="Part #"
                    className="bg-white w-28"
                  />
                  <Input
                    type="number"
                    value={part.quantity}
                    onChange={(e) => updatePart(idx, 'quantity', parseInt(e.target.value) || 1)}
                    placeholder="Qty"
                    className="bg-white w-20"
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removePart(idx)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
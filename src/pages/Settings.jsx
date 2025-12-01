import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Save,
  FolderKanban,
  ListTodo,
  Package,
  GripVertical,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const colorOptions = [
  { name: 'slate', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  { name: 'red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { name: 'amber', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { name: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  { name: 'green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  { name: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  { name: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { name: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  { name: 'violet', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  { name: 'rose', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' }
];

const defaultSettings = {
  setting_key: 'main',
  project_statuses: [
    { value: 'planning', label: 'Planning', color: 'amber' },
    { value: 'in_progress', label: 'In Progress', color: 'blue' },
    { value: 'on_hold', label: 'On Hold', color: 'slate' },
    { value: 'completed', label: 'Completed', color: 'emerald' },
    { value: 'archived', label: 'Archived', color: 'slate' }
  ],
  project_priorities: [
    { value: 'low', label: 'Low', color: 'slate' },
    { value: 'medium', label: 'Medium', color: 'blue' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'urgent', label: 'Urgent', color: 'red' }
  ],
  task_statuses: [
    { value: 'todo', label: 'To Do', color: 'slate' },
    { value: 'in_progress', label: 'In Progress', color: 'blue' },
    { value: 'review', label: 'Review', color: 'amber' },
    { value: 'completed', label: 'Completed', color: 'emerald' }
  ],
  task_priorities: [
    { value: 'low', label: 'Low', color: 'slate' },
    { value: 'medium', label: 'Medium', color: 'blue' },
    { value: 'high', label: 'High', color: 'orange' }
  ],
  part_statuses: [
    { value: 'needed', label: 'Needed', color: 'slate' },
    { value: 'ordered', label: 'Ordered', color: 'blue' },
    { value: 'received', label: 'Received', color: 'amber' },
    { value: 'installed', label: 'Installed', color: 'emerald' }
  ]
};

function OptionEditor({ items, onChange, entityName }) {
  const addItem = () => {
    onChange([...items, { value: `new_${Date.now()}`, label: 'New Option', color: 'slate' }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    // Auto-generate value from label if editing label
    if (field === 'label') {
      newItems[index].value = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
    onChange(newItems);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const colorConfig = colorOptions.find(c => c.name === item.color) || colorOptions[0];
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200"
          >
            <GripVertical className="w-4 h-4 text-slate-300" />
            <Input
              value={item.label}
              onChange={(e) => updateItem(idx, 'label', e.target.value)}
              className="flex-1"
              placeholder="Option label"
            />
            <div className="flex gap-1">
              {colorOptions.slice(0, 8).map(color => (
                <button
                  key={color.name}
                  onClick={() => updateItem(idx, 'color', color.name)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all",
                    color.bg,
                    item.color === color.name && "ring-2 ring-offset-1 ring-indigo-500"
                  )}
                  title={color.name}
                />
              ))}
            </div>
            <div className={cn("px-3 py-1 rounded-lg text-xs font-medium", colorConfig.bg, colorConfig.text)}>
              {item.label}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-600"
              onClick={() => removeItem(idx)}
              disabled={items.length <= 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </motion.div>
        );
      })}
      <Button variant="outline" onClick={addItem} className="w-full border-dashed">
        <Plus className="w-4 h-4 mr-2" />
        Add Option
      </Button>
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setIsAdmin(user?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const results = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return results[0];
    }
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (savedSettings?.id) {
        return base44.entities.AppSettings.update(savedSettings.id, data);
      } else {
        return base44.entities.AppSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      setHasChanges(false);
    }
  });

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Admin Access Required</h2>
          <p className="text-slate-500">Only administrators can access settings.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
              <p className="text-slate-500">Customize status options and labels</p>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saveMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="projects" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
              <FolderKanban className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
              <ListTodo className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="parts" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
              <Package className="w-4 h-4 mr-2" />
              Parts
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <Label className="text-lg font-semibold text-slate-900 mb-4 block">Project Statuses</Label>
              <p className="text-sm text-slate-500 mb-4">Customize the status options for projects</p>
              <OptionEditor
                items={settings.project_statuses || defaultSettings.project_statuses}
                onChange={(items) => handleChange('project_statuses', items)}
                entityName="project"
              />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <Label className="text-lg font-semibold text-slate-900 mb-4 block">Project Priorities</Label>
              <p className="text-sm text-slate-500 mb-4">Customize the priority levels for projects</p>
              <OptionEditor
                items={settings.project_priorities || defaultSettings.project_priorities}
                onChange={(items) => handleChange('project_priorities', items)}
                entityName="project"
              />
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <Label className="text-lg font-semibold text-slate-900 mb-4 block">Task Statuses</Label>
              <p className="text-sm text-slate-500 mb-4">Customize the status options for tasks</p>
              <OptionEditor
                items={settings.task_statuses || defaultSettings.task_statuses}
                onChange={(items) => handleChange('task_statuses', items)}
                entityName="task"
              />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <Label className="text-lg font-semibold text-slate-900 mb-4 block">Task Priorities</Label>
              <p className="text-sm text-slate-500 mb-4">Customize the priority levels for tasks</p>
              <OptionEditor
                items={settings.task_priorities || defaultSettings.task_priorities}
                onChange={(items) => handleChange('task_priorities', items)}
                entityName="task"
              />
            </div>
          </TabsContent>

          {/* Parts Tab */}
          <TabsContent value="parts" className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <Label className="text-lg font-semibold text-slate-900 mb-4 block">Part Statuses</Label>
              <p className="text-sm text-slate-500 mb-4">Customize the status options for parts</p>
              <OptionEditor
                items={settings.part_statuses || defaultSettings.part_statuses}
                onChange={(items) => handleChange('part_statuses', items)}
                entityName="part"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
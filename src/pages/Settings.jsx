import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Save,
  FolderKanban,
  ListTodo,
  Package,
  GripVertical,
  ShieldAlert,
  Check,
  Palette,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
    <div className="space-y-2">
      <AnimatePresence>
        {items.map((item, idx) => {
          const colorConfig = colorOptions.find(c => c.name === item.color) || colorOptions[0];
          return (
            <motion.div
              key={item.value + idx}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="group flex items-center gap-3 p-4 bg-gradient-to-r from-white to-slate-50/50 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-400 group-hover:bg-slate-200 transition-colors">
                <span className="text-sm font-bold">{idx + 1}</span>
              </div>
              
              <Input
                value={item.label}
                onChange={(e) => updateItem(idx, 'label', e.target.value)}
                className="flex-1 font-medium border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
                placeholder="Option label"
              />
              
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all hover:scale-105",
                    colorConfig.bg, colorConfig.border || 'border-transparent'
                  )}>
                    <Palette className={cn("w-4 h-4", colorConfig.text)} />
                    <span className={cn("text-xs font-medium capitalize", colorConfig.text)}>{item.color}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.name}
                        onClick={() => updateItem(idx, 'color', color.name)}
                        className={cn(
                          "w-8 h-8 rounded-lg transition-all hover:scale-110 flex items-center justify-center",
                          color.bg,
                          item.color === color.name && "ring-2 ring-offset-2 ring-indigo-500"
                        )}
                        title={color.name}
                      >
                        {item.color === color.name && <Check className={cn("w-4 h-4", color.text)} />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <div className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold shadow-sm min-w-[100px] text-center",
                colorConfig.bg, colorConfig.text
              )}>
                {item.label || 'Preview'}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                onClick={() => removeItem(idx)}
                disabled={items.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button 
          variant="outline" 
          onClick={addItem} 
          className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 py-6 text-slate-500 hover:text-indigo-600 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Option
        </Button>
      </motion.div>
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
    api.auth.me().then(user => {
      setCurrentUser(user);
      setIsAdmin(user?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const results = await api.entities.AppSettings.filter({ setting_key: 'main' });
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
        return api.entities.AppSettings.update(savedSettings.id, data);
      } else {
        return api.entities.AppSettings.create(data);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-rose-50/30 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white rounded-3xl p-12 shadow-xl border border-slate-200 max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-100 to-rose-200 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Admin Access Required</h2>
          <p className="text-slate-500">Only administrators can access and modify settings.</p>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/30 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <SettingsIcon className="w-8 h-8 text-indigo-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-8 mb-8 shadow-2xl shadow-indigo-200/50"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
                <SettingsIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-indigo-200 mt-1">Customize your workspace options and labels</p>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || saveMutation.isPending}
                size="lg"
                className={cn(
                  "bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg font-semibold px-6",
                  hasChanges && "animate-pulse"
                )}
              >
                {saveMutation.isPending ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <SettingsIcon className="w-4 h-4 mr-2" />
                    </motion.div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {hasChanges ? 'Save Changes' : 'All Saved'}
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 p-1.5 rounded-2xl shadow-sm">
            <TabsTrigger value="projects" className="rounded-xl px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
              <FolderKanban className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-xl px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
              <ListTodo className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="parts" className="rounded-xl px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
              <Package className="w-4 h-4 mr-2" />
              Parts
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <Label className="text-xl font-bold text-slate-900 block">Project Statuses</Label>
                  <p className="text-sm text-slate-500">Define workflow stages for your projects</p>
                </div>
              </div>
              <OptionEditor
                items={settings.project_statuses || defaultSettings.project_statuses}
                onChange={(items) => handleChange('project_statuses', items)}
                entityName="project"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <Label className="text-xl font-bold text-slate-900 block">Project Priorities</Label>
                  <p className="text-sm text-slate-500">Set urgency levels for better organization</p>
                </div>
              </div>
              <OptionEditor
                items={settings.project_priorities || defaultSettings.project_priorities}
                onChange={(items) => handleChange('project_priorities', items)}
                entityName="project"
              />
            </motion.div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <Label className="text-xl font-bold text-slate-900 block">Task Statuses</Label>
                  <p className="text-sm text-slate-500">Track progress with custom task stages</p>
                </div>
              </div>
              <OptionEditor
                items={settings.task_statuses || defaultSettings.task_statuses}
                onChange={(items) => handleChange('task_statuses', items)}
                entityName="task"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <Label className="text-xl font-bold text-slate-900 block">Task Priorities</Label>
                  <p className="text-sm text-slate-500">Highlight what needs attention first</p>
                </div>
              </div>
              <OptionEditor
                items={settings.task_priorities || defaultSettings.task_priorities}
                onChange={(items) => handleChange('task_priorities', items)}
                entityName="task"
              />
            </motion.div>
          </TabsContent>

          {/* Parts Tab */}
          <TabsContent value="parts" className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <Label className="text-xl font-bold text-slate-900 block">Part Statuses</Label>
                  <p className="text-sm text-slate-500">Track materials from order to installation</p>
                </div>
              </div>
              <OptionEditor
                items={settings.part_statuses || defaultSettings.part_statuses}
                onChange={(items) => handleChange('part_statuses', items)}
                entityName="part"
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
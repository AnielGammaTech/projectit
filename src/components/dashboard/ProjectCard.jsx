import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, ArrowRight, Palette, Pin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColors = {
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  on_hold: 'bg-slate-50 text-slate-700 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const cardColors = {
  slate: 'border-l-slate-500',
  red: 'border-l-red-500',
  orange: 'border-l-orange-500',
  amber: 'border-l-amber-500',
  yellow: 'border-l-yellow-500',
  lime: 'border-l-lime-500',
  green: 'border-l-green-500',
  emerald: 'border-l-emerald-500',
  teal: 'border-l-teal-500',
  cyan: 'border-l-cyan-500',
  sky: 'border-l-sky-500',
  blue: 'border-l-blue-500',
  indigo: 'border-l-indigo-500',
  violet: 'border-l-violet-500',
  purple: 'border-l-purple-500',
  fuchsia: 'border-l-fuchsia-500',
  pink: 'border-l-pink-500',
  rose: 'border-l-rose-500'
};

const colorOptions = [
  { name: 'slate', bg: 'bg-slate-500' },
  { name: 'red', bg: 'bg-red-500' },
  { name: 'orange', bg: 'bg-orange-500' },
  { name: 'amber', bg: 'bg-amber-500' },
  { name: 'yellow', bg: 'bg-yellow-500' },
  { name: 'lime', bg: 'bg-lime-500' },
  { name: 'green', bg: 'bg-green-500' },
  { name: 'emerald', bg: 'bg-emerald-500' },
  { name: 'teal', bg: 'bg-teal-500' },
  { name: 'cyan', bg: 'bg-cyan-500' },
  { name: 'sky', bg: 'bg-sky-500' },
  { name: 'blue', bg: 'bg-blue-500' },
  { name: 'indigo', bg: 'bg-indigo-500' },
  { name: 'violet', bg: 'bg-violet-500' },
  { name: 'purple', bg: 'bg-purple-500' },
  { name: 'fuchsia', bg: 'bg-fuchsia-500' },
  { name: 'pink', bg: 'bg-pink-500' },
  { name: 'rose', bg: 'bg-rose-500' }
];

const statusOptions = [
  { value: 'planning', label: 'Planning' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' }
];

export default function ProjectCard({ project, tasks = [], index, onColorChange, onGroupChange, onStatusChange, onDueDateChange, onPinToggle, groups = [], isPinned = false, dragHandleProps = {} }) {
  const navigate = useNavigate();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const colorClass = cardColors[project.color] || cardColors.slate;

  const handleColorSelect = (color) => {
    onColorChange?.(project, color);
    setColorPickerOpen(false);
  };

  const handleGroupSelect = (group) => {
    onGroupChange?.(project, group);
    setGroupPickerOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group relative"
    >
      {/* Hover actions */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Pin button */}
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPinToggle?.(project); }}
          className={cn(
            "p-1.5 rounded-lg backdrop-blur shadow-sm transition-all",
            isPinned ? "bg-amber-100 text-amber-600" : "bg-white/90 hover:bg-white text-slate-500"
          )}
          title={isPinned ? "Unpin" : "Pin to top"}
        >
          <Pin className={cn("w-3.5 h-3.5", isPinned && "fill-current")} />
        </button>
        {/* Color picker */}
        <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
          <PopoverTrigger asChild>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setColorPickerOpen(true); }}
              className="p-1.5 rounded-lg bg-white/90 backdrop-blur shadow-sm hover:bg-white transition-all"
            >
              <Palette className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="end" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-medium text-slate-600 mb-2">Card Color</p>
            <div className="grid grid-cols-6 gap-1.5">
              {colorOptions.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleColorSelect(c.name)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all hover:scale-110",
                    c.bg,
                    project.color === c.name && "ring-2 ring-offset-2 ring-indigo-500"
                  )}
                />
              ))}
            </div>
            {groups.length > 0 && (
              <>
                <p className="text-xs font-medium text-slate-600 mt-3 mb-2">Move to Group</p>
                <div className="space-y-1">
                  <button
                    onClick={() => handleGroupSelect('')}
                    className={cn(
                      "w-full text-left text-xs px-2 py-1.5 rounded-md transition-all",
                      !project.group ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100 text-slate-600"
                    )}
                  >
                    No Group
                  </button>
                  {groups.map((g) => (
                    <button
                      key={g}
                      onClick={() => handleGroupSelect(g)}
                      className={cn(
                        "w-full text-left text-xs px-2 py-1.5 rounded-md transition-all",
                        project.group === g ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100 text-slate-600"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <div 
        {...dragHandleProps}
        onClick={() => navigate(createPageUrl('ProjectDetail') + `?id=${project.id}`)}
        className={cn(
          "bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 border-l-4 cursor-pointer",
          colorClass,
          isPinned && "ring-2 ring-amber-200 bg-amber-50/30"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <DropdownMenu open={statusOpen} onOpenChange={setStatusOpen}>
              <DropdownMenuTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs cursor-pointer hover:opacity-80", statusColors[project.status])}
                  onClick={(e) => { e.stopPropagation(); setStatusOpen(true); }}
                >
                  {project.status?.replace('_', ' ')}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {statusOptions.map((opt) => (
                  <DropdownMenuItem 
                    key={opt.value} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onStatusChange?.(project, opt.value); 
                      setStatusOpen(false);
                    }}
                  >
                    <Badge className={cn("mr-2", statusColors[opt.value])}>{opt.label}</Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
        </div>

        <h3 className="text-base font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
          {project.name}
        </h3>
        {project.client && (
          <p className="text-sm text-slate-500 mb-3 line-clamp-1">{project.client}</p>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <div 
                className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{project.due_date ? format(new Date(project.due_date), 'MMM d') : 'Set date'}</span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
              <CalendarPicker
                mode="single"
                selected={project.due_date ? new Date(project.due_date) : undefined}
                onSelect={(date) => { onDueDateChange?.(project, date); setDatePickerOpen(false); }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {totalTasks > 0 && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-medium text-slate-600">{completedTasks}/{totalTasks}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
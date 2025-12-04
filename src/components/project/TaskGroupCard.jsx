import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, User, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const groupColors = {
  slate: { bg: 'bg-slate-600', light: 'bg-slate-100', border: 'border-slate-300' },
  red: { bg: 'bg-red-600', light: 'bg-red-100', border: 'border-red-300' },
  amber: { bg: 'bg-amber-500', light: 'bg-amber-100', border: 'border-amber-300' },
  emerald: { bg: 'bg-emerald-600', light: 'bg-emerald-100', border: 'border-emerald-300' },
  blue: { bg: 'bg-blue-600', light: 'bg-blue-100', border: 'border-blue-300' },
  violet: { bg: 'bg-violet-600', light: 'bg-violet-100', border: 'border-violet-300' },
  pink: { bg: 'bg-pink-500', light: 'bg-pink-100', border: 'border-pink-300' }
};

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const getColorForEmail = (email) => {
  if (!email) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function TaskGroupCard({ group, tasks = [], onEditGroup, onDeleteGroup, onTaskClick, onTaskStatusChange }) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const colorConfig = groupColors[group?.color] || groupColors.slate;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;

  // Group tasks by sub-sections (using notes prefix like "Core", "Optional" etc)
  const groupedTasks = tasks.reduce((acc, task) => {
    const section = task.section || 'Tasks';
    if (!acc[section]) acc[section] = [];
    acc[section].push(task);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-[#1a3a2f] rounded-xl overflow-hidden shadow-lg min-w-[280px] max-w-[320px] flex-shrink-0"
      )}
    >
      {/* Header */}
      <div className={cn("p-3", colorConfig.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="font-semibold text-white text-sm truncate">{group?.name || 'Ungrouped'}</h3>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/70">{completedCount}/{totalCount} completed</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditGroup?.(group)}>
                  <Edit2 className="w-4 h-4 mr-2" />Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDeleteGroup?.(group)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="p-2 max-h-[400px] overflow-y-auto">
        {Object.entries(groupedTasks).map(([section, sectionTasks]) => (
          <div key={section} className="mb-3">
            {section !== 'Tasks' && (
              <Badge className="mb-2 bg-amber-500/80 text-white text-[10px]">{section}</Badge>
            )}
            <div className="space-y-1">
              {sectionTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all group",
                    task.status === 'completed' ? "opacity-60" : "hover:bg-white/5"
                  )}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskStatusChange?.(task, task.status === 'completed' ? 'todo' : 'completed');
                    }}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm text-white/90 leading-tight",
                      task.status === 'completed' && "line-through text-white/50"
                    )}>
                      {task.title}
                    </p>
                    {(task.due_date || task.assigned_name) && (
                      <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                          <span className="text-[10px] text-white/50 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {task.assigned_name && (
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium",
                            getColorForEmail(task.assigned_to)
                          )}>
                            {getInitials(task.assigned_name)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {tasks.length === 0 && (
          <p className="text-sm text-white/40 text-center py-4">No tasks</p>
        )}
      </div>
    </motion.div>
  );
}
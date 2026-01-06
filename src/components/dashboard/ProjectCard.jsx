import { useState, memo, useMemo } from 'react';
import { Calendar, CheckCircle2, ArrowRight, Palette, Pin, Ticket, ListTodo, Package, CircleDot, Sparkles, Users, AlertTriangle, Clock, MessageCircle, CheckSquare, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Fallback status colors for built-in statuses
const fallbackStatusColors = {
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  on_hold: 'bg-slate-50 text-slate-700 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  archived: 'bg-slate-50 text-slate-500 border-slate-200',
  deleted: 'bg-red-50 text-red-700 border-red-200'
};

// Color mapping for dynamic statuses
const statusColorMap = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  lime: 'bg-lime-100 text-lime-700 border-lime-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
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

// Fallback status options if no custom statuses exist
const fallbackStatusOptions = [
  { value: 'planning', label: 'Planning', color: 'amber' },
  { value: 'on_hold', label: 'On Hold', color: 'slate' },
  { value: 'completed', label: 'Completed', color: 'emerald' }
];

function ProjectCard({ project, tasks = [], parts = [], index, onColorChange, onGroupChange, onStatusChange, onDueDateChange, onPinToggle, groups = [], isPinned = false, dragHandleProps = {}, teamMembers = [], selectionMode = false, isSelected = false, onSelectionToggle, customStatuses = [] }) {
  const navigate = useNavigate();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  
  // Use project's stored progress and health status instead of fetching
  const healthStatus = project.health_status || 'good';

  // Build status options from custom statuses or fallback
  const statusOptions = useMemo(() => {
    if (customStatuses && customStatuses.length > 0) {
      return customStatuses.map(s => ({
        value: s.key,
        label: s.name,
        color: s.color
      }));
    }
    return fallbackStatusOptions;
  }, [customStatuses]);

  // Get status color class
  const getStatusColor = (statusKey) => {
    const customStatus = customStatuses?.find(s => s.key === statusKey);
    if (customStatus) {
      return statusColorMap[customStatus.color] || statusColorMap.slate;
    }
    return fallbackStatusColors[statusKey] || fallbackStatusColors.planning;
  };

  // Get status display name
  const getStatusLabel = (statusKey) => {
    const customStatus = customStatuses?.find(s => s.key === statusKey);
    if (customStatus) return customStatus.name;
    const fallback = fallbackStatusOptions.find(s => s.value === statusKey);
    return fallback?.label || statusKey?.replace('_', ' ');
  };
  
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived').length;
    const total = tasks.length;
    const pendingP = parts.filter(p => p.status !== 'installed').length;
    const prog = project.progress || (total > 0 ? (completed / total) * 100 : 0);
    
    const unassigned = tasks.filter(t => !t.assigned_to && t.status !== 'completed' && t.status !== 'archived').length;
    const overdue = tasks.filter(t => {
      if (t.status === 'completed' || t.status === 'archived' || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate < new Date() && dueDate.toDateString() !== new Date().toDateString();
    }).length;
    const active = pending;
    const issues = unassigned + overdue;
    const health = active > 0 ? Math.max(0, 100 - Math.round((issues / active) * 100)) : 100;
    
    return { completedTasks: completed, pendingTasks: pending, totalTasks: total, pendingParts: pendingP, progress: prog, unassignedTasks: unassigned, overdueTasks: overdue, totalActive: active, healthScore: health };
  }, [tasks, parts, project.progress]);

  const { completedTasks, pendingTasks, totalTasks, pendingParts, progress, unassignedTasks, overdueTasks, totalActive, healthScore } = stats;
  const colorClass = cardColors[project.color] || cardColors.slate;
  
  // Health-based colors for progress ring
  const getHealthColor = () => {
    if (healthStatus === 'issue') return 'text-red-500';
    if (healthStatus === 'concern') return 'text-amber-500';
    return 'text-emerald-500';
  };
  
  const getHealthScoreColor = () => {
    if (healthScore >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' };
    if (healthScore >= 60) return { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' };
    return { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-500' };
  };

  // Get health score reasons
  const getHealthReasons = () => {
    const reasons = [];
    if (overdueTasks > 0) reasons.push(`${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`);
    if (unassignedTasks > 0) reasons.push(`${unassignedTasks} unassigned task${unassignedTasks > 1 ? 's' : ''}`);
    if (reasons.length === 0) reasons.push('All tasks on track');
    return reasons;
  };

  // Get assigned team members
  const projectTeam = (project.team_members || []).map(email => {
    const member = teamMembers.find(m => m.email === email);
    return member || { email, name: email.split('@')[0] };
  });

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const handleColorSelect = (color) => {
    onColorChange?.(project, color);
    setColorPickerOpen(false);
  };

  const handleGroupSelect = (group) => {
    onGroupChange?.(project, group);
    setGroupPickerOpen(false);
  };

  return (
    <div className="group relative hover:-translate-y-1 transition-transform duration-200">
      {/* Selection checkbox */}
      {selectionMode && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelectionToggle?.(project.id); }}
          className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-white/90 backdrop-blur shadow-sm transition-all"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-[#0069AF]" />
          ) : (
            <Square className="w-4 h-4 text-slate-400" />
          )}
        </button>
      )}

      {/* Hover actions */}
      <div className={cn("absolute top-2 right-2 z-10 flex gap-1 transition-opacity", selectionMode ? "opacity-0" : "opacity-0 group-hover:opacity-100")}>
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
        onClick={() => {
          if (selectionMode) {
            onSelectionToggle?.(project.id);
          } else {
            navigate(createPageUrl('ProjectDetail') + `?id=${project.id}`);
          }
        }}
        className={cn(
          "bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 border-l-4 cursor-pointer",
          colorClass,
          isPinned && "ring-2 ring-amber-200 bg-amber-50/30",
          isSelected && "ring-2 ring-[#0069AF] bg-[#0069AF]/5"
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {project.project_number && (
              <span className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-mono font-bold">
                #{project.project_number}
              </span>
            )}
            <DropdownMenu open={statusOpen} onOpenChange={setStatusOpen}>
              <DropdownMenuTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs cursor-pointer hover:opacity-80", getStatusColor(project.status))}
                  onClick={(e) => { e.stopPropagation(); setStatusOpen(true); }}
                >
                  {getStatusLabel(project.status)}
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
                    <Badge className={cn("mr-2", statusColorMap[opt.color] || fallbackStatusColors[opt.value])}>{opt.label}</Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
        </div>

        <div className="mb-2">
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {project.name}
          </h3>
          {project.client && (
            <p className="text-xs text-slate-500 line-clamp-1">{project.client}</p>
          )}
        </div>
        
        {/* AI Short Description */}
        {project.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">{project.description}</p>
        )}

        {/* Progress Bar - Simple */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2 cursor-help" onClick={(e) => e.stopPropagation()}>
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    healthStatus === 'issue' ? "bg-red-500" :
                    healthStatus === 'concern' ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Progress</p>
                  <span className="text-sm font-bold">{Math.round(progress)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium",
                    healthStatus === 'issue' ? "bg-red-100 text-red-700" :
                    healthStatus === 'concern' ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-700"
                  )}>
                    {healthStatus === 'issue' ? 'Has Issues' : healthStatus === 'concern' ? 'Some Concerns' : 'On Track'}
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Stats Row - Clean Layout */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            {/* Tasks count */}
            <div className="flex items-center gap-1">
              <ListTodo className="w-3 h-3" />
              <span>{pendingTasks}/{totalTasks}</span>
            </div>
            
            {/* Parts if any */}
            {pendingParts > 0 && (
              <>
                <span className="text-slate-200">•</span>
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3 text-amber-500" />
                  <span>{pendingParts}</span>
                </div>
              </>
            )}
            
            {/* HaloPSA Ticket */}
            {project.halopsa_ticket_id && (
              <>
                <span className="text-slate-200">•</span>
                <a
                  href={project.halopsa_ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                >
                  <Ticket className="w-3 h-3" />
                  <span>#{project.halopsa_ticket_id}</span>
                </a>
              </>
            )}
          </div>
          
          {/* Right side - Team & Health */}
          <div className="flex items-center gap-2">
            {/* AI Health Score */}
            {totalActive > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded cursor-help", getHealthScoreColor().bg)} onClick={(e) => e.stopPropagation()}>
                      <Sparkles className={cn("w-3 h-3", getHealthScoreColor().icon)} />
                      <span className={cn("text-[10px] font-bold", getHealthScoreColor().text)}>{healthScore}%</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3">
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">AI Health Score</p>
                      <div className="space-y-1">
                        {getHealthReasons().map((reason, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {reason.includes('overdue') ? (
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                            ) : reason.includes('unassigned') ? (
                              <Users className="w-3 h-3 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            )}
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Team */}
            {projectTeam.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-1 text-slate-400 cursor-default"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Users className="w-3 h-3" />
                      <span>{projectTeam.length}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="text-xs space-y-1">
                      {projectTeam.map((m, i) => (
                        <p key={i} className="font-medium">{m.name || m.email}</p>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ProjectCard);
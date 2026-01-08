import { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { ChevronDown, ChevronRight, FolderOpen, Folder, MoreHorizontal, Edit2, Trash2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import ProjectCard from './ProjectCard';

const stackColors = {
  slate: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', icon: 'text-slate-500' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-500' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500' },
  lime: { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', icon: 'text-lime-500' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', icon: 'text-teal-500' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: 'text-cyan-500' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: 'text-sky-500' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'text-indigo-500' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: 'text-violet-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-500' },
  fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700', icon: 'text-fuchsia-500' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: 'text-pink-500' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'text-rose-500' },
};

const colorOptions = [
  { name: 'slate', bg: 'bg-slate-500' },
  { name: 'red', bg: 'bg-red-500' },
  { name: 'orange', bg: 'bg-orange-500' },
  { name: 'amber', bg: 'bg-amber-500' },
  { name: 'blue', bg: 'bg-blue-500' },
  { name: 'indigo', bg: 'bg-indigo-500' },
  { name: 'violet', bg: 'bg-violet-500' },
  { name: 'emerald', bg: 'bg-emerald-500' },
  { name: 'teal', bg: 'bg-teal-500' },
];

export default function ProjectStackCard({ 
  stack, 
  projects, 
  tasks, 
  parts, 
  teamMembers, 
  customStatuses,
  onToggleCollapse, 
  onRename, 
  onDelete, 
  onColorChange,
  onProjectColorChange,
  onProjectStatusChange,
  onProjectDueDateChange,
  getTasksForProject,
  getPartsForProject
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(stack.name);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const colors = stackColors[stack.color] || stackColors.slate;
  const stackProjects = projects.filter(p => stack.project_ids?.includes(p.id));

  const handleSaveName = () => {
    if (editName.trim() && editName !== stack.name) {
      onRename(stack, editName.trim());
    }
    setIsEditing(false);
  };

  const handleColorSelect = (color) => {
    onColorChange(stack, color);
    setColorPickerOpen(false);
  };

  return (
    <div className={cn(
      "rounded-2xl border-2 border-dashed transition-all",
      colors.border,
      colors.bg
    )}>
      {/* Stack Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button 
            onClick={() => onToggleCollapse(stack)}
            className={cn("p-1 rounded hover:bg-white/50 transition-colors", colors.icon)}
          >
            {stack.is_collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {stack.is_collapsed ? (
            <Folder className={cn("w-5 h-5", colors.icon)} />
          ) : (
            <FolderOpen className={cn("w-5 h-5", colors.icon)} />
          )}
          
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              className="h-7 text-sm font-semibold max-w-[150px]"
              autoFocus
            />
          ) : (
            <span className={cn("font-semibold text-sm truncate", colors.text)}>
              {stack.name}
            </span>
          )}
          
          <span className={cn("text-xs px-1.5 py-0.5 rounded-full bg-white/70", colors.text)}>
            {stackProjects.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <button className="p-1.5 rounded hover:bg-white/50 transition-colors">
                <Palette className={cn("w-3.5 h-3.5", colors.icon)} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="grid grid-cols-5 gap-1.5">
                {colorOptions.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => handleColorSelect(c.name)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all hover:scale-110",
                      c.bg,
                      stack.color === c.name && "ring-2 ring-offset-2 ring-indigo-500"
                    )}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded hover:bg-white/50 transition-colors">
                <MoreHorizontal className={cn("w-4 h-4", colors.icon)} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(stack)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Stack
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stack Content - Droppable */}
      {!stack.is_collapsed && (
        <Droppable droppableId={`stack-${stack.id}`} type="PROJECT">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "px-3 pb-3 min-h-[80px] transition-colors rounded-b-xl",
                snapshot.isDraggingOver && "bg-white/50"
              )}
            >
              {stackProjects.length > 0 ? (
                <div className="grid gap-3">
                  {stackProjects.map((project, idx) => (
                    <Draggable key={project.id} draggableId={project.id} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={provided.draggableProps.style}
                        >
                          <ProjectCard
                            project={project}
                            tasks={getTasksForProject(project.id)}
                            parts={getPartsForProject(project.id)}
                            index={idx}
                            groups={[]}
                            onColorChange={onProjectColorChange}
                            onStatusChange={onProjectStatusChange}
                            onDueDateChange={onProjectDueDateChange}
                            dragHandleProps={provided.dragHandleProps}
                            teamMembers={teamMembers}
                            customStatuses={customStatuses}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              ) : (
                <div className={cn(
                  "h-20 flex items-center justify-center border-2 border-dashed rounded-xl",
                  colors.border,
                  "bg-white/30"
                )}>
                  <p className="text-sm text-slate-400">Drag projects here</p>
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}

      {/* Collapsed Preview */}
      {stack.is_collapsed && stackProjects.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex -space-x-2">
            {stackProjects.slice(0, 4).map((project, idx) => (
              <div
                key={project.id}
                className="w-8 h-8 rounded-lg bg-white border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-600"
                style={{ zIndex: 4 - idx }}
              >
                {project.name?.charAt(0)?.toUpperCase()}
              </div>
            ))}
            {stackProjects.length > 4 && (
              <div className="w-8 h-8 rounded-lg bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-600">
                +{stackProjects.length - 4}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
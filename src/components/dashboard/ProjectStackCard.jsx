import { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { FolderOpen, Folder, MoreHorizontal, Trash2, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import ProjectCard from './ProjectCard';

const stackColors = {
  slate: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', icon: 'text-slate-500', folder: 'text-slate-400' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500', folder: 'text-red-400' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-500', folder: 'text-orange-400' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500', folder: 'text-amber-400' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500', folder: 'text-yellow-400' },
  lime: { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', icon: 'text-lime-500', folder: 'text-lime-400' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500', folder: 'text-green-400' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500', folder: 'text-emerald-400' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', icon: 'text-teal-500', folder: 'text-teal-400' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: 'text-cyan-500', folder: 'text-cyan-400' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: 'text-sky-500', folder: 'text-sky-400' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500', folder: 'text-blue-400' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'text-indigo-500', folder: 'text-indigo-400' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: 'text-violet-500', folder: 'text-violet-400' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-500', folder: 'text-purple-400' },
  fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700', icon: 'text-fuchsia-500', folder: 'text-fuchsia-400' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: 'text-pink-500', folder: 'text-pink-400' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'text-rose-500', folder: 'text-rose-400' },
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
  onPinToggle,
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

  // Folder style - collapsed by default shows as compact folder
  const isOpen = !stack.is_collapsed;

  return (
    <Droppable droppableId={`stack-${stack.id}`}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            "rounded-2xl transition-all",
            isOpen ? cn("border-2 p-3", snapshot.isDraggingOver ? "border-solid border-blue-400 bg-blue-50" : cn("border-dashed", colors.border, colors.bg)) : "",
            snapshot.isDraggingOver && !isOpen && "ring-2 ring-blue-400"
          )}
        >
          {/* Folder Header - Always visible */}
          <div 
            className={cn(
              "flex items-center gap-3 cursor-pointer group",
              !isOpen && cn("p-3 rounded-xl border hover:shadow-md transition-all", colors.border, colors.bg)
            )}
            onClick={() => !isEditing && onToggleCollapse(stack)}
          >
            {/* Folder Icon */}
            {isOpen ? (
              <FolderOpen className={cn("w-6 h-6 flex-shrink-0", colors.folder)} />
            ) : (
              <Folder className={cn("w-6 h-6 flex-shrink-0", colors.folder)} />
            )}
            
            {/* Name - click to edit */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') { setIsEditing(false); setEditName(stack.name); }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 text-sm font-semibold"
                  autoFocus
                />
              ) : (
                <span 
                  className={cn("font-semibold text-sm truncate block", colors.text)}
                  onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                >
                  {stack.name}
                </span>
              )}
            </div>
            
            {/* Count badge */}
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              isOpen ? "bg-white/70" : "bg-white",
              colors.text
            )}>
              {stackProjects.length}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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
                  <DropdownMenuItem onClick={() => onDelete(stack)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Stack
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Expanded Content - Projects inside folder */}
          {isOpen && (
            <div className={cn(
              "mt-3 min-h-[60px] transition-colors rounded-xl",
              snapshot.isDraggingOver && "bg-blue-50/50"
            )}>
              {stackProjects.length > 0 ? (
                <div className="grid gap-3">
                  {stackProjects.map((project, idx) => (
                    <Draggable key={project.id} draggableId={project.id} index={idx}>
                      {(provided, dragSnapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={provided.draggableProps.style}
                          className={cn(dragSnapshot.isDragging && "opacity-90 shadow-2xl")}
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
                            onPinToggle={onPinToggle}
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
                  "h-16 flex items-center justify-center border-2 border-dashed rounded-xl transition-colors",
                  snapshot.isDraggingOver ? "border-blue-400 bg-blue-50" : cn(colors.border, "bg-white/30")
                )}>
                  <p className="text-sm text-slate-400">Drag projects here</p>
                </div>
              )}
            </div>
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
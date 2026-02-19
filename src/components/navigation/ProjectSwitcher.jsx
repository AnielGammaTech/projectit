import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronDown, Search, FolderKanban, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function ProjectSwitcher({ currentProject, currentPage = 'ProjectDetail' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list('-created_date')
  });
  
  const activeProjects = projects.filter(p => p.status !== 'archived' && p.status !== 'completed' && p.status !== 'deleted');
  const filteredProjects = activeProjects.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.client?.toLowerCase().includes(search.toLowerCase())
  );
  
  // Get pinned projects from localStorage
  const pinnedIds = JSON.parse(localStorage.getItem('pinnedProjects') || '[]');
  const pinnedProjects = filteredProjects.filter(p => pinnedIds.includes(p.id));
  const unpinnedProjects = filteredProjects.filter(p => !pinnedIds.includes(p.id));

  const handleSelect = (project) => {
    // Navigate to the same page type but for the new project
    const pageUrl = currentPage === 'ProjectDetail' 
      ? createPageUrl('ProjectDetail') + `?id=${project.id}`
      : createPageUrl(currentPage) + `?id=${project.id}`;
    navigate(pageUrl);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 px-3 bg-white">
          <FolderKanban className="w-4 h-4 text-slate-500" />
          <span className="max-w-[150px] truncate font-medium">
            {currentProject?.name || 'Select Project'}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[300px]">
          <div className="p-1">
            {pinnedProjects.length > 0 && (
              <>
                <p className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Pinned
                </p>
                {pinnedProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => handleSelect(project)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors",
                      currentProject?.id === project.id 
                        ? "bg-indigo-50 text-indigo-700" 
                        : "hover:bg-slate-50"
                    )}
                  >
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      {project.client && (
                        <p className="text-xs text-slate-500 truncate">{project.client}</p>
                      )}
                    </div>
                    {currentProject?.id === project.id && (
                      <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </>
            )}
            
            {unpinnedProjects.length > 0 && (
              <>
                {pinnedProjects.length > 0 && (
                  <p className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2">
                    All Projects
                  </p>
                )}
                {unpinnedProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => handleSelect(project)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors",
                      currentProject?.id === project.id 
                        ? "bg-indigo-50 text-indigo-700" 
                        : "hover:bg-slate-50"
                    )}
                  >
                    <FolderKanban className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      {project.client && (
                        <p className="text-xs text-slate-500 truncate">{project.client}</p>
                      )}
                    </div>
                    {currentProject?.id === project.id && (
                      <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </>
            )}
            
            {filteredProjects.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No projects found</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronDown, Search, FolderKanban, Check, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

function ProjectList({ projects, pinnedProjects, unpinnedProjects, currentProject, filteredProjects, onSelect }) {
  return (
    <>
      {pinnedProjects.length > 0 && (
        <>
          <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Pinned
          </p>
          {pinnedProjects.map(project => (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-lg sm:rounded-md text-left transition-colors",
                currentProject?.id === project.id
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/50 active:bg-slate-100"
              )}
            >
              <Star className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
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
            <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2">
              All Projects
            </p>
          )}
          {unpinnedProjects.map(project => (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-lg sm:rounded-md text-left transition-colors",
                currentProject?.id === project.id
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/50 active:bg-slate-100"
              )}
            >
              <FolderKanban className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
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
        <p className="text-sm text-slate-500 text-center py-6">No projects found</p>
      )}
    </>
  );
}

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

  const pinnedIds = JSON.parse(localStorage.getItem('pinnedProjects') || '[]');
  const pinnedProjects = filteredProjects.filter(p => pinnedIds.includes(p.id));
  const unpinnedProjects = filteredProjects.filter(p => !pinnedIds.includes(p.id));

  const handleSelect = (project) => {
    const pageUrl = currentPage === 'ProjectDetail'
      ? createPageUrl('ProjectDetail') + `?id=${project.id}`
      : createPageUrl(currentPage) + `?id=${project.id}`;
    navigate(pageUrl);
    setOpen(false);
    setSearch('');
  };

  const triggerButton = (
    <Button variant="outline" className="gap-2 h-9 px-3 bg-white dark:bg-[#1e2a3a] dark:border-slate-600">
      <FolderKanban className="w-4 h-4 text-slate-500" />
      <span className="max-w-[150px] truncate font-medium">
        {currentProject?.name || 'Select Project'}
      </span>
      <ChevronDown className="w-4 h-4 text-slate-400" />
    </Button>
  );

  return (
    <>
      {/* ── Desktop: Popover ── */}
      <div className="hidden sm:block">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {triggerButton}
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
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
                <ProjectList
                  projects={projects}
                  pinnedProjects={pinnedProjects}
                  unpinnedProjects={unpinnedProjects}
                  currentProject={currentProject}
                  filteredProjects={filteredProjects}
                  onSelect={handleSelect}
                />
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Mobile: Full-screen sheet ── */}
      <div className="sm:hidden">
        <Button
          variant="outline"
          className="gap-2 h-9 px-3 bg-white dark:bg-[#1e2a3a] dark:border-slate-600"
          onClick={() => setOpen(true)}
        >
          <FolderKanban className="w-4 h-4 text-slate-500" />
          <span className="max-w-[120px] truncate font-medium text-xs">
            {currentProject?.name || 'Select'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </Button>

        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-50"
                onClick={() => { setOpen(false); setSearch(''); }}
              />
              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-[#1e2a3a] rounded-t-2xl shadow-2xl max-h-[85dvh] flex flex-col"
              >
                {/* Handle bar */}
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-3">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Switch Project</h2>
                  <button
                    onClick={() => { setOpen(false); setSearch(''); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search projects..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-10 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Project list */}
                <div className="flex-1 overflow-y-auto px-2 pb-6">
                  <ProjectList
                    projects={projects}
                    pinnedProjects={pinnedProjects}
                    unpinnedProjects={unpinnedProjects}
                    currentProject={currentProject}
                    filteredProjects={filteredProjects}
                    onSelect={handleSelect}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight, Home, FolderKanban, ListTodo, Package, FileText, Clock, MessageSquare, File } from 'lucide-react';
import { cn } from '@/lib/utils';

const pageIcons = {
  Dashboard: Home,
  ProjectDetail: FolderKanban,
  ProjectTasks: ListTodo,
  ProjectParts: Package,
  ProjectNotes: MessageSquare,
  ProjectFiles: File,
  ProjectBilling: Clock,
  TimeReport: Clock
};

export default function ProjectBreadcrumbs({ project, currentPage, className }) {
  const Icon = pageIcons[currentPage] || FolderKanban;
  
  const getPageLabel = (page) => {
    switch (page) {
      case 'ProjectDetail': return 'Overview';
      case 'ProjectTasks': return 'Tasks';
      case 'ProjectParts': return 'Parts';
      case 'ProjectNotes': return 'Notes';
      case 'ProjectFiles': return 'Files';
      case 'ProjectBilling': return 'Billing';
      case 'TimeReport': return 'Time Report';
      default: return page;
    }
  };

  return (
    <nav className={cn("flex items-center text-sm", className)}>
      <Link 
        to={createPageUrl('Dashboard')} 
        className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      
      <ChevronRight className="w-4 h-4 mx-2 text-slate-300 dark:text-slate-600" />

      {project && (
        <>
          <Link
            to={createPageUrl('ProjectDetail') + `?id=${project.id}`}
            className={cn(
              "flex items-center gap-1.5 transition-colors max-w-[200px]",
              currentPage === 'ProjectDetail'
                ? "text-slate-900 dark:text-slate-100 font-medium"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <FolderKanban className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{project.name}</span>
          </Link>
          
          {currentPage !== 'ProjectDetail' && (
            <>
              <ChevronRight className="w-4 h-4 mx-2 text-slate-300 dark:text-slate-600" />
              <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-medium">
                <Icon className="w-4 h-4" />
                <span>{getPageLabel(currentPage)}</span>
              </div>
            </>
          )}
        </>
      )}
    </nav>
  );
}
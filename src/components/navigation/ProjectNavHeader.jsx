import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, ListTodo, Package, MessageSquare, File, Clock, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProjectBreadcrumbs from './ProjectBreadcrumbs';
import ProjectSwitcher from './ProjectSwitcher';

const navTabs = [
  { page: 'ProjectDetail', label: 'Overview', icon: LayoutDashboard },
  { page: 'ProjectTasks', label: 'Tasks', icon: ListTodo },
  { page: 'ProjectParts', label: 'Parts', icon: Package },
  { page: 'ProjectNotes', label: 'Notes', icon: MessageSquare },
  { page: 'ProjectFiles', label: 'Files', icon: File },
  { page: 'ProjectTime', label: 'Time', icon: Clock },
];

export default function ProjectNavHeader({ project, currentPage }) {
  if (!project) return null;

  return (
    <div className="bg-card border-b border sticky top-14 z-30">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        {/* Top row - Breadcrumbs & Switcher */}
        <div className="flex items-center justify-between py-2 sm:py-3 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Link
              to={createPageUrl('Dashboard')}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            {/* Mobile: just show project name truncated */}
            <span className="sm:hidden text-sm font-medium text-foreground truncate min-w-0">
              {project.name}
            </span>
            {/* Desktop: full breadcrumbs */}
            <span className="hidden sm:inline-flex min-w-0">
              <ProjectBreadcrumbs project={project} currentPage={currentPage} />
            </span>
          </div>
          <ProjectSwitcher currentProject={project} currentPage={currentPage} />
        </div>

        {/* Bottom row - Tab Navigation — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 -mb-px overflow-x-auto pb-px scrollbar-none">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.page;
            return (
              <Link
                key={tab.page}
                to={createPageUrl(tab.page) + `?id=${project.id}`}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
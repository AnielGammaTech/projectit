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
  { page: 'ProjectBilling', label: 'Billing', icon: Clock },
];

export default function ProjectNavHeader({ project, currentPage }) {
  if (!project) return null;

  return (
    <div className="bg-white border-b border-slate-200 sticky top-14 z-30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row - Breadcrumbs & Switcher */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <Link 
              to={createPageUrl('Dashboard')} 
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <ProjectBreadcrumbs project={project} currentPage={currentPage} />
          </div>
          <ProjectSwitcher currentProject={project} currentPage={currentPage} />
        </div>
        
        {/* Bottom row - Tab Navigation */}
        <div className="flex items-center gap-1 -mb-px overflow-x-auto pb-px">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.page;
            return (
              <Link
                key={tab.page}
                to={createPageUrl(tab.page) + `?id=${project.id}`}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive 
                    ? "border-[#0069AF] text-[#0069AF]" 
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
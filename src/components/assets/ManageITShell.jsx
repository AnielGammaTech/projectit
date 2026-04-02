import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import {
  HardDrive, Package, Users, TrendingUp,
} from 'lucide-react';

const MANAGEIT_TABS = [
  { name: 'Dashboard', icon: HardDrive, page: 'AssetDashboard' },
  { name: 'Assets', icon: Package, page: 'AssetInventory' },
  { name: 'Employees', icon: Users, page: 'AssetEmployees' },
  { name: 'Reports', icon: TrendingUp, page: 'AssetReports' },
];

// Pages that should highlight a tab but aren't tabs themselves
const PAGE_TO_TAB = {
  AssetDetail: 'AssetInventory',
  AssetAssign: 'AssetInventory',
  AssetLicenses: 'AssetInventory',
  AssetEmployeeDetail: 'AssetEmployees',
  MyAssets: 'AssetInventory',
};

export default function ManageITShell({ children }) {
  const location = useLocation();
  const currentPath = location.pathname.replace('/', '');

  const activeTab = PAGE_TO_TAB[currentPath] || currentPath;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-background to-background dark:from-emerald-950/20 dark:via-background dark:to-background">
      {/* ManageIT branded sub-header */}
      <div className="border-b border-emerald-200/60 dark:border-emerald-900/40 bg-white/80 dark:bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-12">
            {/* Brand */}
            <Link to={createPageUrl('AssetDashboard')} className="flex items-center gap-2 shrink-0">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <HardDrive className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">ManageIT</span>
            </Link>

            <div className="h-5 w-px bg-emerald-200 dark:bg-emerald-800 shrink-0" />

            {/* Tab navigation */}
            <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
              {MANAGEIT_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.page;
                return (
                  <Link
                    key={tab.page}
                    to={createPageUrl(tab.page)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                      isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", isActive ? "text-emerald-600 dark:text-emerald-400" : "")} />
                    {tab.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import {
  HardDrive, Package, Users, TrendingUp, Shield, ArrowLeft,
} from 'lucide-react';

function ManageITLogo({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <text x="4" y="26" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="28" fill="white">M</text>
      <circle cx="26" cy="6" r="3.5" fill="#4ade80" />
    </svg>
  );
}

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
  const { user: currentUser, isLoadingAuth } = useAuth();

  const activeTab = PAGE_TO_TAB[currentPath] || currentPath;

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto px-4 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-48 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You need administrator privileges to access ManageIT.</p>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-background to-background dark:from-emerald-950/20 dark:via-background dark:to-background">
      {/* ManageIT branded sub-header */}
      <div className="border-b border-emerald-300/60 dark:border-emerald-900/40 bg-white/80 dark:bg-card/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4 h-12">
            {/* Brand */}
            <Link to={createPageUrl('AssetDashboard')} className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-700 to-green-800 shadow-sm shadow-emerald-400/30 dark:shadow-emerald-900/40 flex items-center justify-center">
                <ManageITLogo className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 tracking-tight">ManageIT</span>
            </Link>

            <div className="h-5 w-px bg-emerald-300/80 dark:bg-emerald-800/60 shrink-0" />

            {/* Tab navigation — centered */}
            <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
              {MANAGEIT_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.page;
                return (
                  <Link
                    key={tab.page}
                    to={createPageUrl(tab.page)}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all relative group",
                      isActive
                        ? "bg-emerald-700 text-white font-medium shadow-sm shadow-emerald-400/30 dark:shadow-emerald-900/40"
                        : "text-slate-500 dark:text-slate-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/20"
                    )}
                  >
                    <Icon className={cn(
                      "w-3.5 h-3.5 shrink-0",
                      isActive ? "text-white/90" : "text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                    )} />
                    {tab.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Page content — all cards inside get green shadows via CSS */}
      <div className="manageit-content">
        {children}
      </div>
    </div>
  );
}

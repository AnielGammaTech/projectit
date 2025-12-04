import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  ListTodo, 
  Menu,
  X,
  Wrench,
  FileText,
  Package,
  Shield,
  User,
  Settings,
  LogOut,
  Search,
  Zap,
  Wallet,
  Users,
  Activity,
  Clock,
  TrendingUp,
  PieChart,
  ChevronDown,
  Bell,
  Globe
} from 'lucide-react';
import { useState, useEffect } from 'react';
import GlobalSearch from '@/components/GlobalSearch';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { 
    name: 'My Stuff', 
    icon: User, 
    submenu: [
      { name: 'My Assignments', icon: ListTodo, page: 'MyAssignments' },
      { name: 'My Schedule', icon: Clock, page: 'MySchedule' },
      { name: 'My Proposals', icon: FileText, page: 'Proposals', params: '?created_by=me' },
    ]
  },
  { name: 'All Tasks', icon: ListTodo, page: 'AllTasks' },
  { name: 'Customers', icon: Users, page: 'Customers' },
  { name: 'Proposals', icon: FileText, page: 'Proposals' },
  { name: 'Billing', icon: Wallet, page: 'Billing' },
  { name: 'Catalog', icon: Package, page: 'Inventory' },
  { 
    name: 'Reporting', 
    icon: PieChart, 
    submenu: [
      { name: 'Activity', icon: Activity, page: 'Reports', params: '?type=activity' },
      { name: 'Timesheets', icon: Clock, page: 'Reports', params: '?type=timesheets' },
      { name: 'Financial', icon: TrendingUp, page: 'Reports', params: '?type=financial' },
      { name: 'Report Builder', icon: PieChart, page: 'ReportBuilder' },
    ]
  },
  { name: 'Workflows', icon: Zap, page: 'Workflows', adminOnly: true },
  { name: 'Adminland', icon: Shield, page: 'Adminland', adminOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  const { data: appSettings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const settings = await base44.entities.ProposalSettings.filter({ setting_key: 'main' });
      return settings[0] || {};
    }
  });

  // Check for user-related activity (tasks assigned, mentions, etc.)
  const { data: userActivity = [] } = useQuery({
    queryKey: ['userActivity', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const activities = await base44.entities.ProjectActivity.list('-created_date', 50);
      // Filter for activities involving this user (not created by them)
      return activities.filter(a => 
        a.actor_email !== currentUser.email && 
        (a.description?.includes(currentUser.full_name) || 
         a.description?.includes(currentUser.email) ||
         a.description?.toLowerCase().includes('assigned'))
      );
    },
    enabled: !!currentUser?.email,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const hasNewActivity = userActivity.length > 0;

  const appName = appSettings?.app_name || 'IT Projects';
  const appLogoUrl = appSettings?.app_logo_url;

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setIsAdmin(user?.role === 'admin');
    }).catch(() => {});
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 ml-3">
            {appLogoUrl ? (
              <img src={appLogoUrl} alt="" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#133F5C] flex items-center justify-center">
                <Wrench className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="font-semibold text-slate-900">{appName}</span>
          </div>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          className="p-2 hover:bg-slate-100 rounded-lg mr-2"
        >
          <Search className="w-5 h-5 text-slate-500" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-[#0069AF] flex items-center justify-center text-white text-sm font-medium">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                getInitials(currentUser?.full_name || currentUser?.email)
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{currentUser?.full_name || 'User'}</p>
              <p className="text-xs text-slate-500">{currentUser?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={createPageUrl('ActivityFeed')} className="cursor-pointer flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Activity Feed
                </div>
                {hasNewActivity && (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={createPageUrl('NotificationSettings')} className="cursor-pointer">
                <Bell className="w-4 h-4 mr-2" />
                My Notifications
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={createPageUrl('Profile')} className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-red-600 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {appLogoUrl ? (
                  <img src={appLogoUrl} alt="" className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="font-semibold text-slate-900">{appName}</span>
              </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden text-slate-600 hover:bg-slate-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search Button in Sidebar */}
        <div className="px-3 py-3">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search...</span>
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-400">⌘K</kbd>
          </button>
        </div>

        <nav className="px-3 flex-1 overflow-y-auto">
          {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
            const Icon = item.icon;

            // Handle submenu items
            if (item.submenu) {
              const isExpanded = expandedMenus[item.name];
              const isSubmenuActive = item.submenu.some(sub => 
                (sub.page === currentPageName) ||
                (sub.page === 'ReportBuilder' && currentPageName === 'ReportBuilder')
              );

              return (
                <div key={item.name}>
                  <button
                    onClick={() => setExpandedMenus(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg mb-0.5 transition-all text-sm",
                      isSubmenuActive 
                        ? "bg-slate-100 text-slate-900 font-medium" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-4 h-4", isSubmenuActive && "text-slate-900")} />
                      {item.name}
                    </div>
                    <ChevronDown className={cn("w-4 h-4 transition-transform text-slate-400", isExpanded && "rotate-180")} />
                  </button>
                  {isExpanded && (
                    <div className="ml-7 mb-1 space-y-0.5">
                      {item.submenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const subTypeParam = subItem.params ? new URLSearchParams(subItem.params).get('type') : null;
                        const currentType = new URLSearchParams(window.location.search).get('type');
                        const isSubActive = (subItem.page === currentPageName && subTypeParam === currentType) ||
                          (subItem.page === 'ReportBuilder' && currentPageName === 'ReportBuilder') ||
                          (subItem.page === currentPageName && !subItem.params && !currentType);
                        return (
                          <Link
                            key={subItem.name}
                            to={createPageUrl(subItem.page) + (subItem.params || '')}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all",
                              isSubActive 
                                ? "bg-slate-100 text-slate-900 font-medium" 
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            <SubIcon className={cn("w-4 h-4", isSubActive && "text-slate-700")} />
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = currentPageName === item.page || 
              (item.params && window.location.search === item.params);

            return (
              <Link
                key={item.name}
                to={createPageUrl(item.page) + (item.params || '')}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-all text-sm",
                  isActive 
                    ? "bg-slate-100 text-slate-900 font-medium" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive && "text-slate-900")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className="mt-auto p-3 border-t border-slate-100">
          <div className="space-y-0.5">
            <Link
              to={createPageUrl('ActivityFeed')}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4" />
                Activity Feed
              </div>
              {hasNewActivity && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </Link>
            <Link
              to={createPageUrl('NotificationSettings')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm"
            >
              <Bell className="w-4 h-4" />
              My Notifications
            </Link>
            <Link
              to={createPageUrl('Profile')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm"
            >
              <User className="w-4 h-4" />
              My Profile
            </Link>
            <button
              onClick={() => base44.auth.logout()}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        {children}
      </main>

      {/* Global Search */}
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}
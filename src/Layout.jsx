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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-40 px-4">
        <div className="max-w-[1800px] mx-auto h-full flex items-center justify-between">
          {/* Left: Logo & Nav Items */}
          <div className="flex items-center gap-6">
            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Logo */}
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
              {appLogoUrl ? (
                <img src={appLogoUrl} alt="" className="w-7 h-7 rounded-lg object-contain" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="font-semibold text-slate-900">{appName}</span>
            </Link>

            {/* Desktop Nav Items */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
                const Icon = item.icon;

                if (item.submenu) {
                  const isSubmenuActive = item.submenu.some(sub => 
                    (sub.page === currentPageName) ||
                    (sub.page === 'ReportBuilder' && currentPageName === 'ReportBuilder')
                  );

                  return (
                    <DropdownMenu key={item.name}>
                      <DropdownMenuTrigger asChild>
                        <button className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
                          isSubmenuActive 
                            ? "text-slate-900 font-medium" 
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}>
                          {item.name}
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        {item.submenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <DropdownMenuItem key={subItem.name} asChild>
                              <Link to={createPageUrl(subItem.page) + (subItem.params || '')} className="cursor-pointer">
                                <SubIcon className="w-4 h-4 mr-2" />
                                {subItem.name}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                const isActive = currentPageName === item.page;

                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.page) + (item.params || '')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm transition-all",
                      isActive 
                        ? "text-slate-900 font-medium" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search & User */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 text-sm"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-400 ml-2">⌘K</kbd>
            </button>
            <button
              onClick={() => setShowSearch(true)}
              className="sm:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Search className="w-5 h-5 text-slate-500" />
            </button>

            {/* Activity Bell */}
            <Link to={createPageUrl('ActivityFeed')} className="relative p-2 hover:bg-slate-100 rounded-lg">
              <Bell className="w-5 h-5 text-slate-500" />
              {hasNewActivity && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-medium hover:bg-slate-700 transition-colors">
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
                  <Link to={createPageUrl('Profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('NotificationSettings')} className="cursor-pointer">
                    <Bell className="w-4 h-4 mr-2" />
                    Notifications
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
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 transition-transform duration-300 flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {appLogoUrl ? (
              <img src={appLogoUrl} alt="" className="w-7 h-7 rounded-lg object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="font-semibold text-slate-900">{appName}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
            const Icon = item.icon;

            if (item.submenu) {
              const isExpanded = expandedMenus[item.name];
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setExpandedMenus(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </div>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                  {isExpanded && (
                    <div className="ml-7 space-y-0.5">
                      {item.submenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <Link
                            key={subItem.name}
                            to={createPageUrl(subItem.page) + (subItem.params || '')}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                          >
                            <SubIcon className="w-4 h-4" />
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={createPageUrl(item.page) + (item.params || '')}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 text-sm"
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="pt-14">
        {children}
      </main>

      {/* Global Search */}
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
  }
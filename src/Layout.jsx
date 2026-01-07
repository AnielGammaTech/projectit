import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
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
  Users,
  Activity,
  Clock,
  TrendingUp,
  PieChart,
  ChevronDown,
  Bell,
  Globe,
  Inbox,
  Calendar,
  Moon,
  Sun
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import GlobalSearch from '@/components/GlobalSearch';
import NotificationToast from '@/components/NotificationToast';
import FeedbackButton from '@/components/FeedbackButton';
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
  { name: 'Activity', icon: ListTodo, page: 'AllTasks' },
  { name: 'Customers', icon: Users, page: 'Customers' },
  { name: 'Stock', icon: Package, page: 'Stock' },
  { name: 'Reports', icon: PieChart, page: 'Reports' },
];

export default function Layout({ children, currentPageName }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState({});
    const [newNotification, setNewNotification] = useState(null);
    const lastNotificationIdRef = useRef(null);

  const { data: appSettings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return settings[0] || {};
    },
    staleTime: 300000 // 5 minutes - prevent refetching and logo flickering
  });

  // Fetch user notifications
  const { data: userNotifications = [] } = useQuery({
    queryKey: ['layoutNotifications', currentUser?.email],
    queryFn: () => base44.entities.UserNotification.filter({ user_email: currentUser.email }, '-created_date', 50),
    enabled: !!currentUser?.email,
    refetchInterval: 10000 // Check every 10 seconds for new notifications
  });

  const unreadNotifications = userNotifications.filter(n => !n.is_read);
  const unreadCount = unreadNotifications.length;

  // Show toast for new notifications
  useEffect(() => {
    if (unreadNotifications.length > 0) {
      const latestNotification = unreadNotifications[0];
      if (lastNotificationIdRef.current !== latestNotification.id) {
        // Only show toast if this is a genuinely new notification (not on initial load)
        if (lastNotificationIdRef.current !== null) {
          setNewNotification(latestNotification);
        }
        lastNotificationIdRef.current = latestNotification.id;
      }
    }
  }, [unreadNotifications]);

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
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#0F2F44] z-40 px-4">
        <div className="max-w-[1800px] mx-auto h-full flex items-center">
          {/* Left: Logo */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Logo */}
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
              {appLogoUrl ? (
                <img src={appLogoUrl} alt="" className="w-7 h-7 rounded-lg object-contain" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#74C7FF] flex items-center justify-center">
                  <Globe className="w-4 h-4 text-[#133F5C]" />
                </div>
              )}
              <span className="font-semibold text-white hidden sm:inline">ProjectIT</span>
            </Link>
          </div>

          {/* Center: Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
              {navItems.map((item) => {
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
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all group relative",
                          isSubmenuActive 
                            ? "text-[#B4E1FF] bg-white/10 font-medium" 
                            : "text-white/80 hover:text-white hover:bg-white/10"
                        )}>
                          <Icon className={cn(
                            "w-4 h-4 transition-colors",
                            isSubmenuActive ? "text-[#B4E1FF]" : "text-white/60 group-hover:text-white"
                          )} />
                          {item.name}
                          <ChevronDown className={cn(
                            "w-3.5 h-3.5 transition-colors",
                            isSubmenuActive ? "text-[#B4E1FF]" : "text-white/60"
                          )} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52 p-1">
                        {item.submenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const subTypeParam = subItem.params ? new URLSearchParams(subItem.params).get('type') : null;
                          const currentType = new URLSearchParams(window.location.search).get('type');
                          const isSubActive = (subItem.page === currentPageName && subTypeParam === currentType) ||
                            (subItem.page === 'ReportBuilder' && currentPageName === 'ReportBuilder');
                          return (
                            <DropdownMenuItem key={subItem.name} asChild>
                              <Link 
                                to={createPageUrl(subItem.page) + (subItem.params || '')} 
                                className={cn(
                                  "cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md",
                                  isSubActive && "bg-[#0069AF]/10 text-[#0069AF]"
                                )}
                              >
                                <SubIcon className={cn("w-4 h-4", isSubActive ? "text-[#0069AF]" : "text-slate-400")} />
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
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all group",
                      isActive 
                        ? "text-[#B4E1FF] bg-white/10 font-medium" 
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    )}
                    >
                    <Icon className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-[#B4E1FF]" : "text-white/60 group-hover:text-white"
                    )} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Search, Notifications & User */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSearch(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 text-sm"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 bg-white/20 rounded text-white/50 ml-2">⌘K</kbd>
            </button>
            <button
              onClick={() => setShowSearch(true)}
              className="sm:hidden p-2 hover:bg-white/10 rounded-lg"
            >
              <Search className="w-5 h-5 text-white/70" />
            </button>

            {/* My Schedule */}
            <Link
              to={createPageUrl('MySchedule')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="My Schedule"
            >
              <Calendar className="w-5 h-5 text-white/70" />
            </Link>

            {/* Notifications Bell */}
            <Link
              to={createPageUrl('MyNotifications')}
              className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-white/70" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] text-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-[#B4E1FF] flex items-center justify-center text-[#0F2F44] text-sm font-medium hover:bg-[#8fd4ff] transition-all">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    getInitials(currentUser?.full_name || currentUser?.email)
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900">{currentUser?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-500">{currentUser?.email}</p>
                </div>
                <div className="py-1">
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Profile')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2 text-slate-500" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('NotificationSettings')} className="cursor-pointer">
                      <Bell className="w-4 h-4 mr-2 text-slate-500" />
                      Notifications
                    </Link>
                  </DropdownMenuItem>
                </div>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="py-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                            <div className="flex items-center">
                              <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                              TV Dashboards
                            </div>
                            <ChevronDown className="w-3 h-3 ml-2" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="left" align="start">
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('ManagerDashboard')} className="cursor-pointer">
                              <Activity className="w-4 h-4 mr-2 text-indigo-500" />
                              Manager Dashboard
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('TechDashboard')} className="cursor-pointer">
                              <Clock className="w-4 h-4 mr-2 text-emerald-500" />
                              Tech Dashboard
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Adminland')} className="cursor-pointer">
                          <Shield className="w-4 h-4 mr-2 text-[#0069AF]" />
                          Adminland
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Workflows')} className="cursor-pointer">
                          <Zap className="w-4 h-4 mr-2 text-amber-500" />
                          Workflows
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  </>
                )}
                <DropdownMenuSeparator />
                <div className="py-1">
                  <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </div>
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
          {navItems.map((item) => {
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

      {/* Notification Toast */}
              <AnimatePresence>
                {newNotification && (
                  <NotificationToast 
                    notification={newNotification} 
                    onDismiss={() => setNewNotification(null)} 
                  />
                )}
              </AnimatePresence>

              {/* Floating Feedback Button */}
              <FeedbackButton />
            </div>
          );
          }
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl, resolveUploadUrl } from '@/utils';
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
  AlertTriangle,
  HardDrive,
  ArrowDownUp,
  Key,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import GlobalSearch from '@/components/GlobalSearch';
import NotificationToast from '@/components/NotificationToast';
import NotificationPanel from '@/components/NotificationPanel';
import FeedbackButton from '@/components/FeedbackButton';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { setBadgeCount } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { api } from '@/api/apiClient';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserAvatar from '@/components/UserAvatar';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Activity', icon: ListTodo, page: 'AllTasks' },
  { name: 'Schedule', icon: Calendar, page: 'MySchedule' },
  { name: 'Customers', icon: Users, page: 'Customers' },
  { name: 'Stock', icon: Package, page: 'Stock' },
  { name: 'Reports', icon: PieChart, page: 'Reports' },
  { name: 'ManageIT', icon: HardDrive, page: 'AssetDashboard', submenu: [
    { name: 'Dashboard', icon: HardDrive, page: 'AssetDashboard' },
    { name: 'Inventory', icon: Package, page: 'AssetInventory' },
    { name: 'Assign / Return', icon: ArrowDownUp, page: 'AssetAssign' },
    { name: 'Employees', icon: Users, page: 'AssetEmployees' },
    { name: 'Licenses', icon: Key, page: 'AssetLicenses' },
    { name: 'Reports', icon: TrendingUp, page: 'AssetReports' },
  ]},
];

function LayoutContent({ children, currentPageName }) {
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
      const settings = await api.entities.AppSettings.filter({ setting_key: 'main' });
      return settings[0] || {};
    },
    staleTime: 300000 // 5 minutes - prevent refetching and logo flickering
  });

  // Fetch projects to filter out archived ones from notifications
  const { data: allProjects = [] } = useQuery({
    queryKey: ['allProjectsForLayout'],
    queryFn: () => api.entities.Project.list(),
    enabled: !!currentUser?.email,
    staleTime: 60000
  });

  const archivedProjectIds = new Set(
    allProjects.filter(p => p.status === 'archived').map(p => p.id)
  );

  const activeProjectIds = new Set(
    allProjects.filter(p => p.status !== 'archived').map(p => p.id)
  );

  // Fetch tasks for overdue banner
  const { data: allTasks = [] } = useQuery({
    queryKey: ['layoutTasks', currentUser?.email],
    queryFn: () => api.entities.Task.filter({ assigned_to: currentUser.email }),
    enabled: !!currentUser?.email,
    staleTime: 30000,
    refetchInterval: 30000
  });

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allTasks.filter(t => {
      if (t.status === 'completed' || t.status === 'archived') return false;
      if (!t.due_date || !activeProjectIds.has(t.project_id)) return false;
      const due = new Date(t.due_date + 'T00:00:00');
      return due < today;
    }).length;
  }, [allTasks, activeProjectIds]);

  // Fetch user notifications (polling as fallback + realtime for instant)
  const { data: rawUserNotifications = [] } = useQuery({
    queryKey: ['layoutNotifications', currentUser?.email],
    queryFn: () => api.entities.UserNotification.filter({ user_email: currentUser.email }, '-created_date', 50),
    enabled: !!currentUser?.email,
    staleTime: 5000,
    refetchInterval: 5000
  });

  // Subscribe to realtime notifications via Supabase
  useRealtimeNotifications(currentUser?.email);

  // Filter out notifications from archived projects
  const userNotifications = rawUserNotifications.filter(n =>
    !n.project_id || !archivedProjectIds.has(n.project_id)
  );

  const unreadNotifications = userNotifications.filter(n => !n.is_read);
  const unreadCount = unreadNotifications.length;

  // Sync app icon badge with unread count
  useEffect(() => {
    setBadgeCount(unreadCount);
  }, [unreadCount]);

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
    api.auth.me().then(user => {
      setCurrentUser(user);
      setIsAdmin(user?.role === 'admin');
      if (user.theme) {
        const currentTheme = localStorage.getItem('theme');
        if (user.theme !== currentTheme) {
          localStorage.setItem('theme', user.theme);
          const html = document.documentElement;
          html.classList.remove('light', 'dark');
          html.classList.add(user.theme);
        }
      }
    }).catch(() => {});
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-[#0F2F44] to-[#133F5C] dark:from-[#0a1e2e] dark:to-[#0e2d40] z-40 px-4 shadow-lg shadow-[#0F2F44]/10">
        <div className="max-w-[1800px] mx-auto h-14 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Mobile Menu Button — hidden on mobile (bottom nav used instead) */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:hidden sm:inline-flex text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Logo — always show name on mobile */}
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2.5">
              {appLogoUrl ? (
                <img src={resolveUploadUrl(appLogoUrl)} alt="" className="w-7 h-7 rounded-lg object-contain" />
              ) : (
                <img src="/favicon.svg" alt="" className="w-7 h-7" />
              )}
              <span className="font-bold text-white tracking-tight">Project<span className="text-[#74C7FF]">IT</span></span>
            </Link>
          </div>

          {/* Center: Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
              {navItems.map((item, index) => {
                if (item.type === 'separator') {
                  return (
                    <div key={index} className="mx-1.5 h-5 w-px bg-white/20" />
                  );
                }

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
                      <DropdownMenuContent align="start" className="w-52 p-1 rounded-xl">
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
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all group relative",
                      isActive
                        ? "text-white font-medium bg-white/15 shadow-sm"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    )}
                    >
                    <Icon className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-[#74C7FF]" : "text-white/50 group-hover:text-white/80"
                    )} />
                    {item.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#74C7FF] rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Center: Overdue banner (mobile only) */}
            {overdueCount > 0 && (
              <Link
                to={createPageUrl('AllTasks')}
                className="sm:hidden flex items-center gap-1.5 text-[11px] font-bold absolute left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-3 py-1 rounded-full"
              >
                <AlertTriangle className="w-3 h-3" />
                {overdueCount} overdue
              </Link>
            )}

            {/* Right: Search, Notifications & User */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSearch(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 text-sm"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 bg-white/20 rounded text-white/50 ml-2">⌘K</kbd>
            </button>
            {/* Dark/Light Mode Toggle */}
            <button
              onClick={() => {
                const html = document.documentElement;
                const isDark = html.classList.contains('dark');
                html.classList.toggle('dark', !isDark);
                localStorage.setItem('theme', isDark ? 'light' : 'dark');
                api.auth.updateMe({ theme: isDark ? 'light' : 'dark' }).catch(() => {});
              }}
              className="hidden sm:flex p-2 hover:bg-white/10 rounded-lg transition-all"
              title="Toggle dark/light mode"
            >
              <svg className="w-5 h-5 text-white/70 dark:hidden" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
              <svg className="w-5 h-5 text-amber-300 hidden dark:block" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            </button>

            {/* My Schedule — hidden on mobile */}
            <Link
              to={createPageUrl('MySchedule')}
              className="hidden sm:block p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="My Schedule"
            >
              <Calendar className="w-5 h-5 text-white/70" />
            </Link>

            {/* Notifications Bell — mobile: navigate to page, desktop: popover */}
            <div className="sm:hidden">
              <Link
                to={createPageUrl('MyNotifications')}
                className={cn(
                  "relative p-2 rounded-lg transition-colors block",
                  unreadCount > 0 ? "bg-white/15" : "hover:bg-white/10"
                )}
              >
                <Bell className={cn("w-5 h-5", unreadCount > 0 ? "text-white" : "text-white/70")} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[20px] text-center ring-2 ring-[#133F5C] animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
            <div className="hidden sm:block">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "relative p-2 rounded-lg transition-colors",
                      unreadCount > 0 ? "bg-white/15 hover:bg-white/25" : "hover:bg-white/10"
                    )}
                  >
                    <Bell className={cn("w-5 h-5", unreadCount > 0 ? "text-white" : "text-white/70")} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[20px] text-center ring-2 ring-[#133F5C] animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-auto p-0 border-slate-200 dark:border-border shadow-xl">
                  <NotificationPanel currentUser={currentUser} onClose={() => {}} />
                </PopoverContent>
              </Popover>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="hover:ring-2 hover:ring-[#74C7FF]/50 hover:ring-offset-2 hover:ring-offset-[#133F5C] transition-all rounded-full">
                  <UserAvatar
                    email={currentUser?.email}
                    name={currentUser?.full_name || currentUser?.email}
                    avatarUrl={currentUser?.avatar_url}
                    size="md"
                  />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-border">
                  <p className="text-sm font-medium text-slate-900 dark:text-foreground">{currentUser?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">{currentUser?.email}</p>
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
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('MyAssets')} className="cursor-pointer">
                      <Package className="w-4 h-4 mr-2 text-slate-500" />
                      My Assets
                    </Link>
                  </DropdownMenuItem>
                </div>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="py-1">
                      {/* TV Dashboards & Workflows — desktop only */}
                      <div className="hidden sm:block">
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
                          <DropdownMenuContent side="left" align="start" className="rounded-xl">
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
                          <Link to={createPageUrl('Workflows')} className="cursor-pointer">
                            <Zap className="w-4 h-4 mr-2 text-amber-500" />
                            Workflows
                          </Link>
                        </DropdownMenuItem>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Adminland')} className="cursor-pointer">
                          <Shield className="w-4 h-4 mr-2 text-[#0069AF]" />
                          Adminland
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  </>
                )}
                <DropdownMenuSeparator />
                <div className="py-1">
                  <DropdownMenuItem onClick={() => api.auth.logout(window.location.origin)} className="text-red-600 cursor-pointer">
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
        "lg:hidden fixed top-0 left-0 h-full w-72 bg-white dark:bg-card z-50 transition-transform duration-300 flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-slate-100 dark:border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {appLogoUrl ? (
              <img src={resolveUploadUrl(appLogoUrl)} alt="" className="w-7 h-7 rounded-lg object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#74C7FF] flex items-center justify-center">
                <Globe className="w-4 h-4 text-[#133F5C]" />
              </div>
            )}
            <span className="font-semibold text-slate-900 dark:text-foreground">{appName}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {navItems.map((item, index) => {
            if (item.type === 'separator') {
              return (
                <div key={index} className="pt-4 pb-1 px-3">
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{item.label}</p>
                </div>
              );
            }

            const Icon = item.icon;

            if (item.submenu) {
              const isExpanded = expandedMenus[item.name];
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setExpandedMenus(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted text-sm touch-manipulation"
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
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-muted touch-manipulation"
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
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted text-sm touch-manipulation active:bg-slate-100 dark:active:bg-muted"
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="pt-safe-header pb-20 lg:pb-0">
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

      {/* Floating Feedback Button — desktop only */}
      <div className="hidden lg:block">
        <FeedbackButton />
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-card/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-border z-40 pb-safe rounded-t-2xl">
        <div className="flex items-center justify-around h-16">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.page) + (item.params || '')}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all duration-200 touch-manipulation active:scale-95",
                  isActive ? "text-[#0069AF]" : "text-slate-400 active:text-slate-600"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#0069AF] rounded-full" />
                )}
                <Icon className={cn("w-5 h-5 transition-colors", isActive && "text-[#0069AF]")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Adminland Button - desktop only, admins only */}
      {isAdmin && currentPageName !== 'Adminland' && (
        <Link
          to={createPageUrl('Adminland')}
          className="hidden lg:flex fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#0069AF] hover:bg-[#0F2F44] text-white rounded-full shadow-lg shadow-[#0069AF]/30 items-center justify-center transition-all hover:scale-110 hover:shadow-xl"
          title="Adminland"
        >
          <Shield className="w-5 h-5" />
        </Link>
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return <LayoutContent children={children} currentPageName={currentPageName} />;
}
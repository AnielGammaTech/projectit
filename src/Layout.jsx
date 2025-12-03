import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  LayoutDashboard, 
  ListTodo, 
  Menu,
  X,
  Wrench,
  BarChart3,
  FileText,
  Package,
  Shield,
  User,
  Settings,
  LogOut,
  Search
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
  { name: 'All Tasks', icon: ListTodo, page: 'AllTasks' },
  { name: 'Customers', icon: User, page: 'Customers' },
  { name: 'Proposals', icon: FileText, page: 'Proposals' },
  { name: 'Billing', icon: BarChart3, page: 'Billing' },
  { name: 'Catalog', icon: Package, page: 'Inventory' },
  { name: 'Reports', icon: BarChart3, page: 'Reports' },
  { name: 'Adminland', icon: Shield, page: 'Adminland', adminOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

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
            <div className="w-8 h-8 rounded-lg bg-[#133F5C] flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">IT Projects</span>
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
        "fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-[#0F2F44] to-[#133F5C] z-50 transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#74C7FF]/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-[#74C7FF]" />
              </div>
              <div>
                <h1 className="font-bold text-white">IT Projects</h1>
                <p className="text-xs text-[#74C7FF]/70">Management Tool</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search Button in Sidebar */}
        <div className="px-3 mb-4">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white/70"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search...</span>
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/50">⌘K</kbd>
          </button>
        </div>

        <nav className="px-3">
          {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
            const isActive = currentPageName === item.page;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all",
                                isActive 
                                  ? "bg-[#74C7FF]/20 text-white font-medium" 
                                  : "text-white/70 hover:bg-white/10 hover:text-white"
                              )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-[#74C7FF]")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#74C7FF] flex items-center justify-center text-[#133F5C] text-sm font-medium">
                    {getInitials(currentUser?.full_name || currentUser?.email)}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">{currentUser?.full_name || 'User'}</p>
                  <p className="text-xs text-white/60 truncate">{currentUser?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuItem asChild>
                <Link to={createPageUrl('Profile')} className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={createPageUrl('NotificationSettings')} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Notification Settings
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
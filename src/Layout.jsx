import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  LayoutDashboard, 
  ListTodo, 
  Menu,
  X,
  Wrench,
  FileStack,
  BarChart3,
  Bell,
  FileText,
  Package,
  Shield
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'All Tasks', icon: ListTodo, page: 'AllTasks' },
  { name: 'Quote Requests', icon: FileText, page: 'QuoteRequests' },
  { name: 'Inventory', icon: Package, page: 'Inventory' },
  { name: 'Reports', icon: BarChart3, page: 'Reports' },
  { name: 'Templates', icon: FileStack, page: 'Templates' },
  { name: 'Notifications', icon: Bell, page: 'NotificationSettings' },
  { name: 'Adminland', icon: Shield, page: 'Adminland', adminOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setIsAdmin(user?.role === 'admin');
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center px-4">
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

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#133F5C] flex items-center justify-center shadow-lg shadow-[#133F5C]/20">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">IT Projects</h1>
                <p className="text-xs text-slate-500">Management Tool</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
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
                                  ? "bg-[#74C7FF]/20 text-[#133F5C] font-medium" 
                                  : "text-[#0F2F44]/70 hover:bg-[#74C7FF]/10 hover:text-[#133F5C]"
                              )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-[#0069AF]")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <div className="text-xs text-slate-400 text-center">
            IT Project Management
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Wrench, Layers, AlertTriangle, ArrowDownUp, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductsTab from '@/components/stock/ProductsTab';
import PartsTrackerTab from '@/components/stock/PartsTrackerTab';
import ToolsTab from '@/components/stock/ToolsTab';
import ServicesTab from '@/components/stock/ServicesTab';
import BundlesTab from '@/components/stock/BundlesTab';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

export default function Stock() {
  const [activeTab, setActiveTab] = useState('inventory');

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
    staleTime: 300000
  });

  const { data: tools = [], isLoading: loadingTools } = useQuery({
    queryKey: ['tools'],
    queryFn: () => api.entities.Tool.list(),
    staleTime: 300000
  });

  if (loadingProducts || loadingTools) return <CardGridSkeleton />;

  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => (p.quantity_on_hand || 0) > 0 && (p.quantity_on_hand || 0) <= 5);
  const outOfStockProducts = products.filter(p => (p.quantity_on_hand || 0) === 0);
  const totalTools = tools.length;
  const checkedOutTools = tools.filter(t => (t.checked_out_count || 0) > 0);

  const stats = [
    { label: 'Products', value: totalProducts, icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Low Stock', value: lowStockProducts.length, icon: AlertTriangle, color: lowStockProducts.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400', bg: lowStockProducts.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Tools', value: totalTools, icon: HardDrive, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Checked Out', value: checkedOutTools.length, icon: ArrowDownUp, color: checkedOutTools.length > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400', bg: checkedOutTools.length > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Inventory & Tools</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track stock levels, tool checkouts, and services</p>
          </div>
          <div className="flex gap-3 sm:gap-4">
            {stats.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Alert */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && activeTab === 'inventory' && (
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-3 text-white shadow-lg shadow-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {outOfStockProducts.length > 0 && `${outOfStockProducts.length} out of stock`}
                  {outOfStockProducts.length > 0 && lowStockProducts.length > 0 && ' · '}
                  {lowStockProducts.length > 0 && `${lowStockProducts.length} running low`}
                </p>
                <p className="text-xs text-white/80 truncate">
                  {[...outOfStockProducts, ...lowStockProducts].slice(0, 3).map(p => p.name).join(', ')}
                  {[...outOfStockProducts, ...lowStockProducts].length > 3 && ` +${[...outOfStockProducts, ...lowStockProducts].length - 3} more`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tool Checkout Alert */}
        {checkedOutTools.length > 0 && activeTab === 'tools' && (
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 p-3 text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 shrink-0">
                <ArrowDownUp className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {checkedOutTools.length} tool{checkedOutTools.length > 1 ? 's' : ''} currently checked out
                </p>
                <p className="text-xs text-white/80 truncate">
                  {checkedOutTools.slice(0, 3).map(t => t.name).join(', ')}
                  {checkedOutTools.length > 3 && ` +${checkedOutTools.length - 3} more`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs — 3 tabs: Inventory, Tools, Services & Bundles */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="bg-card border w-max sm:w-auto p-1 rounded-xl">
              <TabsTrigger value="inventory" className="gap-1.5 sm:gap-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Inventory</span>
                {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                    {lowStockProducts.length + outOfStockProducts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="tools" className="gap-1.5 sm:gap-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                <HardDrive className="w-4 h-4" />
                <span className="hidden sm:inline">Tools</span>
                {checkedOutTools.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                    {checkedOutTools.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="services" className="gap-1.5 sm:gap-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Services & Bundles</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inventory">
            <div className="space-y-8">
              <ProductsTab />
              <div className="border-t pt-6">
                <PartsTrackerTab />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tools">
            <ToolsTab />
          </TabsContent>

          <TabsContent value="services">
            <div className="space-y-8">
              <ServicesTab />
              <div className="border-t pt-6">
                <BundlesTab />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

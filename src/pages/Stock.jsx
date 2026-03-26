import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Wrench, Layers, Truck, HardDrive, TrendingUp, AlertTriangle, ArrowDownUp } from 'lucide-react';
import ProductsTab from '@/components/stock/ProductsTab';
import ServicesTab from '@/components/stock/ServicesTab';
import BundlesTab from '@/components/stock/BundlesTab';
import PartsTrackerTab from '@/components/stock/PartsTrackerTab';
import ToolsTab from '@/components/stock/ToolsTab';

export default function Stock() {
  const [activeTab, setActiveTab] = useState('products');

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
    staleTime: 300000
  });

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => api.entities.Tool.list(),
    staleTime: 300000
  });

  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => (p.quantity_on_hand || 0) > 0 && (p.quantity_on_hand || 0) <= 5).length;
  const totalTools = tools.length;
  const checkedOutTools = tools.reduce((sum, t) => sum + (t.checked_out_count || 0), 0);

  const stats = [
    { label: 'Products', value: totalProducts, icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Low Stock', value: lowStockProducts, icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Tools', value: totalTools, icon: HardDrive, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Checked Out', value: checkedOutTools, icon: ArrowDownUp, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Inventory & Tools</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track products, tools, services, and parts</p>
          </div>
          {/* Quick Stats */}
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="bg-card border w-max sm:w-auto p-1 rounded-xl">
              <TabsTrigger value="products" className="gap-1.5 sm:gap-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-white">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Products</span>
              </TabsTrigger>
              <TabsTrigger value="tools" className="gap-1.5 sm:gap-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-white">
                <HardDrive className="w-4 h-4" />
                <span className="hidden sm:inline">Tools</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="gap-1.5 sm:gap-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-white">
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Services</span>
              </TabsTrigger>
              <TabsTrigger value="bundles" className="gap-1.5 sm:gap-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-white">
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Bundles</span>
              </TabsTrigger>
              <TabsTrigger value="parts-tracker" className="gap-1.5 sm:gap-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-white">
                <Truck className="w-4 h-4" />
                <span className="hidden sm:inline">Parts Tracker</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="tools">
            <ToolsTab />
          </TabsContent>

          <TabsContent value="services">
            <ServicesTab />
          </TabsContent>

          <TabsContent value="bundles">
            <BundlesTab />
          </TabsContent>

          <TabsContent value="parts-tracker">
            <PartsTrackerTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

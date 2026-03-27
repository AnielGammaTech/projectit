import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, AlertTriangle, ArrowDownUp, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductsTab from '@/components/stock/ProductsTab';
import ToolsTab from '@/components/stock/ToolsTab';
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

  const lowStockProducts = products.filter(p => (p.quantity_on_hand || 0) > 0 && (p.quantity_on_hand || 0) <= 5);
  const outOfStockProducts = products.filter(p => (p.quantity_on_hand || 0) === 0);
  const checkedOutTools = tools.filter(t => (t.checked_out_count || 0) > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Inventory & Tools</h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{products.length} products</span>
                <span>·</span>
                <span>{tools.length} tools</span>
                {checkedOutTools.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">{checkedOutTools.length} checked out</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && activeTab === 'inventory' && (
          <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-900/20 p-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                  {outOfStockProducts.length > 0 && `${outOfStockProducts.length} out of stock`}
                  {outOfStockProducts.length > 0 && lowStockProducts.length > 0 && ' · '}
                  {lowStockProducts.length > 0 && `${lowStockProducts.length} running low`}
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70 truncate">
                  {[...outOfStockProducts, ...lowStockProducts].slice(0, 3).map(p => p.name).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tool Checkout Alert */}
        {checkedOutTools.length > 0 && activeTab === 'tools' && (
          <div className="mb-4 rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/80 dark:bg-blue-900/20 p-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 shrink-0">
                <ArrowDownUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-blue-800 dark:text-blue-300">
                  {checkedOutTools.length} tool{checkedOutTools.length > 1 ? 's' : ''} checked out
                </p>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/70 truncate">
                  {checkedOutTools.slice(0, 3).map(t => t.name).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs — 2 tabs only: Inventory + Tools */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-4">
            <TabsList className="bg-card border p-1 rounded-xl">
              <TabsTrigger value="inventory" className="gap-1.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                <Package className="w-4 h-4" />
                Inventory
                {(lowStockProducts.length + outOfStockProducts.length) > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {lowStockProducts.length + outOfStockProducts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="tools" className="gap-1.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                <HardDrive className="w-4 h-4" />
                Tools
                {checkedOutTools.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {checkedOutTools.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inventory">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="tools">
            <ToolsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

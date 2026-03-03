import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Wrench, Layers, Truck, HardDrive } from 'lucide-react';
import ProductsTab from '@/components/stock/ProductsTab';
import ServicesTab from '@/components/stock/ServicesTab';
import BundlesTab from '@/components/stock/BundlesTab';
import PartsTrackerTab from '@/components/stock/PartsTrackerTab';
import ToolsTab from '@/components/stock/ToolsTab';

export default function Stock() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F2F44] dark:text-slate-100">Stock</h1>
          <p className="text-sm sm:text-base text-[#0F2F44]/60 dark:text-slate-400">Manage your products, services, tools, and bundles</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="bg-white dark:bg-[#1e2a3a] border border-slate-200 dark:border-slate-700/50 w-max sm:w-auto">
              <TabsTrigger value="products" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3 data-[state=active]:bg-[#0F2F44] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Products</span>
              </TabsTrigger>
              <TabsTrigger value="tools" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3 data-[state=active]:bg-[#0F2F44] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <HardDrive className="w-4 h-4" />
                <span className="hidden sm:inline">Tools</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3 data-[state=active]:bg-[#0F2F44] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Services</span>
              </TabsTrigger>
              <TabsTrigger value="bundles" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3 data-[state=active]:bg-[#0F2F44] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Bundles</span>
              </TabsTrigger>
              <TabsTrigger value="parts-tracker" className="gap-1.5 sm:gap-2 px-2.5 sm:px-3 data-[state=active]:bg-[#0F2F44] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white">
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
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Wrench, Layers, Truck } from 'lucide-react';
import ProductsTab from '@/components/stock/ProductsTab';
import ServicesTab from '@/components/stock/ServicesTab';
import BundlesTab from '@/components/stock/BundlesTab';
import PartsTrackerTab from '@/components/stock/PartsTrackerTab';

export default function Stock() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0F2F44]">Stock</h1>
          <p className="text-[#0F2F44]/60">Manage your products, services, and bundles</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 mb-6">
            <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-[#0F2F44] data-[state=active]:text-white">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2 data-[state=active]:bg-[#0F2F44] data-[state=active]:text-white">
              <Wrench className="w-4 h-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="bundles" className="gap-2 data-[state=active]:bg-[#0F2F44] data-[state=active]:text-white">
              <Layers className="w-4 h-4" />
              Bundles
            </TabsTrigger>
            <TabsTrigger value="parts-tracker" className="gap-2 data-[state=active]:bg-[#0F2F44] data-[state=active]:text-white">
              <Truck className="w-4 h-4" />
              Parts Tracker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsTab />
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
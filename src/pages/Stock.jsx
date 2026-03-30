import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, AlertTriangle, ArrowDownUp, HardDrive, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isNative } from '@/lib/capacitor';
import { Button } from '@/components/ui/button';
import ProductsTab from '@/components/stock/ProductsTab';
import ToolsTab from '@/components/stock/ToolsTab';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

export default function Stock() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [scanResult, setScanResult] = useState(null);

  const handleBarcodeScan = async () => {
    if (!isNative()) return;
    try {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) return alert('Barcode scanning not supported');

      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted') return alert('Camera permission required');

      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes.length > 0) {
        setActiveTab('inventory');
        setScanResult(barcodes[0].rawValue);
      }
    } catch (err) {
      console.error('Scan failed:', err);
    }
  };

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
        {/* Header + Tabs inline */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground">Stock</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{products.length} products</span>
                <span>·</span>
                <span>{tools.length} tools</span>
              </div>
            </div>
          </div>
          {isNative() && (
            <Button variant="outline" size="sm" onClick={handleBarcodeScan} className="sm:hidden gap-1.5">
              <ScanLine className="w-4 h-4" />
              <span className="text-xs">Scan</span>
            </Button>
          )}
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

        {/* Tabs — matching AllTasks toggle style */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setActiveTab('inventory')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all",
                activeTab === 'inventory'
                  ? "bg-card border-primary/30 shadow-sm"
                  : "border-border hover:bg-card/50"
              )}
            >
              <div className={cn("p-2 rounded-xl", activeTab === 'inventory' ? "bg-blue-500/10" : "bg-muted")}>
                <Package className={cn("w-5 h-5", activeTab === 'inventory' ? "text-blue-500" : "text-muted-foreground")} />
              </div>
              <div className="text-left">
                <p className={cn("text-sm font-semibold", activeTab === 'inventory' ? "text-foreground" : "text-muted-foreground")}>Inventory</p>
                <p className="text-[11px] text-muted-foreground">{products.length} products</p>
              </div>
              {(lowStockProducts.length + outOfStockProducts.length) > 0 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold">
                  {lowStockProducts.length + outOfStockProducts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all",
                activeTab === 'tools'
                  ? "bg-card border-primary/30 shadow-sm"
                  : "border-border hover:bg-card/50"
              )}
            >
              <div className={cn("p-2 rounded-xl", activeTab === 'tools' ? "bg-emerald-500/10" : "bg-muted")}>
                <HardDrive className={cn("w-5 h-5", activeTab === 'tools' ? "text-emerald-500" : "text-muted-foreground")} />
              </div>
              <div className="text-left">
                <p className={cn("text-sm font-semibold", activeTab === 'tools' ? "text-foreground" : "text-muted-foreground")}>Tools</p>
                <p className="text-[11px] text-muted-foreground">{tools.length} tools</p>
              </div>
              {checkedOutTools.length > 0 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-bold">
                  {checkedOutTools.length}
                </span>
              )}
            </button>
          </div>

          <TabsContent value="inventory">
            <ProductsTab scanResult={scanResult} onScanConsumed={() => setScanResult(null)} />
          </TabsContent>

          <TabsContent value="tools">
            <ToolsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

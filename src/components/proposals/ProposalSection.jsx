import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { 
  ChevronUp, ChevronDown, Trash2, X, Package, Plus, 
  Search, Copy, MoreHorizontal, Layers, GripVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function ProposalSection({
  area,
  areaIndex,
  expanded,
  onToggle,
  onUpdateName,
  onUpdateArea,
  onRemove,
  onDuplicate,
  onMakeOptional,
  onAddOption,
  onUpdateItem,
  onRemoveItem,
  onDuplicateItem,
  onAddFromInventory,
  onAddCustomItem,
  inventory = [],
  markupType = 'percentage',
  markupValue = 20
}) {
  const [searchInventory, setSearchInventory] = useState('');
  const [activeOption, setActiveOption] = useState(0);
  const [showClientDesc, setShowClientDesc] = useState(!!area.client_description);
  const [showInstallerNotes, setShowInstallerNotes] = useState(!!area.installer_notes);

  const filteredInventory = inventory.filter(item =>
    item.name?.toLowerCase().includes(searchInventory.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchInventory.toLowerCase())
  );

  const sectionTotal = (area.items || []).reduce((sum, item) => 
    sum + (item.quantity || 0) * (item.unit_price || 0), 0
  );

  const calculateMarkup = (cost) => {
    if (markupType === 'percentage') return cost * (1 + markupValue / 100);
    if (markupType === 'fixed') return cost + markupValue;
    return cost;
  };

  const handleAddInventoryItem = (inv) => {
    onAddFromInventory({
      type: 'inventory',
      inventory_item_id: inv.id,
      name: inv.name,
      description: inv.description || '',
      quantity: 1,
      unit_cost: inv.unit_cost || 0,
      unit_price: inv.sell_price || calculateMarkup(inv.unit_cost || 0),
      image_url: inv.image_url || ''
    });
    setSearchInventory('');
  };

  return (
    <div className={cn(
      "bg-white rounded-xl border overflow-hidden transition-all",
      area.is_optional ? "border-amber-300" : "border-slate-200"
    )}>
      {/* Section Header */}
      <div 
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer",
          area.is_optional ? "bg-amber-50" : "bg-slate-50"
        )}
        onClick={onToggle}
      >
        <GripVertical className="w-4 h-4 text-slate-300" />
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        <input
          value={area.name}
          onChange={(e) => { e.stopPropagation(); onUpdateName(e.target.value); }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent font-medium text-slate-900 border-0 p-0 focus:ring-0 focus:outline-none"
        />
        {area.is_optional && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">Optional</Badge>
        )}
        {(area.options?.length > 0) && (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
            {area.options.length + 1} options
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">{area.items?.length || 0} items</Badge>
        <span className="text-sm font-semibold text-slate-600">${sectionTotal.toFixed(2)}</span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddOption}>
              <Plus className="w-4 h-4 mr-2" />
              Add Option
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMakeOptional}>
              <Layers className="w-4 h-4 mr-2" />
              {area.is_optional ? 'Make Required' : 'Make Optional'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Section Items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100"
          >
            {/* Options Tabs */}
            {area.options?.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 border-b flex items-center gap-1">
                <button
                  onClick={() => setActiveOption(0)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    activeOption === 0 ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Option 1
                </button>
                {area.options.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveOption(idx + 1)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      activeOption === idx + 1 ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Option {idx + 2}
                  </button>
                ))}
              </div>
            )}

            {area.items?.length > 0 && (
              <div className="divide-y divide-slate-100">
                {area.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/50">
                    {/* Image or placeholder */}
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-14 h-14 rounded-lg object-contain bg-white border p-1" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center border">
                        <Package className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-1 min-w-0">
                      <input
                        value={item.name}
                        onChange={(e) => onUpdateItem(itemIndex, 'name', e.target.value)}
                        className="w-full font-medium text-slate-900 border-0 p-0 focus:ring-0 focus:outline-none text-sm"
                        placeholder="Item name"
                      />
                      <input
                        value={item.description || ''}
                        onChange={(e) => onUpdateItem(itemIndex, 'description', e.target.value)}
                        className="w-full text-xs text-slate-500 border-0 p-0 focus:ring-0 focus:outline-none"
                        placeholder="Description..."
                      />
                      {item.notes && (
                        <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded inline-block">
                          Note: {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-16">
                        <Label className="text-[9px] text-slate-400 uppercase">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => onUpdateItem(itemIndex, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-center"
                        />
                      </div>
                      <div className="w-20">
                        <Label className="text-[9px] text-slate-400 uppercase">Cost</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_cost || 0}
                            onChange={(e) => onUpdateItem(itemIndex, 'unit_cost', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs pl-5"
                          />
                        </div>
                      </div>
                      <div className="w-20">
                        <Label className="text-[9px] text-slate-400 uppercase">Price</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => onUpdateItem(itemIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs pl-5"
                          />
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <Label className="text-[9px] text-slate-400 uppercase">Total</Label>
                        <p className="h-8 flex items-center justify-end font-semibold text-slate-900 text-sm">
                          ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-600">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onDuplicateItem(itemIndex)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate Item
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onRemoveItem(itemIndex)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Item Row */}
            <div className="px-4 py-3 bg-slate-50/50 flex flex-wrap gap-2 border-t">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-slate-500">
                    <Package className="w-4 h-4 mr-1.5" />
                    From Inventory
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-2" align="start">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search inventory..."
                      value={searchInventory}
                      onChange={(e) => setSearchInventory(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredInventory.slice(0, 10).map(inv => (
                      <button
                        key={inv.id}
                        onClick={() => handleAddInventoryItem(inv)}
                        className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-100 text-left"
                      >
                        {inv.image_url ? (
                          <img src={inv.image_url} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center">
                            <Package className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{inv.name}</p>
                          <p className="text-xs text-slate-400">{inv.sku}</p>
                        </div>
                        <span className="text-sm font-medium text-slate-600">${inv.sell_price || inv.unit_cost || 0}</span>
                      </button>
                    ))}
                    {filteredInventory.length === 0 && (
                      <p className="text-center text-slate-400 text-sm py-4">No items found</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-500"
                onClick={onAddCustomItem}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Custom Item
              </Button>

              {area.items?.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-slate-500 ml-auto"
                  onClick={() => {
                    area.items.forEach((_, idx) => onDuplicateItem(idx));
                  }}
                >
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copy All Items
                </Button>
              )}
            </div>

            {/* Client Description & Installer Notes Links */}
            <div className="px-4 py-2 border-t border-slate-100 flex gap-4">
              <button
                onClick={() => setShowClientDesc(!showClientDesc)}
                className="text-sm text-[#f97316] hover:text-[#ea580c] font-medium"
              >
                {showClientDesc ? '− Remove Client Description' : 'Add Client Description'}
              </button>
              <button
                onClick={() => setShowInstallerNotes(!showInstallerNotes)}
                className="text-sm text-[#f97316] hover:text-[#ea580c] font-medium"
              >
                {showInstallerNotes ? '− Remove Installer Notes' : 'Add Internal / Installer Notes (Hidden)'}
              </button>
            </div>

            {/* Client Description */}
            {showClientDesc && (
              <div className="px-4 py-3 border-t border-slate-100 bg-blue-50/30">
                <Label className="text-xs text-slate-500 mb-1 block">Client Description (shown on proposal)</Label>
                <Textarea
                  value={area.client_description || ''}
                  onChange={(e) => onUpdateArea?.({ ...area, client_description: e.target.value })}
                  className="h-16 text-sm bg-white"
                  placeholder="Description visible to the client..."
                />
              </div>
            )}

            {/* Installer Notes */}
            {showInstallerNotes && (
              <div className="px-4 py-3 border-t border-slate-100 bg-amber-50/30">
                <Label className="text-xs text-amber-700 mb-1 block">Internal / Installer Notes (hidden from client)</Label>
                <Textarea
                  value={area.installer_notes || ''}
                  onChange={(e) => onUpdateArea?.({ ...area, installer_notes: e.target.value })}
                  className="h-16 text-sm bg-white"
                  placeholder="Notes for installers or internal team..."
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
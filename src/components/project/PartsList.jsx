import { motion, AnimatePresence } from 'framer-motion';
import { Package, MoreHorizontal, Trash2, Edit2, DollarSign, Hash, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const statusConfig = {
  needed: { label: 'Needed', color: 'bg-red-100 text-red-700 border-red-200' },
  ordered: { label: 'Ordered', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  received: { label: 'Received', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  installed: { label: 'Installed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
};

export default function PartsList({ parts = [], onStatusChange, onEdit, onDelete }) {
  const totalCost = parts.reduce((sum, p) => sum + (p.quantity || 1) * (p.unit_cost || 0), 0);

  return (
    <div>
      {parts.length > 0 && (
        <div className="flex items-center justify-between mb-4 p-4 bg-slate-50 rounded-xl">
          <span className="text-sm text-slate-600">Total Parts Cost</span>
          <span className="text-lg font-semibold text-slate-900">${totalCost.toFixed(2)}</span>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence>
          {parts.map((part, idx) => {
            const status = statusConfig[part.status] || statusConfig.needed;

            return (
              <motion.div
                key={part.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: idx * 0.03 }}
                className="group bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-slate-100">
                    <Package className="w-5 h-5 text-slate-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-slate-900">{part.name}</h4>
                        {part.part_number && (
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                            <Hash className="w-3 h-3" />
                            {part.part_number}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(part)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(part)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge variant="outline" className={cn("cursor-pointer", status.color)}>
                            {status.label}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <DropdownMenuItem
                              key={key}
                              onClick={() => onStatusChange(part, key)}
                            >
                              {config.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <span className="font-medium">Qty: {part.quantity || 1}</span>
                      </div>

                      {part.unit_cost > 0 && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>{part.unit_cost.toFixed(2)} ea</span>
                        </div>
                      )}

                      {part.supplier && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Truck className="w-3.5 h-3.5" />
                          <span>{part.supplier}</span>
                        </div>
                      )}
                    </div>

                    {part.notes && (
                      <p className="text-sm text-slate-500 mt-2">{part.notes}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {parts.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No parts tracked yet. Add your first part!</p>
          </div>
        )}
      </div>
    </div>
  );
}
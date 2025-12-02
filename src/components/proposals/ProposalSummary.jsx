import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ProposalSummary({
  formData,
  setFormData,
  totals,
  projects = [],
  markupType,
  setMarkupType,
  markupValue,
  setMarkupValue
}) {
  const profit = totals.subtotal - totals.totalCost;
  const profitMargin = totals.subtotal > 0 ? (profit / totals.subtotal * 100).toFixed(1) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden sticky top-24">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-slate-900">Summary</h3>
      </div>

      {/* Internal Metrics */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-medium text-slate-600 uppercase">Internal Metrics</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 bg-white rounded-lg border">
            <p className="text-[10px] text-slate-400 uppercase">Total Cost</p>
            <p className="font-semibold text-slate-700">${totals.totalCost.toFixed(2)}</p>
          </div>
          <div className="p-2.5 bg-white rounded-lg border">
            <p className="text-[10px] text-slate-400 uppercase">Profit</p>
            <p className={cn("font-semibold", profit >= 0 ? "text-emerald-600" : "text-red-500")}>
              ${profit.toFixed(2)}
            </p>
          </div>
          <div className="col-span-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-700">Profit Margin</span>
              <span className={cn("font-bold text-lg", Number(profitMargin) >= 20 ? "text-emerald-600" : "text-amber-600")}>
                {profitMargin}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Markup Settings */}
      <div className="p-4 border-b border-slate-100">
        <Label className="text-xs text-slate-500 uppercase mb-2 block">Default Markup</Label>
        <div className="flex gap-2">
          <Select value={markupType} onValueChange={setMarkupType}>
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">%</SelectItem>
              <SelectItem value="fixed">$</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
          {markupType !== 'none' && (
            <div className="relative flex-1">
              {markupType === 'fixed' && <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />}
              <Input
                type="number"
                value={markupValue}
                onChange={(e) => setMarkupValue(parseFloat(e.target.value) || 0)}
                className={cn("h-9", markupType === 'fixed' && "pl-7")}
              />
              {markupType === 'percentage' && <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />}
            </div>
          )}
        </div>
      </div>

      {/* Customer-Facing Totals */}
      <div className="p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Tax</span>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.sales_tax_percent}
              onChange={(e) => setFormData(prev => ({ ...prev, sales_tax_percent: parseFloat(e.target.value) || 0 }))}
              className="w-14 h-6 text-xs text-center px-1"
            />
            <span className="text-slate-400 text-xs">%</span>
          </div>
          <span className="font-medium">${totals.taxAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="px-4 py-4 bg-[#133F5C] text-white">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total</span>
          <span className="text-2xl font-bold">${totals.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 space-y-4 border-t border-slate-100">
        <div>
          <Label className="text-xs text-slate-500 uppercase">Valid Until</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full mt-1.5 justify-start font-normal h-9">
                <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                {formData.valid_until ? format(new Date(formData.valid_until), 'MMM d, yyyy') : 'Select'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.valid_until ? new Date(formData.valid_until) : undefined}
                onSelect={(date) => setFormData(prev => ({ ...prev, valid_until: date ? format(date, 'yyyy-MM-dd') : '' }))}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-xs text-slate-500 uppercase">Linked Project</Label>
          <Select value={formData.project_id || 'none'} onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v === 'none' ? '' : v }))}>
            <SelectTrigger className="mt-1.5 h-9">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {projects.filter(p => p.status !== 'archived').map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-slate-500 uppercase">Internal Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="mt-1.5 h-20 text-sm"
            placeholder="Notes for your team..."
          />
        </div>
      </div>
    </div>
  );
}
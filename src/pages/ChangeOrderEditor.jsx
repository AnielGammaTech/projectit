import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Save, Send, Plus, Trash2, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200' }
};

export default function ChangeOrderEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const changeOrderId = urlParams.get('id');
  const queryClient = useQueryClient();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    change_order_number: '',
    title: '',
    original_proposal_id: '',
    original_proposal_number: '',
    customer_name: '',
    customer_email: '',
    status: 'draft',
    reason: '',
    items: [],
    original_total: 0,
    change_amount: 0,
    new_total: 0,
    notes: ''
  });

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: changeOrder, isLoading } = useQuery({
    queryKey: ['changeOrder', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return null;
      const orders = await api.entities.ChangeOrder.filter({ id: changeOrderId });
      return orders[0];
    },
    enabled: !!changeOrderId
  });

  const { data: originalProposal } = useQuery({
    queryKey: ['originalProposal', formData.original_proposal_id],
    queryFn: async () => {
      if (!formData.original_proposal_id) return null;
      const proposals = await api.entities.Proposal.filter({ id: formData.original_proposal_id });
      return proposals[0];
    },
    enabled: !!formData.original_proposal_id
  });

  useEffect(() => {
    if (changeOrder) {
      setFormData({
        change_order_number: changeOrder.change_order_number || '',
        title: changeOrder.title || '',
        original_proposal_id: changeOrder.original_proposal_id || '',
        original_proposal_number: changeOrder.original_proposal_number || '',
        customer_name: changeOrder.customer_name || '',
        customer_email: changeOrder.customer_email || '',
        status: changeOrder.status || 'draft',
        reason: changeOrder.reason || '',
        items: changeOrder.items || [],
        original_total: changeOrder.original_total || 0,
        change_amount: changeOrder.change_amount || 0,
        new_total: changeOrder.new_total || 0,
        notes: changeOrder.notes || ''
      });
    }
  }, [changeOrder]);

  const addItem = (type) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { type, name: '', description: '', quantity: 1, unit_price: 0 }]
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Calculate totals
  useEffect(() => {
    let changeAmount = 0;
    formData.items.forEach(item => {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      if (item.type === 'add') changeAmount += lineTotal;
      else if (item.type === 'remove') changeAmount -= lineTotal;
      else if (item.type === 'modify') changeAmount += lineTotal - (item.original_price || 0);
    });
    
    setFormData(prev => ({
      ...prev,
      change_amount: changeAmount,
      new_total: prev.original_total + changeAmount
    }));
  }, [formData.items, formData.original_total]);

  const handleSave = async () => {
    setSaving(true);
    await api.entities.ChangeOrder.update(changeOrderId, {
      ...formData,
      created_by_email: currentUser?.email,
      created_by_name: currentUser?.full_name
    });
    queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Proposals')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono bg-orange-50 text-orange-600 border-orange-200">
                {formData.change_order_number}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80",
                    statusConfig[formData.status]?.color || "bg-slate-100 text-slate-600"
                  )}>
                    {statusConfig[formData.status]?.label || formData.status}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => setFormData(prev => ({ ...prev, status: key }))}>
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" className="bg-[#0069AF] hover:bg-[#005a94]">
              <Send className="w-4 h-4 mr-1.5" />
              Send
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-slate-200 p-4">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Change Order Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter change order title..."
                className="w-full text-xl font-bold border border-slate-200 rounded-lg h-12 px-4 focus:outline-none focus:ring-2 focus:ring-[#0069AF] placeholder:text-slate-300"
              />
            </motion.div>

            {/* Original Proposal Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-orange-50 rounded-xl border border-orange-200 p-4"
            >
              <h3 className="text-sm font-semibold text-orange-800 mb-2">Original Proposal</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-orange-600">{formData.original_proposal_number}</p>
                  <p className="text-sm text-slate-600">{formData.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">${formData.original_total?.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Original Total</p>
                </div>
              </div>
            </motion.div>

            {/* Reason */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Reason for Change</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe why this change is needed..."
                className="h-20"
              />
            </motion.div>

            {/* Change Items */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <div className="p-4 border-b bg-slate-50">
                <h3 className="font-semibold text-slate-900">Change Items</h3>
              </div>
              
              {formData.items.length > 0 && (
                <div className="divide-y">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-start gap-4">
                      <Badge className={cn(
                        "mt-1",
                        item.type === 'add' && "bg-emerald-100 text-emerald-700",
                        item.type === 'remove' && "bg-red-100 text-red-700",
                        item.type === 'modify' && "bg-blue-100 text-blue-700"
                      )}>
                        {item.type === 'add' ? '+Add' : item.type === 'remove' ? '-Remove' : '~Modify'}
                      </Badge>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          placeholder="Item name"
                          className="font-medium"
                        />
                        <Input
                          value={item.description || ''}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          placeholder="Description"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <Label className="text-[9px] text-slate-400">Qty</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                        <div className="w-24">
                          <Label className="text-[9px] text-slate-400">Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                        <div className="w-24 text-right">
                          <Label className="text-[9px] text-slate-400">Total</Label>
                          <p className={cn(
                            "h-9 flex items-center justify-end font-semibold",
                            item.type === 'add' && "text-emerald-600",
                            item.type === 'remove' && "text-red-600",
                            item.type === 'modify' && "text-blue-600"
                          )}>
                            {item.type === 'add' ? '+' : item.type === 'remove' ? '-' : ''}
                            ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-slate-50 border-t flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addItem('add')} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
                <Button variant="outline" size="sm" onClick={() => addItem('remove')} className="text-red-600 border-red-200 hover:bg-red-50">
                  <Plus className="w-4 h-4 mr-1" />
                  Remove Item
                </Button>
                <Button variant="outline" size="sm" onClick={() => addItem('modify')} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Plus className="w-4 h-4 mr-1" />
                  Modify Item
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Original Total</span>
                  <span className="font-medium">${formData.original_total?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Change Amount</span>
                  <span className={cn(
                    "font-semibold",
                    formData.change_amount >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {formData.change_amount >= 0 ? '+' : ''}${formData.change_amount?.toLocaleString()}
                  </span>
                </div>
                <div className="pt-3 border-t flex justify-between">
                  <span className="font-semibold">New Total</span>
                  <span className="text-xl font-bold text-slate-900">${formData.new_total?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Internal Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes..."
                className="h-24"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
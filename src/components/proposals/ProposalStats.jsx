import { motion } from 'framer-motion';
import { FileText, Send, CheckCircle2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProposalStats({ proposals }) {
  const stats = {
    total: proposals.length,
    sent: proposals.filter(p => ['sent', 'viewed'].includes(p.status)).length,
    approved: proposals.filter(p => p.status === 'approved').length,
    totalValue: proposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.total || 0), 0),
    pendingValue: proposals.filter(p => ['sent', 'viewed'].includes(p.status)).reduce((sum, p) => sum + (p.total || 0), 0),
    conversionRate: proposals.length > 0 
      ? Math.round((proposals.filter(p => p.status === 'approved').length / proposals.filter(p => p.status !== 'draft').length) * 100) || 0
      : 0
  };

  const cards = [
    { label: 'Total Proposals', value: stats.total, icon: FileText, color: 'bg-slate-100 text-slate-600' },
    { label: 'Pending Response', value: stats.sent, icon: Send, color: 'bg-blue-100 text-blue-600', subtext: `$${stats.pendingValue.toLocaleString()} value` },
    { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600', subtext: `${stats.conversionRate}% conversion` },
    { label: 'Total Won', value: `$${stats.totalValue.toLocaleString()}`, icon: DollarSign, color: 'bg-amber-100 text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-xl border border-slate-100 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl", card.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500">{card.label}</p>
                {card.subtext && <p className="text-xs text-slate-400">{card.subtext}</p>}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
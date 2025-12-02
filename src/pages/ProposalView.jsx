import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Send, CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-500'
};

export default function ProposalView() {
  const urlParams = new URLSearchParams(window.location.search);
  const proposalId = urlParams.get('id');
  const printRef = useRef(null);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      return proposals[0];
    },
    enabled: !!proposalId
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading proposal...</div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Proposal not found</h2>
          <Link to={createPageUrl('Proposals')}>
            <Button variant="outline">Back to Proposals</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar - Hidden in print */}
      <div className="print:hidden bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={createPageUrl('Proposals')} className="flex items-center text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Proposals
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Proposal Document */}
      <div className="max-w-4xl mx-auto py-8 px-4 print:py-0 print:px-0 print:max-w-none">
        <div ref={printRef} className="bg-white rounded-lg shadow-lg print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="p-8 border-b border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">PROPOSAL</h1>
                <p className="text-slate-500 font-mono">{proposal.proposal_number}</p>
              </div>
              <div className="text-right">
                <Badge className={cn("print:hidden", statusColors[proposal.status])}>
                  {proposal.status?.toUpperCase()}
                </Badge>
                <p className="text-sm text-slate-500 mt-2">
                  Created: {format(new Date(proposal.created_date), 'MMMM d, yyyy')}
                </p>
                {proposal.valid_until && (
                  <p className="text-sm text-slate-500">
                    Valid Until: {format(new Date(proposal.valid_until), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Customer & Title */}
          <div className="p-8 border-b border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">{proposal.title}</h2>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Prepared For</h3>
                <p className="font-semibold text-slate-900">{proposal.customer_name}</p>
                {proposal.customer_company && <p className="text-slate-600">{proposal.customer_company}</p>}
                <p className="text-slate-600">{proposal.customer_email}</p>
                {proposal.customer_phone && <p className="text-slate-600">{proposal.customer_phone}</p>}
                {proposal.customer_address && <p className="text-slate-600">{proposal.customer_address}</p>}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Prepared By</h3>
                <p className="font-semibold text-slate-900">{proposal.created_by_name || 'IT Projects'}</p>
                <p className="text-slate-600">{proposal.created_by_email}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="p-8 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Items & Services</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 text-sm font-semibold text-slate-600">Description</th>
                  <th className="text-right py-3 text-sm font-semibold text-slate-600 w-20">Qty</th>
                  <th className="text-right py-3 text-sm font-semibold text-slate-600 w-28">Unit Price</th>
                  <th className="text-right py-3 text-sm font-semibold text-slate-600 w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {proposal.items?.map((item, idx) => {
                  const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                  const afterDiscount = lineTotal * (1 - (item.discount_percent || 0) / 100);
                  return (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-4">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                        {item.discount_percent > 0 && (
                          <p className="text-xs text-emerald-600">{item.discount_percent}% discount applied</p>
                        )}
                      </td>
                      <td className="text-right py-4 text-slate-600">{item.quantity}</td>
                      <td className="text-right py-4 text-slate-600">${item.unit_price?.toFixed(2)}</td>
                      <td className="text-right py-4 font-medium text-slate-900">${afterDiscount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="text-slate-900">${proposal.subtotal?.toFixed(2)}</span>
                </div>
                {proposal.discount_total > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>-${proposal.discount_total?.toFixed(2)}</span>
                  </div>
                )}
                {proposal.tax_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax</span>
                    <span className="text-slate-900">${proposal.tax_total?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-3 border-t border-slate-200">
                  <span>Total</span>
                  <span>${proposal.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          {proposal.terms_conditions && (
            <div className="p-8 border-b border-slate-200">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Terms & Conditions</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{proposal.terms_conditions}</p>
            </div>
          )}

          {/* Signature Section */}
          <div className="p-8">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Acceptance</h3>
            {proposal.signature_data ? (
              <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700 mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Proposal Approved</span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Signature</p>
                    <img src={proposal.signature_data} alt="Signature" className="h-16 object-contain" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Signed By</p>
                    <p className="font-medium">{proposal.signer_name}</p>
                    <p className="text-sm text-slate-500">
                      {proposal.signed_date && format(new Date(proposal.signed_date), 'MMMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <p className="text-slate-500 mb-2">Awaiting customer signature</p>
                <p className="text-xs text-slate-400">Customer can sign via the approval link sent to their email</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
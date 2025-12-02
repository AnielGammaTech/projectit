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

  const { data: proposalSettings } = useQuery({
    queryKey: ['proposalSettings'],
    queryFn: async () => {
      const settings = await base44.entities.ProposalSettings.filter({ setting_key: 'main' });
      return settings[0];
    }
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
          {/* Header with Branding */}
          <div className="p-8 border-b border-slate-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                {proposalSettings?.company_logo_url && (
                  <img src={proposalSettings.company_logo_url} alt="Company Logo" className="h-16 w-auto object-contain" />
                )}
                <div>
                  {proposalSettings?.company_name && (
                    <p className="font-bold text-lg text-slate-900">{proposalSettings.company_name}</p>
                  )}
                  {proposalSettings?.company_address && (
                    <p className="text-sm text-slate-500">{proposalSettings.company_address}</p>
                  )}
                  {(proposalSettings?.company_phone || proposalSettings?.company_email) && (
                    <p className="text-sm text-slate-500">
                      {[proposalSettings.company_phone, proposalSettings.company_email].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">PROPOSAL</p>
                <p className="text-slate-500 font-mono">{proposal.proposal_number}</p>
                <p className="text-sm text-slate-500 mt-2">
                  {format(new Date(proposal.created_date), 'MMMM d, yyyy')}
                </p>
                {proposal.valid_until && (
                  <p className="text-sm text-slate-500">
                    Valid: {format(new Date(proposal.valid_until), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <h1 className="text-3xl font-bold text-slate-900">{proposal.title || 'Untitled Proposal'}</h1>
          </div>

          {/* Customer Info */}
          <div className="p-8 border-b border-slate-200">
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

          {/* Line Items by Area */}
          <div className="p-8 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Items & Services</h3>
            
            {proposal.areas?.length > 0 ? (
              proposal.areas.map((area, areaIdx) => (
                <div key={areaIdx} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-slate-800">{area.name}</h4>
                    {area.is_optional && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Optional</span>
                    )}
                  </div>
                  {area.client_description && (
                    <p className="text-sm text-slate-600 mb-3 italic">{area.client_description}</p>
                  )}
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-sm font-semibold text-slate-600">Item</th>
                        <th className="text-right py-2 text-sm font-semibold text-slate-600 w-20">Qty</th>
                        <th className="text-right py-2 text-sm font-semibold text-slate-600 w-28">Unit Price</th>
                        <th className="text-right py-2 text-sm font-semibold text-slate-600 w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {area.items?.map((item, idx) => {
                        const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                        return (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="py-3">
                              <div className="flex items-start gap-3">
                                {item.image_url && (
                                  <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded object-cover print:w-10 print:h-10" />
                                )}
                                <div>
                                  <p className="font-medium text-slate-900">{item.name}</p>
                                  {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="text-right py-3 text-slate-600">{item.quantity}</td>
                            <td className="text-right py-3 text-slate-600">${(item.unit_price || 0).toFixed(2)}</td>
                            <td className="text-right py-3 font-medium text-slate-900">${lineTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            ) : (
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
                          <div className="flex items-start gap-3">
                            {item.image_url && (
                              <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded object-cover" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{item.name}</p>
                              {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                              {item.discount_percent > 0 && (
                                <p className="text-xs text-emerald-600">{item.discount_percent}% discount applied</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-4 text-slate-600">{item.quantity}</td>
                        <td className="text-right py-4 text-slate-600">${item.unit_price?.toFixed(2)}</td>
                        <td className="text-right py-4 font-medium text-slate-900">${afterDiscount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

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
          nav, header, aside, .lg\\:pl-64 { padding-left: 0 !important; margin: 0 !important; }
          * { box-shadow: none !important; }
        }
        @page { margin: 0.5in; }
      `}</style>
    </div>
  );
}
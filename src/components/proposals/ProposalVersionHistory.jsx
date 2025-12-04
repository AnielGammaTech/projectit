import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { History, RotateCcw, Eye, ChevronDown, ChevronUp, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ProposalVersionHistory({ proposalId, currentProposal, onRevert }) {
  const [expanded, setExpanded] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [confirmRevert, setConfirmRevert] = useState(null);
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['proposalVersions', proposalId],
    queryFn: () => base44.entities.ProposalVersion.filter({ proposal_id: proposalId }, '-version_number'),
    enabled: !!proposalId
  });

  const handleRevert = async (version) => {
    const snapshot = version.snapshot;
    
    // Update proposal with snapshot data
    await base44.entities.Proposal.update(proposalId, {
      title: snapshot.title,
      areas: snapshot.areas,
      items: snapshot.items,
      subtotal: snapshot.subtotal,
      tax_total: snapshot.tax_total,
      total: snapshot.total,
      terms_conditions: snapshot.terms_conditions,
      notes: snapshot.notes,
      valid_until: snapshot.valid_until,
      sales_tax_percent: snapshot.sales_tax_percent
    });

    // Create a new version to record the revert
    await base44.entities.ProposalVersion.create({
      proposal_id: proposalId,
      version_number: versions.length + 1,
      snapshot: currentProposal,
      change_summary: `Reverted to version ${version.version_number}`,
      created_by_email: currentProposal.created_by_email,
      created_by_name: currentProposal.created_by_name
    });

    queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
    queryClient.invalidateQueries({ queryKey: ['proposalVersions', proposalId] });
    
    setConfirmRevert(null);
    if (onRevert) onRevert();
  };

  if (versions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <span className="font-medium text-slate-900">Version History</span>
          <Badge variant="outline" className="ml-2">{versions.length} versions</Badge>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100"
          >
            <ScrollArea className="max-h-64">
              <div className="p-4 space-y-2">
                {versions.map((version, idx) => (
                  <div
                    key={version.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      idx === 0 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        idx === 0 ? "bg-blue-500 text-white" : "bg-slate-300 text-slate-600"
                      )}>
                        v{version.version_number}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {version.change_summary || 'Version saved'}
                          {idx === 0 && <span className="ml-2 text-xs text-blue-600">(Current)</span>}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.created_by_name || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(version.created_date), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewVersion(version)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {idx !== 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmRevert(version)}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Revert
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version {previewVersion?.version_number} Preview</DialogTitle>
          </DialogHeader>
          {previewVersion && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{previewVersion.snapshot.title}</h3>
                <p className="text-sm text-slate-600">
                  Customer: {previewVersion.snapshot.customer_name}
                </p>
                <p className="text-xl font-bold text-slate-900 mt-2">
                  Total: ${previewVersion.snapshot.total?.toLocaleString()}
                </p>
              </div>

              {previewVersion.snapshot.areas?.map((area, areaIdx) => (
                <div key={areaIdx} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">{area.name}</h4>
                  <div className="space-y-2">
                    {area.items?.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex justify-between text-sm">
                        <span>{item.name} × {item.quantity}</span>
                        <span>${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {previewVersion.snapshot.terms_conditions && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Terms & Conditions</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {previewVersion.snapshot.terms_conditions}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Revert Modal */}
      <Dialog open={!!confirmRevert} onOpenChange={() => setConfirmRevert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert to Version {confirmRevert?.version_number}?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">
            This will restore the proposal to version {confirmRevert?.version_number}. 
            Your current changes will be saved as a new version.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRevert(null)}>Cancel</Button>
            <Button onClick={() => handleRevert(confirmRevert)} className="bg-amber-600 hover:bg-amber-700">
              <RotateCcw className="w-4 h-4 mr-2" />
              Revert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to save a version
export async function saveProposalVersion(proposalId, proposal, changeSummary, userEmail, userName) {
  const versions = await base44.entities.ProposalVersion.filter({ proposal_id: proposalId });
  const nextVersion = versions.length + 1;

  await base44.entities.ProposalVersion.create({
    proposal_id: proposalId,
    version_number: nextVersion,
    snapshot: {
      title: proposal.title,
      customer_name: proposal.customer_name,
      customer_email: proposal.customer_email,
      customer_company: proposal.customer_company,
      areas: proposal.areas,
      items: proposal.items,
      subtotal: proposal.subtotal,
      tax_total: proposal.tax_total,
      total: proposal.total,
      terms_conditions: proposal.terms_conditions,
      notes: proposal.notes,
      valid_until: proposal.valid_until,
      sales_tax_percent: proposal.sales_tax_percent
    },
    change_summary: changeSummary || 'Manual save',
    created_by_email: userEmail,
    created_by_name: userName
  });
}
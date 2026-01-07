import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Building2, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PendingProposalsModal({ open, onClose, quotes, onCreateProject }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0F2F44]" />
            Pending Proposals ({quotes.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {quotes.length === 0 ? (
            <div className="text-center py-12 text-[#0F2F44]/60">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No pending proposals</p>
            </div>
          ) : (
            quotes.map((quote) => (
              <div
                key={quote.id}
                className="p-4 rounded-xl border border-[#0F2F44]/10 bg-[#0F2F44]/5 hover:bg-[#0F2F44]/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#0F2F44] truncate">
                        {quote.title || `Quote #${quote.quoteit_id}`}
                      </h3>
                      {quote.amount > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">
                          ${quote.amount?.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-[#0F2F44]/60">
                      {quote.customer_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {quote.customer_name}
                        </span>
                      )}
                      {quote.received_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(quote.received_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => {
                      onCreateProject(quote);
                      onClose();
                    }}
                    className="bg-[#0F2F44] hover:bg-[#1a4a6e] shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create Project
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
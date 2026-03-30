import { motion } from 'framer-motion';
import { X, FileText, ArrowRight, RefreshCw, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function IncomingQuoteBanner({ quotes, onAcceptQuote, onCreateProject, onDismiss, onSync, isSyncing }) {
  const pendingQuotes = (quotes || []).filter(q => q.status === 'pending');
  const acceptedQuotes = (quotes || []).filter(q => q.status === 'accepted');

  if (pendingQuotes.length === 0 && acceptedQuotes.length === 0) return null;

  return (
    <div id="incoming-quotes-section">
      {/* Accepted Quotes — ready for project creation */}
      {acceptedQuotes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Accepted Quotes
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {acceptedQuotes.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {acceptedQuotes.map((quote, i) => (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border-l-4 border-l-emerald-400 bg-white dark:bg-card p-4 shadow-warm hover:shadow-warm-hover transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground truncate">{quote.title}</p>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                    Accepted
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">{quote.customer_name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    ${quote.amount?.toLocaleString()}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => onCreateProject(quote)}
                    className="h-7 text-xs bg-[#0F2F44] hover:bg-[#1a4a6e] dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create Project
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Quotes — need acceptance */}
      {pendingQuotes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              Incoming Quotes
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {pendingQuotes.length}
              </span>
            </h2>
            {onSync && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSync}
                disabled={isSyncing}
                className="text-xs text-muted-foreground"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isSyncing && "animate-spin")} />
                Sync
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingQuotes.slice(0, 6).map((quote, i) => (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border-l-4 border-l-amber-400 bg-white dark:bg-card p-4 shadow-warm hover:shadow-warm-hover transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src="/quoteit-favicon.svg" alt="" className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm font-semibold text-foreground truncate">{quote.title}</p>
                  </div>
                  <button
                    onClick={() => onDismiss(quote)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-3">{quote.customer_name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    ${quote.amount?.toLocaleString()}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => onAcceptQuote(quote)}
                    className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Accept
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

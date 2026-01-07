import React, { useState } from 'react';
import { FileText, ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function IncomingQuoteBanner({ quotes, onCreateProject, onDismiss }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!quotes || quotes.length === 0) return null;

  const quote = quotes[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < quotes.length - 1;

  const goToPrev = () => setCurrentIndex(i => Math.max(0, i - 1));
  const goToNext = () => setCurrentIndex(i => Math.min(quotes.length - 1, i + 1));

  const handleDismiss = () => {
    onDismiss(quote);
    if (currentIndex >= quotes.length - 1 && currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  return (
    <div className="mb-4" id="incoming-quotes-banner">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-0.5 shadow-md transition-all">
        <div className="bg-white rounded-[10px] p-3">
          <div className="flex items-center gap-3">
            {/* Left arrow */}
            <button
              onClick={goToPrev}
              disabled={!canGoPrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>

            {/* Quote info */}
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <div className="p-1.5 bg-orange-100 rounded-lg flex-shrink-0">
                <FileText className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 truncate">{quote.title}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded flex-shrink-0">
                    ${quote.amount?.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{quote.customer_name}</p>
              </div>
            </div>

            {/* Page indicator */}
            <span className="text-xs text-slate-400 flex-shrink-0">
              {currentIndex + 1}/{quotes.length}
            </span>

            {/* Right arrow */}
            <button
              onClick={goToNext}
              disabled={!canGoNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0 border-l border-slate-200 pl-3 ml-1">
              <button
                onClick={handleDismiss}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              <Button 
                size="sm"
                onClick={() => onCreateProject(quote)}
                className="bg-orange-600 hover:bg-orange-700 h-8 text-xs"
              >
                Create Project
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
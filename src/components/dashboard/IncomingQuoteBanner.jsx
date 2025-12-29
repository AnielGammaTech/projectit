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
    <div className="mb-6">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-1 shadow-lg">
        <div className="bg-white rounded-xl p-5">
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Accepted Quotes</h3>
                <p className="text-xs text-slate-500">{quotes.length} quote{quotes.length > 1 ? 's' : ''} ready to convert</p>
              </div>
            </div>
            
            {/* Page indicator and arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrev}
                disabled={!canGoPrev}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <span className="text-sm font-medium text-slate-600 min-w-[60px] text-center">
                {currentIndex + 1} of {quotes.length}
              </span>
              <button
                onClick={goToNext}
                disabled={!canGoNext}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Quote Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-slate-900 mb-1">{quote.title}</h4>
                <p className="text-slate-600">
                  Customer: <span className="font-medium text-slate-800">{quote.customer_name}</span>
                </p>
              </div>
              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-lg font-bold rounded-lg">
                ${quote.amount?.toLocaleString()}
              </span>
            </div>

            {/* Quote details if available */}
            {quote.raw_data?.items?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">{quote.raw_data.items.length} line item{quote.raw_data.items.length > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={handleDismiss}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
            <Button 
              onClick={() => onCreateProject(quote)}
              className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
            >
              Create Project
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Dot indicators */}
          {quotes.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {quotes.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex 
                      ? 'bg-indigo-600 w-4' 
                      : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
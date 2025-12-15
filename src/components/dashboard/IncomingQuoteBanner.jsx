import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function IncomingQuoteBanner({ quotes, onCreateProject, onDismiss }) {
  if (!quotes || quotes.length === 0) return null;

  return (
    <div className="space-y-4 mb-8">
      {quotes.map((quote) => (
        <motion.div
          key={quote.id}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-1 shadow-lg"
        >
          <div className="bg-white rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-full">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">New Accepted Quote!</h3>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    ${quote.amount?.toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-600">
                  <span className="font-medium">{quote.title}</span> for <span className="font-medium">{quote.customer_name}</span> is ready to start.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="ghost" 
                onClick={() => onDismiss(quote)}
                className="text-slate-400 hover:text-slate-600"
              >
                Dismiss
              </Button>
              <Button 
                onClick={() => onCreateProject(quote)}
                className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 shadow-md whitespace-nowrap"
              >
                Create Project
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
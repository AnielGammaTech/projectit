import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, CheckCircle2, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationToast({ notification, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case 'mention': return <AtSign className="w-4 h-4" />;
      case 'task_assigned': return <CheckCircle2 className="w-4 h-4" />;
      case 'task_due': return <Clock className="w-4 h-4" />;
      default: return <AtSign className="w-4 h-4" />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'mention': return 'bg-indigo-500';
      case 'task_assigned': return 'bg-blue-500';
      case 'task_due': return 'bg-amber-500';
      default: return 'bg-indigo-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="fixed top-20 right-4 z-50 max-w-sm"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className={cn("h-1", getColors())} />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg text-white", getColors())}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 text-sm">{notification.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
              {notification.from_user_name && (
                <p className="text-xs text-slate-400 mt-1">From: {notification.from_user_name}</p>
              )}
            </div>
            <button 
              onClick={onDismiss}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
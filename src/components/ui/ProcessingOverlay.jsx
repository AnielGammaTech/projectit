import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Archive, Trash2 } from 'lucide-react';

export default function ProcessingOverlay({ isVisible, type = 'archive', message }) {
  const Icon = type === 'delete' ? Trash2 : Archive;
  const defaultMessage = type === 'delete'
    ? 'Permanently deleting project and all associated data...'
    : 'Archiving project...';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 max-w-sm mx-4"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className={`p-4 rounded-2xl ${
                type === 'delete'
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-200/50'
                  : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-200/50'
              }`}
            >
              <Icon className="w-8 h-8 text-white" />
            </motion.div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-800">
                {type === 'delete' ? 'Deleting Project' : 'Archiving Project'}
              </h3>
              <p className="text-sm text-slate-500">{message || defaultMessage}</p>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Please wait...</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

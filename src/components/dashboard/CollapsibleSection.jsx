import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'dashboard-collapsed-sections';

function getStoredState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export default function CollapsibleSection({
  id,
  title,
  icon: Icon,
  summary,
  defaultOpen = true,
  children,
  onExpand,
}) {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = getStoredState();
    return stored[id] !== undefined ? stored[id] : defaultOpen;
  });

  useEffect(() => {
    const stored = getStoredState();
    setStoredState({ ...stored, [id]: isOpen });
  }, [id, isOpen]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && onExpand) {
      onExpand();
    }
  };

  return (
    <div className="rounded-2xl border bg-card shadow-warm overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/50 transition-colors"
      >
        {Icon && (
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
        )}
        <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
        {!isOpen && summary && (
          <span className="text-xs text-muted-foreground mr-2">{summary}</span>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

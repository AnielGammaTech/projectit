import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AssetStatsCard({ title, value, icon: Icon, iconColor, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3.5 border-l-4 bg-white dark:bg-card transition-all duration-200 h-full shadow-warm",
        "border-l-[#0F2F44] dark:border-l-slate-600"
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={cn(
          "p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0",
          iconColor || "bg-[#0F2F44]"
        )}>
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs leading-tight font-medium text-muted-foreground">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-bold leading-tight tracking-tight text-foreground">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

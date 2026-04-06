import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AssetStatsCard({ title, value, icon: Icon, iconColor, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "rounded-2xl px-4 py-3 border border-border bg-white dark:bg-card transition-all duration-200 h-full"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-xl shrink-0",
          iconColor || "bg-[#0F2F44]"
        )}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-tight font-medium text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold leading-tight tracking-tight text-foreground">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

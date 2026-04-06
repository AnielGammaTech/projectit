import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AssetStatsCard({ title, value, icon: Icon, iconColor, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "rounded-xl px-3 py-2.5 border border-border bg-white dark:bg-card transition-all duration-200 h-full"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "p-1.5 rounded-lg shrink-0",
          iconColor || "bg-[#0F2F44]"
        )}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] leading-tight font-medium text-muted-foreground">
            {title}
          </p>
          <p className="text-lg font-bold leading-tight tracking-tight text-foreground">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

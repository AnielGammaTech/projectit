import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, iconColor, subtitle, href, highlight, onClick }) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={(href || onClick) ? { y: -1 } : {}}
      className={cn(
        "rounded-xl px-3.5 py-2.5 border transition-all duration-200 h-full",
        highlight
          ? "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-700/50 ring-1 ring-orange-300/60 dark:ring-orange-700/60"
          : "bg-white dark:bg-[#1e2a3a] border-slate-200/80 dark:border-slate-700/50",
        (href || onClick) && "hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-1.5 rounded-lg shrink-0",
          iconColor || "bg-[#0F2F44]",
          highlight && "animate-pulse"
        )}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] leading-tight", highlight ? "text-orange-700 dark:text-orange-300 font-medium" : "text-slate-500 dark:text-slate-400")}>{title}</p>
          <div className="flex items-baseline gap-1.5">
            <p className={cn("text-lg font-bold leading-tight", highlight ? "text-orange-600 dark:text-orange-400" : "text-[#0F2F44] dark:text-slate-100")}>{value}</p>
            {subtitle && (
              <p className={cn("text-[10px]", highlight ? "text-orange-500 dark:text-orange-400/80" : "text-slate-400 dark:text-slate-500")}>{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (onClick) {
    return <button onClick={onClick} className="block h-full w-full text-left">{content}</button>;
  }
  if (href) {
    return <Link to={href} className="block h-full">{content}</Link>;
  }
  return content;
}

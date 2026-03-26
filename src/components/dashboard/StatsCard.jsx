import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, iconColor, subtitle, href, highlight, onClick }) {
  const Wrapper = onClick ? 'button' : href ? Link : 'div';
  const wrapperProps = onClick
    ? { onClick, className: "block h-full w-full text-left" }
    : href
      ? { to: href, className: "block h-full" }
      : {};

  return (
    <Wrapper {...wrapperProps}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={(href || onClick) ? { y: -2, scale: 1.01 } : {}}
        className={cn(
          "rounded-2xl px-4 py-3.5 border-l-4 bg-white dark:bg-card transition-all duration-200 h-full shadow-warm",
          highlight
            ? "border-l-amber-500 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-900/15 dark:to-orange-900/10 ring-1 ring-amber-200/60 dark:ring-amber-700/40"
            : "border-l-indigo-400 dark:border-l-indigo-500",
          (href || onClick) && "hover:shadow-warm-hover cursor-pointer"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl shrink-0",
            iconColor || "bg-indigo-500",
            highlight && "animate-pulse"
          )}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn(
              "text-xs leading-tight font-medium",
              highlight ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"
            )}>
              {title}
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className={cn(
                "text-2xl font-bold leading-tight tracking-tight",
                highlight ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                {value}
              </p>
              {subtitle && (
                <p className={cn(
                  "text-[10px]",
                  highlight ? "text-amber-500 dark:text-amber-400/80" : "text-muted-foreground"
                )}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Wrapper>
  );
}

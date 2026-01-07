import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, iconColor, subtitle, href, highlight, onClick }) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={(href || onClick) ? { y: -2 } : {}}
      className={cn(
        "rounded-xl p-4 border transition-all duration-200 h-full",
        highlight 
          ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 ring-2 ring-orange-300 ring-offset-1" 
          : "bg-[#0F2F44]/5 border-[#0F2F44]/10",
        (href || onClick) && "hover:shadow-md hover:border-[#0F2F44]/20 cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-sm leading-tight", highlight ? "text-orange-700 font-medium" : "text-[#0F2F44]/70")}>{title}</p>
          <p className={cn("text-2xl font-bold mt-2", highlight ? "text-orange-600" : "text-[#0F2F44]")}>{value}</p>
          {subtitle && (
            <p className={cn("text-xs mt-0.5", highlight ? "text-orange-500" : "text-[#0F2F44]/50")}>{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "p-2 rounded-lg",
          iconColor || "bg-[#0F2F44]",
          highlight && "animate-pulse"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            iconColor ? "text-white" : "text-white"
          )} />
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
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, iconColor, subtitle, href }) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={href ? { y: -2 } : {}}
      className={cn(
        "bg-white rounded-xl p-4 border border-slate-100 transition-all duration-200 h-full",
        href && "hover:shadow-md hover:border-slate-200 cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 leading-tight">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "p-2 rounded-lg",
          iconColor || "bg-slate-100"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            iconColor ? "text-white" : "text-slate-500"
          )} />
        </div>
      </div>
    </motion.div>
  );

  if (href) {
    return <Link to={href} className="block h-full">{content}</Link>;
  }
  return content;
}
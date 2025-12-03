import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export default function StatsCard({ title, value, icon: Icon, color, subtitle, href }) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={href ? { scale: 1.02, y: -2 } : {}}
      whileTap={href ? { scale: 0.98 } : {}}
      className={cn(
        "bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all duration-300 h-full group",
        href && "hover:shadow-xl hover:border-slate-200 cursor-pointer"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-3 rounded-xl shadow-md transition-transform duration-300",
          color,
          href && "group-hover:scale-110"
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {href && (
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
        )}
      </div>
    </motion.div>
  );

  if (href) {
    return <Link to={href} className="block h-full">{content}</Link>;
  }
  return content;
}
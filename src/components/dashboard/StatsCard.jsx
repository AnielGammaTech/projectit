import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, color, subtitle, href }) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all duration-300 h-full",
        href && "hover:shadow-lg hover:border-slate-200 cursor-pointer"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-xl shadow-sm", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (href) {
    return <Link to={href} className="block h-full">{content}</Link>;
  }
  return content;
}
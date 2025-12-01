import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColors = {
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  on_hold: 'bg-slate-50 text-slate-700 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const cardColors = {
  slate: 'border-l-slate-500',
  red: 'border-l-red-500',
  orange: 'border-l-orange-500',
  amber: 'border-l-amber-500',
  yellow: 'border-l-yellow-500',
  lime: 'border-l-lime-500',
  green: 'border-l-green-500',
  emerald: 'border-l-emerald-500',
  teal: 'border-l-teal-500',
  cyan: 'border-l-cyan-500',
  sky: 'border-l-sky-500',
  blue: 'border-l-blue-500',
  indigo: 'border-l-indigo-500',
  violet: 'border-l-violet-500',
  purple: 'border-l-purple-500',
  fuchsia: 'border-l-fuchsia-500',
  pink: 'border-l-pink-500',
  rose: 'border-l-rose-500'
};

const priorityDots = {
  low: 'bg-slate-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

export default function ProjectCard({ project, tasks = [], index }) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const colorClass = cardColors[project.color] || cardColors.slate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link to={createPageUrl('ProjectDetail') + `?id=${project.id}`}>
        <div className={cn(
          "bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 border-l-4",
          colorClass
        )}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${priorityDots[project.priority]}`} />
              <Badge variant="outline" className={cn("text-xs", statusColors[project.status])}>
                {project.status?.replace('_', ' ')}
              </Badge>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
          </div>

          <h3 className="text-base font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {project.name}
          </h3>
          {project.client && (
            <p className="text-sm text-slate-500 mb-3 line-clamp-1">{project.client}</p>
          )}

          {totalTasks > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500">Progress</span>
                <span className="font-medium text-slate-700">{completedTasks}/{totalTasks}</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-500">
            {project.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(new Date(project.due_date), 'MMM d')}</span>
              </div>
            )}
            {totalTasks > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{Math.round(progress)}%</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
import { motion } from 'framer-motion';
import { Calendar, Users, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

const statusColors = {
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  on_hold: 'bg-slate-50 text-slate-700 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200'
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link to={createPageUrl('ProjectDetail') + `?id=${project.id}`}>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${priorityDots[project.priority]}`} />
              <Badge variant="outline" className={statusColors[project.status]}>
                {project.status?.replace('_', ' ')}
              </Badge>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
            {project.name}
          </h3>
          {project.client && (
            <p className="text-sm text-slate-500 mb-4">{project.client}</p>
          )}

          {totalTasks > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Progress</span>
                <span className="font-medium text-slate-700">{completedTasks}/{totalTasks} tasks</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-slate-500">
            {project.due_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(project.due_date), 'MMM d')}</span>
              </div>
            )}
            {totalTasks > 0 && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{Math.round(progress)}%</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
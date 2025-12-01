import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ListTodo, CheckCircle2, Circle, Clock, ArrowUpCircle, Calendar, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const statusConfig = {
  todo: { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100' },
  in_progress: { icon: ArrowUpCircle, color: 'text-blue-500', bg: 'bg-blue-100' },
  review: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' }
};

export default function MyTasksCard({ tasks = [], parts = [], projects = [], currentUserEmail, onTaskComplete }) {
  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  const myTasks = tasks
    .filter(t => t.assigned_to === currentUserEmail && t.status !== 'completed')
    .slice(0, 5);

  const myParts = parts
    .filter(p => p.assigned_to === currentUserEmail && p.status !== 'installed')
    .slice(0, 3);

  const totalItems = myTasks.length + myParts.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50">
            <ListTodo className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">My Tasks</h3>
            <p className="text-xs text-slate-500">{totalItems} items assigned to you</p>
          </div>
        </div>
        <Link to={createPageUrl('AllTasks')}>
          <Badge variant="outline" className="hover:bg-slate-100">View All</Badge>
        </Link>
      </div>

      {totalItems === 0 ? (
        <p className="text-slate-500 text-center py-6">No tasks assigned to you</p>
      ) : (
        <div className="space-y-2">
          {myTasks.map((task, idx) => {
            const status = statusConfig[task.status] || statusConfig.todo;
            const StatusIcon = status.icon;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-all">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onTaskComplete?.(task);
                    }}
                    className={cn("p-1.5 rounded-lg hover:scale-110 transition-transform", status.bg)}
                  >
                    <StatusIcon className={cn("w-4 h-4", status.color)} />
                  </button>
                  <Link to={createPageUrl('ProjectDetail') + `?id=${task.project_id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 truncate">{getProjectName(task.project_id)}</p>
                  </Link>
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(task.due_date), 'MMM d')}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {myParts.map((part, idx) => (
            <motion.div
              key={part.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (myTasks.length + idx) * 0.03 }}
            >
              <Link to={createPageUrl('ProjectDetail') + `?id=${part.project_id}`}>
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-50/50 transition-all">
                  <div className="p-1.5 rounded-lg bg-amber-100">
                    <Package className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{part.name}</p>
                    <p className="text-xs text-slate-500 truncate">{getProjectName(part.project_id)}</p>
                  </div>
                  {part.due_date && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(part.due_date), 'MMM d')}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
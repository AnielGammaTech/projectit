import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ListTodo, CheckCircle2, Circle, Clock, ArrowUpCircle, Calendar, Package, FolderKanban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import { api } from '@/api/apiClient';
import { parseLocalDate } from '@/utils/dateUtils';

const statusConfig = {
  todo: { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100' },
  in_progress: { icon: ArrowUpCircle, color: 'text-blue-500', bg: 'bg-blue-100' },
  review: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' }
};

function getDueStatus(dateStr) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  if (isPast(d) && !isToday(d)) return 'overdue';
  if (isToday(d) || isTomorrow(d)) return 'soon';
  return null;
}

function getRowBg(dueStatus) {
  if (dueStatus === 'overdue') return 'bg-red-50 hover:bg-red-100/70';
  if (dueStatus === 'soon') return 'bg-amber-50 hover:bg-amber-100/60';
  return 'hover:bg-slate-50';
}

function getDueBadge(dateStr) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  const dueStatus = getDueStatus(dateStr);
  const label = format(d, 'MMM d');
  if (dueStatus === 'overdue') return { label: `Overdue · ${label}`, className: 'bg-red-100 text-red-700 border-red-200' };
  if (dueStatus === 'soon') {
    const dayLabel = isToday(d) ? 'Today' : 'Tomorrow';
    return { label: dayLabel, className: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
  return { label, className: 'bg-slate-50 text-slate-500 border-slate-200' };
}

export default function MyTasksCard({ tasks = [], parts = [], projects = [], currentUserEmail, onTaskComplete }) {
  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  const getProjectNumber = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.project_number || projectId?.slice(0, 8) || '';
  };

  // Only show tasks and parts from active projects
  const activeProjectIds = projects.filter(p => p.status !== 'archived' && p.status !== 'completed').map(p => p.id);

  const myTasks = tasks
    .filter(t => t.assigned_to === currentUserEmail && t.status !== 'completed' && t.status !== 'archived' && activeProjectIds.includes(t.project_id))
    .sort((a, b) => {
      // Overdue first, then due soon, then by date, then no date last
      const aStatus = getDueStatus(a.due_date);
      const bStatus = getDueStatus(b.due_date);
      const order = { overdue: 0, soon: 1 };
      const aOrder = aStatus ? order[aStatus] ?? 2 : 3;
      const bOrder = bStatus ? order[bStatus] ?? 2 : 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      if (a.due_date && b.due_date) return parseLocalDate(a.due_date) - parseLocalDate(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });

  const myParts = parts
    .filter(p => p.assigned_to === currentUserEmail && p.status !== 'installed' && activeProjectIds.includes(p.project_id) && p.due_date)
    .sort((a, b) => {
      const aStatus = getDueStatus(a.due_date);
      const bStatus = getDueStatus(b.due_date);
      const order = { overdue: 0, soon: 1 };
      const aOrder = aStatus ? order[aStatus] ?? 2 : 3;
      const bOrder = bStatus ? order[bStatus] ?? 2 : 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return parseLocalDate(a.due_date) - parseLocalDate(b.due_date);
    });

  // Combine tasks + parts into a single paginated list
  const allItems = [
    ...myTasks.map(t => ({ ...t, _type: 'task' })),
    ...myParts.map(p => ({ ...p, _type: 'part' })),
  ];
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
  const [page, setPage] = useState(0);
  const pagedItems = allItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalItems = allItems.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#0069AF]/10">
            <ListTodo className="w-5 h-5 text-[#0069AF]" />
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
        <>
        <div className="space-y-1">
          {pagedItems.map((item, idx) => {
            if (item._type === 'task') {
              const status = statusConfig[item.status] || statusConfig.todo;
              const StatusIcon = status.icon;
              const dueStatus = getDueStatus(item.due_date);
              const dueBadge = getDueBadge(item.due_date);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <div className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all", getRowBg(dueStatus))}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onTaskComplete?.(item);
                      }}
                      className={cn("p-1 rounded-md hover:scale-110 transition-transform shrink-0", status.bg)}
                    >
                      <StatusIcon className={cn("w-3.5 h-3.5", status.color)} />
                    </button>
                    <Link to={createPageUrl('ProjectTasks') + `?id=${item.project_id}`} className="flex-1 min-w-0 flex items-center gap-2">
                      <p className="font-medium text-slate-900 text-sm truncate">{item.title}</p>
                    </Link>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[120px]">
                        {getProjectName(item.project_id)}
                      </span>
                      {dueBadge && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", dueBadge.className)}>
                          <Calendar className="w-2.5 h-2.5 mr-0.5" />
                          {dueBadge.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            } else {
              const dueStatus = getDueStatus(item.due_date);
              const dueBadge = getDueBadge(item.due_date);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Link to={createPageUrl('ProjectParts') + `?id=${item.project_id}`}>
                    <div className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all", getRowBg(dueStatus))}>
                      <div className="p-1 rounded-md bg-amber-100 shrink-0">
                        <Package className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <p className="font-medium text-slate-900 text-sm truncate flex-1 min-w-0">{item.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[120px]">
                          {getProjectName(item.project_id)}
                        </span>
                        {dueBadge && (
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", dueBadge.className)}>
                            <Calendar className="w-2.5 h-2.5 mr-0.5" />
                            {dueBadge.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            }
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-xs text-slate-400">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}

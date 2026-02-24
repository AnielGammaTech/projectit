import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, CheckCircle2, Circle, Clock, ArrowUpCircle, Calendar, Package, Target, Star, Check, X, Plus, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import { api } from '@/api/apiClient';
import { parseLocalDate } from '@/utils/dateUtils';

const FOCUS_KEY = 'todaysFocus';

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
  if (dueStatus === 'overdue') return 'bg-red-50 hover:bg-red-100/70 dark:bg-red-900/20 dark:hover:bg-red-900/30';
  if (dueStatus === 'soon') return 'bg-amber-50 hover:bg-amber-100/60 dark:bg-amber-900/20 dark:hover:bg-amber-900/30';
  return 'hover:bg-slate-50 dark:hover:bg-slate-700/50';
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
  const [activeTab, setActiveTab] = useState('tasks');

  // ─── Tasks logic ───
  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  const activeProjectIds = projects.filter(p => p.status !== 'archived' && p.status !== 'completed').map(p => p.id);

  const myTasks = tasks
    .filter(t => t.assigned_to === currentUserEmail && t.status !== 'completed' && t.status !== 'archived' && activeProjectIds.includes(t.project_id))
    .sort((a, b) => {
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

  const allItems = [
    ...myTasks.map(t => ({ ...t, _type: 'task' })),
    ...myParts.map(p => ({ ...p, _type: 'part' })),
  ];
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
  const [page, setPage] = useState(0);
  const pagedItems = allItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalItems = allItems.length;

  // ─── Focus logic ───
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const [focusItems, setFocusItems] = useState(() => {
    const saved = localStorage.getItem(FOCUS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === todayKey) return parsed.items;
    }
    return [];
  });
  const [newItem, setNewItem] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    localStorage.setItem(FOCUS_KEY, JSON.stringify({ date: todayKey, items: focusItems }));
  }, [focusItems, todayKey]);

  const addFocusItem = () => {
    if (!newItem.trim()) return;
    setFocusItems(prev => [...prev, { id: Date.now(), text: newItem.trim(), done: false }]);
    setNewItem('');
  };

  const toggleFocusItem = (id) => {
    setFocusItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const removeFocusItem = (id) => {
    setFocusItems(prev => prev.filter(item => item.id !== id));
  };

  const dueTodayTasks = tasks.filter(t => {
    if (t.assigned_to !== currentUserEmail) return false;
    if (t.status === 'completed' || t.status === 'archived') return false;
    if (!t.due_date) return false;
    return t.due_date.split('T')[0] === todayKey;
  });

  // Sync: auto-mark focus items done when their linked task is completed
  const handleTaskCompleteWithSync = (item) => {
    // Mark matching focus item as done (match by taskId or title)
    setFocusItems(prev => prev.map(fi => {
      if (fi.taskId === item.id || fi.text === item.title) {
        return { ...fi, done: true };
      }
      return fi;
    }));
    onTaskComplete?.(item);
  };

  // Also filter: if a task was completed in the DB, auto-mark its focus item
  useEffect(() => {
    const completedTaskIds = tasks.filter(t => t.status === 'completed').map(t => t.id);
    const completedTaskTitles = tasks.filter(t => t.status === 'completed').map(t => t.title);
    setFocusItems(prev => {
      const updated = prev.map(fi => {
        if (!fi.done && (completedTaskIds.includes(fi.taskId) || completedTaskTitles.includes(fi.text))) {
          return { ...fi, done: true };
        }
        return fi;
      });
      // Only update if something changed
      if (JSON.stringify(updated) !== JSON.stringify(prev)) return updated;
      return prev;
    });
  }, [tasks]);

  const completedFocus = focusItems.filter(i => i.done).length;

  return (
    <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl transition-colors", activeTab === 'tasks' ? "bg-[#0069AF]/10 dark:bg-blue-900/30" : "bg-amber-100/80 dark:bg-amber-900/30")}>
            {activeTab === 'tasks' ? (
              <ListTodo className="w-5 h-5 text-[#0069AF] dark:text-blue-400" />
            ) : (
              <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('tasks')}
                className={cn(
                  "text-lg font-semibold transition-colors",
                  activeTab === 'tasks' ? "text-slate-900 dark:text-slate-100" : "text-slate-300 dark:text-slate-600 hover:text-slate-500"
                )}
              >
                My Tasks
              </button>
              <span className="text-slate-300 dark:text-slate-600 text-lg">/</span>
              <button
                onClick={() => setActiveTab('focus')}
                className={cn(
                  "text-lg font-semibold transition-colors",
                  activeTab === 'focus' ? "text-slate-900 dark:text-slate-100" : "text-slate-300 dark:text-slate-600 hover:text-slate-500"
                )}
              >
                Focus
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeTab === 'tasks' ? `${totalItems} items assigned to you` : `${format(new Date(), 'EEEE, MMMM d')}`}
            </p>
          </div>
        </div>
        {activeTab === 'tasks' ? (
          <Link to={createPageUrl('AllTasks')}>
            <Badge variant="outline" className="hover:bg-slate-100">View All</Badge>
          </Link>
        ) : (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 font-medium px-2 py-1 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {/* ─── Tasks Tab ─── */}
      {activeTab === 'tasks' && (
        <>
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
                              handleTaskCompleteWithSync(item);
                            }}
                            className={cn("p-1 rounded-md hover:scale-110 transition-transform shrink-0", status.bg)}
                          >
                            <StatusIcon className={cn("w-3.5 h-3.5", status.color)} />
                          </button>
                          <Link to={createPageUrl('ProjectTasks') + `?id=${item.project_id}`} className="flex-1 min-w-0 flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{item.title}</p>
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
                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate flex-1 min-w-0">{item.name}</p>
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
        </>
      )}

      {/* ─── Focus Tab ─── */}
      {activeTab === 'focus' && (
        <div>
          {focusItems.length === 0 && !isEditing ? (
            <div className="text-center py-6">
              <Star className="w-8 h-8 text-amber-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No focus items for today</p>
              <p className="text-xs text-slate-400 mt-0.5">Add what you want to accomplish</p>
              {dueTodayTasks.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const items = dueTodayTasks.slice(0, 3).map(t => ({
                      id: Date.now() + Math.random(),
                      text: t.title,
                      done: false,
                      taskId: t.id
                    }));
                    setFocusItems(items);
                  }}
                  className="mt-3 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Add {dueTodayTasks.length} due today
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <AnimatePresence>
                {focusItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all",
                      item.done ? "bg-emerald-50/60 dark:bg-emerald-900/20" : "bg-slate-50/60 dark:bg-slate-800/30"
                    )}
                  >
                    <button
                      onClick={() => toggleFocusItem(item.id)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        item.done
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-amber-300 hover:border-amber-500"
                      )}
                    >
                      {item.done && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={cn(
                      "text-sm flex-1",
                      item.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"
                    )}>
                      {item.text}
                    </span>
                    {isEditing && (
                      <button
                        onClick={() => removeFocusItem(item.id)}
                        className="p-0.5 text-slate-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Add item input */}
          {(isEditing || focusItems.length > 0) && (
            <div className="flex items-center gap-2 mt-3">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFocusItem()}
                placeholder="Add a focus item..."
                className="h-8 text-xs bg-slate-50/70 dark:bg-slate-800/50 border-amber-200/60 dark:border-amber-800"
              />
              <Button
                size="sm"
                onClick={addFocusItem}
                disabled={!newItem.trim()}
                className="h-8 w-8 p-0 bg-amber-500 hover:bg-amber-600"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Progress */}
          {focusItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span>{completedFocus} of {focusItems.length} completed</span>
                {completedFocus === focusItems.length && focusItems.length > 0 && (
                  <span className="font-semibold text-emerald-600">All done! 🎉</span>
                )}
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: focusItems.length > 0 ? `${(completedFocus / focusItems.length) * 100}%` : '0%' }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

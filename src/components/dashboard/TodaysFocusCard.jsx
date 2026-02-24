import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Edit2, Check, X, Plus, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const FOCUS_KEY = 'todaysFocus';
const greetings = [
  { hour: 5, text: 'Good morning', emoji: '🌅' },
  { hour: 12, text: 'Good afternoon', emoji: '☀️' },
  { hour: 17, text: 'Good evening', emoji: '🌆' },
  { hour: 21, text: 'Good night', emoji: '🌙' },
];

function getGreeting() {
  const hour = new Date().getHours();
  const g = [...greetings].reverse().find(g => hour >= g.hour) || greetings[0];
  return g;
}

export default function TodaysFocusCard({ tasks = [], currentUserEmail }) {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const [focusItems, setFocusItems] = useState(() => {
    const saved = localStorage.getItem(FOCUS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === todayKey) return parsed.items;
    }
    return [];
  });
  const [isEditing, setIsEditing] = useState(false);
  const [newItem, setNewItem] = useState('');
  const greeting = getGreeting();

  useEffect(() => {
    localStorage.setItem(FOCUS_KEY, JSON.stringify({ date: todayKey, items: focusItems }));
  }, [focusItems, todayKey]);

  const addItem = () => {
    if (!newItem.trim()) return;
    setFocusItems(prev => [...prev, { id: Date.now(), text: newItem.trim(), done: false }]);
    setNewItem('');
  };

  const toggleItem = (id) => {
    setFocusItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const removeItem = (id) => {
    setFocusItems(prev => prev.filter(item => item.id !== id));
  };

  // Auto-suggest from user's due-today tasks
  const dueTodayTasks = tasks.filter(t => {
    if (t.assigned_to !== currentUserEmail) return false;
    if (t.status === 'completed' || t.status === 'archived') return false;
    if (!t.due_date) return false;
    const d = t.due_date.split('T')[0];
    return d === todayKey;
  });

  const completedCount = focusItems.filter(i => i.done).length;

  return (
    <div className="bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/60 dark:from-[#2a2520] dark:via-[#25221d] dark:to-[#2a2520] rounded-2xl border border-amber-200/60 dark:border-amber-800/30 p-5">
      {/* Greeting */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-2xl">{greeting.emoji}</span>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{greeting.text}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
      </div>

      {/* Focus Section */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Target className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Today's Focus</span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-amber-600 hover:text-amber-800 font-medium"
        >
          {isEditing ? 'Done' : 'Edit'}
        </button>
      </div>

      {focusItems.length === 0 && !isEditing ? (
        <div className="text-center py-4">
          <Star className="w-8 h-8 text-amber-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No tasks for today</p>
          <p className="text-xs text-slate-400">You're all caught up!</p>
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
                  item.done ? "bg-emerald-50/60 dark:bg-emerald-900/20" : "bg-white/60 dark:bg-slate-800/30"
                )}
              >
                <button
                  onClick={() => toggleItem(item.id)}
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
                    onClick={() => removeItem(item.id)}
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
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Add a focus item..."
            className="h-8 text-xs bg-white/70 dark:bg-slate-800/50 border-amber-200 dark:border-amber-800"
          />
          <Button
            size="sm"
            onClick={addItem}
            disabled={!newItem.trim()}
            className="h-8 w-8 p-0 bg-amber-500 hover:bg-amber-600"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Progress indicator */}
      {focusItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-200/40">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 mb-1.5">
            <span>{completedCount} of {focusItems.length} completed</span>
            {completedCount === focusItems.length && focusItems.length > 0 && (
              <span className="font-semibold text-emerald-600">All done! 🎉</span>
            )}
          </div>
          <div className="h-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: focusItems.length > 0 ? `${(completedCount / focusItems.length) * 100}%` : '0%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

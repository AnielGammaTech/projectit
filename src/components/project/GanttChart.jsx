import { useState, useRef, useEffect, useMemo } from 'react';
import { format, addDays, differenceInDays, startOfDay, endOfDay, min, max, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, GripVertical, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const statusColors = {
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  review: 'bg-amber-500',
  completed: 'bg-emerald-500',
  archived: 'bg-slate-300'
};

const priorityBorders = {
  high: 'border-l-4 border-l-red-500',
  medium: 'border-l-4 border-l-amber-400',
  low: 'border-l-4 border-l-slate-300'
};

export default function GanttChart({ 
  tasks = [], 
  groups = [],
  project,
  onTaskUpdate,
  onTaskClick 
}) {
  const containerRef = useRef(null);
  const [viewStart, setViewStart] = useState(() => {
    const projectStart = project?.start_date ? parseISO(project.start_date) : new Date();
    return startOfDay(addDays(projectStart, -3));
  });
  const [daysToShow, setDaysToShow] = useState(30);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);

  const dayWidth = 40;
  const rowHeight = 36;
  const labelWidth = 200;

  // Calculate date range from tasks and project
  const dateRange = useMemo(() => {
    const dates = [];
    if (project?.start_date) dates.push(parseISO(project.start_date));
    if (project?.due_date) dates.push(parseISO(project.due_date));
    tasks.forEach(t => {
      if (t.start_date) dates.push(parseISO(t.start_date));
      if (t.due_date) dates.push(parseISO(t.due_date));
    });
    
    if (dates.length === 0) {
      return { start: new Date(), end: addDays(new Date(), 30) };
    }
    
    return {
      start: min(dates),
      end: max(dates)
    };
  }, [tasks, project]);

  // Generate array of days
  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < daysToShow; i++) {
      result.push(addDays(viewStart, i));
    }
    return result;
  }, [viewStart, daysToShow]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    const grouped = {};
    groups.forEach(g => {
      grouped[g.id] = { group: g, tasks: [] };
    });
    grouped['ungrouped'] = { group: null, tasks: [] };
    
    tasks.forEach(task => {
      const groupId = task.group_id || 'ungrouped';
      if (grouped[groupId]) {
        grouped[groupId].tasks.push(task);
      } else {
        grouped['ungrouped'].tasks.push(task);
      }
    });
    
    return Object.values(grouped).filter(g => g.tasks.length > 0 || g.group);
  }, [tasks, groups]);

  const getTaskPosition = (task) => {
    const start = task.start_date ? parseISO(task.start_date) : (task.due_date ? parseISO(task.due_date) : null);
    if (!start) return null;
    
    const daysFromStart = differenceInDays(start, viewStart);
    const duration = task.duration_days || (task.due_date && task.start_date ? 
      Math.max(1, differenceInDays(parseISO(task.due_date), parseISO(task.start_date)) + 1) : 1);
    
    return {
      left: daysFromStart * dayWidth,
      width: Math.max(duration * dayWidth - 4, dayWidth - 4)
    };
  };

  const handleMouseDown = (e, task, type) => {
    e.stopPropagation();
    const startX = e.clientX;
    const position = getTaskPosition(task);
    
    if (type === 'move') {
      setDragging({ task, startX, originalLeft: position.left });
    } else {
      setResizing({ task, startX, originalWidth: position.width, side: type });
    }
  };

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMouseMove = (e) => {
      if (dragging) {
        const deltaX = e.clientX - dragging.startX;
        const newLeft = dragging.originalLeft + deltaX;
        const dayOffset = Math.round(newLeft / dayWidth);
        const newStartDate = addDays(viewStart, dayOffset);
        
        // Update task visually (debounced save on mouseup)
        const taskEl = document.querySelector(`[data-task-id="${dragging.task.id}"]`);
        if (taskEl) {
          taskEl.style.left = `${dayOffset * dayWidth}px`;
        }
      }
      
      if (resizing) {
        const deltaX = e.clientX - resizing.startX;
        let newWidth = resizing.originalWidth;
        
        if (resizing.side === 'right') {
          newWidth = Math.max(dayWidth - 4, resizing.originalWidth + deltaX);
        }
        
        const taskEl = document.querySelector(`[data-task-id="${resizing.task.id}"]`);
        if (taskEl) {
          taskEl.style.width = `${newWidth}px`;
        }
      }
    };

    const handleMouseUp = async (e) => {
      if (dragging) {
        const deltaX = e.clientX - dragging.startX;
        const dayOffset = Math.round((dragging.originalLeft + deltaX) / dayWidth);
        const newStartDate = format(addDays(viewStart, dayOffset), 'yyyy-MM-dd');
        
        const duration = dragging.task.duration_days || 1;
        const newDueDate = format(addDays(parseISO(newStartDate), duration - 1), 'yyyy-MM-dd');
        
        await onTaskUpdate(dragging.task.id, {
          start_date: newStartDate,
          due_date: newDueDate
        });
      }
      
      if (resizing) {
        const deltaX = e.clientX - resizing.startX;
        const newWidth = Math.max(dayWidth - 4, resizing.originalWidth + deltaX);
        const newDuration = Math.max(1, Math.round(newWidth / dayWidth));
        
        const startDate = resizing.task.start_date ? parseISO(resizing.task.start_date) : new Date();
        const newDueDate = format(addDays(startDate, newDuration - 1), 'yyyy-MM-dd');
        
        await onTaskUpdate(resizing.task.id, {
          duration_days: newDuration,
          due_date: newDueDate
        });
      }
      
      setDragging(null);
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, resizing, viewStart, dayWidth, onTaskUpdate]);

  const navigateTime = (direction) => {
    setViewStart(prev => addDays(prev, direction * 7));
  };

  const goToToday = () => {
    setViewStart(startOfDay(addDays(new Date(), -3)));
  };

  let rowIndex = 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateTime(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateTime(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-sm font-medium text-slate-600">
          {format(viewStart, 'MMM d')} - {format(addDays(viewStart, daysToShow - 1), 'MMM d, yyyy')}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={daysToShow === 14 ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setDaysToShow(14)}
          >
            2 Weeks
          </Button>
          <Button 
            variant={daysToShow === 30 ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setDaysToShow(30)}
          >
            Month
          </Button>
          <Button 
            variant={daysToShow === 60 ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setDaysToShow(60)}
          >
            2 Months
          </Button>
        </div>
      </div>

      <div className="flex overflow-x-auto" ref={containerRef}>
        {/* Task Labels Column */}
        <div className="flex-shrink-0 border-r border-slate-200 bg-white z-10" style={{ width: labelWidth }}>
          {/* Header */}
          <div className="h-12 border-b border-slate-200 bg-slate-50 flex items-center px-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Tasks</span>
          </div>
          
          {/* Task rows */}
          {groupedTasks.map(({ group, tasks: groupTasks }) => (
            <div key={group?.id || 'ungrouped'}>
              {group && (
                <div 
                  className="h-8 bg-slate-100 flex items-center px-3 border-b border-slate-200"
                >
                  <span className="text-xs font-semibold text-slate-600">{group.name}</span>
                </div>
              )}
              {groupTasks.map(task => (
                <div 
                  key={task.id}
                  className="flex items-center px-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  style={{ height: rowHeight }}
                  onClick={() => onTaskClick?.(task)}
                >
                  <span className="text-sm text-slate-700 truncate">{task.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 overflow-x-auto">
          {/* Day Headers */}
          <div className="flex h-12 border-b border-slate-200 bg-slate-50">
            {days.map((day, i) => {
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              
              return (
                <div 
                  key={i}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-200",
                    isToday && "bg-blue-50",
                    isWeekend && "bg-slate-100"
                  )}
                  style={{ width: dayWidth }}
                >
                  <span className="text-[10px] text-slate-400">{format(day, 'EEE')}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    isToday ? "text-blue-600" : "text-slate-600"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Task Bars */}
          <div className="relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {days.map((day, i) => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                
                return (
                  <div 
                    key={i}
                    className={cn(
                      "flex-shrink-0 border-r border-slate-100",
                      isToday && "bg-blue-50/50",
                      isWeekend && "bg-slate-50"
                    )}
                    style={{ width: dayWidth, height: '100%' }}
                  />
                );
              })}
            </div>

            {/* Today line */}
            {days.some(d => format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20"
                style={{ 
                  left: differenceInDays(new Date(), viewStart) * dayWidth + dayWidth / 2 
                }}
              />
            )}

            {/* Task bars */}
            {(() => {
              let currentRow = 0;
              return groupedTasks.map(({ group, tasks: groupTasks }) => (
                <div key={group?.id || 'ungrouped'}>
                  {group && (
                    <div className="h-8 bg-slate-100 border-b border-slate-200" />
                  )}
                  {groupTasks.map(task => {
                    const position = getTaskPosition(task);
                    currentRow++;
                    
                    if (!position) {
                      return (
                        <div 
                          key={task.id}
                          className="border-b border-slate-100"
                          style={{ height: rowHeight }}
                        >
                          <div className="flex items-center justify-center h-full text-xs text-slate-400">
                            <Calendar className="w-3 h-3 mr-1" />
                            No dates set
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div 
                        key={task.id}
                        className="relative border-b border-slate-100"
                        style={{ height: rowHeight }}
                      >
                        <motion.div
                          data-task-id={task.id}
                          className={cn(
                            "absolute top-1 rounded-md shadow-sm cursor-move flex items-center px-2 text-xs text-white font-medium",
                            statusColors[task.status],
                            priorityBorders[task.priority],
                            (dragging?.task.id === task.id || resizing?.task.id === task.id) && "opacity-75 shadow-lg"
                          )}
                          style={{
                            left: position.left,
                            width: position.width,
                            height: rowHeight - 8
                          }}
                          whileHover={{ scale: 1.02 }}
                          onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                        >
                          <GripVertical className="w-3 h-3 mr-1 opacity-50" />
                          <span className="truncate">{task.title}</span>
                          
                          {/* Resize handle */}
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                            onMouseDown={(e) => handleMouseDown(e, task, 'right')}
                          />
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-200 bg-slate-50 text-xs">
        <span className="text-slate-500">Status:</span>
        {Object.entries(statusColors).filter(([k]) => k !== 'archived').map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn("w-3 h-3 rounded", color)} />
            <span className="text-slate-600 capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, PauseCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { parseLocalDate } from '@/utils/dateUtils';
import { differenceInDays, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

function HealthCard({ project, type, detail }) {
  const config = {
    overdue: {
      border: 'border-l-red-400',
      bg: 'bg-red-50/60 dark:bg-red-900/10',
      icon: AlertTriangle,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      label: 'Overdue',
    },
    blocked: {
      border: 'border-l-amber-400',
      bg: 'bg-amber-50/60 dark:bg-amber-900/10',
      icon: PauseCircle,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      label: 'On Hold',
    },
    at_risk: {
      border: 'border-l-orange-400',
      bg: 'bg-orange-50/60 dark:bg-orange-900/10',
      icon: Clock,
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      label: 'At Risk',
    },
  };

  const c = config[type];
  const Icon = c.icon;

  return (
    <Link to={createPageUrl('ProjectDetail') + `?id=${project.id}`}>
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        className={cn(
          "rounded-2xl border-l-4 p-4 transition-all duration-200 cursor-pointer hover:shadow-warm-hover",
          c.border, c.bg
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn("p-1.5 rounded-lg shrink-0", c.iconBg)}>
            <Icon className={cn("w-4 h-4", c.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground truncate">{project.client}</p>
            {detail && (
              <p className={cn("text-xs font-medium mt-1", c.iconColor)}>{detail}</p>
            )}
          </div>
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            c.iconBg, c.iconColor
          )}>
            {c.label}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

export default function ProjectHealthGrid({ projects, tasks }) {
  const healthItems = useMemo(() => {
    const items = [];

    projects.forEach(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);

      // On hold projects
      if (project.status === 'on_hold') {
        items.push({ project, type: 'blocked', detail: 'Project is on hold' });
        return;
      }

      // Overdue projects (past due date)
      if (project.due_date) {
        const dueDate = parseLocalDate(project.due_date);
        if (dueDate && isPast(dueDate) && !isToday(dueDate)) {
          const daysOver = differenceInDays(new Date(), dueDate);
          items.push({
            project,
            type: 'overdue',
            detail: `${daysOver} day${daysOver > 1 ? 's' : ''} past due`,
          });
          return;
        }
      }

      // At risk: has overdue tasks
      const overdueTasks = projectTasks.filter(t => {
        if (t.status === 'completed' || t.status === 'archived') return false;
        if (!t.due_date) return false;
        const d = parseLocalDate(t.due_date);
        return d && isPast(d) && !isToday(d);
      });

      if (overdueTasks.length >= 3) {
        items.push({
          project,
          type: 'at_risk',
          detail: `${overdueTasks.length} overdue tasks`,
        });
      }
    });

    // Sort: overdue first, then blocked, then at_risk
    const order = { overdue: 0, blocked: 1, at_risk: 2 };
    items.sort((a, b) => order[a.type] - order[b.type]);

    return items.slice(0, 6);
  }, [projects, tasks]);

  if (healthItems.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Projects Needing Attention
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {healthItems.map(({ project, type, detail }) => (
          <HealthCard
            key={project.id}
            project={project}
            type={type}
            detail={detail}
          />
        ))}
      </div>
    </div>
  );
}

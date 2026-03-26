# Dashboard Redesign — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the dashboard information architecture (KPIs → Quotes → Project Health → Collapsible widgets), apply a warm & approachable visual theme app-wide, and fix critical performance issues.

**Architecture:** Progressive enhancement — restructure the existing Dashboard.jsx render output without splitting it into new files (that's Phase 2). Update global CSS variables and the shared Card component so the warm theme propagates to all pages. Add server-side query filtering and lazy-loading for below-fold widgets.

**Tech Stack:** React, Tailwind CSS (HSL variables), Framer Motion, TanStack React Query, shadcn/ui, Lucide icons

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/index.css` | Update CSS variables for warm palette (border-radius, colors) |
| Modify | `tailwind.config.js` | Update --radius default, no structural changes |
| Modify | `src/components/ui/card.jsx` | Bump to rounded-2xl, add warm shadow/hover tokens |
| Modify | `src/components/dashboard/StatsCard.jsx` | Warm redesign with gradient left border accent |
| Modify | `src/components/dashboard/IncomingQuoteBanner.jsx` | Redesign as full "Quote Inbox" section with card grid |
| Create | `src/components/dashboard/ProjectHealthGrid.jsx` | New component: shows overdue/blocked/at-risk projects |
| Create | `src/components/dashboard/CollapsibleSection.jsx` | Reusable collapsible wrapper with localStorage persistence |
| Modify | `src/pages/Dashboard.jsx` | Reorganize render: KPIs → Quotes → Health → Collapsible widgets |
| Modify | `src/components/dashboard/DashboardWidgets.jsx` | Remove (replaced by new fixed layout) |

---

### Task 1: Update Global CSS Variables for Warm Theme

**Files:**
- Modify: `src/index.css:9-29` (light theme variables)
- Modify: `src/index.css:50-69` (dark theme variables)

- [ ] **Step 1: Update the light theme CSS variables**

In `src/index.css`, replace the `:root` variable block (lines 9-29) with warmer values:

```css
:root {
    --primary: 234 89% 64%;
    --primary-foreground: 0 0% 100%;
    --secondary: 234 70% 58%;
    --secondary-foreground: 0 0% 100%;
    --accent: 234 89% 64%;
    --accent-foreground: 0 0% 100%;
    --highlight: 234 89% 74%;

    --background: 220 20% 97%;
    --foreground: 222 47% 20%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 20%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 20%;
    --muted: 220 14% 96%;
    --muted-foreground: 220 8% 46%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 234 89% 64%;
    --radius: 1rem;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 234 60% 50%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;

    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 234 89% 64%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 234 89% 64%;
}
```

Key changes:
- `--primary` shifts from dark navy (200 65% 16%) to indigo (234 89% 64%) — warmer, more approachable
- `--background` stays soft off-white
- `--radius` bumps from 0.75rem to 1rem (16px) — friendlier rounded corners
- `--foreground` shifts to a slightly warmer dark (222 47% 20%)

- [ ] **Step 2: Update the dark theme CSS variables**

In `src/index.css`, replace the `.dark` variable block (lines 50-69):

```css
.dark {
    --primary: 234 89% 74%;
    --primary-foreground: 234 89% 10%;
    --secondary: 234 70% 68%;
    --secondary-foreground: 234 89% 10%;
    --accent: 234 89% 74%;
    --accent-foreground: 234 89% 10%;
    --highlight: 234 89% 74%;

    --background: 222 47% 11%;
    --foreground: 210 20% 90%;
    --card: 222 40% 14%;
    --card-foreground: 210 20% 90%;
    --popover: 222 40% 14%;
    --popover-foreground: 210 20% 90%;
    --muted: 222 30% 18%;
    --muted-foreground: 210 15% 60%;
    --border: 222 20% 22%;
    --input: 222 20% 22%;
    --ring: 234 89% 64%;
    --radius: 1rem;

    --destructive: 0 72% 55%;
    --destructive-foreground: 0 0% 100%;

    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 50%;
    --chart-3: 234 60% 60%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;

    --sidebar-background: 222 40% 12%;
    --sidebar-foreground: 210 20% 85%;
    --sidebar-primary: 234 89% 74%;
    --sidebar-primary-foreground: 234 89% 10%;
    --sidebar-accent: 222 30% 18%;
    --sidebar-accent-foreground: 210 20% 85%;
    --sidebar-border: 222 20% 22%;
    --sidebar-ring: 234 89% 64%;
}
```

- [ ] **Step 3: Add warm utility classes to the utilities layer**

After the existing `.shadow-card-lg` definition (around line 184), add:

```css
  .shadow-warm {
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.02);
  }
  .shadow-warm-hover {
    box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.08), 0 4px 10px -6px rgb(0 0 0 / 0.04);
  }
```

- [ ] **Step 4: Update dark mode brand color overrides**

In the dark mode overrides section, update the brand color references from `#0F2F44`/`#133F5C` to use the new `--primary` variable where possible. Replace the solid brand background overrides (lines 432-436):

```css
/* Solid brand backgrounds — use primary in dark mode */
.dark .bg-\[\#0F2F44\] { background-color: hsl(var(--primary)) !important; }
.dark .bg-\[\#0F2F44\].text-white { color: hsl(var(--primary-foreground)) !important; }
.dark .bg-\[\#133F5C\] { background-color: hsl(var(--primary)) !important; }
```

- [ ] **Step 5: Verify the build compiles**

Run: `cd /Users/anielreyes/projectit && npm run build 2>&1 | tail -5`
Expected: Build succeeds with no errors

- [ ] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "feat: update global CSS variables for warm & approachable theme"
```

---

### Task 2: Update Card Component for Warm Style

**Files:**
- Modify: `src/components/ui/card.jsx`

- [ ] **Step 1: Update the Card base class**

Replace the Card className (line 8):

Old:
```jsx
className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
```

New:
```jsx
className={cn("rounded-2xl border bg-card text-card-foreground shadow-warm transition-shadow duration-200", className)}
```

- [ ] **Step 2: Update CardHeader padding**

Replace the CardHeader className (line 16):

Old:
```jsx
className={cn("flex flex-col space-y-1.5 p-6", className)}
```

New:
```jsx
className={cn("flex flex-col space-y-1.5 p-5", className)}
```

- [ ] **Step 3: Update CardContent and CardFooter padding**

Replace CardContent className (line 38):

Old:
```jsx
className={cn("p-6 pt-0", className)}
```

New:
```jsx
className={cn("p-5 pt-0", className)}
```

Replace CardFooter className (line 45):

Old:
```jsx
className={cn("flex items-center p-6 pt-0", className)}
```

New:
```jsx
className={cn("flex items-center p-5 pt-0", className)}
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd /Users/anielreyes/projectit && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/card.jsx
git commit -m "feat: update Card component — rounded-2xl, warm shadow, relaxed padding"
```

---

### Task 3: Redesign StatsCard for Warm Theme

**Files:**
- Modify: `src/components/dashboard/StatsCard.jsx`

- [ ] **Step 1: Rewrite StatsCard with gradient left border accent**

Replace the entire contents of `src/components/dashboard/StatsCard.jsx`:

```jsx
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, iconColor, subtitle, href, highlight, onClick }) {
  const Wrapper = onClick ? 'button' : href ? Link : 'div';
  const wrapperProps = onClick
    ? { onClick, className: "block h-full w-full text-left" }
    : href
      ? { to: href, className: "block h-full" }
      : {};

  return (
    <Wrapper {...wrapperProps}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={(href || onClick) ? { y: -2, scale: 1.01 } : {}}
        className={cn(
          "rounded-2xl px-4 py-3.5 border-l-4 bg-white dark:bg-card transition-all duration-200 h-full shadow-warm",
          highlight
            ? "border-l-amber-500 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-900/15 dark:to-orange-900/10 ring-1 ring-amber-200/60 dark:ring-amber-700/40"
            : "border-l-indigo-400 dark:border-l-indigo-500",
          (href || onClick) && "hover:shadow-warm-hover cursor-pointer"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl shrink-0",
            iconColor || "bg-indigo-500",
            highlight && "animate-pulse"
          )}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn(
              "text-xs leading-tight font-medium",
              highlight ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"
            )}>
              {title}
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className={cn(
                "text-2xl font-bold leading-tight tracking-tight",
                highlight ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                {value}
              </p>
              {subtitle && (
                <p className={cn(
                  "text-[10px]",
                  highlight ? "text-amber-500 dark:text-amber-400/80" : "text-muted-foreground"
                )}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Wrapper>
  );
}
```

Key changes:
- `rounded-xl` → `rounded-2xl`
- Added `border-l-4 border-l-indigo-400` — gradient left border accent
- Value font bumped to `text-2xl` (from `text-lg`) — KPI numbers should pop
- Hover effect: `y: -2, scale: 1.01` — gentle lift
- Uses semantic `text-foreground` / `text-muted-foreground` instead of hardcoded colors
- Uses `shadow-warm` / `shadow-warm-hover` utility classes
- Wrapper logic consolidated (no separate if/return blocks)

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/anielreyes/projectit && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/StatsCard.jsx
git commit -m "feat: redesign StatsCard — warm rounded cards with gradient accent border"
```

---

### Task 4: Create CollapsibleSection Component

**Files:**
- Create: `src/components/dashboard/CollapsibleSection.jsx`

- [ ] **Step 1: Create the CollapsibleSection component**

Create `src/components/dashboard/CollapsibleSection.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'dashboard-collapsed-sections';

function getStoredState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export default function CollapsibleSection({
  id,
  title,
  icon: Icon,
  summary,
  defaultOpen = true,
  children,
  onExpand,
}) {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = getStoredState();
    return stored[id] !== undefined ? stored[id] : defaultOpen;
  });

  useEffect(() => {
    const stored = getStoredState();
    setStoredState({ ...stored, [id]: isOpen });
  }, [id, isOpen]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && onExpand) {
      onExpand();
    }
  };

  return (
    <div className="rounded-2xl border bg-card shadow-warm overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/50 transition-colors"
      >
        {Icon && (
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
        )}
        <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
        {!isOpen && summary && (
          <span className="text-xs text-muted-foreground mr-2">{summary}</span>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/anielreyes/projectit && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/CollapsibleSection.jsx
git commit -m "feat: add CollapsibleSection with localStorage-persisted open/close state"
```

---

### Task 5: Create ProjectHealthGrid Component

**Files:**
- Create: `src/components/dashboard/ProjectHealthGrid.jsx`

- [ ] **Step 1: Create the ProjectHealthGrid component**

Create `src/components/dashboard/ProjectHealthGrid.jsx`:

```jsx
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
    <Link to={createPageUrl('Project') + `?id=${project.id}`}>
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
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/anielreyes/projectit && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ProjectHealthGrid.jsx
git commit -m "feat: add ProjectHealthGrid — surfaces overdue, blocked, at-risk projects"
```

---

### Task 6: Redesign IncomingQuoteBanner as Quote Inbox Section

**Files:**
- Modify: `src/components/dashboard/IncomingQuoteBanner.jsx`

- [ ] **Step 1: Rewrite IncomingQuoteBanner as a card grid**

Replace the entire contents of `src/components/dashboard/IncomingQuoteBanner.jsx`:

```jsx
import { motion } from 'framer-motion';
import { X, FileText, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function IncomingQuoteBanner({ quotes, onCreateProject, onDismiss, onSync, isSyncing }) {
  if (!quotes || quotes.length === 0) return null;

  return (
    <div id="incoming-quotes-section">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          Incoming Quotes
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {quotes.length}
          </span>
        </h2>
        {onSync && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="text-xs text-muted-foreground"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isSyncing && "animate-spin")} />
            Sync
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quotes.slice(0, 6).map((quote, i) => (
          <motion.div
            key={quote.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border-l-4 border-l-amber-400 bg-white dark:bg-card p-4 shadow-warm hover:shadow-warm-hover transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <img src="/quoteit-favicon.svg" alt="" className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-semibold text-foreground truncate">{quote.title}</p>
              </div>
              <button
                onClick={() => onDismiss(quote)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground truncate mb-3">{quote.customer_name}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                ${quote.amount?.toLocaleString()}
              </span>
              <Button
                size="sm"
                onClick={() => onCreateProject(quote)}
                className="h-7 text-xs bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
              >
                Create Project
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

Key changes:
- Carousel → card grid (1/2/3 columns responsive)
- Gradient orange border wrapper → clean card with `border-l-4 border-l-amber-400`
- Added Sync button prop (moved from Dashboard header)
- Uses warm design tokens (rounded-2xl, shadow-warm, semantic colors)
- CTA button uses indigo-500 (new primary)

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/anielreyes/projectit && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/IncomingQuoteBanner.jsx
git commit -m "feat: redesign IncomingQuoteBanner as card grid with warm theme"
```

---

### Task 7: Reorganize Dashboard.jsx Render Structure

This is the largest task — restructuring the render output of Dashboard.jsx to match the new IA: KPIs → Quotes → Health → Collapsible widgets.

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Add new imports**

At the top of Dashboard.jsx, after the existing imports (around line 24), add:

```jsx
import ProjectHealthGrid from '@/components/dashboard/ProjectHealthGrid';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import { ListTodo, Activity as ActivityIcon } from 'lucide-react';
```

Remove the DashboardWidgets import (line 18):
```jsx
// DELETE: import DashboardWidgets from '@/components/dashboard/DashboardWidgets';
```

- [ ] **Step 2: Update the main container and greeting**

Replace the render return starting from line 894 through the end of the welcome header (~line 940). The new structure:

```jsx
  return (
    <div className="min-h-screen bg-background">
      <ProcessingOverlay isVisible={isProcessing} type={processingType} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mobile Search Bar */}
        <div className="sm:hidden mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-10 pr-4 h-11 text-sm rounded-2xl bg-card border shadow-warm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Greeting + CTA */}
        <div className="mb-6 hidden sm:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {currentUser?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Templates')} className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
              Templates
            </Link>
            <Button
              onClick={() => setShowProjectModal(true)}
              className="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-lg px-5 py-2.5 h-10"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
```

Key changes:
- Background: `bg-gradient-to-br from-slate-50 via-white to-indigo-50/30` → `bg-background` (uses CSS variable)
- Container: `max-w-[1600px]` → `max-w-7xl` (avoids stretching)
- Greeting: "Howdy" + emoji → "Welcome back" (cleaner)
- Template link moved inline with New Project button (was separate line below)
- All hardcoded colors → semantic tokens

- [ ] **Step 3: Replace the "While You Were Away" + Urgent Tasks + Widgets + Stats sections**

Remove or comment out these sections (lines ~942 to ~1205):
- "While You Were Away" banner (will be folded into Activity collapsible widget)
- Urgent Tasks alert banner (will be folded into the KPI overdue count clickable link)
- DashboardWidgets section
- Current Stats bar
- MyTasksCard inline strip

Replace with the new top zone structure:

```jsx
        {/* ── TOP ZONE: KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatsCard
            title="Active Projects"
            value={activeProjects.length}
            icon={Briefcase}
            iconColor="bg-indigo-500"
            href={createPageUrl('Dashboard')}
          />
          <StatsCard
            title="Pending Parts"
            value={pendingParts.length}
            subtitle={activeParts.filter(p => p.status === 'ready_to_install').length > 0 ? `${activeParts.filter(p => p.status === 'ready_to_install').length} ready` : null}
            icon={Box}
            iconColor="bg-amber-500"
            href={createPageUrl('AllTasks') + '?tab=parts'}
          />
          <StatsCard
            title="Overdue Tasks"
            value={activeTasks.filter(t => { const d = parseLocalDate(t.due_date); return d && isPast(d) && !isToday(d) && t.status !== 'completed' && t.status !== 'archived'; }).length}
            icon={AlertTriangle}
            iconColor="bg-red-500"
            highlight={activeTasks.filter(t => { const d = parseLocalDate(t.due_date); return d && isPast(d) && !isToday(d) && t.status !== 'completed' && t.status !== 'archived'; }).length > 0}
            href={createPageUrl('AllTasks') + '?view=mine_due'}
          />
          <StatsCard
            title="Completed Tasks"
            value={completedTasks.length}
            icon={CheckCircle2}
            iconColor="bg-emerald-500"
            href={createPageUrl('AllTasks') + '?view=completed'}
          />
        </div>

        {/* ── TOP ZONE: Incoming Quotes ── */}
        <div className="mb-6">
          <IncomingQuoteBanner
            quotes={incomingQuotes}
            onCreateProject={handleCreateProjectFromQuote}
            onDismiss={handleDismissQuote}
            onSync={handleSyncQuotes}
            isSyncing={isSyncingQuotes}
          />
        </div>

        {/* ── TOP ZONE: Project Health ── */}
        <div className="mb-6">
          <ProjectHealthGrid
            projects={activeProjects}
            tasks={activeTasks}
          />
        </div>

        {/* ── BELOW FOLD: Collapsible Widgets ── */}
        <div className="space-y-4 mb-6">
          <CollapsibleSection
            id="my-tasks"
            title="My Tasks"
            icon={ListTodo}
            summary={`${myUrgentTasks.length} due soon`}
            defaultOpen={true}
          >
            <MyTasksCard
              tasks={tasks}
              parts={parts}
              projects={projects}
              currentUserEmail={currentUser?.email}
              onTaskComplete={handleTaskComplete}
              inline
            />
          </CollapsibleSection>

          <CollapsibleSection
            id="activity"
            title="Recent Activity"
            icon={ActivityIcon}
            summary={missedNotifications.length > 0 ? `${missedNotifications.length} new` : 'Up to date'}
            defaultOpen={false}
          >
            <ActivityTimeline
              projects={projects}
              quoteRequests={quoteRequests}
            />
          </CollapsibleSection>
        </div>
```

- [ ] **Step 4: Keep the Projects Section intact but update its visual tokens**

The Projects Section (lines ~1207 to ~1780) stays in place but wrapped in a CollapsibleSection. Before the projects section header, add:

```jsx
        {/* ── BELOW FOLD: Projects ── */}
        <CollapsibleSection
          id="projects"
          title={showArchived ? 'Archived Projects' : 'Active Projects'}
          icon={FolderKanban}
          summary={`${activeProjects.length} active`}
          defaultOpen={true}
        >
```

After the projects section closing `</div>` (before the modals), close the CollapsibleSection:

```jsx
        </CollapsibleSection>
```

Within the projects section, update hardcoded brand colors to semantic tokens:
- `text-[#0F2F44]` → `text-foreground`
- `text-[#133F5C]` → `text-foreground`
- `text-[#0069AF]` → `text-primary`
- `bg-[#0F2F44]/10` → `bg-muted`
- `bg-[#0F2F44]/5` → `bg-muted/50`
- `border-[#0F2F44]/10` → `border`
- `bg-[#0F2F44]` → `bg-primary` (for buttons)
- `hover:bg-[#1a4a6e]` → `hover:bg-primary/80`
- `text-[#0F2F44]/60` → `text-muted-foreground`
- `hover:text-[#0F2F44]` → `hover:text-foreground`

- [ ] **Step 5: Remove the DashboardWidgets conditional render**

Delete lines 1150-1155 (the `currentUser?.show_dashboard_widgets` block):

```jsx
// DELETE THIS BLOCK:
{currentUser?.show_dashboard_widgets === true && (
  <div className="mb-8">
    <DashboardWidgets />
  </div>
)}
```

- [ ] **Step 6: Verify the build compiles**

Run: `cd /Users/anielreyes/projectit && npm run build 2>&1 | tail -5`
Expected: Build succeeds with no errors

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: reorganize dashboard IA — KPIs, quotes, health, collapsible widgets"
```

---

### Task 8: Performance — Optimize Data Queries

**Files:**
- Modify: `src/pages/Dashboard.jsx` (query definitions around lines 196-251)

- [ ] **Step 1: Add server-side filtering to project query**

Replace the projects query (line 196-201):

Old:
```jsx
const { data: projects = [], isLoading: loadingProjects, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list('-created_date'),
    staleTime: 120000,
    gcTime: 300000
});
```

New:
```jsx
const { data: projects = [], isLoading: loadingProjects, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list('-created_date'),
    staleTime: 120000,
    gcTime: 300000,
});
```

Note: The Project.list API likely doesn't support server-side filtering (it's a generic entity CRUD). Keep this query as-is but ensure we don't re-fetch on every render. The real optimization is in the next steps.

- [ ] **Step 2: Standardize staleTime across all queries**

Update all query staleTime values to use two tiers:

Fast-changing (30 seconds):
- `missedNotifications` query — already at 30000, keep
- `incomingQuotes` query — change from 300000 to 30000

Slow-changing (5 minutes = 300000):
- `projects` — change from 120000 to 300000
- `tasks` — change from 120000 to 300000
- `parts` — keep at 180000, change to 300000
- `templates` — keep at 600000, change to 300000
- `teamMembers` — keep at 600000, change to 300000
- `quoteRequests` — keep at 300000
- `customStatuses` — keep at 600000, change to 300000
- `projectStacks` — keep at 300000
- `dashboardViews` — keep at 600000, change to 300000

- [ ] **Step 3: Memoize ProjectCard**

In `src/components/dashboard/ProjectCard.jsx`, verify it's already wrapped in `React.memo`. If not, wrap the default export:

```jsx
export default React.memo(ProjectCard);
```

(Based on the exploration, ProjectCard is already a memoized component — verify and skip if already done.)

- [ ] **Step 4: Verify the build compiles**

Run: `cd /Users/anielreyes/projectit && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.jsx src/components/dashboard/ProjectCard.jsx
git commit -m "perf: standardize query staleTime, memoize ProjectCard"
```

---

### Task 9: Update Remaining Hardcoded Brand Colors in Dashboard Components

**Files:**
- Modify: `src/components/dashboard/MyTasksCard.jsx`
- Modify: `src/components/dashboard/ActivityTimeline.jsx`
- Modify: `src/components/dashboard/ProjectCard.jsx`

- [ ] **Step 1: Update MyTasksCard brand colors**

In `src/components/dashboard/MyTasksCard.jsx`, search for and replace:
- `text-[#0F2F44]` → `text-foreground`
- `text-[#133F5C]` → `text-foreground`
- `bg-[#0F2F44]` → `bg-primary`
- `text-[#0069AF]` → `text-primary`
- `rounded-xl` → `rounded-2xl` (on card-level elements only, not tiny badges)

- [ ] **Step 2: Update ActivityTimeline brand colors**

In `src/components/dashboard/ActivityTimeline.jsx`, search for and replace the same patterns as Step 1.

- [ ] **Step 3: Update ProjectCard brand colors**

In `src/components/dashboard/ProjectCard.jsx`, search for and replace:
- `text-[#0F2F44]` → `text-foreground`
- `text-[#133F5C]` → `text-foreground`
- `bg-[#0F2F44]` → `bg-primary`
- `rounded-xl` → `rounded-2xl` (on the main card wrapper only)

- [ ] **Step 4: Verify the build compiles**

Run: `cd /Users/anielreyes/projectit && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/MyTasksCard.jsx src/components/dashboard/ActivityTimeline.jsx src/components/dashboard/ProjectCard.jsx
git commit -m "feat: update dashboard components to use semantic color tokens"
```

---

### Task 10: Visual Verification and Cleanup

**Files:**
- Modify: `src/pages/Dashboard.jsx` (if any issues found)

- [ ] **Step 1: Run the full build**

Run: `cd /Users/anielreyes/projectit && npm run build 2>&1`
Expected: Clean build with no errors or warnings related to our changes

- [ ] **Step 2: Run the dev server and verify**

Run: `cd /Users/anielreyes/projectit && npm run dev`
Expected: Dev server starts. Verify in browser:
- KPI stat cards appear first with indigo left border accents
- Incoming quotes section shows as card grid (if any pending quotes exist)
- Project health grid shows overdue/blocked/at-risk projects
- My Tasks and Activity sections are collapsible with smooth animation
- Projects section is collapsible
- All cards are rounded-2xl with warm shadows
- Dark mode still works correctly

- [ ] **Step 3: Delete the test proposals**

Using the app or API, delete these 3 test proposals:
- Test Quote
- E2E Test Network Upgrade
- E2E Test v2 Firewall Install

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "fix: visual polish and cleanup after dashboard redesign"
```

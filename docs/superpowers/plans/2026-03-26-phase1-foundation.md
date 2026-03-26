# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared foundation (Layout redesign, 9 reusable components, optimistic mutation hook, Adminland About system reference) that all subsequent page waves depend on.

**Architecture:** Create shared primitives in `src/components/ui/` and `src/hooks/`, redesign Layout.jsx with warm theme, and expand the Adminland About section into a full design system + architecture reference. Every new component uses semantic color tokens, Framer Motion animations, and follows the <400 line rule.

**Tech Stack:** React 18, Tailwind CSS (HSL variables), Framer Motion 11, TanStack React Query 5, shadcn/ui, Lucide icons

---

## File Map

| Action | File | Lines | Responsibility |
|--------|------|-------|---------------|
| Modify | `src/Layout.jsx` | 537 | Warm theme: rounded dropdowns, pill nav, smoother transitions |
| Create | `src/components/ui/PageShell.jsx` | ~80 | Standard page wrapper: title, breadcrumb, actions, max-w-7xl |
| Create | `src/components/ui/InlineEdit.jsx` | ~90 | Click-to-edit text field with Enter/Escape/blur |
| Create | `src/components/ui/AnimatedList.jsx` | ~50 | Framer Motion staggered list wrapper |
| Create | `src/components/ui/DataTable.jsx` | ~250 | Sortable, filterable table with pagination + inline edit |
| Create | `src/components/ui/EmptyState.jsx` | ~40 | Consistent empty state: icon, message, CTA |
| Create | `src/components/ui/ConfirmDialog.jsx` | ~60 | Reusable confirmation modal |
| Create | `src/components/ui/StatusBadge.jsx` | ~50 | Unified status/priority badge |
| Create | `src/components/ui/QuickActions.jsx` | ~50 | Row-level action dropdown |
| Create | `src/hooks/useOptimisticMutation.js` | ~60 | React Query mutation with instant cache update + rollback |
| Modify | `src/pages/Adminland.jsx:4712-4813` | ~100 | Expand About section with design system + architecture ref |

---

### Task 1: Create PageShell Component

**Files:**
- Create: `src/components/ui/PageShell.jsx`

- [ ] **Step 1: Create the PageShell component**

```jsx
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PageShell({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
  className,
  maxWidth = 'max-w-7xl',
}) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className={cn(maxWidth, "mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8")}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {(title || actions) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              {title && <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>}
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PageShell.jsx
git commit -m "feat: add PageShell — standard page wrapper with title, breadcrumbs, actions"
```

---

### Task 2: Create InlineEdit Component

**Files:**
- Create: `src/components/ui/InlineEdit.jsx`

- [ ] **Step 1: Create the InlineEdit component**

```jsx
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Pencil } from 'lucide-react';

export default function InlineEdit({
  value,
  onSave,
  placeholder = 'Click to edit',
  className,
  inputClassName,
  as: Tag = 'span',
  multiline = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    const trimmed = draft?.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (editing) {
    const InputTag = multiline ? 'textarea' : 'input';
    return (
      <div className="flex items-center gap-1.5">
        <InputTag
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={cn(
            "bg-card border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
            multiline && "min-h-[60px] resize-y",
            inputClassName
          )}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <Tag
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-pointer group inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 hover:bg-muted/50 transition-colors",
        !value && "text-muted-foreground italic",
        className
      )}
      title="Click to edit"
    >
      {value || placeholder}
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Tag>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/InlineEdit.jsx
git commit -m "feat: add InlineEdit — click-to-edit with Enter/Escape/blur handling"
```

---

### Task 3: Create AnimatedList Component

**Files:**
- Create: `src/components/ui/AnimatedList.jsx`

- [ ] **Step 1: Create the AnimatedList component**

```jsx
import { motion, AnimatePresence } from 'framer-motion';

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.2, ease: 'easeOut' },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function AnimatedList({ items, keyExtractor, renderItem, className }) {
  return (
    <AnimatePresence mode="popLayout">
      <div className={className}>
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item)}
            custom={index}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/AnimatedList.jsx
git commit -m "feat: add AnimatedList — staggered Framer Motion list wrapper"
```

---

### Task 4: Create EmptyState Component

**Files:**
- Create: `src/components/ui/EmptyState.jsx`

- [ ] **Step 1: Create the EmptyState component**

```jsx
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-6 text-center",
      className
    )}>
      {Icon && (
        <div className="p-4 rounded-2xl bg-muted mb-4">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-[#0F2F44] hover:bg-[#1a4a6e] dark:bg-blue-600 dark:hover:bg-blue-700">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/EmptyState.jsx
git commit -m "feat: add EmptyState — consistent empty state with icon, message, CTA"
```

---

### Task 5: Create ConfirmDialog Component

**Files:**
- Create: `src/components/ui/ConfirmDialog.jsx`

- [ ] **Step 1: Create the ConfirmDialog component**

```jsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
}) {
  const variantClasses = {
    default: 'bg-[#0F2F44] hover:bg-[#1a4a6e] dark:bg-blue-600 dark:hover:bg-blue-700 text-white',
    destructive: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(variantClasses[variant])}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ConfirmDialog.jsx
git commit -m "feat: add ConfirmDialog — reusable confirmation modal with variants"
```

---

### Task 6: Create StatusBadge Component

**Files:**
- Create: `src/components/ui/StatusBadge.jsx`

- [ ] **Step 1: Create the StatusBadge component**

```jsx
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  // Task statuses
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  review: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  // Project statuses
  planning: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  deleted: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  // Part statuses
  needed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  ordered: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  ready_to_install: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  installed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  // Priority
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  // Generic
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function StatusBadge({ status, label, className }) {
  const displayLabel = label || status?.replace(/_/g, ' ');
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.todo;

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize",
      colorClass,
      className
    )}>
      {displayLabel}
    </span>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/StatusBadge.jsx
git commit -m "feat: add StatusBadge — unified status/priority badge with all statuses"
```

---

### Task 7: Create QuickActions Component

**Files:**
- Create: `src/components/ui/QuickActions.jsx`

- [ ] **Step 1: Create the QuickActions component**

```jsx
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function QuickActions({ actions, align = 'end' }) {
  if (!actions || actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48 rounded-xl">
        {actions.map((action, i) => {
          if (action.separator) {
            return <DropdownMenuSeparator key={`sep-${i}`} />;
          }
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                "cursor-pointer flex items-center gap-2 rounded-lg",
                action.destructive && "text-red-600 dark:text-red-400 focus:text-red-600"
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/QuickActions.jsx
git commit -m "feat: add QuickActions — row-level action dropdown menu"
```

---

### Task 8: Create useOptimisticMutation Hook

**Files:**
- Create: `src/hooks/useOptimisticMutation.js`

- [ ] **Step 1: Create the hook**

```jsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function useOptimisticMutation({
  mutationFn,
  queryKey,
  updateCache,
  successMessage,
  errorMessage = 'Something went wrong',
  onSuccess,
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      if (updateCache) {
        queryClient.setQueryData(queryKey, (old) => updateCache(old, variables));
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(errorMessage);
    },
    onSuccess: (data, variables) => {
      if (successMessage) {
        toast.success(typeof successMessage === 'function' ? successMessage(data, variables) : successMessage);
      }
      if (onSuccess) {
        onSuccess(data, variables);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useOptimisticMutation.js
git commit -m "feat: add useOptimisticMutation — instant cache update with rollback"
```

---

### Task 9: Create DataTable Component

**Files:**
- Create: `src/components/ui/DataTable.jsx`

- [ ] **Step 1: Create the DataTable component**

This is the largest shared component. It provides a sortable, filterable, paginated table with skeleton loading.

```jsx
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function SortIcon({ direction }) {
  if (direction === 'asc') return <ChevronUp className="w-3.5 h-3.5" />;
  if (direction === 'desc') return <ChevronDown className="w-3.5 h-3.5" />;
  return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
}

export default function DataTable({
  columns,
  data = [],
  loading = false,
  pageSize = 20,
  emptyState,
  onRowClick,
  rowClassName,
  stickyHeader = true,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(bVal)
        : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              {columns.map((col, j) => (
                <Skeleton key={j} className="h-4 flex-1 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return emptyState;
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-warm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={cn(
              "border-b bg-muted/30",
              stickyHeader && "sticky top-0 z-10"
            )}>
              {columns.map((col) => (
                <th
                  key={col.key || col.label}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={cn(
                    "px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    col.sortable && "cursor-pointer hover:text-foreground transition-colors select-none",
                    col.className
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon direction={sortKey === col.key ? sortDir : null} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((row, i) => (
              <motion.tr
                key={row.id || i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/50",
                  typeof rowClassName === 'function' ? rowClassName(row) : rowClassName
                )}
              >
                {columns.map((col) => (
                  <td key={col.key || col.label} className={cn("px-5 py-3 text-sm", col.cellClassName)}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {sorted.length} total &middot; Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/DataTable.jsx
git commit -m "feat: add DataTable — sortable, paginated table with skeleton loading"
```

---

### Task 10: Update Layout.jsx — Warm Theme

**Files:**
- Modify: `src/Layout.jsx`

- [ ] **Step 1: Update the dropdown menu styling**

In Layout.jsx, find all `<DropdownMenuContent` tags and add `className="rounded-xl"` if not present. There are approximately 3 instances (nav dropdowns, user menu, admin menu).

- [ ] **Step 2: Update nav active state to pill highlight**

Find the nav item active state classes (around line 242-248). Replace:

Old:
```jsx
isActive
  ? "text-white font-medium"
  : "text-white/70 hover:text-white hover:bg-white/5"
```

New:
```jsx
isActive
  ? "text-white font-medium bg-white/15 shadow-sm"
  : "text-white/70 hover:text-white hover:bg-white/5"
```

This adds a subtle pill background to the active nav item.

- [ ] **Step 3: Update the active indicator bar**

Find the active indicator (a bar below the active nav item, around line 256-262). If it exists as an absolute-positioned div, update it to use `rounded-full`. If it doesn't exist, add after the Link closing tag:

```jsx
{isActive && (
  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#74C7FF] rounded-full" />
)}
```

- [ ] **Step 4: Update mobile menu drawer to warm card style**

Find the mobile menu drawer (around line 391-472). Update the drawer background:
- `bg-white dark:bg-[#1e2a3a]` → `bg-card`
- Ensure menu items have `rounded-xl` and `hover:bg-muted` transitions

- [ ] **Step 5: Update the mobile bottom nav**

Find the mobile bottom nav (around line 496-519). Update:
- Active item color from hardcoded `text-[#74C7FF]` → keep as-is (it's the brand cyan)
- Add `transition-all duration-200` to nav item buttons
- Ensure rounded corners on the container: `rounded-t-2xl`

- [ ] **Step 6: Update notification popover styling**

Find the notification bell popover. Ensure `PopoverContent` has `className="rounded-xl"`.

- [ ] **Step 7: Update hardcoded colors to semantic tokens where possible**

Replace in Layout.jsx:
- `dark:bg-[#1e2a3a]` → `dark:bg-card` (all instances)
- `text-slate-500 dark:text-slate-400` → `text-muted-foreground`
- `text-slate-900 dark:text-slate-100` → `text-foreground`

Keep the header gradient `from-[#0F2F44] to-[#133F5C]` as-is — it's the brand header.

- [ ] **Step 8: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 9: Commit**

```bash
git add src/Layout.jsx
git commit -m "feat: Layout warm theme — pill nav, rounded dropdowns, semantic tokens"
```

---

### Task 11: Expand Adminland About Section — Design System + Architecture Reference

**Files:**
- Modify: `src/pages/Adminland.jsx:4712-4813`

- [ ] **Step 1: Add Design System Reference card after the existing System Info card**

In the AboutSection function, after the System Info card closing `</div>` (around line 4773) and before the Release History card, add a new Design System Reference card:

```jsx
      {/* Design System Reference */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b dark:border-border">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#0069AF]" />
            Design System
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Colors, typography, spacing, and component patterns
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Colors */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Brand Colors</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Primary', hex: '#0F2F44', css: '--primary', swatch: 'bg-[#0F2F44]' },
                { name: 'Secondary', hex: '#133F5C', css: '--secondary', swatch: 'bg-[#133F5C]' },
                { name: 'Accent', hex: '#0069AF', css: '--accent / --ring', swatch: 'bg-[#0069AF]' },
                { name: 'Highlight', hex: '#74C7FF', css: '--highlight', swatch: 'bg-[#74C7FF]' },
              ].map((c) => (
                <div key={c.name} className="flex items-center gap-3 p-2 rounded-xl border bg-card">
                  <div className={`w-8 h-8 rounded-lg ${c.swatch} flex-shrink-0`} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{c.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{c.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Status Colors */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Status Colors</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { status: 'todo', color: 'bg-slate-100 text-slate-700' },
                { status: 'in_progress', color: 'bg-blue-100 text-blue-700' },
                { status: 'review', color: 'bg-violet-100 text-violet-700' },
                { status: 'completed', color: 'bg-emerald-100 text-emerald-700' },
                { status: 'on_hold', color: 'bg-amber-100 text-amber-700' },
                { status: 'needed', color: 'bg-orange-100 text-orange-700' },
                { status: 'ordered', color: 'bg-sky-100 text-sky-700' },
                { status: 'critical', color: 'bg-red-100 text-red-700' },
              ].map((s) => (
                <span key={s.status} className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${s.color}`}>
                  {s.status.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
          {/* Typography */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Typography</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Font:</span> <span className="font-semibold">Poppins</span> (300-700)</p>
              <p><span className="text-muted-foreground">Page Title:</span> <span className="text-2xl font-bold">text-2xl font-bold</span></p>
              <p><span className="text-muted-foreground">Section Header:</span> <span className="text-lg font-semibold">text-lg font-semibold</span></p>
              <p><span className="text-muted-foreground">Body:</span> <span className="text-sm">text-sm (14px)</span></p>
              <p><span className="text-muted-foreground">Caption:</span> <span className="text-xs text-muted-foreground">text-xs text-muted-foreground</span></p>
            </div>
          </div>
          {/* Spacing & Radius */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Spacing & Radius</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Card radius:</span> <span className="font-mono">rounded-2xl</span> (1rem / 16px)</p>
              <p><span className="text-muted-foreground">Button radius:</span> <span className="font-mono">rounded-lg</span> (0.5rem)</p>
              <p><span className="text-muted-foreground">Badge radius:</span> <span className="font-mono">rounded-md</span> (0.375rem)</p>
              <p><span className="text-muted-foreground">Section gap:</span> <span className="font-mono">gap-6</span> (1.5rem)</p>
              <p><span className="text-muted-foreground">Card padding:</span> <span className="font-mono">p-5</span> (1.25rem)</p>
              <p><span className="text-muted-foreground">Page max-width:</span> <span className="font-mono">max-w-7xl</span> (80rem)</p>
            </div>
          </div>
          {/* Component Patterns */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Shared Components</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                { name: 'PageShell', desc: 'Page wrapper with title, breadcrumbs, actions' },
                { name: 'InlineEdit', desc: 'Click-to-edit with Enter/Escape/blur' },
                { name: 'AnimatedList', desc: 'Framer Motion staggered list' },
                { name: 'DataTable', desc: 'Sortable, filterable, paginated table' },
                { name: 'EmptyState', desc: 'Empty state with icon, message, CTA' },
                { name: 'ConfirmDialog', desc: 'Reusable confirmation modal' },
                { name: 'StatusBadge', desc: 'Unified status/priority badge' },
                { name: 'QuickActions', desc: 'Row-level action dropdown' },
                { name: 'CollapsibleSection', desc: 'Collapsible with localStorage state' },
              ].map((comp) => (
                <div key={comp.name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  <code className="text-xs font-mono text-[#0069AF] whitespace-nowrap">{comp.name}</code>
                  <span className="text-xs text-muted-foreground">{comp.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b dark:border-border">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Server className="w-5 h-5 text-[#0069AF]" />
            Architecture
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tech stack, file structure, and data flow
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Tech Stack */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Tech Stack</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {[
                { category: 'Frontend', items: 'React 18, Vite 6' },
                { category: 'Styling', items: 'Tailwind CSS, shadcn/ui' },
                { category: 'State', items: 'TanStack React Query 5' },
                { category: 'Animations', items: 'Framer Motion 11' },
                { category: 'Icons', items: 'Lucide React' },
                { category: 'Backend', items: 'Supabase (Auth + DB)' },
                { category: 'Hosting', items: 'Railway' },
                { category: 'Routing', items: 'React Router 6' },
                { category: 'Charts', items: 'Recharts' },
              ].map((t) => (
                <div key={t.category} className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs font-semibold text-foreground">{t.category}</p>
                  <p className="text-xs text-muted-foreground">{t.items}</p>
                </div>
              ))}
            </div>
          </div>
          {/* File Structure */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">File Structure</h3>
            <pre className="text-xs font-mono text-muted-foreground bg-muted/50 p-4 rounded-xl overflow-x-auto">
{`src/
  api/          API client (Supabase + REST)
  components/
    ui/         Shared UI primitives (shadcn/ui + custom)
    dashboard/  Dashboard-specific components
    project/    Project page components
    modals/     Modal dialogs
    ...         Domain-grouped components
  hooks/        Custom React hooks
  pages/        Route-level page components (42 pages)
  utils/        Utility functions
  lib/          Library config (cn, etc.)`}
            </pre>
          </div>
          {/* Data Flow */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Data Flow</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>1. Pages fetch data via <code className="text-xs font-mono bg-muted px-1 rounded">useQuery</code> hooks from TanStack React Query</p>
              <p>2. API calls go through <code className="text-xs font-mono bg-muted px-1 rounded">api.entities.EntityName.method()</code></p>
              <p>3. Mutations use <code className="text-xs font-mono bg-muted px-1 rounded">useOptimisticMutation</code> for instant UI + rollback</p>
              <p>4. Auth tokens managed by Supabase client (JWT in session)</p>
              <p>5. Query staleTime: 30s (fast-changing) / 5min (slow-changing)</p>
            </div>
          </div>
          {/* API Pattern */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">API Pattern</h3>
            <pre className="text-xs font-mono text-muted-foreground bg-muted/50 p-4 rounded-xl overflow-x-auto">
{`// Fetch all
api.entities.Project.list('-created_date')

// Filter
api.entities.Task.filter({ project_id: id })

// Create
api.entities.Project.create({ name, client })

// Update
api.entities.Project.update(id, { status: 'completed' })

// Delete
api.entities.Project.delete(id)

// Cloud functions
api.functions.invoke('functionName', { params })`}
            </pre>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: Add missing icon imports**

At the top of Adminland.jsx, add to the lucide-react import:
```jsx
import { Palette, Server } from 'lucide-react';
```

Verify `Palette` and `Server` are not already imported. If they are, skip.

- [ ] **Step 3: Update existing System Info card to use semantic tokens**

In the existing System Info card, replace:
- `bg-white dark:bg-[#1e2a3a]` → `bg-white dark:bg-card`
- `text-slate-900 dark:text-slate-100` → `text-foreground`
- `text-slate-500 dark:text-slate-400` → `text-muted-foreground`
- `dark:border-slate-700/50` → `dark:border-border`
- `dark:bg-slate-800` → `dark:bg-muted`

Do the same for the Release History card.

- [ ] **Step 4: Verify build**

Run: `cd /Users/anielreyes/projectit && npx vite build 2>&1; echo "EXIT: $?"`
Expected: EXIT: 0

- [ ] **Step 5: Commit**

```bash
git add src/pages/Adminland.jsx
git commit -m "feat: expand Adminland About — design system reference + architecture docs"
```

---

### Task 12: Deploy to Staging

- [ ] **Step 1: Push to staging**

```bash
git checkout staging
git merge main --no-edit
git push origin staging
git checkout main
```

If merge conflict occurs, resolve by taking main's version (our changes).

- [ ] **Step 2: Notify user to review staging**

Report: "Phase 1 Foundation deployed to staging. Review the following:
1. Layout — pill nav active state, rounded dropdowns
2. Dashboard — shared components in use
3. Adminland → About & System — design system + architecture reference
4. Mobile — verify nothing broke"

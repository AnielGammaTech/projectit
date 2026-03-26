# ProjectIT Full System Redesign

**Date:** 2026-03-26
**Approach:** Foundation First (Phase 1 + 6 Waves)
**Deployment:** staging → user approval → production (every wave)

## Problem

42 pages with inconsistent visual design, large monolithic files (Adminland: 4,813 lines), hardcoded brand colors, no shared interactive primitives, and missing modern UX patterns (inline editing, animations, optimistic updates).

## Design Principles

### Visual
- Warm rounded cards (rounded-2xl), soft shadows (shadow-warm), semantic color tokens
- Brand navy (#0F2F44, #0069AF) — NOT indigo
- All pages use PageShell wrapper for consistent max-w-7xl, padding, breadcrumbs
- Skeleton loaders on every data-fetching view
- Dark mode maintained throughout

### Interactive
- Inline editing (click any field to edit, Enter/Escape/blur)
- Framer Motion animations (list enter/exit, page transitions, hover effects)
- Optimistic mutations (instant UI update, rollback on error)
- Toast feedback on every action
- Drag-drop where it makes sense

### Code Quality
- Files under 400 lines (800 absolute max)
- No dead code, no unused imports
- No hardcoded brand colors (semantic tokens only)
- React.memo on expensive list-item components
- Standardized query staleTime (30s fast / 5min slow)
- Shared components over per-page duplication

## Phase 1: Foundation

### Layout.jsx Redesign
- Header: keep dark navy gradient, warm rounded dropdowns, smoother transitions
- Nav: active state pill highlight, gentle slide animations
- Mobile: bottom nav stays, drawer gets warm card treatment
- Global search modal: rounded-2xl, shadow-warm

### New Shared Components

| Component | File | Purpose |
|-----------|------|---------|
| InlineEdit | `src/components/ui/InlineEdit.jsx` | Click-to-edit with Enter/Escape/blur |
| AnimatedList | `src/components/ui/AnimatedList.jsx` | Framer Motion staggered list |
| PageShell | `src/components/ui/PageShell.jsx` | Page wrapper: title, breadcrumb, actions, max-w-7xl |
| DataTable | `src/components/ui/DataTable.jsx` | Sortable, filterable, inline-editable table |
| EmptyState | `src/components/ui/EmptyState.jsx` | Icon + message + CTA |
| ConfirmDialog | `src/components/ui/ConfirmDialog.jsx` | Reusable confirmation (replaces per-page AlertDialogs) |
| StatusBadge | `src/components/ui/StatusBadge.jsx` | Unified status/priority badge |
| QuickActions | `src/components/ui/QuickActions.jsx` | Row-level action dropdown |
| SkeletonPage | `src/components/ui/SkeletonPage.jsx` | Full-page skeleton loader |

### Optimistic Mutation Hook
- `src/hooks/useOptimisticMutation.js` — wraps React Query useMutation with instant cache update + rollback

### Adminland About Section
- Design system reference (colors, typography, spacing, component catalog)
- Architecture overview (tech stack, file structure, data flow, API patterns)
- Living changelog (version history with categorized changes)

## Wave 1: Core Nav Pages
AllTasks (1,105 lines), Customers (1,328 lines), Stock (117 lines), Reports (550 lines)

## Wave 2: Project Pages
ProjectDetail (2,070), ProjectTasks (1,502), ProjectParts (1,138), ProjectFiles (571), ProjectNotes (327), ProjectTime (346), ProjectTimeline (228), ProjectBilling (20)

## Wave 3: Admin Pages
Adminland (4,813 → split into ~15 modules), Templates (521), TemplateEditor (977), Workflows (675), RolesPermissions (601), ProjectStatuses (375), UserGroups (318)

## Wave 4: User Pages
Profile (515), Settings (449), SecuritySettings (458), NotificationSettings (422), MyAssignments (397), MySchedule (297), MyNotifications (212)

## Wave 5: Secondary Pages
ActivityFeed (380), QuoteRequests (332), WeeklyMeetingUpdate (406), ChangeOrderEditor (382), FeedbackManagement (856), ReportBuilder (602), AuditLogs (427)

## Wave 6: Auth + TV Dashboards
Login (357), Register (126), AcceptInvite (299), ManagerDashboard (347), TechDashboard (295), Home (9)

## Post-Redesign Phases
1. Security pen test (network, app, API)
2. Telegram bot for Claude Code remote control
3. Full auto-pilot mode (Ralph + scheduled agents)

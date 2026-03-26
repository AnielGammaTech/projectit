# ProjectIT Dashboard Redesign

**Date:** 2026-03-26
**Approach:** Progressive Enhancement (Phase 1: IA + Visual + Perf, Phase 2: Architecture)

## Problem

The current dashboard has poor information architecture. Users can't quickly find what matters — too much noise, no clear hierarchy. The 1,863-line Dashboard.jsx fetches all data unfiltered and presents everything at equal weight.

## Design Decisions

### Information Architecture

**Top zone (always visible, no scroll):**
1. Greeting + New Project CTA
2. KPI stat cards: Active Projects, Pending Parts, Overdue Tasks, Completed Tasks
3. Incoming Quotes section (QuoteIT proposals with accept/dismiss)
4. Projects Needing Attention (overdue, blocked, at risk)

**Below fold (collapsible widgets, state persisted to localStorage):**
- My Tasks
- Recent Activity
- AI Summary
- Project List (existing cards/list view with search, filters, pinning, bulk actions)

**Removed from top zone:**
- "While you were away" notification banner (folded into Activity widget)
- DashboardWidgets drag-and-drop customization panel
- Dashboard views save/load

### Visual Design — Warm & Approachable (App-wide)

Applied globally via shared design tokens and base components:

- **Background:** slate-50 (#f8fafc)
- **Cards:** White, rounded-2xl, shadow-sm, no hard borders
- **Primary accent:** indigo-500
- **Status colors:** Soft pastel backgrounds with saturated text (amber-50/700, red-50/700, emerald-50/700)
- **Text:** slate-800 primary, slate-500 secondary
- **Card hover:** shadow-md transition + scale-[1.01]
- **KPI cards:** Soft gradient left border in accent color
- **Spacing:** gap-6 between sections, p-5 card padding, max-w-7xl container
- **Typography:** 2xl greeting, 3xl KPI numbers, lg section headers, relaxed line height
- **Dark mode:** Maintained — slate-800 cards, slate-900 background, dark:bg-X-900/20 pastels

**Global changes (not dashboard-only):**
- Update tailwind.config and CSS variables for border-radius, colors, spacing
- Update /components/ui/ (card, button, badge) once — every page inherits
- Only touch individual pages if they have hardcoded styles that fight new tokens

### Performance (Phase 1)

- Add server-side filtering to queries (active projects only, tasks for active projects, parts with needed/ordered status)
- Standardize staleTime to 2 tiers: 30s (fast-changing) and 5min (slow-changing)
- Lazy-load collapsible widgets (don't fetch data until expanded)
- Memoize ProjectCard and MyTasksCard
- Remove DashboardWidgets drag-and-drop system (623 lines)

### Architecture Cleanup (Phase 2)

Split Dashboard.jsx into:
- Dashboard.jsx (~150 lines, thin orchestrator)
- DashboardGreeting.jsx
- DashboardKPIs.jsx
- QuoteInbox.jsx
- ProjectHealthGrid.jsx
- CollapsibleSection.jsx (reusable wrapper)

Remove dead code:
- DashboardWidgets.jsx (623 lines, replaced by fixed layout)
- Dashboard views save/load system
- RecentActivity.jsx (duplicates ActivityTimeline.jsx)
- UpcomingReminders.jsx (empty file)

Delete test data:
- Test Quote, E2E Test Network Upgrade, E2E Test v2 Firewall Install

## Summary

| | Phase 1 | Phase 2 |
|---|---|---|
| IA | Reorganize: KPIs > Quotes > Health > Collapsible widgets | — |
| Visual | Global warm theme across entire app | — |
| Perf | Filtered queries, lazy-load, memoization | — |
| Architecture | — | Split Dashboard.jsx, co-locate queries, remove dead code |

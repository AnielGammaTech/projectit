import { Skeleton } from '@/components/ui/skeleton';

// ─── 1. DashboardSkeleton ───────────────────────────────────────────
// For: Dashboard, ManagerDashboard, TechDashboard
export function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects area - left 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-48 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] overflow-hidden">
                <Skeleton className="h-1.5 w-full" />
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - right col */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] p-5 space-y-4">
            <Skeleton className="h-5 w-28" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 2. TablePageSkeleton ───────────────────────────────────────────
// For: AllTasks, AuditLogs, Inventory
export function TablePageSkeleton() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>

      {/* Filter/search bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 flex-1 max-w-sm rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {/* Table rows */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-700/50">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
        </div>
        {/* Table body */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
            <Skeleton className="h-4" style={{ width: `${20 + (i % 3) * 8}%` }} />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. ProjectDetailSkeleton ───────────────────────────────────────
// For: ProjectDetail
export function ProjectDetailSkeleton() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Back button */}
      <Skeleton className="h-9 w-32 rounded-lg" />

      {/* Header card */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-32 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
        {/* Meta row */}
        <div className="flex items-center gap-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <div className="flex -space-x-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-full border-2 border-white dark:border-slate-800" />
            ))}
          </div>
        </div>
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
      </div>

      {/* Tool cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_240px] gap-4">
        {/* 4 tool cards */}
        {[
          { color: 'bg-blue-500/20' },
          { color: 'bg-emerald-500/20' },
          { color: 'bg-violet-500/20' },
          { color: 'bg-amber-500/20' },
        ].map((card, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] overflow-hidden min-h-[220px]">
            <div className={`h-1 ${card.color}`} />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center gap-2 py-1">
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                  <Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${60 + (j % 3) * 15}%` }} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Sidebar card spanning rows */}
        <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2 rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] p-4 space-y-4">
          <Skeleton className="h-5 w-32" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 4. ProjectSubpageSkeleton ──────────────────────────────────────
// For: ProjectFiles, ProjectNotes, ProjectTime, ProjectTimeline, ProjectStatuses
export function ProjectSubpageSkeleton() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Content area */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] p-5 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4" style={{ width: `${40 + (i % 4) * 12}%` }} />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 5. CardGridSkeleton ────────────────────────────────────────────
// For: Customers, MyAssignments, Team, Templates, QuoteRequests, FeedbackManagement, MyNotifications
export function CardGridSkeleton() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 w-full max-w-sm rounded-xl" />

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 6. FormPageSkeleton ────────────────────────────────────────────
// For: NotificationSettings, RolesPermissions, Settings, ChangeOrderEditor
export function FormPageSkeleton() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>

      {/* Form content */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] p-6 space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── 7. CalendarSkeleton ────────────────────────────────────────────
// For: MySchedule
export function CalendarSkeleton() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-[#1e2a3a] overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center">
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
        </div>
        {/* Calendar cells - 5 weeks */}
        {[...Array(5)].map((_, week) => (
          <div key={week} className="grid grid-cols-7 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
            {[...Array(7)].map((_, day) => (
              <div key={day} className="p-2 min-h-[80px] border-r border-slate-50 dark:border-slate-800/50 last:border-0">
                <Skeleton className="h-5 w-5 rounded-full mb-1" />
                {(week * 7 + day) % 3 === 0 && (
                  <Skeleton className="h-4 w-full rounded mt-1" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

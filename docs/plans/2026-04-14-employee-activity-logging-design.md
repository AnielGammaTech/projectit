# Employee Activity Logging System — Design

**Date:** 2026-04-14
**Status:** Approved
**Approach:** Server-side middleware (Option A)

## Requirements

- Track all meaningful employee actions: logins, page navigations, all CRUD operations
- Timeline feed per employee in the admin panel
- Invisible to employees, admin-only
- Enhance existing Audit Logs page in Adminland
- 90-day rolling retention
- Tamper-proof: server-side logging, cannot be bypassed from frontend

## Architecture

All logging happens in Express middleware on the server. Every authenticated request to `/api/entities/*` that mutates data (POST, PUT, DELETE) is automatically intercepted and logged. Page navigations use a new `/api/activity/page-view` endpoint called from the existing (currently broken) `NavigationTracker.jsx`. Login/logout events are logged in the auth service.

Everything writes to the existing `AuditLog` table.

## What Gets Logged

| Category | Events | How |
|----------|--------|-----|
| Auth | Login, logout, failed login, MFA challenge | Auth service hooks |
| Navigation | Every page view with page name + project context | Fixed NavigationTracker -> new endpoint |
| Projects | Create, update, delete, archive, complete, on-hold | Server middleware (auto) |
| Tasks | Create, update, delete, complete, status change | Server middleware (auto) |
| Parts | Create, update, delete, order, receive, install | Server middleware (auto) |
| Notes | Create, update, delete | Server middleware (auto) |
| Files | Upload, delete, folder create/delete | Server middleware (auto) |
| Time | Time entries created, edited, deleted | Server middleware (auto) |
| Settings | Any admin setting change | Server middleware (auto) |

## Log Entry Schema

```js
{
  user_email: "tech@gamma.com",
  user_name: "Danny Acosta",
  action: "task_updated",
  category: "task",
  entity_type: "Task",
  entity_id: "uuid-here",
  entity_name: "Install: Unifi U7 Pro",
  project_id: "uuid",
  project_name: "NRHOA - IT Project",
  details: { field: "status", from: "todo", to: "in_progress" },
  ip_address: "192.168.1.50",
  user_agent: "Chrome/126 macOS",
  timestamp: "2026-04-14T09:15:32Z"
}
```

## Server Middleware Flow

1. Request arrives: `PUT /api/entities/Task/uuid-123`
2. Auth middleware identifies user
3. Audit middleware reads "before" state from DB
4. Entity service executes the mutation
5. Audit middleware diffs before/after, writes AuditLog entry async
6. Response sent to client (logging is fire-and-forget)

## Page View Endpoint

```
POST /api/activity/page-view
Body: { page: "ProjectDetail", projectId: "uuid", projectName: "NRHOA..." }
```

Existing `NavigationTracker.jsx` already fires on every route change — point it at this endpoint.

## Enhanced Audit Logs Page

- Employee picker dropdown
- Date range filter (today, yesterday, 7d, 30d, custom)
- Category filter (auth, navigation, project, task, part, notes, files, time, settings)
- Timeline feed: timestamp, color-coded action icon, description, expandable change details
- Activity summary bar: first login, last activity, total actions, most active project
- 90-day retention via server cron job

## Files to Create/Modify

### Server (create)
- `server/src/middleware/auditMiddleware.js` — Express middleware for auto-logging mutations
- `server/src/routes/activityRoutes.js` — `/api/activity/page-view` endpoint
- `server/src/jobs/auditRetention.js` — 90-day purge cron job

### Server (modify)
- `server/src/index.js` — mount middleware and routes
- `server/src/services/authService.js` — add login/logout audit logging

### Frontend (create)
- `src/pages/AuditLogs.jsx` — rebuild with timeline feed, filters, employee picker

### Frontend (modify)
- `src/lib/NavigationTracker.jsx` — fix to call real endpoint
- `src/api/apiClient.js` — add `api.activity.pageView()` method

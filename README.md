# ProjectIT

A full-stack project management and operations platform built for service-based businesses. ProjectIT integrates with external systems (HaloPSA, QuickBooks, QuoteIT), features AI-powered capabilities via Claude, and provides comprehensive tools for project tracking, time management, proposals, inventory, and team collaboration.

---

## Tech Stack

### Frontend
- **React 18** with **Vite 6** for fast builds and HMR
- **Tailwind CSS 3** + **shadcn/ui** (Radix UI primitives) for styling
- **React Router 6** for client-side routing
- **React Query** (@tanstack/react-query) for server state and caching
- **React Hook Form** + **Zod** for form management and validation
- **Framer Motion** for animations and transitions
- **Recharts** for charts and analytics
- **@hello-pangea/dnd** for drag-and-drop task boards
- **Lucide React** for icons
- **Supabase JS** for authentication and file storage

### Backend
- **Node.js** with **Express 4** (ES modules)
- **PostgreSQL** with JSONB entity storage
- **Supabase** for auth (including MFA/TOTP), storage, and real-time
- **Anthropic Claude SDK** for AI features
- **Resend** for transactional email
- **Helmet** + **CORS** + **Morgan** for security and logging

### Infrastructure
- **Railway** for deployment (auto-deploy from GitHub)
- **Supabase** for managed Postgres, Auth, and file storage
- Build-time version injection via Vite `define` (git hash, timestamp, env)

---

## Features

### Project Management
- Project dashboard with stats cards, activity timeline, and widgets
- Task boards with drag-and-drop, grouping, filtering, and priorities
- Subtasks, comments, and team collaboration per task
- Project timeline (Gantt chart view) and milestones
- Project files with folder organization and Supabase Storage
- Project notes and documentation
- Parts/materials tracking with supplier info
- Configurable project statuses and templates

### Time Tracking
- Time entry logging per task and project
- Budget tracking and billing integration
- Weekly time views and team summaries
- Time report analytics with export

### Proposals & Quotes
- Proposal creation with line items and templates
- AI-powered proposal generation via Claude
- Version history and status tracking
- Proposal view/download analytics
- Change order management
- Integration with QuoteIT for quote syncing

### Inventory & Stock
- Product, service, and bundle management
- QR code generation and scanning
- Stock levels, alerts, and supplier tracking
- AI-powered parts list parsing from documents

### Customers
- Contact and company management
- Communication history logs
- Bulk CSV import
- Customer linking to projects

### Reporting & Analytics
- Overview, revenue, task, and inventory reports
- Custom report builder
- Multiple chart types (bar, pie, area)
- Data export

### AI Features (Claude)
- Document analysis (invoices, quotes, parts lists)
- Project summary generation
- Meeting note parsing
- Proposal content generation
- List parsing and data extraction
- Image analysis support

### Automation
- Workflow engine with configurable triggers and actions
- Triggers: project status change, proposal accepted, task completed, task overdue, part received
- Actions: send email, create task, update status, assign user
- AI workflow suggestions

### Team & Collaboration
- Team member profiles with role assignments
- Custom roles and permissions (RBAC)
- User groups
- Real-time notification system with email alerts
- Activity feeds per project
- @mentions in comments

### Security
- Multi-factor authentication (TOTP) via Supabase MFA
- Backup codes for account recovery
- 7-day MFA enforcement for new users with email reminders
- New device/IP login alerts
- Audit logging of all actions
- Role-based access control with custom roles
- Admin MFA reset capability

### Administration
- Adminland dashboard for system management
- User invite flow with branded welcome emails
- Password and MFA reset by admins
- Integration settings (HaloPSA, QuickBooks, QuoteIT)
- About & System section with version, build info, and environment
- "What's New" changelog popup on version updates

---

## Project Structure

```
projectit/
├── src/                          # Frontend source
│   ├── pages/                    # Page components (38 pages)
│   ├── components/               # Reusable components
│   │   ├── ui/                   # shadcn/ui primitives (50+ components)
│   │   ├── dashboard/            # Dashboard widgets
│   │   ├── modals/               # Modal dialogs
│   │   ├── project/              # Project-specific components
│   │   ├── proposals/            # Proposal components
│   │   ├── workflows/            # Workflow automation UI
│   │   ├── tasks/                # Task management
│   │   └── ...
│   ├── api/                      # API client with dynamic entity proxy
│   ├── lib/                      # Auth context, Supabase client, theme, utils
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   ├── Layout.jsx                # Main app layout with sidebar navigation
│   ├── App.jsx                   # Root component with routing
│   ├── pages.config.js           # Page registration
│   ├── version.js                # Build-time version constants
│   └── changelog.js              # Structured changelog data
├── server/                       # Backend source
│   ├── src/
│   │   ├── index.js              # Express server setup
│   │   ├── routes/
│   │   │   ├── auth.js           # Auth endpoints (login, invite, MFA reset)
│   │   │   ├── entities.js       # Generic entity CRUD
│   │   │   ├── integrations.js   # LLM, email, SMS endpoints
│   │   │   ├── webhooks.js       # Webhook receivers
│   │   │   └── functions/        # 31 integration functions
│   │   │       ├── claudeAI.js
│   │   │       ├── haloPSASync.js
│   │   │       ├── quickbooksSync.js
│   │   │       ├── sendDueReminders.js
│   │   │       ├── sendMfaReminders.js
│   │   │       ├── executeWorkflow.js
│   │   │       └── ...
│   │   ├── services/             # Business logic
│   │   │   ├── authService.js    # Auth, invites, MFA, device alerts
│   │   │   ├── entityService.js  # Generic JSONB entity CRUD
│   │   │   ├── emailService.js   # Resend email wrapper
│   │   │   └── ...
│   │   ├── middleware/           # Auth, error handling, access control
│   │   ├── config/              # Database and Supabase config
│   │   └── db/migrations/       # SQL migration files
│   └── package.json
├── public/                       # Static assets (favicon, icons)
├── vite.config.js                # Vite build config with version injection
├── tailwind.config.js            # Tailwind theme and safelist
├── package.json                  # Frontend dependencies
└── README.md
```

---

## Getting Started

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** database (or Supabase project)
- **Supabase** project for Auth and Storage
- **Resend** account for transactional email

### Environment Variables

**Frontend** (`.env` or `.env.local` in project root):
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend** (`.env` in `/server`):
```env
# Server
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
ANTHROPIC_API_KEY=your-claude-api-key

# Email
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# HaloPSA (optional)
HALOPSA_CLIENT_ID=
HALOPSA_CLIENT_SECRET=
HALOPSA_TENANT=
HALOPSA_AUTH_URL=
HALOPSA_API_URL=

# QuickBooks (optional)
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
```

### Installation

```bash
# Clone the repository
git clone https://github.com/AnielGammaTech/projectit.git
cd projectit

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Database Setup

```bash
# Run migrations (from the server directory)
cd server
npm run migrate
```

This creates the `users` table and 45 entity tables with JSONB storage and GIN indexes.

### Development

```bash
# Terminal 1 — Start the backend
cd server
npm run dev

# Terminal 2 — Start the frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

### Build

```bash
npm run build
```

The build injects version metadata (git hash, timestamp, environment) into the frontend bundle via Vite's `define` config.

---

## Database Architecture

ProjectIT uses a **JSONB entity pattern** where all business data is stored in dedicated tables with a flexible JSON `data` column:

```sql
CREATE TABLE "EntityName" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data JSONB NOT NULL DEFAULT '{}',
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);
CREATE INDEX ON "EntityName" USING GIN (data);
```

**45 Entity Tables**: AppSettings, AuditLog, ChangeOrder, CommunicationLog, Customer, CustomRole, DashboardView, EmailTemplate, Feedback, FileFolder, IncomingQuote, IntegrationSettings, InventoryBundle, InventoryItem, MeetingUpdate, Note, Notification, NotificationPreference, Part, PartBundle, Project, ProjectFile, ProjectNotes, ProjectPart, ProjectStatus, Proposal, ProposalLineItem, ProposalTemplate, QuoteRequest, QuoteRequestLineItem, Reminder, Task, TaskComment, TaskGroup, TaskTemplate, TeamMember, TimeEntry, UserBackupCode, UserDeviceAlert, UserGroup, UserGroupMember, UserNotification, UserSecuritySettings, Workflow, WorkflowAction

The `entityService` provides a unified CRUD interface for all entity types:
```js
entityService.create('Task', { title: 'My Task', status: 'open' }, userId);
entityService.filter('Task', { status: 'open' }, '-created_date', 50);
entityService.update('Task', id, { status: 'completed' });
entityService.delete('Task', id);
```

The frontend API client uses a JavaScript `Proxy` to dynamically handle any entity:
```js
api.entities.Task.list();
api.entities.Task.filter({ status: 'open' });
api.entities.Task.create({ title: 'My Task' });
api.entities.Task.update(id, { status: 'completed' });
api.entities.Task.delete(id);
```

---

## Authentication

Authentication is handled by **Supabase Auth** with the following flow:

1. **Admin invites user** via Adminland — creates Supabase Auth user + local DB record + sends branded welcome email
2. **User accepts invite** — verifies email via OTP, sets password
3. **Login** — `signInWithPassword()` → MFA check → app access
4. **MFA (optional/enforced)** — TOTP via authenticator app, with backup codes
5. **Session management** — Supabase handles token refresh; AuthContext validates AAL level

### MFA Enforcement
- New users get a **7-day deadline** to set up MFA
- **Soft warning**: amber banner showing days remaining
- **Hard block**: after deadline, user is locked out until MFA is configured
- **Email reminders** sent at 2 days and 1 day before deadline
- Admins can reset a user's MFA from Adminland

---

## Integrations

### HaloPSA
Bi-directional sync of projects, tasks, customers, and tickets. Supports webhook-driven updates.

### QuickBooks
Invoice and financial data synchronization via OAuth.

### QuoteIT
Quote pulling, syncing, and status updates with project linking.

### Claude AI
Document analysis, proposal generation, meeting note parsing, and parts list extraction powered by Anthropic's Claude.

### Resend
Transactional email for invites, MFA reminders, device alerts, due date reminders, and notifications.

---

## Deployment

ProjectIT is deployed on **Railway** with auto-deploy from GitHub branches:

- **Production**: deploys from `main` branch
- **Staging**: deploys from `staging` branch

### Railway Services
- **Frontend**: Vite-built SPA served as static files
- **Backend**: Express.js Node.js service
- **Database**: PostgreSQL (via Supabase or Railway Postgres)

### Cron Functions
The following endpoints can be called on a schedule (e.g., Railway Cron, external cron service):

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `POST /api/functions/sendDueReminders` | Daily | Sends task due date reminders |
| `POST /api/functions/sendMfaReminders` | Daily | Sends MFA setup deadline reminders |

---

## Scripts

### Frontend
```bash
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run lint:fix   # Auto-fix lint issues
npm run preview    # Preview production build
```

### Backend
```bash
npm start          # Start production server
npm run dev        # Start with --watch (auto-restart)
npm run migrate    # Run database migrations
```

---

## License

Proprietary. All rights reserved by Gamma Tech.

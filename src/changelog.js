/**
 * Changelog entries — newest first.
 * Add a new entry at the top when shipping a release.
 * The `version` field MUST match package.json version for the popup to work.
 */
export const changelog = [
  {
    version: '1.3.0',
    date: '2026-03-10',
    title: 'Task Management Overhaul & Overdue Reminders',
    highlights: [
      'Monday.com-style task table on All Tasks page',
      'Automatic overdue email reminders every 4 hours',
      'Redesigned project templates as full project-like pages',
      'My Overdue & Overdue filter tabs',
    ],
    changes: [
      { type: 'feature', text: 'All Tasks redesigned as a flat table with collapsible project groups, inline status/priority/assignee/due columns' },
      { type: 'feature', text: 'Complete tasks directly from the All Tasks table with one click' },
      { type: 'feature', text: 'My Overdue tab filters your own overdue and due-today tasks' },
      { type: 'feature', text: 'Overdue tab shows all overdue and due-today tasks across projects' },
      { type: 'feature', text: 'Automatic overdue email reminders every 4 hours with deduplication' },
      { type: 'feature', text: 'Templates redesigned as full pages mirroring real projects with task groups, messages, and parts sub-views' },
      { type: 'feature', text: 'Template task groups with color coding and inline creation' },
      { type: 'feature', text: 'Template messages with type selection (note/message/update)' },
      { type: 'fix', text: 'Due Soon tab was empty — filter now correctly shows tasks with due dates' },
      { type: 'fix', text: 'Due Dates card on project detail constrained to match sibling card heights' },
      { type: 'improvement', text: 'Renamed Due Soon to Overdue for clarity' },
      { type: 'improvement', text: 'Completed tasks section in All Tasks now shows project name and assignee' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-02',
    title: 'Inventory & Tool Management',
    highlights: [
      'Take, Restock & Checkout actions for inventory items',
      'Tools tab with checkout/return tracking',
      'Inventory settings in Adminland with stock locations & notifications',
      'Skeleton loading states across all pages',
    ],
    changes: [
      { type: 'feature', text: 'Take/Restock buttons for products with quantity, project & notes' },
      { type: 'feature', text: 'Checkout/Return actions for tools with transaction history' },
      { type: 'feature', text: 'New Tools tab in Inventory with dedicated tool management' },
      { type: 'feature', text: 'View-only item detail modal with Edit button' },
      { type: 'feature', text: 'Transaction history per inventory item' },
      { type: 'feature', text: 'Inventory Settings section in Adminland' },
      { type: 'feature', text: 'Configurable stock locations for inventory items' },
      { type: 'feature', text: 'Low stock & out of stock notification settings' },
      { type: 'feature', text: 'Tool checkout policies (require project, overdue alerts)' },
      { type: 'feature', text: 'Skeleton loading states on all 24 data-fetching pages' },
      { type: 'fix', text: 'Drag-and-drop reordering in Project Statuses now persists correctly' },
      { type: 'fix', text: 'Status modal add button now works reliably' },
      { type: 'fix', text: 'Delete task no longer opens detail modal on top of confirmation' },
      { type: 'improvement', text: 'Removed AI task suggestion bar from tasks view' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-24',
    title: 'Multi-Factor Authentication & Security',
    highlights: [
      'Two-factor authentication (TOTP) for all accounts',
      '7-day MFA enforcement for new users with email reminders',
      'Admin MFA reset from People management',
      'New device/IP login alerts',
    ],
    changes: [
      { type: 'feature', text: 'Two-factor authentication via authenticator app (TOTP)' },
      { type: 'feature', text: 'MFA verification step on login with 6-digit code entry' },
      { type: 'feature', text: 'Backup codes for account recovery when MFA is enabled' },
      { type: 'feature', text: '7-day MFA enforcement deadline for new users' },
      { type: 'feature', text: 'MFA enforcement guard — soft warning banner + hard block after deadline' },
      { type: 'feature', text: 'Automated email reminders at 2 days and 1 day before MFA deadline' },
      { type: 'feature', text: 'Account Security card on Profile page with MFA status' },
      { type: 'feature', text: 'Admin MFA reset from Adminland People section' },
      { type: 'feature', text: 'New device/IP login alert emails' },
      { type: 'feature', text: 'Welcome email now includes MFA setup requirement notice' },
      { type: 'fix', text: 'Fixed intermittent "Access Denied" on Adminland page' },
      { type: 'improvement', text: 'Comprehensive project README with setup guide and architecture docs' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-24',
    title: 'Version Tracking & System Info',
    highlights: [
      'New "See what\'s new" popup on deployments',
      'About & System Info section in Adminland',
    ],
    changes: [
      { type: 'feature', text: 'Version tracking with build metadata on every deploy' },
      { type: 'feature', text: '"What\'s new" popup appears once per release' },
      { type: 'feature', text: 'About & System Info section in Adminland Settings' },
      { type: 'feature', text: 'Admin password reset for team members' },
      { type: 'improvement', text: 'Cleaned up Project Sidebar layout' },
      { type: 'improvement', text: 'Enhanced project detail, tasks, and parts pages' },
    ],
  },
];

// Helper: get the latest version string
export const CURRENT_VERSION = changelog[0]?.version || '0.0.0';

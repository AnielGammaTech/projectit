/**
 * Changelog entries — newest first.
 * Add a new entry at the top when shipping a release.
 * The `version` field MUST match package.json version for the popup to work.
 */
export const changelog = [
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

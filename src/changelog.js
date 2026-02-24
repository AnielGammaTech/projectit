/**
 * Changelog entries — newest first.
 * Add a new entry at the top when shipping a release.
 * The `version` field MUST match package.json version for the popup to work.
 */
export const changelog = [
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

---
name: add-new-feature-page
description: Workflow command scaffold for add-new-feature-page in projectit.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-feature-page

Use this workflow when working on **add-new-feature-page** in `projectit`.

## Goal

Adds a new feature or entity page to the app, often as part of a module (e.g., ManageIT). Typically includes a new page file, sometimes with supporting components, and registers the page in navigation or config.

## Common Files

- `src/pages/*.jsx`
- `src/components/assets/*.jsx`
- `src/pages.config.js`
- `src/Layout.jsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create new page file in src/pages/ (e.g., AssetReports.jsx)
- Optionally create or update supporting component(s) in src/components/
- Register new page in src/pages.config.js or navigation (e.g., src/Layout.jsx)
- Apply branding or shell wrapper if needed

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
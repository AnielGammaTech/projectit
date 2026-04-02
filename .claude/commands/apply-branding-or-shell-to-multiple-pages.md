---
name: apply-branding-or-shell-to-multiple-pages
description: Workflow command scaffold for apply-branding-or-shell-to-multiple-pages in projectit.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /apply-branding-or-shell-to-multiple-pages

Use this workflow when working on **apply-branding-or-shell-to-multiple-pages** in `projectit`.

## Goal

Wraps multiple related pages with a branded shell component or applies a new color scheme/branding to a module.

## Common Files

- `src/components/assets/ManageITShell.jsx`
- `src/pages/*.jsx`
- `src/index.css`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update shell/branding component in src/components/assets/
- Wrap target pages in the shell or update their imports
- Update CSS or color tokens as needed
- Remove redundant headers or branding from individual pages

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
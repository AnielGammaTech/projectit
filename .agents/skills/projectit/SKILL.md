```markdown
# projectit Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and workflows for the `projectit` JavaScript codebase, which uses the Vite framework. You'll learn the project's coding conventions, file organization, and step-by-step guides for common development tasks such as adding new pages, applying branding, extending the backend, and redesigning UI components. The guide also covers testing patterns and provides handy command shortcuts for frequent workflows.

## Coding Conventions

**File Naming**
- Use PascalCase for file names.
  - Example: `AssetReports.jsx`, `ManageITShell.jsx`

**Import Style**
- Use absolute imports (not relative).
  - Example:
    ```js
    import AssetReports from 'src/pages/AssetReports.jsx';
    ```

**Export Style**
- Use default exports for components and modules.
  - Example:
    ```js
    // src/pages/AssetReports.jsx
    export default function AssetReports() { ... }
    ```

**Commit Messages**
- Follow Conventional Commits with `feat` and `fix` prefixes.
  - Example: `feat: add AssetReports page with summary widgets`

## Workflows

### Add New Feature Page
**Trigger:** When you want to add a new feature or entity page (e.g., AssetReports, AssetLicenses, MyAssets, AssetDetail, AssetEmployees, etc.)
**Command:** `/new-page`

1. Create a new page file in `src/pages/` (e.g., `AssetReports.jsx`).
    ```js
    // src/pages/AssetReports.jsx
    export default function AssetReports() {
      return <div>Asset Reports</div>;
    }
    ```
2. Optionally, create or update supporting components in `src/components/`.
    ```js
    // src/components/assets/AssetSummaryCard.jsx
    export default function AssetSummaryCard({ asset }) { ... }
    ```
3. Register the new page in `src/pages.config.js` or update navigation in `src/Layout.jsx`.
    ```js
    // src/pages.config.js
    export default [
      ...,
      { path: '/asset-reports', component: 'AssetReports' },
    ];
    ```
4. Apply branding or wrap the page with a shell component if needed.

---

### Apply Branding or Shell to Multiple Pages
**Trigger:** When you want to apply a consistent branded UI (e.g., ManageITShell, color scheme) across a set of pages.
**Command:** `/apply-branding`

1. Create or update the shell/branding component in `src/components/assets/` (e.g., `ManageITShell.jsx`).
    ```js
    // src/components/assets/ManageITShell.jsx
    export default function ManageITShell({ children }) {
      return <div className="manageit-shell">{children}</div>;
    }
    ```
2. Wrap target pages in the shell or update their imports.
    ```js
    // src/pages/AssetReports.jsx
    import ManageITShell from 'src/components/assets/ManageITShell.jsx';
    export default function AssetReports() {
      return (
        <ManageITShell>
          <div>Asset Reports</div>
        </ManageITShell>
      );
    }
    ```
3. Update CSS or color tokens as needed in `src/index.css`.
4. Remove redundant headers or branding from individual pages.

---

### Add Database Entity and API
**Trigger:** When you want to add a new backend entity (e.g., assets) and expose it via API.
**Command:** `/new-entity`

1. Create a migration SQL file in `server/src/db/migrations/` (e.g., `20230401_create_assets.sql`).
2. Update the migration runner in `server/src/db/migrate.js` to include the new migration.
3. Register the new entity in `server/src/routes/entities.js`.
    ```js
    // server/src/routes/entities.js
    entities.assets = require('../services/assets');
    ```
4. Implement or update service logic in `server/src/services/assets.js`.
5. Add or update API routes in `server/src/routes/functions/assets.js`.

---

### Feature Development with Supporting Components
**Trigger:** When you want to add a feature that requires both a page and reusable UI components (e.g., AssetInventory with AssetModal, AssetDashboard with AssetStatsCard).
**Command:** `/new-feature`

1. Create or update the main page in `src/pages/`.
2. Create or update supporting component(s) in `src/components/`.
    ```js
    // src/components/assets/AssetModal.jsx
    export default function AssetModal({ open, onClose }) { ... }
    ```
3. Wire up components in the main page.
    ```js
    // src/pages/AssetInventory.jsx
    import AssetModal from 'src/components/assets/AssetModal.jsx';
    ```
4. Optionally update navigation or config.

---

### UI Redesign or Layout Update
**Trigger:** When you want to improve or overhaul the UI/UX of a feature (e.g., parts modal, dashboard cards, navigation).
**Command:** `/redesign-ui`

1. Update component(s) in `src/components/` (e.g., modals, cards, nav).
2. Update corresponding page(s) in `src/pages/`.
3. Adjust CSS, color tokens, or layout as needed in `src/index.css`.

---

## Testing Patterns

- Test files follow the pattern `*.test.*` (e.g., `AssetReports.test.jsx`).
- Testing framework is not specified; check for `.test.js` or `.test.jsx` files in the codebase.
- Example:
    ```js
    // src/pages/AssetReports.test.jsx
    import AssetReports from './AssetReports.jsx';
    test('renders AssetReports page', () => {
      // test implementation
    });
    ```

## Commands

| Command        | Purpose                                                            |
|----------------|--------------------------------------------------------------------|
| /new-page      | Add a new feature or entity page                                   |
| /apply-branding| Apply branding or shell component to multiple pages                |
| /new-entity    | Add new database entity and expose via API                         |
| /new-feature   | Develop a new feature with supporting components                   |
| /redesign-ui   | Redesign or update the UI/layout of existing features              |
```

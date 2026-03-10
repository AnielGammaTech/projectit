# projectit Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches development patterns for the projectit application, a Vite-based JavaScript project with a full-stack architecture. The codebase follows structured patterns for database entity management, security implementation, UI/UX enhancements, and administrative features. The project emphasizes responsive design, modal-based interactions, and template-driven project management.

## Coding Conventions

### File Naming
- Use **PascalCase** for all file names
- Components: `UserModal.jsx`, `ProjectDetail.jsx`
- Services: `EntityService.js`, `ApiClient.js`

### Import/Export Style
```javascript
// Use absolute imports
import UserModal from 'src/components/modals/UserModal.jsx'
import { apiClient } from 'src/api/apiClient.js'

// Use default exports
export default UserModal
```

### Commit Messages
- Use freeform style with `feat:` and `fix:` prefixes
- Keep messages around 45 characters
- Examples: `feat: add user authentication`, `fix: modal responsive layout`

## Workflows

### Add Database Entity
**Trigger:** When someone wants to add a new data type to the system
**Command:** `/add-entity`

1. Create SQL migration file in `server/src/db/migrations/`
2. Add entity to VALID_ENTITIES whitelist in `server/src/services/entityService.js`
3. Register migration in `server/src/db/migrate.js`
4. Add cascade delete rules if needed for data integrity

```sql
-- Example migration file: 001_add_categories.sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

```javascript
// In entityService.js
const VALID_ENTITIES = [
  'projects',
  'templates', 
  'categories' // Add new entity here
];
```

### Security Fix Pattern
**Trigger:** When security vulnerabilities are discovered in API endpoints
**Command:** `/secure-endpoint`

1. Add authentication middleware to routes
2. Implement rate limiting using `server/src/middleware/rateLimiter.js`
3. Add admin-only guards for sensitive operations
4. Update route handlers with proper validation

```javascript
// Example secured route
router.get('/admin/users', 
  requireAuth, 
  requireAdmin, 
  rateLimiter,
  async (req, res) => {
    // Handler logic
  }
);
```

### Modal Enhancement Workflow
**Trigger:** When improving user interaction with detail modals
**Command:** `/enhance-modal`

1. Add view-only mode by default to prevent accidental edits
2. Add Edit button to toggle edit mode
3. Implement proper form state management
4. Add loading states and error handling

```jsx
// Example modal structure
const [isEditMode, setIsEditMode] = useState(false);
const [loading, setLoading] = useState(false);

return (
  <Modal>
    {!isEditMode ? (
      <ViewMode data={data} onEdit={() => setIsEditMode(true)} />
    ) : (
      <EditMode data={data} onSave={handleSave} loading={loading} />
    )}
  </Modal>
);
```

### UI Responsiveness Fixes
**Trigger:** When pages need mobile optimization and better user feedback
**Command:** `/make-responsive`

1. Add skeleton loading components from `src/components/ui/PageSkeletons.jsx`
2. Make grids and layouts responsive using CSS Grid/Flexbox
3. Add error handling and loading spinners
4. Update modals for mobile viewports

```jsx
// Example responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {loading ? <PageSkeleton /> : renderContent()}
</div>
```

### Project Template Feature Expansion
**Trigger:** When templates need to support new project features
**Command:** `/expand-templates`

1. Update template data structure in `src/pages/TemplateEditor.jsx`
2. Add new cards/sections to template UI
3. Implement save/load logic for new data
4. Update template creation from projects in `src/pages/ProjectDetail.jsx`

### Adminland Settings Expansion
**Trigger:** When new administrative capabilities are needed
**Command:** `/add-admin-feature`

1. Add new settings section to `src/pages/Adminland.jsx`
2. Create configuration UI components
3. Implement backend settings management in `server/src/routes/auth.js`
4. Add proper access controls and update `src/api/apiClient.js`

## Testing Patterns

- Test files follow the `*.test.*` pattern
- Testing framework is not explicitly configured but files suggest unit testing approach
- Place tests adjacent to source files or in dedicated test directories

## Commands

| Command | Purpose |
|---------|---------|
| `/add-entity` | Add new database table with proper backend registration |
| `/secure-endpoint` | Implement security fixes with authentication and rate limiting |
| `/enhance-modal` | Enhance modals with view/edit modes and better UX |
| `/make-responsive` | Make pages and components mobile responsive with loading states |
| `/expand-templates` | Expand template functionality to mirror project capabilities |
| `/add-admin-feature` | Add new administrative features and settings sections |
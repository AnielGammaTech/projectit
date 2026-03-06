# projectit Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill covers development patterns for projectit, a full-stack JavaScript application built with Vite on the frontend and a Node.js backend. The codebase follows a modular architecture with authentication, database entities, admin panels, and serverless functions. The project emphasizes clean separation between frontend components and backend services with a focus on project management functionality.

## Coding Conventions

### File Naming
- Use **PascalCase** for all files: `ProjectDetail.jsx`, `AuthContext.jsx`, `authService.js`
- SQL migration files use descriptive names: `001_initial_schema.sql`

### Import/Export Style
```javascript
// Use absolute imports
import AuthContext from 'src/lib/AuthContext.jsx'
import apiClient from 'src/api/apiClient.js'

// Use default exports
export default function ProjectDetail() {
  // component code
}
```

### Commit Messages
- Keep commits concise (~43 characters average)
- Use conventional prefixes: `fix:`, `feat:`
- Examples: `fix: auth token validation`, `feat: add project filtering`

## Workflows

### Authentication Security Enhancement
**Trigger:** When adding new auth methods or fixing security vulnerabilities  
**Command:** `/add-auth-feature`

1. Update authentication routes in `server/src/routes/auth.js`
2. Modify the auth service layer in `server/src/services/authService.js`
3. Update client-side auth context in `src/lib/AuthContext.jsx`
4. Add or update auth-related pages like `src/pages/Login.jsx`
5. Update API client configuration in `src/api/apiClient.js`
6. Test the complete authentication flow

```javascript
// Example: Adding new auth method to authService.js
export const authenticateWithProvider = async (provider, token) => {
  // Implementation here
  return { user, accessToken };
};
```

### Database Entity Addition
**Trigger:** When adding new data models or features requiring database storage  
**Command:** `/add-entity`

1. Create a new SQL migration file in `server/src/db/migrations/`
2. Register the migration in `server/src/db/migrate.js`
3. Add the entity to VALID_ENTITIES whitelist in `server/src/services/entityService.js`
4. Update frontend API calls to support the new entity

```sql
-- Example migration: 003_add_projects_table.sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Admin Panel Settings Section
**Trigger:** When adding new administrative features or settings  
**Command:** `/add-admin-section`

1. Add a new configuration section to `src/pages/Adminland.jsx`
2. Create supporting UI components for the settings
3. Add backend API endpoints in `server/src/routes/functions/` if needed
4. Implement save/load functionality for the new settings

```jsx
// Example: Adding new admin section
const NewSettingsSection = () => (
  <div className="admin-section">
    <h3>New Feature Settings</h3>
    {/* Settings form here */}
  </div>
);
```

### UI Component Enhancement
**Trigger:** When improving user experience or adding new functionality to existing pages  
**Command:** `/enhance-ui`

1. Identify the target component files in `src/components/` or `src/pages/`
2. Update component logic and JSX structure
3. Add new supporting components if needed
4. Update styling and interactive behaviors
5. Test responsive behavior across different screen sizes

### Function Handler Creation
**Trigger:** When adding new backend functionality or integrations  
**Command:** `/add-function`

1. Create a new function handler file in `server/src/routes/functions/`
2. Register the new function in `server/src/routes/functions/index.js`
3. Add appropriate route configuration
4. Test the new API endpoint functionality

```javascript
// Example: new function handler
export const handleNewFeature = async (req, res) => {
  try {
    // Implementation here
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Project Detail Feature Enhancement
**Trigger:** When enhancing project management functionality  
**Command:** `/enhance-project-feature`

1. Update the main `src/pages/ProjectDetail.jsx` page
2. Modify related project components in `src/components/project/`
3. Update project-specific modals in `src/components/modals/`
4. Add any supporting UI components needed
5. Test the feature within the project workflow context

### Package Dependency Update
**Trigger:** When adding new libraries or updating existing ones  
**Command:** `/update-dependencies`

1. Update the appropriate `package.json` file (frontend or backend)
2. Run package manager to update `package-lock.json`
3. Test compatibility with existing code
4. Update related configuration files if needed (Vite config, etc.)

## Testing Patterns

- Test files follow the pattern `*.test.*`
- Testing framework is not explicitly configured but follows standard JavaScript testing conventions
- Focus on testing authentication flows, API endpoints, and component interactions

## Commands

| Command | Purpose |
|---------|---------|
| `/add-auth-feature` | Implement authentication and security enhancements |
| `/add-entity` | Add new database tables and entities |
| `/add-admin-section` | Create new admin panel configuration sections |
| `/enhance-ui` | Improve existing UI components and user experience |
| `/add-function` | Create new serverless function handlers |
| `/enhance-project-feature` | Add or modify project management features |
| `/update-dependencies` | Update package dependencies and configurations |
# projectit Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill covers development patterns for the projectit codebase - a JavaScript application built with Vite featuring a full-stack architecture with React frontend and Node.js backend. The codebase emphasizes modular components, database entity management, authentication flows, and admin functionality with consistent UI patterns.

## Coding Conventions

### File Naming
- Use **PascalCase** for component files: `ProjectDetail.jsx`, `UserModal.jsx`
- Use kebab-case for utility files and routes: `entity-service.js`, `auth.js`

### Import/Export Style
```javascript
// Use absolute imports
import { AuthContext } from 'src/lib/AuthContext'
import ProjectCard from 'src/components/project/ProjectCard'

// Use default exports for components
export default function ProjectDetail() {
  // component code
}
```

### Commit Messages
- Use prefixes: `feat:`, `fix:`
- Keep messages concise (~44 characters average)
- Examples: `feat: add project modal`, `fix: auth loop issue`

## Workflows

### Add New Database Entity
**Trigger:** When someone wants to add a new data model/entity
**Command:** `/new-entity`

1. Create SQL migration file in `server/src/db/migrations/YYYY-MM-DD-entity-name.sql`
2. Register the migration in `server/src/db/migrate.js` imports and execution array
3. Add entity name to `VALID_ENTITIES` whitelist in `server/src/services/entityService.js`
4. Add cascade delete rules in migration if entity has relationships

```sql
-- Example migration file
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Add New Page Component
**Trigger:** When someone wants to add a new page to the application
**Command:** `/new-page`

1. Create page component in `src/pages/PageName.jsx`
2. Register page route in `src/pages.config.js`
3. Add corresponding skeleton component in `src/components/ui/PageSkeletons.jsx`
4. Implement data fetching with proper loading states

```jsx
// Example page structure
export default function NewPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  if (loading) return <NewPageSkeleton />
  
  return (
    <div className="container mx-auto p-4">
      {/* Page content */}
    </div>
  )
}
```

### Add Modal Component
**Trigger:** When someone wants to add a modal for managing entities
**Command:** `/new-modal`

1. Create modal component in `src/components/modals/EntityModal.jsx`
2. Add view-only mode with edit toggle functionality
3. Implement form handling with validation
4. Import and use in parent page component

```jsx
// Example modal structure
export default function EntityModal({ entity, isOpen, onClose, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal-header">
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      {/* Modal content */}
    </Modal>
  )
}
```

### Fix Authentication Flow
**Trigger:** When there are auth problems like MFA loops or session issues
**Command:** `/fix-auth`

1. Identify the auth issue in `src/lib/AuthContext.jsx`
2. Fix session management or AAL (Authentication Assurance Level) checking
3. Update server auth routes in `server/src/routes/auth.js` if needed
4. Test complete login/logout/MFA flows

```javascript
// Common auth context pattern
const checkAuthState = useCallback(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      // Handle AAL checking for MFA
      const aal = session.user.app_metadata?.providers?.includes('totp') ? 'aal2' : 'aal1'
      // Set user state
    }
  } catch (error) {
    console.error('Auth check failed:', error)
  }
}, [])
```

### Add Adminland Settings Section
**Trigger:** When someone wants to add new admin configuration options
**Command:** `/add-admin-setting`

1. Add new settings section to `src/pages/Adminland.jsx`
2. Create settings forms with proper validation
3. Add required backend API endpoints in `server/src/routes/functions/`
4. Update sidebar navigation if needed

```jsx
// Example admin settings section
const [settingValue, setSettingValue] = useState('')

const handleSaveSetting = async () => {
  try {
    await fetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'setting_name', value: settingValue })
    })
    // Handle success
  } catch (error) {
    // Handle error
  }
}
```

### Enhance Project Detail Page
**Trigger:** When someone wants to add new features to project pages
**Command:** `/enhance-project`

1. Modify `src/pages/ProjectDetail.jsx` with new cards or sections
2. Update related project components in `src/components/project/`
3. Add proper data fetching and loading states
4. Ensure consistent card sizing and responsive layout

```jsx
// Example project card addition
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <ProjectInfoCard project={project} />
  <ProjectStatsCard project={project} />
  <NewFeatureCard project={project} />
</div>
```

### Fix UI Responsiveness
**Trigger:** When components need mobile optimization or better error states
**Command:** `/fix-responsive`

1. Add responsive Tailwind classes to component layouts
2. Implement error handling with try/catch blocks
3. Add loading states and user feedback
4. Test across mobile, tablet, and desktop viewports

```jsx
// Example responsive fixes
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2 lg:w-1/3">
    {/* Mobile-first responsive content */}
  </div>
</div>
```

## Testing Patterns

- Test files use pattern: `*.test.*`
- Testing framework: Not clearly defined (requires investigation)
- Place test files adjacent to components being tested

## Commands

| Command | Purpose |
|---------|---------|
| `/new-entity` | Add new database entity with migrations and service registration |
| `/new-page` | Create new page component with routing and skeleton states |
| `/new-modal` | Add modal component for entity management |
| `/fix-auth` | Debug and resolve authentication flow issues |
| `/add-admin-setting` | Add new configuration section to admin panel |
| `/enhance-project` | Add features or cards to project detail pages |
| `/fix-responsive` | Improve mobile responsiveness and error handling |
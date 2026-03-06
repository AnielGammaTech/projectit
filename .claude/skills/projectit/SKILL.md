# projectit Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches the development patterns for projectit, a full-stack JavaScript application built with Vite frontend and Node.js backend. The codebase follows modern web development practices with a focus on component-based architecture, RESTful API design, and database-driven functionality. The application appears to be a project management system with authentication, admin capabilities, and modal-based user interactions.

## Coding Conventions

### File Naming
- Use **PascalCase** for all files: `UserProfile.jsx`, `AuthService.js`, `ProjectModal.jsx`

### Import Style
- Use **absolute imports** from project root:
```javascript
import AuthContext from 'src/lib/AuthContext.jsx'
import UserModal from 'src/components/modals/UserModal.jsx'
import entityService from 'server/src/services/entityService.js'
```

### Export Style
- Use **default exports** for components and services:
```javascript
// Component
export default function ProjectCard({ project }) {
  return <div>{project.name}</div>
}

// Service
export default class AuthService {
  static async login(credentials) {
    // implementation
  }
}
```

### Commit Messages
- Use conventional prefixes: `fix:`, `feat:`
- Keep messages concise (avg 43 characters)
- Examples: `fix: auth token validation`, `feat: project modal`

## Workflows

### UI Fix and Enhancement
**Trigger:** When fixing bugs or improving user interface components
**Command:** `/fix-ui`

1. Identify the UI issue or enhancement need in existing components
2. Locate and modify the relevant component files in `src/components/`
3. Update any related pages in `src/pages/` that use the component
4. Test changes to ensure UI responsiveness and functionality
5. Commit with `fix:` or `feat:` prefix describing the UI change

```javascript
// Example: Fixing a button component
// src/components/ui/Button.jsx
export default function Button({ variant = 'primary', children, ...props }) {
  const baseClasses = 'px-4 py-2 rounded font-medium'
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300'
  }
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

### Authentication Security Enhancement
**Trigger:** When adding security measures or fixing auth vulnerabilities
**Command:** `/secure-auth`

1. Identify the security gap or vulnerability in the authentication system
2. Update server-side auth routes in `server/src/routes/auth.js`
3. Modify the auth service in `server/src/services/authService.js`
4. Update client-side auth context in `src/lib/AuthContext.jsx`
5. Modify login page if needed in `src/pages/Login.jsx`
6. Test the complete authentication flow

```javascript
// Example: Adding token refresh capability
// server/src/services/authService.js
export default class AuthService {
  static async refreshToken(refreshToken) {
    // Validate refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET)
    
    // Generate new access token
    const newToken = jwt.sign(
      { userId: decoded.userId }, 
      process.env.JWT_SECRET, 
      { expiresIn: '15m' }
    )
    
    return { token: newToken }
  }
}
```

### Database Entity Management
**Trigger:** When creating new data models or database tables
**Command:** `/new-entity`

1. Create a new migration file in `server/src/db/migrations/`
2. Update `server/src/db/migrate.js` to include the new migration
3. Add the entity to any relevant whitelists or configurations
4. Update or create entity service in `server/src/services/entityService.js`
5. Add appropriate cascade rules and relationships

```sql
-- Example migration file: server/src/db/migrations/003_create_tasks.sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_to INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
```

### Function Handler Integration
**Trigger:** When adding new backend functionality or external integrations
**Command:** `/new-function`

1. Create a new function handler in `server/src/routes/functions/`
2. Add the handler to `server/src/routes/functions/index.js`
3. Update main routes to include the new functionality
4. Test the integration with appropriate API calls

```javascript
// Example: server/src/routes/functions/emailNotifications.js
export default async function emailNotifications(req, res) {
  try {
    const { userId, type, data } = req.body
    
    // Process email notification logic
    const result = await sendNotificationEmail(userId, type, data)
    
    res.json({ success: true, result })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

### Admin Settings Expansion
**Trigger:** When adding new administrative features or settings
**Command:** `/admin-settings`

1. Design the new settings section layout and functionality
2. Update `src/pages/Adminland.jsx` with new configuration options
3. Add form handling and state management for new settings
4. Test admin functionality and permissions

```javascript
// Example: Adding system configuration section
// src/pages/Adminland.jsx
function SystemSettings() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    maxFileSize: '10MB',
    sessionTimeout: 30
  })

  return (
    <div className="admin-section">
      <h3>System Configuration</h3>
      <div className="settings-grid">
        <label>
          <input 
            type="checkbox" 
            checked={settings.maintenanceMode}
            onChange={(e) => setSettings(prev => ({
              ...prev, 
              maintenanceMode: e.target.checked
            }))}
          />
          Maintenance Mode
        </label>
        {/* Additional settings */}
      </div>
    </div>
  )
}
```

### Modal Component Development
**Trigger:** When adding new modal dialogs or updating existing ones
**Command:** `/new-modal`

1. Create or update modal component in `src/components/modals/`
2. Add comprehensive form handling and validation
3. Integrate modal with parent page or component
4. Add error handling and user feedback

```javascript
// Example: src/components/modals/ProjectModal.jsx
export default function ProjectModal({ isOpen, onClose, project = null }) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'active'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (project) {
        await updateProject(project.id, formData)
      } else {
        await createProject(formData)
      }
      onClose()
    } catch (error) {
      // Handle error
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
        </form>
      </div>
    </div>
  )
}
```

### Project Page Enhancement
**Trigger:** When improving project management features
**Command:** `/enhance-project`

1. Identify the specific enhancement needed for project functionality
2. Update relevant project pages (`src/pages/Project*.jsx`)
3. Modify project-related components in `src/components/project/`
4. Test the complete project management workflow

## Testing Patterns

Tests follow the `*.test.*` file pattern and should be placed alongside the components they test:

```javascript
// Example: src/components/ProjectCard.test.js
import { render, screen } from '@testing-library/react'
import ProjectCard from './ProjectCard.jsx'

describe('ProjectCard', () => {
  const mockProject = {
    id: 1,
    name: 'Test Project',
    status: 'active'
  }

  test('renders project information correctly', () => {
    render(<ProjectCard project={mockProject} />)
    expect(screen.getByText('Test Project')).toBeInTheDocument()
  })
})
```

## Commands

| Command | Purpose |
|---------|---------|
| `/fix-ui` | Fix UI bugs or enhance existing components |
| `/secure-auth` | Implement security features and auth improvements |
| `/new-entity` | Add new database entities with migrations |
| `/new-function` | Create new API function handlers |
| `/admin-settings` | Add new administrative features |
| `/new-modal` | Create or update modal components |
| `/enhance-project` | Improve project management features |
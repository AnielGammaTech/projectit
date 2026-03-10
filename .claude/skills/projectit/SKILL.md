# projectit Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches development patterns for **projectit**, a JavaScript web application built with Vite. The codebase follows modern React patterns with a full-stack architecture including database migrations, UI components, and security measures. The project emphasizes responsive design, modal-based interactions, and systematic changelog management.

## Coding Conventions

### File Naming
- Use **PascalCase** for all files: `UserModal.jsx`, `ProjectCard.jsx`
- Test files follow pattern: `ComponentName.test.js`

### Import/Export Style
```javascript
// Use absolute imports
import UserModal from 'src/components/modals/UserModal'
import { validateInput } from 'src/utils/validation'

// Default exports preferred
export default function ProjectCard() {
  // component code
}
```

### Commit Messages
- Use freeform style with optional prefixes
- Common prefixes: `feat:`, `fix:`
- Keep messages around 48 characters
- Examples: `feat: add user authentication modal`, `fix: resolve mobile layout issue`

## Workflows

### Changelog Version Update
**Trigger:** When releasing a new version with new features  
**Command:** `/update-changelog`

1. Update `CHANGELOG.md` with new features and changes
2. Update `src/changelog.js` with version entries and metadata
3. Bump version in `package.json` if this is a major release
4. Commit changes with message like `feat: release version X.Y.Z`

**Example changelog entry:**
```markdown
## [1.2.0] - 2024-01-15
### Added
- New user authentication system
- Responsive dashboard layout
### Fixed  
- Modal closing animation bug
```

### UI Redesign Workflow
**Trigger:** When redesigning a page layout or component structure  
**Command:** `/redesign-component`

1. Redesign main component with new layout structure
2. Add responsive design elements for mobile/tablet views
3. Update styling and user interactions
4. Test mobile responsiveness across different screen sizes

**Example component structure:**
```jsx
export default function ProjectDashboard() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        {/* Header content */}
      </div>
      <div className="dashboard-grid responsive-grid">
        {/* Cards/table layout */}
      </div>
    </div>
  )
}
```

### Modal Enhancement Workflow
**Trigger:** When adding new features to existing modal dialogs  
**Command:** `/enhance-modal`

1. Add new fields to modal component in `src/components/modals/`
2. Update form validation and event handlers
3. Add new UI elements and user interactions
4. Test modal functionality including form submission and validation

**Example modal enhancement:**
```jsx
export default function UserModal({ isOpen, onClose, userData }) {
  const [formData, setFormData] = useState(userData || {})
  
  const handleSubmit = (e) => {
    e.preventDefault()
    // Validation logic
    // Submit logic
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Enhanced form fields */}
    </Modal>
  )
}
```

### Database Migration Workflow
**Trigger:** When adding new data models to the system  
**Command:** `/add-entity`

1. Create SQL migration file in `server/src/db/migrations/` with timestamp prefix
2. Register migration in `server/src/db/migrate.js` migration array
3. Add entity to `VALID_ENTITIES` whitelist in `server/src/services/entityService.js`
4. Add cascade delete rules if the entity has relationships

**Example migration file (`001_create_projects.sql`):**
```sql
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Page Bug Fix Workflow
**Trigger:** When resolving bugs, errors, or improving existing functionality  
**Command:** `/fix-bug`

1. Identify root cause in the affected component
2. Implement the specific fix for the issue
3. Add error handling or input validation as needed
4. Test the fix thoroughly to ensure no regression

**Example error handling:**
```jsx
export default function ProjectPage() {
  const [error, setError] = useState(null)
  
  const handleAction = async () => {
    try {
      // Action logic
    } catch (err) {
      setError(err.message)
      console.error('Project action failed:', err)
    }
  }
  
  if (error) {
    return <ErrorMessage message={error} />
  }
  
  // Component render
}
```

### Security Improvement Workflow
**Trigger:** When improving security or fixing security vulnerabilities  
**Command:** `/add-security`

1. Identify security gap in routes, middleware, or components
2. Add authentication/validation middleware to relevant endpoints
3. Update route handlers with security measures (rate limiting, input sanitization)
4. Test security implementation thoroughly

**Example security middleware:**
```javascript
// server/src/middleware/auth.js
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  
  // Token validation logic
  next()
}
```

## Testing Patterns

- Test files use pattern: `*.test.*`
- Place tests adjacent to components or in dedicated test directories
- Focus on user interactions and critical business logic
- Test responsive behavior and modal interactions

```javascript
// Example test structure
describe('UserModal', () => {
  test('should validate required fields', () => {
    // Test validation logic
  })
  
  test('should handle form submission', () => {
    // Test form submission
  })
})
```

## Commands

| Command | Purpose |
|---------|---------|
| `/update-changelog` | Release new version with changelog and version updates |
| `/redesign-component` | Redesign UI components with responsive layouts |
| `/enhance-modal` | Add features to existing modal components |
| `/add-entity` | Create new database entities with migrations |
| `/fix-bug` | Fix bugs in existing page components |
| `/add-security` | Implement security measures and authentication |
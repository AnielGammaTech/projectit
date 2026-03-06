# projectit Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches development patterns for projectit, a JavaScript application built with Vite that appears to be a project management system with AI/LLM integration. The codebase follows a client-server architecture with React frontend and Node.js backend, emphasizing security, database migrations, and administrative features.

## Coding Conventions

### File Naming
- Use **PascalCase** for component files: `ProjectDetail.jsx`, `Adminland.jsx`
- Use **camelCase** for service files: `llmService.js`, `entityService.js`
- Use **kebab-case** for middleware: `rateLimiter.js`

### Import/Export Style
```javascript
// Use absolute imports
import ProjectDetail from 'src/pages/ProjectDetail.jsx'
import { rateLimiter } from 'server/src/middleware/rateLimiter.js'

// Use default exports
export default function ProjectDetail() {
  // component code
}
```

### Commit Messages
- Keep messages concise (average 43 characters)
- Use prefixes: `fix:`, `feat:`
- Example: `fix: auth middleware rate limiting`

## Workflows

### Security Enhancement
**Trigger:** When security vulnerabilities are discovered or authentication needs to be strengthened
**Command:** `/security-fix`

1. Create or update rate limiting middleware in `server/src/middleware/rateLimiter.js`
2. Update authentication routes in `server/src/routes/auth.js`
3. Modify function handlers to include security checks
4. Add admin guards to protected routes
5. Update route protection in `server/src/index.js`

Example middleware:
```javascript
// server/src/middleware/rateLimiter.js
export const rateLimiter = (requests = 100, windowMs = 15 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: requests,
    message: 'Too many requests from this IP'
  });
};
```

### LLM Service Enhancement
**Trigger:** When AI/LLM features need bug fixes or enhancements for better content handling
**Command:** `/fix-llm`

1. Modify `server/src/services/llmService.js` with improved logic
2. Update content block handling for better parsing
3. Fix PDF/image processing capabilities
4. Test AI response formatting and error handling

### Database Migration
**Trigger:** When new data models need to be added to the system
**Command:** `/new-entity`

1. Create migration SQL file in `server/src/db/migrations/`
2. Register migration in `server/src/db/migrate.js`
3. Add entity to VALID_ENTITIES whitelist in `server/src/services/entityService.js`
4. Add cascade delete rules if needed

Example migration registration:
```javascript
// server/src/db/migrate.js
const migrations = [
  '001_create_users.sql',
  '002_create_projects.sql',
  '003_create_new_entity.sql' // New migration
];
```

### UI Enhancement with Modals
**Trigger:** When new user-facing features need to be added with proper UI/UX
**Command:** `/add-feature`

1. Create or update modal components in `src/components/*/Modal.jsx`
2. Add form handling logic with validation
3. Update main page component to integrate new feature
4. Add responsive design considerations
5. Implement proper error handling and loading states

Example modal structure:
```jsx
// src/components/features/FeatureModal.jsx
export default function FeatureModal({ isOpen, onClose, onSubmit }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {/* Form content */}
      </form>
    </Modal>
  );
}
```

### Adminland Settings Expansion
**Trigger:** When new system-wide settings or admin features need to be added
**Command:** `/admin-setting`

1. Add new section to `src/pages/Adminland.jsx`
2. Create dedicated settings components
3. Add corresponding backend function handlers in `server/src/routes/functions/`
4. Update navigation/menu to include new settings

### Package Dependency Update
**Trigger:** When new features require package updates or version bumps are needed
**Command:** `/update-deps`

1. Update `package.json` with new dependencies
2. Update `server/package.json` for backend dependencies
3. Regenerate `server/package-lock.json`
4. Update version numbers across the project
5. Update `src/changelog.js` with changes

### Project Detail UI Fixes
**Trigger:** When project pages need visual improvements or bug fixes
**Command:** `/fix-project-ui`

1. Update `src/pages/ProjectDetail.jsx` with fixes
2. Address layout and styling issues
3. Improve responsive design for mobile/tablet
4. Add proper loading states and error boundaries
5. Fix component interactions and state management

## Testing Patterns

Tests follow the `*.test.*` pattern and should be placed alongside their corresponding components or services. While the specific testing framework wasn't detected, tests should cover:

- Component rendering and user interactions
- Service function logic and error cases
- API endpoint responses
- Database migration integrity

## Commands

| Command | Purpose |
|---------|---------|
| `/security-fix` | Implement security improvements including auth, rate limiting, and vulnerability fixes |
| `/fix-llm` | Enhance LLM integration and content processing capabilities |
| `/new-entity` | Add new database tables with migrations and entity registration |
| `/add-feature` | Create new UI features with modal dialogs and form handling |
| `/admin-setting` | Add new administrative settings and configuration sections |
| `/update-deps` | Update package dependencies and version management |
| `/fix-project-ui` | Fix UI issues and improve UX in project-related pages |
# projectit Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches development patterns for **projectit**, a JavaScript web application built with Vite. The codebase follows a full-stack architecture with React frontend components, server-side API routes, and database migrations. Common patterns include modal enhancements, UI fixes, admin panel configurations, and database schema evolution.

## Coding Conventions

### File Naming
- **Components**: PascalCase (e.g., `ProjectModal.jsx`, `AdminPanel.jsx`)
- **Pages**: PascalCase (e.g., `ProjectDetail.jsx`, `Adminland.jsx`)
- **Services**: camelCase (e.g., `entityService.js`, `authService.js`)

### Import/Export Style
```javascript
// Absolute imports preferred
import ProjectModal from 'src/components/modals/ProjectModal.jsx'
import { entityService } from 'src/services/entityService.js'

// Default exports
export default ProjectModal
```

### Commit Format
- Freeform style with `feat:` and `fix:` prefixes
- Average length: ~44 characters
- Examples: `feat: add project status modal`, `fix: responsive layout issues`

## Workflows

### Modal Enhancement
**Trigger:** When someone wants to add new functionality to an existing modal dialog  
**Command:** `/enhance-modal`

1. Locate the target modal component in `src/components/modals/*Modal.jsx`
2. Add new form fields or UI sections to the modal structure
3. Update form validation logic and state management
4. Enhance styling and responsive design
5. Test modal functionality across different screen sizes

```javascript
// Example: Adding a new field to ProjectModal.jsx
const ProjectModal = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium' // New field
  });
  
  return (
    <Modal>
      {/* Existing fields */}
      <select 
        value={formData.priority}
        onChange={(e) => setFormData({...formData, priority: e.target.value})}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </Modal>
  );
};
```

### Page UI Fixes
**Trigger:** When someone needs to fix layout, styling, or responsiveness issues  
**Command:** `/fix-ui`

1. Identify the UI problem in `src/pages/*.jsx` or component files
2. Update component styles using CSS modules or styled-components
3. Fix responsive design breakpoints and mobile layouts
4. Test visual consistency across different browsers and devices
5. Verify accessibility standards are maintained

### Admin Settings Section
**Trigger:** When someone wants to add new administrative configuration options  
**Command:** `/add-admin-setting`

1. Open `src/pages/Adminland.jsx`
2. Add new settings section to the admin interface layout
3. Create form fields for the new configuration options
4. Implement save functionality with proper validation
5. Update the settings UI to reflect the new section

```javascript
// Example: Adding a notification settings section
const AdminlandPage = () => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      frequency: 'daily'
    }
  });

  return (
    <div className="adminland">
      <section className="settings-section">
        <h3>Notification Settings</h3>
        <label>
          <input 
            type="checkbox" 
            checked={settings.notifications.email}
            onChange={handleNotificationChange}
          />
          Email Notifications
        </label>
      </section>
    </div>
  );
};
```

### Database Schema Evolution
**Trigger:** When someone needs to add new data models to the system  
**Command:** `/add-table`

1. Create a new SQL migration file in `server/src/db/migrations/`
2. Add the migration to `server/src/db/migrate.js` imports and execution order
3. Register the new entity in `server/src/services/entityService.js` whitelist
4. Add appropriate cascade delete rules and foreign key constraints

```sql
-- Example: 001_create_project_tags.sql
CREATE TABLE project_tags (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```javascript
// Update entityService.js
const ALLOWED_ENTITIES = [
  'projects',
  'users',
  'project_tags' // New entity
];
```

### Project Detail Cards
**Trigger:** When someone wants to update project overview cards or layout  
**Command:** `/update-project-cards`

1. Modify the layout structure in `src/pages/ProjectDetail.jsx`
2. Update individual card components in `src/components/project/`
3. Adjust card sizing, grid layout, and responsive behavior
4. Update card content, data fetching, or display logic
5. Test card interactions and loading states

### Authentication Security Enhancement
**Trigger:** When someone needs to enhance authentication, authorization, or security features  
**Command:** `/enhance-auth`

1. Modify authentication context in `src/lib/AuthContext.jsx`
2. Update server-side auth routes in `server/src/routes/auth.js`
3. Enhance auth service logic in `server/src/services/authService.js`
4. Add new security validation or middleware
5. Update auth-related UI components and flows

### Function API Endpoint
**Trigger:** When someone wants to add new API functionality or integrations  
**Command:** `/add-function`

1. Create a new function file in `server/src/routes/functions/`
2. Register the function in `server/src/routes/functions/index.js`
3. Add required middleware for authentication, validation, or logging
4. Implement the endpoint logic with proper error handling
5. Test the endpoint functionality and integration

```javascript
// Example: server/src/routes/functions/projectStats.js
export const getProjectStats = async (req, res) => {
  try {
    const { projectId } = req.params;
    const stats = await calculateProjectStats(projectId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Register in functions/index.js
import { getProjectStats } from './projectStats.js';
router.get('/project/:projectId/stats', getProjectStats);
```

## Testing Patterns

- Test files follow the pattern `*.test.*`
- Testing framework not definitively identified from analysis
- Focus on component testing, API endpoint testing, and integration tests
- Test files should be co-located with their corresponding source files

## Commands

| Command | Purpose |
|---------|---------|
| `/enhance-modal` | Add new functionality to existing modal dialogs |
| `/fix-ui` | Fix layout, styling, and responsiveness issues |
| `/add-admin-setting` | Add new administrative configuration options |
| `/add-table` | Create new database tables with migrations |
| `/update-project-cards` | Modify project detail page card layouts |
| `/enhance-auth` | Implement authentication and security improvements |
| `/add-function` | Add new server-side API endpoints and integrations |
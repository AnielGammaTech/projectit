# projectit Development Patterns

> Auto-generated skill from repository analysis

## Overview

The **projectit** codebase is a full-stack JavaScript application built with Vite, featuring inventory management, task tracking, and project organization capabilities. The codebase follows consistent patterns for UI components, database operations, and security implementations, with a focus on Monday.com-style interfaces and comprehensive stock/inventory management features.

## Coding Conventions

### File Naming
- **Components and Pages**: PascalCase (e.g., `AllTasks.jsx`, `TemplateEditor.jsx`)
- **Utilities and Services**: camelCase (e.g., `entityService.js`, `rateLimiter.js`)
- **Test Files**: `*.test.*` pattern

### Import/Export Style
```javascript
// Imports: Use absolute paths
import AllTasks from 'src/pages/AllTasks.jsx'
import { entityService } from 'server/src/services/entityService.js'

// Exports: Default exports preferred
export default function AllTasks() {
  // component logic
}
```

### Commit Messages
- **Format**: Freeform with prefixes (`feat:`, `fix:`)
- **Length**: ~50 characters average
- **Examples**: `feat: add stock checkout modal`, `fix: authentication bypass issue`

## Workflows

### Version Release with Changelog
**Trigger:** When preparing a new version release
**Command:** `/release-version`

1. Update version number in `package.json`
2. Add new entries to `CHANGELOG.md` with release notes
3. Update `src/changelog.js` with new features and changes
4. Commit all changelog files together with descriptive message
5. Tag the release if needed

```javascript
// src/changelog.js example
export const changelog = [
  {
    version: "1.2.0",
    date: "2024-01-15",
    changes: ["Added inventory tracking", "Fixed authentication issues"]
  }
]
```

### UI Redesign Pattern
**Trigger:** When redesigning UI components for consistency
**Command:** `/redesign-ui`

1. Identify components needing Monday.com-style table/card layouts
2. Replace existing layout structure with new design pattern
3. Update component JSX structure while maintaining functionality
4. Apply consistent styling and spacing
5. Test component responsiveness and interactions

```jsx
// Example Monday.com-style table pattern
<div className="monday-table">
  <div className="table-header">
    <div className="column">Name</div>
    <div className="column">Status</div>
    <div className="column">Actions</div>
  </div>
  <div className="table-rows">
    {items.map(item => (
      <div key={item.id} className="table-row">
        {/* row content */}
      </div>
    ))}
  </div>
</div>
```

### Security Hardening
**Trigger:** When hardening API endpoints and routes
**Command:** `/harden-security`

1. Add rate limiting middleware to `server/src/middleware/rateLimiter.js`
2. Fix authentication bypass issues in route handlers
3. Add input validation to API endpoints
4. Update route handlers in `server/src/routes/*.js`
5. Test security measures and rate limits

```javascript
// Rate limiter middleware example
export const rateLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP"
}
```

### Stock Inventory Feature
**Trigger:** When adding new inventory management capabilities
**Command:** `/add-stock-feature`

1. Create/update stock component files in `src/components/stock/`
2. Add modals for item management (Add/Edit/Delete)
3. Implement Take/Restock/Checkout action buttons
4. Add transaction history tracking functionality
5. Update main Stock page (`src/pages/Stock.jsx`) with new features

```jsx
// Stock action buttons pattern
<div className="stock-actions">
  <button onClick={handleTake}>Take</button>
  <button onClick={handleRestock}>Restock</button>
  <button onClick={handleCheckout}>Checkout</button>
</div>
```

### Bug Fix with Enhancement
**Trigger:** When fixing issues and adding related improvements
**Command:** `/fix-and-enhance`

1. Identify and isolate the core bug/issue
2. Implement the fix with proper error handling
3. Add related enhancement or improvement in same area
4. Update any affected component logic
5. Test both the fix and enhancement together

### Modal Component Pattern
**Trigger:** When adding new modal dialogs or updating existing ones
**Command:** `/add-modal`

1. Create modal component in `src/components/modals/`
2. Add form fields with proper validation
3. Implement save/cancel actions with state management
4. Add modal to parent component with proper triggers
5. Handle modal open/close state management

```jsx
// Modal component pattern
export default function ItemModal({ isOpen, onClose, onSave, item }) {
  const [formData, setFormData] = useState(item || {})
  
  const handleSave = () => {
    onSave(formData)
    onClose()
  }
  
  if (!isOpen) return null
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* form fields */}
        <div className="modal-actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
```

### Database Migration
**Trigger:** When adding new data models to the system
**Command:** `/add-database-table`

1. Create SQL migration file in `server/src/db/migrations/`
2. Add entities to VALID_ENTITIES whitelist in `entityService.js`
3. Update `entityService.js` with proper cascade deletion rules
4. Register migration in `server/src/db/migrate.js`
5. Test migration up/down operations

```sql
-- Migration file example: 001_add_inventory_table.sql
CREATE TABLE inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Patterns

Tests follow the `*.test.*` naming convention and are distributed throughout the codebase. While the specific testing framework is not identified, tests should:

- Cover component rendering and user interactions
- Test API endpoints and database operations  
- Include edge cases and error handling scenarios
- Mock external dependencies appropriately

## Commands

| Command | Purpose |
|---------|---------|
| `/release-version` | Update version, changelog, and prepare release |
| `/redesign-ui` | Apply Monday.com-style design patterns to components |
| `/harden-security` | Add security measures and rate limiting |
| `/add-stock-feature` | Create inventory management functionality |
| `/fix-and-enhance` | Fix bugs while adding related improvements |
| `/add-modal` | Create modal components with consistent patterns |
| `/add-database-table` | Add new database tables with proper migrations |
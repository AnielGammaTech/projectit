```markdown
# projectit Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill covers development patterns for **projectit**, a JavaScript/Vite-based project management application with inventory and stock management features. The codebase follows React patterns with a Node.js backend, featuring modular components, database migrations, and admin configuration panels.

## Coding Conventions

### File Naming
- **Components**: PascalCase (e.g., `ProjectModal.jsx`, `StockCard.jsx`)
- **Pages**: PascalCase (e.g., `Adminland.jsx`, `ProjectTasks.jsx`)
- **Services**: camelCase (e.g., `llmService.js`, `entityService.js`)

### Import/Export Style
```javascript
// Use absolute imports
import ProjectModal from 'src/components/modals/ProjectModal'
import { entityService } from 'server/src/services/entityService'

// Default exports preferred
export default function ProjectModal() {
  // component logic
}
```

### Commit Messages
- Format: `feat: add new modal field` or `fix: security vulnerability in API`
- Average length: ~44 characters
- Prefixes: `feat`, `fix`

## Workflows

### Security Vulnerability Fix
**Trigger:** When security issues are discovered in API endpoints or webhooks
**Command:** `/fix-security`

1. Identify vulnerable endpoints in `server/src/routes/*.js`
2. Add authentication middleware to `server/src/middleware/`
3. Implement rate limiting for exposed endpoints
4. Add comprehensive input validation
5. Update `CHANGELOG.md` with security improvements

```javascript
// Example middleware addition
app.use('/api/webhook', authMiddleware);
app.use('/api/', rateLimiter);
```

### UI Modal Enhancement
**Trigger:** When adding new data fields or actions to parts, products, or project modals
**Command:** `/enhance-modal`

1. Update modal component in `src/components/modals/*.jsx`
2. Add form validation for new fields
3. Implement new action buttons and handlers
4. Update both view and edit modes
5. Test modal state management

```jsx
// Example modal field addition
<div className="modal-field">
  <label>New Field</label>
  <input 
    value={formData.newField} 
    onChange={(e) => setFormData({...formData, newField: e.target.value})}
  />
</div>
```

### LLM Service Fix
**Trigger:** When Claude/LLM is not properly processing uploaded files or images
**Command:** `/fix-llm-content`

1. Identify content type issue in `server/src/services/llmService.js`
2. Update service to use proper content blocks for different file types
3. Test with actual file uploads and image processing
4. Ensure proper error handling for unsupported formats

```javascript
// Example content block fix
const contentBlocks = file.type.startsWith('image/') 
  ? [{ type: 'image', source: { type: 'base64', media_type: file.type, data: fileData }}]
  : [{ type: 'text', text: fileContent }];
```

### Database Entity Addition
**Trigger:** When adding new data models like FileComment, Tool, ProductTransaction
**Command:** `/add-entity`

1. Create SQL migration file in `server/src/db/migrations/`
2. Add entity to VALID_ENTITIES whitelist in `entityService.js`
3. Register migration in `server/src/db/migrate.js`
4. Add cascade delete rules for data integrity
5. Update frontend components to use new entity

```sql
-- Example migration
CREATE TABLE tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Adminland Settings Section
**Trigger:** When adding new system settings like inventory, MFA, or integrations
**Command:** `/add-admin-section`

1. Add new section to `src/pages/Adminland.jsx`
2. Create settings form components with proper validation
3. Add save/load functionality with API integration
4. Update sidebar navigation to include new section

```jsx
// Example admin section
const [inventorySettings, setInventorySettings] = useState({});

<div className="admin-section">
  <h3>Inventory Settings</h3>
  <form onSubmit={handleSaveInventory}>
    {/* form fields */}
  </form>
</div>
```

### Drag Drop Fix
**Trigger:** When drag-and-drop reordering is not persisting or reverting
**Command:** `/fix-drag-drop`

1. Add optimistic cache updates for immediate UI feedback
2. Use Promise.all for parallel API calls during reorder
3. Fix React Query cache invalidation issues
4. Remove animation conflicts that cause visual glitches

```javascript
// Example drag-drop fix
const handleDragEnd = async (result) => {
  // Optimistic update
  setItems(reorderedItems);
  
  try {
    await Promise.all(updatePromises);
    queryClient.invalidateQueries(['items']);
  } catch (error) {
    // Revert on error
    setItems(originalItems);
  }
};
```

### Stock Management Feature
**Trigger:** When adding new stock operations like Take, Restock, Checkout, Return
**Command:** `/add-stock-action`

1. Add action buttons to item cards in `src/components/stock/`
2. Create inline action panels for quantity input
3. Implement transaction logging with mandatory comments
4. Add transaction history display
5. Update stock levels with proper validation

```jsx
// Example stock action
<div className="stock-actions">
  <button onClick={() => handleStockAction('take')}>Take</button>
  <button onClick={() => handleStockAction('restock')}>Restock</button>
  {showActionPanel && (
    <StockActionPanel 
      type={actionType}
      onSubmit={handleSubmitAction}
      requireComment={true}
    />
  )}
</div>
```

### Loading State Improvement
**Trigger:** When improving user experience during data loading
**Command:** `/add-skeletons`

1. Create skeleton components in `src/components/ui/PageSkeletons.jsx`
2. Replace basic spinners/loading text with skeleton screens
3. Add proper error states with retry functionality
4. Add loading states to action buttons

```jsx
// Example skeleton usage
{isLoading ? (
  <PageSkeleton type="table" rows={5} />
) : (
  <DataTable data={items} />
)}
```

## Testing Patterns

- Test files follow `*.test.*` pattern
- Framework: Unknown (likely Jest/React Testing Library based on patterns)
- Focus on component behavior and API integration testing
- Test file location mirrors source structure

## Commands

| Command | Purpose |
|---------|---------|
| `/fix-security` | Add authentication, rate limiting, and validation to vulnerable endpoints |
| `/enhance-modal` | Add new fields and functionality to modal components |
| `/fix-llm-content` | Fix LLM service file processing and content handling |
| `/add-entity` | Create new database entities with full integration |
| `/add-admin-section` | Add new configuration sections to admin panel |
| `/fix-drag-drop` | Fix drag-and-drop with proper state management |
| `/add-stock-action` | Add inventory management actions with transaction tracking |
| `/add-skeletons` | Replace loading indicators with skeleton screens |
```
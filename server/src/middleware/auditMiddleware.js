import entityService from '../services/entityService.js';

// Entity types that should NOT be audit-logged (to avoid infinite loops or noise)
const EXCLUDED_ENTITIES = new Set([
  'AuditLog',           // Don't log writes to the audit log itself
  'UserNotification',   // High-volume, low-value noise
  'DeviceToken',        // Device registration noise
  'DashboardView',      // User preference, not actionable
  'NotificationSettings', // User preference
]);

// Map entity types to human-readable categories
const ENTITY_CATEGORIES = {
  Project: 'project',
  Task: 'task',
  TaskComment: 'task',
  TaskGroup: 'task',
  Part: 'part',
  ProjectNote: 'note',
  ProjectFile: 'file',
  FileFolder: 'file',
  FileComment: 'file',
  TimeEntry: 'time',
  ProgressUpdate: 'project',
  Proposal: 'proposal',
  ChangeOrder: 'proposal',
  Customer: 'customer',
  Site: 'customer',
  InventoryItem: 'inventory',
  InventoryTransaction: 'inventory',
  Product: 'inventory',
  ProductTransaction: 'inventory',
  Tool: 'inventory',
  ToolTransaction: 'inventory',
  TeamMember: 'user',
  UserGroup: 'user',
  CustomRole: 'user',
  Workflow: 'settings',
  WorkflowLog: 'settings',
  IntegrationSettings: 'settings',
  AppSettings: 'settings',
  ProposalSettings: 'settings',
  ProjectTemplate: 'settings',
  ProjectTag: 'settings',
  ProjectStatus: 'settings',
  ProjectStack: 'settings',
  EmailTemplate: 'settings',
  Asset: 'inventory',
  AssetAssignment: 'inventory',
  AssetAcceptance: 'inventory',
  AssetNote: 'inventory',
  Employee: 'user',
};

// Derive a human-readable name from entity data
function getEntityName(entityType, data) {
  if (!data) return null;
  // Try common name fields in order of preference
  return data.name || data.title || data.subject || data.content?.slice(0, 60) || null;
}

// Derive the project context from entity data
function getProjectContext(entityType, data) {
  if (!data) return { project_id: null, project_name: null };
  if (entityType === 'Project') {
    return { project_id: null, project_name: data.name || null };
  }
  return {
    project_id: data.project_id || null,
    project_name: data.project_name || null,
  };
}

// Build a standardized action string
function buildAction(method, entityType, beforeData, afterData) {
  const base = entityType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');

  if (method === 'POST') return `${base}_created`;
  if (method === 'DELETE') return `${base}_deleted`;

  // For updates, check for meaningful status changes
  if (method === 'PUT' && beforeData && afterData) {
    if (beforeData.status !== afterData.status) {
      const newStatus = afterData.status;
      if (newStatus === 'completed') return `${base}_completed`;
      if (newStatus === 'archived') return `${base}_archived`;
      if (newStatus === 'on_hold') return `${base}_on_hold`;
      if (newStatus === 'installed') return `${base}_installed`;
      if (newStatus === 'ordered') return `${base}_ordered`;
      if (newStatus === 'received') return `${base}_received`;
      if (newStatus === 'ready_to_install') return `${base}_ready_to_install`;
    }
    return `${base}_updated`;
  }

  return `${base}_updated`;
}

// Compute a diff of changed fields (shallow comparison)
function computeChanges(before, after) {
  if (!before || !after) return null;
  const changes = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    // Skip internal/meta fields
    if (key.startsWith('_') || key === 'id' || key === 'created_date' || key === 'updated_date' || key === 'created_by') continue;

    const oldVal = before[key];
    const newVal = after[key];

    // Skip if both are the same (handle JSON comparison for objects)
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    changes[key] = { from: oldVal ?? null, to: newVal ?? null };
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Express middleware that wraps entity route handlers to automatically
 * log all create/update/delete operations to AuditLog.
 *
 * Must be mounted AFTER auth middleware (needs req.user).
 */
export default function auditMiddleware(req, res, next) {
  // Only intercept mutation methods
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return next();
  }

  const entityType = req.params.entityType;

  // Skip excluded entities and non-entity routes
  if (!entityType || EXCLUDED_ENTITIES.has(entityType)) {
    return next();
  }

  // Skip filter/list endpoints (POST used for filter)
  if (req.path.endsWith('/filter') || req.path.endsWith('/list')) {
    return next();
  }

  // Skip bulk-create (would need special handling)
  if (req.path.endsWith('/bulk-create')) {
    return next();
  }

  const entityId = req.params.id;
  const method = req.method;
  const user = req.user;

  // For updates and deletes, capture the "before" state
  let beforeState = null;

  const captureAndProceed = async () => {
    try {
      if ((method === 'PUT' || method === 'DELETE') && entityId) {
        const results = await entityService.filter(entityType, { id: entityId });
        beforeState = results[0] || null;
      }
    } catch {
      // If we can't read the before state, continue anyway — don't block the request
    }

    // Intercept the response to log after success
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      // Fire-and-forget: write the audit log asynchronously
      writeAuditLog(method, entityType, entityId, user, beforeState, data, req).catch(() => {});
      return originalJson(data);
    };

    next();
  };

  captureAndProceed();
}

async function writeAuditLog(method, entityType, entityId, user, beforeState, responseData, req) {
  try {
    // For creates, the response IS the new entity
    const afterState = method === 'DELETE' ? null : responseData;

    // Build the log entry
    const action = buildAction(method, entityType, beforeState, afterState);
    const category = ENTITY_CATEGORIES[entityType] || 'settings';
    const entityName = getEntityName(entityType, afterState || beforeState);
    const projectCtx = getProjectContext(entityType, afterState || beforeState);
    const changes = method === 'PUT' ? computeChanges(beforeState, afterState) : null;

    // Build a human-readable details string
    let details = '';
    if (method === 'POST') {
      details = `Created ${entityType}${entityName ? `: "${entityName}"` : ''}`;
    } else if (method === 'DELETE') {
      details = `Deleted ${entityType}${entityName ? `: "${entityName}"` : ''}`;
    } else if (method === 'PUT' && changes) {
      const changedFields = Object.keys(changes);
      if (changedFields.length <= 3) {
        details = `Updated ${changedFields.join(', ')} on ${entityType}${entityName ? ` "${entityName}"` : ''}`;
      } else {
        details = `Updated ${changedFields.length} fields on ${entityType}${entityName ? ` "${entityName}"` : ''}`;
      }
    } else {
      details = `Updated ${entityType}${entityName ? `: "${entityName}"` : ''}`;
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await entityService.create('AuditLog', {
      action,
      action_category: category,
      entity_type: entityType,
      entity_id: entityId || responseData?.id || null,
      entity_name: entityName,
      user_email: user?.email || 'unknown',
      user_name: user?.full_name || user?.email || 'unknown',
      details,
      changes,
      project_id: projectCtx.project_id,
      project_name: projectCtx.project_name,
      ip_address: ip,
      user_agent: userAgent,
    }, 'system');
  } catch {
    // Audit logging should never break the app
  }
}

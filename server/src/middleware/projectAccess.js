import pool from '../config/database.js';

// Entity types that have a direct project_id in their JSONB data
const PROJECT_CHILD_ENTITIES = new Set([
  'Task', 'Part', 'ProjectNote', 'ProjectFile', 'FileFolder',
  'TaskGroup', 'TimeEntry', 'ProgressUpdate', 'ProjectActivity',
  'Proposal', 'ChangeOrder',
]);

// Indirect children — linked through a parent entity
const INDIRECT_CHILDREN = {
  TaskComment: { parentEntity: 'Task', foreignKey: 'task_id' },
};

// Simple in-memory cache: email → { ids: string[], time: number }
const cache = new Map();
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Returns accessible project IDs for a user.
 * - Admin → null (means "no filter, access all")
 * - Member → array of project UUIDs they belong to
 */
async function getAccessibleProjectIds(email, role) {
  if (role === 'admin') return null;

  const cached = cache.get(email);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.ids;

  const { rows } = await pool.query(
    `SELECT id FROM "Project" WHERE data->'team_members' @> $1::jsonb`,
    [JSON.stringify([email])]
  );
  const ids = rows.map(r => r.id);
  cache.set(email, { ids, time: Date.now() });
  return ids;
}

/** Clear cache for a specific user (call after team_members change) */
export function clearProjectAccessCache(email) {
  if (email) cache.delete(email);
  else cache.clear();
}

/**
 * Determine if an entity type is project-scoped.
 * Returns 'project' | 'child' | 'indirect' | null
 */
function getProjectScope(entityType) {
  if (entityType === 'Project') return 'project';
  if (PROJECT_CHILD_ENTITIES.has(entityType)) return 'child';
  if (INDIRECT_CHILDREN[entityType]) return 'indirect';
  return null;
}

/**
 * Middleware that enforces project-based access control on entity routes.
 * Attaches req.accessFilter for list/filter queries.
 * Returns 403 for unauthorized single-entity access.
 */
export default function projectAccessMiddleware(req, res, next) {
  const entityType = req.params.entityType;
  if (!entityType) return next();

  const scope = getProjectScope(entityType);

  // Non-project entities: pass through
  if (!scope) return next();

  // Admin users: pass through
  if (req.user?.role === 'admin') return next();

  // Must be authenticated
  if (!req.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Async work
  handleAccess(req, res, next, entityType, scope).catch(err => {
    console.error('projectAccess error:', err);
    next(err);
  });
}

async function handleAccess(req, res, next, entityType, scope) {
  const projectIds = await getAccessibleProjectIds(req.user.email, req.user.role);

  // projectIds is null for admins (already handled above, but safety check)
  if (projectIds === null) return next();

  // For list/filter routes: attach filter for entityService
  req.accessFilter = { projectIds, scope, entityType };

  // For single-entity routes (have :id param) — check access on the specific entity
  if (req.params.id && (req.method === 'PUT' || req.method === 'DELETE')) {
    const allowed = await checkEntityAccess(req.params.id, entityType, scope, projectIds);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied: not a member of this project' });
    }
  }

  // For create routes: verify project_id is accessible
  if (req.method === 'POST' && req.path.endsWith('/create')) {
    if (entityType === 'Project') {
      // Auto-add creator to team_members
      const data = req.body;
      if (!data.team_members) data.team_members = [];
      if (!data.team_members.includes(req.user.email)) {
        data.team_members.push(req.user.email);
      }
    } else if (scope === 'child') {
      const projectId = req.body.project_id;
      if (projectId && !projectIds.includes(projectId)) {
        return res.status(403).json({ error: 'Access denied: not a member of this project' });
      }
    }
  }

  next();
}

/**
 * Check if a specific entity belongs to an accessible project.
 */
async function checkEntityAccess(entityId, entityType, scope, projectIds) {
  if (scope === 'project') {
    return projectIds.includes(entityId);
  }

  if (scope === 'child') {
    const { rows } = await pool.query(
      `SELECT data->>'project_id' as project_id FROM "${entityType}" WHERE id = $1::uuid`,
      [entityId]
    );
    if (rows.length === 0) return true; // Let route handler return 404
    return projectIds.includes(rows[0].project_id);
  }

  if (scope === 'indirect') {
    const config = INDIRECT_CHILDREN[entityType];
    const { rows } = await pool.query(
      `SELECT data->>'${config.foreignKey}' as parent_id FROM "${entityType}" WHERE id = $1::uuid`,
      [entityId]
    );
    if (rows.length === 0) return true;
    const parentId = rows[0].parent_id;

    const { rows: parentRows } = await pool.query(
      `SELECT data->>'project_id' as project_id FROM "${config.parentEntity}" WHERE id = $1::uuid`,
      [parentId]
    );
    if (parentRows.length === 0) return true;
    return projectIds.includes(parentRows[0].project_id);
  }

  return true;
}

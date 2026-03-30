import { Router } from 'express';
import entityService from '../services/entityService.js';
import projectAccessMiddleware from '../middleware/projectAccess.js';
import { autoSendFeedback } from './functions/agentBridge.js';

const router = Router();

// Fully admin-only (no access for non-admins)
const ADMIN_ONLY_ENTITIES = new Set([
  'IntegrationSettings', 'ApiKey', 'UserSecuritySettings',
  'AuditLog', 'CustomRole', 'EmailTemplate',
]);

// Read-only for non-admin (can list/filter but not create/update/delete)
const ADMIN_WRITE_ENTITIES = new Set([
  'AppSettings', 'ProjectTemplate', 'ProjectStatus', 'ProjectStack',
  'Workflow', 'WorkflowLog', 'ProposalSettings',
]);

// Users can read + write their own, but admin guard not needed
// (NotificationSettings — users manage their own prefs)

// Admin guard middleware
function adminGuard(req, res, next) {
  const entityType = req.params.entityType;
  const isAdmin = req.user?.role === 'admin';
  const isWrite = ['POST', 'PUT', 'DELETE'].includes(req.method);

  // Block all access to admin-only entities for non-admins
  if (ADMIN_ONLY_ENTITIES.has(entityType) && !isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Block write access to admin-write entities for non-admins
  if (ADMIN_WRITE_ENTITIES.has(entityType) && isWrite && !isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

// Project-based access control — runs before all entity routes
router.use(projectAccessMiddleware);
router.use(adminGuard);

// GET /api/entities/:entityType/list?sort=...&limit=...
router.get('/:entityType/list', async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const { sort, limit } = req.query;
    const results = await entityService.list(entityType, sort, limit ? parseInt(limit) : undefined, req.accessFilter || null);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/entities/:entityType/filter
router.post('/:entityType/filter', async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const { filter, sort, limit } = req.body;
    const results = await entityService.filter(entityType, filter, sort, limit, req.accessFilter || null);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/entities/:entityType/create
router.post('/:entityType/create', async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const result = await entityService.create(entityType, req.body, req.user?.email);
    res.status(201).json(result);

    // Auto-send new Feedback to AI if configured (fire-and-forget)
    if (entityType === 'Feedback' && result?.id) {
      autoSendFeedback({ ...req.body, id: result.id });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/entities/:entityType/bulk-create
router.post('/:entityType/bulk-create', async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const results = await entityService.bulkCreate(entityType, req.body, req.user?.email);
    res.status(201).json(results);
  } catch (err) {
    next(err);
  }
});

// PUT /api/entities/:entityType/:id
router.put('/:entityType/:id', async (req, res, next) => {
  try {
    const { entityType, id } = req.params;
    const result = await entityService.update(entityType, id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/entities/:entityType/:id
router.delete('/:entityType/:id', async (req, res, next) => {
  try {
    const { entityType, id } = req.params;
    const result = await entityService.delete(entityType, id, req.user?.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

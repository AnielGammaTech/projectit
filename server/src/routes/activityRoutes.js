import { Router } from 'express';
import entityService from '../services/entityService.js';

const router = Router();

/**
 * POST /api/activity/page-view
 * Logs a page navigation event for the authenticated user.
 */
router.post('/page-view', async (req, res) => {
  try {
    const { page, projectId, projectName } = req.body;
    if (!page) {
      return res.status(400).json({ error: 'page is required' });
    }

    const user = req.user;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Fire-and-forget — don't block the response
    entityService.create('AuditLog', {
      action: 'page_viewed',
      action_category: 'navigation',
      entity_type: 'Page',
      entity_id: null,
      entity_name: page,
      user_email: user?.email || 'unknown',
      user_name: user?.full_name || user?.email || 'unknown',
      details: `Viewed ${page}`,
      project_id: projectId || null,
      project_name: projectName || null,
      ip_address: ip,
      user_agent: userAgent,
    }, 'system').catch(() => {});

    res.json({ ok: true });
  } catch {
    // Never fail — page tracking is non-critical
    res.json({ ok: true });
  }
});

export default router;

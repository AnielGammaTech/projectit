import { Router } from 'express';
import entityService from '../services/entityService.js';

const router = Router();

/**
 * POST /api/webhooks/gammaai
 * Dedicated public endpoint for GammaAi to push task results back.
 * Validates via x-gammaai-webhook-secret header.
 */
router.post('/gammaai', async (req, res) => {
  try {
    const webhookSecret = req.headers['x-gammaai-webhook-secret'];

    const settings = await entityService.filter('IntegrationSettings', { provider: 'gammaai' });
    const config = settings[0];

    if (!config || !config.gammaai_webhook_secret) {
      return res.status(401).json({ error: 'Webhook not configured' });
    }
    if (webhookSecret !== config.gammaai_webhook_secret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({ error: 'Missing event or data in request body' });
    }

    if (event === 'task_result' || event === 'task.completed') {
      const feedbackId = data?.metadata?.feedback_id;
      if (feedbackId) {
        await entityService.update('Feedback', feedbackId, {
          ai_status: 'completed',
          ai_analysis: data.result || data.output_data,
          ai_completed_at: new Date().toISOString(),
        });
      }
    } else if (event === 'task_status' || event === 'task.updated') {
      const feedbackId = data?.metadata?.feedback_id;
      if (feedbackId) {
        const statusMap = { in_progress: 'in_progress', failed: 'failed', completed: 'completed' };
        const newStatus = statusMap[data.status] || 'in_progress';
        const update = { ai_status: newStatus };
        if (newStatus === 'completed' && (data.result || data.output_data)) {
          update.ai_analysis = data.result || data.output_data;
          update.ai_completed_at = new Date().toISOString();
        }
        await entityService.update('Feedback', feedbackId, update);
      }
    } else if (event === 'task.failed') {
      const feedbackId = data?.metadata?.feedback_id;
      if (feedbackId) {
        await entityService.update('Feedback', feedbackId, {
          ai_status: 'failed',
          ai_analysis: data.error || data.message || 'Agent task failed',
        });
      }
    }

    // Log the webhook event
    await entityService.create('AuditLog', {
      action: 'gammaai_webhook',
      entity_type: 'GammaAi',
      entity_id: data?.id || data?.task_id || 'unknown',
      details: `Received ${event} webhook from GammaAi`,
      user_email: 'system@gammaai',
      user_name: 'GammaAi Webhook',
    });

    return res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('GammaAi webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

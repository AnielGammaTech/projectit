import entityService from '../../services/entityService.js';

const PRIORITY_MAP = { low: 1, medium: 2, high: 3, critical: 4 };

async function getGammaAiConfig() {
  const settings = await entityService.filter('IntegrationSettings', { provider: 'gammaai' });
  return settings[0] || null;
}

async function gammaAiFetch(config, path, options = {}) {
  const url = `${config.gammaai_url.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.gammaai_api_key,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`GammaAi API error ${response.status}: ${errorBody || response.statusText}`);
  }

  return response.json();
}

export default async function agentBridge(req, res) {
  const { action, ...params } = req.body;

  try {
    switch (action) {
      case 'testConnection': {
        const config = await getGammaAiConfig();
        if (!config || !config.gammaai_url || !config.gammaai_api_key) {
          return res.json({ data: { success: false, message: 'GammaAi URL and API Key must be configured first' } });
        }

        try {
          const result = await gammaAiFetch(config, '/api/v1/status');
          return res.json({ data: { success: true, message: 'Connected to GammaAi successfully', details: result } });
        } catch (err) {
          return res.json({ data: { success: false, message: `Connection failed: ${err.message}` } });
        }
      }

      case 'listAgents': {
        const config = await getGammaAiConfig();
        if (!config || !config.gammaai_enabled) {
          return res.json({ data: { success: false, message: 'GammaAi integration is not enabled' } });
        }

        const result = await gammaAiFetch(config, '/api/v1/agents');
        return res.json({ data: { success: true, agents: result.data || result } });
      }

      case 'sendFeedback': {
        const config = await getGammaAiConfig();
        if (!config || !config.gammaai_enabled) {
          return res.json({ data: { success: false, message: 'GammaAi integration is not enabled' } });
        }

        const { feedback } = params;
        if (!feedback || !feedback.id) {
          return res.status(400).json({ error: 'Feedback data with id is required' });
        }

        const description = [
          `Analyze this ${feedback.type || 'general'} feedback and provide actionable recommendations.`,
          '',
          `**Title:** ${feedback.title}`,
          `**Type:** ${feedback.type || 'general'}`,
          `**Priority:** ${feedback.priority || 'medium'}`,
          `**Description:** ${feedback.description || 'No description provided'}`,
          '',
          feedback.submitter_name ? `**Submitted by:** ${feedback.submitter_name} (${feedback.submitter_email || 'no email'})` : '',
          feedback.page_url ? `**Page URL:** ${feedback.page_url}` : '',
          '',
          'Provide:',
          '1. Root cause analysis (if bug) or feasibility assessment (if feature request)',
          '2. Recommended implementation approach',
          '3. Estimated effort (low/medium/high)',
          '4. Any risks or considerations',
        ].filter(Boolean).join('\n');

        const taskPayload = {
          title: `Analyze feedback: ${feedback.title}`.slice(0, 120),
          description,
          priority: PRIORITY_MAP[feedback.priority] || 0,
          metadata: {
            source: 'projectit',
            feedback_id: feedback.id,
            feedback_type: feedback.type,
          },
        };

        // Assign to specific agent if configured
        const agentId = params.agent_id || config.gammaai_default_agent_id;
        if (agentId) {
          taskPayload.agent_id = agentId;
        }

        const result = await gammaAiFetch(config, '/api/v1/tasks', {
          method: 'POST',
          body: JSON.stringify(taskPayload),
        });

        const taskId = result.data?.id || result.id;

        // Update feedback with AI tracking fields
        await entityService.update('Feedback', feedback.id, {
          ai_task_id: taskId,
          ai_status: 'pending',
          ai_sent_at: new Date().toISOString(),
        });

        // Log to audit
        await entityService.create('AuditLog', {
          action: 'feedback_sent_to_ai',
          entity_type: 'Feedback',
          entity_id: feedback.id,
          details: `Feedback "${feedback.title}" sent to GammaAi agent for analysis (task ${taskId})`,
          user_email: req.user?.email || 'system',
          user_name: req.user?.full_name || 'System',
        });

        return res.json({ data: { success: true, task_id: taskId, message: 'Feedback sent to AI agent for analysis' } });
      }

      case 'getTaskStatus': {
        const config = await getGammaAiConfig();
        if (!config || !config.gammaai_enabled) {
          return res.json({ data: { success: false, message: 'GammaAi integration is not enabled' } });
        }

        const { task_id } = params;
        if (!task_id) {
          return res.status(400).json({ error: 'task_id is required' });
        }

        const result = await gammaAiFetch(config, `/api/v1/tasks/${task_id}`);
        const task = result.data || result;

        // If task has a result and linked feedback, update the feedback
        if (task.status === 'completed' && task.metadata?.feedback_id) {
          await entityService.update('Feedback', task.metadata.feedback_id, {
            ai_status: 'completed',
            ai_analysis: task.result || task.output_data,
            ai_completed_at: new Date().toISOString(),
          });
        } else if (task.metadata?.feedback_id) {
          await entityService.update('Feedback', task.metadata.feedback_id, {
            ai_status: task.status === 'failed' ? 'failed' : 'in_progress',
          });
        }

        return res.json({ data: { success: true, task } });
      }

      case 'receiveCallback': {
        // Webhook endpoint for GammaAi to push results back
        const webhookSecret = req.headers['x-gammaai-webhook-secret'];
        const config = await getGammaAiConfig();

        if (!config || !config.gammaai_webhook_secret) {
          return res.status(401).json({ error: 'Webhook not configured' });
        }
        if (webhookSecret !== config.gammaai_webhook_secret) {
          return res.status(401).json({ error: 'Invalid webhook secret' });
        }

        const { event, data } = params;

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
            await entityService.update('Feedback', feedbackId, { ai_status: newStatus });
          }
        }

        // Log the webhook event
        await entityService.create('AuditLog', {
          action: 'gammaai_webhook',
          entity_type: 'GammaAi',
          entity_id: data?.id || 'unknown',
          details: `Received ${event} webhook from GammaAi`,
          user_email: 'system@gammaai',
          user_name: 'GammaAi',
        });

        return res.json({ success: true, message: 'Webhook received' });
      }

      case 'saveSettings': {
        const { gammaai_url, gammaai_api_key, gammaai_webhook_secret, gammaai_enabled, gammaai_auto_send, gammaai_default_agent_id } = params;

        const existing = await entityService.filter('IntegrationSettings', { provider: 'gammaai' });
        const settingsData = {
          provider: 'gammaai',
          gammaai_url: gammaai_url || '',
          gammaai_api_key: gammaai_api_key || '',
          gammaai_webhook_secret: gammaai_webhook_secret || '',
          gammaai_enabled: gammaai_enabled || false,
          gammaai_auto_send: gammaai_auto_send || false,
          gammaai_default_agent_id: gammaai_default_agent_id || null,
          updated_at: new Date().toISOString(),
        };

        if (existing.length > 0) {
          await entityService.update('IntegrationSettings', existing[0].id, settingsData);
        } else {
          await entityService.create('IntegrationSettings', settingsData);
        }

        return res.json({ data: { success: true, message: 'GammaAi settings saved' } });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('AgentBridge error:', error);
    return res.status(500).json({ error: error.message });
  }
}

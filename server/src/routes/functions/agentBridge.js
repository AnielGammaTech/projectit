import entityService from '../../services/entityService.js';
import llmService from '../../services/llmService.js';

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

function buildFeedbackPrompt(feedback) {
  return [
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
}

/**
 * Send a single feedback item to GammaAi for analysis.
 * Used by both the direct action and auto-send.
 */
async function sendFeedbackToGammaAi(config, feedback, agentId, userEmail, userName) {
  const description = buildFeedbackPrompt(feedback);

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

  const effectiveAgentId = agentId || config.gammaai_default_agent_id;
  if (effectiveAgentId) {
    taskPayload.agent_id = effectiveAgentId;
  }

  const result = await gammaAiFetch(config, '/api/v1/tasks', {
    method: 'POST',
    body: JSON.stringify(taskPayload),
  });

  const taskId = result.data?.id || result.id;

  await entityService.update('Feedback', feedback.id, {
    ai_task_id: taskId,
    ai_status: 'pending',
    ai_sent_at: new Date().toISOString(),
    ai_provider: 'gammaai',
  });

  await entityService.create('AuditLog', {
    action: 'feedback_sent_to_ai',
    entity_type: 'Feedback',
    entity_id: feedback.id,
    details: `Feedback "${feedback.title}" sent to GammaAi agent for analysis (task ${taskId})`,
    user_email: userEmail || 'system',
    user_name: userName || 'System',
  });

  return taskId;
}

/**
 * Analyze feedback locally using the built-in Claude LLM.
 * Fallback when GammaAi is not configured.
 */
async function analyzeFeedbackLocally(feedback, userEmail, userName) {
  const prompt = buildFeedbackPrompt(feedback);

  await entityService.update('Feedback', feedback.id, {
    ai_status: 'in_progress',
    ai_sent_at: new Date().toISOString(),
    ai_provider: 'local',
  });

  const schema = {
    type: 'object',
    properties: {
      analysis: { type: 'string', description: 'Root cause analysis or feasibility assessment' },
      recommendation: { type: 'string', description: 'Recommended implementation approach' },
      effort: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Estimated effort level' },
      risks: { type: 'string', description: 'Risks or considerations' },
      category: { type: 'string', description: 'Suggested category or label' },
    },
  };

  const analysis = await llmService.invoke({
    prompt,
    response_json_schema: schema,
    feature: 'feedback_analysis',
  });

  await entityService.update('Feedback', feedback.id, {
    ai_status: 'completed',
    ai_analysis: analysis,
    ai_completed_at: new Date().toISOString(),
    ai_provider: 'local',
  });

  await entityService.create('AuditLog', {
    action: 'feedback_analyzed_locally',
    entity_type: 'Feedback',
    entity_id: feedback.id,
    details: `Feedback "${feedback.title}" analyzed by local Claude AI`,
    user_email: userEmail || 'system',
    user_name: userName || 'System',
  });

  return analysis;
}

/**
 * Auto-send hook: called after a new Feedback entity is created.
 * Checks gammaai_auto_send setting and dispatches accordingly.
 */
export async function autoSendFeedback(feedbackData) {
  try {
    const config = await getGammaAiConfig();

    // Try GammaAi first
    if (config?.gammaai_enabled && config?.gammaai_auto_send) {
      await sendFeedbackToGammaAi(config, feedbackData, null, 'system', 'Auto-send');
      return;
    }

    // If auto-send is enabled at the local level, use Claude
    if (config?.gammaai_auto_send && process.env.ANTHROPIC_API_KEY) {
      await analyzeFeedbackLocally(feedbackData, 'system', 'Auto-send');
    }
  } catch (err) {
    console.error('Auto-send feedback failed:', err);
    // Non-blocking: don't let auto-send failure break feedback creation
  }
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
        const { feedback } = params;
        if (!feedback || !feedback.id) {
          return res.status(400).json({ error: 'Feedback data with id is required' });
        }

        const config = await getGammaAiConfig();

        // If GammaAi is enabled, use it
        if (config?.gammaai_enabled) {
          const taskId = await sendFeedbackToGammaAi(
            config, feedback, params.agent_id,
            req.user?.email, req.user?.full_name
          );
          return res.json({ data: { success: true, task_id: taskId, provider: 'gammaai', message: 'Feedback sent to GammaAi agent for analysis' } });
        }

        // Fallback to local Claude AI
        if (process.env.ANTHROPIC_API_KEY) {
          const analysis = await analyzeFeedbackLocally(
            feedback, req.user?.email, req.user?.full_name
          );
          return res.json({ data: { success: true, provider: 'local', analysis, message: 'Feedback analyzed by local AI' } });
        }

        return res.json({ data: { success: false, message: 'No AI provider configured. Enable GammaAi or set ANTHROPIC_API_KEY.' } });
      }

      case 'analyzeLocal': {
        // Explicitly analyze with local Claude AI
        const { feedback } = params;
        if (!feedback || !feedback.id) {
          return res.status(400).json({ error: 'Feedback data with id is required' });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
          return res.json({ data: { success: false, message: 'ANTHROPIC_API_KEY is not configured on the server' } });
        }

        const analysis = await analyzeFeedbackLocally(
          feedback, req.user?.email, req.user?.full_name
        );
        return res.json({ data: { success: true, provider: 'local', analysis, message: 'Feedback analyzed by local AI' } });
      }

      case 'sendBatch': {
        const { feedback_ids } = params;
        if (!feedback_ids || !Array.isArray(feedback_ids) || feedback_ids.length === 0) {
          return res.status(400).json({ error: 'feedback_ids array is required' });
        }

        const config = await getGammaAiConfig();
        const hasGammaAi = config?.gammaai_enabled;
        const hasLocalAI = !!process.env.ANTHROPIC_API_KEY;

        if (!hasGammaAi && !hasLocalAI) {
          return res.json({ data: { success: false, message: 'No AI provider configured' } });
        }

        const results = { sent: 0, failed: 0, skipped: 0, errors: [] };

        for (const feedbackId of feedback_ids) {
          try {
            // Fetch full feedback data
            const feedbackItems = await entityService.filter('Feedback', { id: feedbackId });
            const fb = feedbackItems[0];
            if (!fb) {
              results.skipped++;
              continue;
            }

            // Skip if already has an active AI task
            if (fb.ai_status === 'pending' || fb.ai_status === 'in_progress') {
              results.skipped++;
              continue;
            }

            if (hasGammaAi) {
              await sendFeedbackToGammaAi(config, fb, null, req.user?.email, req.user?.full_name);
            } else {
              await analyzeFeedbackLocally(fb, req.user?.email, req.user?.full_name);
            }
            results.sent++;
          } catch (err) {
            results.failed++;
            results.errors.push({ id: feedbackId, error: err.message });
          }
        }

        const provider = hasGammaAi ? 'gammaai' : 'local';
        return res.json({
          data: {
            success: true,
            provider,
            message: `Batch complete: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`,
            ...results,
          },
        });
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
        // Legacy callback handler — prefer using /api/webhooks/gammaai
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

      case 'getConfig': {
        // Return current AI config status for the frontend
        const config = await getGammaAiConfig();
        return res.json({
          data: {
            gammaai_enabled: config?.gammaai_enabled || false,
            gammaai_auto_send: config?.gammaai_auto_send || false,
            has_local_ai: !!process.env.ANTHROPIC_API_KEY,
          },
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('AgentBridge error:', error);
    return res.status(500).json({ error: error.message });
  }
}

import llmService from '../../services/llmService.js';
import entityService from '../../services/entityService.js';
import pool from '../../config/database.js';

export default async function claudeAI(req, res) {
  const { action, ...params } = req.body;

  try {
    switch (action) {
      case 'testConnection': {
        // Verify Anthropic API key works
        const result = await llmService.invoke({
          prompt: 'Reply with exactly: {"status": "connected", "model": "claude"}',
          response_json_schema: { type: 'object', properties: { status: { type: 'string' }, model: { type: 'string' } } }
        });
        return res.json({ data: { success: true, message: 'Claude AI is connected and working', result } });
      }

      case 'analyzeDocument': {
        // Analyze an uploaded document (invoice, quote, spec sheet, etc.)
        const { fileUrl, fileName, analysisType } = params;

        const prompts = {
          invoice: `Analyze this invoice/receipt document. Extract: vendor name, date, line items (description, quantity, unit price, total), subtotal, tax, total amount, payment terms. If any field is unclear, note it as "unclear".`,
          quote: `Analyze this quote/proposal document. Extract: vendor/company name, date, valid until, line items (description, quantity, unit price, total), subtotal, total, terms and conditions summary.`,
          parts_list: `Analyze this document and extract a list of parts/materials. For each item extract: name, part number (if available), quantity, unit cost, supplier, specifications/notes.`,
          general: `Analyze this document and provide a structured summary. Extract key information including: document type, date, parties involved, key items/details, amounts (if any), and any action items.`
        };

        const prompt = `${prompts[analysisType] || prompts.general}

Document filename: ${fileName || 'unknown'}
Document URL: ${fileUrl}

Respond with structured JSON containing the extracted data.`;

        const result = await llmService.invoke({ prompt, file_urls: fileUrl ? [fileUrl] : [], feature: 'document_analysis' });
        return res.json({ data: { success: true, analysis: result } });
      }

      case 'generateProjectSummary': {
        const { projectId } = params;

        // Fetch project data
        const project = await entityService.getById('Project', projectId);
        const tasks = await entityService.filter('Task', { project_id: projectId });
        const parts = await entityService.filter('Part', { project_id: projectId });

        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const totalTasks = tasks.length;
        const totalPartsCost = parts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);

        const prompt = `Generate a concise executive summary for this IT project:

Project: ${project.name}
Client: ${project.client || 'N/A'}
Status: ${project.status}
Progress: ${project.progress || 0}%
Tasks: ${completedTasks}/${totalTasks} completed
Parts: ${parts.length} items, total cost $${totalPartsCost.toFixed(2)}
Description: ${project.description || 'No description'}

Provide a 3-4 sentence professional summary covering project health, key metrics, and any concerns. Also provide 2-3 actionable recommendations.

Respond as JSON: { "summary": "...", "health": "good|warning|critical", "recommendations": ["...", "..."] }`;

        const result = await llmService.invoke({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              health: { type: 'string' },
              recommendations: { type: 'array', items: { type: 'string' } }
            }
          },
          feature: 'project_summary'
        });

        return res.json({ data: { success: true, ...result } });
      }

      case 'suggestTasks': {
        const { projectId, context } = params;

        const project = await entityService.getById('Project', projectId);
        const existingTasks = await entityService.filter('Task', { project_id: projectId });

        const prompt = `Based on this IT project, suggest 3-5 tasks that should be created next:

Project: ${project.name}
Description: ${project.description || 'N/A'}
Current tasks: ${existingTasks.map(t => `- [${t.status}] ${t.title}`).join('\n')}
${context ? `Additional context: ${context}` : ''}

Respond as JSON: { "suggestions": [{ "title": "...", "description": "...", "priority": "low|medium|high" }] }`;

        const result = await llmService.invoke({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string' }
                  }
                }
              }
            }
          },
          feature: 'task_suggestions'
        });

        return res.json({ data: { success: true, ...result } });
      }

      case 'chat': {
        // General AI chat with project context
        const { message, projectContext } = params;

        let contextStr = '';
        if (projectContext) {
          contextStr = `\n\nProject context:\n- Project: ${projectContext.name}\n- Status: ${projectContext.status}\n- Tasks: ${projectContext.taskCount} total\n- Parts: ${projectContext.partCount} total\n`;
        }

        const prompt = `You are an AI assistant for ProjectIT, an IT project management application. Help the user with their question.${contextStr}\n\nUser: ${message}`;

        const result = await llmService.invoke({ prompt, feature: 'chat' });
        return res.json({ data: { success: true, response: result } });
      }

      case 'saveSettings': {
        const { api_key_configured, instructions } = params;
        // Save that AI is enabled (the actual API key is in env vars)
        const existing = await entityService.filter('IntegrationSettings', { provider: 'claude_ai' });
        const settingsData = {
          provider: 'claude_ai',
          enabled: true,
          api_key_configured: api_key_configured || !!process.env.ANTHROPIC_API_KEY,
          updated_at: new Date().toISOString()
        };

        // Include instructions if provided
        if (instructions !== undefined) {
          settingsData.instructions = instructions;
        }

        if (existing.length > 0) {
          await entityService.update('IntegrationSettings', existing[0].id, settingsData);
        } else {
          await entityService.create('IntegrationSettings', settingsData);
        }

        // Clear cached instructions so next AI call picks up the changes
        llmService.clearInstructionsCache();

        return res.json({ data: { success: true, message: 'Claude AI settings saved' } });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Claude AI error:', error);
    return res.status(500).json({ error: error.message });
  }
}

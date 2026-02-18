import { Router } from 'express';
import llmService from '../services/llmService.js';
import emailService from '../services/emailService.js';
import smsService from '../services/smsService.js';
import fileService, { upload } from '../services/fileService.js';
import pool from '../config/database.js';

const router = Router();

// POST /api/integrations/invoke-llm
router.post('/invoke-llm', async (req, res, next) => {
  try {
    const { prompt, response_json_schema, file_urls } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    const result = await llmService.invoke({ prompt, response_json_schema, file_urls });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/upload-file (multipart/form-data)
router.post('/upload-file', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = fileService.processUpload(req.file);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/send-email
router.post('/send-email', async (req, res, next) => {
  try {
    const { to, subject, body, from_name, from_email } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: 'to and subject are required' });
    }
    const result = await emailService.send({ to, subject, body, from_name, from_email });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/send-sms
router.post('/send-sms', async (req, res, next) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      return res.status(400).json({ error: 'to and body are required' });
    }
    const result = await smsService.send({ to, body });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/extract-data
// Extracts structured data from an uploaded file using LLM
router.post('/extract-data', async (req, res, next) => {
  try {
    const { file_url, json_schema } = req.body;
    if (!file_url) {
      return res.status(400).json({ error: 'file_url is required' });
    }
    const prompt = `Extract structured data from the file at: ${file_url}\n\nReturn the data matching the provided schema.`;
    const result = await llmService.invoke({
      prompt,
      response_json_schema: json_schema,
      file_urls: [file_url],
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/generate-image
// Placeholder — image generation can be added later
router.post('/generate-image', async (req, res, next) => {
  try {
    res.status(501).json({ error: 'Image generation not yet implemented' });
  } catch (err) {
    next(err);
  }
});

// GET /api/integrations/data-health
// Scans for orphaned records and data integrity issues (admin-only)
router.get('/data-health', async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const issues = [];

    // Define parent-child relationships to check
    const checks = [
      { child: 'Task', parent: 'Project', foreignKey: 'project_id' },
      { child: 'Part', parent: 'Project', foreignKey: 'project_id' },
      { child: 'ProjectNote', parent: 'Project', foreignKey: 'project_id' },
      { child: 'ProjectFile', parent: 'Project', foreignKey: 'project_id' },
      { child: 'FileFolder', parent: 'Project', foreignKey: 'project_id' },
      { child: 'TaskGroup', parent: 'Project', foreignKey: 'project_id' },
      { child: 'TimeEntry', parent: 'Project', foreignKey: 'project_id' },
      { child: 'ProgressUpdate', parent: 'Project', foreignKey: 'project_id' },
      { child: 'ProjectActivity', parent: 'Project', foreignKey: 'project_id' },
      { child: 'Proposal', parent: 'Project', foreignKey: 'project_id' },
      { child: 'TaskComment', parent: 'Task', foreignKey: 'task_id' },
      { child: 'Site', parent: 'Customer', foreignKey: 'customer_id' },
      { child: 'CommunicationLog', parent: 'Customer', foreignKey: 'customer_id' },
      { child: 'WorkflowLog', parent: 'Workflow', foreignKey: 'workflow_id' },
    ];

    for (const { child, parent, foreignKey } of checks) {
      const { rows } = await pool.query(`
        SELECT c.id, c.data->>'${foreignKey}' AS parent_id
        FROM "${child}" c
        WHERE c.data->>'${foreignKey}' IS NOT NULL
          AND c.data->>'${foreignKey}' != ''
          AND NOT EXISTS (
            SELECT 1 FROM "${parent}" p WHERE p.id::text = c.data->>'${foreignKey}'
          )
      `);

      if (rows.length > 0) {
        issues.push({
          type: 'orphaned_records',
          severity: 'warning',
          entity: child,
          parent_entity: parent,
          foreign_key: foreignKey,
          count: rows.length,
          orphaned_ids: rows.map(r => r.id),
        });
      }
    }

    // Check for TeamMembers without matching users
    const { rows: orphanedMembers } = await pool.query(`
      SELECT tm.id, tm.data->>'email' AS email
      FROM "TeamMember" tm
      WHERE tm.data->>'email' IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM users u WHERE u.email = tm.data->>'email'
        )
    `);
    if (orphanedMembers.length > 0) {
      issues.push({
        type: 'orphaned_team_members',
        severity: 'warning',
        entity: 'TeamMember',
        count: orphanedMembers.length,
        orphaned_emails: orphanedMembers.map(r => r.email),
      });
    }

    // Get recent deletions from AuditLog
    const { rows: recentDeletes } = await pool.query(`
      SELECT data->>'entity_type' AS entity_type,
             data->>'entity_id' AS entity_id,
             data->>'timestamp' AS deleted_at,
             created_by
      FROM "AuditLog"
      WHERE data->>'action' = 'delete'
      ORDER BY created_date DESC
      LIMIT 50
    `);

    // Table row counts
    const tables = ['Project', 'Task', 'Part', 'Customer', 'TeamMember', 'Proposal',
      'TaskComment', 'ProjectFile', 'ProjectNote', 'TimeEntry', 'Site', 'Ticket'];
    const counts = {};
    for (const table of tables) {
      const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      counts[table] = parseInt(count);
    }
    const { rows: [{ count: userCount }] } = await pool.query('SELECT COUNT(*) as count FROM users');
    counts.users = parseInt(userCount);

    res.json({
      status: issues.length === 0 ? 'healthy' : 'issues_found',
      issues,
      counts,
      recent_deletions: recentDeletes,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

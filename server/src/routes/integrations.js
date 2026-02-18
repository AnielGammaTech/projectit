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
    const result = fileService.processUpload(req.file, req);
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

// --- Database Health Check Helper ---
async function runDataHealthCheck() {
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

  // All entity tables — row counts
  const allTables = [
    'AppSettings', 'AuditLog', 'ChangeOrder', 'CommunicationLog', 'CustomRole',
    'Customer', 'DashboardView', 'EmailTemplate', 'Feedback', 'FileFolder',
    'IncomingQuote', 'IntegrationSettings', 'InventoryItem', 'InventoryTransaction',
    'NotificationSettings', 'Part', 'Product', 'ProgressUpdate', 'Project',
    'ProjectActivity', 'ProjectFile', 'ProjectNote', 'ProjectStack', 'ProjectStatus',
    'ProjectTag', 'ProjectTemplate', 'Proposal', 'ProposalSettings', 'QuoteRequest',
    'SavedReport', 'Service', 'ServiceBundle', 'Site', 'Task', 'TaskComment', 'Ticket',
    'TaskGroup', 'TeamMember', 'TimeEntry', 'UserGroup', 'UserNotification',
    'UserSecuritySettings', 'Workflow', 'WorkflowLog',
  ];
  const counts = {};
  let totalRows = 0;
  for (const table of allTables) {
    try {
      const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      const n = parseInt(count);
      counts[table] = n;
      totalRows += n;
    } catch {
      counts[table] = 0;
    }
  }
  const { rows: [{ count: userCount }] } = await pool.query('SELECT COUNT(*) as count FROM users');
  counts.users = parseInt(userCount);
  totalRows += counts.users;

  // Database size info
  const { rows: [{ db_size, db_size_pretty }] } = await pool.query(`
    SELECT pg_database_size(current_database()) AS db_size,
           pg_size_pretty(pg_database_size(current_database())) AS db_size_pretty
  `);

  // Table sizes (top tables by size)
  const { rows: tableSizes } = await pool.query(`
    SELECT relname AS table_name,
           pg_total_relation_size(quote_ident(relname)) AS total_bytes,
           pg_size_pretty(pg_total_relation_size(quote_ident(relname))) AS size_pretty
    FROM pg_class
    WHERE relkind = 'r'
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ORDER BY pg_total_relation_size(quote_ident(relname)) DESC
    LIMIT 20
  `);

  // Active connections
  const { rows: [{ connection_count }] } = await pool.query(
    `SELECT COUNT(*) AS connection_count FROM pg_stat_activity WHERE datname = current_database()`
  );

  return {
    status: issues.length === 0 ? 'healthy' : 'issues_found',
    issues,
    counts,
    total_rows: totalRows,
    database: {
      size_bytes: parseInt(db_size),
      size_pretty: db_size_pretty,
      active_connections: parseInt(connection_count),
      table_sizes: tableSizes.map(t => ({
        table: t.table_name,
        size_bytes: parseInt(t.total_bytes),
        size_pretty: t.size_pretty,
      })),
    },
    recent_deletions: recentDeletes,
    checked_at: new Date().toISOString(),
  };
}

// GET /api/integrations/data-health
// Scans for orphaned records and data integrity issues (admin-only)
router.get('/data-health', async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await runDataHealthCheck();

    // Store the check result in AppSettings for history
    try {
      const { rows: existing } = await pool.query(
        `SELECT id, data FROM "AppSettings" WHERE data->>'setting_key' = 'data_health_history'`
      );
      const history = existing[0]?.data?.checks || [];
      history.unshift({
        checked_at: result.checked_at,
        status: result.status,
        issue_count: result.issues.length,
        total_rows: result.total_rows,
        db_size: result.database.size_pretty,
      });
      // Keep last 90 checks
      if (history.length > 90) history.length = 90;

      if (existing[0]) {
        await pool.query(
          `UPDATE "AppSettings" SET data = data || $1::jsonb, updated_date = NOW() WHERE id = $2::uuid`,
          [JSON.stringify({ checks: history }), existing[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO "AppSettings" (data) VALUES ($1)`,
          [JSON.stringify({ setting_key: 'data_health_history', checks: history })]
        );
      }
    } catch (histErr) {
      console.error('Failed to store health check history:', histErr.message);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/integrations/data-health-history
// Returns stored health check history (admin-only)
router.get('/data-health-history', async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { rows } = await pool.query(
      `SELECT data FROM "AppSettings" WHERE data->>'setting_key' = 'data_health_history'`
    );
    const history = rows[0]?.data?.checks || [];
    res.json({ checks: history });
  } catch (err) {
    next(err);
  }
});

// --- Daily health check scheduler ---
// Runs every 24 hours to store health check data automatically
let dailyCheckInterval = null;
function startDailyHealthChecks() {
  // Run immediately on startup (after 30s delay to let DB connect)
  setTimeout(async () => {
    try {
      console.log('[Health Check] Running startup check...');
      await runDataHealthCheck().then(async (result) => {
        // Store result
        const { rows: existing } = await pool.query(
          `SELECT id, data FROM "AppSettings" WHERE data->>'setting_key' = 'data_health_history'`
        );
        const history = existing[0]?.data?.checks || [];
        history.unshift({
          checked_at: result.checked_at,
          status: result.status,
          issue_count: result.issues.length,
          total_rows: result.total_rows,
          db_size: result.database.size_pretty,
          automated: true,
        });
        if (history.length > 90) history.length = 90;

        if (existing[0]) {
          await pool.query(
            `UPDATE "AppSettings" SET data = data || $1::jsonb, updated_date = NOW() WHERE id = $2::uuid`,
            [JSON.stringify({ checks: history }), existing[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO "AppSettings" (data) VALUES ($1)`,
            [JSON.stringify({ setting_key: 'data_health_history', checks: history })]
          );
        }
      });
      console.log('[Health Check] Startup check complete');
    } catch (err) {
      console.error('[Health Check] Startup check failed:', err.message);
    }
  }, 30000);

  // Schedule daily check (every 24 hours)
  dailyCheckInterval = setInterval(async () => {
    try {
      console.log('[Health Check] Running daily check...');
      const result = await runDataHealthCheck();
      const { rows: existing } = await pool.query(
        `SELECT id, data FROM "AppSettings" WHERE data->>'setting_key' = 'data_health_history'`
      );
      const history = existing[0]?.data?.checks || [];
      history.unshift({
        checked_at: result.checked_at,
        status: result.status,
        issue_count: result.issues.length,
        total_rows: result.total_rows,
        db_size: result.database.size_pretty,
        automated: true,
      });
      if (history.length > 90) history.length = 90;

      if (existing[0]) {
        await pool.query(
          `UPDATE "AppSettings" SET data = data || $1::jsonb, updated_date = NOW() WHERE id = $2::uuid`,
          [JSON.stringify({ checks: history }), existing[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO "AppSettings" (data) VALUES ($1)`,
          [JSON.stringify({ setting_key: 'data_health_history', checks: history })]
        );
      }
      console.log('[Health Check] Daily check complete');
    } catch (err) {
      console.error('[Health Check] Daily check failed:', err.message);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
}

// Start the scheduler
startDailyHealthChecks();

export default router;

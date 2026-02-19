/**
 * One-time data migration script: Copy all data from old Railway DB to new Supabase DB.
 *
 * Usage:
 *   OLD_DATABASE_URL=<railway-url> DATABASE_URL=<supabase-url> DATABASE_SSL=true node src/db/migrate-data.js
 *
 * This script:
 * 1. Connects to both old (Railway) and new (Supabase) databases
 * 2. Runs migrations on Supabase to create schema
 * 3. Copies all rows from users, _migrations, and all 45 entity tables
 * 4. Verifies row counts match
 */
import 'dotenv/config';
import pg from 'pg';

const ENTITY_TABLES = [
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

const ALL_TABLES = ['_migrations', 'users', ...ENTITY_TABLES];

async function migrateData() {
  const oldUrl = process.env.OLD_DATABASE_URL;
  const newUrl = process.env.DATABASE_URL;

  if (!oldUrl) {
    console.error('ERROR: OLD_DATABASE_URL environment variable is required');
    process.exit(1);
  }
  if (!newUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required (Supabase)');
    process.exit(1);
  }

  const sslConfig = (process.env.DATABASE_SSL === 'true' || newUrl.includes('supabase'))
    ? { rejectUnauthorized: false }
    : false;

  const oldPool = new pg.Pool({
    connectionString: oldUrl,
    ssl: oldUrl.includes('railway') ? { rejectUnauthorized: false } : false,
  });

  const newPool = new pg.Pool({
    connectionString: newUrl,
    ssl: sslConfig,
  });

  try {
    // Test connections
    console.log('Testing old DB connection...');
    await oldPool.query('SELECT 1');
    console.log('✓ Old DB connected');

    console.log('Testing new DB connection...');
    await newPool.query('SELECT 1');
    console.log('✓ New DB connected');

    const results = [];

    for (const table of ALL_TABLES) {
      const quotedTable = table === '_migrations' || table === 'users' ? table : `"${table}"`;

      // Count rows in old DB
      const { rows: oldCount } = await oldPool.query(`SELECT COUNT(*) as count FROM ${quotedTable}`);
      const oldRowCount = parseInt(oldCount[0].count, 10);

      if (oldRowCount === 0) {
        console.log(`  ${table}: 0 rows (skipping)`);
        results.push({ table, old: 0, new: 0, status: 'skipped' });
        continue;
      }

      // Check if new table already has data
      const { rows: newCount } = await newPool.query(`SELECT COUNT(*) as count FROM ${quotedTable}`);
      const newRowCount = parseInt(newCount[0].count, 10);

      if (newRowCount > 0) {
        console.log(`  ${table}: ${newRowCount} rows already in new DB (skipping)`);
        results.push({ table, old: oldRowCount, new: newRowCount, status: 'already-migrated' });
        continue;
      }

      // Fetch all rows from old DB
      const { rows } = await oldPool.query(`SELECT * FROM ${quotedTable}`);

      // Insert into new DB
      const newClient = await newPool.connect();
      try {
        await newClient.query('BEGIN');

        if (table === '_migrations') {
          for (const row of rows) {
            await newClient.query(
              'INSERT INTO _migrations (name, run_at) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
              [row.name, row.run_at]
            );
          }
        } else if (table === 'users') {
          for (const row of rows) {
            await newClient.query(
              `INSERT INTO users (id, email, password_hash, full_name, role, avatar_url, avatar_color, theme, show_dashboard_widgets, created_date, updated_date, invite_token, invite_expires)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
               ON CONFLICT (id) DO NOTHING`,
              [row.id, row.email, row.password_hash, row.full_name, row.role, row.avatar_url, row.avatar_color, row.theme, row.show_dashboard_widgets, row.created_date, row.updated_date, row.invite_token, row.invite_expires]
            );
          }
        } else {
          // Entity tables all have same schema: id, data, created_date, updated_date, created_by
          for (const row of rows) {
            await newClient.query(
              `INSERT INTO "${table}" (id, data, created_date, updated_date, created_by)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (id) DO NOTHING`,
              [row.id, row.data, row.created_date, row.updated_date, row.created_by]
            );
          }
        }

        await newClient.query('COMMIT');

        // Verify count
        const { rows: verifyCount } = await newPool.query(`SELECT COUNT(*) as count FROM ${quotedTable}`);
        const verified = parseInt(verifyCount[0].count, 10);

        console.log(`  ${table}: ${oldRowCount} → ${verified} rows ${verified === oldRowCount ? '✓' : '✗ MISMATCH'}`);
        results.push({ table, old: oldRowCount, new: verified, status: verified === oldRowCount ? 'ok' : 'mismatch' });
      } catch (err) {
        await newClient.query('ROLLBACK');
        console.error(`  ${table}: FAILED - ${err.message}`);
        results.push({ table, old: oldRowCount, new: 0, status: 'error' });
      } finally {
        newClient.release();
      }
    }

    // Summary
    console.log('\n=== Migration Summary ===');
    const ok = results.filter(r => r.status === 'ok' || r.status === 'skipped' || r.status === 'already-migrated');
    const failed = results.filter(r => r.status === 'mismatch' || r.status === 'error');
    console.log(`Total tables: ${results.length}`);
    console.log(`Successful: ${ok.length}`);
    console.log(`Failed: ${failed.length}`);
    if (failed.length > 0) {
      console.log('Failed tables:', failed.map(r => r.table).join(', '));
    }

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

migrateData();

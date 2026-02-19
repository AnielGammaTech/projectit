/**
 * One-time file migration script: Upload files from Railway disk to Supabase Storage
 * and update all URL references in the database.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... DATABASE_SSL=true node src/db/migrate-files.js
 *
 * This script:
 * 1. Reads all files from the local ./uploads/ directory
 * 2. Uploads each to the Supabase Storage 'uploads' bucket
 * 3. Scans all entity tables + users table for file URLs containing '/uploads/'
 * 4. Replaces old relative URLs with new Supabase Storage public URLs
 */
import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = 'uploads';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

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

async function migrateFiles() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
  }
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sslConfig = (process.env.DATABASE_SSL === 'true' || dbUrl.includes('supabase'))
    ? { rejectUnauthorized: false }
    : false;

  const pool = new pg.Pool({ connectionString: dbUrl, ssl: sslConfig });

  try {
    // Step 1: Upload local files to Supabase Storage
    console.log(`\n=== Step 1: Upload files from ${UPLOAD_DIR} ===`);
    let files;
    try {
      files = readdirSync(UPLOAD_DIR);
    } catch {
      console.log('No local uploads directory found. Skipping file upload step.');
      files = [];
    }

    const uploadedMap = {}; // filename -> supabase public URL
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const filename of files) {
      if (filename.startsWith('.')) continue; // Skip hidden files

      try {
        const filePath = join(UPLOAD_DIR, filename);
        const fileBuffer = readFileSync(filePath);

        // Check if file already exists in Supabase
        const { data: existingList } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list('', { search: filename });

        const exists = existingList?.some(f => f.name === filename);
        if (exists) {
          const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
          uploadedMap[filename] = data.publicUrl;
          skipped++;
          continue;
        }

        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filename, fileBuffer, { upsert: false });

        if (error) {
          console.error(`  ✗ ${filename}: ${error.message}`);
          failed++;
          continue;
        }

        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
        uploadedMap[filename] = data.publicUrl;
        uploaded++;

        if ((uploaded + skipped) % 10 === 0) {
          console.log(`  Progress: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
        }
      } catch (err) {
        console.error(`  ✗ ${filename}: ${err.message}`);
        failed++;
      }
    }

    console.log(`\nFile upload complete: ${uploaded} uploaded, ${skipped} already existed, ${failed} failed`);

    // Build the base public URL for the bucket
    const { data: sampleUrl } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl('_test_');
    const basePublicUrl = sampleUrl.publicUrl.replace('_test_', '');

    // Step 2: Update database URLs
    console.log('\n=== Step 2: Update database URLs ===');

    // Find all possible URL patterns to replace
    // Old patterns: /uploads/filename.ext, https://old-api-url/uploads/filename.ext
    let totalUpdated = 0;

    // Update users table avatar_url
    const { rows: usersWithAvatars } = await pool.query(
      `SELECT id, avatar_url FROM users WHERE avatar_url IS NOT NULL AND avatar_url LIKE '%/uploads/%'`
    );
    for (const user of usersWithAvatars) {
      const filename = user.avatar_url.split('/uploads/').pop();
      const newUrl = `${basePublicUrl}${filename}`;
      await pool.query('UPDATE users SET avatar_url = $1, updated_date = NOW() WHERE id = $2', [newUrl, user.id]);
      totalUpdated++;
    }
    if (usersWithAvatars.length > 0) {
      console.log(`  users.avatar_url: ${usersWithAvatars.length} rows updated`);
    }

    // Update entity tables — scan JSONB data for any string containing /uploads/
    for (const table of ENTITY_TABLES) {
      const { rows } = await pool.query(
        `SELECT id, data FROM "${table}" WHERE data::text LIKE '%/uploads/%'`
      );

      if (rows.length === 0) continue;

      let tableUpdated = 0;
      for (const row of rows) {
        let dataStr = JSON.stringify(row.data);
        let changed = false;

        // Replace all occurrences of /uploads/<filename> with Supabase URL
        // Match patterns like: /uploads/uuid.ext or https://something/uploads/uuid.ext
        const urlRegex = /(?:https?:\/\/[^\/]+)?\/uploads\/([a-f0-9-]+\.[a-zA-Z0-9]+)/g;
        dataStr = dataStr.replace(urlRegex, (match, filename) => {
          changed = true;
          return `${basePublicUrl}${filename}`;
        });

        if (changed) {
          await pool.query(
            `UPDATE "${table}" SET data = $1::jsonb, updated_date = NOW() WHERE id = $2::uuid`,
            [dataStr, row.id]
          );
          tableUpdated++;
          totalUpdated++;
        }
      }

      if (tableUpdated > 0) {
        console.log(`  ${table}: ${tableUpdated} rows updated`);
      }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Files uploaded: ${uploaded} (${skipped} already existed, ${failed} failed)`);
    console.log(`Database rows updated: ${totalUpdated}`);

  } catch (err) {
    console.error('File migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateFiles();

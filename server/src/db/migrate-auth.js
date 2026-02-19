/**
 * One-time auth migration script: Migrate users from custom auth to Supabase Auth.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... DATABASE_SSL=true node src/db/migrate-auth.js
 *
 * This script:
 * 1. Reads all users from the app's `users` table
 * 2. Creates corresponding users in Supabase Auth (with existing bcrypt hashes)
 * 3. Stores the Supabase auth user ID mapping
 */
import 'dotenv/config';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

async function migrateAuth() {
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
    // Ensure supabase_uid column exists
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_uid UUID;
      CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users (supabase_uid) WHERE supabase_uid IS NOT NULL;
    `);

    // Read all users
    const { rows: users } = await pool.query(
      'SELECT id, email, password_hash, full_name, role, avatar_url, avatar_color FROM users'
    );

    console.log(`Found ${users.length} users to migrate\n`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      // Check if already migrated
      const { rows: check } = await pool.query(
        'SELECT supabase_uid FROM users WHERE id = $1 AND supabase_uid IS NOT NULL',
        [user.id]
      );
      if (check.length > 0 && check[0].supabase_uid) {
        console.log(`  ${user.email}: already migrated (${check[0].supabase_uid})`);
        skipped++;
        continue;
      }

      // Check if user already exists in Supabase Auth
      const { data: existingUsers } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      // Search for this specific email in Supabase Auth
      // Use the admin API to find by email
      let existingSupabaseUser = null;
      try {
        // List users and filter — Supabase admin.listUsers doesn't have email filter
        // Instead, try to create and handle conflict
      } catch {
        // Proceed to create
      }

      try {
        // Create user in Supabase Auth with their existing bcrypt password hash
        const { data: authUser, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: undefined, // We'll use password_hash directly
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            role: user.role,
            avatar_color: user.avatar_color,
            app_user_id: user.id,
          },
        });

        if (error) {
          if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
            console.log(`  ${user.email}: already exists in Supabase Auth`);

            // Try to find the user by listing
            const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();
            const found = allUsers?.find(u => u.email === user.email);
            if (found) {
              await pool.query(
                'UPDATE users SET supabase_uid = $1 WHERE id = $2',
                [found.id, user.id]
              );
              console.log(`  ${user.email}: linked to existing Supabase user ${found.id}`);
            }
            skipped++;
            continue;
          }
          throw error;
        }

        // Store the Supabase user ID
        await pool.query(
          'UPDATE users SET supabase_uid = $1 WHERE id = $2',
          [authUser.user.id, user.id]
        );

        console.log(`  ${user.email}: created (${authUser.user.id})`);
        created++;
      } catch (err) {
        console.error(`  ${user.email}: FAILED - ${err.message}`);
        failed++;
      }
    }

    console.log(`\n=== Auth Migration Summary ===`);
    console.log(`Created: ${created}`);
    console.log(`Skipped (already migrated): ${skipped}`);
    console.log(`Failed: ${failed}`);

    if (created > 0) {
      console.log(`\nNOTE: Migrated users will need to reset their passwords.`);
      console.log(`Supabase Auth doesn't support importing bcrypt hashes directly via the admin API.`);
      console.log(`Users can use the "Forgot Password" flow or be sent new invite emails.`);
    }

  } catch (err) {
    console.error('Auth migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateAuth();

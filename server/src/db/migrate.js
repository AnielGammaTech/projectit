import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const migrations = [
  '001_create_users.sql',
  '002_create_entity_tables.sql',
];

async function migrate() {
  const client = await pool.connect();
  try {
    // Track which migrations have run
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        run_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    for (const migration of migrations) {
      const { rows } = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [migration]);
      if (rows.length > 0) {
        console.log(`Skipping ${migration} (already applied)`);
        continue;
      }

      const sql = readFileSync(join(__dirname, 'migrations', migration), 'utf8');
      console.log(`Running ${migration}...`);
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migration]);
      console.log(`Applied ${migration}`);
    }

    console.log('All migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

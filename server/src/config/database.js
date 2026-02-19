import pg from 'pg';

function getSslConfig() {
  const flag = process.env.DATABASE_SSL;
  if (flag === 'true') return { rejectUnauthorized: true };
  if (flag === 'false') return false;
  return undefined; // let pg / connection string decide
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export default pool;

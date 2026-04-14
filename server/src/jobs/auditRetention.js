import pool from '../config/database.js';

const RETENTION_DAYS = 90;

/**
 * Purges AuditLog entries older than RETENTION_DAYS.
 * Should be called on a schedule (e.g., daily via setInterval).
 */
export async function purgeOldAuditLogs() {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM "AuditLog" WHERE created_date < NOW() - INTERVAL '${RETENTION_DAYS} days'`
    );
    if (rowCount > 0) {
      console.log(`[AuditRetention] Purged ${rowCount} audit log entries older than ${RETENTION_DAYS} days`);
    }
    return { purged: rowCount };
  } catch (err) {
    console.error('[AuditRetention] Failed to purge old audit logs:', err.message);
    return { purged: 0, error: err.message };
  }
}

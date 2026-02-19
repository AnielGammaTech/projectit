import pool from '../config/database.js';

// Whitelist of valid entity table names
const VALID_ENTITIES = new Set([
  'AppSettings', 'AuditLog', 'ChangeOrder', 'CommunicationLog', 'CustomRole',
  'Customer', 'DashboardView', 'EmailTemplate', 'Feedback', 'FileFolder',
  'IncomingQuote', 'IntegrationSettings', 'InventoryItem', 'InventoryTransaction',
  'NotificationSettings', 'Part', 'Product', 'ProgressUpdate', 'Project',
  'ProjectActivity', 'ProjectFile', 'ProjectNote', 'ProjectStack', 'ProjectStatus',
  'ProjectTag', 'ProjectTemplate', 'Proposal', 'ProposalSettings', 'QuoteRequest',
  'SavedReport', 'Service', 'ServiceBundle', 'Site', 'Task', 'TaskComment', 'Ticket',
  'TaskGroup', 'TeamMember', 'TimeEntry', 'UserGroup', 'UserNotification',
  'UserSecuritySettings', 'Workflow', 'WorkflowLog',
]);

function validateEntity(entityType) {
  if (!VALID_ENTITIES.has(entityType)) {
    throw Object.assign(new Error(`Invalid entity type: ${entityType}`), { status: 400 });
  }
}

// Format a DB row into the API shape: { id, ...data, created_date, updated_date }
function formatRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ...row.data,
    created_date: row.created_date,
    updated_date: row.updated_date,
    created_by: row.created_by,
  };
}

// Parse sort field: "-created_date" → { column: "created_date", direction: "DESC" }
function parseSort(sortField) {
  if (!sortField) return { column: 'created_date', direction: 'DESC' };
  if (sortField.startsWith('-')) {
    return { column: sortField.slice(1), direction: 'DESC' };
  }
  return { column: sortField, direction: 'ASC' };
}

// Build ORDER BY clause — sort on created_date/updated_date uses the column directly,
// otherwise sort on data->>field
function buildOrderBy(sortField) {
  const { column, direction } = parseSort(sortField);
  const metaColumns = ['created_date', 'updated_date', 'created_by', 'id'];
  if (metaColumns.includes(column)) {
    return `ORDER BY "${column}" ${direction}`;
  }
  return `ORDER BY data->>'${column}' ${direction}`;
}

// Translate MongoDB-style filter object to PostgreSQL WHERE conditions
// Supports: direct equality, $ne, $in, $nin, $gt, $gte, $lt, $lte, $exists, $regex
function buildWhereClause(filterObj, paramOffset = 1) {
  const conditions = [];
  const values = [];
  let paramIdx = paramOffset;

  for (const [field, value] of Object.entries(filterObj)) {
    // If the field is "id", query the id column directly
    if (field === 'id') {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Operator on id
        for (const [op, opVal] of Object.entries(value)) {
          switch (op) {
            case '$in':
              conditions.push(`id = ANY($${paramIdx}::uuid[])`);
              values.push(opVal);
              paramIdx++;
              break;
            case '$nin':
              conditions.push(`id != ALL($${paramIdx}::uuid[])`);
              values.push(opVal);
              paramIdx++;
              break;
            case '$ne':
              conditions.push(`id != $${paramIdx}::uuid`);
              values.push(opVal);
              paramIdx++;
              break;
            default:
              break;
          }
        }
      } else {
        conditions.push(`id = $${paramIdx}::uuid`);
        values.push(value);
        paramIdx++;
      }
      continue;
    }

    // Meta columns (created_date, updated_date)
    const metaColumns = ['created_date', 'updated_date'];
    if (metaColumns.includes(field)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const [op, opVal] of Object.entries(value)) {
          const pgOp = { $gt: '>', $gte: '>=', $lt: '<', $lte: '<=', $ne: '!=' }[op];
          if (pgOp) {
            conditions.push(`"${field}" ${pgOp} $${paramIdx}`);
            values.push(opVal);
            paramIdx++;
          }
        }
      } else {
        conditions.push(`"${field}" = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
      continue;
    }

    // JSONB field queries
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Has operators like { $ne: 'archived' }
      for (const [op, opVal] of Object.entries(value)) {
        switch (op) {
          case '$ne':
            conditions.push(`(data->>'${field}' IS NULL OR data->>'${field}' != $${paramIdx})`);
            values.push(String(opVal));
            paramIdx++;
            break;
          case '$in':
            conditions.push(`data->>'${field}' = ANY($${paramIdx})`);
            values.push(opVal.map(String));
            paramIdx++;
            break;
          case '$nin':
            conditions.push(`(data->>'${field}' IS NULL OR data->>'${field}' != ALL($${paramIdx}))`);
            values.push(opVal.map(String));
            paramIdx++;
            break;
          case '$gt':
            conditions.push(`(data->>'${field}')::numeric > $${paramIdx}`);
            values.push(opVal);
            paramIdx++;
            break;
          case '$gte':
            conditions.push(`(data->>'${field}')::numeric >= $${paramIdx}`);
            values.push(opVal);
            paramIdx++;
            break;
          case '$lt':
            conditions.push(`(data->>'${field}')::numeric < $${paramIdx}`);
            values.push(opVal);
            paramIdx++;
            break;
          case '$lte':
            conditions.push(`(data->>'${field}')::numeric <= $${paramIdx}`);
            values.push(opVal);
            paramIdx++;
            break;
          case '$exists':
            if (opVal) {
              conditions.push(`data ? '${field}'`);
            } else {
              conditions.push(`NOT (data ? '${field}')`);
            }
            break;
          case '$regex':
            conditions.push(`data->>'${field}' ~* $${paramIdx}`);
            values.push(opVal);
            paramIdx++;
            break;
          default:
            break;
        }
      }
    } else if (value === null) {
      conditions.push(`(data->>'${field}' IS NULL)`);
    } else if (typeof value === 'boolean') {
      conditions.push(`(data->>'${field}')::boolean = $${paramIdx}`);
      values.push(value);
      paramIdx++;
    } else if (typeof value === 'number') {
      // Numbers: try exact text match first (handles integers and floats)
      conditions.push(`data->>'${field}' = $${paramIdx}`);
      values.push(String(value));
      paramIdx++;
    } else {
      // String equality
      conditions.push(`data->>'${field}' = $${paramIdx}`);
      values.push(String(value));
      paramIdx++;
    }
  }

  return { conditions, values };
}

// Cascade delete map: when deleting a parent entity, also delete children
// Key = parent entity type, Value = array of { entity, foreignKey } to cascade
const CASCADE_MAP = {
  Project: [
    { entity: 'Task', foreignKey: 'project_id' },
    { entity: 'Part', foreignKey: 'project_id' },
    { entity: 'ProjectNote', foreignKey: 'project_id' },
    { entity: 'ProjectFile', foreignKey: 'project_id' },
    { entity: 'FileFolder', foreignKey: 'project_id' },
    { entity: 'TaskGroup', foreignKey: 'project_id' },
    { entity: 'TimeEntry', foreignKey: 'project_id' },
    { entity: 'ProgressUpdate', foreignKey: 'project_id' },
    { entity: 'ProjectActivity', foreignKey: 'project_id' },
    { entity: 'Proposal', foreignKey: 'project_id' },
    { entity: 'ChangeOrder', foreignKey: 'project_id' },
  ],
  Task: [
    { entity: 'TaskComment', foreignKey: 'task_id' },
  ],
  Part: [
    { entity: 'TaskComment', foreignKey: 'task_id' },
  ],
  Customer: [
    { entity: 'Site', foreignKey: 'customer_id' },
    { entity: 'CommunicationLog', foreignKey: 'customer_id' },
  ],
  TaskGroup: [
    // Ungroup tasks instead of deleting them
  ],
  Workflow: [
    { entity: 'WorkflowLog', foreignKey: 'workflow_id' },
  ],
};

// Log a delete action to AuditLog for traceability
async function logDeletion(client, entityType, id, data, deletedBy) {
  try {
    await client.query(
      `INSERT INTO "AuditLog" (data, created_by) VALUES ($1, $2)`,
      [JSON.stringify({
        action: 'delete',
        entity_type: entityType,
        entity_id: id,
        deleted_data: data,
        timestamp: new Date().toISOString(),
      }), deletedBy || 'system']
    );
  } catch {
    // Don't let audit log failure block the delete
  }
}

/**
 * Build SQL condition + values for project-based access filtering.
 * accessFilter = { projectIds: string[], scope: 'project'|'child'|'indirect', entityType: string }
 * paramOffset = next available $N index
 * Returns { condition: string|null, values: any[] }
 */
function buildAccessCondition(accessFilter, paramOffset) {
  if (!accessFilter || !accessFilter.projectIds) return { condition: null, values: [] };
  const { projectIds, scope, entityType } = accessFilter;
  const idx = paramOffset;

  if (scope === 'project') {
    // Filter Project table by id
    return { condition: `id = ANY($${idx}::uuid[])`, values: [projectIds] };
  }
  if (scope === 'child') {
    // Filter child entities by data->>'project_id'
    return { condition: `data->>'project_id' = ANY($${idx}::text[])`, values: [projectIds] };
  }
  if (scope === 'indirect') {
    // TaskComment etc — subquery through parent entity
    const parentEntity = entityType === 'TaskComment' ? 'Task' : null;
    const foreignKey = entityType === 'TaskComment' ? 'task_id' : null;
    if (parentEntity && foreignKey) {
      return {
        condition: `data->>'${foreignKey}' IN (SELECT id::text FROM "${parentEntity}" WHERE data->>'project_id' = ANY($${idx}::text[]))`,
        values: [projectIds],
      };
    }
  }
  return { condition: null, values: [] };
}

const entityService = {
  async list(entityType, sortField, limit, accessFilter) {
    validateEntity(entityType);
    const orderBy = buildOrderBy(sortField);
    const limitClause = limit ? `LIMIT ${parseInt(limit, 10)}` : '';

    const { condition: accessCond, values: accessVals } = buildAccessCondition(accessFilter, 1);
    const whereClause = accessCond ? `WHERE ${accessCond}` : '';

    const { rows } = await pool.query(
      `SELECT * FROM "${entityType}" ${whereClause} ${orderBy} ${limitClause}`,
      accessVals
    );
    return rows.map(formatRow);
  },

  async filter(entityType, filterObj, sortField, limit, accessFilter) {
    validateEntity(entityType);
    const { conditions, values } = buildWhereClause(filterObj || {});

    // Append access filter condition after the user's filter conditions
    const { condition: accessCond, values: accessVals } = buildAccessCondition(accessFilter, values.length + 1);
    if (accessCond) {
      conditions.push(accessCond);
      values.push(...accessVals);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = buildOrderBy(sortField);
    const limitClause = limit ? `LIMIT ${parseInt(limit, 10)}` : '';

    const { rows } = await pool.query(
      `SELECT * FROM "${entityType}" ${whereClause} ${orderBy} ${limitClause}`,
      values
    );
    return rows.map(formatRow);
  },

  async create(entityType, data, userId) {
    validateEntity(entityType);
    const { rows } = await pool.query(
      `INSERT INTO "${entityType}" (data, created_by) VALUES ($1, $2) RETURNING *`,
      [JSON.stringify(data), userId || null]
    );
    return formatRow(rows[0]);
  },

  async update(entityType, id, patchData) {
    validateEntity(entityType);
    const { rows } = await pool.query(
      `UPDATE "${entityType}" SET data = data || $1::jsonb, updated_date = NOW() WHERE id = $2::uuid RETURNING *`,
      [JSON.stringify(patchData), id]
    );
    if (rows.length === 0) {
      throw Object.assign(new Error('Record not found'), { status: 404 });
    }
    return formatRow(rows[0]);
  },

  async delete(entityType, id, deletedBy) {
    validateEntity(entityType);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch the record before deleting (for audit log)
      const { rows: existing } = await client.query(
        `SELECT * FROM "${entityType}" WHERE id = $1::uuid`,
        [id]
      );
      if (existing.length === 0) {
        throw Object.assign(new Error('Record not found'), { status: 404 });
      }

      const record = existing[0];
      const cascadedDeletes = [];

      // Cascade delete children
      const cascades = CASCADE_MAP[entityType] || [];
      for (const { entity, foreignKey } of cascades) {
        const { rows: children } = await client.query(
          `SELECT id, data FROM "${entity}" WHERE data->>'${foreignKey}' = $1`,
          [id]
        );
        if (children.length > 0) {
          // Recursively cascade (e.g., Task → TaskComment)
          for (const child of children) {
            const subCascades = CASCADE_MAP[entity] || [];
            for (const { entity: subEntity, foreignKey: subKey } of subCascades) {
              const { rowCount: subCount } = await client.query(
                `DELETE FROM "${subEntity}" WHERE data->>'${subKey}' = $1`,
                [child.id]
              );
              if (subCount > 0) cascadedDeletes.push({ entity: subEntity, count: subCount });
            }
          }

          const { rowCount } = await client.query(
            `DELETE FROM "${entity}" WHERE data->>'${foreignKey}' = $1`,
            [id]
          );
          cascadedDeletes.push({ entity, count: rowCount });
        }
      }

      // Delete the parent record
      await client.query(
        `DELETE FROM "${entityType}" WHERE id = $1::uuid`,
        [id]
      );

      // Audit log
      await logDeletion(client, entityType, id, {
        ...record.data,
        _cascaded: cascadedDeletes,
      }, deletedBy);

      await client.query('COMMIT');
      return { success: true, cascaded: cascadedDeletes };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async bulkCreate(entityType, dataArray, userId) {
    validateEntity(entityType);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const data of dataArray) {
        const { rows } = await client.query(
          `INSERT INTO "${entityType}" (data, created_by) VALUES ($1, $2) RETURNING *`,
          [JSON.stringify(data), userId || null]
        );
        results.push(formatRow(rows[0]));
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

export default entityService;

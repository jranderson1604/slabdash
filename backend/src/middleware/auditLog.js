const db = require('../db');

/**
 * Log a user action to the audit_logs table.
 * Safe to call without await — errors are swallowed.
 *
 * @param {object} opts
 * @param {number}  opts.companyId
 * @param {number}  opts.userId
 * @param {string}  opts.action      e.g. 'created', 'updated', 'deleted'
 * @param {string}  opts.entityType  e.g. 'submission', 'customer', 'card'
 * @param {*}       [opts.entityId]
 * @param {object}  [opts.details]   any extra JSON data
 * @param {string}  [opts.ip]
 */
async function auditLog({ companyId, userId, action, entityType, entityId, details, ip }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [companyId, userId, action, entityType, entityId || null, details ? JSON.stringify(details) : null, ip || null]
    );
  } catch {
    // Audit logs should never crash the main flow
  }
}

/**
 * Express middleware factory — automatically logs requests that mutate data.
 * Usage: router.post('/', authenticate, auditMiddleware('submission', 'created'), handler)
 */
function auditMiddleware(entityType, action, getEntityId = null) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Only log on success
      if (res.statusCode < 300) {
        const entityId = getEntityId ? getEntityId(data) : data?.id || data?.submission?.id || data?.customer?.id;
        auditLog({
          companyId: req.user?.company_id,
          userId: req.user?.id,
          action,
          entityType,
          entityId,
          ip: req.ip || req.headers['x-forwarded-for'],
        }).catch(() => {});
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = { auditLog, auditMiddleware };

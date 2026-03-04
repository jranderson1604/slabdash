const db = require('../db');

const DEFAULT_CONFIG = {
  enabled: false,
  points_per_card: 10,
  points_per_dollar: 0,
  redemption_rate: 100, // points per $1 discount
  min_redemption_points: 100,
  welcome_bonus_points: 50,
};

async function getConfig(companyId) {
  const result = await db.query(
    'SELECT * FROM points_config WHERE company_id = $1',
    [companyId]
  );
  if (result.rows.length === 0) {
    // Return defaults without inserting (lazy creation on first save)
    return { company_id: companyId, ...DEFAULT_CONFIG };
  }
  return result.rows[0];
}

async function upsertConfig(companyId, updates) {
  const fields = ['enabled', 'points_per_card', 'points_per_dollar', 'redemption_rate', 'min_redemption_points', 'welcome_bonus_points'];
  const allowed = {};
  for (const f of fields) {
    if (updates[f] !== undefined) allowed[f] = updates[f];
  }

  const keys = Object.keys(allowed);
  if (keys.length === 0) return getConfig(companyId);

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = [companyId, ...Object.values(allowed)];

  const result = await db.query(
    `INSERT INTO points_config (company_id, ${keys.join(', ')}, updated_at)
     VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')}, NOW())
     ON CONFLICT (company_id) DO UPDATE SET ${setClauses}, updated_at = NOW()
     RETURNING *`,
    values
  );
  return result.rows[0];
}

async function awardPoints(companyId, customerId, amount, type, refType, refId, description, createdBy) {
  if (!customerId || amount <= 0) return null;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const tx = await client.query(
      `INSERT INTO points_transactions
        (company_id, customer_id, amount, type, reference_type, reference_id, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [companyId, customerId, amount, type, refType || null, refId || null, description, createdBy || null]
    );

    await client.query(
      `UPDATE customers
       SET points_balance = COALESCE(points_balance, 0) + $1,
           lifetime_points_earned = COALESCE(lifetime_points_earned, 0) + $1
       WHERE id = $2`,
      [amount, customerId]
    );

    await client.query('COMMIT');
    return tx.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function redeemPoints(companyId, customerId, amount, description, createdBy) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const balanceResult = await client.query(
      'SELECT COALESCE(points_balance, 0) as balance FROM customers WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [customerId, companyId]
    );

    if (balanceResult.rows.length === 0) throw { status: 404, message: 'Customer not found' };
    const balance = parseInt(balanceResult.rows[0].balance, 10);
    if (balance < amount) throw { status: 400, message: `Insufficient points. Balance: ${balance}` };

    const tx = await client.query(
      `INSERT INTO points_transactions
        (company_id, customer_id, amount, type, description, created_by)
       VALUES ($1, $2, $3, 'redeem', $4, $5)
       RETURNING *`,
      [companyId, customerId, -amount, description, createdBy || null]
    );

    await client.query(
      `UPDATE customers SET points_balance = points_balance - $1 WHERE id = $2`,
      [amount, customerId]
    );

    await client.query('COMMIT');
    return tx.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Call this after a submission is created — fire and forget
async function awardSubmissionPoints(companyId, customerId, submissionId, cardCount) {
  try {
    if (!customerId) return;
    const config = await getConfig(companyId);
    if (!config.enabled) return;

    const perCard = parseInt(config.points_per_card, 10) || 0;
    if (perCard > 0 && cardCount > 0) {
      const pts = perCard * cardCount;
      await awardPoints(
        companyId, customerId, pts,
        'earn_submission', 'submission', submissionId,
        `${cardCount} card${cardCount > 1 ? 's' : ''} submitted for grading`,
        null
      );
    }

    // Welcome bonus: check if this is first submission
    const welcomePts = parseInt(config.welcome_bonus_points, 10) || 0;
    if (welcomePts > 0) {
      const prior = await db.query(
        `SELECT COUNT(*) FROM points_transactions
         WHERE customer_id = $1 AND company_id = $2 AND type = 'welcome_bonus'`,
        [customerId, companyId]
      );
      if (parseInt(prior.rows[0].count, 10) === 0) {
        await awardPoints(
          companyId, customerId, welcomePts,
          'welcome_bonus', null, null,
          'Welcome bonus — first submission',
          null
        );
      }
    }
  } catch (err) {
    console.error('[Points] Failed to award submission points:', err.message);
  }
}

module.exports = { getConfig, upsertConfig, awardPoints, redeemPoints, awardSubmissionPoints };

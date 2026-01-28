const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@slabdash.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
    console.log('✅ Web Push configured with VAPID keys');
} else {
    console.warn('⚠️  VAPID keys not configured - push notifications will not work');
}

/**
 * Subscribe to push notifications
 */
router.post('/subscribe', authenticate, async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.id;
        const companyId = req.user.company_id;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: 'Invalid subscription data' });
        }

        const userAgent = req.headers['user-agent'] || 'Unknown';

        // Store subscription in database
        await db.query(
            `INSERT INTO push_subscriptions (user_id, company_id, endpoint, p256dh_key, auth_key, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (endpoint)
             DO UPDATE SET
                user_id = $1,
                company_id = $2,
                p256dh_key = $4,
                auth_key = $5,
                user_agent = $6,
                last_used_at = CURRENT_TIMESTAMP`,
            [
                userId,
                companyId,
                subscription.endpoint,
                subscription.keys.p256dh,
                subscription.keys.auth,
                userAgent
            ]
        );

        console.log(`✓ Push subscription saved for user ${userId}`);

        res.json({
            success: true,
            message: 'Push notification subscription saved'
        });
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({
            error: 'Failed to save push subscription',
            details: error.message
        });
    }
});

/**
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', authenticate, async (req, res) => {
    try {
        const { endpoint } = req.body;
        const userId = req.user.id;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint is required' });
        }

        await db.query(
            `DELETE FROM push_subscriptions
             WHERE endpoint = $1 AND user_id = $2`,
            [endpoint, userId]
        );

        console.log(`✓ Push subscription removed for user ${userId}`);

        res.json({
            success: true,
            message: 'Push notification subscription removed'
        });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({
            error: 'Failed to remove push subscription',
            details: error.message
        });
    }
});

/**
 * Get subscription status
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            `SELECT id, endpoint, created_at, last_used_at
             FROM push_subscriptions
             WHERE user_id = $1
             ORDER BY last_used_at DESC`,
            [userId]
        );

        res.json({
            subscribed: result.rows.length > 0,
            subscriptions: result.rows.map(sub => ({
                id: sub.id,
                endpoint: sub.endpoint.substring(0, 50) + '...',
                created_at: sub.created_at,
                last_used_at: sub.last_used_at
            }))
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Failed to check subscription status',
            details: error.message
        });
    }
});

/**
 * Send test push notification
 */
router.post('/test', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's push subscriptions
        const result = await db.query(
            `SELECT endpoint, p256dh_key, auth_key
             FROM push_subscriptions
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No push subscriptions found' });
        }

        const payload = JSON.stringify({
            title: 'SlabDash Test Notification',
            body: 'Push notifications are working! You will receive updates when your submissions progress.',
            icon: '/images/logo-icon-alt.png.svg',
            badge: '/images/logo-icon-alt.png.svg',
            data: {
                url: '/'
            }
        });

        let sentCount = 0;
        let failedCount = 0;

        // Send to all user's subscriptions
        for (const sub of result.rows) {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh_key,
                        auth: sub.auth_key
                    }
                }, payload);

                sentCount++;
                console.log(`✓ Test push sent to user ${userId}`);
            } catch (error) {
                failedCount++;
                console.error(`✗ Failed to send test push:`, error.message);

                // Remove invalid subscriptions
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await db.query(
                        `DELETE FROM push_subscriptions WHERE endpoint = $1`,
                        [sub.endpoint]
                    );
                    console.log('Removed invalid subscription');
                }
            }
        }

        res.json({
            success: true,
            message: `Test notification sent to ${sentCount} device(s)`,
            sent: sentCount,
            failed: failedCount
        });
    } catch (error) {
        console.error('Test push error:', error);
        res.status(500).json({
            error: 'Failed to send test notification',
            details: error.message
        });
    }
});

/**
 * Send push notification to specific user (internal use)
 */
async function sendPushToUser(userId, payload) {
    try {
        // Get user's push subscriptions
        const result = await db.query(
            `SELECT endpoint, p256dh_key, auth_key
             FROM push_subscriptions
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            console.log(`No push subscriptions for user ${userId}`);
            return { sent: 0, failed: 0 };
        }

        let sentCount = 0;
        let failedCount = 0;

        // Send to all user's subscriptions
        for (const sub of result.rows) {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh_key,
                        auth: sub.auth_key
                    }
                }, JSON.stringify(payload));

                sentCount++;
                console.log(`✓ Push sent to user ${userId}`);

                // Update last used timestamp
                await db.query(
                    `UPDATE push_subscriptions SET last_used_at = CURRENT_TIMESTAMP WHERE endpoint = $1`,
                    [sub.endpoint]
                );
            } catch (error) {
                failedCount++;
                console.error(`✗ Failed to send push:`, error.message);

                // Remove invalid subscriptions
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await db.query(
                        `DELETE FROM push_subscriptions WHERE endpoint = $1`,
                        [sub.endpoint]
                    );
                    console.log('Removed invalid subscription');
                }
            }
        }

        return { sent: sentCount, failed: failedCount };
    } catch (error) {
        console.error('sendPushToUser error:', error);
        return { sent: 0, failed: 0, error: error.message };
    }
}

/**
 * Send push notification to all users in a company
 */
async function sendPushToCompany(companyId, payload) {
    try {
        // Get all user IDs in the company
        const result = await db.query(
            `SELECT DISTINCT user_id
             FROM push_subscriptions
             WHERE company_id = $1`,
            [companyId]
        );

        let totalSent = 0;
        let totalFailed = 0;

        for (const row of result.rows) {
            const stats = await sendPushToUser(row.user_id, payload);
            totalSent += stats.sent;
            totalFailed += stats.failed;
        }

        return { sent: totalSent, failed: totalFailed };
    } catch (error) {
        console.error('sendPushToCompany error:', error);
        return { sent: 0, failed: 0, error: error.message };
    }
}

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
module.exports.sendPushToCompany = sendPushToCompany;

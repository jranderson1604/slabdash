/**
 * Scheduler - Cron jobs for automated tasks
 * Smart priority-based PSA refresh runs every 2 hours to stay well under PSA rate limits
 */

const cron = require('node-cron');
const scheduledRefreshService = require('./services/scheduledRefreshService');
const { isRateLimited } = require('./services/psaService');

/**
 * Initialize all cron jobs
 */
function initializeScheduler() {
  console.log('Initializing scheduler...');

  // Smart PSA refresh every 2 hours
  // Only refreshes submissions whose priority interval has elapsed
  // (e.g., Express orders every 4h, Bulk every 8-12h)
  // Runs at minute 15 to avoid top-of-hour traffic
  cron.schedule('15 */2 * * *', async () => {
    const rl = isRateLimited();
    if (rl.limited) {
      console.log(`[Cron] Skipped — PSA rate limited for ${rl.retryAfterMin} more minutes`);
      return;
    }
    console.log('[Cron] Running smart refresh check');
    try {
      await scheduledRefreshService.runSmartRefresh();
    } catch (error) {
      console.error('[Cron] Smart refresh error:', error.message);
    }
  });

  // Daily grades digest — runs every hour, sends email when it's the company's configured hour
  cron.schedule('0 * * * *', async () => {
    try {
      await scheduledRefreshService.sendDailyDigests();
    } catch (error) {
      console.error('[Cron] Daily digest error:', error.message);
    }
  });

  console.log('Scheduler initialized (smart refresh every 2 hours, daily digest check every hour)');
}

module.exports = {
  initializeScheduler
};

/**
 * Scheduler - Cron jobs for automated tasks
 * Smart priority-based PSA refresh runs every 30 minutes
 */

const cron = require('node-cron');
const scheduledRefreshService = require('./services/scheduledRefreshService');
const { isRateLimited } = require('./services/psaService');

/**
 * Initialize all cron jobs
 */
function initializeScheduler() {
  console.log('Initializing scheduler...');

  // Smart PSA refresh every 30 minutes
  // Only refreshes submissions whose priority interval has elapsed
  // (e.g., Express orders every 2-3h, Bulk every 6-8h)
  cron.schedule('*/30 * * * *', async () => {
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

  console.log('Scheduler initialized (smart refresh every 30 min)');
}

module.exports = {
  initializeScheduler
};

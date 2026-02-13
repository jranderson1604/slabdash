/**
 * Scheduler - Cron jobs for automated tasks
 * Smart priority-based PSA refresh runs every 15 minutes
 */

const cron = require('node-cron');
const scheduledRefreshService = require('./services/scheduledRefreshService');

/**
 * Initialize all cron jobs
 */
function initializeScheduler() {
  console.log('Initializing scheduler...');

  // Smart PSA refresh every 15 minutes
  // Only refreshes submissions whose priority interval has elapsed
  // (e.g., Express orders every 2-3h, Bulk every 6-8h)
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Running smart refresh check');
    try {
      await scheduledRefreshService.runSmartRefresh();
    } catch (error) {
      console.error('[Cron] Smart refresh error:', error);
    }
  });

  console.log('✓ Smart refresh job registered (runs every 15 min)');
  console.log('Scheduler initialized successfully');
}

module.exports = {
  initializeScheduler
};

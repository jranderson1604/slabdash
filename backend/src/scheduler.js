/**
 * Scheduler - Cron jobs for automated tasks
 * Runs scheduled PSA refreshes and other background jobs
 */

const cron = require('node-cron');
const scheduledRefreshService = require('./services/scheduledRefreshService');

/**
 * Initialize all cron jobs
 */
function initializeScheduler() {
  console.log('Initializing scheduler...');

  // Run scheduled PSA refreshes every hour
  // This checks if any company's refresh should run based on their schedule
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running hourly scheduled refresh check');
    try {
      await scheduledRefreshService.runScheduledRefreshes();
    } catch (error) {
      console.error('[Cron] Scheduled refresh error:', error);
    }
  });

  console.log('✓ Scheduled refresh job registered (runs hourly)');

  // You can add more cron jobs here as needed
  // Examples:
  // - Daily database cleanup
  // - Weekly report generation
  // - Monthly billing tasks

  console.log('Scheduler initialized successfully');
}

module.exports = {
  initializeScheduler
};

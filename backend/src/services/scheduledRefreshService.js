/**
 * Scheduled Refresh Service
 * Handles automatic PSA submission refreshes based on company schedules
 * Sends email reports to admins with refresh results
 */

const db = require('../db');
const psaService = require('./psaService');
const emailService = require('./emailService');

/**
 * Check if a refresh should run for a company based on their schedule
 * @param {Object} company - Company record with auto_refresh settings
 * @returns {boolean} Whether refresh should run now
 */
function shouldRunRefresh(company) {
  if (!company.auto_refresh_enabled) {
    return false;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getHours();

  // Check if we're in the correct hour
  if (currentHour !== company.auto_refresh_hour) {
    return false;
  }

  // Check last refresh time to prevent duplicate runs in the same hour
  if (company.last_auto_refresh) {
    const lastRefresh = new Date(company.last_auto_refresh);
    const hoursSinceLastRefresh = (now - lastRefresh) / (1000 * 60 * 60);

    // Don't run if we already ran in the last hour
    if (hoursSinceLastRefresh < 1) {
      return false;
    }
  }

  // Check schedule type
  switch (company.auto_refresh_schedule) {
    case 'daily':
      return true; // Run every day at the specified hour

    case 'weekly':
      return currentDay === company.auto_refresh_day_of_week;

    case 'biweekly':
      // Check if it's the correct day and if 14 days have passed
      if (currentDay !== company.auto_refresh_day_of_week) {
        return false;
      }
      if (company.last_auto_refresh) {
        const daysSinceLastRefresh = (now - new Date(company.last_auto_refresh)) / (1000 * 60 * 60 * 24);
        return daysSinceLastRefresh >= 14;
      }
      return true; // First run

    default:
      return false;
  }
}

/**
 * Format refresh report as HTML email
 */
function formatEmailReport(companyName, results, changeLog) {
  const { totalSubmissions, updatedCount, errorCount } = results;

  const changesHtml = changeLog
    .filter(c => c.hadChanges)
    .map(change => {
      const stepChange = change.stepChanged ? `<br><strong>Step:</strong> ${change.previousStep} → ${change.newStep}` : '';
      const progressChange = change.progressChanged ? `<br><strong>Progress:</strong> ${change.previousProgress}% → ${change.newProgress}% (${change.progressDelta > 0 ? '+' : ''}${change.progressDelta}%)` : '';
      const gradeStatus = change.gradesReady ? '<br><span style="color: #10b981; font-weight: bold;">✓ Grades Ready!</span>' : '';
      const shippedStatus = change.shipped ? '<br><span style="color: #3b82f6; font-weight: bold;">✓ Shipped!</span>' : '';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: 600;">${change.submissionNumber}</td>
          <td style="padding: 12px;">
            ${change.statusChanged ? change.newStatus : 'No change'}
            ${stepChange}
            ${progressChange}
            ${gradeStatus}
            ${shippedStatus}
          </td>
        </tr>
      `;
    })
    .join('');

  const noChangesHtml = changeLog.filter(c => !c.hadChanges).length > 0 ? `
    <p style="margin: 20px 0; color: #6b7280;">
      <strong>${changeLog.filter(c => !c.hadChanges).length}</strong> submissions had no updates.
    </p>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #ffffff; padding: 30px 20px; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat { text-align: center; padding: 15px; background: #f9fafb; border-radius: 8px; flex: 1; margin: 0 5px; }
        .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 12px 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 PSA Refresh Report</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${companyName}</p>
        </div>

        <div class="content">
          <p>Your automatic PSA submission refresh has completed. Here's what changed:</p>

          <div class="stats">
            <div class="stat">
              <div class="stat-value">${totalSubmissions}</div>
              <div class="stat-label">Total Checked</div>
            </div>
            <div class="stat">
              <div class="stat-value">${updatedCount}</div>
              <div class="stat-label">Updated</div>
            </div>
            <div class="stat">
              <div class="stat-value" style="color: ${errorCount > 0 ? '#ef4444' : '#10b981'};">${errorCount}</div>
              <div class="stat-label">Errors</div>
            </div>
          </div>

          ${changeLog.filter(c => c.hadChanges).length > 0 ? `
            <h2 style="margin-top: 30px; color: #1f2937;">Updated Submissions</h2>
            <table>
              <thead>
                <tr>
                  <th>Submission #</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                ${changesHtml}
              </tbody>
            </table>
          ` : '<p style="margin: 20px 0; color: #6b7280;">No submissions were updated in this refresh.</p>'}

          ${noChangesHtml}

          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            This is an automated report. You can view the full CSV report in your SlabDash dashboard.
          </p>
        </div>

        <div class="footer">
          <p>SlabDash PSA Management System</p>
          <p style="margin: 5px 0 0 0;">Automated at ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Run refresh for a specific company
 * @param {Object} company - Company record
 * @param {string} psaApiKey - PSA API key for the company
 */
async function runCompanyRefresh(company, psaApiKey) {
  console.log(`Running scheduled refresh for company: ${company.name} (ID: ${company.id})`);

  try {
    // Get all active submissions for this company
    const submissionsResult = await db.query(
      `SELECT id, psa_submission_number, psa_order_number, shipped
       FROM submissions
       WHERE company_id = $1 AND shipped = false
       ORDER BY created_at DESC`,
      [company.id]
    );

    const submissions = submissionsResult.rows;

    if (submissions.length === 0) {
      console.log(`No active submissions for company ${company.name}`);
      return {
        success: true,
        totalSubmissions: 0,
        updatedCount: 0,
        errorCount: 0,
        changeLog: []
      };
    }

    console.log(`Found ${submissions.length} active submissions to refresh`);

    let updatedCount = 0;
    let errorCount = 0;
    const changeLog = [];

    // Refresh each submission
    for (const submission of submissions) {
      if (!submission.psa_submission_number && !submission.psa_order_number) {
        console.log(`Skipping submission ${submission.id} - no PSA number`);
        continue;
      }

      try {
        const orderNumber = submission.psa_submission_number || submission.psa_order_number;

        // Get submission progress from PSA
        const progress = await psaService.getSubmissionProgress(psaApiKey, orderNumber);

        if (!progress || !progress.data) {
          errorCount++;
          changeLog.push({
            submissionNumber: orderNumber,
            hadChanges: false,
            error: 'Failed to fetch progress from PSA'
          });
          continue;
        }

        const data = progress.data;

        // Parse the data
        const parsed = {
          currentStep: data.CurrentStep || '',
          progressPercent: data.ProgressPercent || 0,
          gradesReady: data.GradesComplete === true || data.ProgressPercent === 100,
          shipped: submission.shipped // Keep existing shipped status unless PSA says otherwise
        };

        // Check for changes
        const prevResult = await db.query(
          'SELECT current_step, progress_percent, grades_ready, shipped FROM submissions WHERE id = $1',
          [submission.id]
        );
        const prev = prevResult.rows[0];

        const changes = {
          submissionNumber: orderNumber,
          hadChanges: false,
          stepChanged: prev.current_step !== parsed.currentStep,
          progressChanged: prev.progress_percent !== parsed.progressPercent,
          gradesReady: parsed.gradesReady && !prev.grades_ready,
          shipped: parsed.shipped && !prev.shipped,
          previousStep: prev.current_step,
          newStep: parsed.currentStep,
          previousProgress: prev.progress_percent,
          newProgress: parsed.progressPercent,
          progressDelta: parsed.progressPercent - prev.progress_percent
        };

        changes.hadChanges = changes.stepChanged || changes.progressChanged || changes.gradesReady || changes.shipped;

        if (changes.hadChanges) {
          // Update submission in database
          await db.query(
            `UPDATE submissions
             SET current_step = $1,
                 progress_percent = $2,
                 grades_ready = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [parsed.currentStep, parsed.progressPercent, parsed.gradesReady, submission.id]
          );

          updatedCount++;
        }

        changeLog.push(changes);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error refreshing submission ${submission.id}:`, error);
        errorCount++;
        changeLog.push({
          submissionNumber: submission.psa_submission_number || submission.psa_order_number,
          hadChanges: false,
          error: error.message
        });
      }
    }

    // Store refresh log in database
    await db.query(
      `INSERT INTO psa_refresh_logs (company_id, total_submissions, updated_count, error_count, change_log, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [company.id, submissions.length, updatedCount, errorCount, JSON.stringify(changeLog)]
    );

    // Update last_auto_refresh timestamp
    await db.query(
      'UPDATE companies SET last_auto_refresh = NOW() WHERE id = $1',
      [company.id]
    );

    console.log(`Refresh complete: ${updatedCount} updated, ${errorCount} errors`);

    return {
      success: true,
      totalSubmissions: submissions.length,
      updatedCount,
      errorCount,
      changeLog
    };

  } catch (error) {
    console.error(`Company refresh error:`, error);
    throw error;
  }
}

/**
 * Send email report to company admin
 */
async function sendRefreshReport(company, results, changeLog) {
  try {
    const emailTo = company.auto_refresh_email || company.owner_email;

    if (!emailTo) {
      console.log(`No email configured for company ${company.name}, skipping email report`);
      return;
    }

    const htmlContent = formatEmailReport(company.name, results, changeLog);
    const subject = `PSA Refresh Report - ${results.updatedCount} Updates`;

    await emailService.sendEmail({
      to: emailTo,
      subject,
      html: htmlContent,
      companyId: company.id
    });

    console.log(`Sent refresh report email to ${emailTo}`);
  } catch (error) {
    console.error('Failed to send refresh report email:', error);
    // Don't throw - email failure shouldn't stop the refresh
  }
}

/**
 * Main function to check all companies and run refreshes
 * This should be called by a cron job every hour
 */
async function runScheduledRefreshes() {
  console.log('Checking for scheduled PSA refreshes...');

  try {
    // Get all companies with auto_refresh_enabled = true
    const companiesResult = await db.query(
      `SELECT c.id, c.name, c.psa_api_key, c.auto_refresh_enabled, c.auto_refresh_schedule,
              c.auto_refresh_day_of_week, c.auto_refresh_hour, c.auto_refresh_email,
              c.last_auto_refresh, u.email as owner_email
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id AND u.role = 'owner'
       WHERE c.auto_refresh_enabled = true`
    );

    const companies = companiesResult.rows;

    if (companies.length === 0) {
      console.log('No companies with auto-refresh enabled');
      return;
    }

    console.log(`Found ${companies.length} companies with auto-refresh enabled`);

    for (const company of companies) {
      if (!shouldRunRefresh(company)) {
        console.log(`Skipping ${company.name} - not scheduled for this time`);
        continue;
      }

      if (!company.psa_api_key) {
        console.log(`Skipping ${company.name} - no PSA API key configured`);
        continue;
      }

      console.log(`Running refresh for ${company.name}...`);

      try {
        const results = await runCompanyRefresh(company, company.psa_api_key);
        await sendRefreshReport(company, results, results.changeLog);
      } catch (error) {
        console.error(`Failed to refresh ${company.name}:`, error);
      }
    }

    console.log('Scheduled refresh check complete');
  } catch (error) {
    console.error('Scheduled refresh error:', error);
  }
}

module.exports = {
  runScheduledRefreshes,
  runCompanyRefresh,
  sendRefreshReport,
  shouldRunRefresh
};

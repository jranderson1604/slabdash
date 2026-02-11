/**
 * Scheduled Refresh Service
 * Handles automatic PSA submission refreshes based on company schedules
 * Sends email reports to admins with CSV attachment showing updates
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

  // Check schedule type (default to weekly if not set)
  const schedule = company.auto_refresh_schedule || 'weekly';

  switch (schedule) {
    case 'daily':
      return true; // Run every day at the specified hour

    case 'weekly':
      return currentDay === (company.auto_refresh_day_of_week ?? 1); // Default Monday

    case 'biweekly':
      // Check if it's the correct day and if 14 days have passed
      if (currentDay !== (company.auto_refresh_day_of_week ?? 1)) {
        return false;
      }
      if (company.last_auto_refresh) {
        const daysSinceLastRefresh = (now - new Date(company.last_auto_refresh)) / (1000 * 60 * 60 * 24);
        return daysSinceLastRefresh >= 14;
      }
      return true; // First run

    default:
      // Treat unknown schedules as weekly
      return currentDay === (company.auto_refresh_day_of_week ?? 1);
  }
}

/**
 * Generate CSV content from refresh change log
 * @param {Array} changeLog - Array of change objects from refresh
 * @param {Array} submissions - Full submission records for additional context
 * @returns {string} CSV content
 */
function generateRefreshCSV(changeLog, submissions) {
  const submissionMap = {};
  for (const sub of submissions) {
    const num = sub.psa_submission_number || sub.psa_order_number;
    if (num) submissionMap[num] = sub;
  }

  const headers = [
    'Submission #',
    'Service Level',
    'Previous Step',
    'Current Step',
    'Step Changed',
    'Previous Progress',
    'Current Progress',
    'Progress Change',
    'Grades Ready',
    'Shipped',
    'Status'
  ];

  const rows = changeLog.map(change => {
    const sub = submissionMap[change.submissionNumber] || {};
    const serviceLevel = sub.service_level || '';

    if (change.error) {
      return [
        change.submissionNumber,
        serviceLevel,
        '', '', '',
        '', '', '',
        '', '',
        `Error: ${change.error}`
      ];
    }

    return [
      change.submissionNumber,
      serviceLevel,
      change.previousStep || '',
      change.newStep || '',
      change.stepChanged ? 'Yes' : 'No',
      change.previousProgress != null ? `${change.previousProgress}%` : '',
      change.newProgress != null ? `${change.newProgress}%` : '',
      change.progressDelta ? `${change.progressDelta > 0 ? '+' : ''}${change.progressDelta}%` : '0%',
      change.gradesReady ? 'Yes' : 'No',
      change.shipped ? 'Yes' : 'No',
      change.hadChanges ? 'Updated' : 'No Change'
    ];
  });

  // Escape CSV values
  const escapeCSV = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ];

  return csvLines.join('\n');
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
      const gradeStatus = change.gradesReady ? '<br><span style="color: #10b981; font-weight: bold;">Grades Ready!</span>' : '';
      const shippedStatus = change.shipped ? '<br><span style="color: #3b82f6; font-weight: bold;">Shipped!</span>' : '';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: 600;">${change.submissionNumber}</td>
          <td style="padding: 12px;">
            ${change.stepChanged ? `${change.previousStep} → ${change.newStep}` : 'No step change'}
            ${progressChange}
            ${gradeStatus}
            ${shippedStatus}
          </td>
        </tr>
      `;
    })
    .join('');

  const noChangesCount = changeLog.filter(c => !c.hadChanges && !c.error).length;
  const noChangesHtml = noChangesCount > 0 ? `
    <p style="margin: 20px 0; color: #6b7280;">
      <strong>${noChangesCount}</strong> submission${noChangesCount !== 1 ? 's' : ''} had no updates.
    </p>
  ` : '';

  const errorEntries = changeLog.filter(c => c.error);
  const errorsHtml = errorEntries.length > 0 ? `
    <h2 style="margin-top: 30px; color: #ef4444;">Errors (${errorEntries.length})</h2>
    <ul style="color: #6b7280;">
      ${errorEntries.map(e => `<li>${e.submissionNumber}: ${e.error}</li>`).join('')}
    </ul>
  ` : '';

  const reportDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a1a2e 0%, #2d2b55 100%); color: white; padding: 30px 20px; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 5px 0 0 0; opacity: 0.8; font-size: 14px; }
        .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat { text-align: center; padding: 15px; background: #f9fafb; border-radius: 8px; flex: 1; margin: 0 5px; }
        .stat-value { font-size: 28px; font-weight: bold; color: #FF8170; }
        .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; font-size: 13px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 13px; color: #6b7280; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none; }
        .csv-note { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-top: 20px; font-size: 13px; color: #166534; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PSA Weekly Refresh Report</h1>
          <p>${companyName} &mdash; ${reportDate}</p>
        </div>

        <div class="content">
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${totalSubmissions}</div>
              <div class="stat-label">Checked</div>
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

          ${updatedCount > 0 ? `
            <h2 style="margin-top: 30px; color: #1f2937; font-size: 16px;">Updated Submissions</h2>
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
          ` : '<p style="margin: 20px 0; color: #6b7280;">No submissions were updated this week.</p>'}

          ${noChangesHtml}
          ${errorsHtml}

          <div class="csv-note">
            A detailed CSV report is attached to this email with the full breakdown of all submissions.
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0;">SlabDash PSA Management</p>
          <p style="margin: 4px 0 0 0; font-size: 12px;">Automated weekly refresh report</p>
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
    // Get all active submissions for this company (include service_level for CSV)
    const submissionsResult = await db.query(
      `SELECT id, psa_submission_number, psa_order_number, shipped, service_level
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
        changeLog: [],
        submissions: []
      };
    }

    console.log(`Found ${submissions.length} active submissions to refresh`);

    let updatedCount = 0;
    let errorCount = 0;
    const changeLog = [];

    // Refresh each submission using the shared updateSubmissionFromPsa
    for (const submission of submissions) {
      if (!submission.psa_submission_number && !submission.psa_order_number) {
        console.log(`Skipping submission ${submission.id} - no PSA number`);
        continue;
      }

      try {
        const orderNumber = submission.psa_submission_number || submission.psa_order_number;

        // Get submission progress from PSA
        const progress = await psaService.getSubmissionProgress(psaApiKey, orderNumber);

        if (!progress || !progress.success || !progress.data) {
          errorCount++;
          changeLog.push({
            submissionNumber: orderNumber,
            hadChanges: false,
            error: progress?.error || 'Failed to fetch progress from PSA'
          });
          continue;
        }

        // Use the unified updateSubmissionFromPsa (handles steps, milestones, cert auto-fetch, emails)
        const { parsed, changes } = await psaService.updateSubmissionFromPsa(submission.id, progress.data);

        if (changes.hadChanges) updatedCount++;
        changeLog.push(changes);

        // Rate limiting between PSA API calls
        await new Promise(resolve => setTimeout(resolve, 300));

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
      changeLog,
      submissions
    };

  } catch (error) {
    console.error(`Company refresh error:`, error);
    throw error;
  }
}

/**
 * Send email report with CSV attachment to company admin
 */
async function sendRefreshReport(company, results, changeLog) {
  try {
    const emailTo = company.auto_refresh_email || company.owner_email;

    if (!emailTo) {
      console.log(`No email configured for company ${company.name}, skipping email report`);
      return;
    }

    const htmlContent = formatEmailReport(company.name, results, changeLog);
    const subject = `PSA Refresh Report — ${results.updatedCount} Update${results.updatedCount !== 1 ? 's' : ''} | ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Generate CSV attachment
    const csvContent = generateRefreshCSV(changeLog, results.submissions || []);
    const dateStr = new Date().toISOString().split('T')[0];
    const csvFilename = `psa-refresh-report-${dateStr}.csv`;

    await emailService.sendEmail({
      to: emailTo,
      subject,
      html: htmlContent,
      companyId: company.id,
      attachments: [
        {
          filename: csvFilename,
          content: Buffer.from(csvContent, 'utf-8'),
          contentType: 'text/csv'
        }
      ]
    });

    console.log(`Sent refresh report email with CSV to ${emailTo}`);
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
    // Use a safe query that handles missing columns (migration may not have run)
    let companiesResult;
    try {
      companiesResult = await db.query(
        `SELECT c.id, c.name, c.psa_api_key, c.auto_refresh_enabled, c.auto_refresh_schedule,
                c.auto_refresh_day_of_week, c.auto_refresh_hour, c.auto_refresh_email,
                c.last_auto_refresh, u.email as owner_email
         FROM companies c
         LEFT JOIN users u ON u.company_id = c.id AND u.role = 'owner'
         WHERE c.auto_refresh_enabled = true`
      );
    } catch (queryErr) {
      if (queryErr.code === '42703') {
        // auto_refresh columns don't exist yet — migration 021 hasn't run
        console.log('Auto-refresh columns not found in DB. Run migration 021_add_auto_refresh_schedule.sql');
        return;
      }
      throw queryErr;
    }

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
  shouldRunRefresh,
  generateRefreshCSV
};

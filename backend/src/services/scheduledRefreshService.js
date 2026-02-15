/**
 * Smart Scheduled Refresh Service
 *
 * Priority-based auto-refresh: each submission is refreshed at a frequency
 * determined by its current state, service level, and urgency.
 *
 * Priority tiers:
 *   Urgent  (2-4h)  — Problem orders, express early stages
 *   High    (3h)    — Express/premium tiers in active processing
 *   Medium  (6-8h)  — Standard tiers in active processing
 *   Low     (12h)   — Grades Ready, QA Checks on standard tiers
 *   None    (skip)  — Shipped / picked up
 *
 * Also sends daily digest emails when changes are detected,
 * and weekly summary emails with CSV attachment.
 */

const db = require('../db');
const psaService = require('./psaService');
const emailService = require('./emailService');

// ============================================
// SMART REFRESH ENGINE
// ============================================

/**
 * Run smart refresh for all companies with auto-refresh enabled.
 * Called by cron every 15 minutes. Only refreshes submissions
 * whose priority interval has elapsed since their last refresh.
 */
async function runSmartRefresh() {
  // Check global rate limit before doing anything
  const rl = psaService.isRateLimited();
  if (rl.limited) {
    console.log(`[SmartRefresh] Skipped — PSA rate limited for ${rl.retryAfterMin} more minutes`);
    return;
  }

  console.log('[SmartRefresh] Starting priority-based refresh cycle...');

  let companiesResult;
  try {
    companiesResult = await db.query(
      `SELECT c.id, c.name, c.psa_api_key, c.auto_refresh_enabled,
              c.auto_refresh_email, c.last_auto_refresh,
              u.email as owner_email
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id AND u.role = 'owner'
       WHERE c.auto_refresh_enabled = true AND c.psa_api_key IS NOT NULL`
    );
  } catch (queryErr) {
    if (queryErr.code === '42703') {
      console.log('[SmartRefresh] Auto-refresh columns not found — migration needed');
      return;
    }
    throw queryErr;
  }

  if (companiesResult.rows.length === 0) {
    console.log('[SmartRefresh] No companies with auto-refresh enabled');
    return;
  }

  // Deduplicate: if multiple companies share the same PSA API key, only refresh
  // the first one found (avoids doubling API calls against the same PSA account).
  const seenKeys = new Set();
  const companies = [];
  for (const company of companiesResult.rows) {
    if (seenKeys.has(company.psa_api_key)) {
      console.log(`[SmartRefresh] Skipping ${company.name} — duplicate PSA API key (already refreshing another company with same key)`);
      continue;
    }
    seenKeys.add(company.psa_api_key);
    companies.push(company);
  }

  for (const company of companies) {
    try {
      await refreshCompanySubmissions(company);
    } catch (error) {
      console.error(`[SmartRefresh] Error for ${company.name}:`, error.message);
    }
  }

  console.log('[SmartRefresh] Cycle complete');
}

/**
 * Refresh submissions for a single company based on per-submission priority.
 */
async function refreshCompanySubmissions(company) {
  // Get all active submissions with their current state
  const subsResult = await db.query(
    `SELECT id, psa_submission_number, psa_order_number, current_step, service_level,
            progress_percent, shipped, picked_up, problem_order, grades_ready,
            last_refreshed_at, last_api_update, created_at
     FROM submissions
     WHERE company_id = $1
       AND psa_submission_number IS NOT NULL
       AND (shipped = false OR (shipped = true AND last_refreshed_at > NOW() - INTERVAL '7 days'))
     ORDER BY created_at DESC`,
    [company.id]
  );

  if (subsResult.rows.length === 0) return;

  const now = Date.now();
  const dueForRefresh = [];

  for (const sub of subsResult.rows) {
    // Skip shipped+picked up
    if (sub.shipped && sub.picked_up) continue;

    const priority = psaService.getRefreshPriority(sub);
    if (priority.hours === 0) continue;

    // Check if enough time has passed since last refresh
    const lastRefresh = sub.last_refreshed_at ? new Date(sub.last_refreshed_at).getTime() : 0;
    const hoursSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60);

    if (hoursSinceRefresh >= priority.hours) {
      dueForRefresh.push({ ...sub, priority });
    }
  }

  if (dueForRefresh.length === 0) return;

  // Sort by priority: urgent first, then high, medium, low
  const tierOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  dueForRefresh.sort((a, b) => (tierOrder[a.priority.tier] || 9) - (tierOrder[b.priority.tier] || 9));

  // Cap at 30 per company per cycle to stay under daily API limits
  const maxPerCycle = 30;
  if (dueForRefresh.length > maxPerCycle) {
    console.log(`[SmartRefresh] ${company.name}: Capping from ${dueForRefresh.length} to ${maxPerCycle} (highest priority first)`);
    dueForRefresh.length = maxPerCycle;
  }

  console.log(`[SmartRefresh] ${company.name}: ${dueForRefresh.length}/${subsResult.rows.length} submissions due for refresh`);

  let updatedCount = 0;
  let errorCount = 0;
  const changeLog = [];

  for (const sub of dueForRefresh) {
    // Check rate limit before each request
    if (psaService.isRateLimited().limited) {
      console.log(`[SmartRefresh] Rate limited — stopping refresh for ${company.name}`);
      break;
    }

    const orderNumber = sub.psa_submission_number || sub.psa_order_number;
    try {
      // batch: true uses 10s spacing to stay safely under PSA limits
      const result = await psaService.getSubmissionProgress(company.psa_api_key, orderNumber, { batch: true });

      // Stop immediately on rate limit
      if (result.rateLimited) {
        console.log(`[SmartRefresh] Rate limited for ${company.name}, stopping this cycle`);
        break;
      }

      if (result.success && result.data) {
        const { changes } = await psaService.updateSubmissionFromPsa(sub.id, result.data);
        if (changes.hadChanges) updatedCount++;
        changeLog.push(changes);
      } else {
        errorCount++;
        changeLog.push({ submissionNumber: orderNumber, hadChanges: false, error: result.error || 'Unknown' });
      }

    } catch (error) {
      errorCount++;
      changeLog.push({ submissionNumber: orderNumber, hadChanges: false, error: error.message });
    }
  }

  // Update company last_auto_refresh
  await db.query('UPDATE companies SET last_auto_refresh = NOW() WHERE id = $1', [company.id]);

  // Log the refresh
  if (changeLog.length > 0) {
    try {
      await db.query(
        `INSERT INTO psa_refresh_logs (company_id, total_submissions, updated_count, error_count, change_log, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [company.id, dueForRefresh.length, updatedCount, errorCount, JSON.stringify(changeLog)]
      );
    } catch (e) { /* table may not exist */ }
  }

  // Send notification if there were actual changes
  const changesDetected = changeLog.filter(c => c.hadChanges);
  if (changesDetected.length > 0) {
    console.log(`[SmartRefresh] ${company.name}: ${changesDetected.length} submissions updated`);
  }

  return { updatedCount, errorCount, changeLog, totalRefreshed: dueForRefresh.length };
}

// ============================================
// LEGACY SCHEDULE SUPPORT
// ============================================

/**
 * Check if a refresh should run for a company based on their schedule.
 * Still used by the manual "Send Weekly Update" button.
 */
function shouldRunRefresh(company) {
  if (!company.auto_refresh_enabled) return false;

  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  if (currentHour !== company.auto_refresh_hour) return false;

  if (company.last_auto_refresh) {
    const hoursSince = (now - new Date(company.last_auto_refresh)) / (1000 * 60 * 60);
    if (hoursSince < 1) return false;
  }

  const schedule = company.auto_refresh_schedule || 'weekly';
  switch (schedule) {
    case 'daily': return true;
    case 'weekly': return currentDay === (company.auto_refresh_day_of_week ?? 1);
    case 'biweekly':
      if (currentDay !== (company.auto_refresh_day_of_week ?? 1)) return false;
      if (company.last_auto_refresh) {
        const days = (now - new Date(company.last_auto_refresh)) / (1000 * 60 * 60 * 24);
        return days >= 14;
      }
      return true;
    default: return currentDay === (company.auto_refresh_day_of_week ?? 1);
  }
}

// ============================================
// CSV & EMAIL REPORTS
// ============================================

function generateRefreshCSV(changeLog, submissions) {
  const submissionMap = {};
  for (const sub of submissions) {
    const num = sub.psa_submission_number || sub.psa_order_number;
    if (num) submissionMap[num] = sub;
  }

  const headers = [
    'Submission #', 'Service Level', 'Previous Step', 'Current Step', 'Step Changed',
    'Previous Progress', 'Current Progress', 'Progress Change',
    'Grades Ready', 'Shipped', 'Status'
  ];

  const rows = changeLog.map(change => {
    const sub = submissionMap[change.submissionNumber] || {};
    if (change.error) {
      return [change.submissionNumber, sub.service_level || '', '', '', '', '', '', '', '', '', `Error: ${change.error}`];
    }
    return [
      change.submissionNumber, sub.service_level || '',
      change.previousStep || '', change.newStep || '',
      change.stepChanged ? 'Yes' : 'No',
      change.previousProgress != null ? `${change.previousProgress}%` : '',
      change.newProgress != null ? `${change.newProgress}%` : '',
      change.progressDelta ? `${change.progressDelta > 0 ? '+' : ''}${change.progressDelta}%` : '0%',
      change.gradesReady ? 'Yes' : 'No',
      change.shipped ? 'Yes' : 'No',
      change.hadChanges ? 'Updated' : 'No Change'
    ];
  });

  const escapeCSV = (val) => {
    const str = String(val ?? '');
    return (str.includes(',') || str.includes('"') || str.includes('\n')) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  return [headers.map(escapeCSV).join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n');
}

function formatEmailReport(companyName, results, changeLog) {
  const { totalSubmissions, updatedCount, errorCount } = results;

  const changesHtml = changeLog
    .filter(c => c.hadChanges)
    .map(change => {
      const progressChange = change.progressChanged ? `<br><strong>Progress:</strong> ${change.previousProgress}% → ${change.newProgress}%` : '';
      const gradeStatus = change.gradesReady ? '<br><span style="color: #10b981; font-weight: bold;">Grades Ready!</span>' : '';
      const shippedStatus = change.shipped ? '<br><span style="color: #3b82f6; font-weight: bold;">Shipped!</span>' : '';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: 600;">${change.submissionNumber}</td>
          <td style="padding: 12px;">
            ${change.stepChanged ? `${change.previousStep} → ${change.newStep}` : 'No step change'}
            ${progressChange}${gradeStatus}${shippedStatus}
          </td>
        </tr>`;
    })
    .join('');

  const noChangesCount = changeLog.filter(c => !c.hadChanges && !c.error).length;
  const noChangesHtml = noChangesCount > 0 ? `<p style="margin: 20px 0; color: #6b7280;"><strong>${noChangesCount}</strong> submission${noChangesCount !== 1 ? 's' : ''} had no updates.</p>` : '';

  const errorEntries = changeLog.filter(c => c.error);
  const errorsHtml = errorEntries.length > 0 ? `
    <h2 style="margin-top: 30px; color: #ef4444;">Errors (${errorEntries.length})</h2>
    <ul style="color: #6b7280;">${errorEntries.map(e => `<li>${e.submissionNumber}: ${e.error}</li>`).join('')}</ul>` : '';

  const reportDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
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
    </style></head><body>
    <div class="container">
      <div class="header">
        <h1>PSA Refresh Report</h1>
        <p>${companyName} &mdash; ${reportDate}</p>
      </div>
      <div class="content">
        <div class="stats">
          <div class="stat"><div class="stat-value">${totalSubmissions}</div><div class="stat-label">Checked</div></div>
          <div class="stat"><div class="stat-value">${updatedCount}</div><div class="stat-label">Updated</div></div>
          <div class="stat"><div class="stat-value" style="color: ${errorCount > 0 ? '#ef4444' : '#10b981'};">${errorCount}</div><div class="stat-label">Errors</div></div>
        </div>
        ${updatedCount > 0 ? `
          <h2 style="margin-top: 30px; color: #1f2937; font-size: 16px;">Updated Submissions</h2>
          <table><thead><tr><th>Submission #</th><th>Changes</th></tr></thead><tbody>${changesHtml}</tbody></table>
        ` : '<p style="margin: 20px 0; color: #6b7280;">No submissions were updated.</p>'}
        ${noChangesHtml}${errorsHtml}
        <div class="csv-note">A detailed CSV report is attached to this email.</div>
      </div>
      <div class="footer">
        <p style="margin: 0;">SlabDash PSA Management</p>
        <p style="margin: 4px 0 0 0; font-size: 12px;">Automated refresh report</p>
      </div>
    </div></body></html>`;
}

/**
 * Run refresh for a specific company (used by manual "Send Weekly Update")
 */
async function runCompanyRefresh(company, psaApiKey) {
  // Check rate limit before starting
  const rl = psaService.isRateLimited();
  if (rl.limited) {
    console.log(`[Refresh] Skipped ${company.name} — PSA rate limited for ${rl.retryAfterMin} more minutes`);
    return { success: false, totalSubmissions: 0, updatedCount: 0, errorCount: 0, changeLog: [], submissions: [], rateLimited: true, retryAfterMin: rl.retryAfterMin };
  }

  console.log(`[Refresh] Running full refresh for ${company.name} (ID: ${company.id})`);

  const submissionsResult = await db.query(
    `SELECT id, psa_submission_number, psa_order_number, shipped, service_level
     FROM submissions
     WHERE company_id = $1 AND shipped = false
     ORDER BY created_at DESC`,
    [company.id]
  );

  const submissions = submissionsResult.rows;
  if (submissions.length === 0) {
    return { success: true, totalSubmissions: 0, updatedCount: 0, errorCount: 0, changeLog: [], submissions: [] };
  }

  let updatedCount = 0;
  let errorCount = 0;
  const changeLog = [];

  for (const submission of submissions) {
    if (!submission.psa_submission_number && !submission.psa_order_number) continue;

    // Check rate limit before each request
    if (psaService.isRateLimited().limited) {
      console.log(`[Refresh] Rate limited — stopping refresh for ${company.name}`);
      break;
    }

    try {
      const orderNumber = submission.psa_submission_number || submission.psa_order_number;
      const progress = await psaService.getSubmissionProgress(psaApiKey, orderNumber, { batch: true });

      // Stop immediately on rate limit
      if (progress.rateLimited) {
        console.log(`[Refresh] Rate limited for ${company.name}, stopping`);
        break;
      }

      if (!progress || !progress.success || !progress.data) {
        errorCount++;
        changeLog.push({ submissionNumber: orderNumber, hadChanges: false, error: progress?.error || 'Failed to fetch' });
        continue;
      }

      const { changes } = await psaService.updateSubmissionFromPsa(submission.id, progress.data);
      if (changes.hadChanges) updatedCount++;
      changeLog.push(changes);
    } catch (error) {
      errorCount++;
      changeLog.push({
        submissionNumber: submission.psa_submission_number || submission.psa_order_number,
        hadChanges: false, error: error.message
      });
    }
  }

  // Store refresh log
  await db.query(
    `INSERT INTO psa_refresh_logs (company_id, total_submissions, updated_count, error_count, change_log, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [company.id, submissions.length, updatedCount, errorCount, JSON.stringify(changeLog)]
  );

  await db.query('UPDATE companies SET last_auto_refresh = NOW() WHERE id = $1', [company.id]);

  return { success: true, totalSubmissions: submissions.length, updatedCount, errorCount, changeLog, submissions };
}

/**
 * Send email report with CSV attachment
 */
async function sendRefreshReport(company, results, changeLog) {
  try {
    const emailTo = company.auto_refresh_email || company.owner_email;
    if (!emailTo) return;

    const htmlContent = formatEmailReport(company.name, results, changeLog);
    const subject = `PSA Refresh Report — ${results.updatedCount} Update${results.updatedCount !== 1 ? 's' : ''} | ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const csvContent = generateRefreshCSV(changeLog, results.submissions || []);
    const csvFilename = `psa-refresh-report-${new Date().toISOString().split('T')[0]}.csv`;

    await emailService.sendEmail({
      to: emailTo,
      subject,
      html: htmlContent,
      companyId: company.id,
      attachments: [{ filename: csvFilename, content: Buffer.from(csvContent, 'utf-8'), contentType: 'text/csv' }]
    });

    console.log(`Sent refresh report email to ${emailTo}`);
  } catch (error) {
    console.error('Failed to send refresh report email:', error.message);
  }
}

/**
 * Legacy: Run scheduled refreshes based on company schedules.
 * Now also calls runSmartRefresh() for priority-based refresh.
 */
async function runScheduledRefreshes() {
  // Smart refresh handles per-submission priority
  await runSmartRefresh();
}

module.exports = {
  runScheduledRefreshes,
  runSmartRefresh,
  runCompanyRefresh,
  sendRefreshReport,
  shouldRunRefresh,
  generateRefreshCSV,
  refreshCompanySubmissions,
};

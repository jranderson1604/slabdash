const axios = require('axios');
const db = require('../db');

const PSA_API_BASE = process.env.PSA_API_BASE || 'https://api.psacard.com/publicapi';

// ============================================
// GLOBAL RATE LIMIT & THROTTLE TRACKING
// ============================================
let _rateLimitedUntil = 0; // Unix timestamp (ms) when rate limit expires
let _lastRequestAt = 0;    // Unix timestamp (ms) of last PSA API request
const MIN_REQUEST_INTERVAL_MS = 1500; // 1.5s between single user-initiated requests
const BATCH_INTERVAL_MS = 10000;      // 10s between requests during batch refreshes
const MAX_COOLDOWN_MS = 15 * 60 * 1000; // Cap cooldown at 15 minutes max
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 min default cooldown on 429

// Daily API call tracking — resets at midnight UTC
let _dailyCallCount = 0;
let _dailyCallDate = new Date().toISOString().split('T')[0];
const DAILY_CALL_LIMIT = 500; // Conservative daily limit

/**
 * Check if we're currently rate limited by PSA.
 * Returns { limited: true, retryAfterMs, retryAfterMin } or { limited: false }.
 */
const isRateLimited = () => {
    const now = Date.now();
    if (_rateLimitedUntil > now) {
        const retryAfterMs = _rateLimitedUntil - now;
        return { limited: true, retryAfterMs, retryAfterMin: Math.ceil(retryAfterMs / 60000) };
    }
    return { limited: false };
};

/**
 * Wait until the minimum interval between requests has elapsed.
 * Uses short interval for single user-initiated requests.
 */
const throttle = async () => {
    const now = Date.now();
    const elapsed = now - _lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
        const waitMs = MIN_REQUEST_INTERVAL_MS - elapsed;
        await new Promise(r => setTimeout(r, waitMs));
    }
    _lastRequestAt = Date.now();
    _trackDailyCall();
};

/**
 * Longer throttle for batch operations (refresh-all, scheduled refresh).
 * 10 seconds between requests keeps us safely under PSA limits.
 */
const batchThrottle = async () => {
    const now = Date.now();
    const elapsed = now - _lastRequestAt;
    if (elapsed < BATCH_INTERVAL_MS) {
        const waitMs = BATCH_INTERVAL_MS - elapsed;
        await new Promise(r => setTimeout(r, waitMs));
    }
    _lastRequestAt = Date.now();
    _trackDailyCall();
};

/** Track daily API calls and reset counter at midnight UTC. */
const _trackDailyCall = () => {
    const today = new Date().toISOString().split('T')[0];
    if (today !== _dailyCallDate) {
        _dailyCallCount = 0;
        _dailyCallDate = today;
    }
    _dailyCallCount++;
};

/** Get current daily API usage stats. */
const getDailyUsage = () => ({
    callsToday: _dailyCallCount,
    limit: DAILY_CALL_LIMIT,
    remaining: Math.max(0, DAILY_CALL_LIMIT - _dailyCallCount),
    nearLimit: _dailyCallCount >= DAILY_CALL_LIMIT * 0.8,
    atLimit: _dailyCallCount >= DAILY_CALL_LIMIT,
});

/**
 * Set global rate limit cooldown from a 429 response.
 * Respects the retry-after header but caps at MAX_COOLDOWN_MS (30 min)
 * to avoid absurdly long lockouts from PSA's aggressive headers.
 */
const setRateLimited = (error) => {
    const retryAfterHeader = error.response?.headers?.['retry-after'];
    let cooldownMs;

    if (retryAfterHeader) {
        const retryAfterSec = parseInt(retryAfterHeader, 10);
        if (!isNaN(retryAfterSec) && retryAfterSec > 0) {
            cooldownMs = Math.min(retryAfterSec * 1000, MAX_COOLDOWN_MS);
        } else {
            cooldownMs = DEFAULT_COOLDOWN_MS;
        }
    } else {
        cooldownMs = DEFAULT_COOLDOWN_MS;
    }

    _rateLimitedUntil = Date.now() + cooldownMs;
    const cooldownMin = Math.ceil(cooldownMs / 60000);
    console.log(`[PSA] Rate limited — cooling down for ${cooldownMin} minutes (until ${new Date(_rateLimitedUntil).toLocaleTimeString()})`);
};

const STEP_NAMES = {
    'Arrived': 'Arrived',
    'OrderPrep': 'Order Prep',
    'Order Prep': 'Order Prep',
    'ResearchAndID': 'Research & ID',
    'Research & ID': 'Research & ID',
    'ResearchAndId': 'Research & ID',
    'Research And ID': 'Research & ID',
    'Grading': 'Grading',
    'Assembly': 'Assembly',
    'GradesReady': 'Grades Ready',
    'Grades Ready': 'Grades Ready',
    'QAChecks': 'QA Checks',
    'QA Checks': 'QA Checks',
    'QACheck': 'QA Checks',
    'QA Check': 'QA Checks',
    // Legacy step names (pre-Sept 2023) — map to current names
    'QACheck1': 'Grading',
    'QA Check 1': 'Grading',
    'QACheck2': 'QA Checks',
    'QA Check 2': 'QA Checks',
    'Shipped': 'Shipped',
    'Complete': 'Shipped',
};

// Step order for progress tracking (current PSA tracker as of 2024+)
const STEP_ORDER = ['Arrived', 'Order Prep', 'Research & ID', 'Grading', 'Assembly', 'Grades Ready', 'QA Checks', 'Shipped'];

const createPsaClient = (apiKey) => axios.create({
    baseURL: PSA_API_BASE,
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'SlabDash/2.0'
    },
    timeout: 30000
});

// ============================================
// CORE API FUNCTIONS
// ============================================

const getSubmissionProgress = async (apiKey, submissionNumber, { retries = 2, batch = false } = {}) => {
    // Check global rate limit before making any request
    const rl = isRateLimited();
    if (rl.limited) {
        return { success: false, error: `Rate limited — retry in ${rl.retryAfterMin}m`, status: 429, rateLimited: true };
    }

    // Check daily limit
    const usage = getDailyUsage();
    if (usage.atLimit) {
        return { success: false, error: `Daily API limit reached (${usage.limit} calls). Resets at midnight UTC.`, status: 429, rateLimited: true, dailyLimitReached: true };
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // Use longer interval for batch operations
            if (batch) { await batchThrottle(); } else { await throttle(); }
            const response = await createPsaClient(apiKey).get(`/order/GetSubmissionProgress/${submissionNumber}`);
            const raw = response.data;
            const data = raw?.PSAOrder || raw?.psaOrder || raw;
            return { success: true, data };
        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;

            if (status === 404) {
                return { success: false, error: 'Submission not found', status: 404 };
            }
            // 429 rate limit — set global cooldown and return failure (don't throw)
            if (status === 429) {
                setRateLimited(error);
                return { success: false, error: 'PSA rate limit reached', status: 429, rateLimited: true };
            }
            // 5xx server errors and network timeouts — retry with backoff
            if ((status >= 500 || !status) && attempt < retries) {
                const delay = (attempt + 1) * 3000 + Math.random() * 2000;
                console.log(`[PSA] API error (${status || 'network'}) for ${submissionNumber}, retry ${attempt + 1}/${retries} in ${Math.round(delay/1000)}s`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            console.error(`[PSA] API error for submission ${submissionNumber}: ${message}`);
            return { success: false, error: message || 'Unknown PSA API error', status: status || 0 };
        }
    }
    return { success: false, error: 'Max retries exceeded', status: 0 };
};

const getCertificate = async (apiKey, certNumber) => {
    try {
        await throttle();
        const response = await createPsaClient(apiKey).get(`/cert/GetByCertNumber/${certNumber}`);
        const data = response.data;
        if (data.ServerMessage === 'No data found') return { success: false, error: 'Certificate not found' };
        return { success: true, data: data.PSACert || data };
    } catch (error) {
        if (error.response?.status === 404) {
            return { success: false, error: 'Certificate not found' };
        }
        console.error(`PSA cert lookup error for ${certNumber}:`, error.message);
        return { success: false, error: error.message };
    }
};

const getCertImages = async (apiKey, certNumber) => {
    try {
        await throttle();
        const response = await createPsaClient(apiKey).get(`/cert/GetImagesByCertNumber/${certNumber}`);
        const data = response.data;
        if (!data || data.ServerMessage === 'No data found') {
            return { success: false, error: 'No images found' };
        }
        const images = [];
        if (data.FrontImageURL) images.push(data.FrontImageURL);
        if (data.BackImageURL) images.push(data.BackImageURL);
        if (data.Images && Array.isArray(data.Images)) {
            for (const img of data.Images) {
                const url = typeof img === 'string' ? img : img.ImageURL || img.imageUrl;
                if (url && !images.includes(url)) images.push(url);
            }
        }
        return { success: true, images, raw: data };
    } catch (error) {
        return { success: false, error: error.message, images: [] };
    }
};

const getCertWithImages = async (apiKey, certNumber) => {
    const [certResult, imagesResult] = await Promise.all([
        getCertificate(apiKey, certNumber),
        getCertImages(apiKey, certNumber).catch(() => ({ success: false, images: [] }))
    ]);

    if (!certResult.success) return certResult;

    return {
        success: true,
        data: {
            ...certResult.data,
            images: imagesResult.images || [],
            frontImage: imagesResult.raw?.FrontImageURL || null,
            backImage: imagesResult.raw?.BackImageURL || null
        }
    };
};

// ============================================
// DATA PARSING
// ============================================

/**
 * Parse PSA progress data into a clean, normalized structure.
 * Handles BOTH camelCase and PascalCase field names from PSA API.
 * PSA sometimes wraps data in PSAOrder or similar container objects.
 */
const parseProgressData = (rawData) => {
    // Handle possible PSA API response wrappers
    const data = rawData.PSAOrder || rawData.psaOrder || rawData;

    // Handle both camelCase and PascalCase for the steps array
    const rawSteps = data.orderProgressSteps || data.OrderProgressSteps || data.steps || data.Steps || [];
    let completedCount = 0;
    let currentStep = 'Unknown';
    let lastCompletedStep = null;

    // Normalize each step — PSA can return any combination of casing
    const normalizedSteps = rawSteps.map((s, idx) => {
        const stepName = s.step || s.Step || s.name || s.Name || `Step ${idx + 1}`;
        const isCompleted = s.completed === true || s.Completed === true || s.isComplete === true || s.IsComplete === true;
        const completedDate = s.completedDate || s.CompletedDate || s.completedOn || s.CompletedOn || null;
        const index = s.index !== undefined ? s.index : (s.Index !== undefined ? s.Index : idx);
        return { stepName, isCompleted, completedDate, index, rawStep: stepName };
    });

    for (let i = 0; i < normalizedSteps.length; i++) {
        if (normalizedSteps[i].isCompleted) {
            completedCount++;
            lastCompletedStep = STEP_NAMES[normalizedSteps[i].rawStep] || normalizedSteps[i].stepName;
        } else if (currentStep === 'Unknown') {
            currentStep = STEP_NAMES[normalizedSteps[i].rawStep] || normalizedSteps[i].stepName;
        }
    }

    if (completedCount === normalizedSteps.length && normalizedSteps.length > 0) currentStep = 'Shipped';

    const progressPercent = normalizedSteps.length > 0 ? Math.round((completedCount / normalizedSteps.length) * 100) : 0;

    return {
        orderNumber: data.orderNumber || data.OrderNumber || null,
        currentStep,
        lastCompletedStep,
        progressPercent,
        completedSteps: completedCount,
        totalSteps: normalizedSteps.length,
        gradesReady: data.gradesReady || data.GradesComplete || data.GradesReady || data.gradesComplete || false,
        shipped: data.shipped || data.Shipped || (currentStep === 'Shipped') || false,
        problemOrder: data.problemOrder || data.ProblemOrder || false,
        accountingHold: data.accountingHold || data.AccountingHold || false,
        // Extract any extra fields PSA might include
        serviceLevel: data.serviceLevel || data.ServiceLevel || null,
        estimatedCompletionDate: data.estimatedCompletionDate || data.EstimatedCompletionDate || null,
        cardCount: data.cardCount || data.CardCount || data.numberOfCards || data.NumberOfCards || null,
        steps: normalizedSteps.map(s => ({
            index: s.index,
            name: STEP_NAMES[s.rawStep] || s.stepName,
            rawStep: s.rawStep,
            completed: s.isCompleted,
            completedDate: s.completedDate
        }))
    };
};

/**
 * Extract rich data from a PSA certificate response.
 * Normalizes all the different field name formats PSA uses.
 */
const parseCertData = (cert) => {
    return {
        certNumber: cert.CertNumber || cert.certNumber || null,
        grade: cert.CardGrade || cert.Grade || cert.grade || null,
        gradeDescription: cert.GradeDescription || cert.gradeDescription || null,
        year: cert.Year || cert.year || null,
        brand: cert.Brand || cert.brand || null,
        cardNumber: cert.CardNumber || cert.cardNumber || null,
        playerName: cert.Subject || cert.PlayerName || cert.subject || null,
        category: cert.Category || cert.category || null,
        variety: cert.Variety || cert.variety || null,
        labelType: cert.LabelType || cert.labelType || null,
        reversal: cert.Reversal || cert.reversal || null,
        specId: cert.SpecID || cert.specId || null,
        specNumber: cert.SpecNumber || cert.specNumber || null,
        cardDescription: cert.CardDescription || cert.cardDescription || null,
        totalPopulation: cert.TotalPopulation || cert.totalPopulation || null,
        populationHigher: cert.PopulationHigher || cert.populationHigher || null,
        isCrossover: cert.IsCrossover || cert.isCrossover || false,
        isDualGrade: cert.IsDualGrade || cert.isDualGrade || false,
    };
};

// ============================================
// DATABASE UPDATE FUNCTIONS
// ============================================

/**
 * Update a submission from PSA API data.
 * Detects changes, updates milestone dates, sends notifications.
 */
const updateSubmissionFromPsa = async (submissionId, psaData) => {
    const parsed = parseProgressData(psaData);

    // Get current state before update to detect changes
    const currentResult = await db.query(
        `SELECT company_id, psa_submission_number, current_step, progress_percent, grades_ready, shipped,
                problem_order, date_received, date_graded, date_shipped, service_level
         FROM submissions WHERE id = $1`,
        [submissionId]
    );
    const prev = currentResult.rows[0];

    // Build update query with milestone dates
    const updateFields = {
        psa_order_number: parsed.orderNumber,
        current_step: parsed.currentStep,
        progress_percent: parsed.progressPercent,
        grades_ready: parsed.gradesReady,
        shipped: parsed.shipped,
        problem_order: parsed.problemOrder,
        accounting_hold: parsed.accountingHold,
        psa_api_response: JSON.stringify(psaData),
        last_api_update: new Date(),
        last_refreshed_at: new Date(),
    };

    // Auto-set service level from PSA if we don't have one
    if (!prev.service_level && parsed.serviceLevel) {
        updateFields.service_level = parsed.serviceLevel;
    }

    // Auto-set milestone dates based on progress
    if (!prev.date_received && parsed.completedSteps >= 1) {
        updateFields.date_received = new Date();
    }
    if (!prev.date_graded && parsed.gradesReady && !prev.grades_ready) {
        updateFields.date_graded = new Date();
    }
    if (!prev.date_shipped && parsed.shipped && !prev.shipped) {
        updateFields.date_shipped = new Date();
    }

    // Build dynamic SET clause
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    for (const [key, value] of Object.entries(updateFields)) {
        setClauses.push(`${key} = $${paramIndex++}`);
        values.push(value);
    }
    values.push(submissionId);

    await db.query(
        `UPDATE submissions SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        values
    );

    // Update submission steps with completion timestamps
    await db.query('DELETE FROM submission_steps WHERE submission_id = $1', [submissionId]);

    for (const step of parsed.steps) {
        await db.query(
            `INSERT INTO submission_steps (submission_id, step_index, step_name, completed, completed_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [submissionId, step.index, step.name, step.completed, step.completedDate || (step.completed ? new Date() : null)]
        );
    }

    // Track what changed
    const changes = {
        submissionNumber: prev.psa_submission_number,
        hadChanges: false,
        stepChanged: false,
        progressChanged: false,
        statusChanged: false,
        previousStep: prev.current_step,
        newStep: parsed.currentStep,
        previousProgress: prev.progress_percent,
        newProgress: parsed.progressPercent,
        previousGradesReady: prev.grades_ready,
        newGradesReady: parsed.gradesReady,
        previousShipped: prev.shipped,
        newShipped: parsed.shipped,
        previousProblem: prev.problem_order,
        newProblem: parsed.problemOrder,
        milestonesSet: {},
    };

    if (prev.current_step !== parsed.currentStep) {
        changes.hadChanges = true;
        changes.stepChanged = true;
    }
    if (prev.progress_percent !== parsed.progressPercent) {
        changes.hadChanges = true;
        changes.progressChanged = true;
        changes.progressDelta = parsed.progressPercent - prev.progress_percent;
    }
    if (prev.grades_ready !== parsed.gradesReady ||
        prev.shipped !== parsed.shipped ||
        prev.problem_order !== parsed.problemOrder) {
        changes.hadChanges = true;
        changes.statusChanged = true;
    }
    if (updateFields.date_received && !prev.date_received) changes.milestonesSet.received = true;
    if (updateFields.date_graded && !prev.date_graded) changes.milestonesSet.graded = true;
    if (updateFields.date_shipped && !prev.date_shipped) changes.milestonesSet.shipped = true;

    // Log step transition to history table (for activity feeds and analytics)
    if (changes.hadChanges && prev.company_id) {
        try {
            const events = [];

            if (changes.stepChanged) {
                events.push({
                    type: 'step_change',
                    details: { from: prev.current_step, to: parsed.currentStep }
                });
            }
            if (parsed.gradesReady && !prev.grades_ready) {
                events.push({ type: 'grades_ready', details: {} });
            }
            if (parsed.shipped && !prev.shipped) {
                events.push({ type: 'shipped', details: {} });
            }
            if (parsed.problemOrder && !prev.problem_order) {
                events.push({ type: 'problem_flagged', details: {} });
            }
            if (prev.problem_order && !parsed.problemOrder) {
                events.push({ type: 'problem_resolved', details: {} });
            }

            for (const evt of events) {
                await db.query(
                    `INSERT INTO submission_status_history
                     (submission_id, company_id, from_step, to_step, from_progress, to_progress, event_type, details)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [submissionId, prev.company_id, prev.current_step, parsed.currentStep,
                     prev.progress_percent, parsed.progressPercent, evt.type, JSON.stringify(evt.details)]
                );
            }
        } catch (histErr) {
            // Don't fail the update if history logging fails
            console.error('Failed to log status history:', histErr.message);
        }
    }

    // Send email notification if step changed
    if (prev.current_step !== parsed.currentStep && parsed.currentStep) {
        try {
            const { sendSubmissionUpdateEmail } = require('./emailService');
            await sendSubmissionUpdateEmail(submissionId, parsed.currentStep, parsed.progressPercent);
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
        }
    }

    // Send push notifications to linked portal customers on significant changes
    if (changes.hadChanges && prev.company_id) {
        try {
            const { notifyCustomersOfStatusChange } = require('../routes/push');
            const significantEvents = [];
            if (changes.stepChanged) significantEvents.push({ type: 'step_change', details: { from: prev.current_step, to: parsed.currentStep } });
            if (parsed.gradesReady && !prev.grades_ready) significantEvents.push({ type: 'grades_ready', details: {} });
            if (parsed.shipped && !prev.shipped) significantEvents.push({ type: 'shipped', details: {} });
            if (parsed.problemOrder && !prev.problem_order) significantEvents.push({ type: 'problem_flagged', details: {} });
            if (prev.problem_order && !parsed.problemOrder) significantEvents.push({ type: 'problem_resolved', details: {} });

            for (const evt of significantEvents) {
                await notifyCustomersOfStatusChange(submissionId, prev.company_id, evt.type, evt.details);
            }
        } catch (pushError) {
            // Silent fail — push notifications shouldn't block the update
            console.error('Customer push notification failed:', pushError.message);
        }
    }

    // Auto-fetch cert data for all cards when grades become ready
    if (parsed.gradesReady && !prev.grades_ready) {
        try {
            await autoFetchCertData(submissionId);
        } catch (certError) {
            console.error('Auto cert fetch failed:', certError.message);
        }
    }

    return { parsed, changes };
};

/**
 * When grades become ready, automatically look up cert data for all cards
 * in the submission that have cert numbers but no grade yet.
 */
const autoFetchCertData = async (submissionId) => {
    // Get the company's API key and all cards for this submission
    const subResult = await db.query(
        `SELECT s.company_id, c.psa_api_key
         FROM submissions s
         JOIN companies c ON s.company_id = c.id
         WHERE s.id = $1`,
        [submissionId]
    );
    if (subResult.rows.length === 0) return;

    const apiKey = subResult.rows[0].psa_api_key;
    if (!apiKey) return;

    const cardsResult = await db.query(
        `SELECT id, psa_cert_number FROM cards
         WHERE submission_id = $1 AND psa_cert_number IS NOT NULL AND (grade IS NULL OR grade = '')`,
        [submissionId]
    );

    if (cardsResult.rows.length === 0) return;

    console.log(`Auto-fetching cert data for ${cardsResult.rows.length} cards in submission ${submissionId}`);

    let updated = 0;
    for (const card of cardsResult.rows) {
        try {
            const certResult = await getCertWithImages(apiKey, card.psa_cert_number);
            if (certResult.success) {
                const cert = certResult.data;
                const parsed = parseCertData(cert);

                const updateData = {
                    grade: parsed.grade,
                    psa_cert_data: JSON.stringify(cert),
                    status: 'graded',
                };

                // Add player name if not already set
                if (parsed.playerName) {
                    updateData.player_name = parsed.playerName;
                }

                // Add images if available
                if (cert.images && cert.images.length > 0) {
                    updateData.card_images = cert.images;
                }

                const setClauses = [];
                const values = [];
                let pi = 1;
                for (const [key, value] of Object.entries(updateData)) {
                    if (key === 'card_images') {
                        setClauses.push(`${key} = $${pi++}`);
                        values.push(value);
                    } else {
                        setClauses.push(`${key} = $${pi++}`);
                        values.push(value);
                    }
                }
                values.push(card.id);

                await db.query(
                    `UPDATE cards SET ${setClauses.join(', ')} WHERE id = $${pi}`,
                    values
                );
                updated++;
            }
            // Throttle between cert lookups (throttle() enforces 5s min)
            await new Promise(r => setTimeout(r, 3000));
        } catch (err) {
            console.error(`Auto cert fetch failed for ${card.psa_cert_number}:`, err.message);
        }
    }

    console.log(`Auto cert fetch complete: ${updated}/${cardsResult.rows.length} cards updated`);
};

// ============================================
// PROGRESS ESTIMATION ENGINE
// ============================================

/**
 * Expected business days per step, by service level.
 * Based on real-world collector data (not PSA marketing numbers).
 */
const STEP_DURATION_ESTIMATES = {
    'Value Bulk':    { 'Arrived': 1, 'Order Prep': 15, 'Research & ID': 5, 'Grading': 20, 'Assembly': 5, 'Grades Ready': 5, 'QA Checks': 10, 'Shipped': 2 },
    'Bulk':          { 'Arrived': 1, 'Order Prep': 15, 'Research & ID': 5, 'Grading': 20, 'Assembly': 5, 'Grades Ready': 5, 'QA Checks': 10, 'Shipped': 2 },
    'Value':         { 'Arrived': 1, 'Order Prep': 12, 'Research & ID': 5, 'Grading': 18, 'Assembly': 5, 'Grades Ready': 5, 'QA Checks': 8, 'Shipped': 2 },
    'Value Plus':    { 'Arrived': 1, 'Order Prep': 8, 'Research & ID': 4, 'Grading': 12, 'Assembly': 4, 'Grades Ready': 4, 'QA Checks': 6, 'Shipped': 2 },
    'Plus':          { 'Arrived': 1, 'Order Prep': 8, 'Research & ID': 4, 'Grading': 12, 'Assembly': 4, 'Grades Ready': 4, 'QA Checks': 6, 'Shipped': 2 },
    'Value Max':     { 'Arrived': 1, 'Order Prep': 6, 'Research & ID': 3, 'Grading': 10, 'Assembly': 3, 'Grades Ready': 3, 'QA Checks': 5, 'Shipped': 2 },
    'Regular':       { 'Arrived': 1, 'Order Prep': 3, 'Research & ID': 2, 'Grading': 8, 'Assembly': 2, 'Grades Ready': 2, 'QA Checks': 4, 'Shipped': 2 },
    'Standard':      { 'Arrived': 1, 'Order Prep': 3, 'Research & ID': 2, 'Grading': 8, 'Assembly': 2, 'Grades Ready': 2, 'QA Checks': 4, 'Shipped': 2 },
    'Express':       { 'Arrived': 1, 'Order Prep': 2, 'Research & ID': 1, 'Grading': 4, 'Assembly': 1, 'Grades Ready': 1, 'QA Checks': 2, 'Shipped': 1 },
    'Super Express': { 'Arrived': 0.5, 'Order Prep': 1, 'Research & ID': 0.5, 'Grading': 1.5, 'Assembly': 0.5, 'Grades Ready': 0.5, 'QA Checks': 1, 'Shipped': 0.5 },
    'Walk-Through':  { 'Arrived': 0.25, 'Order Prep': 0.5, 'Research & ID': 0.25, 'Grading': 0.5, 'Assembly': 0.25, 'Grades Ready': 0.25, 'QA Checks': 0.25, 'Shipped': 0.25 },
    'Walk-Thru':     { 'Arrived': 0.25, 'Order Prep': 0.5, 'Research & ID': 0.25, 'Grading': 0.5, 'Assembly': 0.25, 'Grades Ready': 0.25, 'QA Checks': 0.25, 'Shipped': 0.25 },
};

const DEFAULT_DURATIONS = { 'Arrived': 1, 'Order Prep': 8, 'Research & ID': 3, 'Grading': 12, 'Assembly': 3, 'Grades Ready': 3, 'QA Checks': 6, 'Shipped': 2 };

// In-memory cache for historical durations (1 hour TTL)
let _historicalCache = {};
let _historicalCacheTime = {};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Load actual average step durations from submission_status_history.
 * Uses real transition data to improve time estimates over static defaults.
 * Returns a map of { serviceLevel: { step: avgDays } }.
 */
const getHistoricalDurations = async (companyId) => {
    const cacheKey = companyId;
    if (_historicalCache[cacheKey] && Date.now() - _historicalCacheTime[cacheKey] < CACHE_TTL_MS) {
        return _historicalCache[cacheKey];
    }

    try {
        // Calculate average step durations from consecutive step_change events
        const result = await db.query(`
            WITH ordered_events AS (
                SELECT
                    ssh.submission_id,
                    ssh.from_step,
                    ssh.to_step,
                    ssh.created_at,
                    LAG(ssh.created_at) OVER (
                        PARTITION BY ssh.submission_id ORDER BY ssh.created_at
                    ) AS prev_event_at,
                    s.service_level
                FROM submission_status_history ssh
                JOIN submissions s ON s.id = ssh.submission_id
                WHERE ssh.company_id = $1
                  AND ssh.event_type = 'step_change'
            ),
            step_durations AS (
                SELECT
                    service_level,
                    from_step,
                    EXTRACT(EPOCH FROM (created_at - prev_event_at)) / 86400.0 AS days_at_step
                FROM ordered_events
                WHERE prev_event_at IS NOT NULL
                  AND service_level IS NOT NULL
            )
            SELECT
                service_level,
                from_step AS step_name,
                ROUND(AVG(days_at_step)::numeric, 1) AS avg_days,
                COUNT(*) AS sample_count
            FROM step_durations
            WHERE days_at_step > 0 AND days_at_step < 365
            GROUP BY service_level, from_step
            HAVING COUNT(*) >= 2
        `, [companyId]);

        const historical = {};
        for (const row of result.rows) {
            if (!historical[row.service_level]) historical[row.service_level] = {};
            historical[row.service_level][row.step_name] = parseFloat(row.avg_days);
        }

        _historicalCache[cacheKey] = historical;
        _historicalCacheTime[cacheKey] = Date.now();
        return historical;
    } catch (err) {
        // Table might not exist yet or no data — return empty
        return {};
    }
};

/**
 * Calculate estimated progress with time-based sub-step interpolation.
 * Makes customers see movement even when PSA hasn't moved to a new step.
 * Accepts optional historicalDurations to use real data over static defaults.
 */
const estimateSubmissionProgress = (submission, historicalDurations) => {
    if (!submission || submission.shipped || submission.picked_up) return null;

    const currentStep = submission.current_step;
    if (!currentStep) return null;

    const stepIndex = STEP_ORDER.indexOf(currentStep);
    if (stepIndex < 0) return null;

    const serviceLevel = submission.service_level || 'Regular';
    const staticDurations = STEP_DURATION_ESTIMATES[serviceLevel] || DEFAULT_DURATIONS;

    // Merge: prefer historical data when available, fall back to static estimates
    const histForLevel = historicalDurations?.[serviceLevel] || {};
    const durations = {};
    let historicalStepCount = 0;
    for (const step of STEP_ORDER) {
        if (histForLevel[step]) {
            durations[step] = histForLevel[step];
            historicalStepCount++;
        } else {
            durations[step] = staticDurations[step] || DEFAULT_DURATIONS[step] || 5;
        }
    }
    const usesHistoricalData = historicalStepCount > 0;

    // Total expected days across all steps
    let totalExpectedDays = 0;
    let completedDays = 0;
    for (let i = 0; i < STEP_ORDER.length; i++) {
        const dur = durations[STEP_ORDER[i]] || 5;
        totalExpectedDays += dur;
        if (i < stepIndex) completedDays += dur;
    }

    // How long at current step (use last_api_update as the best indicator of when step changed)
    const stepEnteredAt = submission.last_api_update || submission.last_refreshed_at || submission.created_at;
    const msAtStep = Date.now() - new Date(stepEnteredAt).getTime();
    const daysAtStep = msAtStep / (1000 * 60 * 60 * 24);
    const expectedStepDays = durations[currentStep] || 5;

    // Sub-step progress within current step (0 to 0.95, never reaches 1.0 — that's the next step's job)
    const subStepProgress = Math.min(daysAtStep / expectedStepDays, 0.95);

    // Smooth estimated progress: base + sub-step contribution
    const stepsCount = STEP_ORDER.length;
    const baseProgress = (stepIndex / stepsCount) * 100;
    const stepSliceWidth = (1 / stepsCount) * 100;
    const estimatedProgress = Math.min(Math.round(baseProgress + (subStepProgress * stepSliceWidth)), 99);

    // Estimated days remaining from current position
    const currentStepRemaining = Math.max(0, expectedStepDays - daysAtStep);
    let remainingDays = currentStepRemaining;
    for (let i = stepIndex + 1; i < STEP_ORDER.length; i++) {
        remainingDays += durations[STEP_ORDER[i]] || 5;
    }

    // Estimated completion date
    const estCompletion = new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000);

    return {
        estimatedProgress,
        daysAtCurrentStep: Math.round(daysAtStep * 10) / 10,
        expectedStepDuration: Math.round(expectedStepDays),
        stepProgressPercent: Math.round(subStepProgress * 100),
        estimatedDaysRemaining: Math.round(remainingDays),
        estimatedCompletionDate: estCompletion.toISOString(),
        currentStepLabel: daysAtStep < 1
            ? `Started ${currentStep} today`
            : `Day ${Math.ceil(daysAtStep)} of ~${Math.round(expectedStepDays)} at ${currentStep}`,
        totalExpectedDays: Math.round(totalExpectedDays),
        usesHistoricalData,
    };
};

/**
 * Determine how frequently a submission should be refreshed (in hours).
 * Higher-priority submissions get refreshed more often.
 */
const getRefreshPriority = (submission) => {
    const step = submission.current_step;
    const service = (submission.service_level || '').toLowerCase();
    const isExpress = service.includes('express') || service.includes('walk');

    // Shipped or picked up — no refresh needed
    if (submission.shipped || submission.picked_up) return { hours: 0, tier: 'none' };

    // Problem orders — check for resolution
    if (submission.problem_order) return { hours: isExpress ? 4 : 8, tier: 'urgent' };

    // Express/premium tiers — faster refresh but conservative
    if (isExpress) {
        if (!step || step === 'Arrived' || step === 'Order Prep') return { hours: 4, tier: 'high' };
        return { hours: 6, tier: 'high' };
    }

    // Early stages (Arrived, Order Prep) — package just landed
    if (!step || step === 'Arrived' || step === 'Order Prep') return { hours: 8, tier: 'medium' };

    // Active processing (Research & ID through Assembly) — core pipeline
    if (['Research & ID', 'Grading', 'Assembly'].includes(step)) return { hours: 12, tier: 'medium' };

    // Grades Ready / QA — waiting for shipping, low urgency
    if (['Grades Ready', 'QA Checks'].includes(step)) return { hours: 24, tier: 'low' };

    // Fallback
    return { hours: 12, tier: 'medium' };
};

// ============================================
// BATCH / UTILITY FUNCTIONS
// ============================================

const refreshAllSubmissions = async () => {
    let companiesResult;
    try {
        companiesResult = await db.query(
            `SELECT id, psa_api_key FROM companies WHERE auto_refresh_enabled = true AND psa_api_key IS NOT NULL`
        );
    } catch (err) {
        if (err.code === '42703') {
            console.log('Auto-refresh columns not found. Run migration 021.');
            return;
        }
        throw err;
    }

    for (const company of companiesResult.rows) {
        // Check rate limit before each company
        if (isRateLimited().limited) {
            console.log('[PSA] Rate limited — skipping remaining companies');
            break;
        }

        const submissions = await db.query(
            `SELECT id, psa_submission_number FROM submissions WHERE company_id = $1 AND shipped = false AND psa_submission_number IS NOT NULL`,
            [company.id]
        );

        for (const sub of submissions.rows) {
            const result = await getSubmissionProgress(company.psa_api_key, sub.psa_submission_number, { batch: true });
            if (result.rateLimited) {
                console.log(`[PSA] Rate limited — stopping refresh`);
                break;
            }
            if (result.success) {
                try {
                    await updateSubmissionFromPsa(sub.id, result.data);
                } catch (err) {
                    console.error(`[PSA] Update failed for ${sub.psa_submission_number}: ${err.message}`);
                }
            }
        }
    }
};

const logApiCall = async (companyId, endpoint, method, params, status, response) => {
    try {
        await db.query(
            `INSERT INTO api_logs (company_id, endpoint, method, request_params, response_status, response_body) VALUES ($1, $2, $3, $4, $5, $6)`,
            [companyId, endpoint, method, JSON.stringify(params), status, JSON.stringify(response)]
        );
    } catch (error) {
        // api_logs table may not exist — silently skip
    }
};

module.exports = {
    getSubmissionProgress,
    getCertificate,
    getCertImages,
    getCertWithImages,
    parseProgressData,
    parseCertData,
    updateSubmissionFromPsa,
    autoFetchCertData,
    refreshAllSubmissions,
    estimateSubmissionProgress,
    getHistoricalDurations,
    getRefreshPriority,
    isRateLimited,
    throttle,
    batchThrottle,
    getDailyUsage,
    logApiCall,
    STEP_NAMES,
    STEP_ORDER,
    STEP_DURATION_ESTIMATES,
    createPsaClient,
};

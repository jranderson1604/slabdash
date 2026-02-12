const axios = require('axios');
const db = require('../db');

const PSA_API_BASE = process.env.PSA_API_BASE || 'https://api.psacard.com/publicapi';

const STEP_NAMES = {
    'Arrived': 'Arrived',
    'OrderPrep': 'Order Prep',
    'ResearchAndID': 'Research & ID',
    'Grading': 'Grading',
    'Assembly': 'Assembly',
    'QACheck1': 'QA Check 1',
    'QACheck2': 'QA Check 2',
    'Shipped': 'Shipped'
};

// Step order for progress tracking
const STEP_ORDER = ['Arrived', 'Order Prep', 'Research & ID', 'Grading', 'Assembly', 'QA Check 1', 'QA Check 2', 'Shipped'];

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

const getSubmissionProgress = async (apiKey, submissionNumber, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await createPsaClient(apiKey).get(`/order/GetSubmissionProgress/${submissionNumber}`);
            // PSA may wrap data — unwrap common patterns
            const raw = response.data;
            const data = raw?.PSAOrder || raw?.psaOrder || raw;
            return { success: true, data };
        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;

            if (status === 404) {
                return { success: false, error: 'Submission not found', status: 404 };
            }
            // 429 rate limit — always throw so caller's retry logic handles it
            if (status === 429) {
                throw error;
            }
            // 5xx server errors and network timeouts — retry with backoff
            if ((status >= 500 || !status) && attempt < retries) {
                const delay = (attempt + 1) * 3000 + Math.random() * 2000;
                console.log(`PSA API error (${status || 'network'}) for ${submissionNumber}, retry ${attempt + 1}/${retries} in ${Math.round(delay/1000)}s`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            console.error(`PSA API error for submission ${submissionNumber}:`, message);
            return { success: false, error: message || 'Unknown PSA API error', status: status || 0 };
        }
    }
    return { success: false, error: 'Max retries exceeded', status: 0 };
};

const getCertificate = async (apiKey, certNumber) => {
    try {
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
        `SELECT psa_submission_number, current_step, progress_percent, grades_ready, shipped,
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

    // Send email notification if step changed
    if (prev.current_step !== parsed.currentStep && parsed.currentStep) {
        try {
            const { sendSubmissionUpdateEmail } = require('./emailService');
            await sendSubmissionUpdateEmail(submissionId, parsed.currentStep, parsed.progressPercent);
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
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
            // Rate limit between cert lookups
            await new Promise(r => setTimeout(r, 300));
        } catch (err) {
            console.error(`Auto cert fetch failed for ${card.psa_cert_number}:`, err.message);
        }
    }

    console.log(`Auto cert fetch complete: ${updated}/${cardsResult.rows.length} cards updated`);
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
        const submissions = await db.query(
            `SELECT id, psa_submission_number FROM submissions WHERE company_id = $1 AND shipped = false AND psa_submission_number IS NOT NULL`,
            [company.id]
        );

        for (const sub of submissions.rows) {
            try {
                const result = await getSubmissionProgress(company.psa_api_key, sub.psa_submission_number);
                if (result.success) await updateSubmissionFromPsa(sub.id, result.data);
                await new Promise(r => setTimeout(r, 500));
            } catch (error) {
                console.error(`Failed to refresh ${sub.psa_submission_number}:`, error.message);
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
    logApiCall,
    STEP_NAMES,
    STEP_ORDER,
    createPsaClient,
};

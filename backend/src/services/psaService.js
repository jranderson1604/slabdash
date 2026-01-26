const axios = require('axios');
const cheerio = require('cheerio');
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

const createPsaClient = (apiKey) => axios.create({
    baseURL: PSA_API_BASE,
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
    timeout: 30000
});

const getSubmissionProgress = async (apiKey, submissionNumber) => {
    try {
        const response = await createPsaClient(apiKey).get(`/order/GetSubmissionProgress/${submissionNumber}`);
        return { success: true, data: response.data };
    } catch (error) {
        if (error.response?.status === 404) return { success: false, error: 'Submission not found' };
        throw error;
    }
};

const getCertificate = async (apiKey, certNumber) => {
    try {
        const response = await createPsaClient(apiKey).get(`/cert/GetByCertNumber/${certNumber}`);
        const data = response.data;
        if (data.ServerMessage === 'No data found') return { success: false, error: 'Certificate not found' };
        return { success: true, data: data.PSACert || data };
    } catch (error) {
        throw error;
    }
};

// Try multiple PSA API endpoints to find card data
const tryGetOrderDetails = async (apiKey, orderNumber, submissionNumber) => {
    const client = createPsaClient(apiKey);
    const results = { attempted: [], successful: null, allResponses: {} };

    // Endpoint 1: Try GetOrder with order number
    try {
        console.log(`Trying GetOrder with orderNumber: ${orderNumber}`);
        const response = await client.get(`/order/GetOrder/${orderNumber}`);
        results.attempted.push({ endpoint: `/order/GetOrder/${orderNumber}`, status: 'success' });
        results.allResponses.GetOrder = response.data;
        console.log('GetOrder response:', JSON.stringify(response.data, null, 2));
        if (response.data && Object.keys(response.data).length > 0) {
            results.successful = { endpoint: 'GetOrder', data: response.data };
        }
    } catch (error) {
        results.attempted.push({ endpoint: `/order/GetOrder/${orderNumber}`, status: 'failed', error: error.message });
        console.log(`GetOrder failed: ${error.message}`);
    }

    // Endpoint 2: Try GetSubmission with submission number
    try {
        console.log(`Trying GetSubmission with submissionNumber: ${submissionNumber}`);
        const response = await client.get(`/order/GetSubmission/${submissionNumber}`);
        results.attempted.push({ endpoint: `/order/GetSubmission/${submissionNumber}`, status: 'success' });
        results.allResponses.GetSubmission = response.data;
        console.log('GetSubmission response:', JSON.stringify(response.data, null, 2));
        if (!results.successful && response.data && Object.keys(response.data).length > 0) {
            results.successful = { endpoint: 'GetSubmission', data: response.data };
        }
    } catch (error) {
        results.attempted.push({ endpoint: `/order/GetSubmission/${submissionNumber}`, status: 'failed', error: error.message });
        console.log(`GetSubmission failed: ${error.message}`);
    }

    // Endpoint 3: Try GetOrderDetails
    try {
        console.log(`Trying GetOrderDetails with orderNumber: ${orderNumber}`);
        const response = await client.get(`/order/GetOrderDetails/${orderNumber}`);
        results.attempted.push({ endpoint: `/order/GetOrderDetails/${orderNumber}`, status: 'success' });
        results.allResponses.GetOrderDetails = response.data;
        console.log('GetOrderDetails response:', JSON.stringify(response.data, null, 2));
        if (!results.successful && response.data && Object.keys(response.data).length > 0) {
            results.successful = { endpoint: 'GetOrderDetails', data: response.data };
        }
    } catch (error) {
        results.attempted.push({ endpoint: `/order/GetOrderDetails/${orderNumber}`, status: 'failed', error: error.message });
        console.log(`GetOrderDetails failed: ${error.message}`);
    }

    // Endpoint 4: Try GetSubmissionDetails
    try {
        console.log(`Trying GetSubmissionDetails with submissionNumber: ${submissionNumber}`);
        const response = await client.get(`/order/GetSubmissionDetails/${submissionNumber}`);
        results.attempted.push({ endpoint: `/order/GetSubmissionDetails/${submissionNumber}`, status: 'success' });
        results.allResponses.GetSubmissionDetails = response.data;
        console.log('GetSubmissionDetails response:', JSON.stringify(response.data, null, 2));
        if (!results.successful && response.data && Object.keys(response.data).length > 0) {
            results.successful = { endpoint: 'GetSubmissionDetails', data: response.data };
        }
    } catch (error) {
        results.attempted.push({ endpoint: `/order/GetSubmissionDetails/${submissionNumber}`, status: 'failed', error: error.message });
        console.log(`GetSubmissionDetails failed: ${error.message}`);
    }

    // Endpoint 5: Try submissions (plural) endpoint
    try {
        console.log(`Trying /submissions/${submissionNumber}`);
        const response = await client.get(`/submissions/${submissionNumber}`);
        results.attempted.push({ endpoint: `/submissions/${submissionNumber}`, status: 'success' });
        results.allResponses.submissions = response.data;
        console.log('submissions response:', JSON.stringify(response.data, null, 2));
        if (!results.successful && response.data && Object.keys(response.data).length > 0) {
            results.successful = { endpoint: 'submissions', data: response.data };
        }
    } catch (error) {
        results.attempted.push({ endpoint: `/submissions/${submissionNumber}`, status: 'failed', error: error.message });
        console.log(`submissions endpoint failed: ${error.message}`);
    }

    console.log('\n=== ENDPOINT EXPLORATION SUMMARY ===');
    console.log('Attempted endpoints:', results.attempted.length);
    console.log('Successful endpoint:', results.successful?.endpoint || 'NONE');
    console.log('All attempts:', JSON.stringify(results.attempted, null, 2));

    return results;
};

const parseProgressData = (data) => {
    const steps = data.orderProgressSteps || [];
    let completedCount = 0;
    let currentStep = 'Unknown';
    
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].completed) completedCount++;
        else if (currentStep === 'Unknown') {
            currentStep = STEP_NAMES[steps[i].step] || steps[i].step;
        }
    }
    
    if (completedCount === steps.length && steps.length > 0) currentStep = 'Shipped';
    
    return {
        orderNumber: data.orderNumber,
        currentStep,
        progressPercent: steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0,
        gradesReady: data.gradesReady || false,
        shipped: data.shipped || false,
        problemOrder: data.problemOrder || false,
        accountingHold: data.accountingHold || false,
        steps: steps.map(s => ({ index: s.index, name: STEP_NAMES[s.step] || s.step, completed: s.completed }))
    };
};

const updateSubmissionFromPsa = async (submissionId, psaData) => {
    const parsed = parseProgressData(psaData);

    // Get current step before update to detect changes
    const currentResult = await db.query(
        'SELECT current_step FROM submissions WHERE id = $1',
        [submissionId]
    );
    const previousStep = currentResult.rows[0]?.current_step;

    await db.query(`
        UPDATE submissions SET
            psa_order_number = $1, current_step = $2, progress_percent = $3,
            grades_ready = $4, shipped = $5, problem_order = $6, accounting_hold = $7,
            psa_api_response = $8, last_api_update = NOW()
        WHERE id = $9
    `, [parsed.orderNumber, parsed.currentStep, parsed.progressPercent, parsed.gradesReady,
        parsed.shipped, parsed.problemOrder, parsed.accountingHold, JSON.stringify(psaData), submissionId]);

    await db.query('DELETE FROM submission_steps WHERE submission_id = $1', [submissionId]);

    for (const step of parsed.steps) {
        await db.query(
            `INSERT INTO submission_steps (submission_id, step_index, step_name, completed) VALUES ($1, $2, $3, $4)`,
            [submissionId, step.index, step.name, step.completed]
        );
    }

    // Send email notification if step changed
    if (previousStep !== parsed.currentStep && parsed.currentStep) {
        try {
            const { sendSubmissionUpdateEmail } = require('./emailService');
            await sendSubmissionUpdateEmail(submissionId, parsed.currentStep, parsed.progressPercent);
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
            // Don't fail the update if email fails
        }
    }

    return parsed;
};

const refreshAllSubmissions = async () => {
    const companies = await db.query(
        `SELECT id, psa_api_key FROM companies WHERE auto_refresh_enabled = true AND psa_api_key IS NOT NULL`
    );
    
    for (const company of companies.rows) {
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
        console.error('Failed to log API call:', error);
    }
};

// Scrape PSA cert page to get card images
const scrapePsaCertImages = async (certNumber) => {
    try {
        const url = `https://www.psacard.com/cert/${certNumber}`;
        console.log(`Scraping PSA cert page: ${url}`);

        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.psacard.com/',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Cache-Control': 'max-age=0'
            }
        });

        const $ = cheerio.load(response.data);
        const images = [];

        // Try multiple selectors to find images
        // PSA displays front and back images
        $('img[src*="cert"]').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src && !src.includes('logo') && !src.includes('icon')) {
                // Convert relative URLs to absolute
                const absoluteUrl = src.startsWith('http') ? src : `https://www.psacard.com${src}`;
                images.push(absoluteUrl);
            }
        });

        // Also check for images in specific cert image containers
        $('.cert-image img, .card-image img, [class*="cert"] img, [class*="card"] img').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src && !images.includes(src)) {
                const absoluteUrl = src.startsWith('http') ? src : `https://www.psacard.com${src}`;
                if (!absoluteUrl.includes('logo') && !absoluteUrl.includes('icon')) {
                    images.push(absoluteUrl);
                }
            }
        });

        // Look for background images in style attributes
        $('[style*="background-image"]').each((i, elem) => {
            const style = $(elem).attr('style');
            const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match && match[1]) {
                const src = match[1];
                const absoluteUrl = src.startsWith('http') ? src : `https://www.psacard.com${src}`;
                if (!absoluteUrl.includes('logo') && !absoluteUrl.includes('icon') && !images.includes(absoluteUrl)) {
                    images.push(absoluteUrl);
                }
            }
        });

        console.log(`Found ${images.length} images on PSA cert page`);
        return { success: true, images: images.filter((img, index, self) => self.indexOf(img) === index) }; // Remove duplicates
    } catch (error) {
        console.error('PSA scraping error:', error.message);
        return { success: false, error: error.message, images: [] };
    }
};

module.exports = { getSubmissionProgress, getCertificate, parseProgressData, updateSubmissionFromPsa, refreshAllSubmissions, logApiCall, tryGetOrderDetails, scrapePsaCertImages, STEP_NAMES };

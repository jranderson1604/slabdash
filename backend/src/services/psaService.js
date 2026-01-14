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

module.exports = { getSubmissionProgress, getCertificate, parseProgressData, updateSubmissionFromPsa, refreshAllSubmissions, logApiCall, STEP_NAMES };

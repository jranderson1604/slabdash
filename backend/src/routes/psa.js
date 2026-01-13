const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const psaService = require('../services/psaService');

// Get submission progress
router.get('/submission/:number', authenticate, async (req, res) => {
    try {
        if (!req.user.psa_api_key) return res.status(400).json({ error: 'PSA API key not configured' });
        
        const result = await psaService.getSubmissionProgress(req.user.psa_api_key, req.params.number);
        await psaService.logApiCall(req.companyId, `/order/GetSubmissionProgress/${req.params.number}`, 'GET', {}, result.success ? 200 : 404, result);
        
        if (!result.success) return res.status(404).json({ error: result.error });
        
        res.json({ raw: result.data, parsed: psaService.parseProgressData(result.data) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to lookup submission' });
    }
});

// Get certificate
router.get('/cert/:number', authenticate, async (req, res) => {
    try {
        if (!req.user.psa_api_key) return res.status(400).json({ error: 'PSA API key not configured' });
        
        const result = await psaService.getCertificate(req.user.psa_api_key, req.params.number);
        await psaService.logApiCall(req.companyId, `/cert/GetByCertNumber/${req.params.number}`, 'GET', {}, result.success ? 200 : 404, result);
        
        if (!result.success) return res.status(404).json({ error: result.error });
        
        res.json(result.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to lookup certificate' });
    }
});

// Test connection
router.get('/test', authenticate, async (req, res) => {
    try {
        if (!req.user.psa_api_key) return res.json({ connected: false, error: 'PSA API key not configured' });
        
        const axios = require('axios');
        const response = await axios.get('https://api.psacard.com/publicapi/cert/GetByCertNumber/12345678', {
            headers: { 'Authorization': `Bearer ${req.user.psa_api_key}` },
            timeout: 10000,
            validateStatus: () => true
        });
        
        if (response.status === 401) return res.json({ connected: false, error: 'Invalid API key' });
        
        res.json({ connected: true, message: 'PSA API connection successful' });
    } catch (error) {
        res.json({ connected: false, error: error.message });
    }
});

module.exports = router;

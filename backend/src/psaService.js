import fetch from "node-fetch";

const PSA_BASE = "https://api.psacard.com/publicapi";

// Rate limiting helper - PSA API has rate limits
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms between requests

async function rateLimitedFetch(url, options) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
    return fetch(url, options);
}

// Core PSA API fetch function with improved error handling
export async function psaGet(apiKey, path) {
    try {
          const res = await rateLimitedFetch(`${PSA_BASE}${path}`, {
                  headers: {
                            Authorization: `Bearer ${apiKey}`,
                            Accept: "application/json",
                            "User-Agent": "SlabDash/2.0"
                  },
                  timeout: 15000
          });

      if (!res.ok) {
              const errorText = await res.text();
              const error = new Error(`PSA API Error (${res.status}): ${errorText}`);
              error.status = res.status;
              error.response = errorText;
              throw error;
      }

      return res.json();
    } catch (error) {
          if (error.status) throw error;
          throw new Error(`PSA API Network Error: ${error.message}`);
    }
}

// ============================================
// SUBMISSION/ORDER ENDPOINTS
// ============================================

// Get submission progress by PSA submission/order number
export const getSubmissionProgress = (key, submission) =>
    psaGet(key, `/order/GetSubmissionProgress/${submission}`);

// Alternative order progress endpoint
export const getOrderProgress = (key, orderNumber) =>
    psaGet(key, `/order/GetProgress/${orderNumber}`);

// ============================================
// CERTIFICATION ENDPOINTS  
// ============================================

// Get cert details by certification number
export const getCertByNumber = (key, cert) =>
    psaGet(key, `/cert/GetByCertNumber/${cert}`);

// Get cert with additional file append data (for CSV exports)
export const getCertForFileAppend = (key, cert) =>
    psaGet(key, `/cert/GetByCertNumberForFileAppend/${cert}`);

// ============================================
// IMAGE ENDPOINTS
// ============================================

// Get high-quality card images by cert number
export const getImagesByCertNumber = (key, cert) =>
    psaGet(key, `/cert/GetImagesByCertNumber/${cert}`);

// ============================================
// POPULATION DATA ENDPOINTS
// ============================================

// Get PSA population data for a specific card
export const getPSASpecPopulation = (key, specId) =>
    psaGet(key, `/cert/GetPSASpecPopulation/${specId}`);

// ============================================
// BATCH/UTILITY FUNCTIONS
// ============================================

// Fetch multiple certs in parallel with rate limiting
export async function batchGetCerts(apiKey, certNumbers) {
    const results = [];
    const errors = [];

  for (const cert of certNumbers) {
        try {
                const data = await getCertByNumber(apiKey, cert);
                results.push({ cert, data, success: true });
        } catch (error) {
                errors.push({ cert, error: error.message, success: false });
        }
  }

  return { results, errors, total: certNumbers.length };
}

// Fetch cert with images combined
export async function getCertWithImages(apiKey, cert) {
    try {
          const [certData, imagesData] = await Promise.all([
                  getCertByNumber(apiKey, cert),
                  getImagesByCertNumber(apiKey, cert).catch(() => null)
                ]);

      return {
              ...certData,
              images: imagesData?.Images || [],
              frontImage: imagesData?.FrontImageURL || null,
              backImage: imagesData?.BackImageURL || null
      };
    } catch (error) {
          throw error;
    }
}

// Parse PSA status to determine completion state
export function parseOrderStatus(status) {
    if (!status) return { isComplete: false, stage: 'unknown' };

  const statusLower = status.toLowerCase();

  if (statusLower.includes('complete') || statusLower.includes('shipped')) {
        return { isComplete: true, stage: 'complete' };
  }
    if (statusLower.includes('grading') || statusLower.includes('grade')) {
          return { isComplete: false, stage: 'grading' };
    }
    if (statusLower.includes('research')) {
          return { isComplete: false, stage: 'research' };
    }
    if (statusLower.includes('assembly')) {
          return { isComplete: false, stage: 'assembly' };
    }
    if (statusLower.includes('received') || statusLower.includes('arrived')) {
          return { isComplete: false, stage: 'received' };
    }
    if (statusLower.includes('transit') || statusLower.includes('shipping')) {
          return { isComplete: false, stage: 'transit' };
    }

  return { isComplete: false, stage: 'processing' };
}

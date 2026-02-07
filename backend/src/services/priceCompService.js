/**
 * Price Comp Service
 * Fetches comparable sales data for graded cards from multiple sources
 */

const axios = require('axios');

/**
 * Build search query for a card
 */
function buildCardSearchQuery(card) {
  const parts = [];

  if (card.year) parts.push(card.year);
  if (card.brand) parts.push(card.brand);
  if (card.player_name) parts.push(card.player_name);
  if (card.set_name) parts.push(card.set_name);
  if (card.card_number) parts.push(`#${card.card_number}`);
  if (card.grade) parts.push(`PSA ${card.grade}`);

  return parts.join(' ');
}

/**
 * Fetch comps from eBay Finding API (sold listings)
 * Requires eBay App ID from environment
 */
async function fetchEbayComps(card) {
  const appId = process.env.EBAY_APP_ID;

  if (!appId) {
    console.log('eBay API not configured - skipping eBay comps');
    return { source: 'ebay', available: false, error: 'API not configured' };
  }

  try {
    const searchQuery = buildCardSearchQuery(card);

    // eBay Finding API endpoint
    const url = 'https://svcs.ebay.com/services/search/FindingService/v1';

    const params = {
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': searchQuery,
      'sortOrder': 'EndTimeSoonest',
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'itemFilter(1).name': 'Condition',
      'itemFilter(1).value': 'New', // Graded cards are typically listed as "New"
      'paginationInput.entriesPerPage': '100',
      'paginationInput.pageNumber': '1'
    };

    const response = await axios.get(url, { params, timeout: 10000 });

    const items = response.data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

    if (items.length === 0) {
      return { source: 'ebay', available: true, count: 0, listings: [] };
    }

    // Parse and format listings
    const listings = items.map(item => ({
      title: item.title?.[0],
      price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
      currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD',
      endTime: item.listingInfo?.[0]?.endTime?.[0],
      url: item.viewItemURL?.[0],
      condition: item.condition?.[0]?.conditionDisplayName?.[0],
      shippingCost: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0)
    }));

    // Calculate statistics
    const prices = listings.map(l => l.price).filter(p => p > 0);
    const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted.length > 0
      ? sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]
      : 0;
    const min = sorted.length > 0 ? sorted[0] : 0;
    const max = sorted.length > 0 ? sorted[sorted.length - 1] : 0;

    return {
      source: 'ebay',
      available: true,
      count: listings.length,
      listings: listings.slice(0, 20), // Return top 20 most recent
      stats: {
        average: Math.round(avg * 100) / 100,
        median: Math.round(median * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        count: prices.length
      },
      searchQuery
    };

  } catch (error) {
    console.error('Error fetching eBay comps:', error.message);
    return {
      source: 'ebay',
      available: true,
      error: error.message,
      count: 0
    };
  }
}

/**
 * Fetch comps from TCGPlayer API
 * For trading card games (Pokemon, Magic, Yu-Gi-Oh, etc.)
 */
async function fetchTCGPlayerComps(card) {
  const apiKey = process.env.TCGPLAYER_API_KEY;

  if (!apiKey) {
    console.log('TCGPlayer API not configured - skipping TCGPlayer comps');
    return { source: 'tcgplayer', available: false, error: 'API not configured' };
  }

  // TCGPlayer integration would go here
  // Requires OAuth authentication and product lookup
  // For now, return placeholder
  return {
    source: 'tcgplayer',
    available: false,
    error: 'Integration coming soon',
    count: 0
  };
}

/**
 * Fetch comps from PWCC Marketplace API
 * Auction data for high-end sports cards
 */
async function fetchPWCCComps(card) {
  // PWCC doesn't have a public API currently
  // Could be added if they release one
  return {
    source: 'pwcc',
    available: false,
    error: 'No public API available',
    count: 0
  };
}

/**
 * Main function to fetch all available comps for a card
 * Runs all sources in parallel and aggregates results
 */
async function fetchAllComps(card) {
  const startTime = Date.now();

  console.log(`Fetching comps for card ${card.id}: ${card.description || card.player_name}`);

  // Fetch from all sources in parallel
  const [ebayComps, tcgComps, pwccComps] = await Promise.all([
    fetchEbayComps(card),
    fetchTCGPlayerComps(card),
    fetchPWCCComps(card)
  ]);

  const sources = [ebayComps, tcgComps, pwccComps];
  const availableSources = sources.filter(s => s.available && s.count > 0);

  // Calculate overall price estimate from available sources
  let priceEstimate = null;

  if (availableSources.length > 0) {
    // Prefer median over average to avoid outlier skew
    const medians = availableSources
      .filter(s => s.stats?.median)
      .map(s => s.stats.median);

    if (medians.length > 0) {
      priceEstimate = Math.round((medians.reduce((a, b) => a + b, 0) / medians.length) * 100) / 100;
    }
  }

  const result = {
    cardId: card.id,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    sources: {
      ebay: ebayComps,
      tcgplayer: tcgComps,
      pwcc: pwccComps
    },
    priceEstimate,
    totalListings: sources.reduce((sum, s) => sum + (s.count || 0), 0),
    searchQuery: buildCardSearchQuery(card)
  };

  console.log(`Comp lookup completed in ${result.duration}ms - Found ${result.totalListings} comps, estimate: $${priceEstimate || 'N/A'}`);

  return result;
}

/**
 * Check if comp data is stale and needs refresh
 * @param {Date} lastCheck - Last comp check timestamp
 * @param {number} maxAgeDays - Max age in days before considered stale (default: 7)
 */
function isCompDataStale(lastCheck, maxAgeDays = 7) {
  if (!lastCheck) return true;

  const ageMs = Date.now() - new Date(lastCheck).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  return ageDays > maxAgeDays;
}

module.exports = {
  fetchAllComps,
  fetchEbayComps,
  fetchTCGPlayerComps,
  fetchPWCCComps,
  isCompDataStale,
  buildCardSearchQuery
};

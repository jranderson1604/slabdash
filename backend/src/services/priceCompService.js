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
 * Map card brand/sport to JustTCG game identifier
 */
function mapToJustTCGGame(card) {
  const brand = (card.brand || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const description = (card.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sport = (card.sport || '').toLowerCase();
  const game = (card.game || '').toLowerCase();

  // Direct game field match (from scan output)
  if (game === 'pokemon' || game === 'mtg' || game === 'yugioh' || game.includes('lorcana') || game.includes('digimon') || game.includes('one-piece') || game.includes('flesh') || game.includes('dragon-ball')) {
    return game;
  }

  if (brand.includes('pokemon') || description.includes('pokemon')) return 'pokemon';
  if (brand.includes('magic') || brand.includes('mtg') || description.includes('magic the gathering')) return 'mtg';
  if (brand.includes('yu-gi-oh') || brand.includes('yugioh') || description.includes('yu-gi-oh') || description.includes('yugioh')) return 'yugioh';
  if (brand.includes('lorcana') || description.includes('lorcana')) return 'disney-lorcana';
  if (brand.includes('one piece') || description.includes('one piece')) return 'one-piece-card-game';
  if (brand.includes('digimon') || description.includes('digimon')) return 'digimon-card-game';
  if (brand.includes('flesh and blood') || description.includes('flesh and blood')) return 'flesh-and-blood-tcg';
  if (brand.includes('dragon ball') || description.includes('dragon ball')) return 'dragon-ball-super-fusion-world';

  // Sports cards are not supported by JustTCG
  const sportsKeywords = ['baseball', 'basketball', 'football', 'hockey', 'soccer', 'topps', 'panini', 'donruss', 'bowman', 'upper deck'];
  if (sportsKeywords.some(kw => brand.includes(kw) || description.includes(kw) || sport.includes(kw))) {
    return null;
  }

  return null;
}

/**
 * Fetch comps from JustTCG API
 * TCG pricing for Pokemon, Magic, Yu-Gi-Oh, etc.
 * Requires JUSTTCG_API_KEY from environment
 * Uses progressive search: tries specific query first, then broader fallbacks
 */
async function fetchJustTCGComps(card) {
  const apiKey = process.env.JUSTTCG_API_KEY;

  if (!apiKey) {
    console.log('JustTCG: API key not configured — skipping');
    return { source: 'justtcg', available: false, error: 'API not configured' };
  }

  // Check if this card is a TCG card that JustTCG would have data for
  const game = mapToJustTCGGame(card);
  if (!game) {
    console.log('JustTCG: Not a TCG card — skipping. brand:', card.brand, 'game:', card.game, 'sport:', card.sport);
    return { source: 'justtcg', available: false, error: 'Card type not supported by JustTCG', count: 0 };
  }

  // Build search queries from most specific to broadest
  const searchQueries = [];

  // 1. Just the card name (most effective for JustTCG text search)
  if (card.player_name) {
    searchQueries.push(card.player_name);
  }

  // 2. Card name + set (if different from name)
  if (card.player_name && card.set_name) {
    searchQueries.push(`${card.player_name} ${card.set_name}`);
  }

  // 3. Just set + number (for when name search gets too many results)
  if (card.set_name && card.card_number) {
    searchQueries.push(`${card.set_name} ${card.card_number}`);
  }

  // 4. Description fallback
  if (searchQueries.length === 0 && card.description) {
    searchQueries.push(card.description);
  }

  if (searchQueries.length === 0) {
    console.log('JustTCG: No search terms available');
    return { source: 'justtcg', available: true, count: 0, listings: [], error: 'No search terms' };
  }

  const url = 'https://api.justtcg.com/v1/cards';

  // Try each search query until we get results
  for (let i = 0; i < searchQueries.length; i++) {
    const searchQuery = searchQueries[i];

    try {
      console.log(`JustTCG: Search attempt ${i + 1}/${searchQueries.length} — q="${searchQuery}" game=${game}`);

      const params = {
        q: searchQuery,
        game: game,
        include_price_history: false,
        limit: 25
      };

      const response = await axios.get(url, {
        params,
        headers: { 'x-api-key': apiKey },
        timeout: 10000
      });

      const cards = response.data?.data || [];
      console.log(`JustTCG: Got ${cards.length} card results for "${searchQuery}"`);

      if (cards.length === 0) {
        // Try next query
        continue;
      }

      // Flatten all variants across returned cards into listings
      const listings = [];
      for (const tcgCard of cards) {
        const variants = tcgCard.variants || [];
        for (const variant of variants) {
          if (variant.price && variant.price > 0) {
            listings.push({
              title: `${tcgCard.name} - ${tcgCard.set_name || tcgCard.set}`,
              price: variant.price,
              currency: 'USD',
              condition: variant.condition,
              printing: variant.printing,
              cardId: tcgCard.id,
              game: tcgCard.game,
              set: tcgCard.set_name,
              rarity: tcgCard.rarity,
              number: tcgCard.number,
              priceChange7d: variant.priceChange7d,
              priceChange30d: variant.priceChange30d,
              avgPrice7d: variant.avgPrice,
              avgPrice30d: variant.avgPrice30d,
              lastUpdated: variant.lastUpdated ? new Date(variant.lastUpdated * 1000).toISOString() : null
            });
          }
        }
      }

      if (listings.length === 0) {
        console.log(`JustTCG: Cards found but no priced variants for "${searchQuery}"`);
        continue;
      }

      // Sort by price descending (most relevant/valuable first)
      listings.sort((a, b) => b.price - a.price);

      // Calculate statistics
      const prices = listings.map(l => l.price);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const sorted = [...prices].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];

      console.log(`JustTCG: SUCCESS — ${listings.length} listings, median $${median.toFixed(2)}, range $${min.toFixed(2)}-$${max.toFixed(2)}`);

      return {
        source: 'justtcg',
        available: true,
        count: listings.length,
        listings: listings.slice(0, 20),
        stats: {
          average: Math.round(avg * 100) / 100,
          median: Math.round(median * 100) / 100,
          min: Math.round(min * 100) / 100,
          max: Math.round(max * 100) / 100,
          count: prices.length
        },
        searchQuery,
        game
      };

    } catch (error) {
      console.error(`JustTCG: Error on attempt ${i + 1} ("${searchQuery}"):`, error.message);

      if (error.response?.status === 401) {
        return { source: 'justtcg', available: false, error: 'Invalid API key', count: 0 };
      }
      if (error.response?.status === 429) {
        return { source: 'justtcg', available: true, error: 'Rate limit exceeded', count: 0 };
      }

      // Try next query on other errors
      continue;
    }
  }

  // Also try without the game filter as a last resort
  const lastQuery = searchQueries[0];
  try {
    console.log(`JustTCG: Final attempt without game filter — q="${lastQuery}"`);
    const response = await axios.get(url, {
      params: { q: lastQuery, include_price_history: false, limit: 25 },
      headers: { 'x-api-key': apiKey },
      timeout: 10000
    });

    const cards = response.data?.data || [];
    console.log(`JustTCG: No-filter got ${cards.length} results`);

    if (cards.length > 0) {
      const listings = [];
      for (const tcgCard of cards) {
        for (const variant of (tcgCard.variants || [])) {
          if (variant.price && variant.price > 0) {
            listings.push({
              title: `${tcgCard.name} - ${tcgCard.set_name || tcgCard.set}`,
              price: variant.price,
              currency: 'USD',
              condition: variant.condition,
              printing: variant.printing,
              cardId: tcgCard.id,
              game: tcgCard.game,
              set: tcgCard.set_name,
              rarity: tcgCard.rarity,
              number: tcgCard.number,
              priceChange7d: variant.priceChange7d,
              priceChange30d: variant.priceChange30d,
              lastUpdated: variant.lastUpdated ? new Date(variant.lastUpdated * 1000).toISOString() : null
            });
          }
        }
      }

      if (listings.length > 0) {
        listings.sort((a, b) => b.price - a.price);
        const prices = listings.map(l => l.price);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const sorted = [...prices].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

        console.log(`JustTCG: No-filter SUCCESS — ${listings.length} listings, median $${median.toFixed(2)}`);

        return {
          source: 'justtcg',
          available: true,
          count: listings.length,
          listings: listings.slice(0, 20),
          stats: {
            average: Math.round(avg * 100) / 100,
            median: Math.round(median * 100) / 100,
            min: Math.round(sorted[0] * 100) / 100,
            max: Math.round(sorted[sorted.length - 1] * 100) / 100,
            count: prices.length
          },
          searchQuery: lastQuery,
          game: game || 'unknown'
        };
      }
    }
  } catch (e) {
    console.error('JustTCG: Final no-filter attempt failed:', e.message);
  }

  console.log('JustTCG: All search attempts returned 0 results');
  return { source: 'justtcg', available: true, count: 0, listings: [] };
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
  const [ebayComps, tcgComps, pwccComps, justTCGComps] = await Promise.all([
    fetchEbayComps(card),
    fetchTCGPlayerComps(card),
    fetchPWCCComps(card),
    fetchJustTCGComps(card)
  ]);

  const sources = [ebayComps, tcgComps, pwccComps, justTCGComps];
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
      pwcc: pwccComps,
      justtcg: justTCGComps
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
  fetchJustTCGComps,
  isCompDataStale,
  buildCardSearchQuery
};

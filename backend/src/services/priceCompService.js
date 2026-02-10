/**
 * Price Comp Service
 * Fetches comparable sales data for graded cards from multiple sources
 */

const axios = require('axios');
const { JustTCG } = require('justtcg-js');

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
 * eBay OAuth token cache
 * Browse API requires OAuth client credentials token (expires after ~2 hours)
 */
let ebayTokenCache = { token: null, expiresAt: 0 };

/**
 * Get eBay OAuth application token (client credentials grant)
 * Requires EBAY_APP_ID (Client ID) and EBAY_CERT_ID (Client Secret)
 */
async function getEbayToken() {
  const clientId = process.env.EBAY_APP_ID;
  const clientSecret = process.env.EBAY_CERT_ID;

  if (!clientId || !clientSecret) return null;

  // Return cached token if still valid (with 5 min buffer)
  if (ebayTokenCache.token && Date.now() < ebayTokenCache.expiresAt - 300000) {
    return ebayTokenCache.token;
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      'https://api.ebay.com/identity/v1/oauth2/token',
      'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    const { access_token, expires_in } = response.data;
    ebayTokenCache = {
      token: access_token,
      expiresAt: Date.now() + (expires_in * 1000),
    };

    console.log(`eBay OAuth token obtained (expires in ${expires_in}s)`);
    return access_token;
  } catch (error) {
    console.error('eBay OAuth error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetch comps from eBay Browse API (active listings)
 * Uses OAuth client credentials. Requires EBAY_APP_ID + EBAY_CERT_ID.
 * Returns current market prices for the card.
 */
async function fetchEbayComps(card) {
  const appId = process.env.EBAY_APP_ID;

  if (!appId) {
    return { source: 'ebay', available: false, error: 'API not configured' };
  }

  // Need both App ID and Cert ID for Browse API OAuth
  if (!process.env.EBAY_CERT_ID) {
    return { source: 'ebay', available: false, error: 'EBAY_CERT_ID not configured' };
  }

  try {
    const token = await getEbayToken();
    if (!token) {
      return { source: 'ebay', available: false, error: 'Failed to get OAuth token' };
    }

    const searchQuery = buildCardSearchQuery(card);
    console.log(`eBay Browse API search: "${searchQuery}"`);

    // Browse API search endpoint
    const response = await axios.get('https://api.ebay.com/buy/browse/v1/item_summary/search', {
      params: {
        q: searchQuery,
        limit: 50,
        sort: 'newlyListed',
        filter: 'conditionIds:{1000}', // 1000 = New (graded cards listed as New)
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const items = response.data?.itemSummaries || [];

    if (items.length === 0) {
      return { source: 'ebay', available: true, count: 0, listings: [] };
    }

    // Parse and format listings
    const listings = items
      .filter(item => item.price?.value)
      .map(item => ({
        title: item.title,
        price: parseFloat(item.price.value),
        currency: item.price.currency || 'USD',
        endTime: item.itemEndDate || null,
        url: item.itemWebUrl,
        condition: item.condition,
        shippingCost: item.shippingOptions?.[0]?.shippingCost?.value
          ? parseFloat(item.shippingOptions[0].shippingCost.value)
          : 0,
        image: item.image?.imageUrl || null,
      }));

    if (listings.length === 0) {
      return { source: 'ebay', available: true, count: 0, listings: [] };
    }

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
      listings: listings.slice(0, 20),
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
    const status = error.response?.status;
    const ebayError = error.response?.data?.errors?.[0]?.message || error.message;
    console.error(`eBay Browse API error (${status || 'network'}):`, ebayError);
    return {
      source: 'ebay',
      available: false,
      error: ebayError,
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
 * Fetch comps from JustTCG API using official SDK
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

  // Initialize SDK client
  const client = new JustTCG({ apiKey });

  // Build search queries from most specific to broadest
  const searchQueries = [];
  if (card.player_name) searchQueries.push(card.player_name);
  if (card.player_name && card.set_name) searchQueries.push(`${card.player_name} ${card.set_name}`);
  if (card.set_name && card.card_number) searchQueries.push(`${card.set_name} ${card.card_number}`);
  if (searchQueries.length === 0 && card.description) searchQueries.push(card.description);

  if (searchQueries.length === 0) {
    console.log('JustTCG: No search terms available');
    return { source: 'justtcg', available: true, count: 0, listings: [], error: 'No search terms' };
  }

  // Try each search query until we get results
  for (let i = 0; i < searchQueries.length; i++) {
    const searchQuery = searchQueries[i];

    try {
      console.log(`JustTCG: Search attempt ${i + 1}/${searchQueries.length} — query="${searchQuery}" game=${game}`);

      const response = await client.v1.cards.search(searchQuery, {
        game: game,
        limit: 20,
        include_price_history: false
      });

      const allCards = response.data || [];
      console.log(`JustTCG: Got ${allCards.length} card results for "${searchQuery}"`);

      if (allCards.length === 0) continue;

      // Filter to EXACT card match — same name (case-insensitive) and preferably same set
      const targetName = (card.player_name || '').toLowerCase().trim();
      const targetSet = (card.set_name || '').toLowerCase().trim();
      const targetNumber = (card.card_number || '').replace(/^0+/, '').toLowerCase().trim();

      let matchedCards = allCards;

      // If we have a name, filter to exact name matches first
      if (targetName) {
        const nameMatches = allCards.filter(c =>
          c.name && c.name.toLowerCase().trim() === targetName
        );
        if (nameMatches.length > 0) matchedCards = nameMatches;
      }

      // If we have a set, narrow further
      if (targetSet && matchedCards.length > 1) {
        const setMatches = matchedCards.filter(c => {
          const cardSet = (c.set_name || c.set || '').toLowerCase();
          return cardSet.includes(targetSet) || targetSet.includes(cardSet);
        });
        if (setMatches.length > 0) matchedCards = setMatches;
      }

      // If we have a number, narrow to exact card
      if (targetNumber && matchedCards.length > 1) {
        const numMatches = matchedCards.filter(c => {
          const cardNum = (c.number || '').replace(/^0+/, '').toLowerCase().split('/')[0].trim();
          return cardNum === targetNumber.split('/')[0];
        });
        if (numMatches.length > 0) matchedCards = numMatches;
      }

      console.log(`JustTCG: Filtered ${allCards.length} → ${matchedCards.length} exact matches`);

      // Flatten variants from MATCHED cards only
      const listings = [];
      for (const tcgCard of matchedCards) {
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

      listings.sort((a, b) => b.price - a.price);

      const prices = listings.map(l => l.price);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const sorted = [...prices].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

      console.log(`JustTCG: SUCCESS — ${listings.length} listings, median $${median.toFixed(2)}, range $${sorted[0].toFixed(2)}-$${sorted[sorted.length - 1].toFixed(2)}`);

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
        searchQuery,
        game
      };

    } catch (error) {
      console.error(`JustTCG: Error on attempt ${i + 1} ("${searchQuery}"):`, error.message);
      if (error.message?.includes('Authentication') || error.message?.includes('API key')) {
        return { source: 'justtcg', available: false, error: 'Invalid API key', count: 0 };
      }
      continue;
    }
  }

  // Last resort: try just the card name without game filter
  try {
    const lastQuery = searchQueries[0];
    console.log(`JustTCG: Final attempt — query="${lastQuery}" (no game filter)`);
    const response = await client.v1.cards.search(lastQuery, {
      limit: 20,
      include_price_history: false
    });

    const allCards = response.data || [];
    console.log(`JustTCG: No-filter got ${allCards.length} results`);

    // Filter to exact name match
    const targetName = (card.player_name || '').toLowerCase().trim();
    let matchedCards = allCards;
    if (targetName) {
      const nameMatches = allCards.filter(c => c.name && c.name.toLowerCase().trim() === targetName);
      if (nameMatches.length > 0) matchedCards = nameMatches;
    }

    const listings = [];
    for (const tcgCard of matchedCards) {
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

/**
 * Fetch comps for a specific grade tier (raw, PSA 8, PSA 9, PSA 10)
 * Searches both JustTCG and eBay with grade-specific queries
 */
async function fetchTierComps(card, grade) {
  const gradeLabel = grade ? `PSA ${grade}` : null;

  // Build card lookup with grade appended
  const cardForLookup = {
    ...card,
    grade: grade || undefined,
  };

  // For eBay, we build a search query with the grade
  const ebayCard = {
    ...card,
    grade: grade || undefined,
  };

  // For JustTCG, search for the raw card (JustTCG returns ungraded market prices)
  // Only eBay has grade-specific sold data
  const promises = [];

  if (grade) {
    // Graded tier — eBay is the main source (sold graded cards)
    if (process.env.EBAY_APP_ID) {
      promises.push(fetchEbayComps(ebayCard));
    }
    // JustTCG doesn't differentiate by PSA grade, skip for graded tiers
  } else {
    // Raw tier — both sources
    promises.push(fetchJustTCGComps(cardForLookup));
    if (process.env.EBAY_APP_ID) {
      // eBay raw: search without grade, exclude "PSA" from results
      promises.push(fetchEbayComps(cardForLookup));
    }
  }

  if (promises.length === 0) {
    return { grade: gradeLabel || 'Raw', available: false, count: 0, avg: null, recent: [] };
  }

  try {
    const results = await Promise.all(promises);
    const available = results.filter(r => r.available && r.count > 0);

    if (available.length === 0) {
      return { grade: gradeLabel || 'Raw', available: false, count: 0, avg: null, recent: [] };
    }

    // Merge listings from all sources, sorted by most recent
    const allListings = [];
    for (const source of available) {
      for (const listing of (source.listings || [])) {
        allListings.push({
          ...listing,
          source: source.source,
        });
      }
    }

    // Sort by end time (most recent first) for eBay, or by price for JustTCG
    allListings.sort((a, b) => {
      if (a.endTime && b.endTime) return new Date(b.endTime) - new Date(a.endTime);
      return b.price - a.price;
    });

    // Calculate average from all sources
    const averages = available.filter(s => s.stats?.average).map(s => s.stats.average);
    const avg = averages.length > 0
      ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 100) / 100
      : null;

    // Get min/max across sources
    const mins = available.filter(s => s.stats?.min).map(s => s.stats.min);
    const maxes = available.filter(s => s.stats?.max).map(s => s.stats.max);

    return {
      grade: gradeLabel || 'Raw',
      available: true,
      count: allListings.length,
      avg,
      min: mins.length > 0 ? Math.min(...mins) : null,
      max: maxes.length > 0 ? Math.max(...maxes) : null,
      recent: allListings.slice(0, 5), // Last 5 sales
      sources: available.map(s => s.source),
    };
  } catch (error) {
    console.error(`Error fetching ${gradeLabel || 'Raw'} comps:`, error.message);
    return { grade: gradeLabel || 'Raw', available: false, count: 0, avg: null, recent: [], error: error.message };
  }
}

/**
 * Fetch graded pricing breakdown: Raw, PSA 8, PSA 9, PSA 10
 * Runs all 4 tiers in parallel for speed
 * @param {Object} cardInfo - Card identification info from scan
 * @returns {Object} { raw, psa8, psa9, psa10 } each with avg, recent sales, count
 */
async function fetchGradedPricing(cardInfo) {
  const baseCard = {
    player_name: cardInfo.name || '',
    set_name: cardInfo.set || '',
    card_number: cardInfo.number || '',
    year: cardInfo.year || '',
    brand: cardInfo.game || cardInfo.sport || '',
    game: cardInfo.game || '',
    description: `${cardInfo.name || ''} ${cardInfo.set || ''}`.trim(),
    sport: cardInfo.sport || '',
  };

  console.log(`📊 Fetching graded pricing breakdown for: ${baseCard.player_name} (${baseCard.set_name})`);

  // Run all 4 grade tiers in parallel
  const [raw, psa8, psa9, psa10] = await Promise.all([
    fetchTierComps(baseCard, null),    // Raw / ungraded
    fetchTierComps(baseCard, '8'),     // PSA 8
    fetchTierComps(baseCard, '9'),     // PSA 9
    fetchTierComps(baseCard, '10'),    // PSA 10
  ]);

  console.log(`💰 Graded pricing: Raw=$${raw.avg || 'N/A'} | PSA 8=$${psa8.avg || 'N/A'} | PSA 9=$${psa9.avg || 'N/A'} | PSA 10=$${psa10.avg || 'N/A'}`);

  return {
    raw,
    psa8,
    psa9,
    psa10,
    // Convenience: total listings across all tiers
    totalListings: raw.count + psa8.count + psa9.count + psa10.count,
    // Best estimate: use raw avg as the "current value"
    rawEstimate: raw.avg,
  };
}

module.exports = {
  fetchAllComps,
  fetchEbayComps,
  fetchTCGPlayerComps,
  fetchPWCCComps,
  fetchJustTCGComps,
  fetchGradedPricing,
  isCompDataStale,
  buildCardSearchQuery
};

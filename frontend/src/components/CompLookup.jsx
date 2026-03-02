import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, DollarSign, Calendar, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * CompLookup Component
 * Displays price comp data and allows triggering new lookups
 */
export default function CompLookup({ cardId, token, initialCard, onUpdate, readOnly = false }) {
  const [card, setCard] = useState(initialCard || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Load comp data if not provided
  useEffect(() => {
    if (!initialCard && cardId) {
      loadCompData();
    } else if (initialCard) {
      setCard(initialCard);
    }
  }, [cardId, initialCard]);

  const loadCompData = async () => {
    try {
      const authToken = token || localStorage.getItem('slabdash_token');
      const url = token
        ? `${API_URL}/cards/${cardId}/comps?token=${token}`
        : `${API_URL}/cards/${cardId}/comps`;

      const response = await fetch(url, {
        headers: token ? {} : {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to load comp data');

      const data = await response.json();
      setCard(data.card);
    } catch (err) {
      console.error('Error loading comp data:', err);
      setError(err.message);
    }
  };

  const triggerLookup = async (force = false) => {
    setLoading(true);
    setError(null);

    try {
      const authToken = token || localStorage.getItem('slabdash_token');
      const url = token
        ? `${API_URL}/cards/${cardId}/lookup-price?token=${token}&force=${force}`
        : `${API_URL}/cards/${cardId}/lookup-price?force=${force}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: token ? {} : {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to lookup prices');

      const data = await response.json();
      setCard(data.card);

      if (onUpdate) {
        onUpdate(data.card);
      }
    } catch (err) {
      console.error('Error looking up prices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!card) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <DollarSign className="w-5 h-5" />
          <span>Loading comp data...</span>
        </div>
      </div>
    );
  }

  const latestComp = card.comp_lookups?.[0];
  const hasComps = latestComp && latestComp.totalListings > 0;
  const isStale = card.last_comp_check
    ? (Date.now() - new Date(card.last_comp_check).getTime()) > (7 * 24 * 60 * 60 * 1000)
    : true;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-600 rounded-lg p-2">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-green-900">Market Price Comps</h4>
            {card.last_comp_check && (
              <p className="text-sm text-green-700 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Last updated: {new Date(card.last_comp_check).toLocaleDateString()}
                {isStale && <span className="text-amber-600 ml-2">(Update recommended)</span>}
              </p>
            )}
          </div>
        </div>

        {!readOnly && (
          <button
            onClick={() => triggerLookup(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Refresh Comps'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Price Estimate */}
      {card.price_estimate && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
          <div className="text-sm text-green-700 mb-1">Estimated Market Value</div>
          <div className="text-3xl font-bold text-green-900">
            ${(parseFloat(card.price_estimate) || 0).toFixed(2)}
          </div>
          {hasComps && latestComp.totalListings && (
            <div className="text-sm text-green-600 mt-1">
              Based on {latestComp.totalListings} recent sold listing{latestComp.totalListings !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* No Data */}
      {!hasComps && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              {!card.last_comp_check
                ? 'No price comps available yet. Click "Refresh Comps" to fetch market data.'
                : 'No comps found in the last lookup. Try refreshing or check card details.'}
            </div>
          </div>
        </div>
      )}

      {/* Comp Details */}
      {hasComps && (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {latestComp.sources.ebay?.stats && (
              <>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="text-xs text-green-600 mb-1">Average</div>
                  <div className="text-lg font-bold text-green-900">
                    ${latestComp.sources.ebay.stats.average}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="text-xs text-green-600 mb-1">Median</div>
                  <div className="text-lg font-bold text-green-900">
                    ${latestComp.sources.ebay.stats.median}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="text-xs text-green-600 mb-1">Low</div>
                  <div className="text-lg font-bold text-green-900">
                    ${latestComp.sources.ebay.stats.min}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="text-xs text-green-600 mb-1">High</div>
                  <div className="text-lg font-bold text-green-900">
                    ${latestComp.sources.ebay.stats.max}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Recent Listings */}
          {latestComp.sources.ebay?.listings && (
            <div className="mt-4">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-green-700 hover:text-green-900 font-medium mb-2 flex items-center gap-1"
              >
                {expanded ? '▼' : '▶'} View Recent Sold Listings ({latestComp.sources.ebay.listings.length})
              </button>

              {expanded && (
                <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {latestComp.sources.ebay.listings.slice(0, 10).map((listing, idx) => (
                      <div
                        key={idx}
                        className="p-3 border-b border-green-100 last:border-b-0 hover:bg-green-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 truncate">
                              {listing.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Sold: {new Date(listing.endTime).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-lg font-bold text-green-900">
                              ${listing.price.toFixed(2)}
                            </div>
                            {listing.url && (
                              <a
                                href={listing.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Data Source Info */}
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              Data sources: eBay Sold Listings
              {latestComp.searchQuery && (
                <span className="text-green-500">• Search: "{latestComp.searchQuery}"</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

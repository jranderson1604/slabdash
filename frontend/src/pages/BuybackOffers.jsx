import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { buyback } from '../api/client';
import {
  DollarSign,
  Plus,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

export default function BuybackOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'accepted', 'declined'

  const loadOffers = async () => {
    try {
      const res = await buyback.list({ limit: 100 });
      setOffers(res.data || []);
    } catch (error) {
      console.error('Failed to load buyback offers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const filteredOffers = offers.filter((offer) => {
    if (filter === 'all') return true;
    return offer.status === filter;
  });

  const getStatusBadge = (offer) => {
    if (offer.status === 'accepted') {
      return (
        <span className="badge badge-green flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Accepted
        </span>
      );
    }
    if (offer.status === 'declined') {
      return (
        <span className="badge badge-red flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Declined
        </span>
      );
    }
    if (new Date(offer.expires_at) < new Date()) {
      return (
        <span className="badge badge-gray flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    }
    return (
      <span className="badge badge-yellow flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buyback Offers</h1>
          <p className="text-gray-500 mt-1">Manage card purchase offers to customers</p>
        </div>
        <Link to="/buyback/new" className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Offer
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="card p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Offers
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'accepted'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setFilter('declined')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'declined'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Declined
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter !== 'all' ? 'No matching offers' : 'No buyback offers yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter !== 'all'
                ? 'Try adjusting your filter'
                : 'Create your first buyback offer to start purchasing cards from customers'}
            </p>
            {filter === 'all' && (
              <Link to="/buyback/new" className="btn btn-primary inline-flex">
                <Plus className="w-4 h-4" />
                Create First Offer
              </Link>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Cards</th>
                  <th>Offer Amount</th>
                  <th>Final Payout</th>
                  <th>Expires</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td>
                      <Link
                        to={`/customers/${offer.customer_id}`}
                        className="font-medium text-gray-900 hover:text-brand-600"
                      >
                        {offer.customer_name || 'Unknown Customer'}
                      </Link>
                      <p className="text-xs text-gray-500">{offer.customer_email}</p>
                    </td>
                    <td>
                      <span className="text-gray-900">{offer.card_count || 1} card{offer.card_count > 1 ? 's' : ''}</span>
                      {offer.is_bulk_offer && (
                        <span className="ml-2 text-xs text-brand-600 font-medium">
                          BULK -{offer.bulk_discount_percent}%
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="font-medium text-gray-900">
                        ${parseFloat(offer.offer_amount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className="font-bold text-lg text-gray-900">
                        ${parseFloat(offer.final_payout || 0).toFixed(2)}
                      </span>
                      {offer.total_grading_fees > 0 && (
                        <p className="text-xs text-gray-500">
                          (${parseFloat(offer.total_grading_fees).toFixed(2)} fees)
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="text-sm text-gray-600">
                        {new Date(offer.expires_at).toLocaleDateString()}
                      </span>
                      <p className="text-xs text-gray-400">
                        {new Date(offer.expires_at).toLocaleTimeString()}
                      </p>
                    </td>
                    <td>{getStatusBadge(offer)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredOffers.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

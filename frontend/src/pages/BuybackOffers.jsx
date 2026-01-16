import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2, XCircle, Clock, TrendingUp, Search, Filter } from 'lucide-react';
import apiClient from '../api/client';

export default function BuybackOffers() {
  const [offers, setOffers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOffers();
    fetchStats();
  }, [filterStatus]);

  const fetchOffers = async () => {
    try {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await apiClient.get('/api/buyback', { params });
      setOffers(response.data);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/api/buyback/stats/summary');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const updateOfferStatus = async (offerId, status, paymentMethod = null) => {
    try {
      await apiClient.patch(`/api/buyback/${offerId}/status`, {
        status,
        payment_method: paymentMethod
      });
      fetchOffers();
      fetchStats();
    } catch (err) {
      console.error('Failed to update offer status:', err);
      alert('Failed to update offer status');
    }
  };

  const filteredOffers = offers.filter(offer => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      offer.customer_name?.toLowerCase().includes(search) ||
      offer.card_description?.toLowerCase().includes(search) ||
      offer.player_name?.toLowerCase().includes(search) ||
      offer.psa_cert_number?.includes(search)
    );
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge badge-yellow',
      accepted: 'badge badge-green',
      rejected: 'badge badge-red',
      paid: 'badge badge-blue',
      cancelled: 'badge badge-gray'
    };
    return badges[status] || 'badge badge-gray';
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyback Offers</h1>
        <p className="text-gray-600">Manage purchase offers for customer cards</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-yellow-50 text-yellow-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_offers}</p>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xs text-gray-400">${parseFloat(stats.pending_value).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-50 text-green-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.accepted_offers}</p>
                <p className="text-sm text-gray-500">Accepted</p>
                <p className="text-xs text-gray-400">${parseFloat(stats.accepted_value).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.paid_offers}</p>
                <p className="text-sm text-gray-500">Paid</p>
                <p className="text-xs text-gray-400">${parseFloat(stats.paid_value).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-50 text-brand-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_offers}</p>
                <p className="text-sm text-gray-500">Total Offers</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by customer, card, player, or cert #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`btn ${filterStatus === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('accepted')}
              className={`btn ${filterStatus === 'accepted' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Accepted
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`btn ${filterStatus === 'paid' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Paid
            </button>
          </div>
        </div>
      </div>

      {/* Offers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Card</th>
                <th>Grade</th>
                <th>Cert #</th>
                <th>Offer Price</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    No offers found
                  </td>
                </tr>
              ) : (
                filteredOffers.map((offer) => (
                  <tr key={offer.id}>
                    <td>
                      <div>
                        <div className="font-medium text-gray-900">{offer.customer_name}</div>
                        <div className="text-sm text-gray-500">{offer.customer_email}</div>
                      </div>
                    </td>
                    <td>
                      <div className="max-w-xs">
                        <div className="font-medium text-gray-900 truncate">{offer.card_description}</div>
                        {offer.player_name && (
                          <div className="text-sm text-gray-500">{offer.player_name}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      {offer.card_grade ? (
                        <span className="badge badge-blue">{offer.card_grade}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">{offer.psa_cert_number || '—'}</td>
                    <td className="font-semibold text-green-600">
                      ${parseFloat(offer.offer_price).toFixed(2)}
                    </td>
                    <td>
                      <span className={getStatusBadge(offer.status)}>
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">
                      {new Date(offer.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {offer.status === 'pending' && (
                          <button
                            onClick={() => updateOfferStatus(offer.id, 'cancelled')}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Cancel
                          </button>
                        )}
                        {offer.status === 'accepted' && (
                          <button
                            onClick={() => {
                              const method = prompt('Payment method (stripe/paypal/cash/check):');
                              if (method) updateOfferStatus(offer.id, 'paid', method);
                            }}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* How to Create Offers */}
      <div className="card p-6 mt-6 bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Create Buyback Offers</h3>
        <p className="text-sm text-blue-800 mb-2">
          To create a buyback offer, go to the Cards page, find the card you want to purchase, and click "Make Offer".
        </p>
        <p className="text-sm text-blue-800">
          Customers will be notified via email and can accept or reject your offer through their portal.
        </p>
      </div>
    </div>
  );
}

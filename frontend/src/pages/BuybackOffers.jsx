import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, CheckCircle2, XCircle, Clock, TrendingUp, Search, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { buyback } from '../api/client';

export default function BuybackOffers() {
  const toast = useToast();
  const [offers, setOffers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('venmo');
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    fetchOffers();
    fetchStats();
  }, [filterStatus]);

  const fetchOffers = async () => {
    try {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await buyback.list(params);
      setOffers(response.data);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await buyback.stats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const cancelOffer = async (offerId) => {
    if (!confirm('Cancel this buyback offer?')) return;
    try {
      await buyback.cancel(offerId);
      toast.success('Offer cancelled');
      fetchOffers();
      fetchStats();
    } catch (err) {
      console.error('Failed to cancel offer:', err);
      toast.error(err.response?.data?.error || 'Failed to cancel offer');
    }
  };

  const deleteOffer = async (offerId) => {
    if (!confirm('Permanently delete this offer? This cannot be undone.')) return;
    try {
      await buyback.delete(offerId);
      toast.success('Offer deleted');
      fetchOffers();
      fetchStats();
    } catch (err) {
      console.error('Failed to delete offer:', err);
      toast.error(err.response?.data?.error || 'Failed to delete offer');
    }
  };

  const markAsPaid = async () => {
    if (!paymentModal) return;
    try {
      await buyback.markPaid(paymentModal, {
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined
      });
      toast.success('Offer marked as paid');
      setPaymentModal(null);
      setPaymentMethod('venmo');
      setPaymentReference('');
      fetchOffers();
      fetchStats();
    } catch (err) {
      console.error('Failed to mark as paid:', err);
      toast.error(err.response?.data?.error || 'Failed to mark as paid');
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-8 shadow-xl mb-8">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg">BUYBACK OFFERS</h1>
            <p className="text-white/90 text-lg font-semibold">Manage purchase offers for customer cards</p>
          </div>
          <Link to="/buyback/new" className="btn bg-white text-brand-600 hover:bg-white/90 font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Offer
          </Link>
        </div>
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
                <p className="text-xs text-gray-600 font-medium">${(parseFloat(stats.pending_value) || 0).toFixed(2)}</p>
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
                <p className="text-xs text-gray-600 font-medium">${(parseFloat(stats.accepted_value) || 0).toFixed(2)}</p>
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
                <p className="text-xs text-gray-600 font-medium">${(parseFloat(stats.paid_value) || 0).toFixed(2)}</p>
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
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">{offer.psa_cert_number || '-'}</td>
                    <td className="font-semibold text-green-600">
                      ${(parseFloat(offer.offer_price) || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={getStatusBadge(offer.status)}>
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </span>
                      {offer.customer_response && (
                        <p className="text-xs text-gray-500 mt-1 max-w-[150px] truncate" title={offer.customer_response}>
                          "{offer.customer_response}"
                        </p>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">
                      {new Date(offer.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {offer.status === 'pending' && (
                          <button
                            onClick={() => cancelOffer(offer.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Cancel
                          </button>
                        )}
                        {offer.status === 'accepted' && (
                          <button
                            onClick={() => setPaymentModal(offer.id)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                        {(offer.status === 'cancelled' || offer.status === 'rejected') && (
                          <button
                            onClick={() => deleteOffer(offer.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete offer"
                          >
                            <Trash2 className="w-4 h-4" />
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
          Click "New Offer" above, or go to the Cards page, find the card you want to purchase, and click the green dollar icon.
        </p>
        <p className="text-sm text-blue-800">
          Customers will be notified via email and can accept or reject your offer through their portal.
        </p>
      </div>

      {/* Payment Method Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPaymentModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark as Paid</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input w-full"
                >
                  <option value="venmo">Venmo</option>
                  <option value="paypal">PayPal</option>
                  <option value="zelle">Zelle</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Reference / Note (optional)</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. Venmo @username, check #1234"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setPaymentModal(null)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={markAsPaid} className="btn btn-primary flex-1">
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

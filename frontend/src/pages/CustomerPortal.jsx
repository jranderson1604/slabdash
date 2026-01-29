import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import {
  Package, Loader2, AlertTriangle, CheckCircle2, Clock, DollarSign, X,
  MapPin, ChevronDown, ChevronUp, Mail, Phone, ExternalLink, Key
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Submission Card Component
function SubmissionCard({ submission, onExpand, isExpanded }) {
  const getStatusColor = () => {
    if (submission.shipped) return 'bg-green-100 text-green-800 border-green-300';
    if (submission.problem_order) return 'bg-red-100 text-red-800 border-red-300';
    if (submission.grades_ready) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const getStatusText = () => {
    if (submission.shipped) return 'Delivered';
    if (submission.grades_ready) return 'Ready for Pickup';
    if (submission.problem_order) return 'Needs Attention';
    return submission.current_step || 'Processing';
  };

  const showPickupCode = submission.grades_ready && !submission.picked_up && submission.pickup_code;

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-6 cursor-pointer" onClick={onExpand}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {submission.psa_submission_number || submission.internal_id || 'Submission'}
            </h3>
            <p className="text-gray-600 mt-1">{submission.service_level || 'Standard Service'}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">Progress</span>
            <span className="font-bold text-lg">{submission.progress_percent || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                submission.progress_percent >= 100 ? 'bg-green-500' :
                submission.progress_percent >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${submission.progress_percent || 0}%` }}
            />
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            <span className="font-bold text-gray-900">{submission.card_count || 0}</span> cards
          </span>
          {submission.date_sent && (
            <span className="text-gray-500">
              Sent {format(new Date(submission.date_sent), 'MMM d, yyyy')}
            </span>
          )}
          <button className="text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isExpanded ? 'Hide' : 'View'} Details
          </button>
        </div>
      </div>

      {/* Pickup Code Alert (if ready) */}
      {showPickupCode && (
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Key className="w-6 h-6 text-green-600" />
              <h4 className="font-bold text-green-900 text-lg">Ready for Pickup!</h4>
            </div>
            <p className="text-green-700 mb-3">Your pickup code:</p>
            <div className="bg-white rounded-lg border-2 border-green-400 p-4 text-center">
              <p className="text-5xl font-bold text-green-600 tracking-widest font-mono">
                {submission.pickup_code}
              </p>
            </div>
            <p className="text-sm text-green-700 mt-3 text-center">
              Show this code when you come to pick up your cards
            </p>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          {/* Pickup QR Code */}
          {showPickupCode && (
            <div className="mb-6 flex justify-center">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3 font-medium">Scan this at pickup:</p>
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                  <QRCodeSVG
                    value={JSON.stringify({
                      type: 'slabdash_pickup',
                      submission_id: submission.id,
                      pickup_code: submission.pickup_code,
                      submission_number: submission.psa_submission_number || submission.internal_id
                    })}
                    size={200}
                    level="H"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Progress Steps */}
          {submission.steps?.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-3">Progress Timeline</h4>
              <div className="space-y-3">
                {submission.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold">{i + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.step_name}
                      </p>
                      {step.completed_at && (
                        <p className="text-xs text-gray-500">
                          {format(new Date(step.completed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cards List */}
          {submission.cards?.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Cards ({submission.cards.length})</h4>
              <div className="space-y-2">
                {submission.cards.map((card) => (
                  <div key={card.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">
                        {card.player_name || card.description || 'Card'}
                      </p>
                      {card.psa_cert_number && (
                        <p className="text-xs text-gray-500">Cert #{card.psa_cert_number}</p>
                      )}
                    </div>
                    {card.grade && (
                      <span className="text-2xl font-bold text-green-600">
                        PSA {card.grade}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
            {submission.return_tracking && (
              <div>
                <p className="text-gray-500 mb-1">Return Tracking</p>
                <p className="font-medium text-gray-900">{submission.return_tracking}</p>
              </div>
            )}
            {submission.psa_order_number && (
              <div>
                <p className="text-gray-500 mb-1">PSA Order #</p>
                <p className="font-medium text-gray-900">{submission.psa_order_number}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Buyback Offer Card
function BuybackCard({ offer, onRespond }) {
  const [responding, setResponding] = useState(false);

  const handleResponse = async (response) => {
    if (!confirm(`${response === 'accepted' ? 'Accept' : 'Decline'} this offer for $${offer.offer_price}?`)) {
      return;
    }

    setResponding(true);
    try {
      await onRespond(offer.id, response);
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">
            {offer.card_description || offer.player_name || 'Card'}
          </h3>
          {offer.card_grade && (
            <p className="text-gray-600 mt-1">PSA {offer.card_grade}</p>
          )}
          {offer.psa_cert_number && (
            <p className="text-sm text-gray-500">Cert #{offer.psa_cert_number}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-green-600">${parseFloat(offer.offer_price).toFixed(2)}</p>
          <p className="text-sm text-gray-500">Offer</p>
        </div>
      </div>

      {offer.notes && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-700">{offer.notes}</p>
        </div>
      )}

      {offer.status === 'pending' && (
        <div className="flex gap-3">
          <button
            onClick={() => handleResponse('accepted')}
            disabled={responding}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {responding ? 'Processing...' : 'Accept Offer'}
          </button>
          <button
            onClick={() => handleResponse('rejected')}
            disabled={responding}
            className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {offer.status !== 'pending' && (
        <div className={`text-center py-3 rounded-lg font-bold ${
          offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
          offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
        </div>
      )}
    </div>
  );
}

// Main Portal Component
export default function CustomerPortal() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expandedSubmission, setExpandedSubmission] = useState(null);

  const token = searchParams.get('token');

  useEffect(() => {
    loadPortalData();
  }, [token]);

  const loadPortalData = async () => {
    try {
      const response = await fetch(`${API_URL}/portal/access?token=${token}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load portal');
      }

      setData(result);
      setLoading(false);
    } catch (error) {
      console.error('Portal load error:', error);
      setLoading(false);
    }
  };

  const handleBuybackResponse = async (offerId, response) => {
    try {
      await fetch(`${API_URL}/portal/buyback-offers/${offerId}/respond?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });
      // Reload data to refresh offer status
      loadPortalData();
    } catch (error) {
      alert('Failed to respond to offer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading your submissions...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Invalid Link</h2>
          <p className="text-gray-600 mb-6">This portal link is invalid or has expired.</p>
          <p className="text-sm text-gray-500">Please contact the shop for a new link.</p>
        </div>
      </div>
    );
  }

  const activeSubmissions = data.submissions.filter(s => !s.shipped);
  const completedSubmissions = data.submissions.filter(s => s.shipped);
  const pendingOffers = data.buybackOffers.filter(o => o.status === 'pending');
  const respondedOffers = data.buybackOffers.filter(o => o.status !== 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">{data.company.name}</h1>
            <p className="text-brand-100 text-lg">Customer Portal</p>
          </div>
          <div className="mt-6 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
            <p className="font-bold text-xl">{data.customer.name}</p>
            <p className="text-brand-100">{data.customer.email}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Active Submissions */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Package className="w-8 h-8 text-brand-600" />
            My Submissions
            {activeSubmissions.length > 0 && (
              <span className="px-4 py-1 bg-brand-100 text-brand-700 rounded-full text-lg font-bold">
                {activeSubmissions.length}
              </span>
            )}
          </h2>

          {activeSubmissions.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
              <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Active Submissions</h3>
              <p className="text-gray-600">Your submissions will appear here once you drop off cards</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  isExpanded={expandedSubmission === submission.id}
                  onExpand={() => setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Buyback Offers */}
        {pendingOffers.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              Buyback Offers
              <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-lg font-bold">
                {pendingOffers.length}
              </span>
            </h2>
            <div className="grid gap-4">
              {pendingOffers.map((offer) => (
                <BuybackCard key={offer.id} offer={offer} onRespond={handleBuybackResponse} />
              ))}
            </div>
          </section>
        )}

        {/* Completed Submissions */}
        {completedSubmissions.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-700 mb-4 flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
              Completed Submissions ({completedSubmissions.length})
            </h2>
            <div className="space-y-3">
              {completedSubmissions.map((submission) => (
                <div key={submission.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {submission.psa_submission_number || submission.internal_id}
                      </h4>
                      <p className="text-sm text-gray-600">{submission.card_count || 0} cards</p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Responded Buyback Offers */}
        {respondedOffers.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Past Buyback Offers</h2>
            <div className="grid gap-4">
              {respondedOffers.map((offer) => (
                <BuybackCard key={offer.id} offer={offer} onRespond={handleBuybackResponse} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>Questions? Contact {data.company.name}</p>
        </div>
      </div>
    </div>
  );
}

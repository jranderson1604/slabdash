import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import {
  LayoutDashboard, Package, CreditCard, Upload, DollarSign, MapPin, FileText,
  CheckCircle2, Clock, AlertTriangle, Loader2, Search, X, ChevronRight,
  TrendingUp, Award, ShoppingBag, Users, Key, Truck, Mail, Phone, Image as ImageIcon
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Tab Component
function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-brand-100 text-brand-700">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Dashboard Tab
function DashboardTab({ customer, stats, submissions, buybackOffers, pickups }) {
  const activeSubmissions = submissions.filter(s => !s.shipped);
  const readyForPickup = pickups.filter(p => !p.picked_up);
  const pendingOffers = buybackOffers.filter(o => o.status === 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {customer.name.split(' ')[0]}! 👋</h2>
        <p className="text-gray-600 mt-1">Here's what's happening with your cards</p>
      </div>

      {/* Action Items */}
      {(readyForPickup.length > 0 || pendingOffers.length > 0) && (
        <div className="space-y-3">
          {readyForPickup.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-900">🎉 Cards Ready for Pickup!</h3>
                  <p className="text-sm text-green-700">{readyForPickup.length} submission(s) ready</p>
                </div>
                <ChevronRight className="w-5 h-5 text-green-600" />
              </div>
            </div>
          )}

          {pendingOffers.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900">New Buyback Offers</h3>
                  <p className="text-sm text-blue-700">{pendingOffers.length} offer(s) waiting for response</p>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-brand-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.active_submissions || 0}</p>
          <p className="text-sm text-gray-600">Active Submissions</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total_cards || 0}</p>
          <p className="text-sm text-gray-600">Total Cards</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.graded_cards || 0}</p>
          <p className="text-sm text-gray-600">Graded Cards</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">${parseFloat(stats.total_earnings || 0).toFixed(0)}</p>
          <p className="text-sm text-gray-600">Buyback Earnings</p>
        </div>
      </div>

      {/* Recent Submissions */}
      {activeSubmissions.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Active Submissions</h3>
          <div className="space-y-3">
            {activeSubmissions.slice(0, 3).map((sub) => (
              <SubmissionCard key={sub.id} submission={sub} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Submission Card Component
function SubmissionCard({ submission, compact = false }) {
  const getStatusIcon = () => {
    if (submission.shipped) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (submission.problem_order) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (submission.grades_ready) return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
    return <Clock className="w-5 h-5 text-yellow-600" />;
  };

  const getStatusColor = () => {
    if (submission.shipped) return 'bg-green-100 text-green-800 border-green-200';
    if (submission.problem_order) return 'bg-red-100 text-red-800 border-red-200';
    if (submission.grades_ready) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-gray-900">{submission.psa_submission_number || submission.internal_id}</h4>
          <p className="text-sm text-gray-600">{submission.service_level || 'Standard Service'}</p>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}>
          {getStatusIcon()}
          <span>{submission.shipped ? 'Delivered' : submission.grades_ready ? 'Ready' : submission.current_step || 'Processing'}</span>
        </div>
      </div>

      {!compact && (
        <>
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span className="font-medium">{submission.progress_percent || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
                style={{ width: `${submission.progress_percent || 0}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{submission.card_count || 0} cards</span>
            {submission.date_sent && (
              <span className="text-gray-500">Sent {format(new Date(submission.date_sent), 'MMM d')}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Pickups Tab
function PickupsTab({ pickups }) {
  const pending = pickups.filter(p => !p.picked_up);
  const completed = pickups.filter(p => p.picked_up);
  const [showQR, setShowQR] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pickups & Delivery</h2>
        <p className="text-gray-600 mt-1">View your pickup codes and delivery status</p>
      </div>

      {/* Pending Pickups */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">📦 Ready for Pickup ({pending.length})</h3>
          <div className="space-y-4">
            {pending.map((pickup) => (
              <div key={pickup.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* QR Code */}
                  {pickup.pickup_code && (
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                        <QRCodeSVG
                          value={JSON.stringify({
                            type: 'slabdash_pickup',
                            submission_id: pickup.id,
                            pickup_code: pickup.pickup_code
                          })}
                          size={150}
                          level="H"
                        />
                      </div>
                      <button
                        onClick={() => setShowQR(pickup.id)}
                        className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        View Full Size
                      </button>
                    </div>
                  )}

                  {/* Pickup Info */}
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      {pickup.psa_submission_number || pickup.internal_id}
                    </h4>

                    {pickup.pickup_code && (
                      <div className="bg-white rounded-lg border border-green-300 p-4 mb-4">
                        <p className="text-sm text-gray-600 mb-1">Your Pickup Code:</p>
                        <p className="text-4xl font-bold text-green-600 tracking-widest font-mono">
                          {pickup.pickup_code}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">Show this code when picking up your cards</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Cards</p>
                        <p className="font-bold text-gray-900">{pickup.my_card_count || pickup.card_count || 0} cards</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Service</p>
                        <p className="font-bold text-gray-900">{pickup.service_level || 'Standard'}</p>
                      </div>
                      {pickup.customer_cost && (
                        <div>
                          <p className="text-gray-600">Amount Due</p>
                          <p className="font-bold text-gray-900">${parseFloat(pickup.customer_cost).toFixed(2)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600">Delivery</p>
                        <p className="font-bold text-gray-900 capitalize">{pickup.delivery_method || 'Pickup'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Pickups */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">✅ Completed Pickups ({completed.length})</h3>
          <div className="space-y-3">
            {completed.map((pickup) => (
              <div key={pickup.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900">{pickup.psa_submission_number || pickup.internal_id}</h4>
                    <p className="text-sm text-gray-600">
                      Picked up {pickup.picked_up_at && format(new Date(pickup.picked_up_at), 'MMM d, yyyy')}
                      {pickup.picked_up_by && ` by ${pickup.picked_up_by}`}
                    </p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pickups.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pickups yet</h3>
          <p className="text-gray-600">Your pickup codes will appear here when your cards are ready</p>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(null)}>
          <div className="bg-white rounded-xl p-8 max-w-md">
            <QRCodeSVG
              value={JSON.stringify({
                type: 'slabdash_pickup',
                submission_id: showQR,
                pickup_code: pickups.find(p => p.id === showQR)?.pickup_code
              })}
              size={300}
              level="H"
            />
            <p className="text-center mt-4 text-6xl font-bold text-brand-600 font-mono tracking-wider">
              {pickups.find(p => p.id === showQR)?.pickup_code}
            </p>
          </div>
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [cards, setCards] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [invoices, setInvoices] = useState([]);

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

      // Load additional data
      const [statsRes, cardsRes, pickupsRes, invoicesRes] = await Promise.all([
        fetch(`${API_URL}/portal/stats?token=${token}`),
        fetch(`${API_URL}/portal/cards?token=${token}`),
        fetch(`${API_URL}/portal/pickups?token=${token}`),
        fetch(`${API_URL}/portal/invoices?token=${token}`)
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (cardsRes.ok) setCards(await cardsRes.json());
      if (pickupsRes.ok) setPickups(await pickupsRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());

      setLoading(false);
    } catch (error) {
      console.error('Portal load error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Portal Link</h2>
          <p className="text-gray-600">This portal link is invalid or has expired. Please contact the shop for a new link.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
    { id: 'submissions', label: 'My Submissions', icon: Package, badge: 0 },
    { id: 'cards', label: 'My Cards', icon: CreditCard, badge: cards.length },
    { id: 'pickups', label: 'Pickups', icon: MapPin, badge: pickups.filter(p => !p.picked_up).length },
    { id: 'buyback', label: 'Buyback Offers', icon: DollarSign, badge: data.buybackOffers.filter(o => o.status === 'pending').length },
    { id: 'invoices', label: 'Invoices', icon: FileText, badge: 0 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{data.company.name}</h1>
              <p className="text-gray-600 mt-1">Customer Portal</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900">{data.customer.name}</p>
              <p className="text-sm text-gray-600">{data.customer.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'dashboard' && (
          <DashboardTab
            customer={data.customer}
            stats={stats}
            submissions={data.submissions}
            buybackOffers={data.buybackOffers}
            pickups={pickups}
          />
        )}

        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">My Submissions</h2>
            {data.submissions.map(sub => (
              <SubmissionCard key={sub.id} submission={sub} />
            ))}
          </div>
        )}

        {activeTab === 'pickups' && <PickupsTab pickups={pickups} />}
      </div>
    </div>
  );
}

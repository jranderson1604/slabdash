import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Package,
  Mail,
  TrendingUp,
  Activity,
  Shield,
  Loader2,
  AlertCircle,
  Crown,
  Zap
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function StatCard({ icon: Icon, label, value, subtext, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${colors[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState(null);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [newsletterForm, setNewsletterForm] = useState({
    subject: '',
    message: '',
    targetPlan: 'all'
  });
  const [sending, setSending] = useState(false);

  // Only allow owner role
  if (user?.role !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('slabdash_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, companiesRes, activityRes] = await Promise.all([
        fetch(`${API_URL}/owner/stats`, { headers }),
        fetch(`${API_URL}/owner/companies`, { headers }),
        fetch(`${API_URL}/owner/activity?limit=15`, { headers })
      ]);

      if (!statsRes.ok) throw new Error('Failed to load platform data');

      setStats(await statsRes.json());
      setCompanies(await companiesRes.json());
      setActivity(await activityRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendNewsletter = async () => {
    try {
      setSending(true);
      const token = localStorage.getItem('slabdash_token');
      const response = await fetch(`${API_URL}/owner/newsletter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newsletterForm)
      });

      if (!response.ok) throw new Error('Failed to send newsletter');

      const result = await response.json();
      alert(`Newsletter prepared for ${result.recipientCount} shops!\n\nNote: Email integration pending.`);
      setShowNewsletter(false);
      setNewsletterForm({ subject: '', message: '', targetPlan: 'all' });
    } catch (err) {
      alert('Failed to send newsletter: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Platform Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" />
            Platform Control
          </h1>
          <p className="text-gray-600 mt-1">Manage your SlabDash shops</p>
        </div>
        <button
          onClick={() => setShowNewsletter(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Send Newsletter
        </button>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          icon={Building2}
          label="Total Shops"
          value={stats?.total_shops || 0}
          subtext={`${stats?.new_shops_30d || 0} new this month`}
          color="blue"
        />
        <StatCard
          icon={Crown}
          label="Enterprise"
          value={stats?.enterprise_shops || 0}
          subtext="Premium clients"
          color="purple"
        />
        <StatCard
          icon={Zap}
          label="Pro Plans"
          value={stats?.pro_shops || 0}
          subtext="Active subscriptions"
          color="orange"
        />
        <StatCard
          icon={Package}
          label="Total Submissions"
          value={stats?.total_submissions || 0}
          subtext={`${stats?.submissions_7d || 0} this week`}
          color="green"
        />
        <StatCard
          icon={Users}
          label="Shop Users"
          value={stats?.total_users || 0}
          subtext="Active accounts"
          color="blue"
        />
      </div>

      {/* All Shops Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            All Client Shops
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cards Tracked</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{company.name}</div>
                    <div className="text-xs text-gray-500">/{company.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{company.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      company.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                      company.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                      company.plan === 'starter' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {company.plan || 'free'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {company.user_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {company.submission_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {company.card_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Newsletter Modal */}
      {showNewsletter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-purple-600" />
                Send Newsletter to Shops
              </h3>
              <button
                onClick={() => setShowNewsletter(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={newsletterForm.targetPlan}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, targetPlan: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Shops</option>
                  <option value="enterprise">Enterprise Only</option>
                  <option value="pro">Pro Only</option>
                  <option value="starter">Starter Only</option>
                  <option value="free">Free Plan Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={newsletterForm.subject}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, subject: e.target.value })}
                  placeholder="Newsletter subject..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={newsletterForm.message}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, message: e.target.value })}
                  placeholder="Write your newsletter message..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={sendNewsletter}
                  disabled={sending || !newsletterForm.subject || !newsletterForm.message}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Newsletter
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowNewsletter(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

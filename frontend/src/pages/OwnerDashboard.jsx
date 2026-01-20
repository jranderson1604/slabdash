import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Package,
  CreditCard,
  DollarSign,
  TrendingUp,
  Activity,
  Shield,
  Loader2,
  AlertCircle
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
  const [customers, setCustomers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState(null);

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
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, companiesRes, customersRes, activityRes] = await Promise.all([
        fetch(`${API_URL}/owner/stats`, { headers }),
        fetch(`${API_URL}/owner/companies`, { headers }),
        fetch(`${API_URL}/owner/customers?limit=10`, { headers }),
        fetch(`${API_URL}/owner/activity?limit=15`, { headers })
      ]);

      if (!statsRes.ok) throw new Error('Failed to load platform data');

      setStats(await statsRes.json());
      setCompanies(await companiesRes.json());
      setCustomers(await customersRes.json());
      setActivity(await activityRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            Platform Owner Dashboard
          </h1>
          <p className="text-gray-600 mt-1">System-wide control and monitoring</p>
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Building2}
          label="Total Shops"
          value={stats?.total_companies || 0}
          subtext={`${stats?.paid_plan_count || 0} paid, ${stats?.free_plan_count || 0} free`}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Total Customers"
          value={stats?.total_customers || 0}
          subtext={`${stats?.total_users || 0} shop users`}
          color="green"
        />
        <StatCard
          icon={Package}
          label="Total Submissions"
          value={stats?.total_submissions || 0}
          subtext={`${stats?.active_submissions || 0} active`}
          color="purple"
        />
        <StatCard
          icon={CreditCard}
          label="Total Cards"
          value={stats?.total_cards || 0}
          subtext={`${stats?.graded_cards || 0} graded`}
          color="orange"
        />
      </div>

      {/* Buyback Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={DollarSign}
          label="Buyback Offers"
          value={stats?.total_buyback_offers || 0}
          subtext={`${stats?.pending_buyback_offers || 0} pending`}
          color="pink"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Buyback Value"
          value={`$${(stats?.total_buyback_value || 0).toLocaleString()}`}
          subtext="Paid out to customers"
          color="green"
        />
      </div>

      {/* Companies List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            All Shops
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cards</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{company.name}</div>
                      <div className="text-xs text-gray-500">{company.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      company.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                      company.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                      company.plan === 'starter' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {company.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.user_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.customer_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.submission_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.card_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Platform Activity
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {activity.map((item, index) => (
            <div key={index} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  {item.activity_type === 'company' && (
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">New Shop:</span> {item.name}
                    </p>
                  )}
                  {item.activity_type === 'submission' && (
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{item.company_name}</span> created submission {item.psa_submission_number || item.internal_id}
                      {item.customer_name && <span className="text-gray-500"> for {item.customer_name}</span>}
                    </p>
                  )}
                  {item.activity_type === 'buyback' && (
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{item.company_name}</span> {item.status} buyback offer ${item.offer_price}
                      {item.customer_name && <span className="text-gray-500"> to {item.customer_name}</span>}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{new Date(item.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { submissions, customers } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Loader2,
  DollarSign,
  Bell,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, subtext, color = 'brand', link }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  const content = (
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="card p-6 hover:border-brand-500 hover:shadow-lg transition-all cursor-pointer">
        {content}
      </Link>
    );
  }

  return <div className="card p-6">{content}</div>;
}

function ProgressBar({ percent, showLabel = true }) {
  const getColor = (p) => {
    if (p >= 100) return 'bg-green-500';
    if (p >= 75) return 'bg-blue-500';
    if (p >= 50) return 'bg-yellow-500';
    return 'bg-brand-500';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 progress-bar">
        <div
          className={`progress-bar-fill ${getColor(percent)}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-600 w-10 text-right">{percent}%</span>
      )}
    </div>
  );
}

function RecentSubmissionRow({ submission }) {
  const getStatusBadge = (sub) => {
    if (sub.shipped) return <span className="badge badge-green">Shipped</span>;
    if (sub.problem_order) return <span className="badge badge-red">Problem</span>;
    if (sub.grades_ready) return <span className="badge badge-blue">Grades Ready</span>;
    return <span className="badge badge-yellow">{sub.current_step || 'In Progress'}</span>;
  };

  return (
    <tr>
      <td>
        <Link to={`/submissions/${submission.id}`} className="font-medium text-gray-900 hover:text-brand-500 transition-colors">
          {submission.psa_submission_number || submission.internal_id || 'No ID'}
        </Link>
      </td>
      <td className="text-gray-600">{submission.customer_name || '—'}</td>
      <td>
        <ProgressBar percent={submission.progress_percent || 0} />
      </td>
      <td>{getStatusBadge(submission)}</td>
      <td className="text-gray-500">{submission.card_count || 0} cards</td>
    </tr>
  );
}

export default function Dashboard() {
  const { company } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentSubs, setRecentSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [subsRes, custsRes] = await Promise.all([
        submissions.list({ limit: 100 }),
        customers.list({ limit: 100 }),
      ]);

      const subs = subsRes.data.submissions || [];
      const custs = custsRes.data.customers || [];

      // Calculate stats
      const inProgress = subs.filter(s => !s.shipped).length;
      const gradesReady = subs.filter(s => s.grades_ready && !s.shipped).length;
      const problems = subs.filter(s => s.problem_order).length;

      setStats({
        totalSubmissions: subs.length,
        inProgress,
        gradesReady,
        problems,
        totalCustomers: custs.length,
      });

      // Get recent submissions (not shipped) - limit to 3 for compact dashboard
      setRecentSubs(subs.filter(s => !s.shipped).slice(0, 3));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    if (!company?.hasPsaKey) return;
    setRefreshing(true);
    try {
      await submissions.refreshAll();
      await loadData();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your PSA submissions</p>
        </div>
        {company?.hasPsaKey && (
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="btn btn-secondary gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh All'}
          </button>
        )}
      </div>

      {/* PSA API Warning */}
      {!company?.hasPsaKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">PSA API not configured</p>
            <p className="text-sm text-yellow-700 mt-1">
              Connect your PSA API key in{' '}
              <Link to="/settings" className="underline hover:no-underline">
                Settings
              </Link>{' '}
              to enable automatic status updates.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid - Clickable cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Active Submissions"
          value={stats?.inProgress || 0}
          subtext={`${stats?.totalSubmissions || 0} total • Click to view`}
          color="brand"
          link="/submissions"
        />
        <StatCard
          icon={Clock}
          label="Grades Ready"
          value={stats?.gradesReady || 0}
          subtext="Awaiting pickup • Click to view"
          color="blue"
          link="/submissions"
        />
        <StatCard
          icon={AlertTriangle}
          label="Problems"
          value={stats?.problems || 0}
          subtext="Need attention • Click to view"
          color="yellow"
          link="/submissions"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={stats?.totalCustomers || 0}
          subtext="Click to view all"
          color="green"
          link="/customers"
        />
      </div>

      {/* Two-column layout for Notifications and Buyback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand-500" />
                Recent Activity
              </h2>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {stats?.gradesReady > 0 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Grades Ready</p>
                  <p className="text-xs text-blue-700">{stats.gradesReady} submission{stats.gradesReady !== 1 ? 's' : ''} ready for pickup</p>
                </div>
              </div>
            )}
            {stats?.problems > 0 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Attention Needed</p>
                  <p className="text-xs text-yellow-700">{stats.problems} submission{stats.problems !== 1 ? 's' : ''} flagged with issues</p>
                </div>
              </div>
            )}
            {(!stats?.gradesReady && !stats?.problems) && (
              <p className="text-sm text-gray-500 text-center py-4">No new notifications</p>
            )}
          </div>
        </div>

        {/* Recent Buyback Offers */}
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Buyback Offers
              </h2>
              <Link
                to="/buyback"
                className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1 transition-colors"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-500 text-center py-4">No active buyback offers</p>
            <Link to="/buyback/new" className="btn btn-secondary w-full text-sm">
              <DollarSign className="w-4 h-4" />
              Create Buyback Offer
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Submissions - Compact view */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Recent Submissions</h2>
            <Link
              to="/submissions"
              className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {recentSubs.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active submissions</h3>
            <p className="text-gray-500 mb-4">Create your first submission to get started</p>
            <Link to="/submissions/new" className="btn btn-primary">
              New Submission
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Submission #</th>
                  <th>Customer</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Cards</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentSubs.map((sub) => (
                  <RecentSubmissionRow key={sub.id} submission={sub} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/submissions/new"
          className="card p-6 hover:border-brand-500 hover:shadow-lg transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center group-hover:bg-brand-500 transition-colors">
              <Package className="w-5 h-5 text-brand-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-bold text-black group-hover:text-brand-600 transition-colors">New Submission</p>
              <p className="text-sm text-gray-700 font-medium">Track a new PSA order</p>
            </div>
          </div>
        </Link>

        <Link
          to="/customers/new"
          className="card p-6 hover:border-brand-500 hover:shadow-lg transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center group-hover:bg-brand-500 transition-colors">
              <Users className="w-5 h-5 text-brand-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-bold text-black group-hover:text-brand-600 transition-colors">Add Customer</p>
              <p className="text-sm text-gray-700 font-medium">Create a new customer</p>
            </div>
          </div>
        </Link>

        <Link
          to="/settings"
          className="card p-6 hover:border-brand-500 hover:shadow-lg transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center group-hover:bg-brand-500 transition-colors">
              <TrendingUp className="w-5 h-5 text-brand-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-bold text-black group-hover:text-brand-600 transition-colors">Connect PSA</p>
              <p className="text-sm text-gray-700 font-medium">Set up API integration</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

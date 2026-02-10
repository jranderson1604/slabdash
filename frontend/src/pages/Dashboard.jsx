import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { submissions, customers, psa } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AdminWalkthrough from '../components/AdminWalkthrough';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
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
  PlayCircle,
} from 'lucide-react';

function RecentSubmissionRow({ submission }) {
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
      <td>
        <StatusBadge submission={submission} showTooltip={false} />
      </td>
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
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const loadData = async () => {
    try {
      const [subsRes, custsRes] = await Promise.all([
        submissions.list({}),
        customers.list({}),
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
      await psa.refreshAll();
      await loadData();
    } catch (error) {
      console.error('Refresh failed:', error);
      alert('Failed to refresh submissions. Please try again.');
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
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your PSA submissions"
        variant="large"
        actions={
          <>
            <button
              onClick={() => setShowWalkthrough(true)}
              className="bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border-2 border-white/30 shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
            >
              <PlayCircle className="w-5 h-5" />
              <span>Tutorial</span>
            </button>
            {company?.hasPsaKey && (
              <button
                onClick={handleRefreshAll}
                disabled={refreshing}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border-2 border-white/30 shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh All'}</span>
              </button>
            )}
          </>
        }
      />

      {/* PSA API Warning */}
      {!company?.hasPsaKey && (
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.12)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
          <div>
            <p className="font-bold" style={{ color: '#92400E' }}>PSA API not configured</p>
            <p className="text-sm font-medium mt-1" style={{ color: '#B45309' }}>
              Connect your PSA API key in{' '}
              <Link to="/settings" className="underline hover:no-underline font-bold">
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
          <div className="p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'rgb(var(--dark))' }}>
                <Bell className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
                Recent Activity
              </h2>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {stats?.gradesReady > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-2xl"
                style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.1)' }}
              >
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#2563EB' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1E3A8A' }}>Grades Ready</p>
                  <p className="text-xs font-medium" style={{ color: '#1D4ED8' }}>{stats.gradesReady} submission{stats.gradesReady !== 1 ? 's' : ''} ready for pickup</p>
                </div>
              </div>
            )}
            {stats?.problems > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-2xl"
                style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.1)' }}
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#78350F' }}>Attention Needed</p>
                  <p className="text-xs font-medium" style={{ color: '#B45309' }}>{stats.problems} submission{stats.problems !== 1 ? 's' : ''} flagged with issues</p>
                </div>
              </div>
            )}
            {(!stats?.gradesReady && !stats?.problems) && (
              <p className="text-sm font-medium text-center py-4" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>No new notifications</p>
            )}
          </div>
        </div>

        {/* Recent Buyback Offers */}
        <div className="card">
          <div className="p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'rgb(var(--dark))' }}>
                <DollarSign className="w-5 h-5" style={{ color: '#059669' }} />
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
            <Link to="/buyback/new" className="btn btn-secondary w-full text-sm flex items-center justify-center gap-2">
              <DollarSign className="w-4 h-4" />
              Create Buyback Offer
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Submissions - Compact view */}
      <div className="card">
        <div className="p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ color: 'rgb(var(--dark))' }}>Recent Submissions</h2>
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

      {/* Interactive Tutorial Banner */}
      <div className="rounded-3xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.85), rgba(124, 58, 237, 0.9), rgba(109, 40, 217, 0.95))',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(196, 181, 253, 0.3)',
          boxShadow: '0 8px 40px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(196, 181, 253, 0.3)',
        }}
      >
        <div className="p-6 relative">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
            style={{ background: 'rgba(196, 181, 253, 0.15)' }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <PlayCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white mb-1">Interactive Admin Tutorial</h3>
                <p className="text-sm font-semibold" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                  Children's museum style walkthrough -- Learn CSV upload, customer management, order completion & emails
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWalkthrough(true)}
              className="px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap"
              style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(12px)',
                color: '#FFF',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              Launch Tutorial
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/submissions/new" className="card p-6 transition-all group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(255, 129, 112, 0.1)', border: '1px solid rgba(255, 129, 112, 0.12)' }}
            >
              <Package className="w-5 h-5" style={{ color: '#E8543D' }} />
            </div>
            <div>
              <p className="font-bold" style={{ color: 'rgb(var(--dark))' }}>New Submission</p>
              <p className="text-sm font-medium" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Track a new PSA order</p>
            </div>
          </div>
        </Link>

        <Link to="/customers/new" className="card p-6 transition-all group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.12)' }}
            >
              <Users className="w-5 h-5" style={{ color: '#059669' }} />
            </div>
            <div>
              <p className="font-bold" style={{ color: 'rgb(var(--dark))' }}>Add Customer</p>
              <p className="text-sm font-medium" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Create a new customer</p>
            </div>
          </div>
        </Link>

        <Link to="/settings" className="card p-6 transition-all group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.12)' }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p className="font-bold" style={{ color: 'rgb(var(--dark))' }}>Connect PSA</p>
              <p className="text-sm font-medium" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Set up API integration</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Walkthrough Modal */}
      {showWalkthrough && (
        <AdminWalkthrough onClose={() => setShowWalkthrough(false)} />
      )}
    </div>
  );
}

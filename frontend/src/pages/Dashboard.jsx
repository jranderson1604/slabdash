import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { submissions, psa, companies, buyback } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AdminWalkthrough from '../components/AdminWalkthrough';
import OnboardingChecklist from '../components/OnboardingChecklist';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
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
  Zap,
  BarChart3,
} from 'lucide-react';

function UsageMeter({ label, current, limit, percent }) {
  const clamped = Math.min(percent, 100);
  const color = clamped >= 90 ? '#ef4444' : clamped >= 75 ? '#f59e0b' : '#10b981';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: 'rgb(var(--bg-text))', opacity: 0.7 }}>{label}</span>
        <span className="text-xs font-bold tabular-nums" style={{ color: clamped >= 75 ? color : 'rgb(var(--bg-text))' }}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(128,128,128,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
    </div>
  );
}

function RecentSubmissionRow({ submission }) {
  return (
    <tr>
      <td>
        <Link to={`/submissions/${submission.id}`} className="font-medium hover:text-brand-500 transition-colors" style={{ color: 'rgb(var(--dark))' }}>
          {submission.psa_submission_number || submission.internal_id || 'No ID'}
        </Link>
      </td>
      <td>{submission.customer_name || '—'}</td>
      <td>
        <ProgressBar percent={submission.progress_percent || 0} />
      </td>
      <td>
        <StatusBadge submission={submission} showTooltip={false} />
      </td>
      <td style={{ opacity: 0.6 }}>{submission.card_count || 0} cards</td>
    </tr>
  );
}

export default function Dashboard() {
  const { company } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [recentSubs, setRecentSubs] = useState([]);
  const [usage, setUsage] = useState(null);
  const [recentBuybacks, setRecentBuybacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const loadData = async () => {
    try {
      const [subsRes, usageRes, buybackRes] = await Promise.all([
        submissions.list({}),
        companies.usage().catch(() => ({ data: null })),
        buyback.list({ status: 'pending' }).catch(() => ({ data: [] })),
      ]);

      const subs = subsRes.data.submissions || [];

      // Calculate stats from submissions (customers already in usage)
      const inProgress = subs.filter(s => !s.shipped).length;
      const gradesReady = subs.filter(s => s.grades_ready && !s.shipped).length;
      const problems = subs.filter(s => s.problem_order).length;

      setStats({
        totalSubmissions: subs.length,
        inProgress,
        gradesReady,
        problems,
        totalCustomers: usageRes.data?.customers ?? 0,
      });

      if (usageRes.data) setUsage(usageRes.data);
      setRecentBuybacks((buybackRes.data || []).slice(0, 3));

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
    setRefreshProgress({ total: 0, current: 0, updated: 0, errors: 0 });

    try {
      const token = localStorage.getItem('slabdash_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${API_URL}/psa/refresh-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'start') {
                setRefreshProgress({ total: data.total, totalActive: data.totalActive, current: 0, updated: 0, errors: 0 });
              } else if (data.type === 'progress') {
                setRefreshProgress(prev => ({
                  ...prev,
                  current: data.current,
                  updated: data.updated,
                  errors: data.errors,
                }));
              } else if (data.type === 'complete') {
                setRefreshProgress(prev => ({ ...prev, ...data, done: true }));
                const msg = data.changedCount > 0
                  ? `Refresh complete! ${data.changedCount} submission${data.changedCount !== 1 ? 's' : ''} updated, ${data.noChangeCount} unchanged`
                  : `Refresh complete — ${data.updated} checked, no changes found`;
                toast.success(msg);
                await loadData();
              } else if (data.type === 'rate_limited') {
                toast.error(data.message || 'PSA rate limit reached');
              } else if (data.type === 'error') {
                toast.error(data.error || 'Refresh failed');
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh submissions. Please try again.');
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshProgress(null), 5000);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FF8170' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,129,112,0.06) 0%, rgba(232,84,61,0.04) 100%)',
          border: '1px solid rgba(255,129,112,0.15)',
          boxShadow: '0 0 40px rgba(255,129,112,0.04), inset 0 1px 0 rgba(255,129,112,0.08)',
        }}
      >
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#FF8170', letterSpacing: '-0.01em' }}>
              {company?.name}
            </h1>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
              PSA Submission Tracking
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setShowWalkthrough(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: 'rgba(255,129,112,0.08)',
                border: '1px solid rgba(255,129,112,0.2)',
                color: 'rgba(255,129,112,0.9)',
              }}
            >
              <PlayCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Tour</span>
            </button>

            {company?.hasPsaKey && (
              <button
                onClick={handleRefreshAll}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                style={{
                  background: 'rgba(255,129,112,0.1)',
                  border: '1px solid rgba(255,129,112,0.25)',
                  color: '#FF8170',
                }}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Sync PSA'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

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

      {/* Onboarding checklist — shown to new shops until all steps complete */}
      <OnboardingChecklist company={company} stats={stats} />

      {/* HUD Stat Readouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Active Submissions"
          value={stats?.inProgress || 0}
          subtext={`${stats?.totalSubmissions || 0} total tracked`}
          color="brand"
          link="/submissions"
        />
        <StatCard
          icon={CheckCircle2}
          label="Grades Ready"
          value={stats?.gradesReady || 0}
          subtext="Awaiting customer pickup"
          color="blue"
          link="/submissions"
        />
        <StatCard
          icon={AlertTriangle}
          label="Problem Orders"
          value={stats?.problems || 0}
          subtext="Require attention"
          color="yellow"
          link="/submissions"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={stats?.totalCustomers || 0}
          subtext="Registered in system"
          color="green"
          link="/customers"
        />
      </div>

      {/* Plan Usage Meters — only shown when on a paid plan with limits */}
      {usage && (usage.cards_limit || usage.customers_limit) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'rgb(var(--dark))' }}>
              <BarChart3 className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
              Plan Usage
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
              style={{ background: 'rgba(255,129,112,0.1)', color: '#E8543D' }}
            >
              {usage.plan} plan
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {usage.cards_limit && (
              <UsageMeter
                label="Cards this month"
                current={usage.cards_this_month}
                limit={usage.cards_limit}
                percent={usage.cards_percent}
              />
            )}
            {usage.customers_limit && (
              <UsageMeter
                label="Total customers"
                current={usage.customers}
                limit={usage.customers_limit}
                percent={usage.customers_percent}
              />
            )}
          </div>
          {(usage.cards_percent >= 80 || usage.customers_percent >= 80) && (
            <div className="mt-4 pt-4 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Approaching your plan limit — upgrade for unlimited access
              </p>
              <Link to="/settings?tab=billing"
                className="text-xs font-bold flex items-center gap-1 transition-colors"
                style={{ color: '#E8543D' }}
              >
                <Zap className="w-3.5 h-3.5" />
                Upgrade
              </Link>
            </div>
          )}
        </div>
      )}

      {refreshing && refreshProgress && (
        <div className="rounded-2xl p-4"
          style={{
            background: 'rgba(255,129,112,0.04)',
            border: '1px solid rgba(255,129,112,0.18)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#FF8170' }} />
              <span className="text-xs font-semibold" style={{ color: '#FF8170' }}>Syncing with PSA...</span>
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {refreshProgress.current} of {refreshProgress.total}
              {refreshProgress.updated > 0 && <span className="ml-2" style={{ color: '#10b981' }}>{refreshProgress.updated} updated</span>}
              {refreshProgress.errors > 0 && <span className="ml-2 text-red-500">{refreshProgress.errors} errors</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,129,112,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${refreshProgress.total > 0 ? (refreshProgress.current / refreshProgress.total) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #E8543D, #FF8170)',
              }}
            />
          </div>
        </div>
      )}

      {/* Two-column layout for Notifications and Buyback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="card">
          <div className="p-4" style={{ borderBottom: '1px solid rgba(255,129,112,0.06)' }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: '#FF8170' }} />
              <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>Alerts</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {stats?.gradesReady > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#065f46' }}>Grades ready for pickup</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>{stats.gradesReady} submission{stats.gradesReady !== 1 ? 's' : ''} awaiting customer pickup</p>
                </div>
              </div>
            )}
            {stats?.problems > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#92400e' }}>Problem orders need review</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>{stats.problems} submission{stats.problems !== 1 ? 's' : ''} flagged — action required</p>
                </div>
              </div>
            )}
            {(!stats?.gradesReady && !stats?.problems) && (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: '#10b981', opacity: 0.5 }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>All clear — no alerts</p>
              </div>
            )}
          </div>
        </div>

        {/* Buyback Offers */}
        <div className="card">
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,129,112,0.06)' }}>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: '#10b981' }} />
              <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>Buyback Offers</p>
            </div>
            <Link
              to="/buyback"
              className="flex items-center gap-1 text-xs font-bold transition-all"
              style={{ color: 'rgba(255,129,112,0.85)' }}
            >
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            {recentBuybacks.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>No pending offers</p>
                <Link to="/buyback/new" className="btn btn-secondary w-full text-sm flex items-center justify-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Create Buyback Offer
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentBuybacks.map(offer => (
                  <Link key={offer.id} to="/buyback"
                    className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-black/[0.02]"
                    style={{ border: '1px solid rgba(0,0,0,0.04)' }}
                  >
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>
                        {offer.customer_name || 'Customer'}
                      </p>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {offer.card_description || 'Card'}
                      </p>
                    </div>
                    <span className="text-sm font-black" style={{ color: '#059669' }}>
                      ${parseFloat(offer.offer_amount || 0).toFixed(2)}
                    </span>
                  </Link>
                ))}
                <Link to="/buyback" className="text-xs font-semibold flex items-center justify-center gap-1 pt-1 transition-colors"
                  style={{ color: 'rgb(var(--brand-500))' }}
                >
                  View all offers <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Submissions */}
      <div className="card">
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,129,112,0.06)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: '#FF8170' }} />
            <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>Active Submissions</p>
          </div>
          <Link
            to="/submissions"
            className="flex items-center gap-1 text-xs font-bold transition-all"
            style={{ color: 'rgba(255,129,112,0.85)' }}
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentSubs.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-brand-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active submissions</h3>
            <p className="text-gray-500 mb-4">No active submissions found.</p>
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

      {/* Quick Commands */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/submissions/new" className="group relative rounded-2xl p-5 transition-all cursor-pointer overflow-hidden"
          style={{
            background: 'rgba(255,129,112,0.04)',
            border: '1px solid rgba(255,129,112,0.12)',
          }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(255,129,112,0.04)' }}
          />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
              style={{ background: 'rgba(255,129,112,0.1)', border: '1px solid rgba(255,129,112,0.2)' }}
            >
              <Package className="w-5 h-5" style={{ color: '#FF8170' }} />
            </div>
            <div>
              <p className="font-bold" style={{ color: 'rgb(var(--dark))' }}>New Submission</p>
            </div>
          </div>
        </Link>

        <Link to="/customers/new" className="group relative rounded-2xl p-5 transition-all cursor-pointer overflow-hidden"
          style={{
            background: 'rgba(16,185,129,0.04)',
            border: '1px solid rgba(16,185,129,0.12)',
          }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(16,185,129,0.04)' }}
          />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <Users className="w-5 h-5" style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="font-bold" style={{ color: 'rgb(var(--dark))' }}>New Customer</p>
            </div>
          </div>
        </Link>

        <Link to="/settings" className="group relative rounded-2xl p-5 transition-all cursor-pointer overflow-hidden"
          style={{
            background: 'rgba(139,92,246,0.04)',
            border: '1px solid rgba(139,92,246,0.12)',
          }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(139,92,246,0.04)' }}
          />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
            >
              <Zap className="w-5 h-5" style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <p className="font-bold" style={{ color: 'rgb(var(--dark))' }}>Connect PSA</p>
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

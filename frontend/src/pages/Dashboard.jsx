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
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        {/* Arc reactor boot animation */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full arc-spin-slow"
            style={{ border: '2px solid rgba(255,129,112,0.3)', borderTopColor: '#FF8170' }}
          />
          <div className="absolute inset-2 rounded-full arc-spin-reverse"
            style={{ border: '1px solid rgba(255,129,112,0.15)', borderBottomColor: 'rgba(255,129,112,0.6)' }}
          />
          <div className="w-4 h-4 rounded-full arc-pulse-anim"
            style={{ background: '#FF8170', boxShadow: '0 0 12px rgba(255,129,112,0.8), 0 0 24px rgba(255,129,112,0.4)' }}
          />
        </div>
        <p className="hud-label">SAM // Initializing systems...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Arc reactor ambient field */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-16 right-24 w-72 h-72 rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(255,129,112,0.12) 0%, transparent 70%)',
            animation: 'ambientFloat 14s ease-in-out infinite',
          }}
        />
        <div className="absolute top-1/3 left-8 w-56 h-56 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(255,107,89,0.1) 0%, transparent 70%)',
            animation: 'ambientFloat 18s ease-in-out infinite reverse',
          }}
        />
        <div className="absolute bottom-24 right-1/4 w-64 h-64 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255,129,112,0.08) 0%, transparent 70%)',
            animation: 'ambientFloat 22s ease-in-out infinite',
            animationDelay: '-7s',
          }}
        />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,129,112,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,129,112,0.8) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* HUD Header */}
      <div className="relative rounded-2xl overflow-hidden stark-scanline"
        style={{
          background: 'linear-gradient(135deg, rgba(255,129,112,0.06) 0%, rgba(232,84,61,0.04) 100%)',
          border: '1px solid rgba(255,129,112,0.15)',
          boxShadow: '0 0 40px rgba(255,129,112,0.04), inset 0 1px 0 rgba(255,129,112,0.08)',
        }}
      >
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div className="hud-boot">
            <p className="hud-label mb-1">// Operations Center</p>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#FF8170', textShadow: '0 0 20px rgba(255,129,112,0.4)', letterSpacing: '-0.01em' }}>
              COMMAND CENTER
            </h1>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              {company?.name} · PSA Submission Tracking Active
            </p>
          </div>

          {/* Arc reactor status ring + actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Arc reactor animation */}
            <div className="relative w-10 h-10 hidden sm:flex items-center justify-center flex-shrink-0">
              <div className="absolute inset-0 rounded-full arc-spin-slow"
                style={{ border: '1px solid rgba(255,129,112,0.3)', borderTopColor: 'rgba(255,129,112,0.8)' }}
              />
              <div className="absolute inset-1.5 rounded-full arc-spin-reverse"
                style={{ border: '1px solid rgba(255,129,112,0.15)', borderBottomColor: 'rgba(255,129,112,0.5)' }}
              />
              <div className="w-3 h-3 rounded-full arc-pulse-anim"
                style={{ background: '#FF8170', boxShadow: '0 0 8px rgba(255,129,112,0.8), 0 0 16px rgba(255,129,112,0.4)' }}
              />
            </div>

            <button
              onClick={() => setShowWalkthrough(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{
                background: 'rgba(255,129,112,0.08)',
                border: '1px solid rgba(255,129,112,0.2)',
                color: 'rgba(255,129,112,0.8)',
              }}
            >
              <PlayCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Briefing</span>
            </button>

            {company?.hasPsaKey && (
              <button
                onClick={handleRefreshAll}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105"
                style={{
                  background: refreshing ? 'rgba(255,129,112,0.15)' : 'rgba(255,129,112,0.1)',
                  border: '1px solid rgba(255,129,112,0.3)',
                  color: '#FF8170',
                  boxShadow: refreshing ? '0 0 16px rgba(255,129,112,0.2)' : 'none',
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
          label="Active Missions"
          value={stats?.inProgress || 0}
          subtext={`${stats?.totalSubmissions || 0} total tracked`}
          color="brand"
          link="/submissions"
        />
        <StatCard
          icon={CheckCircle2}
          label="Intel Confirmed"
          value={stats?.gradesReady || 0}
          subtext="Grades ready for retrieval"
          color="blue"
          link="/submissions"
        />
        <StatCard
          icon={AlertTriangle}
          label="Threat Alerts"
          value={stats?.problems || 0}
          subtext="Require immediate action"
          color="yellow"
          link="/submissions"
        />
        <StatCard
          icon={Users}
          label="Operatives"
          value={stats?.totalCustomers || 0}
          subtext="Active in the field"
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

      {/* PSA Sync — Arc Charge Progress */}
      {refreshing && refreshProgress && (
        <div className="rounded-2xl p-4 stark-scanline"
          style={{
            background: 'rgba(255,129,112,0.04)',
            border: '1px solid rgba(255,129,112,0.2)',
            boxShadow: '0 0 20px rgba(255,129,112,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#FF8170' }} />
              <span className="hud-label">SAM // Syncing with PSA servers...</span>
            </div>
            <span className="text-xs font-mono" style={{ color: 'rgba(255,129,112,0.7)' }}>
              {refreshProgress.current}/{refreshProgress.total}
              {refreshProgress.updated > 0 && <span className="ml-2" style={{ color: '#10b981' }}>+{refreshProgress.updated}</span>}
              {refreshProgress.errors > 0 && <span className="ml-1 text-red-400">{refreshProgress.errors} ERR</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,129,112,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${refreshProgress.total > 0 ? (refreshProgress.current / refreshProgress.total) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #E8543D, #FF8170)',
                boxShadow: '0 0 8px rgba(255,129,112,0.6)',
              }}
            />
          </div>
        </div>
      )}

      {/* Two-column layout for Notifications and Buyback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SAM Alert Feed */}
        <div className="card">
          <div className="p-4" style={{ borderBottom: '1px solid rgba(255,129,112,0.06)' }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: '#FF8170', filter: 'drop-shadow(0 0 5px rgba(255,129,112,0.7))' }} />
              <p className="hud-label">// Alert Feed</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {stats?.gradesReady > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,129,112,0.05)', border: '1px solid rgba(255,129,112,0.12)' }}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#FF8170', filter: 'drop-shadow(0 0 4px rgba(255,129,112,0.6))' }} />
                <div>
                  <p className="text-xs font-black" style={{ color: '#FF8170', letterSpacing: '0.05em' }}>INTEL CONFIRMED</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'rgb(var(--bg-text))' }}>{stats.gradesReady} submission{stats.gradesReady !== 1 ? 's' : ''} — grades ready for retrieval</p>
                </div>
              </div>
            )}
            {stats?.problems > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                <div>
                  <p className="text-xs font-black" style={{ color: '#F59E0B', letterSpacing: '0.05em' }}>THREAT DETECTED</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'rgb(var(--bg-text))' }}>{stats.problems} mission{stats.problems !== 1 ? 's' : ''} flagged — immediate action required</p>
                </div>
              </div>
            )}
            {(!stats?.gradesReady && !stats?.problems) && (
              <div className="text-center py-4">
                <p className="hud-label">ALL SYSTEMS NOMINAL</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No active alerts</p>
              </div>
            )}
          </div>
        </div>

        {/* Asset Acquisition */}
        <div className="card">
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,129,112,0.06)' }}>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: '#10b981', filter: 'drop-shadow(0 0 5px rgba(16,185,129,0.6))' }} />
              <p className="hud-label">// Asset Acquisition</p>
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
                      ${parseFloat(offer.offer_price || 0).toFixed(2)}
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

      {/* Active Mission Log */}
      <div className="card">
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,129,112,0.06)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: '#FF8170', filter: 'drop-shadow(0 0 5px rgba(255,129,112,0.6))' }} />
            <p className="hud-label">// Active Mission Log</p>
          </div>
          <Link
            to="/submissions"
            className="flex items-center gap-1 text-xs font-bold transition-all"
            style={{ color: 'rgba(255,129,112,0.85)' }}
          >
            All missions <ArrowRight className="w-3 h-3" />
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform arc-pulse-anim"
              style={{ background: 'rgba(255,129,112,0.1)', border: '1px solid rgba(255,129,112,0.2)' }}
            >
              <Package className="w-5 h-5" style={{ color: '#FF8170', filter: 'drop-shadow(0 0 4px rgba(255,129,112,0.6))' }} />
            </div>
            <div>
              <p className="hud-label mb-0.5">// DEPLOY</p>
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <Users className="w-5 h-5" style={{ color: '#10b981', filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.5))' }} />
            </div>
            <div>
              <p className="hud-label mb-0.5">// ENLIST</p>
              <p className="font-bold" style={{ color: 'rgb(var(--dark))' }}>Add Operative</p>
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
            >
              <Zap className="w-5 h-5" style={{ color: '#8b5cf6', filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.5))' }} />
            </div>
            <div>
              <p className="hud-label mb-0.5">// CONFIGURE</p>
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

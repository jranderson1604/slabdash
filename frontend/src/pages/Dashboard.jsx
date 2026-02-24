import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { submissions, psa, companies, buyback, emailTemplates } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AdminWalkthrough from '../components/AdminWalkthrough';
import OnboardingChecklist from '../components/OnboardingChecklist';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import {
  Package,
  Users,
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
  Mail,
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

const SERVICE_COLORS = {
  'Walk-Through': '#ef4444', 'Walk-Thru': '#ef4444',
  'Super Express': '#f97316',
  'Express': '#f59e0b',
  'Regular': '#22c55e', 'Standard': '#22c55e',
  'Value Max': '#14b8a6',
  'Value Plus': '#3b82f6', 'Plus': '#3b82f6',
  'Value': '#6366f1',
  'Value Bulk': '#a855f7', 'Bulk': '#a855f7',
  'Specialty': '#ec4899',
  'Reholder': '#94a3b8',
};

function SubmissionCard({ submission }) {
  const color = SERVICE_COLORS[submission.service_level] || '#94a3b8';
  return (
    <Link
      to={`/submissions/${submission.id}`}
      className="group flex items-center gap-4 p-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.5)' }}
    >
      {/* Color strip */}
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color, minHeight: 40 }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm" style={{ color: 'rgb(var(--dark))' }}>
            #{submission.psa_submission_number || submission.internal_id || 'No ID'}
          </span>
          {submission.service_level && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
            >
              {submission.service_level}
            </span>
          )}
        </div>
        <p className="text-xs font-medium mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
          {submission.customer_name || 'No customer'} · {submission.card_count || 0} cards
        </p>
        <div className="mt-2">
          <ProgressBar percent={submission.progress_percent || 0} />
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        <StatusBadge submission={submission} showTooltip={false} />
        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#FF8170' }} />
      </div>
    </Link>
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
  const [notifyingReady, setNotifyingReady] = useState(false);

  const loadData = async () => {
    try {
      const [subsRes, usageRes, buybackRes] = await Promise.all([
        submissions.list({}),
        companies.usage().catch(() => ({ data: null })),
        buyback.list({ status: 'pending' }).catch(() => ({ data: [] })),
      ]);

      const subs = subsRes.data.submissions || [];

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
      setRecentSubs(subs.filter(s => !s.shipped).slice(0, 4));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyReady = async () => {
    setNotifyingReady(true);
    try {
      const res = await emailTemplates.notifyGradesReady();
      const count = res.data.count;
      if (count > 0) {
        toast.success(`Emailed ${count} customer${count !== 1 ? 's' : ''} about their grades`);
      } else {
        toast.success('No customers to notify — check that customers are linked to those submissions');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send notifications');
    } finally {
      setNotifyingReady(false);
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

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
                setRefreshProgress(prev => ({ ...prev, current: data.current, updated: data.updated, errors: data.errors }));
              } else if (data.type === 'complete') {
                setRefreshProgress(prev => ({ ...prev, ...data, done: true }));
                const msg = data.changedCount > 0
                  ? `Refresh complete! ${data.changedCount} submission${data.changedCount !== 1 ? 's' : ''} updated`
                  : `Refresh complete — ${data.updated} checked, no changes`;
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
    <div className="space-y-6">

      {/* ── Hero Banner ─────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden"
        style={{ background: 'var(--hdr-gradient)', boxShadow: 'var(--hdr-shadow)', border: 'var(--hdr-border)' }}
      >
        {/* Decorative shapes */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full" style={{ background: 'var(--hdr-circle-1)' }} />
        <div className="absolute -bottom-10 left-1/2 w-72 h-72 rounded-full" style={{ background: 'var(--hdr-circle-2)' }} />

        <div className="relative px-6 sm:px-8 py-7">
          {/* Top row: name + actions */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--hdr-eyebrow)' }}>Dashboard</p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight" style={{ color: 'var(--hdr-title)' }}>
                {company?.name}
              </h1>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--hdr-sub)' }}>PSA Card Grading Tracker</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              <button
                onClick={() => setShowWalkthrough(true)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: 'var(--hdr-back-bg)', border: 'var(--hdr-back-border)', color: 'var(--hdr-btn-color)' }}
              >
                <PlayCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Tour</span>
              </button>
              {company?.hasPsaKey && (
                <button
                  onClick={handleRefreshAll}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-60"
                  style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Sync PSA'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-6" style={{ borderTop: '1px solid var(--hdr-circle-1)' }}>
            <div>
              <p className="text-4xl sm:text-5xl font-black tabular-nums leading-none" style={{ color: 'var(--hdr-title)' }}>{stats?.inProgress ?? 0}</p>
              <p className="text-[11px] font-bold uppercase tracking-widest mt-2" style={{ color: 'var(--hdr-eyebrow)' }}>Active</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-black tabular-nums leading-none" style={{ color: 'var(--hdr-title)' }}>{stats?.gradesReady ?? 0}</p>
              <p className="text-[11px] font-bold uppercase tracking-widest mt-2" style={{ color: 'var(--hdr-eyebrow)' }}>Grades Ready</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-black tabular-nums leading-none" style={{ color: 'var(--hdr-title)' }}>{stats?.problems ?? 0}</p>
              <p className="text-[11px] font-bold uppercase tracking-widest mt-2" style={{ color: 'var(--hdr-eyebrow)' }}>Problems</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-black tabular-nums leading-none" style={{ color: 'var(--hdr-title)' }}>{stats?.totalCustomers ?? 0}</p>
              <p className="text-[11px] font-bold uppercase tracking-widest mt-2" style={{ color: 'var(--hdr-eyebrow)' }}>Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grades-ready notification banner */}
      {stats?.gradesReady > 0 && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl"
          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)' }}>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: '#065f46' }}>
                {stats.gradesReady} submission{stats.gradesReady !== 1 ? 's' : ''} ready for pickup
              </p>
              <p className="text-xs" style={{ color: '#047857' }}>Notify linked customers that their grades have come in</p>
            </div>
          </div>
          <button
            onClick={handleNotifyReady}
            disabled={notifyingReady}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            {notifyingReady ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {notifyingReady ? 'Sending...' : 'Notify Customers'}
          </button>
        </div>
      )}

      {/* PSA API Warning */}
      {!company?.hasPsaKey && (
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: '#92400E' }}>PSA API not configured</p>
            <p className="text-sm mt-0.5" style={{ color: '#B45309' }}>
              <Link to="/settings" className="underline font-bold">Connect your PSA API key</Link>{' '}
              to enable automatic status updates.
            </p>
          </div>
        </div>
      )}

      {/* Onboarding Checklist */}
      <OnboardingChecklist company={company} stats={stats} />

      {/* Plan Usage */}
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
              <UsageMeter label="Cards this month" current={usage.cards_this_month} limit={usage.cards_limit} percent={usage.cards_percent} />
            )}
            {usage.customers_limit && (
              <UsageMeter label="Total customers" current={usage.customers} limit={usage.customers_limit} percent={usage.customers_percent} />
            )}
          </div>
          {(usage.cards_percent >= 80 || usage.customers_percent >= 80) && (
            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Approaching your plan limit — upgrade for unlimited access
              </p>
              <Link to="/settings?tab=billing" className="text-xs font-bold flex items-center gap-1" style={{ color: '#E8543D' }}>
                <Zap className="w-3.5 h-3.5" /> Upgrade
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Sync Progress */}
      {refreshing && refreshProgress && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,129,112,0.04)', border: '1px solid rgba(255,129,112,0.18)' }}>
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
            <div className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${refreshProgress.total > 0 ? (refreshProgress.current / refreshProgress.total) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #E8543D, #FF8170)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Alerts + Buybacks ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Alerts */}
        <div className="card">
          <div className="p-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <Bell className="w-4 h-4" style={{ color: '#FF8170' }} />
            <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>Alerts</p>
          </div>
          <div className="p-4 space-y-3">
            {stats?.gradesReady > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.1)' }}
                >
                  <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#065f46' }}>Grades ready for pickup</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {stats.gradesReady} submission{stats.gradesReady !== 1 ? 's' : ''} awaiting customer pickup
                  </p>
                </div>
              </div>
            )}
            {stats?.problems > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.1)' }}
                >
                  <AlertTriangle className="w-4 h-4" style={{ color: '#D97706' }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#92400e' }}>Problem orders need review</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {stats.problems} submission{stats.problems !== 1 ? 's' : ''} flagged — action required
                  </p>
                </div>
              </div>
            )}
            {!stats?.gradesReady && !stats?.problems && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#10b981' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>All clear</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No alerts right now</p>
              </div>
            )}
          </div>
        </div>

        {/* Buyback Offers */}
        <div className="card">
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: '#10b981' }} />
              <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>Buyback Offers</p>
            </div>
            <Link to="/buyback" className="flex items-center gap-1 text-xs font-bold transition-all" style={{ color: 'rgba(255,129,112,0.85)' }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            {recentBuybacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.08)' }}>
                  <DollarSign className="w-5 h-5" style={{ color: '#10b981' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No pending offers</p>
                <Link to="/buyback/new" className="btn btn-secondary text-xs py-2 px-4">
                  Create Offer
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentBuybacks.map(offer => (
                  <Link key={offer.id} to="/buyback"
                    className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-black/[0.02]"
                    style={{ border: '1px solid rgba(0,0,0,0.05)' }}
                  >
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>{offer.customer_name || 'Customer'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{offer.card_description || 'Card'}</p>
                    </div>
                    <span className="text-base font-black" style={{ color: '#059669' }}>
                      ${parseFloat(offer.offer_amount || 0).toFixed(2)}
                    </span>
                  </Link>
                ))}
                <Link to="/buyback" className="text-xs font-semibold flex items-center justify-center gap-1 pt-2 transition-colors"
                  style={{ color: 'rgb(var(--brand-500))' }}
                >
                  View all offers <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Active Submissions ─────────────────────────── */}
      <div className="card">
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: '#FF8170' }} />
            <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>Active Submissions</p>
            {stats?.inProgress > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,129,112,0.1)', color: '#E8543D' }}
              >
                {stats.inProgress}
              </span>
            )}
          </div>
          <Link to="/submissions" className="flex items-center gap-1 text-xs font-bold" style={{ color: 'rgba(255,129,112,0.85)' }}>
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentSubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{ background: 'rgba(255,129,112,0.08)', border: '1px solid rgba(255,129,112,0.12)' }}
            >
              <Package className="w-8 h-8" style={{ color: '#FF8170', opacity: 0.6 }} />
            </div>
            <div className="text-center">
              <p className="font-bold" style={{ color: 'rgb(var(--dark))' }}>No active submissions</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Create your first PSA submission to get started.</p>
            </div>
            <Link to="/submissions/new" className="btn btn-primary">
              New Submission
            </Link>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {recentSubs.map(sub => <SubmissionCard key={sub.id} submission={sub} />)}
            {stats?.inProgress > recentSubs.length && (
              <Link to="/submissions"
                className="flex items-center justify-center gap-2 pt-2 text-sm font-semibold transition-colors"
                style={{ color: 'rgb(var(--brand-500))' }}
              >
                View all {stats.inProgress} submissions <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Actions ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/submissions/new"
          className="group card p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
            style={{ background: 'rgba(255,129,112,0.1)', border: '1px solid rgba(255,129,112,0.2)' }}
          >
            <Package className="w-6 h-6" style={{ color: '#FF8170' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: 'rgb(var(--dark))' }}>New Submission</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Track a PSA order</p>
          </div>
          <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" style={{ color: '#FF8170' }} />
        </Link>

        <Link to="/customers/new"
          className="group card p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <Users className="w-6 h-6" style={{ color: '#10b981' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: 'rgb(var(--dark))' }}>New Customer</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Register in your system</p>
          </div>
          <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" style={{ color: '#10b981' }} />
        </Link>

        <Link to="/settings"
          className="group card p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <Zap className="w-6 h-6" style={{ color: '#8b5cf6' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: 'rgb(var(--dark))' }}>Settings</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>PSA keys, billing, more</p>
          </div>
          <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" style={{ color: '#8b5cf6' }} />
        </Link>
      </div>

      {showWalkthrough && <AdminWalkthrough onClose={() => setShowWalkthrough(false)} />}
    </div>
  );
}

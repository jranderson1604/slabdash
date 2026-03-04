import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { points } from '../api/client';
import { QRCodeSVG } from 'qrcode.react';
import PageHeader from '../components/PageHeader';
import {
  Star,
  Trophy,
  Gift,
  Settings,
  TrendingUp,
  ChevronRight,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
  User,
  AlertCircle,
  Ticket,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,129,112,0.1)', border: '1px solid rgba(255,129,112,0.12)' }}
      >
        <Icon className="w-5 h-5" style={{ color: '#E8543D' }} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: 'rgb(var(--dark))' }}>{value}</div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function Rewards() {
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [couponCode, setCouponCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [couponResult, setCouponResult] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [cfgRes, boardRes] = await Promise.all([
        points.getConfig(),
        points.leaderboard(),
      ]);
      setConfig(cfgRes.data);
      setForm({
        enabled: cfgRes.data.enabled,
        points_per_card: cfgRes.data.points_per_card ?? 10,
        redemption_rate: cfgRes.data.redemption_rate ?? 100,
        min_redemption_points: cfgRes.data.min_redemption_points ?? 100,
        welcome_bonus_points: cfgRes.data.welcome_bonus_points ?? 50,
      });
      setLeaderboard(boardRes.data);
    } catch {
      toast.error('Failed to load rewards data');
    } finally {
      setLoadingConfig(false);
      setLoadingBoard(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await points.updateConfig({
        ...form,
        points_per_card: parseInt(form.points_per_card, 10),
        redemption_rate: parseInt(form.redemption_rate, 10),
        min_redemption_points: parseInt(form.min_redemption_points, 10),
        welcome_bonus_points: parseInt(form.welcome_bonus_points, 10),
      });
      setConfig(res.data);
      toast.success('Rewards settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const totalPoints = leaderboard.reduce((s, c) => s + parseInt(c.lifetime_points_earned || 0, 10), 0);
  const activeMembers = leaderboard.length;

  async function lookupCoupon(e) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setLookingUp(true); setCouponResult(null);
    try {
      const res = await points.lookupCoupon(couponCode.trim());
      setCouponResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Coupon not found';
      setCouponResult({ error: msg });
    }
    setLookingUp(false);
  }

  async function redeemCoupon() {
    if (!couponResult?.code) return;
    setRedeeming(true);
    try {
      await points.redeemCoupon(couponResult.code);
      toast.success(`Coupon ${couponResult.code} redeemed — $${parseFloat(couponResult.dollar_value).toFixed(2)} discount applied`);
      setCouponResult(null); setCouponCode('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to redeem coupon');
    }
    setRedeeming(false);
  }

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#FF8170' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rewards Program"
        subtitle="Loyalty points for your best customers"
        icon={Star}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Members" value={activeMembers} icon={User} />
        <StatCard label="Points Issued" value={totalPoints.toLocaleString()} icon={Star} />
        <StatCard
          label="Points / $1 Discount"
          value={form.redemption_rate || 100}
          sub={`$1 off = ${form.redemption_rate || 100} pts`}
          icon={Gift}
        />
        <StatCard
          label="Per Card"
          value={`${form.points_per_card || 10} pts`}
          sub="earned on submission"
          icon={TrendingUp}
        />
      </div>

      {/* Coupon Lookup */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Ticket className="w-5 h-5" style={{ color: '#E8543D' }} />
          <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>Redeem Customer Coupon</h2>
        </div>
        <form onSubmit={lookupCoupon} className="flex gap-3 mb-4">
          <input
            type="text"
            value={couponCode}
            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
            placeholder="Enter coupon code e.g. ABCD-EF12"
            className="input flex-1 font-mono tracking-wider uppercase"
            style={{ letterSpacing: '0.1em' }}
          />
          <button type="submit" disabled={lookingUp || !couponCode.trim()}
            className="btn-primary flex items-center gap-2 shrink-0">
            {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Look Up
          </button>
        </form>

        {couponResult && !couponResult.error && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(var(--border-rgb),0.5)' }}>
            <div className="p-4 flex items-start gap-4" style={{ background: 'rgba(var(--surface-rgb),0.5)' }}>
              {/* QR Code */}
              <div className="p-3 rounded-xl shrink-0" style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.08)' }}>
                <QRCodeSVG value={couponResult.code} size={80} level="H" style={{ display: 'block' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-lg font-black tracking-widest" style={{ color: '#E8543D', letterSpacing: '0.12em' }}>
                    {couponResult.code}
                  </span>
                  {couponResult.state === 'valid' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                      Valid
                    </span>
                  )}
                  {couponResult.state === 'redeemed' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(107,114,128,0.1)', color: '#6B7280' }}>
                      Already Used
                    </span>
                  )}
                  {couponResult.state === 'expired' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                      Expired
                    </span>
                  )}
                </div>
                <p className="text-xl font-black mb-1" style={{ color: couponResult.state === 'valid' ? '#059669' : 'var(--text-secondary)' }}>
                  ${parseFloat(couponResult.dollar_value).toFixed(2)} off
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Customer: <span className="font-semibold" style={{ color: 'rgb(var(--dark))' }}>{couponResult.customer_name}</span>
                  {couponResult.customer_email && ` · ${couponResult.customer_email}`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {couponResult.points_used?.toLocaleString()} pts used ·{' '}
                  Expires {new Date(couponResult.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            {couponResult.state === 'valid' && (
              <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(var(--border-rgb),0.4)' }}>
                <button onClick={redeemCoupon} disabled={redeeming}
                  className="btn-primary flex items-center gap-2">
                  {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Apply ${parseFloat(couponResult.dollar_value).toFixed(2)} Discount
                </button>
              </div>
            )}
          </div>
        )}

        {couponResult?.error && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.12)', color: '#DC2626' }}>
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {couponResult.error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-5 h-5" style={{ color: '#E8543D' }} />
            <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>Program Settings</h2>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(var(--surface-rgb),0.6)', border: '1px solid rgba(var(--border-rgb),0.5)' }}>
            <div>
              <div className="font-semibold" style={{ color: 'rgb(var(--dark))' }}>Program Active</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {form.enabled ? 'Customers are earning points' : 'No points are awarded yet'}
              </div>
            </div>
            <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}>
              {form.enabled
                ? <ToggleRight className="w-9 h-9" style={{ color: '#FF8170' }} />
                : <ToggleLeft className="w-9 h-9" style={{ color: 'var(--text-secondary)' }} />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgb(var(--dark))' }}>
                Points per card submitted
              </label>
              <input
                type="number"
                min="0"
                className="input w-full"
                value={form.points_per_card}
                onChange={e => setForm(f => ({ ...f, points_per_card: e.target.value }))}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Earned when a submission is created
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgb(var(--dark))' }}>
                Welcome bonus points
              </label>
              <input
                type="number"
                min="0"
                className="input w-full"
                value={form.welcome_bonus_points}
                onChange={e => setForm(f => ({ ...f, welcome_bonus_points: e.target.value }))}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                One-time bonus on first submission
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgb(var(--dark))' }}>
                Points per $1 discount
              </label>
              <input
                type="number"
                min="1"
                className="input w-full"
                value={form.redemption_rate}
                onChange={e => setForm(f => ({ ...f, redemption_rate: e.target.value }))}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                e.g. 100 = 100 pts redeems $1 off
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgb(var(--dark))' }}>
                Min points to redeem
              </label>
              <input
                type="number"
                min="0"
                className="input w-full"
                value={form.min_redemption_points}
                onChange={e => setForm(f => ({ ...f, min_redemption_points: e.target.value }))}
              />
            </div>
          </div>

          {!form.enabled && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.2)', color: '#b45309' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Enable the program to start awarding points on new submissions.</span>
            </div>
          )}

          <button
            onClick={saveConfig}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>

        {/* Leaderboard */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5" style={{ color: '#E8543D' }} />
            <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>Leaderboard</h2>
          </div>

          {loadingBoard ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#FF8170' }} />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No points earned yet</p>
              <p className="text-sm mt-1">Enable the program and create a submission to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((customer, i) => (
                <Link
                  key={customer.id}
                  to={`/customers/${customer.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-black/5"
                  style={{ border: '1px solid rgba(var(--border-rgb),0.4)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: i < 3 ? 'rgba(255,129,112,0.15)' : 'rgba(var(--surface-rgb),0.8)',
                      color: i < 3 ? '#E8543D' : 'var(--text-secondary)',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ color: 'rgb(var(--dark))' }}>{customer.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{customer.email}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm" style={{ color: '#E8543D' }}>
                      {parseInt(customer.points_balance, 10).toLocaleString()} pts
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {parseInt(customer.lifetime_points_earned, 10).toLocaleString()} lifetime
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

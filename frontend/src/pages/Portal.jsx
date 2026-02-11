import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CustomerPortal from './CustomerPortal';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import BeforePhotoUpload from '../components/BeforePhotoUpload';
import CompLookup from '../components/CompLookup';
import SAMChatInterface from '../components/SAMChatInterface';
import {
  Loader2, AlertTriangle, Eye, EyeOff, Store, ArrowRight, Lock, Mail, KeyRound, ArrowLeft,
  CheckCircle2, Package, Clock, Sparkles, ChevronDown, ChevronUp,
  Key, Truck, MessageSquare, Camera, Bot, Bell, BellOff, Grid, Search,
  Image as ImageIcon, Upload, User, LogOut, Settings
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const STORAGE_KEY = 'slabdash_portal_token';
const SHOP_KEY = 'slabdash_portal_shop';

// ============================================
// LOGIN PAGE — university-style shop picker + email/password
// ============================================
function PortalLogin({ onLoginSuccess, initialError }) {
  const [step, setStep] = useState('shop'); // 'shop' | 'login' | 'forgot' | 'reset'
  const [shopCode, setShopCode] = useState('');
  const [shop, setShop] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [success, setSuccess] = useState('');

  // Try to restore saved shop
  useEffect(() => {
    const saved = localStorage.getItem(SHOP_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setShop(parsed);
        setShopCode(parsed.slug);
        setStep('login');
      } catch {}
    }
  }, []);

  const lookupShop = async (e) => {
    e.preventDefault();
    if (!shopCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/shop-lookup/${encodeURIComponent(shopCode.trim().toLowerCase())}`);
      if (!res.ok) {
        setError('Shop not found. Check the code and try again.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setShop(data);
      localStorage.setItem(SHOP_KEY, JSON.stringify(data));
      setStep('login');
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: shop.slug, email: email.trim(), password })
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'NO_PASSWORD') {
          setError('No password set yet. Use your magic link email to set one up, or ask your shop to send you a new portal link.');
        } else {
          setError(data.error || 'Login failed');
        }
        setLoading(false);
        return;
      }

      localStorage.setItem(STORAGE_KEY, data.token);
      onLoginSuccess(data.token);
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await fetch(`${API_URL}/portal/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: shop.slug, email: email.trim() })
      });
      setSuccess('If your email is registered, you will receive a password reset link.');
    } catch {
      setSuccess('If your email is registered, you will receive a password reset link.');
    }
    setLoading(false);
  };

  const changeShop = () => {
    setShop(null);
    setStep('shop');
    setError('');
    setSuccess('');
    localStorage.removeItem(SHOP_KEY);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black" style={{ color: 'rgb(var(--dark))' }}>Customer Portal</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>
            Sign in to track your submissions
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          }}>

          {/* Step 1: Shop Code */}
          {step === 'shop' && (
            <form onSubmit={lookupShop}>
              <label className="block text-xs font-bold mb-2" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>
                SHOP CODE
              </label>
              <p className="text-xs mb-4" style={{ color: 'rgba(44, 36, 22, 0.35)' }}>
                Enter the code from your card shop
              </p>
              <input
                type="text"
                value={shopCode}
                onChange={(e) => setShopCode(e.target.value)}
                placeholder="e.g. acme-cards"
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: 'rgba(0,0,0,0.03)',
                  border: '1.5px solid rgba(0,0,0,0.08)',
                  color: 'rgb(var(--dark))',
                  outline: 'none',
                }}
              />
              {error && <p className="text-xs mt-2 font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
              <button type="submit" disabled={loading || !shopCode.trim()}
                className="w-full mt-4 py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
                  <span className="flex items-center justify-center gap-2">Find My Shop <ArrowRight className="w-4 h-4" /></span>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Login */}
          {step === 'login' && shop && (
            <form onSubmit={handleLogin}>
              {/* Shop badge */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  {shop.logo_url ? (
                    <img src={shop.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: shop.primary_color || '#ef4444' }}>
                      <Store className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>{shop.name}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(44, 36, 22, 0.35)' }}>{shop.slug}</p>
                  </div>
                </div>
                <button type="button" onClick={changeShop}
                  className="text-[11px] font-bold px-2 py-1 rounded-lg transition-all"
                  style={{ color: 'rgba(44, 36, 22, 0.4)', background: 'rgba(0,0,0,0.03)' }}>
                  Change
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>EMAIL</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com" autoFocus
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                      style={{ background: 'rgba(0,0,0,0.03)', border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none', color: 'rgb(var(--dark))' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>PASSWORD</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="Your password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl text-sm"
                      style={{ background: 'rgba(0,0,0,0.03)', border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none', color: 'rgb(var(--dark))' }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgba(44, 36, 22, 0.25)' }}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && <p className="text-xs mt-3 font-semibold" style={{ color: '#DC2626' }}>{error}</p>}

              <button type="submit" disabled={loading || !email.trim() || !password}
                className="w-full mt-4 py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sign In'}
              </button>

              <button type="button" onClick={() => { setStep('forgot'); setError(''); setSuccess(''); }}
                className="w-full mt-2 text-xs font-bold py-2" style={{ color: 'rgba(44, 36, 22, 0.35)' }}>
                Forgot password?
              </button>
            </form>
          )}

          {/* Forgot Password */}
          {step === 'forgot' && shop && (
            <form onSubmit={handleForgotPassword}>
              <button type="button" onClick={() => { setStep('login'); setError(''); setSuccess(''); }}
                className="flex items-center gap-1 text-xs font-bold mb-4"
                style={{ color: 'rgba(44, 36, 22, 0.4)' }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </button>

              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
                <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>Reset Password</h2>
              </div>

              <p className="text-xs mb-4" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>
                Enter your email and we'll send you a reset link.
              </p>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com" autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none', color: 'rgb(var(--dark))' }}
                />
              </div>

              {error && <p className="text-xs mt-2 font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
              {success && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#059669' }}>{success}</p>
                </div>
              )}

              {!success && (
                <button type="submit" disabled={loading || !email.trim()}
                  className="w-full mt-4 py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Reset Link'}
                </button>
              )}
            </form>
          )}
        </div>

        {/* Footer link for magic link users */}
        <p className="text-center text-[11px] mt-6" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>
          Have a magic link from your shop? Just click it — it still works.
        </p>
      </div>
    </div>
  );
}

// ============================================
// PASSWORD SETUP BANNER — shown when accessing via magic link without a password
// ============================================
function PasswordSetupBanner({ token, onComplete }) {
  const [show, setShow] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!show) return null;

  const handleSetup = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords don\'t match'); return; }
    if (password.length < 8) { setError('Must be at least 8 characters'); return; }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) { setError('Must contain letters and numbers'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/setup-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to set password'); setLoading(false); return; }

      // Save the JWT token
      localStorage.setItem(STORAGE_KEY, data.token);
      if (data.company?.slug) {
        localStorage.setItem(SHOP_KEY, JSON.stringify(data.company));
      }
      setDone(true);
      if (onComplete) onComplete(data.token);
    } catch { setError('Connection error'); }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="mx-5 mb-4 p-4 rounded-xl flex items-center gap-3"
        style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
        <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#059669' }} />
        <p className="text-sm font-bold" style={{ color: '#059669' }}>
          Password set! You can now log in anytime at the portal login page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-4 rounded-xl overflow-hidden"
      style={{ background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left">
        <Lock className="w-5 h-5 shrink-0" style={{ color: '#2563EB' }} />
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: '#1D4ED8' }}>Set up a password</p>
          <p className="text-xs" style={{ color: '#3B82F6' }}>Log in anytime without needing a magic link</p>
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded-lg"
          style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#2563EB' }}>
          {expanded ? 'Close' : 'Set Up'}
        </span>
      </button>

      {expanded && (
        <form onSubmit={handleSetup} className="px-4 pb-4 space-y-3">
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (8+ chars, letters & numbers)"
              className="w-full px-3 py-2.5 rounded-lg text-sm pr-10"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none' }}
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(44, 36, 22, 0.25)' }}>
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <input type={showPw ? 'text' : 'password'} value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none' }}
          />
          {error && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading || !password || !confirm}
              className="flex-1 py-2.5 rounded-lg font-bold text-white text-xs disabled:opacity-50"
              style={{ background: '#2563EB' }}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Set Password'}
            </button>
            <button type="button" onClick={() => setShow(false)}
              className="px-3 py-2.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(44, 36, 22, 0.4)' }}>
              Skip
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ============================================
// MAIN PORTAL — smart router
// ============================================
export default function Portal() {
  const [searchParams] = useSearchParams();
  const magicToken = searchParams.get('token');

  const [mode, setMode] = useState('loading'); // 'loading' | 'login' | 'portal-token' | 'portal-jwt'
  const [jwtToken, setJwtToken] = useState(null);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  useEffect(() => {
    // Priority: magic link token > saved JWT > login page
    if (magicToken) {
      // Validate magic link works
      fetch(`${API_URL}/portal/access?token=${magicToken}`)
        .then(res => {
          if (res.ok) {
            setMode('portal-token');
            // Check if customer has a password set (we can infer from trying to see if they have one)
            setNeedsPasswordSetup(true); // Always show setup option for magic link users
          } else {
            // Invalid token — try saved JWT
            checkJwt();
          }
        })
        .catch(() => checkJwt());
    } else {
      checkJwt();
    }
  }, [magicToken]);

  const checkJwt = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Validate JWT by calling /portal/me
      fetch(`${API_URL}/portal/me`, {
        headers: { Authorization: `Bearer ${saved}` }
      })
        .then(res => {
          if (res.ok) {
            setJwtToken(saved);
            setMode('portal-jwt');
          } else {
            localStorage.removeItem(STORAGE_KEY);
            setMode('login');
          }
        })
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          setMode('login');
        });
    } else {
      setMode('login');
    }
  };

  const handleLoginSuccess = (token) => {
    setJwtToken(token);
    setMode('portal-jwt');
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setJwtToken(null);
    setMode('login');
  };

  // Loading
  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'rgb(var(--brand-500))' }} />
      </div>
    );
  }

  // Login page
  if (mode === 'login') {
    return <PortalLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // Portal via magic link token
  if (mode === 'portal-token' && magicToken) {
    return (
      <CustomerPortalWrapper
        token={magicToken}
        authMode="token"
        needsPasswordSetup={needsPasswordSetup}
        onLogout={handleLogout}
        onPasswordSet={(newJwt) => {
          setJwtToken(newJwt);
          setNeedsPasswordSetup(false);
        }}
      />
    );
  }

  // Portal via JWT
  if (mode === 'portal-jwt' && jwtToken) {
    return (
      <CustomerPortalWrapper
        jwtToken={jwtToken}
        authMode="jwt"
        needsPasswordSetup={false}
        onLogout={handleLogout}
      />
    );
  }

  return <PortalLogin onLoginSuccess={handleLoginSuccess} />;
}

// Wrapper that adds password setup banner and logout to CustomerPortal
function CustomerPortalWrapper({ token, jwtToken, authMode, needsPasswordSetup, onLogout, onPasswordSet }) {
  // CustomerPortal uses token query param for data loading.
  // For JWT-based access, we need to pass the token differently.
  // Since CustomerPortal reads from useSearchParams, we'll inject the token.

  // For JWT mode, we use a different approach — render a modified portal
  // For token mode, CustomerPortal already works via ?token= query param

  if (authMode === 'token') {
    return (
      <div>
        {needsPasswordSetup && (
          <div className="max-w-2xl mx-auto pt-4">
            <PasswordSetupBanner token={token} onComplete={onPasswordSet} />
          </div>
        )}
        <CustomerPortal />
      </div>
    );
  }

  // JWT mode — CustomerPortal needs the token param, but we have JWT instead.
  // We'll render CustomerPortal and pass JWT via a different mechanism.
  // Since CustomerPortal uses fetch with ?token=, we need to provide an alternative.
  // The simplest approach: add the JWT as a prop override
  return (
    <div>
      <CustomerPortalJWT jwtToken={jwtToken} onLogout={onLogout} />
    </div>
  );
}

// ============================================
// JWT-BASED PORTAL — loads data via JWT auth instead of magic link token
// ============================================
function CustomerPortalJWT({ jwtToken, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => { loadData(); }, [jwtToken]);

  const loadData = async () => {
    try {
      const headers = { Authorization: `Bearer ${jwtToken}` };

      const [meRes, subsRes, statsRes, offersRes] = await Promise.all([
        fetch(`${API_URL}/portal/me`, { headers }),
        fetch(`${API_URL}/portal/submissions`, { headers }),
        fetch(`${API_URL}/portal/stats`, { headers }).catch(() => null),
        fetch(`${API_URL}/portal/buyback-offers`, { headers }).catch(() => null),
      ]);

      if (!meRes.ok) { onLogout(); return; }

      const me = await meRes.json();
      const submissions = subsRes.ok ? await subsRes.json() : [];
      const offers = offersRes?.ok ? await offersRes.json() : [];

      // Load cards for each submission
      const subsWithCards = await Promise.all(
        submissions.map(async (sub) => {
          try {
            const detailRes = await fetch(`${API_URL}/portal/submissions/${sub.id}`, { headers });
            if (detailRes.ok) {
              const detail = await detailRes.json();
              return { ...sub, cards: detail.cards || [], steps: detail.steps || [] };
            }
          } catch {}
          return sub;
        })
      );

      setData({
        customer: me.customer,
        company: me.company,
        submissions: subsWithCards,
        buybackOffers: offers,
      });
      setLoading(false);
    } catch (err) {
      console.error('JWT portal load error:', err);
      onLogout();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" style={{ color: 'rgb(var(--brand-500))' }} />
          <p className="text-sm font-bold" style={{ color: 'rgba(44, 36, 22, 0.35)' }}>Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
        <div className="card p-10 max-w-sm text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: '#DC2626' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'rgb(var(--dark))' }}>Session Expired</h2>
          <p className="text-sm mb-4" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Please log in again.</p>
          <button onClick={onLogout} className="px-6 py-2 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
            Log In
          </button>
        </div>
      </div>
    );
  }

  // Render the same portal layout as CustomerPortal but with JWT data + profile + logout
  return <JWTPortalView data={data} jwtToken={jwtToken} onLogout={onLogout} onRefresh={loadData}
    showProfile={showProfile} setShowProfile={setShowProfile} />;
}

// ============================================
// JWT Portal View — mirrors CustomerPortal layout with logout + profile
// ============================================
const PSA_STEPS = ['Arrived', 'Order Prep', 'Research & ID', 'Grading', 'Assembly', 'QA', 'Shipped'];

function getStepIndex(currentStep) {
  if (!currentStep) return -1;
  const lower = currentStep.toLowerCase();
  if (lower.includes('arrived')) return 0;
  if (lower.includes('order prep')) return 1;
  if (lower.includes('research')) return 2;
  if (lower.includes('grading')) return 3;
  if (lower.includes('assembly')) return 4;
  if (lower.includes('qa') || lower.includes('quality')) return 5;
  if (lower.includes('shipped') || lower.includes('complete')) return 6;
  return -1;
}

function getServiceColor(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('walk')) return '#7C3AED';
  if (l.includes('super')) return '#DC2626';
  if (l.includes('express')) return '#D97706';
  if (l.includes('regular') || l.includes('standard')) return '#2563EB';
  if (l.includes('value') || l.includes('plus')) return '#059669';
  if (l.includes('bulk')) return '#6B7280';
  return '#6B7280';
}

function ProgressPipeline({ currentStep, shipped }) {
  const stepIdx = shipped ? PSA_STEPS.length : getStepIndex(currentStep);
  const progress = shipped ? 100 : stepIdx >= 0 ? Math.round(((stepIdx + 0.5) / PSA_STEPS.length) * 100) : 0;
  return (
    <div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: shipped ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, rgb(var(--brand-400)), rgb(var(--brand-600)))',
          }} />
      </div>
      <div className="flex justify-between mt-1.5">
        {PSA_STEPS.map((step, i) => (
          <span key={step} className="text-[8px] sm:text-[9px] font-semibold text-center flex-1"
            style={{
              color: i < stepIdx ? '#059669' : (i === stepIdx && !shipped) ? 'rgb(var(--brand-600))' : 'rgba(44, 36, 22, 0.2)',
              fontWeight: (i === stepIdx && !shipped) ? 800 : 600,
            }}>
            {step.replace('Research & ID', 'R&ID')}
          </span>
        ))}
      </div>
    </div>
  );
}

// Profile Settings Modal
function ProfileModal({ jwtToken, customer, onClose, onUpdate }) {
  const [name, setName] = useState(customer.name || '');
  const [email, setEmail] = useState(customer.email || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const body = {};
      if (name.trim() !== customer.name) body.name = name.trim();
      if (email.trim().toLowerCase() !== customer.email.toLowerCase()) body.email = email.trim();
      if ((phone || '') !== (customer.phone || '')) body.phone = phone;
      if (newPw) { body.currentPassword = currentPw; body.newPassword = newPw; }

      if (Object.keys(body).length === 0) { setError('No changes to save'); setLoading(false); return; }

      const res = await fetch(`${API_URL}/portal/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }

      setSuccess('Profile updated!');
      setCurrentPw('');
      setNewPw('');
      if (onUpdate) onUpdate(data.customer);
    } catch { setError('Failed to update'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>Profile Settings</h2>
          <button onClick={onClose} className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(44, 36, 22, 0.4)' }}>Close</button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>NAME</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none' }} />
          </div>
          <div>
            <label className="text-[11px] font-bold" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>EMAIL</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none' }} />
          </div>
          <div>
            <label className="text-[11px] font-bold" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>PHONE</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none' }} />
          </div>

          <div className="pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <p className="text-[11px] font-bold mb-2" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>CHANGE PASSWORD</p>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Current password"
              className="w-full px-3 py-2.5 rounded-lg text-sm mb-2"
              style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none' }} />
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password (8+ chars, letters & numbers)"
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none' }} />
          </div>

          {error && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
          {success && <p className="text-xs font-semibold" style={{ color: '#059669' }}>{success}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function JWTPortalView({ data, jwtToken, onLogout, onRefresh, showProfile, setShowProfile }) {
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('submissions');

  // Auto-expand first active submission
  useEffect(() => {
    const firstActive = data.submissions?.find(s => !s.shipped);
    if (firstActive && !expandedId) setExpandedId(firstActive.id);
  }, [data]);

  const activeSubmissions = data.submissions.filter(s => !s.shipped);
  const completedSubmissions = data.submissions.filter(s => s.shipped);
  const pendingOffers = (data.buybackOffers || []).filter(o => o.status === 'pending');
  const hasSAM = data.company?.sam_enabled;
  const totalCards = data.submissions.reduce((sum, s) => sum + (s.card_count || s.cards?.length || 0), 0);
  const gradesReady = activeSubmissions.filter(s => s.grades_ready).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
      {showProfile && (
        <ProfileModal jwtToken={jwtToken} customer={data.customer}
          onClose={() => setShowProfile(false)}
          onUpdate={() => { setShowProfile(false); onRefresh(); }} />
      )}

      {/* Header */}
      <div className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.85) 0%, rgba(255, 107, 89, 0.9) 40%, rgba(232, 84, 61, 0.95) 100%)',
          boxShadow: '0 8px 40px rgba(255, 107, 89, 0.15)',
        }}>
        <div className="relative max-w-2xl mx-auto px-5 pt-8 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {data.company.name}
              </h1>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(255, 248, 240, 0.6)' }}>Customer Portal</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowProfile(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{data.customer.name}</span>
              </button>
              <button onClick={onLogout}
                className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}
                title="Sign out">
                <LogOut className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3">
            {[
              { label: 'Active', value: activeSubmissions.length, show: true },
              { label: 'Cards', value: totalCards, show: totalCards > 0 },
              { label: 'Grades Ready', value: gradesReady, show: gradesReady > 0 },
              { label: 'Completed', value: completedSubmissions.length, show: completedSubmissions.length > 0 },
            ].filter(s => s.show).map(stat => (
              <div key={stat.label} className="px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <p className="text-lg font-black text-white leading-none">{stat.value}</p>
                <p className="text-[10px] font-semibold" style={{ color: 'rgba(255, 248, 240, 0.6)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-40" style={{
        background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(40px) saturate(180%)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
      }}>
        <div className="max-w-2xl mx-auto px-5 flex items-center">
          <div className="flex gap-0 flex-1">
            {[
              { id: 'submissions', label: 'Submissions', icon: Package, count: data.submissions.length },
              ...(hasSAM ? [{ id: 'sam', label: 'Ask SAM', icon: Bot, badge: 'AI' }] : []),
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="px-3 sm:px-4 py-3 font-bold text-xs sm:text-sm transition-all"
                style={{
                  borderBottom: `2px solid ${activeTab === tab.id ? 'rgb(var(--brand-600))' : 'transparent'}`,
                  color: activeTab === tab.id ? 'rgb(var(--brand-600))' : 'rgba(44, 36, 22, 0.35)',
                }}>
                <div className="flex items-center gap-1.5">
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && <span className="text-[10px]" style={{ color: 'rgba(44, 36, 22, 0.25)' }}>({tab.count})</span>}
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full text-white"
                      style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {activeTab === 'sam' && hasSAM && (
          <div className="h-[calc(100vh-200px)] min-h-[400px] rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.5)' }}>
            <SAMChatInterface isCustomerPortal={true} jwtToken={jwtToken} />
          </div>
        )}

        {activeTab === 'submissions' && (
          <>
            {activeSubmissions.length === 0 && completedSubmissions.length === 0 ? (
              <div className="card p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(44, 36, 22, 0.1)' }} />
                <h3 className="text-xl font-bold mb-1" style={{ color: 'rgb(var(--dark))' }}>No Submissions Yet</h3>
                <p className="text-sm" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>Your submissions will appear here once you drop off cards.</p>
              </div>
            ) : (
              <>
                {activeSubmissions.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-lg font-black" style={{ color: 'rgb(var(--dark))' }}>Active</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(var(--brand-500), 0.08)', color: 'rgb(var(--brand-600))' }}>
                        {activeSubmissions.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {activeSubmissions.map(sub => (
                        <JWTSubmissionCard key={sub.id} submission={sub}
                          isExpanded={expandedId === sub.id}
                          onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                          jwtToken={jwtToken} onRefresh={onRefresh} />
                      ))}
                    </div>
                  </section>
                )}

                {pendingOffers.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-lg font-black" style={{ color: 'rgb(var(--dark))' }}>Buyback Offers</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#059669' }}>
                        {pendingOffers.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {pendingOffers.map(offer => (
                        <JWTBuybackCard key={offer.id} offer={offer} jwtToken={jwtToken} onRefresh={onRefresh} />
                      ))}
                    </div>
                  </section>
                )}

                {completedSubmissions.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-lg font-black" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>Completed</h2>
                      <span className="text-xs font-bold" style={{ color: 'rgba(44, 36, 22, 0.25)' }}>{completedSubmissions.length}</span>
                    </div>
                    <div className="space-y-3">
                      {completedSubmissions.map(sub => (
                        <JWTSubmissionCard key={sub.id} submission={sub}
                          isExpanded={expandedId === sub.id}
                          onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                          jwtToken={jwtToken} onRefresh={onRefresh} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="mt-12 py-5 text-center" style={{ borderTop: '1px solid rgba(0,0,0,0.03)' }}>
        <p className="text-xs" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>
          Questions? Contact <span className="font-bold" style={{ color: 'rgb(var(--dark))' }}>{data.company.name}</span>
        </p>
      </div>
    </div>
  );
}

// Simplified submission card for JWT portal (mirrors CustomerPortal's SubmissionCard)
function JWTSubmissionCard({ submission, isExpanded, onToggle, jwtToken, onRefresh }) {
  const isShipped = submission.shipped;
  const isGradesReady = submission.grades_ready;
  const isProblem = submission.problem_order;
  const serviceColor = getServiceColor(submission.service_level);

  let statusText = submission.current_step || 'Processing';
  let statusColor = '#D97706';
  if (isShipped) { statusText = 'Delivered'; statusColor = '#059669'; }
  else if (isGradesReady) { statusText = 'Grades Ready!'; statusColor = '#2563EB'; }
  else if (isProblem) { statusText = 'Needs Attention'; statusColor = '#DC2626'; }

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(40px) saturate(180%)',
      border: isProblem ? '1.5px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.5)',
      boxShadow: '0 2px 20px rgba(0,0,0,0.03)',
    }}>
      <button onClick={onToggle} className="w-full text-left p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg sm:text-xl font-black" style={{ color: 'rgb(var(--dark))' }}>
              #{submission.psa_submission_number || submission.internal_id || '—'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              style={{ background: `${serviceColor}12`, color: serviceColor, border: `1px solid ${serviceColor}20` }}>
              {submission.service_level || 'Standard'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0"
            style={{ background: `${statusColor}10`, color: statusColor }}>
            {statusText}
          </div>
        </div>
        {!isShipped && <ProgressPipeline currentStep={submission.current_step} shipped={false} />}
        <div className="flex items-center justify-between mt-3 text-xs" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>
          <span className="font-semibold">{submission.card_count || submission.cards?.length || 0} cards</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && submission.cards?.length > 0 && (
        <div className="px-5 pb-5 space-y-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          <p className="text-xs font-bold pt-3" style={{ color: 'rgba(44, 36, 22, 0.35)' }}>CARDS ({submission.cards.length})</p>
          {submission.cards.map(card => (
            <div key={card.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: 'rgb(var(--dark))' }}>
                  {card.player_name || card.description || 'Card'}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>
                  {[card.year, card.brand, card.card_number ? `#${card.card_number}` : ''].filter(Boolean).join(' ')}
                  {card.psa_cert_number && ` · Cert ${card.psa_cert_number}`}
                </p>
              </div>
              {card.grade && (
                <div className="w-9 h-9 rounded-lg flex flex-col items-center justify-center"
                  style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                  <span className="text-sm font-black leading-none" style={{ color: '#059669' }}>{card.grade}</span>
                  <span className="text-[7px] font-bold" style={{ color: 'rgba(5, 150, 105, 0.6)' }}>PSA</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Buyback card for JWT portal
function JWTBuybackCard({ offer, jwtToken, onRefresh }) {
  const [responding, setResponding] = useState(false);

  const handleResponse = async (response) => {
    if (!confirm(`${response === 'accepted' ? 'Accept' : 'Decline'} this offer for $${offer.offer_price}?`)) return;
    setResponding(true);
    try {
      await fetch(`${API_URL}/portal/buyback-offers/${offer.id}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
        body: JSON.stringify({ response })
      });
      onRefresh();
    } catch { alert('Failed to respond'); }
    setResponding(false);
  };

  return (
    <div className="rounded-2xl p-5" style={{
      background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255, 255, 255, 0.5)',
      boxShadow: '0 2px 20px rgba(0,0,0,0.03)',
    }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold truncate" style={{ color: 'rgb(var(--dark))' }}>
            {offer.card_description || offer.player_name || 'Card'}
          </h3>
          <p className="text-xs" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>
            {[offer.card_grade && `PSA ${offer.card_grade}`, offer.psa_cert_number && `Cert #${offer.psa_cert_number}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <p className="text-2xl font-black ml-3" style={{ color: '#059669' }}>${parseFloat(offer.offer_price).toFixed(2)}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => handleResponse('accepted')} disabled={responding}
          className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
          Accept
        </button>
        <button onClick={() => handleResponse('rejected')} disabled={responding}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: 'rgba(0,0,0,0.05)', color: 'rgba(44, 36, 22, 0.5)' }}>
          Decline
        </button>
      </div>
    </div>
  );
}

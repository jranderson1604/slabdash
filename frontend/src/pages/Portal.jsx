import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import CustomerPortal from './CustomerPortal';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import BeforePhotoUpload from '../components/BeforePhotoUpload';
import CompLookup from '../components/CompLookup';
import SAMChatInterface from '../components/SAMChatInterface';
import {
  Loader2, AlertTriangle, Eye, EyeOff, Store, ArrowRight, Lock, Mail, KeyRound, ArrowLeft,
  CheckCircle2, Package, Clock, Sparkles, ChevronDown, ChevronUp, Hash,
  Key, Truck, MessageSquare, Camera, Bot, Bell, BellOff, Grid, Search,
  Image as ImageIcon, Upload, User, LogOut, Settings, Plus, Smartphone, Shield, X, Delete,
  CreditCard, RefreshCw, Star, Wallet, Home, Layers, DollarSign, ExternalLink,
  TrendingUp, Zap, Award, CalendarClock
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const STORAGE_KEY = 'slabdash_portal_token';
const SHOP_KEY = 'slabdash_portal_shop';
const PIN_LAST_VERIFIED = 'slabdash_pin_verified';

// ============================================
// Add to Home Screen Banner
// ============================================
function AddToHomeScreenBanner({ onDismiss }) {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsIOS(/iPhone|iPad|iPod/.test(ua) && !window.MSStream);
    setIsAndroid(/Android/.test(ua));
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);
  }, []);

  if (isStandalone || (!isIOS && !isAndroid)) return null;

  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.06))',
      border: '1px solid rgba(99, 102, 241, 0.15)',
    }}>
      <div className="px-4 py-3.5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>Add to Home Screen</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>
            {isIOS
              ? 'Tap the Share button below, then "Add to Home Screen"'
              : 'Tap the menu (\u22EE) then "Add to Home Screen"'}
          </p>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-lg shrink-0" style={{ background: 'rgba(0,0,0,0.04)' }}>
          <X className="w-3.5 h-3.5" style={{ color: 'rgba(44, 36, 22, 0.5)' }} />
        </button>
      </div>
    </div>
  );
}

// ============================================
// PIN Entry Screen (quick re-auth)
// ============================================
function PINScreen({ onVerified, onFallback, jwtToken, customerName }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length === 4) verifyPin(newPin);
  };

  const handleDelete = () => { setPin(prev => prev.slice(0, -1)); setError(''); };

  const verifyPin = async (code) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/portal/auth/pin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
        body: JSON.stringify({ pin: code }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) localStorage.setItem(STORAGE_KEY, data.token);
        localStorage.setItem(PIN_LAST_VERIFIED, Date.now().toString());
        onVerified(data.token || jwtToken);
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin('');
        setError(data.error || 'Incorrect PIN');
      }
    } catch {
      setPin('');
      setError('Verification failed');
    }
    setLoading(false);
  };

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(180deg, rgb(var(--bg-color)) 0%, rgba(var(--bg-color), 0.95) 100%)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
        <Shield className="w-7 h-7 text-white" />
      </div>
      <h2 className="text-xl font-black mb-1" style={{ color: 'rgb(var(--dark))' }}>Welcome back</h2>
      <p className="text-sm mb-8" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>{customerName}</p>
      <div className={`flex gap-4 mb-8 ${shake ? 'animate-shake' : ''}`}>
        {dots.map((filled, i) => (
          <div key={i} className="w-4 h-4 rounded-full transition-all duration-200"
            style={{
              background: filled ? 'rgb(var(--brand-500))' : 'transparent',
              border: `2px solid ${filled ? 'rgb(var(--brand-500))' : 'rgba(44, 36, 22, 0.15)'}`,
              transform: filled ? 'scale(1.1)' : 'scale(1)',
            }} />
        ))}
      </div>
      {error && <p className="text-xs font-semibold mb-4" style={{ color: '#DC2626' }}>{error}</p>}
      <div className="grid grid-cols-3 gap-3 mb-6" style={{ maxWidth: '260px' }}>
        {[1,2,3,4,5,6,7,8,9,'',0,'del'].map((key, i) => {
          if (key === '') return <div key={i} />;
          if (key === 'del') return (
            <button key="del" onClick={handleDelete} disabled={loading || pin.length === 0}
              className="w-20 h-14 rounded-2xl flex items-center justify-center disabled:opacity-30"
              style={{ background: 'rgba(0,0,0,0.04)' }}>
              <Delete className="w-5 h-5" style={{ color: 'rgba(44, 36, 22, 0.5)' }} />
            </button>
          );
          return (
            <button key={key} onClick={() => handleDigit(String(key))} disabled={loading}
              className="w-20 h-14 rounded-2xl text-xl font-bold disabled:opacity-50 active:scale-95 transition-transform"
              style={{ background: 'rgba(0,0,0,0.04)', color: 'rgb(var(--dark))' }}>
              {key}
            </button>
          );
        })}
      </div>
      <button onClick={onFallback} className="text-xs font-semibold py-2 px-4 rounded-lg"
        style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Use password instead</button>
      {loading && <Loader2 className="w-5 h-5 animate-spin mt-4" style={{ color: 'rgb(var(--brand-500))' }} />}
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}

// ============================================
// PIN Setup Prompt (after first login)
// ============================================
function PINSetupPrompt({ jwtToken, onComplete, onSkip }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState('enter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit) => {
    const current = step === 'enter' ? pin : confirmPin;
    if (current.length >= 4) return;
    const newVal = current + digit;
    if (step === 'enter') {
      setPin(newVal);
      if (newVal.length === 4) setTimeout(() => setStep('confirm'), 300);
    } else {
      setConfirmPin(newVal);
      if (newVal.length === 4) {
        if (newVal !== pin) {
          setError('PINs don\'t match. Try again.');
          setPin(''); setConfirmPin(''); setStep('enter');
        } else {
          submitPin(newVal);
        }
      }
    }
    setError('');
  };

  const handleDelete = () => {
    if (step === 'enter') setPin(prev => prev.slice(0, -1));
    else setConfirmPin(prev => prev.slice(0, -1));
  };

  const submitPin = async (code) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/portal/auth/pin/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
        body: JSON.stringify({ pin: code }),
      });
      if (res.ok) {
        localStorage.setItem(PIN_LAST_VERIFIED, Date.now().toString());
        onComplete();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to set PIN');
        setPin(''); setConfirmPin(''); setStep('enter');
      }
    } catch { setError('Failed to set PIN'); }
    setLoading(false);
  };

  const currentPin = step === 'enter' ? pin : confirmPin;
  const dots = Array.from({ length: 4 }, (_, i) => i < currentPin.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-xs rounded-3xl p-6 text-center"
        style={{ background: '#FAF5EF', boxShadow: '0 25px 80px rgba(0,0,0,0.2)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-black mb-1" style={{ color: 'rgb(var(--dark))' }}>
          {step === 'enter' ? 'Set a Quick PIN' : 'Confirm PIN'}
        </h3>
        <p className="text-xs mb-6" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>
          {step === 'enter' ? 'Use a 4-digit PIN for quick access next time' : 'Enter the same PIN again to confirm'}
        </p>
        <div className="flex gap-4 justify-center mb-6">
          {dots.map((filled, i) => (
            <div key={i} className="w-4 h-4 rounded-full transition-all duration-200"
              style={{ background: filled ? 'rgb(var(--brand-500))' : 'transparent', border: `2px solid ${filled ? 'rgb(var(--brand-500))' : 'rgba(44, 36, 22, 0.15)'}` }} />
          ))}
        </div>
        {error && <p className="text-xs font-semibold mb-3" style={{ color: '#DC2626' }}>{error}</p>}
        <div className="grid grid-cols-3 gap-2 mb-4 mx-auto" style={{ maxWidth: '220px' }}>
          {[1,2,3,4,5,6,7,8,9,'',0,'del'].map((key, i) => {
            if (key === '') return <div key={i} />;
            if (key === 'del') return (
              <button key="del" onClick={handleDelete} disabled={loading}
                className="w-16 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.04)' }}>
                <Delete className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.5)' }} />
              </button>
            );
            return (
              <button key={key} onClick={() => handleDigit(String(key))} disabled={loading}
                className="w-16 h-12 rounded-xl text-lg font-bold active:scale-95 transition-transform"
                style={{ background: 'rgba(0,0,0,0.04)', color: 'rgb(var(--dark))' }}>{key}</button>
            );
          })}
        </div>
        <button onClick={onSkip} className="text-xs font-semibold py-2" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Skip for now</button>
        {loading && <Loader2 className="w-5 h-5 animate-spin mx-auto mt-2" style={{ color: 'rgb(var(--brand-500))' }} />}
      </div>
    </div>
  );
}

// ============================================
// LOGIN PAGE — 4-digit shop code + sign up / sign in
// ============================================
function PortalLogin({ onLoginSuccess, initialShop }) {
  const [step, setStep] = useState('shop');
  const [shopCode, setShopCode] = useState('');
  const [shop, setShop] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const codeRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (initialShop) {
      setShop(initialShop);
      setShopCode(initialShop.shop_code || initialShop.slug || '');
      setStep('signin');
      return;
    }
    const saved = localStorage.getItem(SHOP_KEY);
    if (saved) {
      try { const parsed = JSON.parse(saved); setShop(parsed); setShopCode(parsed.shop_code || parsed.slug || ''); setStep('signin'); } catch {}
    }
  }, [initialShop]);

  useEffect(() => {
    if (step === 'shop') setTimeout(() => codeRefs[0].current?.focus(), 100);
  }, [step]);

  const handleCodeInput = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = shopCode.split('');
    newCode[index] = digit;
    const code = newCode.join('');
    setShopCode(code);
    setError('');
    if (digit && index < 3) codeRefs[index + 1].current?.focus();
    if (code.length === 4 && /^\d{4}$/.test(code)) lookupShop(code);
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !shopCode[index] && index > 0) codeRefs[index - 1].current?.focus();
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) { setShopCode(pasted); codeRefs[3].current?.focus(); lookupShop(pasted); }
  };

  const lookupShop = async (code) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/shop-lookup/${encodeURIComponent(code)}`);
      if (!res.ok) { setError('Shop not found. Check the code and try again.'); setLoading(false); return; }
      const data = await res.json();
      setShop(data); localStorage.setItem(SHOP_KEY, JSON.stringify(data)); setStep('signin');
    } catch { setError('Connection error. Please try again.'); }
    setLoading(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopCode: shop.shop_code || shop.slug, email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'NO_PASSWORD') { setError('No account found. Please create one first.'); setStep('signup'); }
        else setError(data.error || 'Sign in failed');
        setLoading(false); return;
      }
      localStorage.setItem(STORAGE_KEY, data.token);
      localStorage.setItem(SHOP_KEY, JSON.stringify(data.company));
      onLoginSuccess(data.token, data.customer);
    } catch { setError('Connection error. Please try again.'); }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopCode: shop.shop_code || shop.slug, name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) { setError('Account already exists. Please sign in instead.'); setStep('signin'); }
        else setError(data.error || 'Registration failed');
        setLoading(false); return;
      }
      localStorage.setItem(STORAGE_KEY, data.token);
      localStorage.setItem(SHOP_KEY, JSON.stringify(data.company));
      onLoginSuccess(data.token, data.customer, true);
    } catch { setError('Connection error. Please try again.'); }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopCode: shop.shop_code || shop.slug, email: email.trim() }),
      });
      const data = await res.json();
      setSuccess(data.message);
    } catch { setSuccess('If your email is registered, you will receive a password reset link.'); }
    setLoading(false);
  };

  const changeShop = () => {
    setShop(null); setShopCode(''); setStep('shop'); setError(''); setSuccess('');
    localStorage.removeItem(SHOP_KEY);
  };

  const inputStyle = { background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none', color: 'rgb(var(--dark))' };

  // ---- Shop Code Entry ----
  if (step === 'shop') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(180deg, rgb(var(--bg-color)) 0%, rgba(var(--bg-color), 0.95) 100%)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))', boxShadow: '0 8px 30px rgba(255, 107, 89, 0.2)' }}>
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black mb-1" style={{ color: 'rgb(var(--dark))' }}>Enter Shop Code</h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>Ask your card shop for their 4-digit code</p>
          <div className="flex gap-3 justify-center mb-6" onPaste={handleCodePaste}>
            {[0,1,2,3].map(i => (
              <input key={i} ref={codeRefs[i]} type="text" inputMode="numeric" maxLength={1}
                value={shopCode[i] || ''}
                onChange={(e) => handleCodeInput(i, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                className="w-16 h-20 rounded-2xl text-center text-3xl font-black focus:ring-2 transition-all"
                style={{ ...inputStyle, background: shopCode[i] ? 'rgba(var(--brand-500), 0.05)' : 'rgba(0,0,0,0.03)', borderColor: shopCode[i] ? 'rgba(var(--brand-500), 0.2)' : 'rgba(0,0,0,0.08)' }} />
            ))}
          </div>
          {error && <div className="flex items-center gap-2 justify-center mb-4 text-xs font-semibold" style={{ color: '#DC2626' }}><AlertTriangle className="w-3.5 h-3.5" />{error}</div>}
          {loading && <div className="flex items-center gap-2 justify-center mb-4"><Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--brand-500))' }} /><span className="text-sm font-semibold" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>Looking up shop...</span></div>}
          <p className="text-[11px] mt-8" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>The code is on your receipt or the QR poster in-store</p>
        </div>
      </div>
    );
  }

  // ---- Sign In / Sign Up / Forgot Password ----
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(180deg, rgb(var(--bg-color)) 0%, rgba(var(--bg-color), 0.95) 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          {shop?.logo_url ? (
            <img src={shop.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3" />
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: shop?.primary_color || 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
              <Store className="w-7 h-7 text-white" />
            </div>
          )}
          <h2 className="text-xl font-black" style={{ color: 'rgb(var(--dark))' }}>{shop?.name}</h2>
          <button onClick={changeShop} className="text-[11px] font-semibold mt-1 flex items-center gap-1 mx-auto"
            style={{ color: 'rgba(44, 36, 22, 0.5)' }}><ArrowLeft className="w-3 h-3" /> Different shop</button>
        </div>

        {step !== 'forgot' && (
          <div className="flex rounded-xl mb-6 p-1" style={{ background: 'rgba(0,0,0,0.04)' }}>
            {['signin', 'signup'].map(tab => (
              <button key={tab} onClick={() => { setStep(tab); setError(''); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: step === tab ? 'white' : 'transparent',
                  color: step === tab ? 'rgb(var(--dark))' : 'rgba(44, 36, 22, 0.55)',
                  boxShadow: step === tab ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                }}>
                {tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        )}

        {step === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-center mb-4">
              <KeyRound className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(44, 36, 22, 0.55)' }} />
              <h3 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>Reset Password</h3>
              <p className="text-xs mt-1" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>Enter your email and we'll send you a reset link</p>
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="w-full pl-10 pr-4 py-3 rounded-xl text-sm" style={inputStyle} />
            </div>
            {error && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
            {success && <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)' }}><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#059669' }} /><p className="text-xs" style={{ color: '#059669' }}>{success}</p></div>}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Reset Link'}
            </button>
            <button type="button" onClick={() => { setStep('signin'); setError(''); setSuccess(''); }} className="w-full text-xs font-semibold py-2" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Back to sign in</button>
          </form>
        )}

        {step === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required autoComplete="email" className="w-full pl-10 pr-4 py-3 rounded-xl text-sm" style={inputStyle} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required autoComplete="current-password" className="w-full pl-10 pr-10 py-3 rounded-xl text-sm" style={inputStyle} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} /> : <Eye className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} />}
              </button>
            </div>
            {error && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sign In'}
            </button>
            <button type="button" onClick={() => { setStep('forgot'); setError(''); }} className="w-full text-xs font-semibold py-1" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Forgot password?</button>
          </form>
        )}

        {step === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required autoComplete="name" className="w-full pl-10 pr-4 py-3 rounded-xl text-sm" style={inputStyle} />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required autoComplete="email" className="w-full pl-10 pr-4 py-3 rounded-xl text-sm" style={inputStyle} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars, letters & numbers)" required autoComplete="new-password" className="w-full pl-10 pr-10 py-3 rounded-xl text-sm" style={inputStyle} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} /> : <Eye className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} />}
              </button>
            </div>
            <p className="text-[10px] px-1" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>If your shop already has your email on file, your account will be linked automatically.</p>
            {error && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Account'}
            </button>
          </form>
        )}
        <p className="text-center text-[10px] mt-6" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Powered by SlabDash</p>
      </div>
    </div>
  );
}

// ============================================
// MAIN PORTAL — smart router
// ============================================
export default function Portal() {
  const [searchParams] = useSearchParams();
  const magicToken = searchParams.get('token');
  const shopParam = searchParams.get('shop');

  const [mode, setMode] = useState('loading');
  const [jwtToken, setJwtToken] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [initialShop, setInitialShop] = useState(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showHomeScreenBanner, setShowHomeScreenBanner] = useState(false);

  useEffect(() => {
    if (magicToken) {
      fetch(`${API_URL}/portal/access?token=${magicToken}`)
        .then(res => { if (res.ok) setMode('portal-token'); else checkJwt(); })
        .catch(() => checkJwt());
    } else {
      checkJwt();
    }
  }, [magicToken]);

  useEffect(() => {
    if (shopParam && !magicToken) {
      fetch(`${API_URL}/portal/auth/shop-lookup/${encodeURIComponent(shopParam.toLowerCase())}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) { setInitialShop(data); localStorage.setItem(SHOP_KEY, JSON.stringify(data)); } })
        .catch(() => {});
    }
  }, [shopParam]);

  const checkJwt = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      fetch(`${API_URL}/portal/me`, { headers: { Authorization: `Bearer ${saved}` } })
        .then(res => { if (res.ok) return res.json(); throw new Error('invalid'); })
        .then(data => {
          setJwtToken(saved);
          setCustomerInfo(data.customer);
          const lastVerified = parseInt(localStorage.getItem(PIN_LAST_VERIFIED) || '0');
          const needsPin = data.customer?.hasPin && (Date.now() - lastVerified > 5 * 60 * 1000);
          setMode(needsPin ? 'pin' : 'portal-jwt');
        })
        .catch(() => { localStorage.removeItem(STORAGE_KEY); setMode('login'); });
    } else {
      setMode('login');
    }
  };

  const handleLoginSuccess = (token, customer, isNewAccount = false) => {
    setJwtToken(token); setCustomerInfo(customer); setMode('portal-jwt');
    localStorage.setItem(PIN_LAST_VERIFIED, Date.now().toString());
    if (isNewAccount || !customer?.hasPin) setTimeout(() => setShowPinSetup(true), 1500);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (!isStandalone) setShowHomeScreenBanner(true);
  };

  const handlePinVerified = (newToken) => { setJwtToken(newToken || jwtToken); setMode('portal-jwt'); };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(PIN_LAST_VERIFIED);
    setJwtToken(null); setCustomerInfo(null); setMode('login');
  };

  if (mode === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'rgb(var(--brand-500))' }} />
    </div>
  );

  if (mode === 'pin') return <PINScreen jwtToken={jwtToken} customerName={customerInfo?.name || ''} onVerified={handlePinVerified} onFallback={() => handleLogout()} />;
  if (mode === 'login') return <PortalLogin onLoginSuccess={handleLoginSuccess} initialShop={initialShop} />;
  if (mode === 'portal-token' && magicToken) return <CustomerPortal />;

  if (mode === 'portal-jwt' && jwtToken) {
    return (
      <>
        {showPinSetup && <PINSetupPrompt jwtToken={jwtToken} onComplete={() => setShowPinSetup(false)} onSkip={() => setShowPinSetup(false)} />}
        <CustomerPortalJWT jwtToken={jwtToken} onLogout={handleLogout}
          showHomeScreenBanner={showHomeScreenBanner} onDismissHomeBanner={() => setShowHomeScreenBanner(false)} />
      </>
    );
  }

  return <PortalLogin onLoginSuccess={handleLoginSuccess} initialShop={initialShop} />;
}

// ============================================
// JWT-BASED PORTAL — full featured customer experience
// ============================================
function CustomerPortalJWT({ jwtToken, onLogout, showHomeScreenBanner, onDismissHomeBanner }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [lastPollTime, setLastPollTime] = useState(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => { loadData(); checkPushStatus(); }, [jwtToken]);

  const checkPushStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/portal/push/status`, { headers: { Authorization: `Bearer ${jwtToken}` } });
      if (res.ok) { const d = await res.json(); setPushSubscribed(d.subscribed); }
    } catch {}
  };

  const togglePush = async () => {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      if (pushSubscribed) {
        // Unsubscribe
        const reg = await navigator.serviceWorker?.ready;
        const sub = await reg?.pushManager?.getSubscription();
        if (sub) {
          await fetch(`${API_URL}/portal/push/unsubscribe`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushSubscribed(false);
      } else {
        // Subscribe
        const keyRes = await fetch(`${API_URL}/portal/push/vapid-key`);
        const { key } = await keyRes.json();
        if (!key) { setPushLoading(false); return; }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') { setPushLoading(false); return; }

        const reg = await navigator.serviceWorker?.ready;
        if (!reg) { setPushLoading(false); return; }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
        });

        await fetch(`${API_URL}/portal/push/subscribe`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
        setPushSubscribed(true);
      }
    } catch (err) {
      console.error('Push toggle error:', err);
    }
    setPushLoading(false);
  };

  // Auto-poll for submission updates every 2 minutes
  const lastPollRef = useRef(lastPollTime);
  lastPollRef.current = lastPollTime;
  useEffect(() => {
    if (!data || !jwtToken) return;
    const interval = setInterval(async () => {
      try {
        const headers = { Authorization: `Bearer ${jwtToken}` };
        const since = lastPollRef.current || new Date(Date.now() - 120000).toISOString();
        const res = await fetch(`${API_URL}/portal/submissions/poll?since=${encodeURIComponent(since)}`, { headers });
        if (!res.ok) return;
        const poll = await res.json();
        setLastPollTime(poll.serverTime);

        if (poll.hasChanges && poll.submissions?.length > 0) {
          // Merge updated submissions into existing data
          setData(prev => {
            if (!prev) return prev;
            const updatedMap = {};
            for (const s of poll.submissions) updatedMap[s.id] = s;
            const merged = (prev.submissions || []).map(sub =>
              updatedMap[sub.id] ? { ...sub, ...updatedMap[sub.id] } : sub
            );
            return { ...prev, submissions: merged };
          });
        }
      } catch {} // Silent fail — polling shouldn't disrupt UX
    }, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, [!!data, jwtToken]);

  const loadData = async () => {
    try {
      const headers = { Authorization: `Bearer ${jwtToken}` };
      const [meRes, subsRes, statsRes, offersRes, cardsRes] = await Promise.all([
        fetch(`${API_URL}/portal/me`, { headers }),
        fetch(`${API_URL}/portal/submissions`, { headers }),
        fetch(`${API_URL}/portal/stats`, { headers }).catch(() => null),
        fetch(`${API_URL}/portal/buyback-offers`, { headers }).catch(() => null),
        fetch(`${API_URL}/portal/cards`, { headers }).catch(() => null),
      ]);

      if (!meRes.ok) { onLogout(); return; }

      const me = await meRes.json();
      const submissions = subsRes.ok ? await subsRes.json() : [];
      const offers = offersRes?.ok ? await offersRes.json() : [];
      const cards = cardsRes?.ok ? await cardsRes.json() : [];

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

      setData({ customer: me.customer, company: me.company, submissions: subsWithCards, buybackOffers: offers, cards });
      setLastPollTime(new Date().toISOString());
      setLoading(false);
    } catch (err) {
      console.error('JWT portal load error:', err);
      onLogout();
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" style={{ color: 'rgb(var(--brand-500))' }} />
        <p className="text-sm font-bold" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Loading your portal...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
      <div className="card p-10 max-w-sm text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: '#DC2626' }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: 'rgb(var(--dark))' }}>Session Expired</h2>
        <button onClick={onLogout} className="px-6 py-2 rounded-xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>Log In</button>
      </div>
    </div>
  );

  return <JWTPortalView data={data} jwtToken={jwtToken} onLogout={onLogout} onRefresh={loadData}
    showProfile={showProfile} setShowProfile={setShowProfile}
    showHomeScreenBanner={showHomeScreenBanner} onDismissHomeBanner={onDismissHomeBanner} />;
}

// ============================================
// Shared helpers
// ============================================
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const PSA_STEPS = ['Arrived', 'Order Prep', 'Research & ID', 'Grading', 'Assembly', 'Grades Ready', 'QA Checks', 'Shipped', 'Picked Up'];

function getStepIndex(currentStep) {
  if (!currentStep) return -1;
  const lower = currentStep.toLowerCase();
  if (lower.includes('arrived')) return 0;
  if (lower.includes('order prep')) return 1;
  if (lower.includes('research')) return 2;
  if (lower.includes('grading') && !lower.includes('ready')) return 3;
  if (lower.includes('assembly')) return 4;
  if (lower.includes('grades ready') || lower.includes('grade ready')) return 5;
  if (lower.includes('qa') || lower.includes('quality')) return 6;
  if (lower.includes('shipped') || lower.includes('complete')) return 7;
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

function ProgressPipeline({ currentStep, shipped, pickedUp, estimated }) {
  let stepIdx;
  if (pickedUp) stepIdx = PSA_STEPS.length;
  else if (shipped) stepIdx = 7;
  else stepIdx = getStepIndex(currentStep);

  const totalSteps = PSA_STEPS.length;

  // Use estimated progress for smooth sub-step interpolation (customers see movement even without step changes)
  let progress;
  if (pickedUp) progress = 100;
  else if (shipped) progress = Math.round((7 / totalSteps) * 100);
  else if (estimated?.estimatedProgress) progress = estimated.estimatedProgress;
  else if (stepIdx >= 0) progress = Math.round(((stepIdx + 0.5) / totalSteps) * 100);
  else progress = 0;

  const isComplete = pickedUp;
  const isActive = !isComplete && !shipped && stepIdx >= 0;

  // Condensed steps for mobile: show key milestones as nodes
  const milestones = [
    { label: 'Arrived', short: 'Recv', idx: 0 },
    { label: 'Grading', short: 'Grade', idx: 3 },
    { label: 'Grades Ready', short: 'Ready', idx: 5 },
    { label: 'Shipped', short: 'Ship', idx: 7 },
    { label: 'Done', short: 'Done', idx: 8 },
  ];

  return (
    <div className="py-1">
      {/* Main track with milestone nodes */}
      <div className="relative">
        {/* Track background */}
        <div className="h-1.5 rounded-full mx-2" style={{ background: 'rgba(44, 36, 22, 0.08)' }} />

        {/* Filled track with animated gradient */}
        <div className="absolute top-0 left-2 h-1.5 rounded-full transition-all duration-[1500ms] ease-out"
          style={{
            width: `calc(${progress}% - 4px)`,
            background: isComplete
              ? 'linear-gradient(90deg, #10B981, #059669, #10B981)'
              : shipped
              ? 'linear-gradient(90deg, rgb(var(--brand-500)), #10B981, #059669)'
              : 'linear-gradient(90deg, rgb(var(--brand-400)), rgb(var(--brand-500)), rgb(var(--brand-600)))',
            backgroundSize: isActive ? '200% 100%' : '100% 100%',
            animation: isActive ? 'shimmer 3s ease-in-out infinite' : 'none',
          }} />

        {/* Glowing leading edge */}
        {isActive && progress > 5 && (
          <div className="absolute top-0 h-1.5 rounded-full"
            style={{
              left: `calc(${progress}% - 8px)`,
              width: '12px',
              background: 'radial-gradient(circle, rgba(255,129,112,0.8), transparent)',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }} />
        )}

        {/* Milestone nodes */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-0">
          {milestones.map((m, i) => {
            const nodeProgress = (m.idx / (totalSteps)) * 100;
            const isPast = m.idx < stepIdx;
            const isCurrent = m.idx === stepIdx;
            const isFuture = m.idx > stepIdx;
            const isLastComplete = isComplete && i === milestones.length - 1;

            return (
              <div key={m.label} className="flex flex-col items-center" style={{ width: '20%' }}>
                {/* Node */}
                <div className="relative flex items-center justify-center transition-all duration-500"
                  style={{
                    width: isCurrent ? 22 : isPast || isLastComplete ? 18 : 14,
                    height: isCurrent ? 22 : isPast || isLastComplete ? 18 : 14,
                    borderRadius: '50%',
                    background: isPast || isLastComplete
                      ? isComplete ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, rgb(var(--brand-400)), rgb(var(--brand-600)))'
                      : isCurrent
                      ? 'linear-gradient(135deg, rgb(var(--brand-400)), rgb(var(--brand-600)))'
                      : '#F0E8DE',
                    border: isFuture && !isLastComplete ? '2px solid rgba(44,36,22,0.08)' : 'none',
                    boxShadow: isCurrent
                      ? '0 0 0 4px rgba(var(--brand-500), 0.15), 0 2px 8px rgba(var(--brand-500), 0.3)'
                      : isPast ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}>
                  {(isPast || isLastComplete) && (
                    <CheckCircle2 className="text-white" style={{ width: isPast ? 10 : 10, height: isPast ? 10 : 10 }} />
                  )}
                  {isCurrent && (
                    <div className="rounded-full bg-white" style={{ width: 6, height: 6, animation: 'pulse-glow 2s ease-in-out infinite' }} />
                  )}
                </div>
                {/* Label */}
                <span className="text-[9px] sm:text-[10px] font-bold mt-1.5 text-center leading-tight"
                  style={{
                    color: isPast || isLastComplete ? '#059669' : isCurrent ? 'rgb(var(--brand-600))' : 'rgba(44, 36, 22, 0.45)',
                    fontWeight: isCurrent ? 900 : isPast ? 700 : 600,
                  }}>
                  {isLastComplete ? 'Done!' : m.short}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

// ============================================
// Profile Settings Modal
// ============================================
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
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      const body = {};
      if (name.trim() !== customer.name) body.name = name.trim();
      if (email.trim().toLowerCase() !== (customer.email || '').toLowerCase()) body.email = email.trim();
      if ((phone || '') !== (customer.phone || '')) body.phone = phone;
      if (newPw) { body.currentPassword = currentPw; body.newPassword = newPw; }
      if (Object.keys(body).length === 0) { setError('No changes to save'); setLoading(false); return; }
      const res = await fetch(`${API_URL}/portal/profile`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setSuccess('Profile updated!'); setCurrentPw(''); setNewPw('');
      if (onUpdate) onUpdate(data.customer);
    } catch { setError('Failed to update'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#FAF5EF', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>Profile Settings</h2>
          <button onClick={onClose} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(44, 36, 22, 0.4)' }}>Close</button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          {[
            { label: 'NAME', value: name, set: setName, type: 'text' },
            { label: 'EMAIL', value: email, set: setEmail, type: 'email' },
            { label: 'PHONE', value: phone, set: setPhone, type: 'tel' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-[11px] font-bold" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>{f.label}</label>
              <input type={f.type} value={f.value} onChange={(e) => f.set(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none' }} />
            </div>
          ))}
          <div className="pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <p className="text-[11px] font-bold mb-2" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>CHANGE PASSWORD</p>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password"
              className="w-full px-3 py-2.5 rounded-lg text-sm mb-2" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none' }} />
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password"
              className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', outline: 'none' }} />
          </div>
          {error && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
          {success && <p className="text-xs font-semibold" style={{ color: '#059669' }}>{success}</p>}
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// JWT Portal View — full tabbed experience
// ============================================
function JWTPortalView({ data, jwtToken, onLogout, onRefresh, showProfile, setShowProfile, showHomeScreenBanner, onDismissHomeBanner }) {
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('submissions');
  const [refreshing, setRefreshing] = useState(false);
  const [cardSearch, setCardSearch] = useState('');

  useEffect(() => {
    const firstActive = data.submissions?.find(s => !s.shipped);
    if (firstActive && !expandedId) setExpandedId(firstActive.id);
  }, [data]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const subs = data.submissions || [];
  const readyForPickup = subs.filter(s => s.pickup_code && !s.picked_up);
  const activeSubmissions = subs.filter(s => !s.shipped && !s.picked_up && !s.pickup_code);
  const completedSubmissions = subs.filter(s => s.picked_up || (s.shipped && !s.pickup_code));
  const pendingOffers = (data.buybackOffers || []).filter(o => o.status === 'pending');
  const hasSAM = data.company?.sam_enabled;
  const totalCards = subs.reduce((sum, s) => sum + (s.card_count || s.cards?.length || 0), 0);
  const allCards = data.cards || [];
  const gradedCards = allCards.filter(c => c.grade);

  // Filter cards for My Cards tab
  const filteredCards = cardSearch
    ? allCards.filter(c => {
        const q = cardSearch.toLowerCase();
        return (c.player_name || '').toLowerCase().includes(q)
          || (c.description || '').toLowerCase().includes(q)
          || (c.brand || '').toLowerCase().includes(q)
          || (c.psa_cert_number || '').includes(q)
          || (c.year || '').includes(q);
      })
    : allCards;

  const tabs = [
    { id: 'submissions', label: 'Orders', icon: Package, count: subs.length },
    { id: 'cards', label: 'My Cards', icon: Layers, count: allCards.length },
    ...(hasSAM ? [{ id: 'sam', label: 'Ask SAM', icon: Bot, badge: 'AI' }] : []),
    { id: 'settings', label: 'More', icon: Settings },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
      {showProfile && (
        <ProfileModal jwtToken={jwtToken} customer={data.customer}
          onClose={() => setShowProfile(false)} onUpdate={() => { setShowProfile(false); onRefresh(); }} />
      )}

      {/* Header */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9) 0%, rgba(232, 84, 61, 0.95) 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', transform: 'translate(30%, -40%)' }} />
        <div className="relative max-w-2xl mx-auto px-5 pt-7 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              {data.company.logo_url ? (
                <img src={data.company.logo_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" style={{ border: '2px solid rgba(255,255,255,0.25)' }} />
              ) : null}
              <div className="min-w-0">
                <h1 className="text-xl font-black text-white truncate">{data.company.name}</h1>
                <p className="text-xs font-semibold" style={{ color: 'rgba(255, 248, 240, 0.6)' }}>Hey, {data.customer.name}</p>
              </div>
            </div>
            <button onClick={handleRefresh} disabled={refreshing}
              className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Simple stat line — not chips, just clean text */}
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,248,240,0.7)' }}>
            {activeSubmissions.length > 0 && `${activeSubmissions.length} active`}
            {activeSubmissions.length > 0 && readyForPickup.length > 0 && ' \u00B7 '}
            {readyForPickup.length > 0 && <span style={{ color: '#fff', fontWeight: 900 }}>{readyForPickup.length} ready for pickup</span>}
            {activeSubmissions.length === 0 && readyForPickup.length === 0 && completedSubmissions.length === 0 && 'No orders yet'}
            {activeSubmissions.length === 0 && readyForPickup.length === 0 && completedSubmissions.length > 0 && `${completedSubmissions.length} completed`}
          </p>
        </div>
      </div>

      {/* Home screen banner */}
      {showHomeScreenBanner && (
        <div className="max-w-2xl mx-auto pt-4">
          <AddToHomeScreenBanner onDismiss={onDismissHomeBanner} />
        </div>
      )}

      {/* Bottom tab navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50"
        style={{ background: '#F5EDE4', borderTop: '1px solid rgba(44,36,22,0.06)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all"
              style={{
                color: activeTab === tab.id ? 'rgb(var(--brand-600))' : 'rgba(44, 36, 22, 0.5)',
                background: activeTab === tab.id ? 'rgba(var(--brand-500), 0.1)' : 'transparent',
              }}>
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5 pb-24 space-y-5">

        {/* ====== SUBMISSIONS TAB ====== */}
        {activeTab === 'submissions' && (
          <>
            {activeSubmissions.length === 0 && readyForPickup.length === 0 && completedSubmissions.length === 0 && pendingOffers.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{
                background: '#FBF7F2',
                border: '1px solid rgba(44,36,22,0.06)',
              }}>
                <Package className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(44, 36, 22, 0.55)' }} />
                <h3 className="text-lg font-bold mb-2" style={{ color: 'rgb(var(--dark))' }}>No Submissions Yet</h3>
                <p className="text-sm" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Your submissions will show up here once you drop off cards at the shop.</p>
              </div>
            ) : (
              <>
                {/* Ready for Pickup - most important, shown first */}
                {readyForPickup.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-base font-black" style={{ color: '#7C3AED' }}>Ready for Pickup</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#7C3AED' }}>{readyForPickup.length}</span>
                    </div>
                    <div className="space-y-3">
                      {readyForPickup.map(sub => (
                        <JWTSubmissionCard key={sub.id} submission={sub} isExpanded={expandedId === sub.id}
                          onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)} jwtToken={jwtToken} onRefresh={onRefresh} />
                      ))}
                    </div>
                  </section>
                )}

                {activeSubmissions.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-base font-black" style={{ color: 'rgb(var(--dark))' }}>Active Orders</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(var(--brand-500), 0.08)', color: 'rgb(var(--brand-600))' }}>{activeSubmissions.length}</span>
                    </div>
                    <div className="space-y-3">
                      {activeSubmissions.map(sub => (
                        <JWTSubmissionCard key={sub.id} submission={sub} isExpanded={expandedId === sub.id}
                          onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)} jwtToken={jwtToken} onRefresh={onRefresh} />
                      ))}
                    </div>
                  </section>
                )}

                {pendingOffers.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-base font-black" style={{ color: 'rgb(var(--dark))' }}>Buyback Offers</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#059669' }}>{pendingOffers.length}</span>
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
                      <h2 className="text-base font-black" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Completed</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(16, 185, 129, 0.06)', color: '#059669' }}>{completedSubmissions.length}</span>
                    </div>
                    <div className="space-y-3">
                      {completedSubmissions.map(sub => (
                        <JWTSubmissionCard key={sub.id} submission={sub} isExpanded={expandedId === sub.id}
                          onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)} jwtToken={jwtToken} onRefresh={onRefresh} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* ====== MY CARDS TAB ====== */}
        {activeTab === 'cards' && (
          <>
            {allCards.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{
                background: '#FBF7F2',
                border: '1px solid rgba(44,36,22,0.06)',
              }}>
                <Layers className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(44, 36, 22, 0.55)' }} />
                <h3 className="text-lg font-bold mb-2" style={{ color: 'rgb(var(--dark))' }}>No Cards Yet</h3>
                <p className="text-sm" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Cards from your submissions will appear here once assigned.</p>
              </div>
            ) : (
              <>
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.45)' }} />
                  <input type="text" value={cardSearch} onChange={(e) => setCardSearch(e.target.value)}
                    placeholder="Search cards..." className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(44,36,22,0.03)', border: '1px solid rgba(44,36,22,0.06)', outline: 'none', color: 'rgb(var(--dark))' }} />
                </div>

                {/* Stats row */}
                <div className="flex gap-2">
                  {[
                    { label: 'Total', value: allCards.length, color: 'rgba(var(--brand-500), 0.08)', textColor: 'rgb(var(--brand-600))' },
                    { label: 'Graded', value: gradedCards.length, color: 'rgba(16, 185, 129, 0.08)', textColor: '#059669' },
                    { label: 'Pending', value: allCards.length - gradedCards.length, color: 'rgba(245, 158, 11, 0.08)', textColor: '#D97706' },
                  ].map(s => (
                    <div key={s.label} className="flex-1 px-3 py-2 rounded-xl text-center" style={{ background: s.color }}>
                      <p className="text-lg font-black leading-none" style={{ color: s.textColor }}>{s.value}</p>
                      <p className="text-[9px] font-semibold mt-0.5" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Card list */}
                <div className="space-y-2">
                  {filteredCards.map(card => (
                    <CardRow key={card.id} card={card} />
                  ))}
                  {filteredCards.length === 0 && cardSearch && (
                    <p className="text-center text-sm py-8" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>No cards match "{cardSearch}"</p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ====== ASK SAM TAB ====== */}
        {activeTab === 'sam' && hasSAM && (
          <div className="h-[calc(100vh-200px)] min-h-[400px] rounded-2xl overflow-hidden"
            style={{ background: '#FBF7F2', border: '1px solid rgba(44,36,22,0.06)' }}>
            <SAMChatInterface isCustomerPortal={true} jwtToken={jwtToken} />
          </div>
        )}

        {/* ====== SETTINGS TAB ====== */}
        {activeTab === 'settings' && (
          <PortalSettingsTab data={data} jwtToken={jwtToken} onRefresh={onRefresh} onLogout={onLogout} setShowProfile={setShowProfile} />
        )}
      </div>
    </div>
  );
}

// ============================================
// Card Row — individual card in My Cards tab
// ============================================
function CardRow({ card }) {
  const [expanded, setExpanded] = useState(false);
  const hasPhotos = card.before_photos?.length > 0 || card.card_images?.length > 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#FBF7F2', border: '1px solid rgba(44,36,22,0.06)' }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: 'rgb(var(--dark))' }}>
              {card.player_name || card.description || 'Card'}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>
              {[card.year, card.brand, card.card_number ? `#${card.card_number}` : ''].filter(Boolean).join(' \u00B7 ')}
              {card.psa_cert_number && ` \u00B7 Cert ${card.psa_cert_number}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasPhotos && <Camera className="w-3.5 h-3.5" style={{ color: 'rgba(44, 36, 22, 0.55)' }} />}
            {card.grade ? (() => {
              const g = parseFloat(card.grade);
              const gc = g >= 9 ? '#059669' : g >= 7 ? '#2563EB' : '#D97706';
              return (
                <div className="flex flex-col items-center justify-center shrink-0" style={{
                  width: 42, minHeight: 48, borderRadius: 10,
                  background: g >= 9 ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.06))' : g >= 7 ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.04))' : 'rgba(245, 158, 11, 0.08)',
                  border: `1.5px solid ${gc}20`,
                  boxShadow: g >= 9 ? `0 2px 10px ${gc}15` : 'none',
                }}>
                  <span className="text-[7px] font-black tracking-wider" style={{ color: `${gc}80` }}>PSA</span>
                  <span className="text-lg font-black leading-none" style={{ color: gc }}>{card.grade}</span>
                  {g >= 10 && <span className="text-[6px] font-black mt-0.5" style={{ color: gc }}>GEM</span>}
                </div>
              );
            })() : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                <Clock className="w-4 h-4" style={{ color: '#D97706' }} />
              </div>
            )}
            {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.55)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.55)' }} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          {/* Card details */}
          <div className="grid grid-cols-2 gap-2 pt-3">
            {[
              { label: 'Year', value: card.year },
              { label: 'Brand', value: card.brand },
              { label: 'Number', value: card.card_number },
              { label: 'PSA Cert', value: card.psa_cert_number },
              { label: 'Grade', value: card.grade ? `PSA ${card.grade}` : 'Pending' },
              { label: 'Submission', value: card.psa_submission_number || card.internal_id },
            ].filter(d => d.value).map(d => (
              <div key={d.label} className="px-3 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.02)' }}>
                <p className="text-[9px] font-bold uppercase" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>{d.label}</p>
                <p className="text-xs font-bold" style={{ color: 'rgb(var(--dark))' }}>{d.value}</p>
              </div>
            ))}
          </div>

          {/* Before photos */}
          {card.before_photos?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase mb-2" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Before Photos</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {card.before_photos.map((photo, i) => (
                  <img key={i} src={photo.url || photo} alt="" className="w-20 h-28 rounded-lg object-cover shrink-0"
                    style={{ border: '1px solid rgba(0,0,0,0.08)' }} />
                ))}
              </div>
            </div>
          )}

          {/* Card images */}
          {card.card_images?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase mb-2" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Card Images</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {card.card_images.map((img, i) => (
                  <img key={i} src={typeof img === 'string' ? img : img.url} alt="" className="w-20 h-28 rounded-lg object-cover shrink-0"
                    style={{ border: '1px solid rgba(0,0,0,0.08)' }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Portal Settings Tab — profile, PIN, home screen, buyback history
// ============================================
function PortalSettingsTab({ data, jwtToken, onRefresh, onLogout, setShowProfile }) {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsIOS(/iPhone|iPad|iPod/.test(ua) && !window.MSStream);
    setIsAndroid(/Android/.test(ua));
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);
  }, []);

  const allOffers = data.buybackOffers || [];
  const acceptedOffers = allOffers.filter(o => o.status === 'accepted' || o.status === 'paid');
  const totalEarnings = acceptedOffers.reduce((sum, o) => sum + parseFloat(o.offer_price || 0), 0);

  const settingsSections = [
    {
      icon: User,
      title: 'Account',
      desc: `${data.customer.name} \u00B7 ${data.customer.email}`,
      action: () => setShowProfile(true),
      actionLabel: 'Edit Profile',
    },
    {
      icon: Shield,
      title: 'Security PIN',
      desc: data.customer.hasPin ? 'PIN is set for quick access' : 'Set a 4-digit PIN for quick login',
      action: null,
      badge: data.customer.hasPin ? 'Active' : 'Not Set',
      badgeColor: data.customer.hasPin ? '#059669' : '#D97706',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Account settings */}
      {settingsSections.map(section => (
        <div key={section.title} className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: '#FBF7F2', border: '1px solid rgba(44,36,22,0.06)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(var(--brand-500), 0.06)' }}>
            <section.icon className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>{section.title}</p>
            <p className="text-[11px] truncate" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>{section.desc}</p>
          </div>
          {section.action && (
            <button onClick={section.action} className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
              style={{ background: 'rgba(var(--brand-500), 0.06)', color: 'rgb(var(--brand-600))' }}>
              {section.actionLabel}
            </button>
          )}
          {section.badge && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
              style={{ background: `${section.badgeColor}12`, color: section.badgeColor }}>
              {section.badge}
            </span>
          )}
        </div>
      ))}

      {/* Buyback earnings summary */}
      {allOffers.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#FBF7F2', border: '1px solid rgba(44,36,22,0.06)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16, 185, 129, 0.06)' }}>
              <DollarSign className="w-5 h-5" style={{ color: '#059669' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>Buyback Offers</p>
              <p className="text-[11px]" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>{allOffers.length} total offers</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Accepted', value: acceptedOffers.length, color: '#059669' },
              { label: 'Earnings', value: `$${totalEarnings.toFixed(2)}`, color: '#059669' },
              { label: 'Pending', value: allOffers.filter(o => o.status === 'pending').length, color: '#D97706' },
            ].map(s => (
              <div key={s.label} className="flex-1 px-3 py-2 rounded-lg text-center" style={{ background: 'rgba(0,0,0,0.02)' }}>
                <p className="text-sm font-black leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] font-semibold mt-0.5" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add to Home Screen guide */}
      {!isStandalone && (isIOS || isAndroid) && (
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04), rgba(139, 92, 246, 0.03))', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>Install App</p>
              <p className="text-[11px]" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Add to your home screen for quick access</p>
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(99, 102, 241, 0.04)' }}>
            {isIOS ? (
              <ol className="space-y-1.5 text-xs" style={{ color: 'rgba(44, 36, 22, 0.6)' }}>
                <li className="flex items-start gap-2"><span className="font-bold shrink-0" style={{ color: '#6366F1' }}>1.</span>Tap the <strong>Share</strong> button at the bottom of Safari</li>
                <li className="flex items-start gap-2"><span className="font-bold shrink-0" style={{ color: '#6366F1' }}>2.</span>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li className="flex items-start gap-2"><span className="font-bold shrink-0" style={{ color: '#6366F1' }}>3.</span>Tap <strong>"Add"</strong> in the top right</li>
              </ol>
            ) : (
              <ol className="space-y-1.5 text-xs" style={{ color: 'rgba(44, 36, 22, 0.6)' }}>
                <li className="flex items-start gap-2"><span className="font-bold shrink-0" style={{ color: '#6366F1' }}>1.</span>Tap the <strong>three dots</strong> (\u22EE) menu in Chrome</li>
                <li className="flex items-start gap-2"><span className="font-bold shrink-0" style={{ color: '#6366F1' }}>2.</span>Tap <strong>"Add to Home Screen"</strong></li>
                <li className="flex items-start gap-2"><span className="font-bold shrink-0" style={{ color: '#6366F1' }}>3.</span>Tap <strong>"Add"</strong></li>
              </ol>
            )}
          </div>
        </div>
      )}

      {/* Shop info */}
      <div className="rounded-2xl p-4" style={{ background: '#FBF7F2', border: '1px solid rgba(44,36,22,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(var(--brand-500), 0.06)' }}>
            <Store className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>{data.company.name}</p>
            <p className="text-[11px]" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Questions? Contact your shop directly.</p>
          </div>
        </div>
      </div>

      {/* Sign out button */}
      <button onClick={onLogout}
        className="w-full py-3 rounded-xl text-sm font-bold"
        style={{ background: 'rgba(220, 38, 38, 0.06)', color: '#DC2626', border: '1px solid rgba(220, 38, 38, 0.1)' }}>
        Sign Out
      </button>

      <p className="text-center text-[10px] py-4" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Powered by SlabDash</p>
    </div>
  );
}

// ============================================
// Submission card for JWT portal
// ============================================
function JWTSubmissionCard({ submission, isExpanded, onToggle, jwtToken, onRefresh }) {
  const isShipped = submission.shipped;
  const isGradesReady = submission.grades_ready;
  const isProblem = submission.problem_order;
  const isPickedUp = submission.picked_up;
  const hasPickupCode = !!submission.pickup_code;
  const serviceColor = getServiceColor(submission.service_level);
  const cardCount = submission.card_count || submission.cards?.length || 0;
  const gradedCount = submission.cards?.filter(c => c.grade)?.length || 0;

  let statusText = submission.current_step || 'Processing';
  let statusColor = '#D97706';
  let StatusIcon = Clock;
  if (isPickedUp) { statusText = 'Picked Up'; statusColor = '#059669'; StatusIcon = CheckCircle2; }
  else if (hasPickupCode && isGradesReady) { statusText = 'Ready for Pickup'; statusColor = '#7C3AED'; StatusIcon = Key; }
  else if (isShipped) { statusText = 'Shipped'; statusColor = '#059669'; StatusIcon = Truck; }
  else if (isGradesReady) { statusText = 'Grades Ready!'; statusColor = '#2563EB'; StatusIcon = Sparkles; }
  else if (isProblem) { statusText = 'Needs Attention'; statusColor = '#DC2626'; StatusIcon = AlertTriangle; }

  // Encouragement message based on state
  const getEncouragement = () => {
    if (isPickedUp) return null;
    if (isGradesReady) return 'Your grades are in — looking great!';
    if (isShipped) return 'On the way back to you!';
    if (isProblem) return 'Your shop is on it.';
    const est = submission.estimated;
    if (!est) return null;
    if (est.estimatedDaysRemaining <= 3 && est.estimatedProgress > 70) return 'Almost there — finishing up!';
    if (est.estimatedProgress > 50) return 'Past the halfway mark!';
    if (est.daysAtCurrentStep < 1) return 'Just moved to a new step!';
    return null;
  };
  const encouragement = getEncouragement();

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300" style={{
      background: isPickedUp
        ? 'rgba(16, 185, 129, 0.06)'
        : hasPickupCode && !isPickedUp
        ? 'rgba(124, 58, 237, 0.04)'
        : '#FBF7F2',
      border: isProblem ? '1.5px solid rgba(220, 38, 38, 0.2)' : '1px solid rgba(44, 36, 22, 0.06)',
      boxShadow: '0 1px 8px rgba(44, 36, 22, 0.04)',
    }}>
      <button onClick={onToggle} className="w-full text-left p-5">
        {/* Header: Order number + status */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <span className="text-xl font-black tracking-tight" style={{ color: 'rgb(var(--dark))' }}>
              #{submission.psa_submission_number || submission.internal_id || '\u2014'}
            </span>
            <p className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>
              {submission.service_level || 'Standard'} \u00B7 {cardCount} card{cardCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0"
            style={{ background: `${statusColor}0D`, color: statusColor }}>
            <StatusIcon className="w-4 h-4" />
            {statusText}
          </div>
        </div>

        {/* Progress pipeline */}
        <ProgressPipeline currentStep={submission.current_step} shipped={isShipped} pickedUp={isPickedUp} estimated={submission.estimated} />

        {/* Time info: date sent, estimate, encouragement */}
        <div className="mt-3 flex items-center justify-between">
          {submission.date_sent && (
            <p className="text-[10px] font-medium" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>
              Submitted {new Date(submission.date_sent).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {submission.estimated && !isShipped && !isPickedUp && submission.estimated.estimatedDaysRemaining > 0 && (
            <p className="text-xs font-semibold" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>
              {encouragement || `~${submission.estimated.estimatedDaysRemaining} days remaining`}
            </p>
          )}
        </div>
        {submission.estimated?.estimatedCompletionDate && !isShipped && !isPickedUp && submission.estimated.estimatedDaysRemaining > 0 && (
          <p className="text-[10px] font-medium mt-1 text-right" style={{ color: 'rgba(44, 36, 22, 0.35)' }}>
            Est. completion {new Date(submission.estimated.estimatedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}

        {/* Expand indicator */}
        <div className="flex items-center justify-end mt-2">
          <ChevronDown className="w-5 h-5 transition-transform duration-300"
            style={{ color: 'rgba(44, 36, 22, 0.45)', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
        </div>
      </button>

      {/* Pickup Code Banner with QR + Copy */}
      {hasPickupCode && !isPickedUp && (
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden text-center py-6 px-5" style={{
          background: 'rgba(124, 58, 237, 0.06)',
          border: '1.5px solid rgba(124, 58, 237, 0.12)',
        }}>
          <p className="text-xs font-bold mb-3" style={{ color: '#7C3AED' }}>YOUR PICKUP CODE</p>
          <p className="text-4xl font-black tracking-[8px] mb-3" style={{
            color: '#7C3AED',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          }}>
            {submission.pickup_code}
          </p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(submission.pickup_code);
                e.target.textContent = 'Copied!';
                setTimeout(() => { e.target.textContent = 'Copy Code'; }, 2000);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED' }}>
              Copy Code
            </button>
          </div>
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-xl" style={{ background: 'white' }}>
              <QRCodeSVG value={submission.pickup_code} size={120} fgColor="#7C3AED" bgColor="transparent" />
            </div>
          </div>
          <p className="text-xs" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>
            Show this code or scan the QR at the shop
          </p>
        </div>
      )}

      {/* Picked Up Success Banner */}
      {isPickedUp && (
        <div className="mx-5 mb-4 px-4 py-3 rounded-2xl flex items-center gap-3" style={{
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.12)',
        }}>
          <CheckCircle2 className="w-6 h-6 shrink-0" style={{ color: '#059669' }} />
          <p className="text-sm font-bold" style={{ color: '#059669' }}>
            Complete {submission.picked_up_at ? `\u00B7 ${new Date(submission.picked_up_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
          </p>
        </div>
      )}

      {isExpanded && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid rgba(44, 36, 22, 0.05)' }}>

          {/* Activity Timeline — simple, warm */}
          {submission.activity?.length > 0 && (
            <div className="pt-3 space-y-2">
              {submission.activity.slice(0, 4).map((evt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{
                    background: evt.event_type === 'grades_ready' ? '#2563EB' :
                      evt.event_type === 'shipped' ? '#059669' :
                      evt.event_type === 'problem_flagged' ? '#DC2626' :
                      'rgb(var(--brand-500))',
                    opacity: i === 0 ? 1 : 0.4,
                  }} />
                  <p className="text-xs" style={{ color: i === 0 ? 'rgb(var(--dark))' : 'rgba(44, 36, 22, 0.4)' }}>
                    <span className="font-bold">
                      {evt.event_type === 'step_change' ? evt.to_step :
                       evt.event_type === 'grades_ready' ? 'Grades ready' :
                       evt.event_type === 'shipped' ? 'Shipped' :
                       evt.event_type === 'problem_flagged' ? 'Issue flagged' :
                       evt.event_type === 'problem_resolved' ? 'Resolved' :
                       evt.event_type}
                    </span>
                    <span className="font-medium" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>
                      {' \u00B7 '}{new Date(evt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Cards with grade display */}
          {submission.cards?.length > 0 && (
            <div className="space-y-2">
              {submission.cards.map(card => {
                const grade = parseFloat(card.grade);
                const gradeColor = grade >= 9 ? '#059669' : grade >= 7 ? '#2563EB' : grade ? '#D97706' : null;

                return (
                  <div key={card.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(44, 36, 22, 0.03)' }}>
                    {card.before_photos?.[0] && (
                      <img src={card.before_photos[0].url || card.before_photos[0]} alt=""
                        className="w-10 h-14 rounded-lg object-cover shrink-0" style={{ border: '1px solid rgba(44,36,22,0.06)' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: 'rgb(var(--dark))' }}>
                        {card.player_name || card.description || 'Card'}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>
                        {[card.year, card.brand].filter(Boolean).join(' \u00B7 ')}
                      </p>
                    </div>
                    {card.grade ? (
                      <div className="shrink-0 text-center" style={{ minWidth: 40 }}>
                        <p className="text-[8px] font-black" style={{ color: `${gradeColor}80` }}>PSA</p>
                        <p className="text-xl font-black leading-none" style={{ color: gradeColor }}>{card.grade}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tracking info — auto-detect carrier and link */}
          {isShipped && submission.return_tracking && (() => {
            const t = submission.return_tracking.replace(/\s/g, '');
            let carrier = null, trackUrl = null;
            if (/^1Z/i.test(t)) { carrier = 'UPS'; trackUrl = `https://www.ups.com/track?tracknum=${t}`; }
            else if (/^\d{20,22}$/.test(t) || /^(94|93|92|94|95)\d{18,}$/.test(t)) { carrier = 'USPS'; trackUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`; }
            else if (/^\d{12,15}$/.test(t) || /^\d{34}$/.test(t)) { carrier = 'FedEx'; trackUrl = `https://www.fedex.com/fedextrack/?trknbr=${t}`; }
            return (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.04)' }}>
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 shrink-0" style={{ color: '#059669' }} />
                  <div className="flex-1 min-w-0">
                    {carrier && <p className="text-[10px] font-bold mb-0.5" style={{ color: '#059669' }}>{carrier}</p>}
                    <p className="text-sm font-bold truncate" style={{ color: '#059669', fontFamily: 'ui-monospace, monospace' }}>
                      {submission.return_tracking}
                    </p>
                  </div>
                  {trackUrl && (
                    <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}
                      onClick={(e) => e.stopPropagation()}>
                      Track <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Invoice / Payment info */}
          {(submission.invoice_sent || submission.customer_invoice_sent) && submission.customer_cost > 0 && (
            <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--brand-500), 0.04)', border: '1px solid rgba(var(--brand-500), 0.08)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" style={{ color: 'rgb(var(--brand-600))' }} />
                  <span className="text-xs font-bold" style={{ color: 'rgb(var(--brand-600))' }}>INVOICE</span>
                </div>
                {submission.invoice_number && (
                  <span className="text-xs font-semibold" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>
                    {submission.invoice_number}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-black" style={{ color: 'rgb(var(--dark))' }}>
                    ${parseFloat(submission.customer_cost).toFixed(2)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>
                    {submission.invoice_sent_at
                      ? `Invoiced ${new Date(submission.invoice_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : 'Amount due'}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#D97706' }}>
                  Payment Due
                </span>
              </div>
            </div>
          )}

          {/* Problem order details */}
          {isProblem && (
            <div className="p-4 rounded-xl" style={{ background: 'rgba(220, 38, 38, 0.04)', border: '1px solid rgba(220, 38, 38, 0.1)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: '#DC2626' }} />
                <span className="text-xs font-bold" style={{ color: '#DC2626' }}>ISSUE FLAGGED</span>
              </div>
              <p className="text-sm" style={{ color: '#7F1D1D', lineHeight: '1.5' }}>
                PSA has flagged an issue with this submission. Your shop is working on it. This is usually resolved within a few business days.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Buyback card for JWT portal
// ============================================
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
    } catch { console.error('Failed to respond to offer'); }
    setResponding(false);
  };

  return (
    <div className="rounded-2xl p-4" style={{
      background: '#FBF7F2', border: '1px solid rgba(44,36,22,0.06)',
      boxShadow: '0 2px 20px rgba(0,0,0,0.03)',
    }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold truncate" style={{ color: 'rgb(var(--dark))' }}>
            {offer.card_description || offer.player_name || 'Card'}
          </h3>
          <p className="text-xs" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>
            {[offer.card_grade && `PSA ${offer.card_grade}`, offer.psa_cert_number && `Cert #${offer.psa_cert_number}`].filter(Boolean).join(' \u00B7 ')}
          </p>
        </div>
        <p className="text-xl font-black ml-3" style={{ color: '#059669' }}>${parseFloat(offer.offer_price).toFixed(2)}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => handleResponse('accepted')} disabled={responding}
          className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>Accept</button>
        <button onClick={() => handleResponse('rejected')} disabled={responding}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: 'rgba(0,0,0,0.05)', color: 'rgba(44, 36, 22, 0.5)' }}>Decline</button>
      </div>
    </div>
  );
}

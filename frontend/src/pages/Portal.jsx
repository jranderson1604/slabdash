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
  Image as ImageIcon, Upload, User, LogOut, Settings, Plus, Smartphone, Shield, X, Delete
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

  // Don't show if already installed or on desktop
  if (isStandalone || (!isIOS && !isAndroid)) return null;

  return (
    <div className="mx-5 mb-4 rounded-2xl overflow-hidden" style={{
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
              : 'Tap the menu (⋮) then "Add to Home Screen"'}
          </p>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-lg shrink-0" style={{ background: 'rgba(0,0,0,0.04)' }}>
          <X className="w-3.5 h-3.5" style={{ color: 'rgba(44, 36, 22, 0.3)' }} />
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

    if (newPin.length === 4) {
      verifyPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

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
        // Store new token if provided
        if (data.token) {
          localStorage.setItem(STORAGE_KEY, data.token);
        }
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
      <p className="text-sm mb-8" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>{customerName}</p>

      {/* PIN dots */}
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

      {/* Number pad */}
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

      <button onClick={onFallback}
        className="text-xs font-semibold py-2 px-4 rounded-lg"
        style={{ color: 'rgba(44, 36, 22, 0.35)' }}>
        Use password instead
      </button>

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
  const [step, setStep] = useState('enter'); // 'enter' | 'confirm'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit) => {
    const current = step === 'enter' ? pin : confirmPin;
    if (current.length >= 4) return;
    const newVal = current + digit;

    if (step === 'enter') {
      setPin(newVal);
      if (newVal.length === 4) {
        setTimeout(() => setStep('confirm'), 300);
      }
    } else {
      setConfirmPin(newVal);
      if (newVal.length === 4) {
        if (newVal !== pin) {
          setError('PINs don\'t match. Try again.');
          setPin('');
          setConfirmPin('');
          setStep('enter');
        } else {
          submitPin(newVal);
        }
      }
    }
    setError('');
  };

  const handleDelete = () => {
    if (step === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
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
        setPin('');
        setConfirmPin('');
        setStep('enter');
      }
    } catch {
      setError('Failed to set PIN');
    }
    setLoading(false);
  };

  const currentPin = step === 'enter' ? pin : confirmPin;
  const dots = Array.from({ length: 4 }, (_, i) => i < currentPin.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-xs rounded-3xl p-6 text-center"
        style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 25px 80px rgba(0,0,0,0.2)' }}>
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
              style={{
                background: filled ? 'rgb(var(--brand-500))' : 'transparent',
                border: `2px solid ${filled ? 'rgb(var(--brand-500))' : 'rgba(44, 36, 22, 0.15)'}`,
              }} />
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
                style={{ background: 'rgba(0,0,0,0.04)', color: 'rgb(var(--dark))' }}>
                {key}
              </button>
            );
          })}
        </div>

        <button onClick={onSkip}
          className="text-xs font-semibold py-2"
          style={{ color: 'rgba(44, 36, 22, 0.3)' }}>
          Skip for now
        </button>

        {loading && <Loader2 className="w-5 h-5 animate-spin mx-auto mt-2" style={{ color: 'rgb(var(--brand-500))' }} />}
      </div>
    </div>
  );
}

// ============================================
// LOGIN PAGE — 4-digit shop code + sign up / sign in
// ============================================
function PortalLogin({ onLoginSuccess, initialShop }) {
  const [step, setStep] = useState('shop'); // 'shop' | 'signin' | 'signup' | 'forgot'
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

  // Use initialShop from QR code link
  useEffect(() => {
    if (initialShop) {
      setShop(initialShop);
      setShopCode(initialShop.shop_code || initialShop.slug || '');
      setStep('signin');
      return;
    }
    const saved = localStorage.getItem(SHOP_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setShop(parsed);
        setShopCode(parsed.shop_code || parsed.slug || '');
        setStep('signin');
      } catch {}
    }
  }, [initialShop]);

  // Auto-focus first code input
  useEffect(() => {
    if (step === 'shop') {
      setTimeout(() => codeRefs[0].current?.focus(), 100);
    }
  }, [step]);

  const handleCodeInput = (index, value) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = shopCode.split('');
    newCode[index] = digit;
    const code = newCode.join('');
    setShopCode(code);
    setError('');

    if (digit && index < 3) {
      codeRefs[index + 1].current?.focus();
    }

    // Auto-submit when 4 digits entered
    if (code.length === 4 && /^\d{4}$/.test(code)) {
      lookupShop(code);
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !shopCode[index] && index > 0) {
      codeRefs[index - 1].current?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setShopCode(pasted);
      codeRefs[3].current?.focus();
      lookupShop(pasted);
    }
  };

  const lookupShop = async (code) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/shop-lookup/${encodeURIComponent(code)}`);
      if (!res.ok) {
        setError('Shop not found. Check the code and try again.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setShop(data);
      localStorage.setItem(SHOP_KEY, JSON.stringify(data));
      setStep('signin');
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopCode: shop.shop_code || shop.slug, email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'NO_PASSWORD') {
          setError('No account found. Please create one first.');
          setStep('signup');
        } else {
          setError(data.error || 'Sign in failed');
        }
        setLoading(false);
        return;
      }
      localStorage.setItem(STORAGE_KEY, data.token);
      localStorage.setItem(SHOP_KEY, JSON.stringify(data.company));
      onLoginSuccess(data.token, data.customer);
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopCode: shop.shop_code || shop.slug,
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError('Account already exists. Please sign in instead.');
          setStep('signin');
        } else {
          setError(data.error || 'Registration failed');
        }
        setLoading(false);
        return;
      }
      localStorage.setItem(STORAGE_KEY, data.token);
      localStorage.setItem(SHOP_KEY, JSON.stringify(data.company));
      onLoginSuccess(data.token, data.customer, true); // isNewAccount = true
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopCode: shop.shop_code || shop.slug, email: email.trim() }),
      });
      const data = await res.json();
      setSuccess(data.message);
    } catch {
      setSuccess('If your email is registered, you will receive a password reset link.');
    }
    setLoading(false);
  };

  const changeShop = () => {
    setShop(null);
    setShopCode('');
    setStep('shop');
    setError('');
    setSuccess('');
    localStorage.removeItem(SHOP_KEY);
  };

  const inputStyle = {
    background: 'rgba(0,0,0,0.03)',
    border: '1px solid rgba(0,0,0,0.08)',
    outline: 'none',
    color: 'rgb(var(--dark))',
  };

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
          <p className="text-sm mb-8" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>
            Ask your card shop for their 4-digit code
          </p>

          <div className="flex gap-3 justify-center mb-6" onPaste={handleCodePaste}>
            {[0,1,2,3].map(i => (
              <input
                key={i}
                ref={codeRefs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={shopCode[i] || ''}
                onChange={(e) => handleCodeInput(i, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                className="w-16 h-20 rounded-2xl text-center text-3xl font-black focus:ring-2 transition-all"
                style={{
                  ...inputStyle,
                  background: shopCode[i] ? 'rgba(var(--brand-500), 0.05)' : 'rgba(0,0,0,0.03)',
                  borderColor: shopCode[i] ? 'rgba(var(--brand-500), 0.2)' : 'rgba(0,0,0,0.08)',
                }}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 justify-center mb-4 text-xs font-semibold" style={{ color: '#DC2626' }}>
              <AlertTriangle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 justify-center mb-4">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--brand-500))' }} />
              <span className="text-sm font-semibold" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>Looking up shop...</span>
            </div>
          )}

          <p className="text-[11px] mt-8" style={{ color: 'rgba(44, 36, 22, 0.25)' }}>
            The code is on your receipt or the QR poster in-store
          </p>
        </div>
      </div>
    );
  }

  // ---- Sign In / Sign Up / Forgot Password ----
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(180deg, rgb(var(--bg-color)) 0%, rgba(var(--bg-color), 0.95) 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Shop header */}
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
          <button onClick={changeShop}
            className="text-[11px] font-semibold mt-1 flex items-center gap-1 mx-auto"
            style={{ color: 'rgba(44, 36, 22, 0.3)' }}>
            <ArrowLeft className="w-3 h-3" /> Different shop
          </button>
        </div>

        {/* Tab toggle: Sign In / Create Account */}
        {step !== 'forgot' && (
          <div className="flex rounded-xl mb-6 p-1" style={{ background: 'rgba(0,0,0,0.04)' }}>
            <button onClick={() => { setStep('signin'); setError(''); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: step === 'signin' ? 'white' : 'transparent',
                color: step === 'signin' ? 'rgb(var(--dark))' : 'rgba(44, 36, 22, 0.35)',
                boxShadow: step === 'signin' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              }}>
              Sign In
            </button>
            <button onClick={() => { setStep('signup'); setError(''); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: step === 'signup' ? 'white' : 'transparent',
                color: step === 'signup' ? 'rgb(var(--dark))' : 'rgba(44, 36, 22, 0.35)',
                boxShadow: step === 'signup' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              }}>
              Create Account
            </button>
          </div>
        )}

        {/* Forgot Password form */}
        {step === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-center mb-4">
              <KeyRound className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(44, 36, 22, 0.2)' }} />
              <h3 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>Reset Password</h3>
              <p className="text-xs mt-1" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm" style={inputStyle} />
            </div>

            {error && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
            {success && (
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#059669' }} />
                <p className="text-xs" style={{ color: '#059669' }}>{success}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Reset Link'}
            </button>

            <button type="button" onClick={() => { setStep('signin'); setError(''); setSuccess(''); }}
              className="w-full text-xs font-semibold py-2" style={{ color: 'rgba(44, 36, 22, 0.35)' }}>
              Back to sign in
            </button>
          </form>
        )}

        {/* Sign In form */}
        {step === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" required autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm" style={inputStyle} />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" required autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 rounded-xl text-sm" style={inputStyle} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} /> : <Eye className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />}
              </button>
            </div>

            {error && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sign In'}
            </button>

            <button type="button" onClick={() => { setStep('forgot'); setError(''); }}
              className="w-full text-xs font-semibold py-1" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>
              Forgot password?
            </button>
          </form>
        )}

        {/* Sign Up form */}
        {step === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Full name" required autoComplete="name"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm" style={inputStyle} />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" required autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm" style={inputStyle} />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (8+ chars, letters & numbers)" required autoComplete="new-password"
                className="w-full pl-10 pr-10 py-3 rounded-xl text-sm" style={inputStyle} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} /> : <Eye className="w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.25)' }} />}
              </button>
            </div>

            <p className="text-[10px] px-1" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>
              If your shop already has your email on file, your account will be linked automatically.
            </p>

            {error && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Account'}
            </button>
          </form>
        )}

        <p className="text-center text-[10px] mt-6" style={{ color: 'rgba(44, 36, 22, 0.2)' }}>
          Powered by SlabDash
        </p>
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

  const [mode, setMode] = useState('loading'); // 'loading' | 'login' | 'portal-token' | 'portal-jwt' | 'pin'
  const [jwtToken, setJwtToken] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [initialShop, setInitialShop] = useState(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showHomeScreenBanner, setShowHomeScreenBanner] = useState(false);

  useEffect(() => {
    if (magicToken) {
      fetch(`${API_URL}/portal/access?token=${magicToken}`)
        .then(res => {
          if (res.ok) {
            setMode('portal-token');
          } else {
            checkJwt();
          }
        })
        .catch(() => checkJwt());
    } else {
      checkJwt();
    }
  }, [magicToken]);

  // Auto-lookup shop from ?shop= query param (for QR code links)
  useEffect(() => {
    if (shopParam && !magicToken) {
      fetch(`${API_URL}/portal/auth/shop-lookup/${encodeURIComponent(shopParam.toLowerCase())}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setInitialShop(data);
            localStorage.setItem(SHOP_KEY, JSON.stringify(data));
          }
        })
        .catch(() => {});
    }
  }, [shopParam]);

  const checkJwt = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      fetch(`${API_URL}/portal/me`, {
        headers: { Authorization: `Bearer ${saved}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('invalid');
        })
        .then(data => {
          setJwtToken(saved);
          setCustomerInfo(data.customer);

          // Check if PIN is set and needs verification
          const lastVerified = parseInt(localStorage.getItem(PIN_LAST_VERIFIED) || '0');
          const fiveMinutes = 5 * 60 * 1000;
          const needsPin = data.customer?.hasPin && (Date.now() - lastVerified > fiveMinutes);

          if (needsPin) {
            setMode('pin');
          } else {
            setMode('portal-jwt');
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

  const handleLoginSuccess = (token, customer, isNewAccount = false) => {
    setJwtToken(token);
    setCustomerInfo(customer);
    setMode('portal-jwt');
    localStorage.setItem(PIN_LAST_VERIFIED, Date.now().toString());

    // Show PIN setup for new accounts or first-time logins
    if (isNewAccount || !customer?.hasPin) {
      setTimeout(() => setShowPinSetup(true), 1500);
    }

    // Show home screen banner on mobile
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (!isStandalone) {
      setShowHomeScreenBanner(true);
    }
  };

  const handlePinVerified = (newToken) => {
    setJwtToken(newToken || jwtToken);
    setMode('portal-jwt');
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PIN_LAST_VERIFIED);
    setJwtToken(null);
    setCustomerInfo(null);
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

  // PIN entry
  if (mode === 'pin') {
    return (
      <PINScreen
        jwtToken={jwtToken}
        customerName={customerInfo?.name || ''}
        onVerified={handlePinVerified}
        onFallback={() => { handleLogout(); }}
      />
    );
  }

  // Login page
  if (mode === 'login') {
    return <PortalLogin onLoginSuccess={handleLoginSuccess} initialShop={initialShop} />;
  }

  // Portal via magic link token
  if (mode === 'portal-token' && magicToken) {
    return <CustomerPortal />;
  }

  // Portal via JWT
  if (mode === 'portal-jwt' && jwtToken) {
    return (
      <>
        {showPinSetup && (
          <PINSetupPrompt
            jwtToken={jwtToken}
            onComplete={() => setShowPinSetup(false)}
            onSkip={() => setShowPinSetup(false)}
          />
        )}
        <CustomerPortalJWT
          jwtToken={jwtToken}
          onLogout={handleLogout}
          showHomeScreenBanner={showHomeScreenBanner}
          onDismissHomeBanner={() => setShowHomeScreenBanner(false)}
        />
      </>
    );
  }

  return <PortalLogin onLoginSuccess={handleLoginSuccess} initialShop={initialShop} />;
}

// ============================================
// JWT-BASED PORTAL — loads data via JWT auth instead of magic link token
// ============================================
function CustomerPortalJWT({ jwtToken, onLogout, showHomeScreenBanner, onDismissHomeBanner }) {
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

  return <JWTPortalView data={data} jwtToken={jwtToken} onLogout={onLogout} onRefresh={loadData}
    showProfile={showProfile} setShowProfile={setShowProfile}
    showHomeScreenBanner={showHomeScreenBanner} onDismissHomeBanner={onDismissHomeBanner} />;
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

function JWTPortalView({ data, jwtToken, onLogout, onRefresh, showProfile, setShowProfile, showHomeScreenBanner, onDismissHomeBanner }) {
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

      {/* Add to Home Screen Banner */}
      {showHomeScreenBanner && (
        <div className="max-w-2xl mx-auto pt-4">
          <AddToHomeScreenBanner onDismiss={onDismissHomeBanner} />
        </div>
      )}

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

// Simplified submission card for JWT portal
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

import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function VerifyAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | already | expired | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please use the link from your email.');
      return;
    }

    fetch(`${API_URL}/auth/verify-account/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setStatus(data.already ? 'already' : 'success');
          setMessage(data.message);
        } else if (res.status === 410) {
          setStatus('expired');
          setMessage(data.error || 'Verification link has expired.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may be invalid.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Connection error. Please try again.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'linear-gradient(180deg, #FBF7F2 0%, #FFF8F0 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/images/logo-full.png.svg" alt="SlabDash" className="h-14 w-auto" />
          </Link>
        </div>

        <div className="rounded-3xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.07)', boxShadow: '0 8px 40px rgba(44,36,22,0.07)' }}>
          <div style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', padding: '32px 32px 28px' }}>
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6 text-white opacity-80" />
              <h1 className="text-xl font-black text-white">Account Verification</h1>
            </div>
          </div>

          <div className="p-8 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#FF8170' }} />
                <p className="text-sm font-semibold" style={{ color: 'rgba(44,36,22,0.5)' }}>Verifying your account...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <CheckCircle2 className="w-9 h-9 text-green-500" />
                </div>
                <h2 className="text-xl font-black mb-2" style={{ color: '#2C2416' }}>Account verified!</h2>
                <p className="text-sm mb-6" style={{ color: 'rgba(44,36,22,0.55)' }}>
                  {message || "Your email is confirmed. You can now log in to SlabDash."}
                </p>
                <Link to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', boxShadow: '0 4px 16px rgba(255,107,89,0.3)' }}>
                  Log in to SlabDash <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}

            {status === 'already' && (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(255,129,112,0.1)' }}>
                  <CheckCircle2 className="w-9 h-9" style={{ color: '#FF8170' }} />
                </div>
                <h2 className="text-xl font-black mb-2" style={{ color: '#2C2416' }}>Already verified</h2>
                <p className="text-sm mb-6" style={{ color: 'rgba(44,36,22,0.55)' }}>
                  Your account is already active. Go ahead and log in.
                </p>
                <Link to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', boxShadow: '0 4px 16px rgba(255,107,89,0.3)' }}>
                  Log in <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}

            {status === 'expired' && (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(251,191,36,0.1)' }}>
                  <XCircle className="w-9 h-9 text-amber-500" />
                </div>
                <h2 className="text-xl font-black mb-2" style={{ color: '#2C2416' }}>Link expired</h2>
                <p className="text-sm mb-6" style={{ color: 'rgba(44,36,22,0.55)' }}>
                  This verification link has expired. Log in to request a new one.
                </p>
                <Link to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: 'rgba(44,36,22,0.05)', color: '#2C2416' }}>
                  Go to login
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(239,68,68,0.08)' }}>
                  <XCircle className="w-9 h-9 text-red-400" />
                </div>
                <h2 className="text-xl font-black mb-2" style={{ color: '#2C2416' }}>Link invalid</h2>
                <p className="text-sm mb-6" style={{ color: 'rgba(44,36,22,0.55)' }}>{message}</p>
                <Link to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: 'rgba(44,36,22,0.05)', color: '#2C2416' }}>
                  Back to login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

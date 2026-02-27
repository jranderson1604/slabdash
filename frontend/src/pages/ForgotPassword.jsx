import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await res.json();
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--bg-color))' }}
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl -translate-y-1/3 translate-x-1/4"
        style={{ background: 'rgba(255, 129, 112, 0.12)' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"
        style={{ background: 'rgba(255, 185, 160, 0.1)' }} />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/images/logo-full.png.svg" alt="SlabDash" className="h-14 mx-auto" />
        </div>

        <div className="p-6 sm:p-8 rounded-2xl scale-in"
          style={{
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
        >
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-body)' }}>Check your inbox</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                If that email is registered, you'll receive a reset link shortly. Check your spam folder if you don't see it.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-body)' }}>Forgot your password?</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="rounded-xl p-3 mb-4 text-sm font-medium"
                  style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#DC2626' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="label block mb-1.5">Email address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@cardshop.com"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="btn btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Mail className="w-4 h-4" /> Send reset link</>}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm font-medium flex items-center justify-center gap-1.5 transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

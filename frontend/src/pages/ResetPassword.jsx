import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Invalid reset link. Request a new one.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
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
          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-body)' }}>Password reset!</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Redirecting you to login...
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-body)' }}>Set a new password</h2>

              {error && (
                <div className="rounded-xl p-3 mb-4 flex items-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#DC2626' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="label block mb-1.5">New password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="label block mb-1.5">Confirm password</label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" disabled={loading || !token}
                  className="btn btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Reset password <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

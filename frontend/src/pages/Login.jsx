import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--bg-color))' }}
    >
      {/* Background decorative blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl -translate-y-1/3 translate-x-1/4"
        style={{ background: 'rgba(255, 129, 112, 0.12)' }}
      />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"
        style={{ background: 'rgba(255, 185, 160, 0.1)' }}
      />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'rgba(255, 216, 196, 0.08)' }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo + tagline */}
        <div className="text-center mb-8">
          <img
            src="/images/logo-full.png.svg"
            alt="SlabDash"
            className="h-14 mx-auto"
          />
          <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            PSA Submission Tracking for Card Shops
          </p>
        </div>

        {/* Login card */}
        <div className="p-6 sm:p-8 rounded-2xl scale-in"
          style={{
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-body)' }}>
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl p-3 flex items-center gap-2 text-sm font-medium"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#DC2626',
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label block mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@cardshop.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label block mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Register link */}
        <div className="mt-6 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            New to SlabDash?{' '}
            <Link
              to="/register"
              className="font-semibold transition-colors"
              style={{ color: '#FC7B62' }}
              onMouseEnter={(e) => e.target.style.color = '#e8634c'}
              onMouseLeave={(e) => e.target.style.color = '#FC7B62'}
            >
              Create an account
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Track submissions in real-time. Give customers visibility into their orders.
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
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

      <div className="relative sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* SlabDash Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/images/logo-full.png.svg"
            alt="SlabDash"
            className="h-80 w-full"
          />
        </div>
        <h2 className="mt-4 text-center text-xl font-semibold" style={{ color: 'rgba(44, 36, 22, 0.6)' }}>
          PSA Submission Tracking for Card Shops
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative">
        {/* Liquid glass login card */}
        <div className="py-8 px-4 sm:px-10 rounded-3xl scale-in"
          style={{
            background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-2xl p-3 flex items-center gap-2 text-sm font-medium"
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
              className="btn btn-primary w-full flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 font-medium" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  color: 'rgba(44, 36, 22, 0.45)',
                }}>New to SlabDash?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="btn btn-secondary w-full flex items-center justify-center"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm font-medium" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>
          Track your PSA submissions in real-time.
          <br />
          Give customers visibility into their orders.
        </p>
      </div>
    </div>
  );
}

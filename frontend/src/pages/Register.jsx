import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;
  const passwordValid = formData.password.length >= 8 && /[a-zA-Z]/.test(formData.password) && /[0-9]/.test(formData.password);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await register({
        companyName: formData.companyName,
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Track unlimited PSA submissions',
    'Real-time status updates via PSA API',
    'Customer portal for order tracking',
    'Auto-refresh every 6 hours',
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
        style={{ background: 'rgba(255, 129, 112, 0.08)' }}
      />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-3xl"
        style={{ background: 'rgba(255, 185, 160, 0.06)' }}
      />

      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 relative">
        <div className="mx-auto w-full max-w-lg">
          {/* SlabDash Logo */}
          <div className="mb-8">
            <img
              src="/images/logo-full.png.svg"
              alt="SlabDash"
              className="h-20 w-auto max-w-full"
            />
          </div>

          <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--dark))' }}>Create your account</h2>
          <p className="mt-2 font-medium" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>Start tracking PSA submissions today</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              <label htmlFor="companyName" className="label block mb-1.5">
                Shop / Business Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={handleChange}
                className="input"
                placeholder="Ace Card Shop"
              />
            </div>

            <div>
              <label htmlFor="name" className="label block mb-1.5">
                Your Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label htmlFor="email" className="label block mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="you@cardshop.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`input pr-12 ${formData.password.length > 0 && !passwordValid ? 'border-red-300' : formData.password.length > 0 && passwordValid ? 'border-green-400' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formData.password.length > 0 && !passwordValid && (
                <p className="text-xs text-red-500 mt-1">Min 8 characters, at least one letter and one number</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label block mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input pr-12 ${passwordsMismatch ? 'border-red-300' : passwordsMatch ? 'border-green-400' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordsMismatch && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Passwords do not match
                </p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || passwordsMismatch}
              className="btn btn-primary w-full flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-medium" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-bold" style={{ color: 'rgb(var(--brand-600))' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Features (hidden on mobile) - Liquid glass panel */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center p-12 relative">
        <div className="rounded-3xl p-10 max-w-md w-full slide-up"
          style={{
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
        >
          <h3 className="text-2xl font-bold mb-6" style={{ color: 'rgb(var(--dark))' }}>
            Everything you need to manage PSA submissions
          </h3>
          <ul className="space-y-4">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3 font-medium" style={{ color: 'rgba(44, 36, 22, 0.7)' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-10 p-5 rounded-2xl"
            style={{
              background: 'rgba(255, 129, 112, 0.06)',
              border: '1px solid rgba(255, 129, 112, 0.1)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'rgba(44, 36, 22, 0.6)' }}>
              "SlabDash has transformed how we track submissions. Our customers love being able to check their order status anytime."
            </p>
            <p className="mt-3 font-bold text-sm" style={{ color: 'rgb(var(--dark))' }}>-- Card Shop Owner</p>
          </div>
        </div>
      </div>
    </div>
  );
}

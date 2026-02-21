import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SAMAssistant from './SAMAssistant';
import {
  LayoutDashboard,
  Package,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Zap,
  Upload,
  DollarSign,
  Shield,
  HelpCircle,
  Mail,
  Brain,
  Clock,
  AlertTriangle,
  Crown,
} from 'lucide-react';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, company, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Trial status
  const trialEndsAt = company?.trial_ends_at ? new Date(company.trial_ends_at) : null;
  const now = new Date();
  const isFree = !company?.plan || company.plan === 'free';
  const trialExpired = isFree && trialEndsAt && now > trialEndsAt;
  const daysLeft = trialEndsAt ? Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)) : null;
  const showTrialBanner = isFree && !trialExpired && daysLeft !== null && daysLeft <= 10;
  // Allow access to settings and help even when trial is expired
  const trialAllowedPaths = ['/settings', '/help'];
  const blockedByTrial = trialExpired && !trialAllowedPaths.some(p => location.pathname.startsWith(p));

  // Owner-only navigation (shown at top with purple styling)
  const ownerNavigation = [
    { name: 'Platform Control', href: '/owner', icon: Shield },
  ];

  // Build regular navigation based on user role
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'SAM AI', href: '/sam', icon: Brain, highlight: true },
    { name: 'Submissions', href: '/submissions', icon: Package },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Cards', href: '/cards', icon: CreditCard },
    { name: 'Import CSV', href: '/import', icon: Upload },
    { name: 'Buyback Offers', href: '/buyback', icon: DollarSign },
    { name: 'Email', href: '/email-settings', icon: Mail },
    { name: 'Help', href: '/help', icon: HelpCircle },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: `rgb(var(--bg-color))` }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Dark glass */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(44, 36, 22, 0.97) 0%, rgba(35, 28, 16, 0.99) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 248, 240, 0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center px-2 h-16 relative" style={{ borderBottom: '1px solid rgba(255, 248, 240, 0.08)' }}>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 lg:hidden z-10"
            style={{ color: 'rgba(255, 248, 240, 0.5)' }}
          >
            <X className="w-6 h-6" />
          </button>
          <Link to="/dashboard" className="flex items-center justify-center w-full">
            <img
              src="/images/logo-icon.png.svg"
              alt="SlabDash"
              className="h-12 w-12 object-contain"
              style={{ filter: 'brightness(1.1) drop-shadow(0 0 12px rgba(255, 129, 112, 0.4))' }}
            />
          </Link>
        </div>

        {/* Company name */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255, 248, 240, 0.08)' }}>
          <p className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'rgba(255, 185, 160, 0.6)' }}>Shop</p>
          <p className="text-sm font-semibold truncate" style={{ color: 'rgba(255, 248, 240, 0.9)' }}>{company?.name || 'Loading...'}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {/* Owner-only navigation */}
          {user?.role === 'owner' && ownerNavigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(139, 92, 246, 0.3))',
                  color: '#E9D5FF',
                  boxShadow: '0 2px 12px rgba(168, 85, 247, 0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                } : {
                  color: 'rgba(216, 180, 254, 0.8)',
                  border: '1px solid rgba(168, 85, 247, 0.15)',
                }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="slabdash-label">{item.name}</span>
              </Link>
            );
          })}

          {/* Owner separator */}
          {user?.role === 'owner' && (
            <div className="my-2" style={{ borderTop: '1px solid rgba(255, 248, 240, 0.06)' }} />
          )}

          {/* Regular navigation */}
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/' && location.pathname.startsWith(item.href));

            // Special styling for SAM AI (highlighted) with glow effects
            if (item.highlight) {
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden"
                  style={isActive ? {
                    background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.5), rgba(255, 107, 89, 0.4))',
                    color: '#FFF8F0',
                    boxShadow: '0 4px 20px rgba(255, 107, 89, 0.3), 0 0 30px rgba(255, 107, 89, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255, 129, 112, 0.3)',
                    transform: 'scale(1.02)',
                  } : {
                    background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.2), rgba(255, 107, 89, 0.15))',
                    color: 'rgba(255, 216, 196, 0.95)',
                    boxShadow: '0 2px 8px rgba(255, 107, 89, 0.1)',
                    border: '1px solid rgba(255, 129, 112, 0.12)',
                  }}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0 nav-icon-glow" />
                  <span className="slabdash-label font-bold">{item.name}</span>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                    background: 'rgba(255, 248, 240, 0.15)',
                    color: 'rgba(255, 248, 240, 0.8)',
                    boxShadow: '0 0 8px rgba(255, 129, 112, 0.3)',
                  }}>AI</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.35), rgba(255, 107, 89, 0.25))',
                  color: '#FFF8F0',
                  boxShadow: '0 2px 12px rgba(255, 107, 89, 0.15), 0 0 20px rgba(255, 107, 89, 0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
                } : {
                  color: 'rgba(255, 248, 240, 0.75)',
                }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(255, 129, 112, 0.6))' } : {}} />
                <span className="slabdash-label">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* PSA Status */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255, 248, 240, 0.08)' }}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${company?.hasPsaKey ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ boxShadow: company?.hasPsaKey ? '0 0 6px rgba(52, 211, 153, 0.4)' : '0 0 6px rgba(251, 191, 36, 0.4)' }}
            />
            <span className="text-xs font-medium" style={{ color: 'rgba(255, 248, 240, 0.6)' }}>
              PSA API: {company?.hasPsaKey ? 'Connected' : 'Not configured'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header - hidden on SAM page */}
        {location.pathname !== '/sam' && (
        <header className="relative z-30" style={{
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 1px 8px rgba(0, 0, 0, 0.03)',
        }}>
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-xl p-2 transition-colors"
              style={{ color: 'rgb(var(--dark))' }}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page title (shows on desktop) */}
            <div className="hidden lg:block">
              <h1 className="text-lg font-bold tracking-tight" style={{ color: 'rgb(var(--dark))', letterSpacing: '-0.02em' }}>
                {navigation.find(n =>
                  n.href === location.pathname ||
                  (n.href !== '/dashboard' && n.href !== '/' && location.pathname.startsWith(n.href))
                )?.name || ownerNavigation.find(n =>
                  n.href === location.pathname ||
                  location.pathname.startsWith(n.href)
                )?.name || 'Dashboard'}
              </h1>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: 'rgb(var(--dark))' }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgb(var(--brand-500)), rgb(var(--brand-600)))',
                      color: '#FFF8F0',
                      boxShadow: '0 2px 8px rgba(255, 107, 89, 0.25)',
                    }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block font-semibold">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[60]"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-[70] mt-2 w-48 rounded-2xl py-1 fade-in"
                      style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>{user?.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(44, 36, 22, 0.7)' }}>{user?.email}</p>
                      </div>
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm font-medium transition-colors"
                        style={{ color: 'rgb(var(--dark))' }}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
                        style={{ color: '#C74430' }}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        )}

        {/* Trial countdown banner */}
        {showTrialBanner && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6 rounded-2xl overflow-hidden"
            style={{
              background: daysLeft <= 3
                ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.08))'
                : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))',
              border: daysLeft <= 3 ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(245,158,11,0.25)',
            }}
          >
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 flex-shrink-0" style={{ color: daysLeft <= 3 ? '#dc2626' : '#d97706' }} />
                <span className="text-sm font-semibold" style={{ color: daysLeft <= 3 ? '#991b1b' : '#92400e' }}>
                  {daysLeft <= 0
                    ? 'Your free trial ends today'
                    : daysLeft === 1
                    ? '1 day left in your free trial'
                    : `${daysLeft} days left in your free trial`}
                  {' '}— upgrade to keep access after your trial ends.
                </span>
              </div>
              <Link
                to="/settings?tab=billing"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                style={{ background: daysLeft <= 3 ? '#dc2626' : '#d97706' }}
              >
                <Crown className="w-3.5 h-3.5" />
                Upgrade
              </Link>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className={location.pathname === '/sam' ? '' : 'p-4 sm:p-6 lg:p-8'}>
          {blockedByTrial ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md mx-auto p-8 card">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-black mb-2" style={{ color: 'rgb(var(--dark))' }}>Your trial has ended</h2>
                <p className="text-sm mb-6" style={{ color: 'rgba(44,36,22,0.6)' }}>
                  Your 14-day free trial has expired. Upgrade to keep your submissions, customers, and cards — nothing is deleted.
                </p>
                <Link
                  to="/settings?tab=billing"
                  className="btn btn-primary gap-2 mx-auto inline-flex"
                >
                  <Crown className="w-4 h-4" />
                  View Plans & Upgrade
                </Link>
                <p className="text-xs mt-4" style={{ color: 'rgba(44,36,22,0.4)' }}>
                  Need help? Visit the{' '}
                  <Link to="/help" className="underline">Help page</Link>.
                </p>
              </div>
            </div>
          ) : children}
        </main>
      </div>

      {/* SAM AI Assistant - floating button on all pages */}
      <SAMAssistant />
    </div>
  );
}

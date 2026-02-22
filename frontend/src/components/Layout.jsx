import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SAMAssistant from './SAMAssistant';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
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
  BarChart2,
  Moon,
  Sun,
} from 'lucide-react';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('slabdash-dark') !== 'false');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { user, company, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('slabdash-dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('slabdash-dark', 'false');
    }
  }, [darkMode]);

  // Keyboard shortcuts — two-key sequences (g+d, n+s, etc.)
  useEffect(() => {
    let pending = null;
    let timer = null;
    const ROUTES = {
      'd': '/dashboard', 's': '/submissions', 'c': '/customers',
      'k': '/cards', 'a': '/analytics', 'i': '/import', 'e': '/email-settings',
      ',': '/settings',
    };
    const handle = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || document.activeElement?.isContentEditable) return;
      if (e.key === 'Escape') { setShowShortcuts(false); return; }
      if (e.key === '?') { setShowShortcuts(s => !s); return; }
      clearTimeout(timer);
      if (!pending) {
        pending = e.key.toLowerCase();
        timer = setTimeout(() => { pending = null; }, 1000);
      } else {
        const seq = pending + e.key.toLowerCase();
        pending = null;
        if (seq[0] === 'g' && ROUTES[seq[1]]) navigate(ROUTES[seq[1]]);
        if (seq === 'ns') navigate('/submissions/new');
        if (seq === 'nc') navigate('/customers/new');
      }
    };
    window.addEventListener('keydown', handle);
    return () => { window.removeEventListener('keydown', handle); clearTimeout(timer); };
  }, [navigate]);

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
    { name: 'Analytics', href: '/analytics', icon: BarChart2 },
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
          background: 'linear-gradient(180deg, rgba(2, 6, 14, 0.98) 0%, rgba(1, 4, 10, 0.99) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,129,112,0.08)',
          boxShadow: 'inset -1px 0 0 rgba(255,129,112,0.04)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 relative" style={{ borderBottom: '1px solid rgba(255,129,112,0.08)' }}>
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <img
              src="/images/logo-icon.png.svg"
              alt="SlabDash"
              className="h-9 w-9 object-contain arc-pulse-anim"
              style={{ filter: 'brightness(1.05) drop-shadow(0 0 8px rgba(255,129,112,0.5))' }}
            />
            <div>
              <p className="text-xs font-black tracking-[0.15em] uppercase" style={{ color: '#FF8170', textShadow: '0 0 10px rgba(255,129,112,0.5)' }}>SLABDASH</p>
              <p className="text-[9px] uppercase tracking-[0.1em]" style={{ color: 'rgba(255,129,112,0.4)' }}>Card Grading Tracker</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            style={{ color: 'rgba(255,129,112,0.5)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Company name — OPERATOR ID */}
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,129,112,0.06)' }}>
          <p className="text-[9px] uppercase tracking-[0.15em] font-bold" style={{ color: 'rgba(255,129,112,0.4)' }}>SHOP</p>
          <p className="text-sm font-bold truncate" style={{ color: 'rgba(255,129,112,0.9)' }}>{company?.name || 'Loading...'}</p>
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
                  background: 'linear-gradient(135deg, rgba(255,129,112,0.2), rgba(255,107,89,0.15))',
                  color: '#FF8170',
                  boxShadow: '0 2px 12px rgba(255,129,112,0.15), inset 0 1px 0 rgba(255,129,112,0.08)',
                  border: '1px solid rgba(255,129,112,0.25)',
                } : {
                  color: 'rgba(255,129,112,0.6)',
                  border: '1px solid rgba(255,129,112,0.12)',
                }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="slabdash-label">{item.name}</span>
              </Link>
            );
          })}

          {/* Owner separator */}
          {user?.role === 'owner' && (
            <div className="my-2" style={{ borderTop: '1px solid rgba(255,129,112,0.06)' }} />
          )}

          {/* Regular navigation */}
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/' && location.pathname.startsWith(item.href));

            // Special styling for SAM AI (highlighted) with glow
            if (item.highlight) {
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden stark-scanline"
                  style={isActive ? {
                    background: 'linear-gradient(135deg, rgba(255,129,112,0.2), rgba(255,107,89,0.15))',
                    color: '#FF8170',
                    boxShadow: '0 4px 20px rgba(255,129,112,0.2), 0 0 30px rgba(255,129,112,0.1), inset 0 1px 0 rgba(255,129,112,0.1)',
                    border: '1px solid rgba(255,129,112,0.35)',
                  } : {
                    background: 'linear-gradient(135deg, rgba(255,129,112,0.08), rgba(255,107,89,0.05))',
                    color: 'rgba(255,129,112,0.85)',
                    boxShadow: '0 2px 8px rgba(255,129,112,0.08)',
                    border: '1px solid rgba(255,129,112,0.15)',
                  }}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(255,129,112,0.7))' }} />
                  <span className="slabdash-label font-bold" style={{ letterSpacing: '0.12em' }}>SAM AI</span>
                  <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-sm" style={{
                    background: 'rgba(255,129,112,0.15)',
                    color: '#FF8170',
                    border: '1px solid rgba(255,129,112,0.2)',
                    letterSpacing: '0.1em',
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
                  background: 'linear-gradient(135deg, rgba(255,129,112,0.15), rgba(255,107,89,0.1))',
                  color: '#FF8170',
                  boxShadow: '0 2px 12px rgba(255,129,112,0.12), inset 0 1px 0 rgba(255,129,112,0.06)',
                  borderLeft: '2px solid rgba(255,129,112,0.5)',
                  paddingLeft: '10px',
                } : {
                  color: 'rgba(255,129,112,0.5)',
                }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" style={isActive ? { filter: 'drop-shadow(0 0 5px rgba(255,129,112,0.7))' } : {}} />
                <span className="slabdash-label">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* System Status */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,129,112,0.08)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${company?.hasPsaKey ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ boxShadow: company?.hasPsaKey ? '0 0 6px rgba(52,211,153,0.8)' : '0 0 6px rgba(251,191,36,0.8)' }}
              />
              <span className="text-[10px] font-bold truncate" style={{ color: 'rgba(255,129,112,0.45)', letterSpacing: '0.1em' }}>
                PSA {company?.hasPsaKey ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <button
              onClick={() => setDarkMode(d => !d)}
              className="rounded p-1 transition-all flex-shrink-0"
              style={{ background: 'rgba(255,129,112,0.06)', color: 'rgba(255,129,112,0.5)', border: '1px solid rgba(255,129,112,0.1)' }}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            </button>
          </div>
          <p className="text-[8px] mt-1" style={{ color: 'rgba(255,129,112,0.4)', letterSpacing: '0.08em' }}>
            SlabDash Command · PSA Tracking
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header - hidden on SAM page */}
        {location.pathname !== '/sam' && (
        <header className="relative z-30" style={{
          background: darkMode ? 'rgba(4,8,16,0.85)' : 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: darkMode ? '1px solid rgba(255,129,112,0.08)' : '1px solid rgba(0,0,0,0.06)',
          boxShadow: darkMode ? '0 1px 0 rgba(255,129,112,0.05)' : '0 1px 8px rgba(0,0,0,0.03)',
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
              <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-0.5" style={{ color: darkMode ? 'rgba(255,129,112,0.4)' : 'rgba(44,36,22,0.4)' }}>SECTION</p>
              <h1 className="text-sm font-black tracking-widest uppercase" style={{ color: darkMode ? '#FF8170' : 'rgb(var(--dark))', textShadow: darkMode ? '0 0 12px rgba(255,129,112,0.4)' : 'none', letterSpacing: '0.1em' }}>
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
                      background: darkMode ? 'linear-gradient(135deg, rgba(255,129,112,0.2), rgba(255,107,89,0.15))' : 'linear-gradient(135deg, rgb(var(--brand-500)), rgb(var(--brand-600)))',
                      color: darkMode ? '#FF8170' : '#FFF8F0',
                      boxShadow: darkMode ? '0 0 0 1px rgba(255,129,112,0.3), 0 0 12px rgba(255,129,112,0.2)' : '0 2px 8px rgba(255,107,89,0.25)',
                      border: darkMode ? '1px solid rgba(255,129,112,0.3)' : 'none',
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
                        background: darkMode ? 'rgba(24,15,9,0.97)' : 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: darkMode ? '1px solid rgba(255,129,112,0.15)' : '1px solid rgba(255,255,255,0.5)',
                        boxShadow: darkMode ? '0 12px 40px rgba(0,0,0,0.4), 0 0 20px rgba(255,129,112,0.05)' : '0 12px 40px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div className="px-4 py-2" style={{ borderBottom: darkMode ? '1px solid rgba(255,129,112,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                        <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>{user?.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-body)' }}>{user?.email}</p>
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
                <p className="text-sm mb-6" style={{ color: 'rgb(var(--bg-text))' }}>
                  Your 14-day free trial has expired. Upgrade to keep your submissions, customers, and cards — nothing is deleted.
                </p>
                <Link
                  to="/settings?tab=billing"
                  className="btn btn-primary gap-2 mx-auto inline-flex"
                >
                  <Crown className="w-4 h-4" />
                  View Plans & Upgrade
                </Link>
                <p className="text-xs mt-4" style={{ color: 'rgb(var(--bg-text))', opacity: 0.5 }}>
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
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

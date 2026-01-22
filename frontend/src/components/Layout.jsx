import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, company, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Owner-only navigation (shown at top with purple styling)
  const ownerNavigation = [
    { name: 'Platform Control', href: '/owner', icon: Shield },
  ];

  // Build regular navigation based on user role
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Submissions', href: '/submissions', icon: Package },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Cards', href: '/cards', icon: CreditCard },
    { name: 'Import CSV', href: '/import', icon: Upload },
    { name: 'Buyback Offers', href: '/buyback', icon: DollarSign },
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
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ backgroundColor: `rgb(var(--sidebar-color))` }}
        className={`fixed top-0 left-0 z-50 h-full w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center px-4 py-6 border-b border-brand-100 relative">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 lg:hidden text-gray-600 hover:text-gray-900"
          >
            <X className="w-6 h-6" />
          </button>
          <Link to="/dashboard" className="flex items-center justify-center">
            <img
              src="/images/logo-icon.png.svg"
              alt="SlabDash"
              className="w-32 h-32"
            />
          </Link>
        </div>

        {/* Company name */}
        <div className="px-4 py-3 border-b border-brand-100">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Shop</p>
          <p className="text-sm font-medium text-gray-900 truncate">{company?.name || 'Loading...'}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {/* Owner-only navigation */}
          {user?.role === 'owner' && ownerNavigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50 border border-purple-200'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}

          {/* Owner separator */}
          {user?.role === 'owner' && (
            <div className="border-t border-gray-200 my-2" />
          )}

          {/* Regular navigation */}
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-brand-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* PSA Status */}
        <div className="px-4 py-3 border-t border-brand-100">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${company?.hasPsaKey ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-xs text-gray-600">
              PSA API: {company?.hasPsaKey ? 'Connected' : 'Not configured'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-brand-500 border-b border-brand-600">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-white hover:text-brand-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page title (shows on desktop) */}
            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold text-white">
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
                  className="flex items-center gap-2 text-sm text-white hover:text-brand-100"
                >
                  <div className="w-8 h-8 bg-white text-brand-600 rounded-full flex items-center justify-center font-medium">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block font-medium">{user?.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 fade-in">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { X, Zap, Check, ArrowRight, TrendingUp } from 'lucide-react';

const PLANS = {
  free: {
    name: 'Early Access',
    price: 'Free',
    color: '#6b7280',
  },
  shop: {
    name: 'Shop',
    price: '$99',
    period: '/mo',
    color: '#FF8170',
    features: [
      '500 cards / month',
      '200 customers',
      'Customer portal with branding',
      'Email & push notifications',
      'Buyback offer system',
      'SAM AI assistant',
      'CSV import/export',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: '$249',
    period: '/mo',
    color: '#8b5cf6',
    features: [
      'Unlimited cards',
      'Unlimited customers',
      'White-label portal',
      'Multi-location support',
      'API access',
      'Team roles & permissions',
      'Priority PSA refresh',
      'Priority support',
    ],
  },
};

export default function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      setDetail(e.detail);
      setOpen(true);
    };
    window.addEventListener('slabdash:upgrade', handler);
    return () => window.removeEventListener('slabdash:upgrade', handler);
  }, []);

  if (!open) return null;

  const currentPlan = user?.plan || 'free';
  const nextPlan = currentPlan === 'free' || currentPlan === 'shop' ? 'shop' : 'enterprise';
  const upgradeTarget = currentPlan === 'shop' ? 'enterprise' : 'shop';
  const plan = PLANS[upgradeTarget];

  const limitMessage = detail?.error || 'You\'ve reached your plan limit.';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255, 252, 249, 0.97)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 129, 112, 0.2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.5) inset',
        }}
      >
        {/* Header gradient */}
        <div
          className="p-6 pb-5"
          style={{
            background: `linear-gradient(135deg, ${plan.color}15, ${plan.color}08)`,
            borderBottom: `1px solid ${plan.color}20`,
          }}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-black/10"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)` }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Upgrade to</p>
              <h2 className="text-xl font-black" style={{ color: 'rgb(44, 36, 22)' }}>
                SlabDash {plan.name}
              </h2>
            </div>
          </div>

          <div
            className="text-sm font-medium px-3 py-2 rounded-xl"
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.15)',
              color: '#92400E',
            }}
          >
            <TrendingUp className="w-4 h-4 inline mr-1.5 mb-0.5" style={{ color: '#D97706' }} />
            {limitMessage}
          </div>
        </div>

        {/* Features */}
        <div className="p-6">
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-4xl font-black" style={{ color: 'rgb(44, 36, 22)' }}>{plan.price}</span>
            {plan.period && <span className="text-gray-500 font-medium">{plan.period}</span>}
          </div>

          <ul className="space-y-2.5 mb-6">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm font-medium" style={{ color: 'rgba(44,36,22,0.8)' }}>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${plan.color}20` }}
                >
                  <Check className="w-3 h-3" style={{ color: plan.color }} />
                </div>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => { setOpen(false); navigate('/settings?tab=billing'); }}
            className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
              boxShadow: `0 4px 24px ${plan.color}40`,
            }}
          >
            Upgrade to {plan.name}
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setOpen(false)}
            className="w-full py-2.5 mt-2 rounded-2xl text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

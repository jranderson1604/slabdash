import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X, Key, Users, Package, QrCode, ChevronRight } from 'lucide-react';

const DISMISS_KEY = 'slabdash_checklist_dismissed';

export default function OnboardingChecklist({ company, stats }) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISS_KEY) === 'true';
  });

  const hasPsa = !!company?.hasPsaKey;
  const hasCustomers = (stats?.totalCustomers || 0) > 0;
  const hasSubmissions = (stats?.totalSubmissions || 0) > 0;
  const hasPortalCode = !!(company?.shop_code || company?.slug);

  const steps = [
    {
      id: 'psa',
      done: hasPsa,
      icon: Key,
      title: 'Connect your PSA API key',
      desc: 'Enables automatic status updates from PSA.',
      action: { to: '/settings?tab=psa', label: 'Go to Settings' },
    },
    {
      id: 'customer',
      done: hasCustomers,
      icon: Users,
      title: 'Add your first customer',
      desc: 'Track who owns which cards.',
      action: { to: '/customers/new', label: 'Add Customer' },
    },
    {
      id: 'submission',
      done: hasSubmissions,
      icon: Package,
      title: 'Create your first submission',
      desc: 'Start tracking a PSA order.',
      action: { to: '/submissions/new', label: 'New Submission' },
    },
    {
      id: 'portal',
      done: hasPortalCode,
      icon: QrCode,
      title: 'Share your customer portal',
      desc: 'Give customers access to their submission status.',
      action: { to: '/settings?tab=billing', label: 'Get Portal Link' },
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  // Don't show if dismissed or all steps are done
  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  const progressPct = (completedCount / steps.length) * 100;

  return (
    <div className="card overflow-hidden">
      {/* Progress bar accent at top */}
      <div className="h-1 w-full" style={{ background: 'rgba(0,0,0,0.04)' }}>
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, rgb(var(--brand-500)), rgb(var(--brand-600)))',
          }}
        />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'rgb(var(--dark))' }}>
              Setup Checklist
            </h2>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {completedCount} of {steps.length} steps complete
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.04] text-gray-400 hover:text-gray-600"
            aria-label="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="flex items-start gap-3 p-3 rounded-xl transition-all"
                style={{
                  background: step.done
                    ? 'rgba(16, 185, 129, 0.04)'
                    : 'rgba(255, 129, 112, 0.03)',
                  border: step.done
                    ? '1px solid rgba(16, 185, 129, 0.1)'
                    : '1px solid rgba(255, 129, 112, 0.08)',
                }}
              >
                {/* Check / circle */}
                <div className="flex-shrink-0 mt-0.5">
                  {step.done ? (
                    <CheckCircle2 className="w-5 h-5" style={{ color: '#10B981' }} />
                  ) : (
                    <Circle className="w-5 h-5" style={{ color: 'rgba(44,36,22,0.2)' }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${step.done ? 'line-through' : ''}`}
                    style={{ color: step.done ? 'var(--text-muted)' : 'rgb(var(--dark))' }}>
                    {step.title}
                  </p>
                  {!step.done && (
                    <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {step.desc}
                    </p>
                  )}
                  {!step.done && (
                    <Link
                      to={step.action.to}
                      className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
                      style={{ color: '#E8543D' }}
                    >
                      {step.action.label}
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Reusable PageHeader component with liquid glass gradient styling
 */
export default function PageHeader({
  title,
  subtitle,
  backLink,
  backLabel = 'Back',
  actions,
  children,
  eyebrow,
  className = ''
}) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 shadow-xl mb-6 ${className}`}>
      <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
      <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }} />

      <div className="relative px-6 sm:px-8 py-7">
        <div className="flex items-center gap-4">
          {backLink && (
            <Link
              to={backLink}
              className="p-2 rounded-xl transition-all hover:bg-white/20 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
              aria-label={backLabel}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
          )}

          <div className="flex-1 min-w-0">
            {eyebrow && (
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">{eyebrow}</p>
            )}
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-white/60 text-sm font-medium mt-1">{subtitle}</p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

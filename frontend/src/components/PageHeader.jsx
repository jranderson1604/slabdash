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
  variant = 'default',
  className = ''
}) {
  const variants = {
    default: 'p-6',
    large: 'p-8',
    compact: 'p-4'
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl page-header-glass ${variants[variant]} mb-6 ${className}`}>
      {/* Liquid glass decorative elements */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"
        style={{ background: 'rgba(255, 216, 196, 0.25)' }}
      />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3"
        style={{ background: 'rgba(255, 185, 160, 0.2)' }}
      />
      {/* Top highlight edge */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 216, 196, 0.5), transparent)' }}
      />

      <div className="relative">
        {/* Header content */}
        <div className="flex items-center gap-4">
          {backLink && (
            <Link
              to={backLink}
              className="p-2 rounded-xl transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
              aria-label={backLabel}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
          )}

          <div className="flex-1">
            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-lg uppercase">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg font-semibold mt-1" style={{ color: 'rgba(255, 248, 240, 0.85)' }}>{subtitle}</p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Optional children content (for additional header elements) */}
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

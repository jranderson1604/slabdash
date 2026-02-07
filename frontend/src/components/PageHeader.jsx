import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Reusable PageHeader component with consistent gradient styling
 * Used across detail pages, forms, and list views for visual consistency
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
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 ${variants[variant]} shadow-xl mb-6 ${className}`}>
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

      <div className="relative">
        {/* Header content */}
        <div className="flex items-center gap-4">
          {backLink && (
            <Link
              to={backLink}
              className="p-2 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all"
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
              <p className="text-white/90 text-lg font-semibold mt-1">{subtitle}</p>
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

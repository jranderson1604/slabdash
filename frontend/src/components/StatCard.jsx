import { Link } from 'react-router-dom';

/**
 * Reusable StatCard component for displaying key metrics
 * Supports both light and solid color variants, with optional linking
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color = 'brand',
  variant = 'light',
  link
}) {
  const lightColors = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  const solidColors = {
    brand: 'bg-brand-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
  };

  const iconColorClass = variant === 'solid'
    ? `${solidColors[color]} text-white`
    : lightColors[color];

  const content = (
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link
        to={link}
        className="card p-6 hover:border-brand-500 hover:shadow-lg transition-all cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="card p-6 hover:shadow-lg transition-shadow">
      {content}
    </div>
  );
}

import { Link } from 'react-router-dom';

/**
 * Reusable StatCard component with liquid glass styling and glowing icons
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
  const iconStyles = {
    brand: {
      background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.15), rgba(255, 107, 89, 0.1))',
      color: '#E8543D',
      border: '1px solid rgba(255, 129, 112, 0.15)',
    },
    green: {
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
      color: '#059669',
      border: '1px solid rgba(16, 185, 129, 0.15)',
    },
    yellow: {
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))',
      color: '#D97706',
      border: '1px solid rgba(245, 158, 11, 0.15)',
    },
    blue: {
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))',
      color: '#2563EB',
      border: '1px solid rgba(59, 130, 246, 0.15)',
    },
    purple: {
      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(139, 92, 246, 0.1))',
      color: '#7C3AED',
      border: '1px solid rgba(168, 85, 247, 0.15)',
    },
    orange: {
      background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(234, 88, 12, 0.1))',
      color: '#EA580C',
      border: '1px solid rgba(249, 115, 22, 0.15)',
    },
  };

  const solidIconStyles = {
    brand: { background: 'linear-gradient(135deg, #FF8170, #FF6B59)', color: '#FFF8F0' },
    green: { background: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFF' },
    yellow: { background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#FFF' },
    blue: { background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#FFF' },
    purple: { background: 'linear-gradient(135deg, #A855F7, #7C3AED)', color: '#FFF' },
    orange: { background: 'linear-gradient(135deg, #F97316, #EA580C)', color: '#FFF' },
  };

  const glowClass = {
    brand: 'icon-glow',
    green: 'icon-glow-green',
    blue: 'icon-glow-blue',
    yellow: 'icon-glow-yellow',
    purple: 'icon-glow-purple',
    orange: 'icon-glow-orange',
  };

  const style = variant === 'solid' ? solidIconStyles[color] : iconStyles[color];

  const content = (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${glowClass[color] || 'icon-glow'}`}
          style={{
            background: style.background,
            border: style.border || 'none',
          }}
        >
          <Icon className="w-6 h-6" style={{ color: style.color, filter: `drop-shadow(0 0 6px ${style.color}40)` }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'rgb(var(--dark))' }}>{value}</p>
        <p className="text-sm font-medium" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>{label}</p>
        {subtext && <p className="text-xs mt-0.5" style={{ color: 'rgba(44, 36, 22, 0.55)' }}>{subtext}</p>}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="card p-6 transition-all cursor-pointer group">
        {content}
      </Link>
    );
  }

  return (
    <div className="card p-6">
      {content}
    </div>
  );
}

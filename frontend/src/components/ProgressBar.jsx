/**
 * Reusable ProgressBar component with dynamic color based on percentage
 */
export default function ProgressBar({ percent, showLabel = true, size = 'md' }) {
  const getColor = (p) => {
    if (p >= 100) return 'bg-green-500';
    if (p >= 75) return 'bg-blue-500';
    if (p >= 50) return 'bg-yellow-500';
    return 'bg-brand-500';
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 progress-bar ${sizeClasses[size]}`}>
        <div
          className={`progress-bar-fill ${getColor(percent)}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-600 w-10 text-right">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}

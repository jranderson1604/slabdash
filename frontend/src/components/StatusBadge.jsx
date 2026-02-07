import { AlertCircle, CheckCircle2, Clock, Truck } from 'lucide-react';

/**
 * Standardized StatusBadge component for submissions and orders
 * Displays status with appropriate color, icon, and tooltip
 */
export default function StatusBadge({ submission, showTooltip = true }) {
  const getStatusInfo = () => {
    if (submission.shipped) {
      return {
        label: 'Shipped',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <Truck className="w-3 h-3" />,
        description: 'Your cards have been shipped back to you'
      };
    }
    if (submission.problem_order) {
      return {
        label: 'Problem',
        color: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: <AlertCircle className="w-3 h-3" />,
        description: 'There is an issue with this order - check details'
      };
    }
    if (submission.grades_ready) {
      return {
        label: 'Grades Ready',
        color: 'bg-sky-100 text-sky-800 border-sky-200',
        icon: <CheckCircle2 className="w-3 h-3" />,
        description: 'Grading complete - awaiting shipment'
      };
    }

    // Determine in-progress status based on current step
    const step = submission.current_step || 'Pending';
    const stepLower = step.toLowerCase();

    if (stepLower.includes('research') || stepLower.includes('assembly')) {
      return {
        label: step,
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Clock className="w-3 h-3" />,
        description: 'Initial processing and card review'
      };
    }
    if (stepLower.includes('grading') || stepLower.includes('grade')) {
      return {
        label: step,
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Clock className="w-3 h-3" />,
        description: 'Cards are being graded by PSA'
      };
    }
    if (stepLower.includes('qa') || stepLower.includes('quality')) {
      return {
        label: step,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Clock className="w-3 h-3" />,
        description: 'Quality assurance check in progress'
      };
    }
    if (stepLower.includes('encapsulation') || stepLower.includes('encap')) {
      return {
        label: step,
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: <Clock className="w-3 h-3" />,
        description: 'Cards are being sealed in protective cases'
      };
    }

    return {
      label: step,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <Clock className="w-3 h-3" />,
      description: 'Processing in progress'
    };
  };

  const status = getStatusInfo();

  if (!showTooltip) {
    return (
      <span className={`badge flex items-center gap-1 border ${status.color}`}>
        {status.icon}
        {status.label}
      </span>
    );
  }

  return (
    <div className="group relative">
      <span className={`badge flex items-center gap-1 border ${status.color}`}>
        {status.icon}
        {status.label}
      </span>
      {/* Tooltip with explanation */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10">
        {status.description}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}

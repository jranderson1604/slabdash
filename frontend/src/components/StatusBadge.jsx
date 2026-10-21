import { AlertCircle, CheckCircle2, Clock, Truck } from 'lucide-react';

/**
 * Standardized StatusBadge component for submissions and orders
 * Liquid glass style with translucent backgrounds
 */
export default function StatusBadge({ submission, showTooltip = true }) {
  const getStatusInfo = () => {
    if (submission.shipped) {
      return {
        label: 'Shipped',
        style: { background: 'rgba(16, 185, 129, 0.1)', color: '#065F46', border: '1px solid rgba(16, 185, 129, 0.15)' },
        icon: <Truck className="w-3 h-3" />,
        description: 'Your cards have been shipped back to you'
      };
    }
    if (submission.problem_order) {
      return {
        label: 'Problem',
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#991B1B', border: '1px solid rgba(239, 68, 68, 0.15)' },
        icon: <AlertCircle className="w-3 h-3" />,
        description: 'There is an issue with this order - check details'
      };
    }
    if (submission.grades_ready) {
      return {
        label: 'Grades Ready',
        style: { background: 'rgba(14, 165, 233, 0.1)', color: '#075985', border: '1px solid rgba(14, 165, 233, 0.15)' },
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
        style: { background: 'rgba(168, 85, 247, 0.1)', color: '#6B21A8', border: '1px solid rgba(168, 85, 247, 0.15)' },
        icon: <Clock className="w-3 h-3" />,
        description: 'Initial processing and card review'
      };
    }
    if (stepLower.includes('grading') || stepLower.includes('grade')) {
      return {
        label: step,
        style: { background: 'rgba(245, 158, 11, 0.1)', color: '#92400E', border: '1px solid rgba(245, 158, 11, 0.15)' },
        icon: <Clock className="w-3 h-3" />,
        description: 'Cards are being graded by PSA'
      };
    }
    if (stepLower.includes('qa') || stepLower.includes('quality')) {
      return {
        label: step,
        style: { background: 'rgba(59, 130, 246, 0.1)', color: '#1E3A8A', border: '1px solid rgba(59, 130, 246, 0.15)' },
        icon: <Clock className="w-3 h-3" />,
        description: 'Quality assurance check in progress'
      };
    }
    if (stepLower.includes('encapsulation') || stepLower.includes('encap')) {
      return {
        label: step,
        style: { background: 'rgba(99, 102, 241, 0.1)', color: '#3730A3', border: '1px solid rgba(99, 102, 241, 0.15)' },
        icon: <Clock className="w-3 h-3" />,
        description: 'Cards are being sealed in protective cases'
      };
    }

    return {
      label: step,
      style: { background: 'rgba(107, 114, 128, 0.1)', color: '#374151', border: '1px solid rgba(107, 114, 128, 0.12)' },
      icon: <Clock className="w-3 h-3" />,
      description: 'Processing in progress'
    };
  };

  const status = getStatusInfo();

  const badgeElement = (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold tracking-wide"
      style={{
        ...status.style,
        backdropFilter: 'blur(12px) saturate(150%)',
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
      }}
    >
      {status.icon}
      {status.label}
    </span>
  );

  if (!showTooltip) {
    return badgeElement;
  }

  return (
    <div className="group relative">
      {badgeElement}
      {/* Tooltip with explanation */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10"
        style={{
          background: 'rgba(44, 36, 22, 0.9)',
          backdropFilter: 'blur(12px)',
          color: '#FFF8F0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}
      >
        {status.description}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent"
          style={{ borderTopColor: 'rgba(44, 36, 22, 0.9)' }}
        />
      </div>
    </div>
  );
}

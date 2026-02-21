import { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { keys: ['G', 'D'], desc: 'Go to Dashboard' },
    { keys: ['G', 'S'], desc: 'Go to Submissions' },
    { keys: ['G', 'C'], desc: 'Go to Customers' },
    { keys: ['G', 'K'], desc: 'Go to Cards' },
    { keys: ['G', 'A'], desc: 'Go to Analytics' },
    { keys: ['G', 'I'], desc: 'Go to Import CSV' },
    { keys: ['G', 'E'], desc: 'Go to Email Settings' },
    { keys: ['G', ','], desc: 'Go to Settings' },
  ]},
  { category: 'Create', items: [
    { keys: ['N', 'S'], desc: 'New Submission' },
    { keys: ['N', 'C'], desc: 'New Customer' },
  ]},
  { category: 'Global', items: [
    { keys: ['?'], desc: 'Show this help' },
    { keys: ['Esc'], desc: 'Close modal / dismiss' },
  ]},
];

function Kbd({ k }) {
  return (
    <kbd className="inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold"
      style={{
        minWidth: 22,
        background: 'rgba(44,36,22,0.06)',
        border: '1px solid rgba(44,36,22,0.12)',
        color: 'rgb(var(--dark))',
        fontFamily: 'monospace',
        boxShadow: '0 1px 2px rgba(44,36,22,0.08)',
      }}>
      {k}
    </kbd>
  );
}

export default function KeyboardShortcutsModal({ onClose }) {
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }} />
      <div
        className="relative rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,129,112,0.1)', border: '1px solid rgba(255,129,112,0.15)' }}>
              <Keyboard className="w-4 h-4" style={{ color: '#FF8170' }} />
            </div>
            <h2 className="text-lg font-black" style={{ color: 'rgb(var(--dark))' }}>Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 transition-all hover:bg-black/5">
            <X className="w-4 h-4" style={{ color: 'rgba(44,36,22,0.5)' }} />
          </button>
        </div>

        {/* Shortcuts */}
        <div className="px-5 pb-5 space-y-4">
          {SHORTCUTS.map(section => (
            <div key={section.category}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: 'rgba(44,36,22,0.4)' }}>{section.category}</p>
              <div className="space-y-1.5">
                {section.items.map(item => (
                  <div key={item.desc} className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium" style={{ color: 'rgb(var(--dark))' }}>{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          {i > 0 && <span className="text-xs" style={{ color: 'rgba(44,36,22,0.3)' }}>then</span>}
                          <Kbd k={k} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-4">
          <p className="text-xs" style={{ color: 'rgba(44,36,22,0.35)' }}>
            Shortcuts are disabled when typing in an input field.
          </p>
        </div>
      </div>
    </div>
  );
}

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

const ConfirmContext = createContext(null);

/**
 * Promise-based confirm dialog.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   if (!await confirm({ title: 'Delete?', message: '...', variant: 'danger' })) return;
 *
 * Or shorthand:
 *   if (!await confirm('Are you sure?')) return;
 */
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { title, message, confirmLabel, cancelLabel, variant, resolve }
  const confirmBtnRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string'
      ? { message: options }
      : options;

    return new Promise((resolve) => {
      setDialog({
        title: opts.title || null,
        message: opts.message || 'Are you sure?',
        confirmLabel: opts.confirmLabel || (opts.variant === 'danger' ? 'Delete' : 'Confirm'),
        cancelLabel: opts.cancelLabel || 'Cancel',
        variant: opts.variant || 'info',
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    dialog?.resolve(true);
    setDialog(null);
  }, [dialog]);

  const handleCancel = useCallback(() => {
    dialog?.resolve(false);
    setDialog(null);
  }, [dialog]);

  // ESC key handler
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter') handleConfirm();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, handleCancel, handleConfirm]);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (dialog) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [dialog]);

  const variants = {
    danger: {
      icon: <Trash2 className="w-6 h-6 text-red-500" />,
      iconBg: 'bg-red-100',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
      iconBg: 'bg-amber-100',
      confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-500" />,
      iconBg: 'bg-blue-100',
      confirmClass: 'bg-brand-500 hover:bg-brand-600 text-white',
    },
  };

  const v = variants[dialog?.variant] || variants.info;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && handleCancel()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4">
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full ${v.iconBg}`}>
                  {v.icon}
                </div>
                <div className="pt-1">
                  {dialog.title && (
                    <h3 className="text-lg font-semibold text-gray-900 leading-tight">{dialog.title}</h3>
                  )}
                  <p className={`text-sm text-gray-600 ${dialog.title ? 'mt-1' : 'text-base text-gray-800 font-medium'}`}>
                    {dialog.message}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {dialog.cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${v.confirmClass}`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

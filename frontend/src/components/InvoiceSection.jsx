import { useState } from 'react';
import { DollarSign, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import InvoicePreviewModal from './InvoicePreviewModal';

export default function InvoiceSection({ submission, onInvoiceSent }) {
  const [showPreview, setShowPreview] = useState(false);

  if (submission.invoice_sent) {
    return (
      <div className="card bg-green-50 border-green-200">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Invoices Sent</h3>
              <p className="text-sm text-green-700">
                Invoice #{submission.invoice_number} • {submission.invoice_sent_at ? new Date(submission.invoice_sent_at).toLocaleDateString() : 'Recently'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!submission.grades_ready) {
    return (
      <div className="card bg-gray-50 border-gray-200">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Not Ready</h3>
              <p className="text-sm text-gray-600">
                Mark submission as "Grades Ready" before sending invoices
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Send Invoices</h3>
              <p className="text-sm text-gray-600">
                Email invoices to {submission.linked_customers?.length || 0} customer(s)
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="btn btn-primary"
          >
            <Eye className="w-4 h-4" />
            Preview & Send Invoices
          </button>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Preview lets you review and edit costs before sending. Invoices will include pickup codes for pickup customers.
          </p>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {showPreview && (
        <InvoicePreviewModal
          submission={submission}
          onClose={() => setShowPreview(false)}
          onSent={() => {
            setShowPreview(false);
            if (onInvoiceSent) onInvoiceSent();
          }}
        />
      )}
    </div>
  );
}

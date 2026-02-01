import { useState, useEffect, useMemo } from 'react';
import { X, Send, Edit2, DollarSign, Loader2, Eye, ChevronDown } from 'lucide-react';
import { invoices } from '../api/client';

export default function InvoicePreviewModal({ submission, onClose, onSent }) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(false);
  const [psaServiceCost, setPsaServiceCost] = useState(0);
  const [additionalFees, setAdditionalFees] = useState(0);
  const [showAllCustomers, setShowAllCustomers] = useState(false);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await invoices.preview(submission.id);
      setPreview(res.data);
      setPsaServiceCost(parseFloat(res.data.psa_service_cost || 0));
      setAdditionalFees(parseFloat(res.data.additional_fees || 0));
    } catch (error) {
      console.error('Failed to load invoice preview:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to load invoice preview';
      alert(errorMessage + '\n\nPlease ensure customers have email addresses before sending invoices.');
      onClose(); // Close modal on error
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!preview?.customers || preview.customers.length === 0) {
      alert('No customers found. Please add customers to this submission first.');
      return;
    }

    if (!confirm(`Send invoices to ${preview.customers.length} customer(s)?\n\nThis will email invoices and mark the submission as invoiced.`)) {
      return;
    }

    setSending(true);
    try {
      const response = await invoices.generate(submission.id, {
        psa_service_cost: psaServiceCost,
        additional_fees: additionalFees
      });
      const { emails_sent, emails_failed, invoice_number } = response.data;

      // Show success message
      alert(
        `✅ Invoices Sent!\n\n` +
        `Invoice #${invoice_number}\n` +
        `Sent: ${emails_sent}\n` +
        `Failed: ${emails_failed}`
      );

      // Close modal first
      onClose();

      // Then trigger parent refresh
      if (onSent) {
        setTimeout(() => onSent(), 100);
      }
    } catch (error) {
      console.error('Failed to send invoices:', error);
      alert(error.response?.data?.error || 'Failed to send invoices');
      setSending(false);
    }
  };

  if (loading || !preview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="ml-3 text-gray-600">Loading invoice preview...</span>
          </div>
        </div>
      </div>
    );
  }

  // Memoize calculations to prevent re-renders
  const total = useMemo(() => (psaServiceCost + additionalFees) || 0, [psaServiceCost, additionalFees]);
  const customerCount = useMemo(() => preview?.customers?.length || 0, [preview?.customers]);
  const perCustomer = useMemo(() => customerCount > 0 ? (total / customerCount) : 0, [total, customerCount]);

  // Limit displayed customers for performance (show first 5, expand to show all)
  const displayedCustomers = useMemo(() => {
    if (!preview?.customers) return [];
    if (showAllCustomers || customerCount <= 5) {
      return preview.customers;
    }
    return preview.customers.slice(0, 5);
  }, [preview?.customers, showAllCustomers, customerCount]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-brand-500 to-brand-600 text-white p-6 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Invoice Preview</h2>
              <p className="text-sm text-brand-100">Review before sending to {customerCount} customer(s)</p>
            </div>
          </div>
          <button onClick={onClose} disabled={sending} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cost Editing Section */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Invoice Costs
              </h3>
              <button
                onClick={() => setEditing(!editing)}
                className="btn btn-sm btn-secondary"
              >
                <Edit2 className="w-4 h-4" />
                {editing ? 'Done Editing' : 'Edit Costs'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PSA Service Cost (Total)
                </label>
                {editing ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={psaServiceCost}
                      onChange={(e) => setPsaServiceCost(parseFloat(e.target.value) || 0)}
                      className="input pl-8"
                    />
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-gray-900">${psaServiceCost.toFixed(2)}</div>
                )}
                <p className="text-xs text-gray-500 mt-1">Cost from PSA for grading services</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Fees
                </label>
                {editing ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={additionalFees}
                      onChange={(e) => setAdditionalFees(parseFloat(e.target.value) || 0)}
                      className="input pl-8"
                    />
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-gray-900">${additionalFees.toFixed(2)}</div>
                )}
                <p className="text-xs text-gray-500 mt-1">Shipping, handling, or other fees</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total Invoice Amount:</span>
                <span className="text-3xl font-bold text-brand-600">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Per Customer ({preview?.customers?.length || 0} customers):</span>
                <span className="text-lg font-semibold text-gray-900">${perCustomer.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Email Preview for Each Customer */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Email Preview {customerCount > 0 && `(${customerCount} customer${customerCount !== 1 ? 's' : ''})`}
            </h3>
            <div className="space-y-3">
              {displayedCustomers.map((customer, idx) => (
                <div key={customer.id || idx} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-brand-600">${perCustomer.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{customer.delivery_method === 'pickup' ? 'Pickup' : 'Shipping'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="text-sm text-gray-700 space-y-2">
                      <p><strong>Subject:</strong> Invoice for Submission {submission.psa_submission_number || submission.internal_id} - ${perCustomer.toFixed(2)}</p>
                      <p><strong>Message:</strong> Invoice #{preview.invoice_number} for {customer.card_count || 0} card(s)</p>
                      {customer.delivery_method === 'pickup' && customer.pickup_code && (
                        <div className="bg-green-50 border border-green-200 rounded px-3 py-2 mt-2">
                          <p className="text-xs text-green-700"><strong>Pickup Code:</strong> {customer.pickup_code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Show More Button */}
              {customerCount > 5 && !showAllCustomers && (
                <button
                  onClick={() => setShowAllCustomers(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  Show {customerCount - 5} more customer{customerCount - 5 !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Before sending:</strong> Review all costs and customer emails. Once sent, invoices cannot be unsent.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || total === 0}
            className="btn btn-primary"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending Invoices...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send {preview?.customers?.length || 0} Invoice(s)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

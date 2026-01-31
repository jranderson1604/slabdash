import { useState, useEffect } from 'react';
import { X, Send, Edit2, DollarSign, Loader2, Eye } from 'lucide-react';
import { invoices } from '../api/client';

export default function InvoicePreviewModal({ submission, onClose, onSent }) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(false);
  const [psaServiceCost, setPsaServiceCost] = useState(0);
  const [additionalFees, setAdditionalFees] = useState(0);

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
      alert('Failed to load invoice preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
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

      alert(
        `✅ Invoices Sent!\n\n` +
        `Invoice #${invoice_number}\n` +
        `Sent: ${emails_sent}\n` +
        `Failed: ${emails_failed}`
      );

      if (onSent) onSent();
      onClose();
    } catch (error) {
      console.error('Failed to send invoices:', error);
      alert(error.response?.data?.error || 'Failed to send invoices');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
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

  const total = (psaServiceCost + additionalFees) || 0;
  const perCustomer = preview?.customers?.length ? (total / preview.customers.length) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-brand-500 to-brand-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Invoice Preview</h2>
              <p className="text-sm text-brand-100">Review before sending to {preview?.customers?.length || 0} customer(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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
            <h3 className="font-semibold text-gray-900 mb-3">Email Preview</h3>
            <div className="space-y-3">
              {preview?.customers?.map((customer, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
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
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-end gap-3">
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

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Edit2, DollarSign, Loader2, Eye, ChevronDown, AlertCircle, Zap } from 'lucide-react';
import { invoices } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function InvoicePreviewModal({ submission, onClose, onSent }) {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [psaServiceCost, setPsaServiceCost] = useState('0');
  const [additionalFees, setAdditionalFees] = useState('0');
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoices.preview(submission.id);
      setPreview(res.data);
      setPsaServiceCost(String(parseFloat(res.data.psa_service_cost || 0)));
      setAdditionalFees(String(parseFloat(res.data.additional_fees || 0)));
    } catch (err) {
      console.error('Failed to load invoice preview:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to load invoice preview';
      const errorDetails = err.response?.data?.total_customers
        ? `\n\nThis submission has ${err.response.data.total_customers} customer(s) but none have email addresses.`
        : '';
      setError(errorMessage + errorDetails);
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
        psa_service_cost: parseFloat(psaServiceCost) || 0,
        additional_fees: parseFloat(additionalFees) || 0
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

  // Show loading state
  if (loading) {
    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="ml-3 text-gray-600">Loading invoice preview...</span>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Show error state
  if (error) {
    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-xl font-bold">Cannot Generate Invoice</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>To fix this:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc space-y-1">
                <li>Go to the submission's customer list</li>
                <li>Add email addresses to each customer</li>
                <li>Come back and try generating the invoice again</li>
              </ul>
            </div>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end rounded-b-xl">
            <button onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // If no preview data, show error
  if (!preview) {
    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Invoice Preview</h3>
            <p className="text-gray-600">Please try again or contact support if the problem persists.</p>
            <button onClick={onClose} className="btn btn-primary mt-4">
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Calculate totals
  const psaCostNum = parseFloat(psaServiceCost) || 0;
  const additionalFeesNum = parseFloat(additionalFees) || 0;
  const total = psaCostNum + additionalFeesNum;
  const customerCount = preview?.customers?.length || 0;
  const perCustomer = customerCount > 0 ? (total / customerCount) : 0;

  // Limit displayed customers for performance (show first 5, expand to show all)
  const displayedCustomers = (() => {
    if (!preview?.customers) return [];
    if (showAllCustomers || customerCount <= 5) {
      return preview.customers;
    }
    return preview.customers.slice(0, 5);
  })();

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
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

            {/* Preset Selector */}
            {editing && company?.service_level_pricing && Object.keys(company.service_level_pricing).length > 0 && (
              <div className="mb-4 pb-4 border-b border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Quick Select Service Level
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => {
                    setSelectedPreset(e.target.value);
                    if (e.target.value && company.service_level_pricing[e.target.value]) {
                      setPsaServiceCost(String(company.service_level_pricing[e.target.value]));
                    }
                  }}
                  className="input"
                >
                  <option value="">-- Select a preset --</option>
                  {Object.entries(company.service_level_pricing)
                    .filter(([_, price]) => price != null && price > 0)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([level, price]) => (
                      <option key={level} value={level}>
                        {level} - ${parseFloat(price).toFixed(2)}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Select a preset to fill in the PSA service cost, or enter manually below
                </p>
              </div>
            )}

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
                      min="0"
                      value={psaServiceCost}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Allow empty string or valid numbers
                        if (val === '' || !isNaN(parseFloat(val))) {
                          setPsaServiceCost(val);
                        }
                      }}
                      onBlur={(e) => {
                        // Clean up on blur - remove leading zeros
                        const num = parseFloat(e.target.value) || 0;
                        setPsaServiceCost(String(num));
                      }}
                      className="input pl-8"
                    />
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-gray-900">${psaCostNum.toFixed(2)}</div>
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
                      min="0"
                      value={additionalFees}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Allow empty string or valid numbers
                        if (val === '' || !isNaN(parseFloat(val))) {
                          setAdditionalFees(val);
                        }
                      }}
                      onBlur={(e) => {
                        // Clean up on blur - remove leading zeros
                        const num = parseFloat(e.target.value) || 0;
                        setAdditionalFees(String(num));
                      }}
                      className="input pl-8"
                    />
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-gray-900">${additionalFeesNum.toFixed(2)}</div>
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
    </div>,
    document.body
  );
}

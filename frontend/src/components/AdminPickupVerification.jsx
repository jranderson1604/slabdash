import { useState } from 'react';
import { CheckCircle2, Package, User, Mail, Clock, Search, X } from 'lucide-react';
import { submissions as submissionsApi } from '../api/client';

export default function AdminPickupVerification({ onClose }) {
  const [pickupCode, setPickupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await submissionsApi.verifyPickupCode({ pickup_code: pickupCode });
      setSubmission(response.data.submission);
      setCustomers(response.data.customers);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid pickup code');
      setSubmission(null);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPickedUp = async (customerId) => {
    setProcessing(customerId);
    try {
      await submissionsApi.markCustomerPickedUp({
        submission_id: submission.id,
        customer_id: customerId
      });

      // Update local state
      setCustomers(customers.map(c =>
        c.id === customerId
          ? { ...c, picked_up: true, picked_up_at: new Date().toISOString() }
          : c
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark as picked up');
    } finally {
      setProcessing(null);
    }
  };

  const handleReset = () => {
    setPickupCode('');
    setSubmission(null);
    setCustomers([]);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white p-6 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Pickup Code Verification</h2>
              <p className="text-sm text-brand-100">Verify customer pickup and mark as complete</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!submission ? (
            // Pickup Code Entry Form
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Pickup Code
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={pickupCode}
                    onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                    placeholder="ABC-123"
                    className="input pl-10 text-lg font-mono tracking-wider"
                    required
                    autoFocus
                    maxLength={7}
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !pickupCode}
                className="btn btn-primary w-full"
              >
                {loading ? 'Verifying...' : 'Verify Pickup Code'}
              </button>
            </form>
          ) : (
            // Customer List
            <div className="space-y-4">
              {/* Submission Info */}
              <div className="bg-brand-50 border-2 border-brand-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Submission</p>
                    <p className="text-lg font-bold text-gray-900">{submission.number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Pickup Code</p>
                    <p className="text-2xl font-mono font-bold text-brand-600">{submission.pickup_code}</p>
                  </div>
                </div>
              </div>

              {/* Customers */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Customers ({customers.filter(c => !c.picked_up).length} pending)
                </h3>
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`border-2 rounded-lg p-4 ${
                        customer.picked_up
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <p className="font-semibold text-gray-900">{customer.name}</p>
                            {customer.picked_up && (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <p className="text-sm text-gray-600">{customer.email}</p>
                          </div>
                          {customer.picked_up && customer.picked_up_at && (
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="w-4 h-4 text-green-600" />
                              <p className="text-sm text-green-700">
                                Picked up {new Date(customer.picked_up_at).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {!customer.picked_up && (
                          <button
                            onClick={() => handleMarkPickedUp(customer.id)}
                            disabled={processing === customer.id}
                            className="btn btn-primary btn-sm"
                          >
                            {processing === customer.id ? 'Marking...' : 'Mark Picked Up'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleReset}
                  className="btn btn-secondary flex-1"
                >
                  Verify Another Code
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-primary flex-1"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

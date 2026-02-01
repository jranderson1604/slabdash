import { useState } from 'react';
import { CheckCircle2, Package, User, Mail, Clock, Search, X } from 'lucide-react';
import { submissions as submissionsApi } from '../api/client';

export default function AdminPickupVerification({ onClose }) {
  const [pickupCode, setPickupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await submissionsApi.verifyPickupCode({ pickup_code: pickupCode });
      setResult(response.data);
      setPickupCode(''); // Clear for next entry
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid pickup code');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPickupCode('');
    setResult(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white p-6 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Pickup Code Verification</h2>
              <p className="text-sm text-brand-100">Scan or enter customer pickup code</p>
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
          {!result ? (
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
                    onChange={(e) => {
                      setPickupCode(e.target.value.toUpperCase());
                      setError(''); // Clear error when typing
                    }}
                    placeholder="ABC-123"
                    className="input pl-10 text-lg font-mono tracking-wider"
                    required
                    autoFocus
                    maxLength={7}
                  />
                </div>
                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !pickupCode}
                className="btn btn-primary w-full"
              >
                {loading ? 'Verifying...' : 'Verify & Mark Picked Up'}
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Enter the customer's pickup code from their invoice email.
                  The system will automatically mark them as picked up.
                </p>
              </div>
            </form>
          ) : (
            // Success Message
            <div className="space-y-4">
              {/* Success Banner */}
              <div className={`border-2 rounded-lg p-6 ${
                result.already_picked_up
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-green-50 border-green-300'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className={`w-8 h-8 ${
                    result.already_picked_up ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                  <div>
                    <h3 className={`text-xl font-bold ${
                      result.already_picked_up ? 'text-yellow-900' : 'text-green-900'
                    }`}>
                      {result.already_picked_up ? 'Already Picked Up' : 'Pickup Confirmed!'}
                    </h3>
                    <p className={`text-sm ${
                      result.already_picked_up ? 'text-yellow-700' : 'text-green-700'
                    }`}>
                      {result.message}
                    </p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-white rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-500" />
                    <span className="font-semibold text-gray-900">{result.customer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">{result.customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">Submission: {result.submission.number}</span>
                  </div>
                  {result.picked_up_at && (
                    <div className="flex items-center gap-2">
                      <Clock className={`w-5 h-5 ${
                        result.already_picked_up ? 'text-yellow-500' : 'text-green-500'
                      }`} />
                      <span className={`text-sm font-medium ${
                        result.already_picked_up ? 'text-yellow-700' : 'text-green-700'
                      }`}>
                        {new Date(result.picked_up_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="btn btn-primary flex-1"
                  autoFocus
                >
                  Verify Another Code
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-secondary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Package, CheckCircle2, Loader2, Key, User, X } from 'lucide-react';
import { pickup } from '../api/client';

export default function PickupCard({ submission, onPickupComplete }) {
  const [generating, setGenerating] = useState(false);
  const [pickupCode, setPickupCode] = useState(submission.pickup_code || '');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [pickedUpBy, setPickedUpBy] = useState('');

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const response = await pickup.generateCode(submission.id);
      setPickupCode(response.data.pickup_code);
    } catch (error) {
      console.error('Failed to generate pickup code:', error);
      alert('Failed to generate pickup code');
    } finally {
      setGenerating(false);
    }
  };

  const handleVerifyPickup = async (skipVerification = false) => {
    if (!skipVerification && !codeInput) {
      alert('Please enter the pickup code');
      return;
    }

    if (!pickedUpBy) {
      alert('Please enter who picked up the submission');
      return;
    }

    setVerifying(true);
    try {
      await pickup.verifyPickup(submission.id, {
        pickup_code: skipVerification ? null : codeInput,
        picked_up_by: pickedUpBy,
        skip_verification: skipVerification
      });

      alert('Submission marked as picked up! ✅');
      setShowVerifyModal(false);
      if (onPickupComplete) onPickupComplete();
    } catch (error) {
      console.error('Failed to verify pickup:', error);
      alert(error.response?.data?.error || 'Failed to verify pickup');
    } finally {
      setVerifying(false);
    }
  };

  // If already picked up
  if (submission.picked_up) {
    return (
      <div className="card bg-green-50 border-green-200">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Picked Up</h3>
              <p className="text-sm text-green-700">
                By: {submission.picked_up_by} • {new Date(submission.picked_up_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If grades are ready but no pickup code yet
  if (submission.grades_ready && !pickupCode) {
    return (
      <div className="card bg-blue-50 border-blue-200">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Ready for Pickup</h3>
                <p className="text-sm text-blue-700">Generate a pickup code for the customer</p>
              </div>
            </div>
            <button
              onClick={handleGenerateCode}
              disabled={generating}
              className="btn btn-primary"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Generate Code
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If pickup code exists
  if (pickupCode) {
    const qrData = JSON.stringify({
      type: 'slabdash_pickup',
      submission_id: submission.id,
      pickup_code: pickupCode,
      submission_number: submission.psa_submission_number || submission.internal_id
    });

    return (
      <>
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Pickup Code</h3>
              <button
                onClick={() => setShowVerifyModal(true)}
                className="btn btn-primary"
              >
                Mark as Picked Up
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <QRCodeSVG value={qrData} size={200} level="H" />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Scan with SlabDash app to verify pickup</p>
              </div>

              {/* Pickup Code Display */}
              <div className="flex flex-col justify-center">
                <div className="mb-4">
                  <label className="text-sm text-gray-600 mb-2 block">Pickup Code</label>
                  <div className="text-4xl font-bold text-brand-600 tracking-wider font-mono">
                    {pickupCode}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    📧 This code has been sent to the customer via email.
                    They'll need to provide it when picking up their cards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verify Pickup Modal */}
        {showVerifyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Verify Pickup</h3>
                  <button
                    onClick={() => setShowVerifyModal(false)}
                    disabled={verifying}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Pickup Code
                  </label>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="ABC-123"
                    className="input text-center text-2xl font-mono tracking-wider"
                    maxLength={7}
                  />
                  <p className="text-xs text-gray-500 mt-1">Expected code: {pickupCode}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Picked Up By
                  </label>
                  <input
                    type="text"
                    value={pickedUpBy}
                    onChange={(e) => setPickedUpBy(e.target.value)}
                    placeholder="Customer name"
                    className="input"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Make sure the customer provides the correct pickup code before handing over the cards.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
                <button
                  onClick={() => setShowVerifyModal(false)}
                  disabled={verifying}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleVerifyPickup(true)}
                  disabled={verifying || !pickedUpBy}
                  className="btn btn-secondary flex-1"
                >
                  Skip Code
                </button>
                <button
                  onClick={() => handleVerifyPickup(false)}
                  disabled={verifying || !codeInput || !pickedUpBy}
                  className="btn btn-primary flex-1"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Complete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

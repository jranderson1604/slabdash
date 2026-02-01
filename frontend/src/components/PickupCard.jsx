import { Package, CheckCircle2, Info, Send, FileText } from 'lucide-react';

export default function PickupCard({ submission, onPickupComplete }) {
  // If already picked up (old system - submission level)
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

  // If grades are ready - show invoice instructions
  if (submission.grades_ready) {
    return (
      <div className="card bg-blue-50 border-blue-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Ready for Pickup</h3>
              <p className="text-sm text-blue-700 mb-4">
                This submission is ready! Generate invoices to create unique pickup codes for each customer.
              </p>

              {/* Instructions */}
              <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-gray-900">How to generate pickup codes:</p>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Click the <strong>"Generate Invoice"</strong> button on this submission</li>
                  <li>Review the invoice preview</li>
                  <li>Click <strong>"Send Invoice"</strong></li>
                  <li>Each customer receives their own unique pickup code via email</li>
                </ol>
                <div className="flex items-start gap-2 mt-4 pt-3 border-t border-gray-200">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    Pickup codes are now customer-specific! Each customer gets their own unique code
                    when you send their invoice. Verify codes on the Submissions page.
                  </p>
                </div>
              </div>

              {/* Action hint */}
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-700">
                <FileText className="w-4 h-4" />
                <span>Look for the invoice icon on the submission details to get started</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not ready yet
  return (
    <div className="card bg-gray-50 border-gray-200">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Awaiting PSA</h3>
            <p className="text-sm text-gray-600">
              Pickup codes will be available when grades are ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

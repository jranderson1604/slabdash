import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { submissions, customers } from '../api/client';
import { ArrowLeft, Loader2, Plus, Camera } from 'lucide-react';
import Scanner from '../components/Scanner';

export default function NewSubmission() {
  const navigate = useNavigate();
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [overrideExisting, setOverrideExisting] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    internal_id: '',
    psa_submission_number: '',
    service_level: '',
    date_sent: '',
    notes: '',
  });

  useEffect(() => {
    customers.list({ limit: 100 }).then((res) => {
      setCustomerList(res.data.customers || []);
    });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        customer_id: formData.customer_id || null,
        override_existing: overrideExisting,
      };
      const res = await submissions.create(data);
      navigate(`/submissions/${res.data.id}`);
    } catch (error) {
      console.error('Failed to create submission:', error);

      // Handle duplicate PSA number
      if (error.response?.status === 409 && error.response?.data?.existing_submission_id) {
        const existingId = error.response.data.existing_submission_id;
        const message = error.response.data.message || 'This PSA submission number already exists';

        if (confirm(`${message}\n\nWould you like to view the existing submission?`)) {
          navigate(`/submissions/${existingId}`);
        }
      } else {
        alert(error.response?.data?.error || 'Failed to create submission');
      }
    } finally {
      setLoading(false);
    }
  };

  const serviceLevels = [
    'Value',
    'Value Bulk',
    'Regular',
    'Express',
    'Super Express',
    'Walk-Through',
    'Autograph Authentication',
    'Vintage',
    'Vintage Bulk',
    'TCG Bulk',
    'Reholder',
    'Crossover',
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/submissions" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">New Submission</h1>
          <p className="text-gray-500">Track a new PSA order</p>
        </div>
        <button
          type="button"
          onClick={() => setShowScanner(!showScanner)}
          className="btn btn-secondary gap-2"
        >
          <Camera className="w-4 h-4" />
          {showScanner ? 'Hide Scanner' : 'Scan Form'}
        </button>
      </div>

      {/* Scanner Section */}
      {showScanner && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📷 Scan PSA Form</h2>
          <Scanner onDataScanned={(data) => {
            console.log('Scanned data:', data);
            if (data.customer || data.submission) {
              setFormData({
                ...formData,
                psa_submission_number: data.submission?.psa_number || formData.psa_submission_number,
                service_level: data.submission?.service_level || formData.service_level,
                date_sent: data.customer?.date || formData.date_sent
              });
              alert('Form auto-filled with scanned data!');
            }
          }} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* PSA Submission Number */}
        <div>
          <label htmlFor="psa_submission_number" className="label">
            PSA Submission Number
          </label>
          <input
            type="text"
            id="psa_submission_number"
            name="psa_submission_number"
            value={formData.psa_submission_number}
            onChange={handleChange}
            className="input"
            placeholder="e.g., 12345678"
          />
          <div className="flex items-start gap-3 mt-2">
            <input
              type="checkbox"
              id="override_existing"
              checked={overrideExisting}
              onChange={(e) => setOverrideExisting(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="override_existing" className="text-sm text-gray-700 cursor-pointer">
              <span className="font-medium">Replace existing submission</span> - If a submission with this PSA number already exists, automatically delete it and create a new one
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Required for automatic PSA API updates
          </p>
        </div>

        {/* Internal ID */}
        <div>
          <label htmlFor="internal_id" className="label">
            Internal ID (Optional)
          </label>
          <input
            type="text"
            id="internal_id"
            name="internal_id"
            value={formData.internal_id}
            onChange={handleChange}
            className="input"
            placeholder="e.g., SUB-001"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your own reference number for this submission
          </p>
        </div>

        {/* Customer */}
        <div>
          <label htmlFor="customer_id" className="label">
            Customer (Optional)
          </label>
          <div className="flex gap-2">
            <select
              id="customer_id"
              name="customer_id"
              value={formData.customer_id}
              onChange={handleChange}
              className="input flex-1"
            >
              <option value="">No customer assigned</option>
              {customerList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
            <Link to="/customers/new" className="btn btn-secondary">
              <Plus className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Service Level */}
        <div>
          <label htmlFor="service_level" className="label">
            Service Level
          </label>
          <select
            id="service_level"
            name="service_level"
            value={formData.service_level}
            onChange={handleChange}
            className="input"
          >
            <option value="">Select service level...</option>
            {serviceLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Date Sent */}
        <div>
          <label htmlFor="date_sent" className="label">
            Date Sent to PSA
          </label>
          <input
            type="date"
            id="date_sent"
            name="date_sent"
            value={formData.date_sent}
            onChange={handleChange}
            className="input"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="label">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="input"
            placeholder="Any additional notes about this submission..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link to="/submissions" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn btn-primary gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Submission'
            )}
          </button>
        </div>
      </form>

      {/* Help text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 Pro Tip</h3>
        <p className="text-sm text-blue-800">
          Use the "Scan Form" button above to automatically extract submission details from your PSA form photo!
        </p>
      </div>
    </div>
  );
}
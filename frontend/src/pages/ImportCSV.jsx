import { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import apiClient from '../api/client';

export default function ImportCSV() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [customerId, setCustomerId] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
      setResults(null);
      setError(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setPreviewing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/api/import/psa-csv/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreview(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to preview CSV');
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);
    if (customerId) {
      formData.append('customer_id', customerId);
    }

    try {
      const response = await apiClient.post('/api/import/psa-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(response.data);
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import PSA CSV</h1>
        <p className="text-gray-600">
          Upload a CSV file from PSA to automatically import submissions and card data
        </p>
      </div>

      {/* Upload Section */}
      <div className="card p-8 mb-6">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-brand-600" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload CSV File</h3>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
            Select a PSA CSV export file. The file should contain order numbers, card details, and grades.
          </p>

          <label className="btn btn-primary cursor-pointer">
            <FileText className="w-4 h-4" />
            Choose File
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {file && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}
        </div>

        {file && !preview && !results && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handlePreview}
              disabled={previewing}
              className="btn btn-secondary"
            >
              {previewing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Previewing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Preview Data
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {preview && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CSV Preview</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Total Submissions</p>
              <p className="text-2xl font-bold text-blue-900">{preview.totalSubmissions}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-medium">Total Cards</p>
              <p className="text-2xl font-bold text-green-900">{preview.totalCards}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 font-medium">Avg Cards/Sub</p>
              <p className="text-2xl font-bold text-purple-900">
                {(preview.totalCards / preview.totalSubmissions).toFixed(1)}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link to Customer (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter customer ID to link all submissions"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input w-full md:w-96"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to import without linking to a specific customer
            </p>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="table">
              <thead>
                <tr>
                  <th>PSA Submission #</th>
                  <th>Service Level</th>
                  <th>Cards</th>
                  <th>Sample Cards</th>
                </tr>
              </thead>
              <tbody>
                {preview.submissions.slice(0, 10).map((sub, idx) => (
                  <tr key={idx}>
                    <td className="font-medium">{sub.psa_submission_number}</td>
                    <td>{sub.service_level || '—'}</td>
                    <td>
                      <span className="badge badge-blue">{sub.card_count} cards</span>
                    </td>
                    <td className="text-sm text-gray-600">
                      {sub.sample_cards.map(c => c.description).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.submissions.length > 10 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Showing 10 of {preview.submissions.length} submissions
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn btn-primary"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Import {preview.totalSubmissions} Submissions
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Import Complete!</h3>
              <p className="text-sm text-gray-500">{results.message}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Submissions Created</p>
              <p className="text-2xl font-bold text-gray-900">{results.submissionsCreated}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Submissions Updated</p>
              <p className="text-2xl font-bold text-gray-900">{results.submissionsUpdated}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Cards Created</p>
              <p className="text-2xl font-bold text-gray-900">{results.cardsCreated}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-gray-900">{results.errors?.length || 0}</p>
            </div>
          </div>

          {results.errors && results.errors.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">Import Errors:</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                {results.errors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>
                    {err.submission}: {err.error}
                  </li>
                ))}
              </ul>
              {results.errors.length > 5 && (
                <p className="text-xs text-yellow-700 mt-2">
                  And {results.errors.length - 5} more errors...
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                setResults(null);
                setFile(null);
              }}
              className="btn btn-primary"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* Error Section */}
      {error && (
        <div className="card p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h4 className="font-semibold text-red-900">Import Failed</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card p-6 mt-6 bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">CSV Format Requirements</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• File must be in CSV format (.csv)</li>
          <li>• Required columns: Order # (or Submission #), Player, Grade</li>
          <li>• Optional columns: Service Level, Cert #, Year, Brand, Card #, Variety/Pedigree, Qualifier</li>
          <li>• First row should contain column headers</li>
          <li>• Maximum file size: 5MB</li>
        </ul>
      </div>
    </div>
  );
}

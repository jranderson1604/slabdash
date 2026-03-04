import { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, Info } from 'lucide-react';
import apiClient from '../api/client';

export default function ImportCSV() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [psaSubmissionNumber, setPsaSubmissionNumber] = useState('');

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
      const response = await apiClient.post('/import/psa-csv/preview', formData, {
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
    if (psaSubmissionNumber) {
      formData.append('psa_submission_number', psaSubmissionNumber);
    }

    try {
      const response = await apiClient.post('/import/psa-csv', formData, {
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 shadow-xl mb-2">
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full" style={{ background: 'var(--hdr-circle-1)' }} />
        <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full" style={{ background: 'var(--hdr-circle-2)' }} />
        <div className="relative px-6 sm:px-8 py-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--hdr-eyebrow)' }}>Import</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight" style={{ color: 'var(--hdr-title)' }}>Import PSA CSV</h1>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--hdr-sub)' }}>Upload a CSV export from PSA to automatically import submissions and card data</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card p-8 mb-6">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.12), rgba(255, 107, 89, 0.06))',
              border: '1px solid rgba(255, 129, 112, 0.15)',
            }}
          >
            <Upload className="w-8 h-8" style={{ color: 'rgb(var(--brand-600))' }} />
          </div>

          <h3 className="text-lg font-bold mb-2" style={{ color: 'rgb(var(--dark))' }}>Upload CSV File</h3>
          <p className="text-sm mb-6 text-center max-w-md" style={{ color: 'var(--text-secondary)' }}>
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
            <div className="mt-4 px-5 py-3 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
              }}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm font-semibold" style={{ color: 'rgb(var(--dark))' }}>{file.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
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
          <h3 className="text-lg font-bold mb-4" style={{ color: 'rgb(var(--dark))' }}>CSV Preview</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl"
              style={{
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.12)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'rgba(59, 130, 246, 0.8)' }}>Total Submissions</p>
              <p className="text-2xl font-black" style={{ color: 'rgb(var(--dark))' }}>{preview.totalSubmissions}</p>
            </div>
            <div className="p-4 rounded-2xl"
              style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.12)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'rgba(16, 185, 129, 0.8)' }}>Total Cards</p>
              <p className="text-2xl font-black" style={{ color: 'rgb(var(--dark))' }}>{preview.totalCards}</p>
            </div>
            <div className="p-4 rounded-2xl"
              style={{
                background: 'rgba(139, 92, 246, 0.06)',
                border: '1px solid rgba(139, 92, 246, 0.12)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>Avg Cards/Sub</p>
              <p className="text-2xl font-black" style={{ color: 'rgb(var(--dark))' }}>
                {(preview.totalCards / (preview.totalSubmissions || 1)).toFixed(1)}
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'rgb(var(--dark))' }}>
                PSA Submission Number (Recommended)
              </label>
              <input
                type="text"
                placeholder="Enter your PSA order number (e.g., 12345678)"
                value={psaSubmissionNumber}
                onChange={(e) => setPsaSubmissionNumber(e.target.value)}
                className="input w-full md:w-96"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Enter the real PSA submission/order number from your account. If left empty, a placeholder will be generated.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'rgb(var(--dark))' }}>
                Link to Customer (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter customer ID to link all submissions"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="input w-full md:w-96"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Leave empty to import without linking to a specific customer
              </p>
            </div>
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
                    <td className="font-semibold">{sub.psa_submission_number}</td>
                    <td>{sub.service_level || '—'}</td>
                    <td>
                      <span className="badge badge-blue">{sub.card_count} cards</span>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {sub.sample_cards.map(c => c.description).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.submissions.length > 10 && (
              <p className="text-sm mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
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
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
              }}
            >
              <CheckCircle2 className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>Import Complete!</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{results.message}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Submissions Created</p>
              <p className="text-2xl font-black" style={{ color: 'rgb(var(--dark))' }}>{results.submissionsCreated}</p>
            </div>
            <div className="p-4 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Submissions Updated</p>
              <p className="text-2xl font-black" style={{ color: 'rgb(var(--dark))' }}>{results.submissionsUpdated}</p>
            </div>
            <div className="p-4 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cards Created</p>
              <p className="text-2xl font-black" style={{ color: 'rgb(var(--dark))' }}>{results.cardsCreated}</p>
            </div>
            <div className="p-4 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Errors</p>
              <p className="text-2xl font-black" style={{ color: 'rgb(var(--dark))' }}>{results.errors?.length || 0}</p>
            </div>
          </div>

          {results.errors && results.errors.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl"
              style={{
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
              }}
            >
              <h4 className="text-sm font-bold mb-2" style={{ color: '#B45309' }}>Import Errors:</h4>
              <ul className="text-sm space-y-1" style={{ color: '#92400E' }}>
                {results.errors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>
                    {err.submission}: {err.error}
                  </li>
                ))}
              </ul>
              {results.errors.length > 5 && (
                <p className="text-xs mt-2" style={{ color: '#A16207' }}>
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
        <div className="card p-6 mb-6"
          style={{
            background: 'rgba(239, 68, 68, 0.04)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
          }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6" style={{ color: '#DC2626' }} />
            <div>
              <h4 className="font-bold" style={{ color: '#991B1B' }}>Import Failed</h4>
              <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card p-6 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
          <h3 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>CSV Format Requirements</h3>
        </div>
        <ul className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
          <li>File must be in CSV format (.csv)</li>
          <li>Required columns: Order # (or Submission #), Player, Grade</li>
          <li>Optional columns: Service Level, Cert #, Year, Brand, Card #, Variety/Pedigree, Qualifier</li>
          <li>First row should contain column headers</li>
          <li>Maximum file size: 5MB</li>
        </ul>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardImport, submissions } from '../api/client';
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';

export default function CardImport() {
  const navigate = useNavigate();
  const [submissionList, setSubmissionList] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const res = await submissions.list({ limit: 100 });
      setSubmissionList(res.data.submissions || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await cardImport.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'card_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a CSV file');
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedSubmission) {
      alert('Please select a submission');
      return;
    }

    if (!file) {
      alert('Please select a CSV file');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('csv', file);
      formData.append('submission_id', selectedSubmission);

      const res = await cardImport.uploadCsv(selectedSubmission, formData);
      setResult(res.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.error || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Cards from CSV</h1>
        <p className="text-gray-500 mt-1">
          Bulk upload cards with images using a CSV file
        </p>
      </div>

      {/* Instructions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Import Cards</h2>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>Download the CSV template below</li>
          <li>Fill in your card data (customer_email, psa_cert_number, card_name, year, player_name, etc.)</li>
          <li>Optionally add image URLs in the image_url_1 through image_url_5 columns</li>
          <li>Select a submission to assign the cards to</li>
          <li>Upload your completed CSV file</li>
        </ol>

        <button
          onClick={handleDownloadTemplate}
          className="btn btn-secondary mt-4"
        >
          <Download className="w-4 h-4" />
          Download CSV Template
        </button>
      </div>

      {/* Upload Form */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Upload CSV</h2>

        {/* Select Submission */}
        <div>
          <label className="label">Submission</label>
          <select
            value={selectedSubmission}
            onChange={(e) => setSelectedSubmission(e.target.value)}
            className="input"
          >
            <option value="">Select a submission...</option>
            {submissionList.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.psa_submission_number || sub.tracking_number || `Submission ${sub.id.slice(0, 8)}`}
                {sub.customer_name && ` - ${sub.customer_name}`}
              </option>
            ))}
          </select>
        </div>

        {/* File Input */}
        <div>
          <label className="label">CSV File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="input file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
          />
          {file && (
            <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedSubmission || !file || uploading}
          className="btn btn-primary w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload CSV
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Successfully Imported</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{result.imported}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-900">{result.failed}</p>
            </div>
          </div>

          {/* Successful Imports */}
          {result.results && result.results.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Imported Cards ({result.results.length})
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2 text-sm">
                  {result.results.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Row {item.row}: {item.card_name}</span>
                      {item.psa_cert && <span className="text-gray-400">({item.psa_cert})</span>}
                      {item.images_count > 0 && (
                        <span className="text-xs text-gray-500">• {item.images_count} images</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-700 mb-2">
                Errors ({result.errors.length})
              </h3>
              <div className="bg-red-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2 text-sm">
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-red-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Row {err.row}: {err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setResult(null)}
              className="btn btn-secondary"
            >
              Upload Another
            </button>
            <button
              onClick={() => navigate('/cards')}
              className="btn btn-primary"
            >
              View All Cards
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

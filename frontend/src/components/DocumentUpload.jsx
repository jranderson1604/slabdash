import { useState, useRef } from 'react';
import { Camera, Upload, File, X, CheckCircle2, Loader2 } from 'lucide-react';
import apiClient from '../api/client';

export default function DocumentUpload({ submissionId, customerId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('other');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);

      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (submissionId) formData.append('submission_id', submissionId);
    if (customerId) formData.append('customer_id', customerId);
    formData.append('document_type', documentType);
    if (description) formData.append('description', description);
    formData.append('upload_source', 'web');

    try {
      await apiClient.post('/api/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Reset form
      setFile(null);
      setPreview(null);
      setDescription('');
      setDocumentType('other');

      if (onUploadComplete) {
        onUploadComplete();
      }

      alert('Document uploaded successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload document: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="btn btn-primary"
              >
                <Camera className="w-4 h-4" />
                Take Photo
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Upload invoices, receipts, packing slips, or other documents
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supported formats: JPG, PNG, PDF, HEIC (max 10MB)
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      ) : (
        <div className="border-2 border-brand-200 rounded-lg p-6 bg-brand-50">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                <File className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {preview && (
            <div className="mb-4">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
              />
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="input w-full"
              >
                <option value="invoice">Invoice</option>
                <option value="receipt">Receipt</option>
                <option value="packing_slip">Packing Slip</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a note about this document"
                className="input w-full"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn btn-primary w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

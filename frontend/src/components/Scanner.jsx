import { useState } from 'react';
import { Camera, Loader2, CheckCircle, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Scanner({ onCardsScanned }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`${API_URL}/api/scanner/scan`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Scan failed');
      setResult(data);
      if (onCardsScanned && data.cards) onCardsScanned(data.cards);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleScan(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleScan(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive ? 'border-brand-500 bg-brand-500/10' : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-4">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
              <div>
                <p className="text-lg font-semibold">Scanning form...</p>
                <p className="text-sm text-gray-500">Using AI to extract card details</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-brand-500/10 rounded-full">
                <Camera className="w-8 h-8 text-brand-500" />
              </div>
              <div>
                <p className="text-lg font-semibold mb-1">Scan Submission Form</p>
                <p className="text-sm text-gray-500">Drag & drop or click to upload</p>
                <p className="text-xs text-gray-400 mt-2">Supports JPG, PNG (max 10MB)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {result && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-800 mb-1">Scan Complete!</p>
              <p className="text-sm text-green-700">
                Found {result.cardCount} card{result
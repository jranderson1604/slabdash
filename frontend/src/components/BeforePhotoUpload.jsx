import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Check, Scan, Sparkles, Copy, CheckCheck } from 'lucide-react';

/**
 * BeforePhotoUpload - Upload before photos for cards in customer portal
 */
export default function BeforePhotoUpload({ cardId, token, existingPhotos = [], onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState(existingPhotos);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [selectedPhotoForScan, setSelectedPhotoForScan] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${API_URL}/portal/cards/${cardId}/before-photo?token=${token}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const newPhotos = data.card.before_photos || [];
      setPhotos(newPhotos);
      setPreviewUrl(null);

      if (onUploadComplete) {
        onUploadComplete(data.card);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleScanCard = async (photoUrl) => {
    setScanning(true);
    setScanResults(null);
    setSelectedPhotoForScan(photoUrl);

    try {
      const response = await fetch(`${API_URL}/portal/cards/${cardId}/scan-photo?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoUrl })
      });

      if (!response.ok) {
        throw new Error('Scan failed');
      }

      const data = await response.json();
      setScanResults(data);
    } catch (error) {
      console.error('Scan error:', error);
      alert('Failed to scan card. Please try again.');
      setScanResults({ success: false, error: 'Scan failed' });
    } finally {
      setScanning(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const closeScanResults = () => {
    setScanResults(null);
    setSelectedPhotoForScan(null);
  };

  const hasPhotos = photos && photos.length > 0;

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {!previewUrl && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`photo-upload-${cardId}`}
            disabled={uploading}
          />
          <label
            htmlFor={`photo-upload-${cardId}`}
            className={`block w-full p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
              uploading
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-brand-300 bg-brand-50 hover:border-brand-500 hover:bg-brand-100'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              {uploading ? (
                <>
                  <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
                  <p className="text-brand-700 font-semibold text-lg">Uploading photo...</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-brand-600" />
                  <div className="text-center">
                    <p className="text-brand-700 font-semibold text-lg mb-1">
                      {hasPhotos ? 'Add Another Photo' : 'Upload Card Photo'}
                    </p>
                    <p className="text-brand-600 text-sm">
                      Click to select a photo of your card before grading
                    </p>
                  </div>
                </>
              )}
            </div>
          </label>
        </div>
      )}

      {/* Upload Preview */}
      {previewUrl && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-brand-300 bg-brand-50 p-4">
          <div className="flex items-center gap-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-xl"
            />
            <div className="flex-1">
              <p className="text-brand-700 font-semibold mb-2">Uploading...</p>
              <div className="w-full bg-brand-200 rounded-full h-2">
                <div className="bg-brand-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Photos Gallery */}
      {hasPhotos && !previewUrl && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative group rounded-xl overflow-hidden border-2 border-gray-200 bg-white hover:border-brand-400 transition-all"
            >
              <div className="aspect-square">
                <img
                  src={photo.url}
                  alt={`Before photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Scan Button (hover overlay) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <button
                  onClick={() => handleScanCard(photo.url)}
                  disabled={scanning}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scanning && selectedPhotoForScan === photo.url ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4" />
                      <span>Scan Card</span>
                    </>
                  )}
                </button>
                <p className="text-white text-xs font-medium">
                  {new Date(photo.uploaded_at).toLocaleDateString()}
                </p>
              </div>

              <div className="absolute top-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity">
                <div className="bg-green-500 text-white p-2 rounded-full shadow-lg">
                  <Check className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scan Results Modal */}
      {scanResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Card Scan Results</h3>
                </div>
                <button
                  onClick={closeScanResults}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {scanResults.confidence && (
                <div className="mt-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    scanResults.confidence === 'high' ? 'bg-green-500' :
                    scanResults.confidence === 'medium' ? 'bg-yellow-500' :
                    'bg-orange-500'
                  }`}>
                    {scanResults.confidence.toUpperCase()} Confidence
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {scanResults.success ? (
                <>
                  {/* Detected Information */}
                  <div className="space-y-3">
                    {scanResults.year && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Year</p>
                          <p className="text-lg font-bold text-gray-900">{scanResults.year}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(scanResults.year, 'year')}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {copiedField === 'year' ? (
                            <CheckCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    )}

                    {scanResults.brand && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Brand</p>
                          <p className="text-lg font-bold text-gray-900">{scanResults.brand}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(scanResults.brand, 'brand')}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {copiedField === 'brand' ? (
                            <CheckCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    )}

                    {scanResults.player_name && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Player Name</p>
                          <p className="text-lg font-bold text-gray-900">{scanResults.player_name}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(scanResults.player_name, 'player')}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {copiedField === 'player' ? (
                            <CheckCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    )}

                    {scanResults.card_number && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Card Number</p>
                          <p className="text-lg font-bold text-gray-900">{scanResults.card_number}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(scanResults.card_number, 'number')}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {copiedField === 'number' ? (
                            <CheckCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    )}

                    {scanResults.sport && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Sport/Category</p>
                          <p className="text-lg font-bold text-gray-900 capitalize">{scanResults.sport}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(scanResults.sport, 'sport')}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {copiedField === 'sport' ? (
                            <CheckCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  {scanResults.suggestions && scanResults.suggestions.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-bold text-blue-900 mb-2">Detected Information</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {scanResults.suggestions.map((suggestion, idx) => (
                          <li key={idx}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Help Text */}
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-sm text-purple-800">
                      <strong>Tip:</strong> Click the copy icon next to any value to copy it to your clipboard. You can then use this information when providing card details to your admin.
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <p className="text-amber-900 font-semibold mb-2">
                    {scanResults.message || 'Could not scan card'}
                  </p>
                  <p className="text-sm text-amber-700">
                    {scanResults.error || 'Please ensure the image is clear and well-lit, then try again.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

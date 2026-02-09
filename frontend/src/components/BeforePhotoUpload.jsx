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

              {/* Scan Button (hover overlay) - SAM Themed */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <button
                  onClick={() => handleScanCard(photo.url)}
                  disabled={scanning}
                  className="bg-gradient-to-r from-[#FF8170] to-[#FF6B5A] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:from-[#FF6B5A] hover:to-[#FF5544] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                  {scanning && selectedPhotoForScan === photo.url ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>SAM's analyzing... 🔍</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Ask SAM</span>
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

      {/* Scan Results Modal - SAM Themed */}
      {scanResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-[#FF8170]">
            {/* Header - SAM Themed */}
            <div className="sticky top-0 bg-gradient-to-r from-[#FF8170] to-[#FF6B5A] text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl animate-bounce">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">SAM's Analysis</h3>
                    <p className="text-sm opacity-90">Let me tell you what I found!</p>
                  </div>
                </div>
                <button
                  onClick={closeScanResults}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {scanResults.confidence && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm opacity-90">Confidence Level:</span>
                  <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold shadow-lg ${
                    scanResults.confidence === 'high' ? 'bg-green-500' :
                    scanResults.confidence === 'medium' ? 'bg-yellow-500' :
                    'bg-orange-500'
                  }`}>
                    {scanResults.confidence === 'high' ? '🎯 HIGH' :
                     scanResults.confidence === 'medium' ? '👍 MEDIUM' :
                     '🤔 LOW'}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {scanResults.success ? (
                <>
                  {/* Intro Message from SAM */}
                  <div className="bg-gradient-to-r from-[#FFF5F3] to-[#FFE8E5] border-2 border-[#FF8170] rounded-xl p-4">
                    <p className="text-gray-800 font-medium">
                      <span className="text-2xl mr-2">👋</span>
                      Hey! I scanned your card and here's what I discovered:
                    </p>
                  </div>

                  {/* Detected Information */}
                  <div className="space-y-3">
                    {scanResults.year && (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FFF5F3] to-white rounded-xl border-2 border-[#FFE8E5] hover:border-[#FF8170] transition-colors">
                        <div>
                          <p className="text-xs text-[#FF8170] uppercase font-bold tracking-wider">Year</p>
                          <p className="text-xl font-black text-gray-900 mt-1">{scanResults.year}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(scanResults.year, 'year')}
                          className="p-2 hover:bg-[#FF8170] hover:text-white rounded-lg transition-colors bg-white border-2 border-[#FFE8E5]"
                          title="Copy to clipboard"
                        >
                          {copiedField === 'year' ? (
                            <CheckCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-[#FF8170]" />
                          )}
                        </button>
                      </div>
                    )}

                    {scanResults.brand && (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FFF5F3] to-white rounded-xl border-2 border-[#FFE8E5] hover:border-[#FF8170] transition-colors">
                        <div>
                          <p className="text-xs text-[#FF8170] uppercase font-bold tracking-wider">Brand</p>
                          <p className="text-xl font-black text-gray-900 mt-1">{scanResults.brand}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(scanResults.brand, 'brand')}
                          className="p-2 hover:bg-[#FF8170] hover:text-white rounded-lg transition-colors bg-white border-2 border-[#FFE8E5]"
                          title="Copy to clipboard"
                        >
                          {copiedField === 'brand' ? (
                            <CheckCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-[#FF8170]" />
                          )}
                        </button>
                      </div>
                    )}

                    {scanResults.player_name && (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FFF5F3] to-white rounded-xl border-2 border-[#FFE8E5] hover:border-[#FF8170] transition-colors">
                        <div>
                          <p className="text-xs text-[#FF8170] uppercase font-bold tracking-wider">Player Name</p>
                          <p className="text-xl font-black text-gray-900 mt-1">{scanResults.player_name}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(scanResults.player_name, 'player')}
                          className="p-2 hover:bg-[#FF8170] hover:text-white rounded-lg transition-colors bg-white border-2 border-[#FFE8E5]"
                          title="Copy to clipboard"
                        >
                          {copiedField === 'player' ? (
                            <CheckCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-[#FF8170]" />
                          )}
                        </button>
                      </div>
                    )}

                    {scanResults.card_number && (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FFF5F3] to-white rounded-xl border-2 border-[#FFE8E5] hover:border-[#FF8170] transition-colors">
                        <div>
                          <p className="text-xs text-[#FF8170] uppercase font-bold tracking-wider">Card Number</p>
                          <p className="text-xl font-black text-gray-900 mt-1">{scanResults.card_number}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(scanResults.card_number, 'number')}
                          className="p-2 hover:bg-[#FF8170] hover:text-white rounded-lg transition-colors bg-white border-2 border-[#FFE8E5]"
                          title="Copy to clipboard"
                        >
                          {copiedField === 'number' ? (
                            <CheckCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-[#FF8170]" />
                          )}
                        </button>
                      </div>
                    )}

                    {scanResults.sport && (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FFF5F3] to-white rounded-xl border-2 border-[#FFE8E5] hover:border-[#FF8170] transition-colors">
                        <div>
                          <p className="text-xs text-[#FF8170] uppercase font-bold tracking-wider">Sport/Category</p>
                          <p className="text-xl font-black text-gray-900 mt-1 capitalize">{scanResults.sport}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(scanResults.sport, 'sport')}
                          className="p-2 hover:bg-[#FF8170] hover:text-white rounded-lg transition-colors bg-white border-2 border-[#FFE8E5]"
                          title="Copy to clipboard"
                        >
                          {copiedField === 'sport' ? (
                            <CheckCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-[#FF8170]" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Suggestions - SAM Style */}
                  {scanResults.suggestions && scanResults.suggestions.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">💡</span>
                        <h4 className="font-bold text-blue-900 text-lg">What I Found</h4>
                      </div>
                      <ul className="text-sm text-blue-900 space-y-2">
                        {scanResults.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">✓</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Help Text - SAM Personality */}
                  <div className="bg-gradient-to-r from-[#FFF5F3] to-[#FFE8E5] border-2 border-[#FF8170] rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">🤖</span>
                      <div>
                        <p className="text-sm text-gray-800 font-medium">
                          <strong className="text-[#FF8170]">SAM's Tip:</strong> Click any copy button to grab that info! You can paste it anywhere you need. Just trying to make your life easier! 😊
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">😅</div>
                    <p className="text-amber-900 font-bold text-lg mb-2">
                      Oops! I had trouble reading this card
                    </p>
                    <p className="text-sm text-amber-800 mb-4">
                      {scanResults.message || scanResults.error || 'The image might be a bit blurry or dark for me to read clearly.'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-[#FFF5F3] to-[#FFE8E5] border-2 border-[#FF8170] rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">💭</span>
                      <div className="text-sm text-gray-800">
                        <p className="font-bold text-[#FF8170] mb-2">Here's what helps me see better:</p>
                        <ul className="space-y-1 text-gray-700">
                          <li>• Good lighting (natural light works great!)</li>
                          <li>• Clear, focused photo</li>
                          <li>• Card fills most of the frame</li>
                          <li>• No glare or shadows on the text</li>
                        </ul>
                        <p className="mt-3 font-medium">Try taking another photo and I'll give it my best shot! 📸</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

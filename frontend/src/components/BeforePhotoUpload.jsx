import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Check } from 'lucide-react';

/**
 * BeforePhotoUpload - Upload before photos for cards in customer portal
 */
export default function BeforePhotoUpload({ cardId, token, existingPhotos = [], onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState(existingPhotos);
  const [previewUrl, setPreviewUrl] = useState(null);
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <p className="text-white text-xs font-medium">
                  {new Date(photo.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              <div className="absolute top-2 right-2">
                <div className="bg-green-500 text-white p-2 rounded-full shadow-lg">
                  <Check className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

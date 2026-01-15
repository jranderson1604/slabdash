import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cards } from '../api/client';
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  ExternalLink,
  Save,
  Trash2,
} from 'lucide-react';

export default function CardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const fileInputRef = useRef(null);

  const loadCard = async () => {
    try {
      const res = await cards.get(id);
      setCard(res.data);
      setFormData({
        description: res.data.description || '',
        year: res.data.year || '',
        brand: res.data.brand || '',
        player_name: res.data.player_name || '',
        card_number: res.data.card_number || '',
        grade: res.data.grade || '',
        psa_cert_number: res.data.psa_cert_number || '',
        notes: res.data.notes || '',
      });
    } catch (error) {
      console.error('Failed to load card:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCard();
  }, [id]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = [...e.dataTransfer.files].filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      await uploadImages(files);
    }
  };

  const handleFileInput = async (e) => {
    const files = [...e.target.files];
    if (files.length > 0) {
      await uploadImages(files);
    }
  };

  const uploadImages = async (files) => {
    if (files.length > 5) {
      alert('Maximum 5 images at a time');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));

      const res = await cards.uploadImages(id, formData);
      setCard(res.data.card);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageIndex) => {
    if (!confirm('Delete this image?')) return;

    try {
      const res = await cards.deleteImage(id, imageIndex);
      setCard(res.data.card);
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image');
    }
  };

  const handleSave = async () => {
    try {
      const res = await cards.update(id, formData);
      setCard(res.data);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update card:', error);
      alert('Failed to update card');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this card? This cannot be undone.')) return;

    try {
      await cards.delete(id);
      navigate('/cards');
    } catch (error) {
      console.error('Failed to delete card:', error);
      alert('Failed to delete card');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Card not found</p>
        <Link to="/cards" className="text-brand-600 hover:underline mt-2 inline-block">
          Back to Cards
        </Link>
      </div>
    );
  }

  const images = card.card_images || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/cards" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{card.description}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {card.year} {card.brand} {card.player_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} className="btn btn-primary">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn btn-secondary">
                Edit Details
              </button>
              <button onClick={handleDelete} className="btn btn-secondary text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Card Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Card Info */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Card Information</h2>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Year</label>
                  <input
                    type="text"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Player Name</label>
                <input
                  type="text"
                  value={formData.player_name}
                  onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Card Number</label>
                  <input
                    type="text"
                    value={formData.card_number}
                    onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Grade</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">PSA Cert Number</label>
                <input
                  type="text"
                  value={formData.psa_cert_number}
                  onChange={(e) => setFormData({ ...formData, psa_cert_number: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows="3"
                />
              </div>
            </div>
          ) : (
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wider">Year</dt>
                <dd className="text-gray-900 mt-1">{card.year || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wider">Brand</dt>
                <dd className="text-gray-900 mt-1">{card.brand || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wider">Player</dt>
                <dd className="text-gray-900 mt-1">{card.player_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wider">Card Number</dt>
                <dd className="text-gray-900 mt-1">{card.card_number || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wider">Grade</dt>
                <dd className="text-gray-900 mt-1 font-bold text-lg">{card.grade || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wider">PSA Cert #</dt>
                <dd className="mt-1">
                  {card.psa_cert_number ? (
                    <a
                      href={`https://www.psacard.com/cert/${card.psa_cert_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      {card.psa_cert_number}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </dd>
              </div>
              {card.notes && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Notes</dt>
                  <dd className="text-gray-900 mt-1 text-sm">{card.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Right: Images */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Card Images</h2>

          {/* Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />

            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 animate-spin text-brand-500 mb-4" />
                <p className="text-gray-600">Uploading images...</p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900 font-medium mb-1">
                  Drag and drop images here
                </p>
                <p className="text-gray-500 text-sm mb-4">or click to browse</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                >
                  <Upload className="w-4 h-4" />
                  Choose Files
                </button>
                <p className="text-xs text-gray-400 mt-2">Max 5 images at a time</p>
              </>
            )}
          </div>

          {/* Image Gallery */}
          {images.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-medium text-gray-700">
                Uploaded Images ({images.length})
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Card ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => handleDeleteImage(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length === 0 && !uploading && (
            <div className="mt-6 text-center py-8">
              <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No images uploaded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

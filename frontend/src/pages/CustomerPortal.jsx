import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import BeforePhotoUpload from '../components/BeforePhotoUpload';
import CompLookup from '../components/CompLookup';
import SAMChatInterface from '../components/SAMChatInterface';
import {
  Package, Loader2, AlertTriangle, CheckCircle2, Clock, DollarSign,
  ChevronDown, ChevronUp, Key, Sparkles, Image as ImageIcon, Upload, X, Search, Grid,
  FileText, MessageSquare, Camera, Bot
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Submission Card Component
function SubmissionCard({ submission, onExpand, isExpanded }) {
  const getStatusConfig = () => {
    if (submission.shipped) return {
      color: 'from-emerald-500 to-green-600',
      text: 'Delivered',
      icon: CheckCircle2,
      bgLight: 'bg-emerald-50',
      textLight: 'text-emerald-700',
      borderLight: 'border-emerald-200'
    };
    if (submission.grades_ready) return {
      color: 'from-blue-500 to-indigo-600',
      text: 'Ready for Pickup',
      icon: Sparkles,
      bgLight: 'bg-blue-50',
      textLight: 'text-blue-700',
      borderLight: 'border-blue-200'
    };
    if (submission.problem_order) return {
      color: 'from-red-500 to-rose-600',
      text: 'Needs Attention',
      icon: AlertTriangle,
      bgLight: 'bg-red-50',
      textLight: 'text-red-700',
      borderLight: 'border-red-200'
    };
    return {
      color: 'from-amber-500 to-orange-600',
      text: submission.current_step || 'Processing',
      icon: Clock,
      bgLight: 'bg-amber-50',
      textLight: 'text-amber-700',
      borderLight: 'border-amber-200'
    };
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;
  const showPickupCode = submission.grades_ready && !submission.picked_up && submission.pickup_code;

  return (
    <div className="group bg-white rounded-3xl shadow-wix hover:shadow-wix-lg transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1">
      {/* Header */}
      <div
        className="p-10 cursor-pointer"
        onClick={onExpand}
      >
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <h3 className="text-4xl font-black text-gray-900 mb-3 group-hover:text-brand-600 transition-colors leading-tight">
              {submission.psa_submission_number || submission.internal_id || 'Submission'}
            </h3>
            <p className="text-gray-600 text-xl font-medium">{submission.service_level || 'Standard Service'}</p>
          </div>
          <div className={`px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-r ${status.color} shadow-wix flex items-center gap-2.5`}>
            <StatusIcon className="w-6 h-6" />
            <span className="text-lg">{status.text}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-bold text-gray-600">Progress</span>
            <span className="text-3xl font-black bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
              {submission.progress_percent || 0}%
            </span>
          </div>
          <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div
              className={`absolute top-0 left-0 h-full bg-gradient-to-r ${status.color} rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${submission.progress_percent || 0}%` }}
            >
              <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <span className="text-gray-500 font-medium">Cards</span>
              <span className="ml-3 font-black text-gray-900 text-2xl">{submission.card_count || 0}</span>
            </div>
            {submission.date_sent && (
              <div className="text-gray-600 font-medium text-lg">
                Sent {format(new Date(submission.date_sent), 'MMM d, yyyy')}
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700 transition-colors text-lg">
            {isExpanded ? (
              <>
                <span>Hide Details</span>
                <ChevronUp className="w-6 h-6" />
              </>
            ) : (
              <>
                <span>View Details</span>
                <ChevronDown className="w-6 h-6" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pickup Alert */}
      {showPickupCode && (
        <div className="px-8 pb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-2xl p-6 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <Key className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="text-2xl font-bold text-white">Ready for Pickup!</h4>
              </div>
              <p className="text-emerald-50 mb-4 text-lg">Your pickup code:</p>
              <div className="bg-white rounded-xl p-6 shadow-xl">
                <p className="text-center text-6xl font-black text-emerald-600 tracking-[0.25em] font-mono">
                  {submission.pickup_code}
                </p>
              </div>
              <p className="text-center text-white mt-4 text-sm">
                Show this code when you arrive to pick up your cards
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
          <div className="p-8 space-y-8">
            {/* QR Code */}
            {showPickupCode && (
              <div className="flex justify-center">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-4">Scan at pickup</p>
                  <div className="bg-white p-6 rounded-2xl shadow-lg inline-block border border-gray-200">
                    <QRCodeSVG
                      value={JSON.stringify({
                        type: 'slabdash_pickup',
                        submission_id: submission.id,
                        pickup_code: submission.pickup_code,
                        submission_number: submission.psa_submission_number || submission.internal_id
                      })}
                      size={220}
                      level="H"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Progress Timeline */}
            {submission.steps?.length > 0 && (
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-5">Progress Timeline</h4>
                <div className="space-y-4">
                  {submission.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${
                        step.completed
                          ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {step.completed ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <span className="font-bold">{i + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`font-semibold text-lg ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.step_name}
                        </p>
                        {step.completed_at && (
                          <p className="text-sm text-gray-500 mt-1">
                            {format(new Date(step.completed_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Notes for Submission */}
            {(submission.admin_notes || submission.prep_notes) && (
              <div className="space-y-4">
                {submission.admin_notes && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-6">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-blue-900 mb-2">Admin Notes</h4>
                        <p className="text-blue-800 whitespace-pre-wrap">{submission.admin_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
                {submission.prep_notes && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-6">
                    <div className="flex items-start gap-3">
                      <FileText className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-amber-900 mb-2">Prep Review Notes</h4>
                        <p className="text-amber-800 whitespace-pre-wrap">{submission.prep_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cards */}
            {submission.cards?.length > 0 && (
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-5">
                  Cards <span className="text-gray-400">({submission.cards.length})</span>
                </h4>
                <div className="grid gap-6">
                  {submission.cards.map((card) => (
                    <div key={card.id} className="bg-white rounded-2xl border-2 border-gray-200 hover:border-brand-300 hover:shadow-xl transition-all overflow-hidden">
                      {/* Card Header */}
                      <div className="flex items-start justify-between p-6 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex-1">
                          <h5 className="text-xl font-bold text-gray-900 mb-2">
                            {card.player_name || card.description || 'Card'}
                          </h5>
                          {(card.year || card.brand) && (
                            <p className="text-gray-600 font-medium">
                              {card.year} {card.brand} {card.card_number ? `#${card.card_number}` : ''}
                            </p>
                          )}
                          {card.psa_cert_number && (
                            <p className="text-sm text-gray-500 mt-1">Cert #{card.psa_cert_number}</p>
                          )}
                          {card.price_estimate && (
                            <div className="mt-3 inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-bold">${parseFloat(card.price_estimate).toFixed(2)}</span>
                              <span className="text-sm">est. value</span>
                            </div>
                          )}
                        </div>
                        {card.grade && (
                          <div className="text-right">
                            <div className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
                              {card.grade}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">PSA GRADE</div>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-6 space-y-6">
                        {/* Admin Notes for this Card */}
                        {card.admin_notes && (
                          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-4">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h6 className="font-bold text-blue-900 mb-1">Admin Notes</h6>
                                <p className="text-blue-800 text-sm whitespace-pre-wrap">{card.admin_notes}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Prep Notes for this Card */}
                        {card.prep_notes && (
                          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4">
                            <div className="flex items-start gap-2">
                              <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h6 className="font-bold text-amber-900 mb-1">Prep Review</h6>
                                <p className="text-amber-800 text-sm whitespace-pre-wrap">{card.prep_notes}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Before Photos Section */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                          <div className="flex items-center gap-2 mb-4">
                            <Camera className="w-5 h-5 text-purple-600" />
                            <h6 className="font-bold text-purple-900">Before Photos</h6>
                            <span className="text-sm text-purple-600">
                              {card.before_photos?.length || 0} photo{card.before_photos?.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <BeforePhotoUpload
                            cardId={card.id}
                            token={searchParams.get('token')}
                            existingPhotos={card.before_photos || []}
                            onUploadComplete={(updatedCard) => {
                              // Refresh the portal data to show the new photo
                              loadPortalData();
                            }}
                          />
                        </div>

                        {/* Price Comps Section */}
                        <CompLookup
                          cardId={card.id}
                          token={searchParams.get('token')}
                          initialCard={card}
                          onUpdate={(updatedCard) => {
                            // Refresh the portal data to show updated price
                            loadPortalData();
                          }}
                          readOnly={true}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            {(submission.return_tracking || submission.psa_order_number) && (
              <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
                {submission.return_tracking && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Return Tracking</p>
                    <p className="font-semibold text-gray-900">{submission.return_tracking}</p>
                  </div>
                )}
                {submission.psa_order_number && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">PSA Order Number</p>
                    <p className="font-semibold text-gray-900">{submission.psa_order_number}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Buyback Card
function BuybackCard({ offer, onRespond }) {
  const [responding, setResponding] = useState(false);

  const handleResponse = async (response) => {
    if (!confirm(`${response === 'accepted' ? 'Accept' : 'Decline'} this offer for $${offer.offer_price}?`)) {
      return;
    }
    setResponding(true);
    try {
      await onRespond(offer.id, response);
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-8 border border-gray-100">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {offer.card_description || offer.player_name || 'Card'}
          </h3>
          {offer.card_grade && (
            <p className="text-gray-600 text-lg">PSA {offer.card_grade}</p>
          )}
          {offer.psa_cert_number && (
            <p className="text-sm text-gray-500 mt-1">Cert #{offer.psa_cert_number}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
            ${parseFloat(offer.offer_price).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 font-medium mt-1">OFFER PRICE</p>
        </div>
      </div>

      {offer.notes && (
        <div className="bg-gray-50 rounded-xl p-5 mb-6">
          <p className="text-gray-700 leading-relaxed">{offer.notes}</p>
        </div>
      )}

      {offer.status === 'pending' && (
        <div className="flex gap-4">
          <button
            onClick={() => handleResponse('accepted')}
            disabled={responding}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {responding ? 'Processing...' : 'Accept Offer'}
          </button>
          <button
            onClick={() => handleResponse('rejected')}
            disabled={responding}
            className="flex-1 bg-gray-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-700 hover:shadow-xl transition-all disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {offer.status !== 'pending' && (
        <div className={`text-center py-4 rounded-xl font-bold text-lg ${
          offer.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
          offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
        </div>
      )}
    </div>
  );
}

// Card Gallery Card Component
function CardGalleryCard({ card, token, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);
  const fileInputRef = useRef(null);

  const images = card.card_images ? (Array.isArray(card.card_images) ? card.card_images : JSON.parse(card.card_images)) : [];
  const displayImages = showAllImages ? images : images.slice(0, 3);

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

      const response = await fetch(`${API_URL}/portal/cards/${card.id}/images?token=${token}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      if (onUploadComplete) onUploadComplete(result.card);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
      {/* Card Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {card.player_name || card.description || 'Card'}
            </h3>
            {(card.year || card.brand) && (
              <p className="text-gray-600 text-sm">
                {card.year} {card.brand}
              </p>
            )}
            {card.psa_submission_number && (
              <p className="text-xs text-gray-500 mt-1">
                Submission: {card.psa_submission_number}
              </p>
            )}
            {card.psa_cert_number && (
              <p className="text-xs text-gray-500">
                Cert #{card.psa_cert_number}
              </p>
            )}
          </div>
          {card.grade && (
            <div className="text-right">
              <div className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
                {card.grade}
              </div>
              <div className="text-xs text-gray-500 font-medium">PSA GRADE</div>
            </div>
          )}
        </div>

        {/* Images Grid */}
        {images.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {displayImages.map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={url} alt={`Card ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {images.length > 3 && (
              <button
                onClick={() => setShowAllImages(!showAllImages)}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                {showAllImages ? 'Show less' : `+${images.length - 3} more`}
              </button>
            )}
          </div>
        )}

        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
            dragActive
              ? 'border-brand-500 bg-brand-50'
              : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-2" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700 mb-1">Upload Card Photos</p>
              <p className="text-xs text-gray-500 mb-3">Drag & drop or click to browse</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Choose Files
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Portal
export default function CustomerPortal() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [cards, setCards] = useState([]);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [cardSearch, setCardSearch] = useState('');
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions', 'sam', 'cards'
  const [hasSAMAccess, setHasSAMAccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    loadPortalData();
  }, [token]);

  const loadPortalData = async () => {
    try {
      const response = await fetch(`${API_URL}/portal/access?token=${token}`);
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to load portal');

      setData(result);

      // Check if customer has SAM access (based on company subscription)
      if (result.company?.has_sam_addon || result.company?.sam_enabled) {
        setHasSAMAccess(true);
      }

      // Load cards separately
      try {
        const cardsResponse = await fetch(`${API_URL}/portal/cards?token=${token}`);
        if (cardsResponse.ok) {
          const cardsData = await cardsResponse.json();
          setCards(cardsData);
        }
      } catch (err) {
        console.error('Failed to load cards:', err);
      }

      setLoading(false);
    } catch (error) {
      console.error('Portal load error:', error);
      setLoading(false);
    }
  };

  const handleBuybackResponse = async (offerId, response) => {
    try {
      await fetch(`${API_URL}/portal/buyback-offers/${offerId}/respond?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });
      loadPortalData();
    } catch (error) {
      alert('Failed to respond to offer');
    }
  };

  const handleCardUploadComplete = (updatedCard) => {
    setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
  };

  // Filter cards based on search
  const filteredCards = cards.filter(card => {
    if (!cardSearch) return true;
    const searchLower = cardSearch.toLowerCase();
    return (
      (card.player_name?.toLowerCase().includes(searchLower)) ||
      (card.description?.toLowerCase().includes(searchLower)) ||
      (card.brand?.toLowerCase().includes(searchLower)) ||
      (card.year?.toString().includes(searchLower)) ||
      (card.psa_cert_number?.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-20 h-20 animate-spin text-brand-500 mx-auto mb-6" />
          <p className="text-2xl font-semibold text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md text-center">
          <AlertTriangle className="w-24 h-24 text-red-500 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Invalid Link</h2>
          <p className="text-gray-600 text-lg mb-2">This portal link is invalid or has expired.</p>
          <p className="text-sm text-gray-500">Please contact the shop for a new link.</p>
        </div>
      </div>
    );
  }

  const activeSubmissions = data.submissions.filter(s => !s.shipped);
  const completedSubmissions = data.submissions.filter(s => s.shipped);
  const pendingOffers = data.buybackOffers.filter(o => o.status === 'pending');
  const hasCards = filteredCards.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-600 relative overflow-hidden shadow-wix-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-10 rounded-full -ml-32 -mb-32"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-10 fade-in">
            <h1 className="text-6xl sm:text-7xl font-black text-white mb-4 tracking-tight drop-shadow-lg">
              {data.company.name}
            </h1>
            <p className="text-brand-50 text-2xl font-bold">Customer Portal</p>
          </div>
          <div className="max-w-lg mx-auto bg-white/20 backdrop-blur-xl rounded-3xl p-8 text-center border-2 border-white/30 shadow-wix-lg scale-in">
            <p className="font-black text-white text-3xl mb-2">{data.customer.name}</p>
            <p className="text-brand-50 text-xl font-medium">{data.customer.email}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-6 py-4 font-bold text-lg transition-all border-b-4 ${
                activeTab === 'submissions'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                <span>My Submissions</span>
              </div>
            </button>

            {hasSAMAccess && (
              <button
                onClick={() => setActiveTab('sam')}
                className={`px-6 py-4 font-bold text-lg transition-all border-b-4 relative ${
                  activeTab === 'sam'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <span>Ask SAM</span>
                  <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                    AI
                  </span>
                </div>
              </button>
            )}

            {hasCards && (
              <button
                onClick={() => setActiveTab('cards')}
                className={`px-6 py-4 font-bold text-lg transition-all border-b-4 ${
                  activeTab === 'cards'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Grid className="w-5 h-5" />
                  <span>My Cards</span>
                  <span className="ml-2 text-sm text-gray-400">({cards.length})</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-20 space-y-24">
        {/* SAM Assistant Tab */}
        {activeTab === 'sam' && hasSAMAccess && (
          <div className="h-[calc(100vh-300px)] min-h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-200">
            <SAMChatInterface isCustomerPortal={true} token={token} />
          </div>
        )}

        {/* My Cards Tab */}
        {activeTab === 'cards' && hasCards && (
          <section>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Grid className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-4xl font-black text-gray-900">My Cards</h2>
                <p className="text-gray-500 text-lg mt-1">{cards.length} total cards</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by player, description, brand, year, or cert number..."
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all text-lg"
                />
                {cardSearch && (
                  <button
                    onClick={() => setCardSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              {cardSearch && (
                <p className="text-sm text-gray-600 mt-3">
                  Showing {filteredCards.length} of {cards.length} cards
                </p>
              )}
            </div>

            {/* Cards Grid */}
            {filteredCards.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center">
                <ImageIcon className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No cards found</h3>
                <p className="text-gray-500 text-lg">
                  {cardSearch ? 'Try a different search term' : 'Your cards will appear here'}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCards.map((card) => (
                  <CardGalleryCard
                    key={card.id}
                    card={card}
                    token={token}
                    onUploadComplete={handleCardUploadComplete}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Submissions Tab - Active Submissions */}
        {activeTab === 'submissions' && (
          <>
        <section className="slide-up">
          <div className="flex items-center gap-5 mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl flex items-center justify-center shadow-wix">
              <Package className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-5xl font-black text-gray-900 leading-tight">My Submissions</h2>
              {activeSubmissions.length > 0 && (
                <p className="text-gray-600 text-xl mt-2 font-medium">{activeSubmissions.length} active</p>
              )}
            </div>
          </div>

          {activeSubmissions.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border-2 border-dashed border-gray-200 p-20 text-center shadow-sm">
              <Package className="w-32 h-32 text-gray-300 mx-auto mb-8" />
              <h3 className="text-4xl font-black text-gray-900 mb-4">No Active Submissions</h3>
              <p className="text-gray-600 text-xl font-medium">Your submissions will appear here once you drop off cards</p>
            </div>
          ) : (
            <div className="space-y-8">
              {activeSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  isExpanded={expandedSubmission === submission.id}
                  onExpand={() => setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Buyback Offers */}
        {pendingOffers.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-black text-gray-900">Buyback Offers</h2>
                <p className="text-gray-500 text-lg mt-1">{pendingOffers.length} pending</p>
              </div>
            </div>
            <div className="grid gap-6">
              {pendingOffers.map((offer) => (
                <BuybackCard key={offer.id} offer={offer} onRespond={handleBuybackResponse} />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completedSubmissions.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <h3 className="text-2xl font-bold text-gray-700">
                Completed Submissions ({completedSubmissions.length})
              </h3>
            </div>
            <div className="grid gap-4">
              {completedSubmissions.map((submission) => (
                <div key={submission.id} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">
                      {submission.psa_submission_number || submission.internal_id}
                    </h4>
                    <p className="text-gray-500">{submission.card_count || 0} cards</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
              ))}
            </div>
          </section>
        )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-24">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          <p className="text-gray-600">Questions? Contact <span className="font-semibold text-gray-900">{data.company.name}</span></p>
        </div>
      </div>
    </div>
  );
}

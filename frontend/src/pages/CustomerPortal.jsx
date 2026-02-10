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
  FileText, MessageSquare, Camera, Bot, Bell, BellOff, Truck, ArrowRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// PSA Pipeline Steps (in order)
const PSA_STEPS = [
  'Arrived at PSA',
  'Order Prep',
  'Research & ID',
  'Grading',
  'Assembly',
  'QA',
  'Shipped'
];

// Match a submission's current_step to the pipeline index
function getStepIndex(currentStep) {
  if (!currentStep) return -1;
  const lower = currentStep.toLowerCase();
  if (lower.includes('arrived')) return 0;
  if (lower.includes('order prep')) return 1;
  if (lower.includes('research')) return 2;
  if (lower.includes('grading')) return 3;
  if (lower.includes('assembly')) return 4;
  if (lower.includes('qa') || lower.includes('quality')) return 5;
  if (lower.includes('shipped') || lower.includes('complete')) return 6;
  return -1;
}

// Service level config for badges
function getServiceLevelStyle(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('walk') || l.includes('through')) return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)', text: '#7C3AED', label: level || 'Walk-Through' };
  if (l.includes('super') || l.includes('express')) return { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.18)', text: '#DC2626', label: level || 'Super Express' };
  if (l.includes('express')) return { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.18)', text: '#D97706', label: level || 'Express' };
  if (l.includes('regular')) return { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.18)', text: '#2563EB', label: level || 'Regular' };
  if (l.includes('value')) return { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.18)', text: '#059669', label: level || 'Value' };
  if (l.includes('bulk')) return { bg: 'rgba(107, 114, 128, 0.08)', border: 'rgba(107, 114, 128, 0.18)', text: '#4B5563', label: level || 'Bulk' };
  return { bg: 'rgba(107, 114, 128, 0.06)', border: 'rgba(107, 114, 128, 0.12)', text: '#6B7280', label: level || 'Standard' };
}

// Submission Card Component — redesigned with visual PSA pipeline
function SubmissionCard({ submission, onExpand, isExpanded, token, onRefresh }) {
  const currentStepIdx = getStepIndex(submission.current_step);
  const isShipped = submission.shipped;
  const isGradesReady = submission.grades_ready;
  const isProblem = submission.problem_order;
  const showPickupCode = isGradesReady && !submission.picked_up && submission.pickup_code;
  const serviceLevelStyle = getServiceLevelStyle(submission.service_level);

  // Status label
  let statusLabel = submission.current_step || 'Processing';
  let statusColor = '#D97706';
  if (isShipped) { statusLabel = 'Delivered'; statusColor = '#059669'; }
  else if (isGradesReady) { statusLabel = 'Grades Ready'; statusColor = '#2563EB'; }
  else if (isProblem) { statusLabel = 'Needs Attention'; statusColor = '#DC2626'; }

  return (
    <div className="rounded-3xl overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.45)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)',
      }}>
      {/* Header: Submission # + Service Level + Status */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-2xl font-black" style={{ color: 'rgb(var(--dark))' }}>
              {submission.psa_submission_number || submission.internal_id || 'Submission'}
            </h3>
            <span className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: serviceLevelStyle.bg, border: `1px solid ${serviceLevelStyle.border}`, color: serviceLevelStyle.text }}
            >
              {serviceLevelStyle.label}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold shrink-0"
            style={{ background: `${statusColor}10`, color: statusColor, border: `1px solid ${statusColor}20` }}
          >
            {isShipped ? <CheckCircle2 className="w-4 h-4" /> :
             isGradesReady ? <Sparkles className="w-4 h-4" /> :
             isProblem ? <AlertTriangle className="w-4 h-4" /> :
             <Clock className="w-4 h-4" />}
            {statusLabel}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>
          <span className="font-semibold">{submission.card_count || 0} card{(submission.card_count || 0) !== 1 ? 's' : ''}</span>
          {submission.date_sent && (
            <span>Sent {format(new Date(submission.date_sent), 'MMM d, yyyy')}</span>
          )}
        </div>
      </div>

      {/* PSA Pipeline — always visible */}
      {!isShipped && (
        <div className="px-6 pb-5">
          <div className="flex items-center gap-0.5">
            {PSA_STEPS.map((step, i) => {
              const isCompleted = i < currentStepIdx || (i === currentStepIdx && isGradesReady && i === PSA_STEPS.length - 1);
              const isCurrent = i === currentStepIdx && !isGradesReady;
              const isFuture = i > currentStepIdx;
              const isLast = i === PSA_STEPS.length - 1;

              return (
                <div key={step} className="flex items-center flex-1 min-w-0">
                  {/* Step dot + label */}
                  <div className="flex flex-col items-center min-w-0 flex-1">
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                        style={{
                          background: isCompleted
                            ? 'linear-gradient(135deg, #10B981, #059669)'
                            : isCurrent
                              ? 'linear-gradient(135deg, rgb(var(--brand-500)), rgb(var(--brand-600)))'
                              : 'rgba(0,0,0,0.06)',
                          color: isCompleted || isCurrent ? '#fff' : 'rgba(44, 36, 22, 0.25)',
                          boxShadow: isCurrent ? '0 0 0 3px rgba(var(--brand-500), 0.2), 0 2px 8px rgba(0,0,0,0.1)' : 'none',
                        }}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      {isCurrent && (
                        <div className="absolute -inset-1 rounded-full animate-ping opacity-20"
                          style={{ background: 'rgb(var(--brand-500))' }}
                        />
                      )}
                    </div>
                    <span className="text-[9px] font-semibold mt-1 text-center leading-tight truncate w-full px-0.5"
                      style={{
                        color: isCompleted ? '#059669' : isCurrent ? 'rgb(var(--brand-600))' : 'rgba(44, 36, 22, 0.25)',
                      }}
                    >
                      {step.replace('Research & ID', 'Research').replace('Arrived at PSA', 'Arrived')}
                    </span>
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div className="h-0.5 flex-shrink-0 mx-0.5 rounded-full transition-all"
                      style={{
                        width: '12px',
                        minWidth: '8px',
                        background: isCompleted ? '#10B981' : 'rgba(0,0,0,0.06)',
                        marginTop: '-14px',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shipped/Delivered banner */}
      {isShipped && (
        <div className="mx-6 mb-4 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)' }}
        >
          <Truck className="w-5 h-5" style={{ color: '#059669' }} />
          <span className="font-bold text-sm" style={{ color: '#059669' }}>
            Delivered
          </span>
          {submission.return_tracking && (
            <span className="text-xs ml-auto" style={{ color: '#059669' }}>
              Tracking: {submission.return_tracking}
            </span>
          )}
        </div>
      )}

      {/* Pickup Alert */}
      {showPickupCode && (
        <div className="px-6 pb-4">
          <div className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, #059669, #10B981)',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.25)',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Key className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg">Ready for Pickup</p>
                <p className="text-white/70 text-xs">Show this code when you arrive</p>
              </div>
              <div className="px-5 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.95)' }}>
                <p className="text-2xl font-black tracking-[0.15em] font-mono" style={{ color: '#059669' }}>
                  {submission.pickup_code}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expand/Collapse Toggle */}
      <button
        onClick={onExpand}
        className="w-full px-6 py-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors"
        style={{
          color: 'rgb(var(--brand-600))',
          borderTop: '1px solid rgba(0,0,0,0.04)',
          background: isExpanded ? 'rgba(0,0,0,0.015)' : 'transparent',
        }}
      >
        {isExpanded ? (
          <><span>Hide Details</span><ChevronUp className="w-4 h-4" /></>
        ) : (
          <><span>View Cards & Details</span><ChevronDown className="w-4 h-4" /></>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', background: 'rgba(0,0,0,0.01)' }}>
          <div className="p-6 space-y-6">
            {/* QR Code */}
            {showPickupCode && (
              <div className="flex justify-center">
                <div className="text-center">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>Scan at pickup</p>
                  <div className="p-4 rounded-2xl inline-block" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <QRCodeSVG
                      value={JSON.stringify({
                        type: 'slabdash_pickup',
                        submission_id: submission.id,
                        pickup_code: submission.pickup_code,
                        submission_number: submission.psa_submission_number || submission.internal_id
                      })}
                      size={160}
                      level="H"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {(submission.admin_notes || submission.prep_notes) && (
              <div className="space-y-3">
                {submission.admin_notes && (
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#3B82F6' }} />
                      <div>
                        <h6 className="text-xs font-bold mb-1" style={{ color: '#1D4ED8' }}>Shop Notes</h6>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: '#1E40AF' }}>{submission.admin_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
                {submission.prep_notes && (
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
                      <div>
                        <h6 className="text-xs font-bold mb-1" style={{ color: '#B45309' }}>Prep Review</h6>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: '#92400E' }}>{submission.prep_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cards */}
            {submission.cards?.length > 0 && (
              <div>
                <h4 className="text-base font-bold mb-3" style={{ color: 'rgb(var(--dark))' }}>
                  Cards <span style={{ color: 'rgba(44, 36, 22, 0.3)' }}>({submission.cards.length})</span>
                </h4>
                <div className="space-y-3">
                  {submission.cards.map((card) => (
                    <div key={card.id} className="rounded-2xl overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      {/* Card Header Row */}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold truncate" style={{ color: 'rgb(var(--dark))' }}>
                            {card.player_name || card.description || 'Card'}
                          </h5>
                          <p className="text-xs truncate" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>
                            {[card.year, card.brand, card.card_number ? `#${card.card_number}` : ''].filter(Boolean).join(' ')}
                            {card.psa_cert_number && ` · Cert #${card.psa_cert_number}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {card.price_estimate && (
                            <span className="px-2.5 py-1 rounded-lg text-sm font-bold"
                              style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.12)' }}
                            >
                              ${parseFloat(card.price_estimate).toFixed(2)}
                            </span>
                          )}
                          {card.grade && (
                            <div className="text-center">
                              <div className="text-2xl font-black leading-none" style={{ color: '#059669' }}>
                                {card.grade}
                              </div>
                              <div className="text-[9px] font-bold" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>PSA</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Notes */}
                      {(card.admin_notes || card.prep_notes) && (
                        <div className="px-4 pb-3 space-y-2">
                          {card.admin_notes && (
                            <div className="rounded-xl p-3" style={{ background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.08)' }}>
                              <p className="text-xs" style={{ color: '#1E40AF' }}>
                                <span className="font-bold">Note:</span> {card.admin_notes}
                              </p>
                            </div>
                          )}
                          {card.prep_notes && (
                            <div className="rounded-xl p-3" style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.08)' }}>
                              <p className="text-xs" style={{ color: '#92400E' }}>
                                <span className="font-bold">Prep:</span> {card.prep_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Before Photos & Comps */}
                      <div className="px-4 pb-4 space-y-3">
                        {(card.before_photos?.length > 0 || true) && (
                          <div className="rounded-xl p-3" style={{ background: 'rgba(139, 92, 246, 0.03)', border: '1px solid rgba(139, 92, 246, 0.08)' }}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Camera className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
                              <span className="text-[10px] font-bold" style={{ color: '#7C3AED' }}>Before Photos</span>
                            </div>
                            <BeforePhotoUpload
                              cardId={card.id}
                              token={token}
                              existingPhotos={card.before_photos || []}
                              onUploadComplete={() => onRefresh()}
                            />
                          </div>
                        )}
                        <CompLookup
                          cardId={card.id}
                          token={token}
                          initialCard={card}
                          onUpdate={() => onRefresh()}
                          readOnly={true}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking Info */}
            {(submission.return_tracking || submission.psa_order_number) && (
              <div className="grid md:grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                {submission.return_tracking && (
                  <div>
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>Return Tracking</p>
                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--dark))' }}>{submission.return_tracking}</p>
                  </div>
                )}
                {submission.psa_order_number && (
                  <div>
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>PSA Order #</p>
                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--dark))' }}>{submission.psa_order_number}</p>
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
    if (!confirm(`${response === 'accepted' ? 'Accept' : 'Decline'} this offer for $${offer.offer_price}?`)) return;
    setResponding(true);
    try { await onRespond(offer.id, response); } finally { setResponding(false); }
  };

  return (
    <div className="rounded-2xl p-6 transition-all duration-300"
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.45)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold" style={{ color: 'rgb(var(--dark))' }}>
            {offer.card_description || offer.player_name || 'Card'}
          </h3>
          {offer.card_grade && (
            <p className="text-sm" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>PSA {offer.card_grade}</p>
          )}
          {offer.psa_cert_number && (
            <p className="text-xs" style={{ color: 'rgba(44, 36, 22, 0.35)' }}>Cert #{offer.psa_cert_number}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-black" style={{ color: '#059669' }}>
            ${parseFloat(offer.offer_price).toFixed(2)}
          </p>
          <p className="text-[10px] font-bold uppercase" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>Offer Price</p>
        </div>
      </div>

      {offer.notes && (
        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <p className="text-sm" style={{ color: 'rgba(44, 36, 22, 0.6)' }}>{offer.notes}</p>
        </div>
      )}

      {offer.status === 'pending' ? (
        <div className="flex gap-3">
          <button onClick={() => handleResponse('accepted')} disabled={responding}
            className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all hover:shadow-lg disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
            {responding ? 'Processing...' : 'Accept Offer'}
          </button>
          <button onClick={() => handleResponse('rejected')} disabled={responding}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(44, 36, 22, 0.6)' }}>
            Decline
          </button>
        </div>
      ) : (
        <div className="text-center py-3 rounded-xl font-bold text-sm"
          style={{
            background: offer.status === 'accepted' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.06)',
            color: offer.status === 'accepted' ? '#059669' : '#DC2626',
          }}
        >
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
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = [...e.dataTransfer.files].filter(file => file.type.startsWith('image/'));
    if (files.length > 0) await uploadImages(files);
  };

  const uploadImages = async (files) => {
    if (files.length > 5) { alert('Maximum 5 images at a time'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));
      const response = await fetch(`${API_URL}/portal/cards/${card.id}/images?token=${token}`, {
        method: 'POST', body: formData
      });
      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();
      if (onUploadComplete) onUploadComplete(result.card);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload images');
    } finally { setUploading(false); }
  };

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.45)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate" style={{ color: 'rgb(var(--dark))' }}>
              {card.player_name || card.description || 'Card'}
            </h3>
            <p className="text-xs" style={{ color: 'rgba(44, 36, 22, 0.45)' }}>
              {[card.year, card.brand].filter(Boolean).join(' ')}
              {card.psa_cert_number && ` · Cert #${card.psa_cert_number}`}
            </p>
          </div>
          {card.grade && (
            <div className="text-center ml-3">
              <div className="text-2xl font-black" style={{ color: '#059669' }}>{card.grade}</div>
              <div className="text-[9px] font-bold" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>PSA</div>
            </div>
          )}
        </div>

        {images.length > 0 && (
          <div className="mb-3">
            <div className="grid grid-cols-3 gap-1.5">
              {displayImages.map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <img src={url} alt={`Card ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {images.length > 3 && (
              <button onClick={() => setShowAllImages(!showAllImages)}
                className="text-xs font-bold mt-1.5" style={{ color: 'rgb(var(--brand-600))' }}>
                {showAllImages ? 'Show less' : `+${images.length - 3} more`}
              </button>
            )}
          </div>
        )}

        <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          className="border-2 border-dashed rounded-xl p-4 text-center transition-all"
          style={{ borderColor: dragActive ? 'rgb(var(--brand-500))' : 'rgba(0,0,0,0.08)' }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" multiple
            onChange={(e) => uploadImages([...e.target.files])} className="hidden" />
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-6 h-6 animate-spin mb-1" style={{ color: 'rgb(var(--brand-500))' }} />
              <p className="text-xs" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-5 h-5 mb-1" style={{ color: 'rgba(44, 36, 22, 0.2)' }} />
              <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Upload Photos</p>
              <button onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary text-xs px-3 py-1.5">
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
  const [activeTab, setActiveTab] = useState('submissions');
  const [hasSAMAccess, setHasSAMAccess] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [togglingEmail, setTogglingEmail] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => { loadPortalData(); }, [token]);

  const loadPortalData = async () => {
    try {
      const response = await fetch(`${API_URL}/portal/access?token=${token}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load portal');

      setData(result);
      if (result.company?.has_sam_addon || result.company?.sam_enabled) setHasSAMAccess(true);
      if (result.customer?.email_opt_in !== undefined) setEmailOptIn(result.customer.email_opt_in);

      try {
        const cardsResponse = await fetch(`${API_URL}/portal/cards?token=${token}`);
        if (cardsResponse.ok) setCards(await cardsResponse.json());
      } catch (err) { console.error('Failed to load cards:', err); }

      setLoading(false);
    } catch (error) {
      console.error('Portal load error:', error);
      setLoading(false);
    }
  };

  const toggleEmailOptIn = async () => {
    setTogglingEmail(true);
    try {
      const response = await fetch(`${API_URL}/portal/email-preference?token=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_opt_in: !emailOptIn })
      });
      if (response.ok) setEmailOptIn(!emailOptIn);
    } catch (error) {
      console.error('Failed to toggle email preference:', error);
    } finally { setTogglingEmail(false); }
  };

  const handleBuybackResponse = async (offerId, response) => {
    try {
      await fetch(`${API_URL}/portal/buyback-offers/${offerId}/respond?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });
      loadPortalData();
    } catch (error) { alert('Failed to respond to offer'); }
  };

  const filteredCards = cards.filter(card => {
    if (!cardSearch) return true;
    const s = cardSearch.toLowerCase();
    return (card.player_name?.toLowerCase().includes(s)) || (card.description?.toLowerCase().includes(s)) ||
      (card.brand?.toLowerCase().includes(s)) || (card.year?.toString().includes(s)) ||
      (card.psa_cert_number?.toLowerCase().includes(s));
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: 'rgb(var(--brand-500))' }} />
          <p className="text-lg font-bold" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
        <div className="card p-12 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{ color: '#DC2626' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--dark))' }}>Invalid Link</h2>
          <p style={{ color: 'rgba(44, 36, 22, 0.5)' }}>This portal link is invalid or has expired. Contact the shop for a new link.</p>
        </div>
      </div>
    );
  }

  const activeSubmissions = data.submissions.filter(s => !s.shipped);
  const completedSubmissions = data.submissions.filter(s => s.shipped);
  const pendingOffers = data.buybackOffers.filter(o => o.status === 'pending');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
      {/* Header */}
      <div className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.85) 0%, rgba(255, 107, 89, 0.9) 40%, rgba(232, 84, 61, 0.95) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          boxShadow: '0 8px 40px rgba(255, 107, 89, 0.2), inset 0 1px 0 rgba(255, 216, 196, 0.3)',
        }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -mr-28 -mt-28 blur-3xl" style={{ background: 'rgba(255, 216, 196, 0.15)' }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 216, 196, 0.4), transparent)' }} />

        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {data.company.name}
              </h1>
              <p className="text-sm font-bold mt-1" style={{ color: 'rgba(255, 248, 240, 0.7)' }}>Customer Portal</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-white text-lg">{data.customer.name}</p>
              <p className="text-sm" style={{ color: 'rgba(255, 248, 240, 0.7)' }}>{data.customer.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-40"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(40px) saturate(180%)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="max-w-4xl mx-auto px-6 flex items-center">
          <div className="flex gap-1 flex-1">
            {[
              { id: 'submissions', label: 'Submissions', icon: Package, count: data.submissions.length },
              ...(hasSAMAccess ? [{ id: 'sam', label: 'Ask SAM', icon: Bot, badge: 'AI' }] : []),
              ...(filteredCards.length > 0 ? [{ id: 'cards', label: 'My Cards', icon: Grid, count: cards.length }] : []),
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="px-4 py-3.5 font-bold text-sm transition-all border-b-3"
                style={{
                  borderBottomWidth: '3px',
                  borderColor: activeTab === tab.id ? 'rgb(var(--brand-600))' : 'transparent',
                  color: activeTab === tab.id ? 'rgb(var(--brand-600))' : 'rgba(44, 36, 22, 0.4)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="text-xs ml-0.5" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>({tab.count})</span>
                  )}
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                      style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))', color: '#FFF8F0' }}>
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Email notification toggle */}
          <button onClick={toggleEmailOptIn} disabled={togglingEmail}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            style={{
              background: emailOptIn ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0,0,0,0.04)',
              color: emailOptIn ? '#059669' : 'rgba(44, 36, 22, 0.35)',
              border: `1px solid ${emailOptIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.06)'}`,
            }}
            title={emailOptIn ? 'Email notifications are ON' : 'Email notifications are OFF'}
          >
            {emailOptIn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{emailOptIn ? 'Notifications On' : 'Notifications Off'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* SAM Tab */}
        {activeTab === 'sam' && hasSAMAccess && (
          <div className="h-[calc(100vh-200px)] min-h-[500px] rounded-3xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.45)', boxShadow: '0 4px 32px rgba(0,0,0,0.04)' }}
          >
            <SAMChatInterface isCustomerPortal={true} token={token} />
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && (
          <section>
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44, 36, 22, 0.3)' }} />
                <input type="text" placeholder="Search cards..." value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  className="input w-full pl-10" />
              </div>
            </div>
            {filteredCards.length === 0 ? (
              <div className="card p-12 text-center">
                <ImageIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(44, 36, 22, 0.15)' }} />
                <p className="font-bold" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>
                  {cardSearch ? 'No matching cards' : 'Your cards will appear here'}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCards.map((card) => (
                  <CardGalleryCard key={card.id} card={card} token={token}
                    onUploadComplete={(updated) => setCards(prev => prev.map(c => c.id === updated.id ? updated : c))} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <>
            {/* Active Submissions */}
            <section>
              {activeSubmissions.length === 0 && completedSubmissions.length === 0 ? (
                <div className="card p-16 text-center">
                  <Package className="w-20 h-20 mx-auto mb-6" style={{ color: 'rgba(44, 36, 22, 0.12)' }} />
                  <h3 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--dark))' }}>No Submissions Yet</h3>
                  <p style={{ color: 'rgba(44, 36, 22, 0.45)' }}>Your submissions will appear here once you drop off cards.</p>
                </div>
              ) : (
                <>
                  {activeSubmissions.length > 0 && (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-xl font-black" style={{ color: 'rgb(var(--dark))' }}>Active</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: 'rgba(var(--brand-500), 0.1)', color: 'rgb(var(--brand-600))' }}>
                          {activeSubmissions.length}
                        </span>
                      </div>
                      <div className="space-y-4 mb-10">
                        {activeSubmissions.map((submission) => (
                          <SubmissionCard
                            key={submission.id}
                            submission={submission}
                            isExpanded={expandedSubmission === submission.id}
                            onExpand={() => setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id)}
                            token={token}
                            onRefresh={loadPortalData}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Buyback Offers */}
                  {pendingOffers.length > 0 && (
                    <div className="mb-10">
                      <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-xl font-black" style={{ color: 'rgb(var(--dark))' }}>Buyback Offers</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                          {pendingOffers.length}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {pendingOffers.map((offer) => (
                          <BuybackCard key={offer.id} offer={offer} onRespond={handleBuybackResponse} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Submissions */}
                  {completedSubmissions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-xl font-black" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>Completed</h2>
                        <span className="text-xs font-bold" style={{ color: 'rgba(44, 36, 22, 0.3)' }}>
                          {completedSubmissions.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {completedSubmissions.map((submission) => (
                          <SubmissionCard
                            key={submission.id}
                            submission={submission}
                            isExpanded={expandedSubmission === submission.id}
                            onExpand={() => setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id)}
                            token={token}
                            onRefresh={loadPortalData}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-16" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <div className="max-w-4xl mx-auto px-6 py-6 text-center">
          <p className="text-sm" style={{ color: 'rgba(44, 36, 22, 0.35)' }}>
            Questions? Contact <span className="font-bold" style={{ color: 'rgb(var(--dark))' }}>{data.company.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

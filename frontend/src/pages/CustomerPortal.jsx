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

// PSA step mapping
const PSA_STEPS = ['Arrived', 'Order Prep', 'Research & ID', 'Grading', 'Assembly', 'QA', 'Shipped'];

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

// Service level colors
function getServiceColor(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('walk')) return '#7C3AED';
  if (l.includes('super')) return '#DC2626';
  if (l.includes('express')) return '#D97706';
  if (l.includes('regular') || l.includes('standard')) return '#2563EB';
  if (l.includes('value') || l.includes('plus')) return '#059669';
  if (l.includes('bulk')) return '#6B7280';
  return '#6B7280';
}

// ============================================
// PROGRESS BAR — clean horizontal bar with step labels
// ============================================
function ProgressPipeline({ currentStep, shipped }) {
  const stepIdx = shipped ? PSA_STEPS.length : getStepIndex(currentStep);
  const progress = shipped ? 100 : stepIdx >= 0 ? Math.round(((stepIdx + 0.5) / PSA_STEPS.length) * 100) : 0;

  return (
    <div>
      {/* Bar */}
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--hdr-circle-2)' }}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: shipped
              ? 'linear-gradient(90deg, #10B981, #059669)'
              : 'linear-gradient(90deg, rgb(var(--brand-400)), rgb(var(--brand-600)))',
          }}
        />
      </div>
      {/* Step labels */}
      <div className="flex justify-between mt-1.5">
        {PSA_STEPS.map((step, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx && !shipped;
          return (
            <span key={step} className="text-[8px] sm:text-[9px] font-semibold text-center flex-1"
              style={{
                color: done ? '#059669' : active ? 'rgb(var(--brand-600))' : 'rgba(44, 36, 22, 0.45)',
                fontWeight: active ? 800 : 600,
              }}
            >
              {step.replace('Research & ID', 'R&ID')}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// SUBMISSION CARD — focused on what customers care about
// ============================================
function SubmissionCard({ submission, isExpanded, onToggle, token, onRefresh }) {
  const isShipped = submission.shipped;
  const isGradesReady = submission.grades_ready;
  const isProblem = submission.problem_order;
  const showPickup = isGradesReady && !submission.picked_up && submission.pickup_code;
  const serviceColor = getServiceColor(submission.service_level);

  let statusText = submission.current_step || 'Processing';
  let statusIcon = Clock;
  let statusColor = '#D97706';
  if (isShipped) { statusText = 'Delivered'; statusIcon = Truck; statusColor = '#059669'; }
  else if (isGradesReady) { statusText = 'Grades Ready!'; statusIcon = Sparkles; statusColor = '#2563EB'; }
  else if (isProblem) { statusText = 'Needs Attention'; statusIcon = AlertTriangle; statusColor = '#DC2626'; }

  const StatusIcon = statusIcon;

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: isProblem ? '1.5px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.03)',
      }}>

      {/* Main content — clickable to expand */}
      <button onClick={onToggle} className="w-full text-left p-5 sm:p-6">
        {/* Top row: Order # + Status */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg sm:text-xl font-black" style={{ color: 'rgb(var(--dark))' }}>
              #{submission.psa_submission_number || submission.internal_id || '—'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              style={{ background: `${serviceColor}12`, color: serviceColor, border: `1px solid ${serviceColor}20` }}>
              {submission.service_level || 'Standard'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0"
            style={{ background: `${statusColor}10`, color: statusColor }}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{statusText}</span>
          </div>
        </div>

        {/* Progress bar (not shown for shipped) */}
        {!isShipped && <ProgressPipeline currentStep={submission.current_step} shipped={false} />}

        {/* Bottom row: card count, date */}
        <div className="flex items-center justify-between mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold">
            {submission.card_count || 0} card{(submission.card_count || 0) !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-3">
            {submission.date_sent && <span>Sent {format(new Date(submission.date_sent), 'MMM d')}</span>}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Shipped banner */}
      {isShipped && (
        <div className="mx-5 mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />
          <span className="text-sm font-bold" style={{ color: '#059669' }}>Delivered</span>
          {submission.return_tracking && (
            <span className="text-xs ml-auto font-mono" style={{ color: '#059669' }}>
              {submission.return_tracking}
            </span>
          )}
        </div>
      )}

      {/* Pickup code banner */}
      {showPickup && (
        <div className="mx-5 mb-4 p-4 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)' }}>
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-white" />
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Ready for Pickup</p>
              <p className="text-white/60 text-xs">Show this code at the counter</p>
            </div>
            <div className="px-4 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <span className="text-xl font-black tracking-widest font-mono" style={{ color: '#059669' }}>
                {submission.pickup_code}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-4" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>

          {/* QR Code for pickup */}
          {showPickup && (
            <div className="flex justify-center pt-4">
              <div className="text-center">
                <p className="text-[10px] font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>SCAN AT PICKUP</p>
                <div className="p-3 rounded-xl inline-block" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <QRCodeSVG
                    value={JSON.stringify({
                      type: 'slabdash_pickup',
                      submission_id: submission.id,
                      pickup_code: submission.pickup_code,
                      submission_number: submission.psa_submission_number || submission.internal_id
                    })}
                    size={140}
                    level="H"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes from the shop */}
          {submission.admin_notes && (
            <div className="rounded-xl p-3.5" style={{ background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.08)' }}>
              <div className="flex items-start gap-2">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#3B82F6' }} />
                <div>
                  <span className="text-[10px] font-bold" style={{ color: '#1D4ED8' }}>Shop Note</span>
                  <p className="text-sm mt-0.5" style={{ color: '#1E40AF' }}>{submission.admin_notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cards list */}
          {submission.cards?.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
                CARDS ({submission.cards.length})
              </p>
              <div className="space-y-2">
                {submission.cards.map(card => (
                  <CardRow key={card.id} card={card} token={token} onRefresh={onRefresh} />
                ))}
              </div>
            </div>
          )}

          {/* Tracking / Order info */}
          {(submission.return_tracking || submission.psa_order_number) && (
            <div className="flex flex-wrap gap-4 pt-3 text-xs" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              {submission.psa_order_number && (
                <div>
                  <span className="font-bold block" style={{ color: 'var(--text-secondary)' }}>PSA Order</span>
                  <span className="font-semibold" style={{ color: 'rgb(var(--dark))' }}>{submission.psa_order_number}</span>
                </div>
              )}
              {submission.return_tracking && !isShipped && (
                <div>
                  <span className="font-bold block" style={{ color: 'var(--text-secondary)' }}>Tracking</span>
                  <span className="font-semibold" style={{ color: 'rgb(var(--dark))' }}>{submission.return_tracking}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// CARD ROW — compact card display within a submission
// ============================================
function CardRow({ card, token, onRefresh }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.05)' }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left flex items-center gap-3 p-3">
        {/* Card image thumbnail */}
        {card.card_images?.[0] && (
          <img src={Array.isArray(card.card_images) ? card.card_images[0] : JSON.parse(card.card_images)[0]}
            alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: 'rgb(var(--dark))' }}>
            {card.player_name || card.description || 'Card'}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {[card.year, card.brand, card.card_number ? `#${card.card_number}` : ''].filter(Boolean).join(' ')}
            {card.psa_cert_number && ` · Cert ${card.psa_cert_number}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {card.price_estimate && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(16, 185, 129, 0.06)', color: '#059669' }}>
              ${parseFloat(card.price_estimate).toFixed(0)}
            </span>
          )}
          {card.grade ? (
            <div className="w-9 h-9 rounded-lg flex flex-col items-center justify-center"
              style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
              <span className="text-sm font-black leading-none" style={{ color: '#059669' }}>{card.grade}</span>
              <span className="text-[7px] font-bold" style={{ color: 'rgba(5, 150, 105, 0.6)' }}>PSA</span>
            </div>
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none' }} />
          )}
        </div>
      </button>

      {/* Expanded: before photos, comps, notes */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid rgba(0,0,0,0.03)' }}>
          {card.admin_notes && (
            <p className="text-xs p-2 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.03)', color: '#1E40AF' }}>
              <span className="font-bold">Note:</span> {card.admin_notes}
            </p>
          )}
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(139, 92, 246, 0.02)', border: '1px solid rgba(139, 92, 246, 0.06)' }}>
            <div className="flex items-center gap-1 mb-1.5">
              <Camera className="w-3 h-3" style={{ color: '#7C3AED' }} />
              <span className="text-[10px] font-bold" style={{ color: '#7C3AED' }}>Before Photos</span>
            </div>
            <BeforePhotoUpload
              cardId={card.id}
              token={token}
              existingPhotos={card.before_photos || []}
              onUploadComplete={() => onRefresh()}
            />
          </div>
          <CompLookup
            cardId={card.id}
            token={token}
            initialCard={card}
            onUpdate={() => onRefresh()}
            readOnly={true}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// BUYBACK OFFER CARD
// ============================================
function BuybackCard({ offer, onRespond }) {
  const [responding, setResponding] = useState(false);

  const handleResponse = async (response) => {
    if (!confirm(`${response === 'accepted' ? 'Accept' : 'Decline'} this offer for $${offer.offer_amount}?`)) return;
    setResponding(true);
    try { await onRespond(offer.id, response); } finally { setResponding(false); }
  };

  return (
    <div className="rounded-2xl p-5"
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.03)',
      }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold truncate" style={{ color: 'rgb(var(--dark))' }}>
            {offer.card_description || offer.player_name || 'Card'}
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {[offer.card_grade && `PSA ${offer.card_grade}`, offer.psa_cert_number && `Cert #${offer.psa_cert_number}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right ml-3">
          <p className="text-2xl font-black" style={{ color: '#059669' }}>
            ${parseFloat(offer.offer_amount).toFixed(2)}
          </p>
        </div>
      </div>

      {offer.notes && (
        <p className="text-sm mb-3 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.02)', color: 'var(--text-secondary)' }}>
          {offer.notes}
        </p>
      )}

      {offer.status === 'pending' ? (
        <div className="flex gap-2">
          <button onClick={() => handleResponse('accepted')} disabled={responding}
            className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
            {responding ? '...' : 'Accept'}
          </button>
          <button onClick={() => handleResponse('rejected')} disabled={responding}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
            Decline
          </button>
        </div>
      ) : (
        <div className="text-center py-2 rounded-xl font-bold text-sm"
          style={{
            background: offer.status === 'accepted' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.05)',
            color: offer.status === 'accepted' ? '#059669' : '#DC2626',
          }}>
          {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
        </div>
      )}
    </div>
  );
}

// ============================================
// GRADE SNAPSHOT — histogram + best card
// ============================================
function GradeSnapshot({ cards }) {
  const graded = cards.filter(c => c.grade && parseFloat(c.grade) > 0);
  if (graded.length < 2) return null;

  const dist = graded.reduce((acc, c) => {
    const g = parseFloat(c.grade) >= 10 ? '10' : c.grade.toString();
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(dist).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
  const maxCount = Math.max(...entries.map(e => e[1]));
  const bestCard = [...graded].sort((a, b) => parseFloat(b.grade) - parseFloat(a.grade))[0];
  const topGrade = parseFloat(bestCard?.grade);

  const gradeColor = (g) => {
    const n = parseFloat(g);
    if (n === 10) return '#059669';
    if (n >= 9) return '#10b981';
    if (n >= 8) return '#0ea5e9';
    if (n >= 7) return '#6366f1';
    return '#9ca3af';
  };

  return (
    <div className="rounded-2xl p-5 mb-2"
      style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 2px 20px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: 'rgb(var(--dark))' }}>Your Grade Summary</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(var(--brand-500),0.08)', color: 'rgb(var(--brand-600))' }}>
          {graded.length} graded
        </span>
      </div>

      {/* Best card callout */}
      {bestCard && (
        <div className="flex items-center gap-3 mb-4 px-3.5 py-3 rounded-xl"
          style={{
            background: topGrade === 10 ? 'rgba(5,150,105,0.07)' : 'rgba(0,0,0,0.03)',
            border: topGrade === 10 ? '1px solid rgba(5,150,105,0.15)' : '1px solid rgba(0,0,0,0.05)',
          }}>
          <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
            style={{ background: gradeColor(bestCard.grade) + '18', border: `1.5px solid ${gradeColor(bestCard.grade)}30` }}>
            <span className="text-lg font-black leading-none" style={{ color: gradeColor(bestCard.grade) }}>{bestCard.grade}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              {topGrade === 10 ? '⭐ Best Card — PSA 10' : 'Best Card'}
            </p>
            <p className="text-sm font-semibold truncate" style={{ color: 'rgb(var(--dark))' }}>
              {bestCard.player_name || bestCard.description || 'Card'}
            </p>
          </div>
        </div>
      )}

      {/* Grade histogram */}
      <div className="space-y-2">
        {entries.map(([grade, count]) => (
          <div key={grade} className="flex items-center gap-3">
            <span className="text-xs font-bold w-12 shrink-0 text-right" style={{ color: gradeColor(grade) }}>PSA {grade}</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(6, (count / maxCount) * 100)}%`, background: gradeColor(grade) }} />
            </div>
            <span className="text-xs font-bold w-4 shrink-0" style={{ color: 'var(--text-secondary)' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// CARD GALLERY — simplified
// ============================================
function GalleryCard({ card, token, onUpload }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const images = card.card_images ? (Array.isArray(card.card_images) ? card.card_images : JSON.parse(card.card_images)) : [];

  const uploadImages = async (files) => {
    if (files.length > 5) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('images', f));
      const response = await fetch(`${API_URL}/portal/cards/${card.id}/images?token=${token}`, {
        method: 'POST', body: formData
      });
      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();
      if (onUpload) onUpload(result.card);
    } catch { console.error('Failed to upload images'); }
    finally { setUploading(false); }
  };

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 2px 20px rgba(0,0,0,0.03)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate" style={{ color: 'rgb(var(--dark))' }}>
              {card.player_name || card.description || 'Card'}
            </h3>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {[card.year, card.brand].filter(Boolean).join(' ')}
              {card.psa_cert_number && ` · Cert ${card.psa_cert_number}`}
            </p>
          </div>
          {card.grade && (
            <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center ml-2"
              style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
              <span className="text-lg font-black leading-none" style={{ color: '#059669' }}>{card.grade}</span>
              <span className="text-[7px] font-bold" style={{ color: 'rgba(5, 150, 105, 0.6)' }}>PSA</span>
            </div>
          )}
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-1 mb-2 rounded-lg overflow-hidden">
            {images.slice(0, 3).map((url, i) => (
              <div key={i} className="aspect-square" style={{ background: 'rgba(0,0,0,0.03)' }}>
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" multiple
          onChange={(e) => uploadImages([...e.target.files])} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)', border: '1px solid rgba(0,0,0,0.05)' }}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : (
            <span className="flex items-center justify-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Upload Photos
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN PORTAL
// ============================================
export default function CustomerPortal() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [cards, setCards] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
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

      // Auto-expand the first active submission
      const firstActive = result.submissions?.find(s => !s.shipped);
      if (firstActive && !expandedId) setExpandedId(firstActive.id);

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
    } catch { console.error('Failed to respond to offer'); }
  };

  const filteredCards = cards.filter(card => {
    if (!cardSearch) return true;
    const s = cardSearch.toLowerCase();
    return (card.player_name?.toLowerCase().includes(s)) || (card.description?.toLowerCase().includes(s)) ||
      (card.brand?.toLowerCase().includes(s)) || (card.year?.toString().includes(s)) ||
      (card.psa_cert_number?.toLowerCase().includes(s));
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" style={{ color: 'rgb(var(--brand-500))' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Loading your portal...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
        <div className="card p-10 max-w-sm text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: '#DC2626' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'rgb(var(--dark))' }}>Invalid Link</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            This portal link is invalid or expired. Contact the shop for a new link.
          </p>
        </div>
      </div>
    );
  }

  const activeSubmissions = data.submissions.filter(s => !s.shipped);
  const completedSubmissions = data.submissions.filter(s => s.shipped);
  const pendingOffers = data.buybackOffers.filter(o => o.status === 'pending');

  // Quick stats for summary
  const gradesReadyCount = activeSubmissions.filter(s => s.grades_ready).length;
  const totalCards = data.submissions.reduce((sum, s) => sum + (parseInt(s.card_count) || s.cards?.length || 0), 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg-color))' }}>
      {/* Header */}
      <div className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.85) 0%, rgba(255, 107, 89, 0.9) 40%, rgba(232, 84, 61, 0.95) 100%)',
          boxShadow: '0 8px 40px rgba(255, 107, 89, 0.15)',
        }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-24 -mt-24 blur-3xl" style={{ background: 'rgba(255, 216, 196, 0.12)' }} />

        <div className="relative max-w-2xl mx-auto px-5 pt-8 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {data.company.name}
              </h1>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(255, 248, 240, 0.6)' }}>Customer Portal</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-white text-sm">{data.customer.name}</p>
              <p className="text-xs" style={{ color: 'rgba(255, 248, 240, 0.6)' }}>{data.customer.email}</p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex gap-3">
            {[
              { label: 'Active', value: activeSubmissions.length, show: true },
              { label: 'Cards', value: totalCards, show: totalCards > 0 },
              { label: 'Grades Ready', value: gradesReadyCount, show: gradesReadyCount > 0 },
              { label: 'Completed', value: completedSubmissions.length, show: completedSubmissions.length > 0 },
            ].filter(s => s.show).map(stat => (
              <div key={stat.label} className="px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <p className="text-lg font-black text-white leading-none">{stat.value}</p>
                <p className="text-[10px] font-semibold" style={{ color: 'rgba(255, 248, 240, 0.6)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-40"
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(40px) saturate(180%)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
        }}>
        <div className="max-w-2xl mx-auto px-5 flex items-center">
          <div className="flex gap-0 flex-1">
            {[
              { id: 'submissions', label: 'Submissions', icon: Package, count: data.submissions.length },
              ...(hasSAMAccess ? [{ id: 'sam', label: 'Ask SAM', icon: Bot, badge: 'AI' }] : []),
              ...(cards.length > 0 ? [{ id: 'cards', label: 'My Cards', icon: Grid, count: cards.length }] : []),
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="px-3 sm:px-4 py-3 font-bold text-xs sm:text-sm transition-all"
                style={{
                  borderBottom: `2px solid ${activeTab === tab.id ? 'rgb(var(--brand-600))' : 'transparent'}`,
                  color: activeTab === tab.id ? 'rgb(var(--brand-600))' : 'rgba(44, 36, 22, 0.55)',
                }}>
                <div className="flex items-center gap-1.5">
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({tab.count})</span>
                  )}
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full text-white"
                      style={{ background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))' }}>
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Email toggle */}
          <button onClick={toggleEmailOptIn} disabled={togglingEmail}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
            style={{
              background: emailOptIn ? 'rgba(16, 185, 129, 0.06)' : 'rgba(0,0,0,0.03)',
              color: emailOptIn ? '#059669' : 'rgba(44, 36, 22, 0.5)',
            }}
            title={emailOptIn ? 'Notifications ON' : 'Notifications OFF'}>
            {emailOptIn ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{emailOptIn ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">

        {/* SAM Tab */}
        {activeTab === 'sam' && hasSAMAccess && (
          <div className="h-[calc(100vh-200px)] min-h-[400px] rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 2px 20px rgba(0,0,0,0.03)' }}>
            <SAMChatInterface isCustomerPortal={true} token={token} />
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && (
          <section>
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Search cards..." value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  className="input w-full pl-9 text-sm" />
              </div>
            </div>
            {filteredCards.length === 0 ? (
              <div className="card p-10 text-center">
                <ImageIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(44, 36, 22, 0.2)' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                  {cardSearch ? 'No matching cards' : 'Your cards will appear here'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCards.map(card => (
                  <GalleryCard key={card.id} card={card} token={token}
                    onUpload={(updated) => setCards(prev => prev.map(c => c.id === updated.id ? updated : c))} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <>
            {/* Grade snapshot — only when customer has graded cards */}
            <GradeSnapshot cards={cards} />

            {activeSubmissions.length === 0 && completedSubmissions.length === 0 ? (
              <div className="card p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(44, 36, 22, 0.15)' }} />
                <h3 className="text-xl font-bold mb-1" style={{ color: 'rgb(var(--dark))' }}>No Submissions Yet</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Your submissions will appear here once you drop off cards.
                </p>
              </div>
            ) : (
              <>
                {/* Active */}
                {activeSubmissions.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-lg font-black" style={{ color: 'rgb(var(--dark))' }}>Active</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(var(--brand-500), 0.08)', color: 'rgb(var(--brand-600))' }}>
                        {activeSubmissions.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {activeSubmissions.map(sub => (
                        <SubmissionCard key={sub.id} submission={sub}
                          isExpanded={expandedId === sub.id}
                          onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                          token={token} onRefresh={loadPortalData} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Buyback Offers */}
                {pendingOffers.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-lg font-black" style={{ color: 'rgb(var(--dark))' }}>Buyback Offers</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#059669' }}>
                        {pendingOffers.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {pendingOffers.map(offer => (
                        <BuybackCard key={offer.id} offer={offer} onRespond={handleBuybackResponse} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Completed */}
                {completedSubmissions.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-lg font-black" style={{ color: 'var(--text-secondary)' }}>Completed</h2>
                      <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                        {completedSubmissions.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {completedSubmissions.map(sub => (
                        <SubmissionCard key={sub.id} submission={sub}
                          isExpanded={expandedId === sub.id}
                          onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                          token={token} onRefresh={loadPortalData} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 py-5 text-center" style={{ borderTop: '1px solid rgba(0,0,0,0.03)' }}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Questions? Contact <span className="font-bold" style={{ color: 'rgb(var(--dark))' }}>{data.company.name}</span>
        </p>
      </div>
    </div>
  );
}

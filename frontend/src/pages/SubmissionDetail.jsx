import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { submissions, cards, customers, emailTemplates } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PickupCard from '../components/PickupCard';
import InvoiceSection from '../components/InvoiceSection';
import {
  ArrowLeft,
  RefreshCw,
  Edit2,
  Trash2,
  Plus,
  Package,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Save,
  X,
  Truck,
  Upload,
  Image as ImageIcon,
  Search,
  FileSpreadsheet,
  DollarSign,
  Download,
  Users,
  Send,
  Zap,
  Mail,
  Eye,
  Copy,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

function fireGradeConfetti() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#FF8170', '#E8543D', '#FFD700', '#10B981', '#3B82F6'] });
  setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 }, angle: 60 }), 200);
  setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 }, angle: 120 }), 350);
}

function StepTimeline({ steps }) {
  if (!steps?.length) return null;
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              step.completed
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {step.completed ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <span className="text-xs font-medium">{step.step_index + 1}</span>
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
              {step.step_name}
            </p>
            {step.completed_at && (
              <p className="text-xs text-gray-400">
                {format(new Date(step.completed_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CardRow({ card, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [grade, setGrade] = useState(card.grade || '');
  const [lookingUp, setLookingUp] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const toast = useToast();

  const cardImages = card.card_images ? (Array.isArray(card.card_images) ? card.card_images : JSON.parse(card.card_images)) : [];
  const hasImages = cardImages.length > 0;

  const handleLookup = async () => {
    if (!card.psa_cert_number) return;
    setLookingUp(true);
    try {
      const res = await cards.lookupCert(card.id);
      onUpdate(res.data.card);
      if (res.data.card?.grade === '10') fireGradeConfetti();
    } catch (error) {
      console.error('Lookup failed:', error);
    } finally {
      setLookingUp(false);
    }
  };

  const handleSaveGrade = async () => {
    try {
      const res = await cards.update(card.id, { grade });
      onUpdate(res.data);
      setEditing(false);
      if (grade === '10') fireGradeConfetti();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const res = await cards.uploadImages(card.id, formData);
      onUpdate(res.data);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    handleImageUpload(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  return (
    <tr className={dragOver ? 'bg-brand-50' : ''}>
      <td>
        <div className="flex items-center gap-3">
          <div
            className={`relative w-16 h-20 flex-shrink-0 rounded border-2 ${
              dragOver
                ? 'border-brand-500 bg-brand-50'
                : hasImages
                ? 'border-gray-200'
                : 'border-dashed border-yellow-400 bg-yellow-50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {uploading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              </div>
            ) : hasImages ? (
              <img
                src={cardImages[0]}
                alt={card.player_name || card.description}
                className="w-full h-full object-cover rounded cursor-pointer hover:opacity-75"
                onClick={() => setShowImage(!showImage)}
              />
            ) : (
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-100">
                <Upload className="w-5 h-5 text-yellow-600 mb-1" />
                <span className="text-[10px] text-yellow-700 text-center px-1">Upload image</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />
              </label>
            )}
            {hasImages && (
              <label className="absolute bottom-0 right-0 bg-brand-500 text-white rounded-tl p-1 cursor-pointer hover:bg-brand-600">
                <Upload className="w-3 h-3" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{card.description || card.player_name || '—'}</p>
            {card.player_name && (
              <p className="text-xs text-gray-500">
                {card.year} {card.card_set || card.brand} {card.player_name}
              </p>
            )}
            {!hasImages && (
              <p className="text-xs text-yellow-600 mt-1">No image</p>
            )}
          </div>
        </div>
      </td>
      <td>
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
      </td>
      <td>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="input w-20 py-1"
              placeholder="10"
            />
            <button onClick={handleSaveGrade} className="p-1 text-green-600 hover:bg-green-50 rounded">
              <Save className="w-4 h-4" />
            </button>
            <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-gray-700 hover:text-brand-600"
          >
            {card.grade ? (
              <span className="font-bold text-lg">{card.grade}</span>
            ) : (
              <span className="text-gray-400">Add grade</span>
            )}
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </td>
      <td>
        <span className={`badge ${card.status === 'graded' ? 'badge-green' : 'badge-gray'}`}>
          {card.status || 'pending'}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          {card.psa_cert_number && (
            <>
              <a
                href={`https://www.psacard.com/cert/${card.psa_cert_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                title="View on PSA (right-click images to save)"
              >
                <ExternalLink className="w-3 h-3" />
                PSA
              </a>
              <button
                onClick={handleLookup}
                disabled={lookingUp}
                className="btn btn-secondary py-1 px-2 text-xs"
                title="Try to fetch from PSA API"
              >
                {lookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Lookup'}
              </button>
            </>
          )}
          {card.grade && (
            <Link
              to={`/buyback/new?card_id=${card.id}`}
              className="btn btn-primary py-1 px-2 text-xs flex items-center gap-1 bg-green-600 hover:bg-green-700"
              title="Make buyback offer"
            >
              <DollarSign className="w-3 h-3" />
              Buyback
            </Link>
          )}
          <button
            onClick={() => onDelete(card.id)}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
            title="Delete card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function CustomerAssignmentSheet({ customer, submission, onClose, onUpdate }) {
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Pre-select cards that are already assigned to this customer
    const assignedCardIds = new Set(
      submission.cards
        .filter(card => card.customer_owner_id === customer.id)
        .map(card => card.id)
    );
    setSelectedCards(assignedCardIds);
  }, [customer.id, submission.cards]);

  const toggleCard = (cardId) => {
    const newSelection = new Set(selectedCards);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setSelectedCards(newSelection);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update each card's customer assignment
      const updates = submission.cards.map(async (card) => {
        const shouldBeAssigned = selectedCards.has(card.id);
        const isAssigned = card.customer_owner_id === customer.id;

        // Only update if there's a change
        if (shouldBeAssigned !== isAssigned) {
          await cards.update(card.id, {
            customer_owner_id: shouldBeAssigned ? customer.id : null
          });
        }
      });

      await Promise.all(updates);
      await onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update card assignments:', error);
      toast.error('Failed to update card assignments');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col slide-in-right">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
              <p className="text-sm text-gray-500">{customer.email}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Select which cards belong to this customer
          </p>
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {submission.cards.map((card) => {
              let cardImages = [];
              try {
                cardImages = card.card_images
                  ? (Array.isArray(card.card_images) ? card.card_images : JSON.parse(card.card_images))
                  : [];
              } catch { /* malformed JSON — skip */ }
              const hasImage = cardImages.length > 0;
              const isSelected = selectedCards.has(card.id);

              return (
                <div
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                  className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      isSelected ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                  </div>

                  {/* Card image */}
                  {hasImage && (
                    <div className="w-12 h-16 flex-shrink-0">
                      <img
                        src={cardImages[0]}
                        alt={card.player_name || card.description}
                        className="w-full h-full object-cover rounded border border-gray-200"
                      />
                    </div>
                  )}

                  {/* Card details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {card.description || card.player_name || 'Untitled'}
                    </p>
                    {card.player_name && (
                      <p className="text-sm text-gray-500 truncate">
                        {card.year} {card.card_set || card.brand}
                      </p>
                    )}
                    {card.psa_cert_number && (
                      <p className="text-xs text-gray-400 mt-1">
                        Cert: {card.psa_cert_number}
                      </p>
                    )}
                  </div>

                  {/* Grade badge */}
                  {card.grade && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 font-bold text-gray-900">
                        {card.grade}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {submission.cards.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-brand-300 mx-auto mb-3" />
              <p className="text-gray-500">No cards in this submission yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''} selected
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary flex-1"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Assignments'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function AddCardForm({ submissionId, onAdd, onCancel }) {
  const [description, setDescription] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    try {
      const res = await cards.create({
        submission_id: submissionId,
        description,
        psa_cert_number: certNumber || null,
      });
      onAdd(res.data);
      setDescription('');
      setCertNumber('');
    } catch (error) {
      console.error('Failed to add card:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Card description (e.g., 2023 Topps Chrome Victor Wembanyama RC)"
          className="input flex-1"
          required
        />
        <input
          type="text"
          value={certNumber}
          onChange={(e) => setCertNumber(e.target.value)}
          placeholder="PSA Cert # (optional)"
          className="input w-full sm:w-40"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

export default function SubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();
  const toast = useToast();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [customerList, setCustomerList] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [assigningCustomer, setAssigningCustomer] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importingCSV, setImportingCSV] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerToAdd, setCustomerToAdd] = useState('');
  const [showCustomerListModal, setShowCustomerListModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignCSV, setBulkAssignCSV] = useState('');
  const [bulkAssignResult, setBulkAssignResult] = useState(null);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [selectedSport, setSelectedSport] = useState('All');
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [fetchingAllPrices, setFetchingAllPrices] = useState(false);
  const [fetchPricesProgress, setFetchPricesProgress] = useState(null);

  const loadSubmission = async () => {
    try {
      const res = await submissions.get(id);
      setSubmission(res.data);
    } catch (error) {
      console.error('Failed to load submission:', error);
      if (error.response?.status === 404) {
        navigate('/submissions');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await customers.list({});
      setCustomerList(res.data.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  useEffect(() => {
    loadSubmission();
    loadCustomers();
  }, [id]);

  const handleRefresh = async () => {
    if (!company?.hasPsaKey) {
      toast.error('PSA API key not configured. Please add your PSA API key in Company Settings to refresh submissions.');
      return;
    }

    setRefreshing(true);
    try {
      const response = await submissions.refresh(id);
      await loadSubmission();

      // Show success message
      const message = response.data?.message || 'Submission refreshed successfully';
      toast.success(message);
    } catch (error) {
      console.error('Refresh failed:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to refresh from PSA';
      toast.error('Refresh failed: ' + errorMsg);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this submission and all its cards? This cannot be undone.')) return;
    try {
      await submissions.delete(id);
      navigate('/submissions');
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSendUpdate = async () => {
    const customerCount = submission?.linked_customers?.length || 0;
    if (customerCount === 0) {
      toast.error('No customers linked to this submission');
      return;
    }

    if (!confirm(`Send status update email to ${customerCount} customer(s)?`)) {
      return;
    }

    setSendingEmail(true);
    try {
      const response = await emailTemplates.sendSubmissionUpdate(id);
      toast.success(response.data.message || `Email sent to ${response.data.emails_sent} customer(s)!`);
    } catch (error) {
      console.error('Send email failed:', error);
      toast.error(error.response?.data?.error || 'Failed to send status update');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingTestEmail(true);
    try {
      await emailTemplates.sendTestSubmissionUpdate(testEmail, id);
      toast.success(`Test submission update email sent to ${testEmail}! Check your inbox to preview.`);
      setShowTestEmailModal(false);
      setTestEmail('');
    } catch (error) {
      console.error('Send test email failed:', error);
      toast.error(error.response?.data?.error || 'Failed to send test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleEdit = () => {
    setEditForm({
      psa_submission_number: submission.psa_submission_number || '',
      psa_order_number: submission.psa_order_number || '',
      internal_id: submission.internal_id || '',
      service_level: submission.service_level || '',
      date_sent: submission.date_sent || '',
      declared_value: submission.declared_value || '',
      card_count: submission.card_count || 0,
      outbound_tracking: submission.outbound_tracking || '',
      return_tracking: submission.return_tracking || ''
    });
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await submissions.update(id, editForm);
      await loadSubmission();
      setEditing(false);
      setEditForm({});
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignCustomer = async (customerId) => {
    setAssigningCustomer(true);
    try {
      await submissions.assignCustomer(id, customerId);
      await loadSubmission();
    } catch (error) {
      console.error('Assign failed:', error);
    } finally {
      setAssigningCustomer(false);
    }
  };

  const handleCardUpdate = (updatedCard) => {
    setSubmission((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
    }));
  };

  const handleCardDelete = async (cardId) => {
    if (!confirm('Delete this card?')) return;
    try {
      await cards.delete(cardId);
      setSubmission((prev) => ({
        ...prev,
        cards: prev.cards.filter((c) => c.id !== cardId),
      }));
    } catch (error) {
      console.error('Delete card failed:', error);
      alert('Failed to delete card. Please try again.');
    }
  };

  const handleCardAdd = (newCard) => {
    setSubmission((prev) => ({
      ...prev,
      cards: [...(prev.cards || []), newCard],
    }));
    setShowAddCard(false);
  };

  const handleAddLinkedCustomer = async (customerId) => {
    setAssigningCustomer(true);
    try {
      await submissions.addCustomer(id, { customer_id: customerId });
      await loadSubmission();
    } catch (error) {
      console.error('Add customer failed:', error);
      toast.error('Failed to add customer to submission');
    } finally {
      setAssigningCustomer(false);
    }
  };

  const handleRemoveLinkedCustomer = async (customerId) => {
    if (!confirm('Remove this customer from the submission?')) return;
    try {
      await submissions.removeCustomer(id, customerId);
      await loadSubmission();
    } catch (error) {
      console.error('Remove customer failed:', error);
      toast.error('Failed to remove customer');
    }
  };

  const handleExportCustomersCSV = () => {
    if (!submission.linked_customers || submission.linked_customers.length === 0) {
      toast.error('No customers to export');
      return;
    }

    const csvData = submission.linked_customers.map((customer) => {
      const assignedCards = submission.cards.filter(c => c.customer_owner_id === customer.id).length;
      return {
        Name: customer.name,
        Email: customer.email,
        Phone: customer.phone || '',
        'Cards Assigned': assignedCards,
      };
    });

    // Convert to CSV
    const headers = Object.keys(csvData[0]);
    const csvRows = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ];
    const csvString = csvRows.join('\n');

    // Download
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${submission.psa_submission_number || submission.internal_id || 'submission'}-customers.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignCSV.trim()) {
      toast.error('Please paste CSV data');
      return;
    }

    setBulkAssigning(true);
    try {
      const response = await cards.bulkAssign(bulkAssignCSV, id);
      setBulkAssignResult(response.data);

      // Show summary
      const summary = response.data.summary;
      toast.success(`Bulk assignment complete: ${summary.assigned} of ${summary.total} cards assigned`);

      // Reload submission to show updated assignments
      await loadSubmission();

      // Clear form if successful
      if (summary.assigned > 0) {
        setBulkAssignCSV('');
      }
    } catch (error) {
      console.error('Bulk assign failed:', error);
      toast.error('Failed to assign cards: ' + (error.response?.data?.error || error.message));
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleAutoDetectSports = async () => {
    if (!confirm('Auto-detect sports for all cards? This will categorize cards based on brands, player names, and keywords.')) {
      return;
    }

    setAutoDetecting(true);
    try {
      const response = await cards.autoDetectSports(id);
      const summary = response.data.summary;

      toast.success(`Sport detection complete: ${summary.detected} of ${summary.total} cards detected`);

      // Reload submission to show updated sports
      await loadSubmission();
    } catch (error) {
      console.error('Auto-detect failed:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      toast.error('Failed to auto-detect sports: ' + errorMsg);
    } finally {
      setAutoDetecting(false);
    }
  };

  const handleClone = () => {
    navigate('/submissions/new', {
      state: {
        clone: {
          service_level: submission.service_level,
          customer_id: submission.linked_customers?.[0]?.id || null,
          customer_name: submission.linked_customers?.[0]?.name || null,
        }
      }
    });
  };

  const handleFetchAllPrices = async () => {
    const cardsWithCert = (submission.cards || []).filter(c => c.psa_cert_number);
    if (cardsWithCert.length === 0) {
      toast.error('No cards with PSA cert numbers to look up');
      return;
    }
    setFetchingAllPrices(true);
    setFetchPricesProgress({ done: 0, total: cardsWithCert.length, updated: 0 });
    for (let i = 0; i < cardsWithCert.length; i++) {
      try {
        await cards.lookupCert(cardsWithCert[i].id);
        setFetchPricesProgress(p => ({ ...p, done: i + 1, updated: p.updated + 1 }));
      } catch {
        setFetchPricesProgress(p => ({ ...p, done: i + 1 }));
      }
    }
    await loadSubmission();
    setFetchingAllPrices(false);
    setFetchPricesProgress(null);
    toast.success(`Fetched grades/prices for ${cardsWithCert.length} cards`);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      await submissions.uploadImage(id, formData);
      await loadSubmission();
      toast.success('Form image uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingCSV(true);
    setCsvImportResult(null);
    try {
      const text = await file.text();
      const res = await submissions.importCSV(id, text);
      setCsvImportResult(res.data);
      await loadSubmission();

      // Show result message
      const { imported, skipped, errors, total } = res.data;
      if (imported === 0 && skipped === 0 && total === 0) {
        toast.error('No data rows found in CSV file. Check file format.');
      } else {
        let message = `Successfully imported ${imported} card(s)`;
        if (skipped > 0) message += `, skipped ${skipped} duplicate(s)`;
        if (errors && errors.length > 0) message += `, ${errors.length} error(s)`;
        toast.success(message);
      }
    } catch (error) {
      console.error('CSV import failed:', error);
      toast.error(error.response?.data?.error || 'Failed to import CSV');
    } finally {
      setImportingCSV(false);
      // Reset file input
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-brand-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Submission not found</h3>
        <Link to="/submissions" className="text-brand-600 hover:underline mt-2 inline-block">
          Back to submissions
        </Link>
      </div>
    );
  }

  const progressPercent = submission.progress_percent || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl" style={{ background: 'var(--hdr-gradient)', boxShadow: 'var(--hdr-shadow)', border: 'var(--hdr-border)' }}>
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full" style={{ background: 'var(--hdr-circle-1)' }} />
        <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full" style={{ background: 'var(--hdr-circle-2)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 sm:px-8 py-7">
          <div className="flex items-center gap-4">
            <Link to="/submissions"
              className="p-2 rounded-xl transition-all hover:bg-white/20 flex-shrink-0"
              style={{ background: 'var(--hdr-back-bg)', border: 'var(--hdr-back-border)' }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--hdr-btn-color)' }} />
            </Link>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--hdr-eyebrow)' }}>PSA Submission #</label>
                    <input
                      type="text"
                      value={editForm.psa_submission_number}
                      onChange={(e) => setEditForm({ ...editForm, psa_submission_number: e.target.value })}
                      className="input text-xl font-bold mt-1"
                      placeholder="PSA Submission Number"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--hdr-eyebrow)' }}>PSA Order #</label>
                    <input
                      type="text"
                      value={editForm.psa_order_number}
                      onChange={(e) => setEditForm({ ...editForm, psa_order_number: e.target.value })}
                      className="input mt-1"
                      placeholder="PSA Order Number"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase" style={{ color: 'var(--hdr-eyebrow)' }}>Internal ID</label>
                    <input
                      type="text"
                      value={editForm.internal_id}
                      onChange={(e) => setEditForm({ ...editForm, internal_id: e.target.value })}
                      className="input mt-1"
                      placeholder="Internal ID"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--hdr-eyebrow)' }}>Submission</p>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--hdr-title)' }}>
                    {submission.psa_submission_number || submission.internal_id || 'No ID'}
                  </h1>
                  {submission.psa_order_number && (
                    <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--hdr-sub)' }}>Order #{submission.psa_order_number}</p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {editing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60" style={{ background: 'rgba(255,255,255,0.9)', color: '#E8543D' }}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Save Changes</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20" style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20" style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => setShowTestEmailModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20" style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
                  title="Preview status update email"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
                <button
                  onClick={handleSendUpdate}
                  disabled={sendingEmail}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20 disabled:opacity-50" style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
                >
                  {sendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{sendingEmail ? 'Sending...' : 'Send Update'}</span>
                </button>
                {company?.hasPsaKey && submission.psa_submission_number && (
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20 disabled:opacity-50" style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                )}
                <button onClick={handleClone} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20" style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }} title="Clone this submission">
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Clone</span>
                </button>
                <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80" style={{ background: 'rgba(220,38,38,0.85)', border: 'var(--hdr-btn-border)', color: 'white' }}>
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        {submission.shipped && (
          <span className="badge badge-green flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Shipped
          </span>
        )}
        {submission.grades_ready && !submission.shipped && (
          <span className="badge badge-blue flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Grades Ready
          </span>
        )}
        {submission.problem_order && (
          <span className="badge badge-red flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Problem Order
          </span>
        )}
        {submission.accounting_hold && (
          <span className="badge badge-yellow flex items-center gap-1">
            <Clock className="w-3 h-3" /> Accounting Hold
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress</h2>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{submission.current_step || 'Pending'}</span>
                <span className="text-sm font-medium text-gray-900">{progressPercent}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPercent >= 100
                      ? 'bg-green-500'
                      : progressPercent >= 75
                      ? 'bg-blue-500'
                      : 'bg-brand-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Steps timeline */}
            {submission.steps?.length > 0 && <StepTimeline steps={submission.steps} />}

            {submission.last_api_update && (
              <p className="text-xs text-gray-400 mt-4">
                Last updated: {format(new Date(submission.last_api_update), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>

          {/* Pickup System */}
          <PickupCard submission={submission} onPickupComplete={loadSubmission} />

          {/* Invoicing */}
          <InvoiceSection submission={submission} onInvoiceSent={loadSubmission} />

          {/* Cards */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Cards ({submission.cards?.filter(c => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      c.player_name?.toLowerCase().includes(query) ||
                      c.description?.toLowerCase().includes(query) ||
                      c.card_set?.toLowerCase().includes(query) ||
                      c.brand?.toLowerCase().includes(query) ||
                      c.psa_cert_number?.toString().includes(query)
                    );
                  }).length || 0})
                </h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by player, cert #..."
                      className="input pl-10 w-full sm:w-64"
                    />
                  </div>
                  <label className="btn btn-secondary gap-2 whitespace-nowrap cursor-pointer flex items-center">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{importingCSV ? 'Importing...' : 'Import CSV'}</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleCSVImport}
                      disabled={importingCSV}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowBulkAssignModal(true)}
                    className="btn btn-primary gap-2 whitespace-nowrap"
                    title="Bulk assign cards to customers using CSV"
                  >
                    <Users className="w-4 h-4" />
                    Bulk Assign
                  </button>
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="btn btn-secondary gap-2 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add Card
                  </button>
                  <button
                    onClick={handleAutoDetectSports}
                    disabled={autoDetecting || !submission.cards || submission.cards.length === 0}
                    className="btn btn-secondary gap-2 whitespace-nowrap"
                    title="Auto-detect sports for all cards"
                  >
                    {autoDetecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Auto-Detect
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleFetchAllPrices}
                    disabled={fetchingAllPrices || !submission.cards?.some(c => c.psa_cert_number)}
                    className="btn btn-secondary gap-2 whitespace-nowrap"
                    title="Fetch grades and prices for all cards with cert numbers"
                  >
                    {fetchingAllPrices ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {fetchPricesProgress ? `${fetchPricesProgress.done}/${fetchPricesProgress.total}` : 'Fetching...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Fetch All
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Category Tabs */}
              {submission.cards && submission.cards.length > 0 && (() => {
                // Calculate category counts
                const categoryCounts = submission.cards.reduce((acc, card) => {
                  const category = card.sport || 'Other';
                  acc[category] = (acc[category] || 0) + 1;
                  return acc;
                }, {});

                // Define category order (Sports, TCG, Other)
                const categoryOrder = ['Sports', 'TCG', 'Other'];

                // Get all categories that exist in the cards
                const availableCategories = categoryOrder.filter(cat => categoryCounts[cat] > 0);

                return (
                  <div className="border-t border-gray-200 pt-4 pb-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedSport('All')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedSport === 'All'
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All ({submission.cards.length})
                      </button>
                      {availableCategories.map(category => (
                        <button
                          key={category}
                          onClick={() => setSelectedSport(category)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedSport === category
                              ? 'bg-brand-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {category} ({categoryCounts[category]})
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {showAddCard && (
              <div className="p-4 border-b border-gray-200">
                <AddCardForm
                  submissionId={id}
                  onAdd={handleCardAdd}
                  onCancel={() => setShowAddCard(false)}
                />
              </div>
            )}

            {submission.cards?.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Card</th>
                      <th>Cert #</th>
                      <th>Grade</th>
                      <th>Status</th>
                      <th className="w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {submission.cards
                      .filter(c => {
                        // Sport filter
                        if (selectedSport !== 'All') {
                          const cardSport = c.sport || 'Other';
                          if (cardSport !== selectedSport) return false;
                        }

                        // Search query filter
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          c.player_name?.toLowerCase().includes(query) ||
                          c.description?.toLowerCase().includes(query) ||
                          c.card_set?.toLowerCase().includes(query) ||
                          c.brand?.toLowerCase().includes(query) ||
                          c.psa_cert_number?.toString().includes(query)
                        );
                      })
                      .map((card) => (
                        <CardRow
                          key={card.id}
                          card={card}
                          onUpdate={handleCardUpdate}
                          onDelete={handleCardDelete}
                        />
                      ))
                    }
                  </tbody>
                </table>
                {submission.cards.filter(c => {
                  // Sport filter
                  if (selectedSport !== 'All') {
                    const cardSport = c.sport || 'Other';
                    if (cardSport !== selectedSport) return false;
                  }

                  // Search query filter
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    c.player_name?.toLowerCase().includes(query) ||
                    c.description?.toLowerCase().includes(query) ||
                    c.card_set?.toLowerCase().includes(query) ||
                    c.brand?.toLowerCase().includes(query) ||
                    c.psa_cert_number?.toString().includes(query)
                  );
                }).length === 0 && (
                  <div className="p-8 text-center">
                    <Package className="w-10 h-10 text-brand-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {searchQuery
                        ? `No cards match "${searchQuery}"`
                        : selectedSport !== 'All'
                        ? `No ${selectedSport} cards found`
                        : 'No cards found'
                      }
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Package className="w-10 h-10 text-brand-300 mx-auto mb-3" />
                <p className="text-gray-500">No cards added yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Details
            </h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Service Level</label>
                  <input
                    type="text"
                    value={editForm.service_level}
                    onChange={(e) => setEditForm({ ...editForm, service_level: e.target.value })}
                    className="input"
                    placeholder="e.g., Regular, Express"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Card Count</label>
                  <input
                    type="number"
                    value={editForm.card_count}
                    onChange={(e) => setEditForm({ ...editForm, card_count: parseInt(e.target.value) || 0 })}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Date Arrived at PSA</label>
                  <input
                    type="date"
                    value={editForm.date_sent}
                    onChange={(e) => setEditForm({ ...editForm, date_sent: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Declared Value ($)</label>
                  <input
                    type="number"
                    value={editForm.declared_value}
                    onChange={(e) => setEditForm({ ...editForm, declared_value: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
            ) : (
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Service Level</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {submission.service_level || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Card Count</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {submission.card_count || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Date Arrived at PSA</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {submission.date_sent
                      ? format(new Date(submission.date_sent), 'MMM d, yyyy')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Declared Value</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {submission.declared_value
                      ? `$${parseFloat(submission.declared_value).toLocaleString()}`
                      : '—'}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {/* Tracking */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Tracking
            </h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Outbound Tracking</label>
                  <input
                    type="text"
                    value={editForm.outbound_tracking}
                    onChange={(e) => setEditForm({ ...editForm, outbound_tracking: e.target.value })}
                    className="input"
                    placeholder="Tracking number"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Return Tracking</label>
                  <input
                    type="text"
                    value={editForm.return_tracking}
                    onChange={(e) => setEditForm({ ...editForm, return_tracking: e.target.value })}
                    className="input"
                    placeholder="Tracking number"
                  />
                </div>
              </div>
            ) : (
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Outbound</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {submission.outbound_tracking || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Return</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {submission.return_tracking || '—'}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {/* Form Images */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Form Images ({submission.form_images?.length || 0})
            </h3>

            {/* Upload button */}
            <label className="btn btn-secondary gap-2 w-full cursor-pointer mb-4 flex items-center justify-center">
              <Upload className="w-4 h-4" />
              <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>

            {/* Image gallery */}
            {submission.form_images?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {submission.form_images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Form ${idx + 1}`}
                    className="w-full h-24 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75"
                    onClick={() => window.open(img, '_blank')}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No images uploaded yet</p>
            )}
          </div>

          {/* Customers (Consignment Tracking) */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" />
                Customers ({submission.linked_customers?.length || 0})
              </h3>
              {submission.linked_customers?.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCustomersCSV}
                    className="btn btn-secondary text-xs gap-1"
                    title="Export customer list as CSV"
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </button>
                  <button
                    onClick={() => setShowCustomerListModal(true)}
                    className="btn btn-primary text-xs gap-1"
                  >
                    <Users className="w-3 h-3" />
                    View All
                  </button>
                </div>
              )}
            </div>

            {/* Add customer section */}
            <div className="mb-4 p-5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-base font-semibold text-gray-900">
                  Assign Customer
                </label>
              </div>

              {/* Searchable customer input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search customers by name or email..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  disabled={assigningCustomer}
                  className="input pl-10 w-full bg-white"
                />

                {/* Dropdown results — shows on focus, no search required */}
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                    {!customerSearchQuery && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                        All customers
                      </div>
                    )}
                    {customerList
                      .filter(c => {
                        if (submission.linked_customers?.some(lc => lc.id === c.id)) return false;
                        if (!customerSearchQuery) return true;
                        const q = customerSearchQuery.toLowerCase();
                        return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
                      })
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCustomerToAdd(c.id);
                            setCustomerSearchQuery('');
                            setShowCustomerDropdown(false);
                            handleAddLinkedCustomer(c.id);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-sm text-gray-500">{c.email}</p>
                        </button>
                      ))}
                    {customerList.filter(c => {
                      if (submission.linked_customers?.some(lc => lc.id === c.id)) return false;
                      if (!customerSearchQuery) return true;
                      const q = customerSearchQuery.toLowerCase();
                      return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        {customerSearchQuery ? `No customers found matching "${customerSearchQuery}"` : 'No customers available'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 font-medium">
                Click the search box to see all customers, or type to filter
              </p>
            </div>

            {/* Preview of customers */}
            {submission.linked_customers?.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">
                  {submission.linked_customers.length} customer{submission.linked_customers.length !== 1 ? 's' : ''} in this submission
                </p>
                <div className="flex flex-wrap gap-2">
                  {submission.linked_customers.slice(0, 3).map((customer) => (
                    <Link
                      key={customer.id}
                      to={`/customers/${customer.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                    >
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-900">{customer.name}</span>
                    </Link>
                  ))}
                  {submission.linked_customers.length > 3 && (
                    <button
                      onClick={() => setShowCustomerListModal(true)}
                      className="inline-flex items-center px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      +{submission.linked_customers.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No customers linked yet</p>
            )}
          </div>

          {/* Notes */}
          {submission.notes && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
                Notes
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{submission.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Assignment Sheet */}
      {selectedCustomer && (
        <CustomerAssignmentSheet
          customer={selectedCustomer}
          submission={submission}
          onClose={() => setSelectedCustomer(null)}
          onUpdate={loadSubmission}
        />
      )}

      {/* Customer List Modal */}
      {showCustomerListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-50 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-brand-600" />
                    Customers in Submission
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {submission.linked_customers.length} customer{submission.linked_customers.length !== 1 ? 's' : ''} linked
                  </p>
                </div>
                <button
                  onClick={() => setShowCustomerListModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {submission.linked_customers.map((customer) => {
                  const assignedCards = submission.cards.filter(c => c.customer_owner_id === customer.id).length;

                  return (
                    <div
                      key={customer.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-brand-300 hover:bg-brand-50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/customers/${customer.id}`}
                              className="font-medium text-gray-900 hover:text-brand-600 flex items-center gap-2"
                              onClick={() => setShowCustomerListModal(false)}
                            >
                              {customer.name}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{customer.email}</p>
                          {customer.phone && (
                            <p className="text-sm text-gray-500">{customer.phone}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-brand-600 font-medium">
                              {assignedCards} card{assignedCards !== 1 ? 's' : ''} assigned
                            </span>
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowCustomerListModal(false);
                              }}
                              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                            >
                              Assign cards →
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove ${customer.name} from this submission?`)) {
                              handleRemoveLinkedCustomer(customer.id);
                              if (submission.linked_customers.length === 1) {
                                setShowCustomerListModal(false);
                              }
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={handleExportCustomersCSV}
                  className="btn btn-secondary gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => setShowCustomerListModal(false)}
                  className="btn btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-50 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Bulk Assign Cards to Customers</h2>
                <button
                  onClick={() => {
                    setShowBulkAssignModal(false);
                    setBulkAssignResult(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">CSV Format Instructions:</p>
                <p className="text-sm text-blue-700 mb-2">Paste your CSV data with two columns:</p>
                <ul className="text-sm text-blue-700 list-disc ml-5 space-y-1">
                  <li><strong>Column 1:</strong> PSA Cert Number (e.g., 12345678)</li>
                  <li><strong>Column 2:</strong> Customer Name or Email</li>
                </ul>
                <p className="text-xs text-blue-600 mt-3">
                  Example:<br/>
                  <code className="bg-blue-100 px-2 py-1 rounded">12345678, John Doe</code><br/>
                  <code className="bg-blue-100 px-2 py-1 rounded">87654321, jane@example.com</code>
                </p>
              </div>

              <div>
                <label className="label">Paste CSV Data</label>
                <textarea
                  value={bulkAssignCSV}
                  onChange={(e) => setBulkAssignCSV(e.target.value)}
                  placeholder="12345678, John Doe&#10;87654321, jane@example.com&#10;11111111, Bob Smith"
                  className="input h-64 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste rows with cert number and customer name/email separated by commas
                </p>
              </div>

              {bulkAssignResult && (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-semibold text-green-900 mb-2">Results Summary</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-600">Total:</span> <strong>{bulkAssignResult.summary.total}</strong></div>
                      <div><span className="text-green-600">Assigned:</span> <strong>{bulkAssignResult.summary.assigned}</strong></div>
                      <div><span className="text-yellow-600">Unmatched:</span> <strong>{bulkAssignResult.summary.unmatched}</strong></div>
                      <div><span className="text-red-600">Not Found:</span> <strong>{bulkAssignResult.summary.notFound}</strong></div>
                    </div>
                  </div>

                  {bulkAssignResult.unmatched.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="font-semibold text-yellow-900 mb-2">Unmatched Customers</p>
                      <div className="text-sm text-yellow-800 space-y-1 max-h-32 overflow-auto">
                        {bulkAssignResult.unmatched.map((item, idx) => (
                          <div key={idx}>Line {item.lineNumber}: {item.certNumber} → "{item.customerIdentifier}" (customer not found)</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bulkAssignResult.notFound.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="font-semibold text-red-900 mb-2">Cards Not Found</p>
                      <div className="text-sm text-red-800 space-y-1 max-h-32 overflow-auto">
                        {bulkAssignResult.notFound.map((item, idx) => (
                          <div key={idx}>Cert #{item.certNumber}: {item.reason}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setBulkAssignResult(null);
                }}
                className="btn btn-secondary"
              >
                {bulkAssignResult ? 'Close' : 'Cancel'}
              </button>
              {!bulkAssignResult && (
                <button
                  onClick={handleBulkAssign}
                  disabled={bulkAssigning || !bulkAssignCSV.trim()}
                  className="btn btn-primary gap-2"
                >
                  {bulkAssigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Assign Cards
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {showTestEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-brand-50 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-blue-600" />
                Preview Status Update Email
              </h3>
              <button
                onClick={() => {
                  setShowTestEmailModal(false);
                  setTestEmail('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Send a test status update email to preview how it will look. This will include the current submission status and progress.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail || !testEmail}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingTestEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Test Email
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowTestEmailModal(false);
                  setTestEmail('');
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

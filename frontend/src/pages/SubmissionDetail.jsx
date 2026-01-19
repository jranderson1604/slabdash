import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { submissions, cards, customers } from '../api/client';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react';
import { format } from 'date-fns';

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

  const cardImages = card.card_images ? (Array.isArray(card.card_images) ? card.card_images : JSON.parse(card.card_images)) : [];

  const handleLookup = async () => {
    if (!card.psa_cert_number) return;
    setLookingUp(true);
    try {
      const res = await cards.lookupCert(card.id);
      onUpdate(res.data.card);
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
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          {cardImages.length > 0 && (
            <div className="relative">
              <img
                src={cardImages[0]}
                alt={card.player_name || card.description}
                className="w-16 h-20 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75"
                onClick={() => setShowImage(!showImage)}
              />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{card.description || card.player_name || 'Untitled'}</p>
            {card.player_name && (
              <p className="text-xs text-gray-500">
                {card.year} {card.card_set || card.brand} {card.player_name}
              </p>
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
            <button
              onClick={handleLookup}
              disabled={lookingUp}
              className="btn btn-secondary py-1 px-2 text-xs"
            >
              {lookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Lookup'}
            </button>
          )}
          <button
            onClick={() => onDelete(card.id)}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
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

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [customerList, setCustomerList] = useState([]);
  const [assigningCustomer, setAssigningCustomer] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importingCSV, setImportingCSV] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState(null);

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
      const res = await customers.list({ limit: 100 });
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
    if (!company?.hasPsaKey) return;
    setRefreshing(true);
    try {
      await submissions.refresh(id);
      await loadSubmission();
    } catch (error) {
      console.error('Refresh failed:', error);
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
      alert('Failed to add customer to submission');
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
      alert('Failed to remove customer');
    }
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
      alert('Form image uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
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

      // Show success message
      const { imported, skipped, errors } = res.data;
      let message = `Successfully imported ${imported} card(s)`;
      if (skipped > 0) message += `, skipped ${skipped} duplicate(s)`;
      if (errors > 0) message += `, ${errors} error(s)`;
      alert(message);
    } catch (error) {
      console.error('CSV import failed:', error);
      alert(error.response?.data?.error || 'Failed to import CSV');
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
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/submissions" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {submission.psa_submission_number || submission.internal_id || 'Submission'}
            </h1>
            {submission.psa_order_number && (
              <p className="text-gray-500">Order #{submission.psa_order_number}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {company?.hasPsaKey && submission.psa_submission_number && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-secondary gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
          <button onClick={handleDelete} className="btn btn-danger gap-2">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
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
                  <label className="btn btn-secondary gap-2 whitespace-nowrap cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4" />
                    {importingCSV ? 'Importing...' : 'Import CSV'}
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleCSVImport}
                      disabled={importingCSV}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="btn btn-secondary gap-2 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add Card
                  </button>
                </div>
              </div>
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
                {searchQuery && submission.cards.filter(c => {
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
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No cards match "{searchQuery}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
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
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">Service Level</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {submission.service_level || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Date Sent</dt>
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
          </div>

          {/* Tracking */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Tracking
            </h3>
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
          </div>

          {/* Form Images */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Form Images ({submission.form_images?.length || 0})
            </h3>

            {/* Upload button */}
            <label className="btn btn-secondary gap-2 w-full cursor-pointer mb-4">
              <Upload className="w-4 h-4" />
              {uploadingImage ? 'Uploading...' : 'Upload Image'}
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
            </div>

            {/* Add customer dropdown */}
            <div className="mb-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddLinkedCustomer(e.target.value);
                    e.target.value = '';
                  }
                }}
                disabled={assigningCustomer}
                className="input text-sm"
              >
                <option value="">+ Add customer...</option>
                {customerList
                  .filter(c => !submission.linked_customers?.some(lc => lc.id === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Track multiple customers in one submission (consignment)
              </p>
            </div>

            {/* Linked customers list */}
            {submission.linked_customers?.length > 0 ? (
              <div className="space-y-2">
                {submission.linked_customers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.email}</p>
                      {customer.card_count > 0 && (
                        <p className="text-xs text-brand-600 mt-1">{customer.card_count} cards</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveLinkedCustomer(customer.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Remove customer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
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
    </div>
  );
}

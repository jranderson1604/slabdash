import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { customers, submissions } from '../api/client';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Loader2,
  Save,
  X,
  LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [generatingLink, setGeneratingLink] = useState(false);

  const loadCustomer = async () => {
    try {
      const res = await customers.get(id);
      setCustomer(res.data);
      setEditData({
        name: res.data.name,
        email: res.data.email,
        phone: res.data.phone || '',
        address_line1: res.data.address_line1 || '',
        city: res.data.city || '',
        state: res.data.state || '',
        postal_code: res.data.postal_code || '',
        notes: res.data.notes || '',
        portal_access_enabled: res.data.portal_access_enabled,
      });
    } catch (error) {
      console.error('Failed to load customer:', error);
      if (error.response?.status === 404) {
        navigate('/customers');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    try {
      await customers.delete(id);
      navigate('/customers');
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await customers.update(id, editData);
      setCustomer({ ...customer, ...res.data });
      setEditing(false);
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePortalLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await customers.sendPortalLink(id);
      alert(`Portal link generated!\n\n${res.data.portalUrl}\n\nShare this with your customer.`);
    } catch (error) {
      console.error('Generate portal link failed:', error);
      alert('Failed to generate portal link');
    } finally {
      setGeneratingLink(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Customer not found</h3>
        <Link to="/customers" className="text-brand-600 hover:underline mt-2 inline-block">
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/customers" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-brand-600">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <p className="text-gray-500">{customer.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} className="btn btn-secondary gap-2">
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button onClick={handleDelete} className="btn btn-danger gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="btn btn-secondary gap-2">
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Name</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Address</label>
                  <input
                    type="text"
                    value={editData.address_line1}
                    onChange={(e) => setEditData({ ...editData, address_line1: e.target.value })}
                    className="input mb-2"
                    placeholder="Street address"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={editData.city}
                      onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      className="input"
                      placeholder="City"
                    />
                    <input
                      type="text"
                      value={editData.state}
                      onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                      className="input"
                      placeholder="State"
                    />
                    <input
                      type="text"
                      value={editData.postal_code}
                      onChange={(e) => setEditData({ ...editData, postal_code: e.target.value })}
                      className="input"
                      placeholder="ZIP"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${customer.email}`} className="text-brand-600 hover:underline">
                    {customer.email}
                  </a>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <a href={`tel:${customer.phone}`} className="text-gray-700">
                      {customer.phone}
                    </a>
                  </div>
                )}
                {customer.address_line1 && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="text-gray-700">
                      <p>{customer.address_line1}</p>
                      {customer.city && (
                        <p>
                          {customer.city}, {customer.state} {customer.postal_code}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {customer.notes && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Notes</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Submissions */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Submissions ({customer.total_submissions || 0})
              </h2>
            </div>
            {customer.recent_submissions?.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {customer.recent_submissions.map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/submissions/${sub.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {sub.psa_submission_number || sub.internal_id || 'No ID'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {sub.service_level || 'Unknown service'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`badge ${sub.shipped ? 'badge-green' : 'badge-yellow'}`}>
                        {sub.shipped ? 'Shipped' : sub.current_step || 'Pending'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(sub.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No submissions yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Statistics
            </h3>
            <dl className="space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Total Submissions</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {customer.total_submissions || 0}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Total Cards</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {customer.total_cards || 0}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Customer Since</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {format(new Date(customer.created_at), 'MMM d, yyyy')}
                </dd>
              </div>
            </dl>
          </div>

          {/* Portal Access */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Customer Portal
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Portal Access</span>
                <span className={`badge ${customer.portal_access_enabled ? 'badge-green' : 'badge-gray'}`}>
                  {customer.portal_access_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {customer.portal_access_enabled && (
                <button
                  onClick={handleGeneratePortalLink}
                  disabled={generatingLink}
                  className="btn btn-secondary w-full gap-2"
                >
                  {generatingLink ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Generate Portal Link
                </button>
              )}
              <p className="text-xs text-gray-500">
                Portal links allow customers to view their submission status without logging in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

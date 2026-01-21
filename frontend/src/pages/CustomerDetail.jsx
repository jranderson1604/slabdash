import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { customers } from '../api/client';
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
  Copy,
  Check,
  DollarSign,
  Clock,
  TrendingUp,
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
  const [portalLink, setPortalLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);

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
      if (error.response?.status === 404) navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomer(); }, [id]);

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
      setPortalLink(res.data.portalUrl);
    } catch (error) {
      console.error('Generate portal link failed:', error);
      alert('Failed to generate portal link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailLink = () => {
    const subject = encodeURIComponent('Track Your Card Submission');
    const body = encodeURIComponent(`Hi ${customer.name},\n\nYou can track your card submissions here:\n${portalLink}\n\nThanks!`);
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  if (!customer) {
    return <div className="text-center py-12"><User className="w-12 h-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900">Customer not found</h3><Link to="/customers" className="text-brand-600 hover:underline mt-2 inline-block">Back to customers</Link></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/customers" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-500" /></Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-brand-600">{customer.name.charAt(0).toUpperCase()}</span>
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
              <button onClick={() => setEditing(true)} className="btn btn-secondary gap-2"><Edit2 className="w-4 h-4" />Edit</button>
              <button onClick={handleDelete} className="btn btn-danger gap-2"><Trash2 className="w-4 h-4" />Delete</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="btn btn-secondary gap-2"><X className="w-4 h-4" />Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Name</label><input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="input" /></div>
                  <div><label className="label">Email</label><input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="input" /></div>
                </div>
                <div><label className="label">Phone</label><input type="tel" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="input" /></div>
                <div><label className="label">Notes</label><textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} className="input" rows={3} /></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-gray-400" /><a href={`mailto:${customer.email}`} className="text-brand-600 hover:underline">{customer.email}</a></div>
                {customer.phone && <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-gray-400" /><a href={`tel:${customer.phone}`} className="text-gray-700">{customer.phone}</a></div>}
                {customer.notes && <div className="pt-4 border-t border-gray-100"><p className="text-sm text-gray-500 mb-1">Notes</p><p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p></div>}
              </div>
            )}
          </div>

          <div className="card">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {showAllSubmissions ? 'All' : 'Recent'} Submissions ({customer.total_submissions || 0})
              </h2>
              {customer.recent_submissions && customer.recent_submissions.length >= 10 && (
                <button
                  onClick={() => setShowAllSubmissions(!showAllSubmissions)}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  {showAllSubmissions ? 'Show Recent' : 'Show All'}
                </button>
              )}
            </div>
            {customer.recent_submissions?.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {(showAllSubmissions ? customer.recent_submissions : customer.recent_submissions.slice(0, 10)).map((sub) => (
                  <Link key={sub.id} to={`/submissions/${sub.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{sub.psa_submission_number || sub.internal_id || 'No ID'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-gray-500">{sub.service_level || 'Unknown service'}</p>
                        {sub.card_count > 0 && (
                          <span className="text-xs text-gray-400">• {sub.card_count} cards</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`badge ${sub.shipped ? 'badge-green' : sub.problem_order ? 'badge-red' : sub.grades_ready ? 'badge-blue' : 'badge-yellow'}`}>
                        {sub.shipped ? 'Shipped' : sub.problem_order ? 'Problem' : sub.grades_ready ? 'Grades Ready' : sub.current_step || 'Pending'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{format(new Date(sub.created_at), 'MMM d, yyyy')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center"><Package className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No submissions yet</p><Link to="/submissions/new" className="btn btn-primary mt-3">Create First Submission</Link></div>
            )}
          </div>

          {/* Transaction History - Buyback Offers */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Transaction History
              </h2>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-3">No buyback transactions yet</p>
                <p className="text-xs text-gray-400">Buyback offers and transactions will appear here</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Customer Stats</h3>
            <dl className="space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-gray-500 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Total Submissions
                </dt>
                <dd className="text-lg font-semibold text-gray-900">{customer.total_submissions || 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Total Cards
                </dt>
                <dd className="text-lg font-semibold text-gray-900">{customer.total_cards || 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Customer Since
                </dt>
                <dd className="text-sm font-medium text-gray-900">{format(new Date(customer.created_at), 'MMM d, yyyy')}</dd>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <dt className="text-gray-500 text-xs mb-2">Active Orders</dt>
                <dd className="text-sm font-medium text-brand-600">
                  {customer.recent_submissions?.filter(s => !s.shipped).length || 0} in progress
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2"><LinkIcon className="w-4 h-4" />Customer Portal</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between"><span className="text-gray-600">Portal Access</span><span className={`badge ${customer.portal_access_enabled ? 'badge-green' : 'badge-gray'}`}>{customer.portal_access_enabled ? 'Enabled' : 'Disabled'}</span></div>
              
              {customer.portal_access_enabled && !portalLink && (
                <button onClick={handleGeneratePortalLink} disabled={generatingLink} className="btn btn-secondary w-full gap-2">
                  {generatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Generate Portal Link
                </button>
              )}

              {portalLink && (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Portal Link</p>
                    <p className="text-sm text-brand-600 break-all">{portalLink}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCopyLink} className="btn btn-secondary flex-1 gap-2">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={handleEmailLink} className="btn btn-primary flex-1 gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">Portal links allow customers to view their submission status. Links expire after 7 days.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

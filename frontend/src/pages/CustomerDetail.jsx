import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { customers, submissions } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
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
  Search,
  Plus,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [generatingLink, setGeneratingLink] = useState(false);
  const [portalLink, setPortalLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const [submissionList, setSubmissionList] = useState([]);
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState('');
  const [showSubmissionDropdown, setShowSubmissionDropdown] = useState(false);
  const [assigningSubmission, setAssigningSubmission] = useState(false);
  const [sendingIntroEmail, setSendingIntroEmail] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

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

  useEffect(() => {
    loadCustomer();
    loadSubmissions();
  }, [id]);

  const loadSubmissions = async () => {
    try {
      const res = await submissions.list({ limit: 1000 });
      setSubmissionList(res.data.submissions || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  };

  const handleAssignToSubmission = async (submissionId) => {
    setAssigningSubmission(true);
    try {
      await submissions.addCustomer(submissionId, { customer_id: id });
      // Reload customer to get updated submissions list
      await loadCustomer();
      setSubmissionSearchQuery('');
      setShowSubmissionDropdown(false);
    } catch (error) {
      console.error('Failed to assign customer to submission:', error);
      toast.error('Failed to assign customer to submission');
    } finally {
      setAssigningSubmission(false);
    }
  };

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
      toast.error('Failed to generate portal link');
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

  const handleSendIntroductionEmail = async () => {
    if (!confirm(`Send introduction email to ${customer.name}?\n\nThis will send a welcome email with portal access and submission details.`)) return;

    setSendingIntroEmail(true);
    try {
      const res = await customers.sendIntroductionEmail(id);
      toast.success('Introduction email sent successfully!');
      setPortalLink(res.data.portalUrl);
    } catch (error) {
      console.error('Send introduction email failed:', error);
      toast.error(error.response?.data?.error || 'Failed to send introduction email');
    } finally {
      setSendingIntroEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingTestEmail(true);
    try {
      await customers.sendTestIntroductionEmail(testEmail);
      toast.success(`Test introduction email sent to ${testEmail}`);
      setShowTestEmailModal(false);
      setTestEmail('');
    } catch (error) {
      console.error('Send test email failed:', error);
      toast.error(error.response?.data?.error || 'Failed to send test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  if (!customer) {
    return <div className="text-center py-12"><User className="w-12 h-12 text-brand-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900">Customer not found</h3><Link to="/customers" className="text-brand-600 hover:underline mt-2 inline-block">Back to customers</Link></div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl" style={{ background: 'var(--hdr-gradient)', boxShadow: 'var(--hdr-shadow)', border: 'var(--hdr-border)' }}>
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full" style={{ background: 'var(--hdr-circle-1)' }} />
        <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full" style={{ background: 'var(--hdr-circle-2)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 sm:px-8 py-7">
          <div className="flex items-center gap-4">
            <Link to="/customers"
              className="p-2 rounded-xl transition-all hover:bg-white/20 flex-shrink-0"
              style={{ background: 'var(--hdr-back-bg)', border: 'var(--hdr-back-border)' }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--hdr-btn-color)' }} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--hdr-circle-1)', border: '2px solid var(--hdr-circle-1)' }}
              >
                <span className="text-lg font-bold" style={{ color: 'var(--hdr-btn-primary-bg)' }}>{customer.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--hdr-title)' }}>{customer.name}</h1>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--hdr-sub)' }}>{customer.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20"
                  style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button onClick={handleDelete}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-red-600"
                  style={{ background: 'rgba(239,68,68,0.85)', border: 'var(--hdr-btn-border)', color: 'white' }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20"
                  style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ background: 'rgba(255,255,255,0.9)', color: '#E8543D' }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="hidden sm:inline">Save</span>
                </button>
              </>
            )}
          </div>
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

          {/* Add customer to submission */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Assign to Submission
              </h2>

              {/* Searchable submission input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search submissions by PSA #, order #, or service level..."
                  value={submissionSearchQuery}
                  onChange={(e) => {
                    setSubmissionSearchQuery(e.target.value);
                    setShowSubmissionDropdown(true);
                  }}
                  onFocus={() => setShowSubmissionDropdown(true)}
                  disabled={assigningSubmission}
                  className="input pl-10 w-full"
                />

                {/* Dropdown results */}
                {showSubmissionDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                    {submissionSearchQuery === '' && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                        Recent submissions
                      </div>
                    )}
                    {submissionList
                      .filter(sub => {
                        if (customer.recent_submissions?.some(rs => rs.id === sub.id)) return false;
                        if (!submissionSearchQuery) return true;
                        const q = submissionSearchQuery.toLowerCase();
                        return (sub.psa_submission_number?.toLowerCase().includes(q) ||
                         sub.psa_order_number?.toLowerCase().includes(q) ||
                         sub.internal_id?.toLowerCase().includes(q) ||
                         sub.service_level?.toLowerCase().includes(q));
                      })
                      .slice(0, 10)
                      .map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleAssignToSubmission(sub.id)}
                          disabled={assigningSubmission}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-900 text-base">
                              PSA #{sub.psa_submission_number || sub.internal_id || '—'}
                            </p>
                            <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              {sub.current_step || 'New'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {sub.service_level || 'Unknown service'} · {sub.card_count || 0} cards
                            {sub.progress_percent > 0 ? ` · ${sub.progress_percent}%` : ''}
                          </p>
                        </button>
                      ))}
                    {submissionList.filter(sub => {
                      if (customer.recent_submissions?.some(rs => rs.id === sub.id)) return false;
                      if (!submissionSearchQuery) return true;
                      const q = submissionSearchQuery.toLowerCase();
                      return (sub.psa_submission_number?.toLowerCase().includes(q) ||
                       sub.psa_order_number?.toLowerCase().includes(q) ||
                       sub.internal_id?.toLowerCase().includes(q) ||
                       sub.service_level?.toLowerCase().includes(q));
                    }).length === 0 && (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No submissions found {submissionSearchQuery ? `matching "${submissionSearchQuery}"` : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Search for a submission and click to link this customer to it
              </p>
            </div>
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
              <div className="p-8 text-center"><Package className="w-10 h-10 text-brand-300 mx-auto mb-3" /><p className="text-gray-500">No submissions yet</p><Link to="/submissions/new" className="btn btn-primary mt-3">New Submission</Link></div>
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
                <DollarSign className="w-10 h-10 text-brand-300 mx-auto mb-3" />
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

              {customer.email && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTestEmailModal(true)}
                    className="btn btn-secondary flex-1 gap-2"
                    title="Send a test email to preview"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={handleSendIntroductionEmail}
                    disabled={sendingIntroEmail}
                    className="btn bg-blue-600 text-white hover:bg-blue-700 flex-1 gap-2 disabled:opacity-50"
                    title="Send welcome email with portal access and submission details"
                  >
                    {sendingIntroEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {sendingIntroEmail ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              )}

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

      {/* Test Email Modal */}
      {showTestEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-brand-50 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-blue-600" />
                Preview Introduction Email
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
              Send a test introduction email to preview how it will look. This will include the same content and formatting as the actual email.
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

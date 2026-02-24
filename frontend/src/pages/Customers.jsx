import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { customers, submissions } from '../api/client';
import ExportButton from '../components/ExportButton';
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Trash2,
  Users,
  Loader2,
  Mail,
  Package,
  Link as LinkIcon,
  FileSpreadsheet,
  X,
  CheckSquare,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

function CustomerRow({ customer, onDelete, onSendPortalLink, selected, onSelect }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    setMenuOpen(false);
    try {
      await customers.delete(customer.id);
      onDelete(customer.id);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSendPortalLink = async (e) => {
    e.stopPropagation();
    setSendingLink(true);
    setMenuOpen(false);
    try {
      const res = await customers.sendPortalLink(customer.id);
      toast.success('Portal link generated!');
    } catch (error) {
      console.error('Send portal link failed:', error);
      toast.error('Failed to generate portal link');
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <tr className={selected ? 'bg-blue-50' : ''}>
      <td onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(customer.id, e.target.checked)}
          className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
        />
      </td>
      <td
        className="cursor-pointer"
        onClick={() => navigate(`/customers/${customer.id}`)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {customer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{customer.name}</p>
            <p className="text-xs text-gray-500">{customer.email}</p>
          </div>
        </div>
      </td>
      <td>
        <span className="text-gray-600">{customer.phone || '—'}</span>
      </td>
      <td>
        <div className="flex items-center gap-1 text-gray-600">
          <Package className="w-4 h-4" />
          {customer.total_submissions || 0}
        </div>
      </td>
      <td>
        <span className="text-gray-600">{customer.total_cards || 0}</span>
      </td>
      <td>
        <span className={`badge ${customer.portal_access_enabled ? 'badge-green' : 'badge-gray'}`}>
          {customer.portal_access_enabled ? 'Enabled' : 'Disabled'}
        </span>
      </td>
      <td>
        {customer.last_login_at ? (
          <span className="text-gray-600 text-xs" title={format(new Date(customer.last_login_at), 'MMM d, yyyy h:mm a')}>
            {formatDistanceToNow(new Date(customer.last_login_at), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">Never</span>
        )}
      </td>
      <td>
        <span className="text-gray-500">
          {format(new Date(customer.created_at), 'MMM d, yyyy')}
        </span>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            {sendingLink ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreVertical className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 fade-in">
                <Link
                  to={`/customers/${customer.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </Link>
                <button
                  onClick={handleSendPortalLink}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LinkIcon className="w-4 h-4" />
                  Generate Portal Link
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Customers() {
  const toast = useToast();
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [importingCSV, setImportingCSV] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [showAddToSubmissionModal, setShowAddToSubmissionModal] = useState(false);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState('');
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [sendingIntroEmails, setSendingIntroEmails] = useState(false);
  const [emailProgress, setEmailProgress] = useState({ sent: 0, total: 0, failed: 0 });
  const [showEmailProgressModal, setShowEmailProgressModal] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const pageSize = 50;

  const loadCustomers = async () => {
    try {
      const offset = (currentPage - 1) * pageSize;
      const params = search
        ? { search, limit: pageSize, offset }
        : { limit: pageSize, offset };
      const res = await customers.list(params);
      setCustomerList(res.data.customers || []);
      setTotalCustomers(res.data.total || 0);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setCurrentPage(1); // Reset to page 1 when search changes
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadCustomers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, currentPage]);

  const handleDelete = (id) => {
    setCustomerList(customerList.filter((c) => c.id !== id));
    setSelectedCustomers(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSelectCustomer = (id, checked) => {
    setSelectedCustomers(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomers(new Set(customerList.map(c => c.id)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedCustomers.size;
    if (!confirm(`Delete ${count} customer(s)? This cannot be undone.`)) return;

    try {
      await customers.bulkDelete(Array.from(selectedCustomers));
      setCustomerList(customerList.filter(c => !selectedCustomers.has(c.id)));
      setSelectedCustomers(new Set());
      toast.success(`Successfully deleted ${count} customer(s)`);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete customers');
    }
  };

  const handleOpenAddToSubmission = async () => {
    setShowAddToSubmissionModal(true);
    setSubmissionSearch('');
    setSelectedSubmission('');
    setLoadingSubmissions(true);
    try {
      const res = await submissions.list({ limit: 100 });
      setSubmissionsList(res.data.submissions || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleBulkAddToSubmission = async () => {
    if (!selectedSubmission) {
      toast.error('Please select a submission');
      return;
    }

    try {
      const res = await customers.bulkAddToSubmission(
        Array.from(selectedCustomers),
        selectedSubmission
      );
      toast.success(res.data.message);
      setShowAddToSubmissionModal(false);
      setSelectedCustomers(new Set());
      setSelectedSubmission('');
    } catch (error) {
      console.error('Bulk add to submission failed:', error);
      toast.error('Failed to add customers to submission');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`WARNING: Delete ALL customers?\n\nThis will permanently delete every customer in your database. This cannot be undone.\n\nType YES in the next prompt to confirm.`)) return;

    const confirmation = prompt('Type YES to confirm deletion of ALL customers:');
    if (confirmation !== 'YES') {
      toast.error('Deletion cancelled');
      return;
    }

    try {
      const res = await customers.deleteAll();
      setCustomerList([]);
      setSelectedCustomers(new Set());
      toast.success(`Successfully deleted all ${res.data.deletedCount} customers`);
    } catch (error) {
      console.error('Delete all failed:', error);
      toast.error('Failed to delete all customers');
    }
  };

  const handleSendBulkIntroEmails = async () => {
    if (!confirm(`Send introduction emails to all customers with active submissions?\n\nThis will send a welcome email with portal access and submission details to each customer.`)) return;

    // Show progress modal
    setShowEmailProgressModal(true);
    setSendingIntroEmails(true);
    setEmailProgress({ sent: 0, total: 0, failed: 0 });

    // Start a timer to estimate progress (4 seconds per email)
    let estimatedCount = 0;
    const progressTimer = setInterval(() => {
      estimatedCount++;
      setEmailProgress(prev => ({ ...prev, sent: estimatedCount }));
    }, 4000);

    try {
      const res = await customers.sendBulkIntroductionEmails();
      clearInterval(progressTimer);

      const { sent, failed, skipped, total } = res.data;
      setEmailProgress({ sent, total, failed });

      // Keep modal open for 2 seconds to show final results
      setTimeout(() => {
        setShowEmailProgressModal(false);
        toast.success(`Introduction emails sent: ${sent} of ${total}${skipped > 0 ? `, ${skipped} skipped` : ''}${failed > 0 ? `, ${failed} failed` : ''}`);
      }, 2000);
    } catch (error) {
      clearInterval(progressTimer);
      setShowEmailProgressModal(false);
      console.error('Send bulk intro emails failed:', error);
      toast.error(error.response?.data?.error || 'Failed to send introduction emails');
    } finally {
      setSendingIntroEmails(false);
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

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingCSV(true);
    try {
      const text = await file.text();
      const res = await customers.importCSV(text);

      const { imported, skipped, errors } = res.data;
      let message = `Successfully imported ${imported} customer(s)`;
      if (skipped > 0) message += `, skipped ${skipped} duplicate(s)`;
      if (errors && errors.length > 0) {
        message += ` with ${errors.length} error(s)`;
      }
      toast.success(message);

      // Reload customers
      await loadCustomers();
    } catch (error) {
      console.error('CSV import failed:', error);
      toast.error(error.response?.data?.error || 'Failed to import CSV');
    } finally {
      setImportingCSV(false);
      e.target.value = '';
    }
  };

  const allSelected = customerList.length > 0 && selectedCustomers.size === customerList.length;
  const someSelected = selectedCustomers.size > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl" style={{ background: 'var(--hdr-gradient)', boxShadow: 'var(--hdr-shadow)', border: 'var(--hdr-border)' }}>
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full" style={{ background: 'var(--hdr-circle-1)' }} />
        <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full" style={{ background: 'var(--hdr-circle-2)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 sm:px-8 py-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--hdr-eyebrow)' }}>Management</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight" style={{ color: 'var(--hdr-title)' }}>Customers</h1>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--hdr-sub)' }}>
              {customerList.length > 0 ? `${customerList.length} registered` : 'Manage your card shop customers'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {customerList.length > 0 && (
              <>
                <button
                  onClick={() => setShowTestEmailModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20" style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
                  title="Send a test email to preview the introduction email"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
                <button
                  onClick={handleSendBulkIntroEmails}
                  disabled={sendingIntroEmails}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-blue-600 disabled:opacity-50" style={{ background: 'rgba(59,130,246,0.85)', color: 'white' }}
                  title="Send introduction email to all customers in active submissions"
                >
                  {sendingIntroEmails ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {sendingIntroEmails ? 'Sending...' : 'Send Intros'}
                  </span>
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-red-600" style={{ background: 'rgba(239,68,68,0.85)', color: 'white' }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete All</span>
                </button>
              </>
            )}
            <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20 cursor-pointer" style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}>
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">{importingCSV ? 'Importing...' : 'Import CSV'}</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                disabled={importingCSV}
                className="hidden"
              />
            </label>
            <ExportButton endpoint="/customers/export.csv" label="" />
            <Link to="/customers/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Customer</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {someSelected && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">
                {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} selected across all searches
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddToSubmission}
                className="btn btn-primary gap-2"
              >
                <Package className="w-4 h-4" />
                Assign to Submission
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn bg-red-600 text-white hover:bg-red-700 gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setSelectedCustomers(new Set())}
                className="btn btn-secondary gap-2"
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : customerList.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-brand-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search ? 'No matching customers' : 'No customers'}
            </h3>
            <p className="text-gray-500 mb-4">
              {search ? 'Try adjusting your search' : 'Create a customer record to begin tracking submissions.'}
            </p>
            {!search && (
              <Link to="/customers/new" className="btn btn-primary">
                New Customer
              </Link>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                    />
                  </th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Submissions</th>
                  <th>Cards</th>
                  <th>Portal</th>
                  <th>Last Visit</th>
                  <th>Added</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customerList.map((customer) => (
                  <CustomerRow
                    key={customer.id}
                    customer={customer}
                    onDelete={handleDelete}
                    selected={selectedCustomers.has(customer.id)}
                    onSelect={handleSelectCustomer}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCustomers > pageSize && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCustomers)} of {totalCustomers} customers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {Math.ceil(totalCustomers / pageSize)}
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= Math.ceil(totalCustomers / pageSize)}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {customerList.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {totalCustomers} total customer{totalCustomers !== 1 ? 's' : ''}
        </p>
      )}

      {/* Add to Submission Modal */}
      {showAddToSubmissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-brand-600" />
                Assign to Submission
              </h3>
              <button
                onClick={() => setShowAddToSubmissionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600 mb-4">
                Adding {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} to a submission
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search & Select Submission
              </label>

              {loadingSubmissions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                </div>
              ) : (
                <>
                  {/* Search input */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by PSA #, order #, or customer name..."
                      value={submissionSearch}
                      onChange={(e) => setSubmissionSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white text-gray-900"
                    />
                  </div>

                  {/* Submission list — clickable cards instead of a dropdown */}
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                    {submissionsList
                      .filter((sub) => {
                        if (!submissionSearch) return true;
                        const q = submissionSearch.toLowerCase();
                        return (sub.psa_submission_number || '').toLowerCase().includes(q) ||
                               (sub.internal_id || '').toLowerCase().includes(q) ||
                               (sub.customer_name || '').toLowerCase().includes(q);
                      })
                      .map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubmission(sub.id)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                            selectedSubmission === sub.id
                              ? 'bg-blue-50 border-l-4 border-l-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-900">
                              PSA #{sub.psa_submission_number || sub.internal_id || '—'}
                            </p>
                            {sub.current_step && (
                              <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                {sub.current_step}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {sub.service_level || 'Unknown service'} · {sub.card_count || 0} cards
                            {sub.customer_name ? ` · ${sub.customer_name}` : ''}
                          </p>
                        </button>
                      ))}
                    {submissionsList.filter((sub) => {
                      if (!submissionSearch) return true;
                      const q = submissionSearch.toLowerCase();
                      return (sub.psa_submission_number || '').toLowerCase().includes(q) ||
                             (sub.internal_id || '').toLowerCase().includes(q) ||
                             (sub.customer_name || '').toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="px-4 py-3 text-gray-500 text-sm text-center">
                        No submissions found
                      </div>
                    )}
                  </div>

                  {/* Selected indicator */}
                  {selectedSubmission && (
                    <button
                      onClick={() => setSelectedSubmission('')}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Clear selection
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBulkAddToSubmission}
                disabled={!selectedSubmission}
                className="flex-1 bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                Assign to Submission
              </button>
              <button
                onClick={() => setShowAddToSubmissionModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Introduction Email Modal */}
      {showTestEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
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

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Send a test introduction email to preview how it will look. The test email will include sample submission data.
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendTestEmail()}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                The test email will use sample customer and submission data
              </p>
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

      {/* Email Progress Modal */}
      {showEmailProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <div className="mb-4">
                <Mail className="w-12 h-12 text-blue-600 mx-auto animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Sending Introduction Emails
              </h3>
              <p className="text-gray-600 mb-6">
                {emailProgress.total > 0 ? (
                  <>Successfully sent {emailProgress.sent} of {emailProgress.total} emails</>
                ) : (
                  <>Sending emails... ({emailProgress.sent} sent so far)</>
                )}
              </p>

              {/* Progress Bar with SAM */}
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-visible relative">
                <div
                  className="bg-gradient-to-r from-brand-600 to-brand-700 h-full rounded-full transition-all duration-500 ease-out relative"
                  style={{
                    width: emailProgress.total > 0
                      ? `${(emailProgress.sent / emailProgress.total) * 100}%`
                      : '100%'
                  }}
                >
                  {/* SAM character moving along the bar */}
                  <div className="absolute -right-6 -top-6 transform transition-all duration-500">
                    <div className="relative w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center shadow-lg">
                      <img
                        src="/images/SAM_V2.png"
                        alt="SAM"
                        className="w-10 h-10 animate-bounce rounded-full"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="text-brand-600 text-2xl font-bold animate-bounce">📧</div>';
                        }}
                      />
                    </div>
                  </div>
                  {emailProgress.total > 0 && emailProgress.sent === emailProgress.total && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                      <span className="text-lg">🎉</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              {emailProgress.total > 0 && (
                <div className="flex justify-center gap-4 text-sm">
                  <div className="text-green-600 font-medium">
                    ✓ {emailProgress.sent} sent
                  </div>
                  {emailProgress.failed > 0 && (
                    <div className="text-red-600 font-medium">
                      ✗ {emailProgress.failed} failed
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4">
                Please wait... This may take a few minutes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

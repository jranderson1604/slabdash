import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { submissions, emailTemplates, psaImport } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Search,
  RefreshCw,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  Users,
  User,
  X,
  ExternalLink,
  Mail,
  Send,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';

function ProgressBar({ percent }) {
  const getColor = (p) => {
    if (p >= 100) return 'bg-green-500';
    if (p >= 75) return 'bg-blue-500';
    if (p >= 50) return 'bg-yellow-500';
    return 'bg-brand-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 progress-bar w-20">
        <div
          className={`progress-bar-fill ${getColor(percent)}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-500 w-8">{percent}%</span>
    </div>
  );
}

function StatusBadge({ submission }) {
  // Define status information with colors and explanations
  const getStatusInfo = () => {
    if (submission.shipped) {
      return {
        label: 'Shipped',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <CheckCircle2 className="w-3 h-3" />,
        description: 'Your cards have been shipped back to you'
      };
    }
    if (submission.problem_order) {
      return {
        label: 'Problem',
        color: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: <AlertCircle className="w-3 h-3" />,
        description: 'There is an issue with this order - check details'
      };
    }
    if (submission.grades_ready) {
      return {
        label: 'Grades Ready',
        color: 'bg-sky-100 text-sky-800 border-sky-200',
        icon: <CheckCircle2 className="w-3 h-3" />,
        description: 'Grading complete - awaiting shipment'
      };
    }

    // Determine in-progress status based on current step
    const step = submission.current_step || 'Pending';
    const stepLower = step.toLowerCase();

    if (stepLower.includes('research') || stepLower.includes('assembly')) {
      return {
        label: step,
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Clock className="w-3 h-3" />,
        description: 'Initial processing and card review'
      };
    }
    if (stepLower.includes('grading') || stepLower.includes('grade')) {
      return {
        label: step,
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Clock className="w-3 h-3" />,
        description: 'Cards are being graded by PSA'
      };
    }
    if (stepLower.includes('qa') || stepLower.includes('quality')) {
      return {
        label: step,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Clock className="w-3 h-3" />,
        description: 'Quality assurance check in progress'
      };
    }
    if (stepLower.includes('encapsulation') || stepLower.includes('encap')) {
      return {
        label: step,
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: <Clock className="w-3 h-3" />,
        description: 'Cards are being sealed in protective cases'
      };
    }

    return {
      label: step,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <Clock className="w-3 h-3" />,
      description: 'Processing in progress'
    };
  };

  const status = getStatusInfo();

  return (
    <div className="group relative">
      <span className={`badge flex items-center gap-1 border ${status.color}`}>
        {status.icon}
        {status.label}
      </span>
      {/* Tooltip with explanation */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10">
        {status.description}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}

function SubmissionRow({ submission, onRefresh, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const navigate = useNavigate();

  const handleRefresh = async (e) => {
    e.stopPropagation();
    setRefreshing(true);
    setMenuOpen(false);
    try {
      await submissions.refresh(submission.id);
      onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendUpdate = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);

    const customerCount = submission.linked_customers?.length || 0;
    if (customerCount === 0) {
      alert('No customers linked to this submission');
      return;
    }

    if (!confirm(`Send status update email to ${customerCount} customer(s) for this submission?`)) {
      return;
    }

    setSendingEmail(true);
    try {
      const response = await emailTemplates.sendSubmissionUpdate(submission.id);
      alert(response.data.message || `Email sent to ${response.data.emails_sent} customer(s)!`);
    } catch (error) {
      console.error('Send email failed:', error);
      alert(error.response?.data?.error || 'Failed to send status update');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this submission? This cannot be undone.')) return;
    setMenuOpen(false);
    try {
      await submissions.delete(submission.id);
      onDelete(submission.id);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const customerCount = submission.linked_customers?.length || 0;

  return (
    <>
      <tr
        className="cursor-pointer"
        onClick={() => navigate(`/submissions/${submission.id}`)}
      >
        <td>
          <div>
            <p className="font-medium text-gray-900">
              {submission.psa_submission_number || submission.internal_id || 'No ID'}
            </p>
            {submission.psa_order_number && (
              <p className="text-xs text-gray-500">Order: {submission.psa_order_number}</p>
            )}
          </div>
        </td>
        <td onClick={(e) => e.stopPropagation()}>
          {customerCount > 0 ? (
            <button
              onClick={() => setShowCustomersModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">{customerCount} customer{customerCount !== 1 ? 's' : ''}</span>
            </button>
          ) : (
            <span className="text-gray-400">No customers</span>
          )}
        </td>
      <td>
        <span className="text-gray-600">{submission.service_level || '—'}</span>
      </td>
      <td>
        <ProgressBar percent={submission.progress_percent || 0} />
      </td>
      <td>
        <StatusBadge submission={submission} />
      </td>
      <td>
        <span className="text-gray-600">{submission.card_count || 0}</span>
      </td>
      <td>
        <span className="text-gray-500">
          {submission.date_sent ? format(new Date(submission.date_sent), 'MMM d, yyyy') : '—'}
        </span>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreVertical className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 fade-in">
                <Link
                  to={`/submissions/${submission.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </Link>
                <button
                  onClick={handleRefresh}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh from PSA
                </button>
                <button
                  onClick={handleSendUpdate}
                  disabled={sendingEmail}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Status Update
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

      {/* Customers Modal */}
      {showCustomersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-600" />
                    Customers in Submission
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {submission.psa_submission_number || submission.internal_id}
                  </p>
                </div>
                <button
                  onClick={() => setShowCustomersModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {submission.linked_customers.map((customer) => (
                  <Link
                    key={customer.id}
                    to={`/customers/${customer.id}`}
                    onClick={() => setShowCustomersModal(false)}
                    className="block border border-gray-200 rounded-lg p-4 hover:border-brand-300 hover:bg-brand-50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 mt-1 ml-6">{customer.email}</p>
                        {customer.phone && (
                          <p className="text-sm text-gray-500 ml-6">{customer.phone}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCustomersModal(false)}
                className="btn btn-secondary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Submissions() {
  const { company } = useAuth();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState({ total: 0, current: 0, updated: 0, errors: 0 });
  const [sendingBulk, setSendingBulk] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'shipped', 'problems'
  const [serviceLevelFilter, setServiceLevelFilter] = useState('all'); // 'all', or specific service level
  const [search, setSearch] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [importProgress, setImportProgress] = useState({ phase: '', current: 0, total: 0, created: 0, updated: 0, refreshed: 0, errors: 0 });

  const loadSubmissions = async () => {
    try {
      // Always load ALL submissions, no backend filtering
      const res = await submissions.list({});
      setSubs(res.data.submissions || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    if (!company?.hasPsaKey) {
      alert('PSA API key not configured. Please add your PSA API key in Company Settings to refresh submissions.');
      return;
    }

    if (!confirm('This will refresh all active submissions from PSA.\n\n⏱️ This process takes 5-7 seconds per submission to avoid rate limits.\n\nSome submissions may fail due to PSA rate limiting - this is normal.\n\nContinue?')) {
      return;
    }

    setRefreshingAll(true);
    setRefreshProgress({ total: 0, current: 0, updated: 0, errors: 0 });

    try {
      const token = localStorage.getItem('slabdash_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const eventSource = new EventSource(`${API_URL}/psa/refresh-all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Note: EventSource doesn't support custom headers, so we'll use fetch with streaming
      const response = await fetch(`${API_URL}/psa/refresh-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'start') {
                setRefreshProgress({ total: data.total, current: 0, updated: 0, errors: 0 });
              } else if (data.type === 'progress') {
                setRefreshProgress({
                  total: data.total,
                  current: data.current,
                  updated: data.updated,
                  errors: data.errors
                });
              } else if (data.type === 'complete') {
                setRefreshProgress({
                  total: data.total,
                  current: data.total,
                  updated: data.updated,
                  errors: data.errors
                });
                await loadSubmissions();

                let message = `✓ Refresh Complete!\n\nUpdated: ${data.updated}\nFailed: ${data.errors}`;
                if (data.errors > 0) {
                  message += '\n\nℹ️ Some submissions failed due to PSA rate limiting.\nYou can try refreshing individual submissions later.';
                }
                alert(message);
              } else if (data.type === 'error') {
                throw new Error(data.details || 'Failed to refresh submissions');
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Refresh all failed:', error);
      const errorMsg = error.message || 'Failed to refresh submissions';
      alert(`Refresh failed: ${errorMsg}\n\nPlease check your PSA API key in Company Settings.`);
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleBulkEmail = async () => {
    if (!confirm('Send status update emails to ALL customers with active submissions?')) {
      return;
    }

    setSendingBulk(true);
    try {
      const response = await emailTemplates.sendBulkStatusUpdate();
      const emailsSent = response.data.emails_sent || 0;
      const emailsFailed = response.data.emails_failed || 0;
      alert(`Bulk email complete!\n\nSent: ${emailsSent}\nFailed: ${emailsFailed}`);
    } catch (error) {
      console.error('Bulk email failed:', error);
      alert(error.response?.data?.error || 'Failed to send bulk emails');
    } finally {
      setSendingBulk(false);
    }
  };

  const handleCsvImport = async (file) => {
    setImporting(true);
    setImportProgress({ phase: '', current: 0, total: 0, created: 0, updated: 0, refreshed: 0, errors: 0 });

    try {
      const csvData = await file.text();

      if (!autoRefresh) {
        // Quick import without refresh
        const response = await psaImport.importCsv(csvData);
        const { created, updated, skipped } = response.data;
        alert(`PSA CSV Import Complete!\n\nCreated: ${created}\nUpdated: ${updated}\nSkipped: ${skipped}`);
        await loadSubmissions();
        setShowCsvImport(false);
      } else {
        // Import with auto-refresh from PSA API
        const token = localStorage.getItem('slabdash_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

        const response = await fetch(`${API_URL}/psa-import/import-and-refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ csvData })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'start') {
                  setImportProgress(prev => ({ ...prev, phase: data.phase, total: data.total }));
                } else if (data.type === 'progress') {
                  setImportProgress(prev => ({
                    ...prev,
                    phase: data.phase,
                    current: data.current,
                    total: data.total || prev.total,
                    created: data.created || prev.created,
                    updated: data.updated || prev.updated,
                    refreshed: data.refreshed || prev.refreshed,
                    errors: data.errors || prev.errors
                  }));
                } else if (data.type === 'import_complete') {
                  setImportProgress(prev => ({
                    ...prev,
                    created: data.created,
                    updated: data.updated
                  }));
                } else if (data.type === 'complete') {
                  await loadSubmissions();

                  let message = `✓ Import & Refresh Complete!\n\n`;
                  message += `Imported: ${data.created} created, ${data.updated} updated\n`;
                  message += `Refreshed: ${data.refreshed} updated from PSA API\n`;
                  if (data.refreshErrors > 0) {
                    message += `Failed: ${data.refreshErrors} (due to rate limiting)\n\n`;
                    message += `ℹ️ Some submissions failed to refresh.\nYou can try refreshing them individually later.`;
                  }
                  alert(message);
                  setShowCsvImport(false);
                } else if (data.type === 'error') {
                  throw new Error(data.details || 'Import and refresh failed');
                }
              } catch (parseError) {
                console.error('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('CSV import failed:', error);
      alert(error.message || 'Failed to import PSA CSV');
    } finally {
      setImporting(false);
      setImportProgress({ phase: '', current: 0, total: 0, created: 0, updated: 0, refreshed: 0, errors: 0 });
    }
  };

  const handleDelete = (id) => {
    setSubs(subs.filter((s) => s.id !== id));
  };

  useEffect(() => {
    loadSubmissions();
  }, [filter]);

  // Sort submissions by date (newest first)
  const sortedSubs = [...subs].sort((a, b) => {
    const dateA = new Date(a.date_sent || a.created_at || 0);
    const dateB = new Date(b.date_sent || b.created_at || 0);
    return dateB - dateA; // Newest first
  });

  // Enhanced filter by search - includes order #, sub #, customer name, and card names
  const filteredSubs = sortedSubs.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.psa_submission_number?.toLowerCase().includes(q) ||
      s.psa_order_number?.toLowerCase().includes(q) ||
      s.internal_id?.toLowerCase().includes(q) ||
      s.customer_name?.toLowerCase().includes(q) ||
      s.customer_email?.toLowerCase().includes(q) ||
      // Search through card names if CSV data is loaded
      s.cards?.some(card =>
        card.card_name?.toLowerCase().includes(q) ||
        card.year?.toString().includes(q) ||
        card.brand?.toLowerCase().includes(q)
      )
    );
  });

  // Additional filter for problems
  let displaySubs = filter === 'problems'
    ? filteredSubs.filter(s => s.problem_order)
    : filteredSubs;

  // Filter by service level
  if (serviceLevelFilter !== 'all') {
    displaySubs = displaySubs.filter(s => s.service_level === serviceLevelFilter);
  }

  // Total submission count
  const totalCount = subs.length;

  // Get unique service levels for tabs, ordered by volume (Bulk → Plus → Regular → Express → Specialty)
  const serviceOrder = ['Bulk', 'Value Bulk', 'Plus', 'Value Plus', 'Regular', 'Standard', 'Express', 'Super Express', 'Walk-Through', 'Walk-Thru', 'Specialty', 'Reholder'];
  const uniqueLevels = [...new Set(subs.map(s => s.service_level).filter(Boolean))];
  const orderedLevels = uniqueLevels.sort((a, b) => {
    const indexA = serviceOrder.findIndex(s => a?.toLowerCase().includes(s.toLowerCase()));
    const indexB = serviceOrder.findIndex(s => b?.toLowerCase().includes(s.toLowerCase()));
    if (indexA === -1 && indexB === -1) return a?.localeCompare(b) || 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  const serviceLevels = ['all', ...orderedLevels];

  // Service level colors
  const getServiceColor = (level) => {
    const levelLower = level?.toLowerCase() || '';
    if (levelLower.includes('bulk')) return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', activeBg: 'bg-purple-500', activeText: 'text-white' };
    if (levelLower.includes('plus')) return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', activeBg: 'bg-blue-500', activeText: 'text-white' };
    if (levelLower.includes('regular') || levelLower.includes('standard')) return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', activeBg: 'bg-green-500', activeText: 'text-white' };
    if (levelLower.includes('express')) return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', activeBg: 'bg-orange-500', activeText: 'text-white' };
    if (levelLower.includes('specialty') || levelLower.includes('reholder')) return { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', activeBg: 'bg-pink-500', activeText: 'text-white' };
    if (levelLower.includes('walk')) return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', activeBg: 'bg-red-500', activeText: 'text-white' };
    return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', activeBg: 'bg-gray-500', activeText: 'text-white' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
            <p className="text-gray-500 mt-1">Track and manage PSA orders</p>
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded-lg hover:bg-gray-100 text-brand-500"
            title="Show help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCsvImport(true)}
            className="btn btn-secondary gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import PSA CSV</span>
          </button>
          <button
            onClick={handleBulkEmail}
            disabled={sendingBulk}
            className="btn btn-secondary gap-2"
          >
            <Mail className={`w-4 h-4 ${sendingBulk ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{sendingBulk ? 'Sending...' : 'Email All'}</span>
          </button>
          {company?.hasPsaKey && (
            <button
              onClick={handleRefreshAll}
              disabled={refreshingAll}
              className="btn btn-secondary gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingAll ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshingAll ? 'Refreshing...' : 'Refresh All'}</span>
            </button>
          )}
          <Link to="/submissions/new" className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Submission</span>
          </Link>
        </div>
      </div>

      {/* Refresh Progress Bar */}
      {refreshingAll && (
        <div className="card bg-gradient-to-br from-brand-50 to-white border-brand-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-brand-600 animate-spin" />
                <h3 className="font-semibold text-gray-900">Refreshing Submissions from PSA</h3>
              </div>
              <span className="text-sm text-gray-600">
                {refreshProgress.current} / {refreshProgress.total}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500 ease-out"
                style={{
                  width: `${refreshProgress.total > 0 ? (refreshProgress.current / refreshProgress.total) * 100 : 0}%`
                }}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-600">Updated: <strong className="text-green-600">{refreshProgress.updated}</strong></span>
              </div>
              {refreshProgress.errors > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-600">Errors: <strong className="text-red-600">{refreshProgress.errors}</strong></span>
                </div>
              )}
              <div className="flex-1" />
              <span className="text-gray-500">
                {Math.round((refreshProgress.current / refreshProgress.total) * 100) || 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      {showHelp && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">How to Use Submissions</h3>
                <ul className="text-sm text-blue-800 space-y-1.5 list-disc list-inside">
                  <li><strong>Search:</strong> Find submissions by PSA order #, submission #, customer name, or even specific card names (when CSV data is loaded)</li>
                  <li><strong>Filter:</strong> View all submissions, only active ones, shipped orders, or those with problems</li>
                  <li><strong>Refresh:</strong> Click "Refresh All" to update all submission statuses from PSA (requires PSA API key)</li>
                  <li><strong>Track Progress:</strong> View real-time progress bars showing where each submission is in the PSA process</li>
                  <li><strong>View Details:</strong> Click any submission row to see full details, cards, and customer information</li>
                </ul>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Level Tabs */}
      {serviceLevels.length > 1 && (
        <div className="card">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto bg-gray-50">
              {serviceLevels.map((level) => {
                // Count for this service level
                const levelSubs = sortedSubs.filter(s => level === 'all' || s.service_level === level);
                const count = levelSubs.length;
                const displayName = level === 'all' ? 'All Services' : level;
                const colors = level === 'all' ? null : getServiceColor(level);

                return (
                  <button
                    key={level}
                    onClick={() => setServiceLevelFilter(level)}
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                      serviceLevelFilter === level
                        ? (colors ? `${colors.activeBg} ${colors.activeText}` : 'bg-brand-500 text-white')
                        : (colors ? `${colors.bg} ${colors.text} hover:${colors.border}` : 'bg-white text-gray-600 hover:bg-gray-100')
                    }`}
                  >
                    {displayName}
                    <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      serviceLevelFilter === level
                        ? 'bg-white bg-opacity-30'
                        : 'bg-white bg-opacity-50'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order #, sub #, customer name, or card name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="problems">Problems Only</option>
            </select>
          </div>
        </div>
      </div>


      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : displaySubs.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search ? 'No matching submissions' : 'No submissions yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {search
                ? 'Try adjusting your search or filters'
                : 'Create your first submission to start tracking'}
            </p>
            {!search && (
              <Link to="/submissions/new" className="btn btn-primary">
                New Submission
              </Link>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Submission #</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Cards</th>
                  <th>Date Arrived at PSA</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displaySubs.map((sub) => (
                  <SubmissionRow
                    key={sub.id}
                    submission={sub}
                    onRefresh={loadSubmissions}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary footer */}
      {displaySubs.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          Showing {displaySubs.length} submission{displaySubs.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* PSA CSV Import Modal */}
      {showCsvImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-brand-600" />
                    Import PSA Bulk Export CSV
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload your PSA bulk export CSV to create or update multiple submissions
                  </p>
                </div>
                <button
                  onClick={() => setShowCsvImport(false)}
                  disabled={importing}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm text-blue-800">
                      <p className="font-medium mb-2">How to get your PSA CSV:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Log in to your PSA account</li>
                        <li>Navigate to your submissions dashboard</li>
                        <li>Click the export/download button to get the bulk CSV</li>
                        <li>Upload the CSV file here to import all submissions</li>
                      </ol>
                      <p className="mt-2">
                        <strong>Expected columns:</strong> Order #, Submission #, Status, Items, Service, Track Package, Arrived, Completed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auto-refresh toggle */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      disabled={importing}
                      className="mt-1 w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-yellow-900">Auto-refresh from PSA API (Optional - Slow)</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Automatically fetch progress from PSA API after import. Takes 7-10 seconds per submission.
                        PSA has strict rate limits - many will fail. <strong>Recommended: Import CSV first, then use "Refresh All" button instead.</strong>
                      </p>
                    </div>
                  </label>
                </div>

                {/* Import progress */}
                {importing && importProgress.phase && (
                  <div className="bg-gradient-to-br from-brand-50 to-white border border-brand-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                      <h4 className="font-semibold text-gray-900">
                        {importProgress.phase === 'import' ? 'Importing CSV Data...' : 'Refreshing from PSA API...'}
                      </h4>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
                        style={{
                          width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {importProgress.current} / {importProgress.total}
                      </span>
                      {importProgress.phase === 'import' && (
                        <span className="text-gray-600">
                          Created: {importProgress.created}, Updated: {importProgress.updated}
                        </span>
                      )}
                      {importProgress.phase === 'refresh' && (
                        <span className="text-gray-600">
                          Refreshed: {importProgress.refreshed}, Errors: {importProgress.errors}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand-400 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium mb-2">Choose PSA CSV file</p>
                  <p className="text-sm text-gray-500 mb-4">
                    {autoRefresh ? 'Will auto-refresh each submission from PSA API' : 'Quick import without API refresh'}
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleCsvImport(file);
                      }
                    }}
                    disabled={importing}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className={`btn btn-primary inline-flex items-center gap-2 cursor-pointer ${
                      importing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Select CSV File
                      </>
                    )}
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm text-blue-800">
                      <p className="font-medium mb-2">Recommended workflow:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li><strong>Import CSV</strong> (leave auto-refresh unchecked for speed)</li>
                        <li><strong>Click "Refresh All"</strong> button after import completes</li>
                        <li>Submissions will auto-categorize into correct tabs based on progress</li>
                      </ol>
                      <p className="mt-2 text-xs">
                        Updates existing submissions by PSA Submission Number - no duplicates created.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCsvImport(false)}
                disabled={importing}
                className="btn btn-secondary w-full disabled:opacity-50"
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

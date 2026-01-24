import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { submissions } from '../api/client';
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
  if (submission.shipped) {
    return (
      <span className="badge badge-green flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Shipped
      </span>
    );
  }
  if (submission.problem_order) {
    return (
      <span className="badge badge-red flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Problem
      </span>
    );
  }
  if (submission.grades_ready) {
    return (
      <span className="badge badge-blue flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Grades Ready
      </span>
    );
  }
  return (
    <span className="badge badge-yellow flex items-center gap-1">
      <Clock className="w-3 h-3" />
      {submission.current_step || 'Pending'}
    </span>
  );
}

function SubmissionRow({ submission, onRefresh, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
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
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'shipped', 'problems'
  const [search, setSearch] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const loadSubmissions = async () => {
    try {
      const params = {};
      if (filter !== 'all') {
        params.status = filter; // Send 'active', 'shipped', etc. as status parameter
      }

      const res = await submissions.list(params);
      setSubs(res.data.submissions || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    if (!company?.hasPsaKey) return;
    setRefreshingAll(true);
    try {
      await submissions.refreshAll();
      await loadSubmissions();
    } catch (error) {
      console.error('Refresh all failed:', error);
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleDelete = (id) => {
    setSubs(subs.filter((s) => s.id !== id));
  };

  useEffect(() => {
    loadSubmissions();
  }, [filter]);

  // Enhanced filter by search - includes order #, sub #, customer name, and card names
  const filteredSubs = subs.filter((s) => {
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
  const displaySubs = filter === 'problems' 
    ? filteredSubs.filter(s => s.problem_order)
    : filteredSubs;

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
              <option value="all">All Submissions</option>
              <option value="active">Active Only</option>
              <option value="shipped">Shipped</option>
              <option value="problems">Problems</option>
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
                  <th>Date Sent</th>
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
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { submissions, emailTemplates, psaImport, psa } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import {
  Plus, Search, RefreshCw, Filter, MoreVertical, Eye, Trash2,
  Package, Loader2, AlertCircle, CheckCircle2, Clock, Info, Users,
  User, X, ExternalLink, Mail, Send, Upload, Download, ChevronDown,
  ChevronRight, Zap, Calendar, ArrowUpDown, PackageCheck
} from 'lucide-react';
import { format } from 'date-fns';

// Service level display config (updated Feb 2026 turnaround times)
const SERVICE_CONFIG = {
  'Walk-Through': { color: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', border: 'border-red-200', emoji: '⚡', speed: '1-2 days' },
  'Walk-Thru': { color: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', border: 'border-red-200', emoji: '⚡', speed: '1-2 days' },
  'Super Express': { color: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', border: 'border-orange-200', emoji: '🔥', speed: '~5 days' },
  'Express': { color: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200', emoji: '🚀', speed: '10-20 days' },
  'Regular': { color: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50', border: 'border-green-200', emoji: '📦', speed: '~25 days' },
  'Standard': { color: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50', border: 'border-green-200', emoji: '📦', speed: '~25 days' },
  'Value Max': { color: 'bg-teal-500', text: 'text-teal-700', light: 'bg-teal-50', border: 'border-teal-200', emoji: '💎', speed: '~35 days' },
  'Value Plus': { color: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200', emoji: '💎', speed: '~45 days' },
  'Plus': { color: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200', emoji: '💎', speed: '~45 days' },
  'Value': { color: 'bg-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-50', border: 'border-indigo-200', emoji: '📋', speed: '~65 days' },
  'Value Bulk': { color: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', border: 'border-purple-200', emoji: '📋', speed: '~65 days' },
  'Bulk': { color: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', border: 'border-purple-200', emoji: '📋', speed: '~65 days' },
  'Specialty': { color: 'bg-pink-500', text: 'text-pink-700', light: 'bg-pink-50', border: 'border-pink-200', emoji: '✨', speed: 'Varies' },
  'Reholder': { color: 'bg-gray-500', text: 'text-gray-700', light: 'bg-gray-50', border: 'border-gray-200', emoji: '🔄', speed: 'Varies' },
};

const getServiceConfig = (level) => SERVICE_CONFIG[level] || { color: 'bg-gray-400', text: 'text-gray-600', light: 'bg-gray-50', border: 'border-gray-200', emoji: '📦', speed: '' };

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================
// SUBMISSION CARD — inline refresh, clear status
// ============================================
function SubmissionCard({ submission, onRefresh, onDelete }) {
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  const navigate = useNavigate();

  const config = getServiceConfig(submission.service_level);
  const customerCount = submission.linked_customers?.length || 0;
  const cardCount = submission.card_count || submission.cards?.length || 0;

  const handleRefresh = async (e) => {
    e.stopPropagation();
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await submissions.refresh(submission.id);
      const data = res.data;
      setRefreshResult(data.changes?.hadChanges ? 'updated' : 'no-change');
      onRefresh();
      setTimeout(() => setRefreshResult(null), 3000);
    } catch (error) {
      setRefreshResult('error');
      setTimeout(() => setRefreshResult(null), 3000);
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

  const progressColor = submission.problem_order
    ? 'bg-red-500'
    : submission.shipped
    ? 'bg-green-500'
    : submission.grades_ready
    ? 'bg-emerald-500'
    : 'bg-brand-500';

  return (
    <div
      className="group relative bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer"
      onClick={() => navigate(`/submissions/${submission.id}`)}
    >
      {/* Top accent bar — service level color */}
      <div className={`h-1 rounded-t-xl ${config.color}`} />

      <div className="p-4">
        {/* Row 1: Submission # + Status + Refresh */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-gray-900 text-sm truncate">
              {submission.psa_submission_number || submission.internal_id || 'No #'}
            </span>
            {submission.psa_order_number && (
              <span className="text-xs text-gray-400 hidden sm:inline">
                Order: {submission.psa_order_number}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Refresh result indicator */}
            {refreshResult === 'updated' && (
              <span className="text-xs text-green-600 font-medium animate-pulse">Updated!</span>
            )}
            {refreshResult === 'no-change' && (
              <span className="text-xs text-gray-400">No changes</span>
            )}
            {refreshResult === 'error' && (
              <span className="text-xs text-red-500">Failed</span>
            )}

            {/* Inline refresh button — always visible */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors disabled:opacity-50"
              title="Refresh from PSA"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-500' : ''}`} />
            </button>

            {/* More menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <Link
                      to={`/submissions/${submission.id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </Link>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Progress bar — uses estimated progress for smooth interpolation */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">
              {submission.current_step || 'Not Yet Sent'}
              {submission.estimated?.currentStepLabel && !submission.shipped && (
                <span className="text-gray-400 ml-1">({submission.estimated.currentStepLabel})</span>
              )}
            </span>
            <span className="text-xs font-bold text-gray-700">
              {submission.estimated?.estimatedProgress || submission.progress_percent || 0}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor}`}
              style={{ width: `${submission.estimated?.estimatedProgress || submission.progress_percent || 0}%` }}
            />
          </div>
          {/* Estimated time remaining */}
          {submission.estimated?.estimatedDaysRemaining > 0 && !submission.shipped && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-gray-400">
                ~{submission.estimated.estimatedDaysRemaining} days remaining
              </span>
              {submission.refreshPriority && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  submission.refreshPriority.tier === 'urgent' ? 'bg-red-50 text-red-600' :
                  submission.refreshPriority.tier === 'high' ? 'bg-amber-50 text-amber-600' :
                  submission.refreshPriority.tier === 'medium' ? 'bg-blue-50 text-blue-600' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {submission.refreshPriority.tier} priority
                </span>
              )}
            </div>
          )}
        </div>

        {/* Row 3: Status badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <StatusBadge submission={submission} />

          {submission.service_level && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${config.light} ${config.text} border ${config.border}`}>
              {config.emoji} {submission.service_level}
            </span>
          )}

          {submission.problem_order && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              <AlertCircle className="w-3 h-3" /> Problem
            </span>
          )}

          {/* Stale indicator: step duration exceeded expected time by 50%+ */}
          {!submission.shipped && !submission.problem_order && submission.estimated?.stepProgressPercent > 150 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200" title={`At ${submission.current_step} for ${submission.estimated.daysAtCurrentStep} days (expected ~${submission.estimated.expectedStepDuration})`}>
              <Clock className="w-3 h-3" /> Slow
            </span>
          )}
        </div>

        {/* Row 4: Customers + Cards + Date + Last Refreshed */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {customerCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {customerCount}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {cardCount} card{cardCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {submission.last_refreshed_at && (
              <span className="text-[10px] text-gray-300" title={`Last refreshed: ${new Date(submission.last_refreshed_at).toLocaleString()}`}>
                <RefreshCw className="w-3 h-3 inline mr-0.5" />
                {formatTimeAgo(submission.last_refreshed_at)}
              </span>
            )}
            <span>
              {submission.date_sent ? format(new Date(submission.date_sent), 'MMM d, yyyy') : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SERVICE LEVEL GROUP — collapsible section
// ============================================
function ServiceLevelGroup({ level, submissions: groupSubs, onRefresh, onDelete, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const config = getServiceConfig(level);

  const activeCount = groupSubs.filter(s => !s.shipped && s.progress_percent < 100).length;
  const readyCount = groupSubs.filter(s => s.grades_ready && !s.shipped).length;
  const problemCount = groupSubs.filter(s => s.problem_order).length;
  const totalCards = groupSubs.reduce((sum, s) => sum + (s.card_count || s.cards?.length || 0), 0);

  return (
    <div className="mb-4">
      {/* Group header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl ${config.light} border ${config.border} hover:shadow-sm transition-all`}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{config.emoji}</span>
          <div className="text-left">
            <h3 className={`font-bold text-sm ${config.text}`}>
              {level || 'Unassigned'}
            </h3>
            <p className="text-xs text-gray-500">
              {groupSubs.length} submission{groupSubs.length !== 1 ? 's' : ''} · {totalCards} cards
              {config.speed && ` · ~${config.speed}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {activeCount} active
            </span>
          )}
          {readyCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {readyCount} ready
            </span>
          )}
          {problemCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {problemCount} problem
            </span>
          )}

          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Cards grid */}
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3 pl-2">
          {groupSubs.map(sub => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              onRefresh={onRefresh}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function Submissions() {
  const { company } = useAuth();
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [importProgress, setImportProgress] = useState({ phase: '', current: 0, total: 0, created: 0, updated: 0, refreshed: 0, errors: 0 });
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(null); // { total, current, updated, errors, ... }
  const [pickupCode, setPickupCode] = useState('');
  const [pickupResult, setPickupResult] = useState(null);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupError, setPickupError] = useState('');

  const loadSubmissions = async () => {
    try {
      const res = await submissions.list({});
      setSubs(res.data.submissions || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubmissions(); }, []);

  const handleDelete = (id) => {
    setSubs(subs.filter(s => s.id !== id));
  };

  // ============================================
  // WEEKLY UPDATE
  // ============================================
  const handleSendWeeklyUpdate = async () => {
    if (!company?.hasPsaKey) {
      alert('PSA API key not configured. Add it in Company Settings.');
      return;
    }

    if (!confirm('Send weekly update?\n\nThis will refresh all active submissions from PSA and email you a report with all changes, buyback offers, and status updates.')) {
      return;
    }

    setSendingUpdate(true);
    setUpdateResult(null);
    try {
      const res = await psa.sendWeeklyUpdate();
      setUpdateResult({ success: true, ...res.data });
      await loadSubmissions();
    } catch (error) {
      const errData = error.response?.data;
      if (error.response?.status === 429) {
        setUpdateResult({
          success: false,
          message: `Already sent this week. Next available in ${errData.daysRemaining} day${errData.daysRemaining !== 1 ? 's' : ''}.`
        });
      } else {
        setUpdateResult({
          success: false,
          message: errData?.error || 'Failed to send update'
        });
      }
    } finally {
      setSendingUpdate(false);
    }
  };

  // ============================================
  // REFRESH ALL FROM PSA (SSE streaming)
  // ============================================
  const handleRefreshAll = async () => {
    if (!company?.hasPsaKey) {
      alert('PSA API key not configured. Add it in Company Settings.');
      return;
    }

    setRefreshingAll(true);
    setRefreshProgress({ total: 0, current: 0, updated: 0, errors: 0 });

    try {
      const token = localStorage.getItem('slabdash_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${API_URL}/psa/refresh-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

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
                  errors: data.errors,
                  submissionNumber: data.submissionNumber,
                  hadChanges: data.hadChanges,
                });
              } else if (data.type === 'complete') {
                setRefreshProgress(prev => ({ ...prev, ...data, done: true }));
                setUpdateResult({
                  success: true,
                  message: data.message,
                  updatedCount: data.updated,
                  changesCount: data.changedCount
                });
                await loadSubmissions();
              } else if (data.type === 'error') {
                setUpdateResult({
                  success: false,
                  message: data.error || 'Refresh failed'
                });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      setUpdateResult({
        success: false,
        message: error.message || 'Failed to refresh from PSA'
      });
    } finally {
      setRefreshingAll(false);
      setTimeout(() => setRefreshProgress(null), 5000);
    }
  };

  // ============================================
  // PICKUP CODE
  // ============================================
  const handlePickupCodeVerify = async (e) => {
    e.preventDefault();
    setPickupError('');
    setPickupLoading(true);
    try {
      const response = await submissions.verifyPickupCode({ pickup_code: pickupCode });
      setPickupResult(response.data);
      setPickupCode('');
    } catch (error) {
      setPickupError(error.response?.data?.error || 'Invalid pickup code');
      setPickupResult(null);
    } finally {
      setPickupLoading(false);
    }
  };

  // ============================================
  // CSV IMPORT
  // ============================================
  const handleCsvImport = async (file) => {
    setImporting(true);
    setImportProgress({ phase: '', current: 0, total: 0, created: 0, updated: 0, refreshed: 0, errors: 0 });

    try {
      const csvData = await file.text();

      if (!autoRefresh) {
        const response = await psaImport.importCsv(csvData);
        const { created, updated, skipped } = response.data;
        alert(`Import Complete!\n\nCreated: ${created}\nUpdated: ${updated}\nSkipped: ${skipped}`);
        await loadSubmissions();
        setShowCsvImport(false);
      } else {
        const token = localStorage.getItem('slabdash_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

        const response = await fetch(`${API_URL}/psa-import/import-and-refresh`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvData })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'progress') {
                  setImportProgress(prev => ({ ...prev, ...data }));
                } else if (data.type === 'complete') {
                  await loadSubmissions();
                  alert(`Import & Refresh Complete!\n\nCreated: ${data.created}\nRefreshed: ${data.refreshed}\nErrors: ${data.refreshErrors || 0}`);
                  setShowCsvImport(false);
                }
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      alert(error.message || 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  // ============================================
  // FILTERING
  // ============================================
  const filteredSubs = subs.filter(s => {
    if (filter === 'active' && (s.shipped || s.progress_percent >= 100)) return false;
    if (filter === 'completed' && !(s.shipped || s.progress_percent >= 100)) return false;
    if (filter === 'problems' && !s.problem_order) return false;
    if (filter === 'slow' && (s.shipped || s.problem_order || !(s.estimated?.stepProgressPercent > 150))) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        s.psa_submission_number?.toLowerCase().includes(q) ||
        s.psa_order_number?.toLowerCase().includes(q) ||
        s.internal_id?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q) ||
        s.customer_email?.toLowerCase().includes(q) ||
        s.linked_customers?.some(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) ||
        s.cards?.some(c =>
          c.player_name?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.psa_cert_number?.toLowerCase().includes(q)
        )
      );
    }
    return true;
  });

  // Group by service level
  const serviceOrder = ['Walk-Through', 'Walk-Thru', 'Super Express', 'Express', 'Regular', 'Standard', 'Value Max', 'Value Plus', 'Plus', 'Value', 'Value Bulk', 'Bulk', 'Specialty', 'Reholder'];

  const groupedSubs = {};
  for (const sub of filteredSubs) {
    const level = sub.service_level || 'Unassigned';
    if (!groupedSubs[level]) groupedSubs[level] = [];
    groupedSubs[level].push(sub);
  }

  const sortedGroups = Object.keys(groupedSubs).sort((a, b) => {
    const ia = serviceOrder.indexOf(a);
    const ib = serviceOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  // Stats
  const activeCount = subs.filter(s => !s.shipped && s.progress_percent < 100).length;
  const completedCount = subs.filter(s => s.shipped || s.progress_percent >= 100).length;
  const problemCount = subs.filter(s => s.problem_order).length;
  const staleCount = subs.filter(s => !s.shipped && !s.problem_order && s.estimated?.stepProgressPercent > 150).length;
  const totalCards = subs.reduce((sum, s) => sum + (s.card_count || s.cards?.length || 0), 0);
  const totalCustomers = new Set(subs.flatMap(s => (s.linked_customers || []).map(c => c.id))).size;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">SUBMISSIONS</h1>
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span>{subs.length} total</span>
              <span>{totalCards} cards</span>
              <span>{totalCustomers} customers</span>
            </div>
            {/* Smart auto-refresh indicator */}
            {company?.hasPsaKey && activeCount > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/40">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span>Auto-refresh active — {activeCount} submissions monitored</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {company?.hasPsaKey && (
              <>
                <button
                  onClick={handleRefreshAll}
                  disabled={refreshingAll || sendingUpdate}
                  className="bg-white text-brand-700 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50"
                >
                  {refreshingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {refreshingAll ? `${refreshProgress?.current || 0}/${refreshProgress?.total || 0}` : 'Refresh All'}
                </button>

                <button
                  onClick={handleSendWeeklyUpdate}
                  disabled={sendingUpdate || refreshingAll}
                  className="bg-white/15 hover:bg-white/25 text-white px-3 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 border border-white/20 disabled:opacity-50"
                >
                  {sendingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="hidden sm:inline">{sendingUpdate ? 'Sending...' : 'Weekly Report'}</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowCsvImport(true)}
              className="bg-white/15 hover:bg-white/25 text-white px-3 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 border border-white/20"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>

            <Link to="/submissions/new" className="bg-white/15 hover:bg-white/25 text-white px-3 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 border border-white/20">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </Link>
          </div>
        </div>

        {/* Refresh progress bar */}
        {refreshingAll && refreshProgress && (
          <div className="mt-4 rounded-xl p-3 bg-white/15 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-bold">Refreshing from PSA...</span>
              </div>
              <span className="text-sm font-mono">
                {refreshProgress.current}/{refreshProgress.total}
                {refreshProgress.updated > 0 && <span className="text-green-300 ml-2">+{refreshProgress.updated}</span>}
                {refreshProgress.errors > 0 && <span className="text-red-300 ml-1">{refreshProgress.errors} err</span>}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${refreshProgress.total > 0 ? (refreshProgress.current / refreshProgress.total) * 100 : 0}%` }}
              />
            </div>
            {refreshProgress.submissionNumber && (
              <p className="text-xs text-white/50 mt-1">
                {refreshProgress.submissionNumber}
                {refreshProgress.hadChanges && <span className="text-green-300 ml-1">updated!</span>}
              </p>
            )}
          </div>
        )}

        {/* Update result toast */}
        {updateResult && (
          <div className={`mt-4 rounded-xl p-3 flex items-center gap-3 ${
            updateResult.success ? 'bg-white/20 text-white' : 'bg-red-500/30 text-white'
          }`}>
            {updateResult.success ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <div className="flex-1 text-sm">
              {updateResult.success ? (
                <>
                  <span className="font-bold">Refresh complete!</span>
                  {' '}{updateResult.updatedCount} refreshed, {updateResult.changesCount} with changes
                  {updateResult.emailSentTo && <> · Emailed to {updateResult.emailSentTo}</>}
                </>
              ) : (
                <span>{updateResult.message}</span>
              )}
            </div>
            <button onClick={() => setUpdateResult(null)} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* FILTER TABS + SEARCH */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {[
            { key: 'all', label: 'All', count: subs.length },
            { key: 'active', label: 'Active', count: activeCount },
            { key: 'completed', label: 'Done', count: completedCount },
            { key: 'problems', label: 'Problems', count: problemCount },
            ...(staleCount > 0 ? [{ key: 'slow', label: 'Slow', count: staleCount }] : []),
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 text-xs ${filter === tab.key ? 'text-brand-600' : 'text-gray-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order #, customer, player name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handlePickupCodeVerify} className="flex gap-2">
          <div className="relative">
            <PackageCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={pickupCode}
              onChange={(e) => { setPickupCode(e.target.value.toUpperCase()); setPickupError(''); setPickupResult(null); }}
              placeholder="Pickup Code"
              className="w-32 pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none"
              maxLength={7}
            />
          </div>
          <button type="submit" disabled={pickupLoading || !pickupCode} className="px-3 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
            {pickupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* Pickup result */}
      {(pickupResult || pickupError) && (
        <div className={`rounded-xl p-3 flex items-center gap-3 ${pickupError ? 'bg-red-50 border border-red-200' : pickupResult?.already_picked_up ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
          {pickupError ? (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          ) : (
            <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${pickupResult?.already_picked_up ? 'text-yellow-600' : 'text-green-600'}`} />
          )}
          <div className="flex-1 text-sm">
            {pickupError || pickupResult?.message}
            {pickupResult?.customer && <span className="ml-2 text-gray-500">({pickupResult.customer.name})</span>}
          </div>
          <button onClick={() => { setPickupResult(null); setPickupError(''); }} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : filteredSubs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {search ? 'No matching submissions' : filter !== 'all' ? 'No submissions in this view' : 'No submissions yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {search ? 'Try different search terms' : 'Create your first submission to start tracking'}
          </p>
          {!search && filter === 'all' && (
            <Link to="/submissions/new" className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-brand-700">
              <Plus className="w-4 h-4" /> New Submission
            </Link>
          )}
        </div>
      ) : (
        <div>
          {sortedGroups.map(level => (
            <ServiceLevelGroup
              key={level}
              level={level}
              submissions={groupedSubs[level]}
              onRefresh={loadSubmissions}
              onDelete={handleDelete}
              defaultOpen={groupedSubs[level].some(s => !s.shipped && s.progress_percent < 100)}
            />
          ))}
        </div>
      )}

      {filteredSubs.length > 0 && (
        <p className="text-xs text-gray-400 text-center pb-4">
          {filteredSubs.length} submission{filteredSubs.length !== 1 ? 's' : ''} across {sortedGroups.length} service level{sortedGroups.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* CSV IMPORT MODAL */}
      {showCsvImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-600" />
                Import PSA CSV
              </h3>
              <button onClick={() => setShowCsvImport(false)} disabled={importing} className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">How to get your PSA CSV:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                  <li>Log in to PSA and go to submissions dashboard</li>
                  <li>Export/download the bulk CSV</li>
                  <li>Upload the file below</li>
                </ol>
              </div>

              <label className="flex items-start gap-3 cursor-pointer bg-amber-50 border border-amber-100 rounded-xl p-3">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  disabled={importing}
                  className="mt-0.5 w-4 h-4 text-brand-600 rounded"
                />
                <div>
                  <p className="font-medium text-amber-900 text-sm">Auto-refresh from PSA API</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Slow (~10s per submission). Better to import first, then use "Send Weekly Update".
                  </p>
                </div>
              </label>

              {importing && importProgress.phase && (
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
                    <span className="text-sm font-medium text-gray-900">
                      {importProgress.phase === 'import' ? 'Importing...' : 'Refreshing from PSA...'}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {importProgress.current}/{importProgress.total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-brand-300 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => { if (e.target.files?.[0]) handleCsvImport(e.target.files[0]); }}
                  disabled={importing}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className={`inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold cursor-pointer hover:bg-brand-700 ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                  {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : <><Upload className="w-4 h-4" /> Select CSV</>}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

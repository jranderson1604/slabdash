import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cards } from '../api/client';
import ExportButton from '../components/ExportButton';
import {
  Search,
  CreditCard,
  Loader2,
  ExternalLink,
  Filter,
  Upload,
  TrendingUp,
  Award,
  Star,
  Info,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Package,
  Users,
  Trash2,
  X,
  Download,
} from 'lucide-react';

export default function Cards() {
  const [cardList, setCardList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showHelp, setShowHelp] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const loadCards = async () => {
    try {
      const res = await cards.list({ limit: 200 });
      setCardList(res.data.cards || []);
      setStats(res.data.stats || null);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  // Filter and search
  const filteredCards = cardList.filter((card) => {
    // Status filter
    if (statusFilter === 'graded' && !card.grade) return false;
    if (statusFilter === 'pending' && card.grade) return false;

    // Grade filter
    if (gradeFilter !== 'all' && card.grade) {
      const gradeNum = parseFloat(card.grade);
      if (gradeFilter === '10' && gradeNum !== 10) return false;
      if (gradeFilter === '9+' && gradeNum < 9) return false;
      if (gradeFilter === '8+' && gradeNum < 8) return false;
      if (gradeFilter === 'other' && gradeNum >= 8) return false;
    }

    // Category filter
    if (categoryFilter !== 'all') {
      const cardCategory = card.sport || 'Other';
      if (cardCategory !== categoryFilter) return false;
    }

    // Search filter
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      card.description?.toLowerCase().includes(q) ||
      card.player_name?.toLowerCase().includes(q) ||
      card.psa_cert_number?.toLowerCase().includes(q) ||
      card.grade?.toLowerCase().includes(q) ||
      card.customer_name?.toLowerCase().includes(q) ||
      card.customer_email?.toLowerCase().includes(q) ||
      card.year?.toString().includes(q) ||
      card.brand?.toLowerCase().includes(q)
    );
  });

  // Sort
  const sortedCards = [...filteredCards].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'grade':
        const gradeA = parseFloat(a.grade) || 0;
        const gradeB = parseFloat(b.grade) || 0;
        compareValue = gradeB - gradeA; // Higher grades first by default
        break;
      case 'customer':
        compareValue = (a.customer_name || '').localeCompare(b.customer_name || '');
        break;
      case 'submission':
        compareValue = (a.psa_submission_number || '').localeCompare(b.psa_submission_number || '');
        break;
      case 'date':
      default:
        compareValue = new Date(b.created_at) - new Date(a.created_at);
        break;
    }

    return sortOrder === 'asc' ? -compareValue : compareValue;
  });

  const toggleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const allVisibleSelected = sortedCards.length > 0 && sortedCards.every(c => selected.has(c.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedCards.map(c => c.id)));
    }
  };
  const toggleCard = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportSelected = () => {
    const sel = sortedCards.filter(c => selected.has(c.id));
    const headers = ['Description','Player','Year','Brand','Card #','Grade','PSA Cert #','Customer','Submission'];
    const esc = v => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const rows = sel.map(c => [
      c.description, c.player_name, c.year, c.brand, c.card_number,
      c.grade ? `PSA ${c.grade}` : '', c.psa_cert_number,
      c.customer_name, c.psa_submission_number
    ].map(esc).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cards-selected-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} card(s)? This cannot be undone.`)) return;
    const ids = [...selected];
    await Promise.allSettled(ids.map(id => cards.delete(id)));
    setCardList(prev => prev.filter(c => !selected.has(c.id)));
    setSelected(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl" style={{ background: 'var(--hdr-gradient)', boxShadow: 'var(--hdr-shadow)', border: 'var(--hdr-border)' }}>
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full" style={{ background: 'var(--hdr-circle-1)' }} />
        <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full" style={{ background: 'var(--hdr-circle-2)' }} />

        <div className="relative flex items-center justify-between px-6 sm:px-8 py-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--hdr-eyebrow)' }}>Library</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight" style={{ color: 'var(--hdr-title)' }}>Cards</h1>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--hdr-sub)' }}>Search and manage all cards across submissions</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton endpoint="/cards/export.csv" label="" />
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/20"
              style={{ background: 'var(--hdr-btn-bg)', border: 'var(--hdr-btn-border)', color: 'var(--hdr-btn-color)' }}
            >
              <Info className="w-4 h-4" />
              {showHelp ? 'Hide Help' : 'Help'}
            </button>
          </div>
        </div>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">How to Use the Cards Database</h3>
                <ul className="text-sm text-blue-800 space-y-1.5 list-disc list-inside">
                  <li><strong>Search:</strong> Find cards by player name, description, cert number, customer name, year, or brand</li>
                  <li><strong>Filter by Status:</strong> View all cards, only graded cards, or only pending cards</li>
                  <li><strong>Filter by Grade:</strong> Focus on specific grade ranges (PSA 10s, 9+, 8+, or lower grades)</li>
                  <li><strong>Sort:</strong> Click column headers to sort by date, grade (highest first), customer name, or submission</li>
                  <li><strong>Grade Stats:</strong> See the breakdown of your graded cards at a glance</li>
                  <li><strong>Quick Actions:</strong> Click cert numbers to view on PSA website, click submissions to view details, click customer names to view customer profiles</li>
                  <li><strong>Buyback:</strong> Green dollar icon indicates cards eligible for buyback offers</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grade Statistics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_cards || 0}</p>
                <p className="text-sm text-gray-500">Total Cards</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.gem_mint_count || 0}</p>
                <p className="text-sm text-gray-500">PSA 10 (Gem Mint)</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.mint_count || 0}</p>
                <p className="text-sm text-gray-500">PSA 9+ (Mint)</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.graded_count || 0}</p>
                <p className="text-sm text-gray-500">Graded Cards</p>
                <p className="text-xs text-gray-400">
                  {stats.total_cards > 0 ? Math.round((stats.graded_count / stats.total_cards) * 100) : 0}% of total
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      {cardList.length > 0 && (() => {
        // Calculate category counts
        const categoryCounts = cardList.reduce((acc, card) => {
          const category = card.sport || 'Other';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});

        // Define category order (Sports, TCG, Other)
        const categoryOrder = ['Sports', 'TCG', 'Other'];

        // Get all categories that exist in the cards
        const availableCategories = categoryOrder.filter(cat => categoryCounts[cat] > 0);

        // Only show tabs if we have cards with categories
        if (availableCategories.length === 0) return null;

        return (
          <div className="card p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({cardList.length})
              </button>
              {availableCategories.map(category => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    categoryFilter === category
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

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by player, description, cert #, customer, year, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-auto"
              >
                <option value="all">All Cards</option>
                <option value="graded">Graded Only</option>
                <option value="pending">Pending Only</option>
              </select>
            </div>

            {/* Grade filter */}
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-gray-400" />
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="input w-auto"
              >
                <option value="all">All Grades</option>
                <option value="10">PSA 10 Only</option>
                <option value="9+">PSA 9+ (Mint)</option>
                <option value="8+">PSA 8+ (Excellent+)</option>
                <option value="other">PSA 7 and Below</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input w-auto"
              >
                <option value="date">Sort by Date</option>
                <option value="grade">Sort by Grade</option>
                <option value="customer">Sort by Customer</option>
                <option value="submission">Sort by Submission</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : sortedCards.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-brand-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search || statusFilter !== 'all' || gradeFilter !== 'all' || categoryFilter !== 'all' ? 'No matching cards' : 'No cards yet'}
            </h3>
            <p className="text-gray-500">
              {search || statusFilter !== 'all' || gradeFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Cards will appear here when you add them to submissions'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="w-8">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="rounded"
                      title="Select all"
                    />
                  </th>
                  <th>
                    <button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-brand-600">
                      Card Details
                      <SortIcon column="date" />
                    </button>
                  </th>
                  <th>
                    <button onClick={() => toggleSort('customer')} className="flex items-center gap-1 hover:text-brand-600">
                      Customer
                      <SortIcon column="customer" />
                    </button>
                  </th>
                  <th>
                    <button onClick={() => toggleSort('submission')} className="flex items-center gap-1 hover:text-brand-600">
                      Submission
                      <SortIcon column="submission" />
                    </button>
                  </th>
                  <th>Cert #</th>
                  <th>
                    <button onClick={() => toggleSort('grade')} className="flex items-center gap-1 hover:text-brand-600">
                      Grade
                      <SortIcon column="grade" />
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedCards.map((card) => (
                  <tr key={card.id} className={`hover:bg-gray-50 ${selected.has(card.id) ? 'bg-brand-50' : ''}`}>
                    <td className="w-8">
                      <input
                        type="checkbox"
                        checked={selected.has(card.id)}
                        onChange={() => toggleCard(card.id)}
                        className="rounded"
                      />
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">
                          {card.description}
                        </p>
                        {card.player_name && (
                          <p className="text-xs text-gray-500">
                            {card.year} {card.brand} {card.player_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      {card.customer_name ? (
                        <Link
                          to={`/customers/${card.customer_id}`}
                          className="text-brand-600 hover:underline flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          {card.customer_name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                      {card.customer_email && (
                        <p className="text-xs text-gray-400">{card.customer_email}</p>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/submissions/${card.submission_id}`}
                        className="text-brand-600 hover:underline flex items-center gap-1"
                      >
                        <Package className="w-3 h-3" />
                        {card.psa_submission_number || card.internal_id || 'View'}
                      </Link>
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
                      {card.grade ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-lg ${
                            card.grade === '10' ? 'text-yellow-600' :
                            parseFloat(card.grade) >= 9 ? 'text-blue-600' :
                            parseFloat(card.grade) >= 8 ? 'text-green-600' :
                            'text-gray-600'
                          }`}>
                            {card.grade}
                          </span>
                          {card.grade === '10' && <Award className="w-4 h-4 text-yellow-500" />}
                        </div>
                      ) : (
                        <span className="badge badge-gray">Pending</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {card.grade && (
                          <Link
                            to={`/buyback/new?card_id=${card.id}`}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Make buyback offer"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sortedCards.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          Showing {sortedCards.length} of {cardList.length} card{cardList.length !== 1 ? 's' : ''}
          {(search || statusFilter !== 'all' || gradeFilter !== 'all' || categoryFilter !== 'all') && ' (filtered)'}
        </p>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
          style={{
            background: 'rgba(44,36,22,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,248,240,0.12)',
          }}
        >
          <span className="text-sm font-bold text-white">{selected.size} selected</span>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={exportSelected}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,248,240,0.9)' }}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="rounded-lg p-1 transition-all"
            style={{ color: 'rgba(255,248,240,0.5)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

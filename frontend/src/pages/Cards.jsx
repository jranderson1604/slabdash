import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cards } from '../api/client';
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
} from 'lucide-react';

export default function Cards() {
  const [cardList, setCardList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'graded', 'pending'
  const [gradeFilter, setGradeFilter] = useState('all'); // 'all', '10', '9+', '8+', 'other'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'grade', 'customer', 'submission'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [showHelp, setShowHelp] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cards Database</h1>
          <p className="text-gray-500 mt-1">Search and manage all cards across submissions</p>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="btn btn-secondary gap-2"
        >
          <Info className="w-4 h-4" />
          {showHelp ? 'Hide' : 'Show'} Help
        </button>
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
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search || statusFilter !== 'all' || gradeFilter !== 'all' ? 'No matching cards' : 'No cards yet'}
            </h3>
            <p className="text-gray-500">
              {search || statusFilter !== 'all' || gradeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Cards will appear here when you add them to submissions'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
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
                  <tr key={card.id} className="hover:bg-gray-50">
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
          {(search || statusFilter !== 'all' || gradeFilter !== 'all') && ' (filtered)'}
        </p>
      )}
    </div>
  );
}

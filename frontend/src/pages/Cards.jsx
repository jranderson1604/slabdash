import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cards } from '../api/client';
import {
  Search,
  CreditCard,
  Loader2,
  ExternalLink,
  Filter,
} from 'lucide-react';

export default function Cards() {
  const [cardList, setCardList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'graded', 'pending'

  const loadCards = async () => {
    try {
      const res = await cards.list({ limit: 100 });
      setCardList(res.data.cards || []);
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
    if (filter === 'graded' && card.status !== 'graded') return false;
    if (filter === 'pending' && card.status === 'graded') return false;

    // Search filter
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      card.description?.toLowerCase().includes(q) ||
      card.player_name?.toLowerCase().includes(q) ||
      card.psa_cert_number?.toLowerCase().includes(q) ||
      card.grade?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cards</h1>
        <p className="text-gray-500 mt-1">View all cards across submissions</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by description, player, cert #..."
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
              <option value="all">All Cards</option>
              <option value="graded">Graded</option>
              <option value="pending">Pending</option>
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
        ) : filteredCards.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search || filter !== 'all' ? 'No matching cards' : 'No cards yet'}
            </h3>
            <p className="text-gray-500">
              {search || filter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Cards will appear here when you add them to submissions'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Submission</th>
                  <th>Cert #</th>
                  <th>Grade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCards.map((card) => (
                  <tr key={card.id}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{card.description}</p>
                        {card.player_name && (
                          <p className="text-xs text-gray-500">
                            {card.year} {card.brand} {card.player_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <Link
                        to={`/submissions/${card.submission_id}`}
                        className="text-brand-600 hover:underline"
                      >
                        {card.psa_submission_number || 'View'}
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
                        <span className="font-bold text-lg text-gray-900">{card.grade}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          card.status === 'graded' ? 'badge-green' : 'badge-gray'
                        }`}
                      >
                        {card.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredCards.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

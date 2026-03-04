import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { submissions, customers } from '../api/client';
import {
  Search, LayoutDashboard, Package, Users, CreditCard, BarChart3,
  Settings, Mail, HelpCircle, Plus, Zap, ArrowRight, Clock, User,
  FileText, Loader2, Command,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', group: 'Navigate' },
  { label: 'Submissions', icon: Package, path: '/submissions', group: 'Navigate' },
  { label: 'Customers', icon: Users, path: '/customers', group: 'Navigate' },
  { label: 'Cards', icon: CreditCard, path: '/cards', group: 'Navigate' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics', group: 'Navigate' },
  { label: 'Email Templates', icon: Mail, path: '/email-templates', group: 'Navigate' },
  { label: 'Settings', icon: Settings, path: '/settings', group: 'Navigate' },
  { label: 'Help', icon: HelpCircle, path: '/help', group: 'Navigate' },
];

const QUICK_ACTIONS = [
  { label: 'New Submission', icon: Plus, path: '/submissions/new', group: 'Quick Actions' },
  { label: 'New Customer', icon: Plus, path: '/customers/new', group: 'Quick Actions' },
  { label: 'SAM AI Assistant', icon: Zap, path: '/sam', group: 'Quick Actions' },
  { label: 'Send Bulk Email', icon: Mail, path: '/email-sender', group: 'Quick Actions' },
];

const RECENT_KEY = 'slabdash_recent_pages';
const MAX_RECENT = 5;

function saveRecent(item) {
  try {
    const existing = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const filtered = existing.filter(r => r.path !== item.path);
    const updated = [{ label: item.label, path: item.path, icon: item.iconName }, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {}
}

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const [subsRes, custsRes] = await Promise.allSettled([
          submissions.list({ search: query, limit: 5 }),
          customers.list({ search: query, limit: 5 }),
        ]);

        const subResults = (subsRes.status === 'fulfilled' ? subsRes.value.data.submissions || [] : [])
          .map(s => ({
            label: `#${s.psa_submission_number || s.internal_id || 'No ID'}`,
            sublabel: `${s.service_level || ''} · ${s.card_count || 0} cards`,
            icon: Package,
            path: `/submissions/${s.id}`,
            group: 'Submissions',
          }));

        const custResults = (custsRes.status === 'fulfilled' ? custsRes.value.data.customers || [] : [])
          .map(c => ({
            label: c.name,
            sublabel: c.email,
            icon: User,
            path: `/customers/${c.id}`,
            group: 'Customers',
          }));

        setResults([...subResults, ...custResults]);
      } catch {}
      setSearching(false);
    }, 200);
  }, [query]);

  const displayItems = query.trim()
    ? results
    : [...NAV_ITEMS, ...QUICK_ACTIONS];

  // Group display items
  const grouped = displayItems.reduce((acc, item) => {
    const g = item.group || 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  // Flat list for keyboard nav
  const flatItems = displayItems;

  const handleSelect = useCallback((item) => {
    saveRecent({ label: item.label, path: item.path, iconName: item.iconName });
    navigate(item.path);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[activeIndex]) handleSelect(flatItems[activeIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Reset active index when items change
  useEffect(() => { setActiveIndex(0); }, [query]);

  if (!open) return null;

  // Compute flat index for each item in groups
  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          background: '#fff',
          boxShadow: '0 25px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="w-5 h-5 flex-shrink-0" style={{ color: '#FF8170' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or jump to..."
            className="flex-1 text-base bg-transparent outline-none"
            style={{ color: '#2C2416' }}
          />
          {searching
            ? <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />
            : <kbd className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">ESC</kbd>
          }
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {flatItems.length === 0 && !searching && query.trim() && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No results for "{query}"</div>
          )}

          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{groupName}</p>
              {items.map((item) => {
                const currentFlatIdx = flatIdx++;
                const isActive = currentFlatIdx === activeIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path + item.label}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(currentFlatIdx)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                    style={{
                      background: isActive ? 'rgba(255,129,112,0.08)' : 'transparent',
                      borderLeft: isActive ? '2px solid #FF8170' : '2px solid transparent',
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: isActive ? 'rgba(255,129,112,0.12)' : 'rgba(0,0,0,0.04)' }}>
                      <Icon className="w-4 h-4" style={{ color: isActive ? '#E8543D' : '#6B7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#2C2416' }}>{item.label}</p>
                      {item.sublabel && (
                        <p className="text-xs truncate text-gray-400">{item.sublabel}</p>
                      )}
                    </div>
                    {isActive && <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#FF8170' }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-400 font-medium">
          <span><kbd className="bg-gray-100 px-1 rounded text-gray-500">↑↓</kbd> navigate</span>
          <span><kbd className="bg-gray-100 px-1 rounded text-gray-500">↵</kbd> open</span>
          <span><kbd className="bg-gray-100 px-1 rounded text-gray-500">ESC</kbd> close</span>
          <span className="ml-auto flex items-center gap-1">
            <Command className="w-3 h-3" />K
          </span>
        </div>
      </div>
    </div>
  );
}

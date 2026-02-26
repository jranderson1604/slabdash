import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Navigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import {
  Building2, Users, Package, Mail, Crown, Zap, FileText, Plus, Pin,
  Trash2, Edit3, Eye, EyeOff, X, Loader2, AlertCircle, RefreshCw,
  Key, ToggleLeft, ToggleRight, CheckCircle, AlertTriangle, UserX,
  UserCheck, Database, Wifi, WifiOff, Copy, Check, Search,
  TrendingUp, Users2, RotateCcw, Inbox, Activity, Clock,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('slabdash_token')}`,
    'Content-Type': 'application/json',
  };
}

function timeAgo(ts) {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmt(n) { return Number(n || 0).toLocaleString(); }

const PLAN_BADGE = {
  enterprise: 'badge-red',
  pro: 'badge-blue',
  starter: 'badge-green',
  free: 'badge-gray',
};

function PlanBadge({ plan }) {
  return <span className={`badge ${PLAN_BADGE[plan] || 'badge-gray'}`}>{plan || 'free'}</span>;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <button onClick={copy} className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Company Drawer ───────────────────────────────────────────────

function CompanyDrawer({ company, onClose, onUpdate, toast }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resettingUser, setResettingUser] = useState(null);
  const [tempPw, setTempPw] = useState(null);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingUsers(true);
    fetch(`${API_URL}/owner/companies/${company.id}/users`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([])).finally(() => setLoadingUsers(false));
  }, [company.id]);

  const save = async (field, value) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/owner/companies/${company.id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const updated = await res.json();
      onUpdate(updated);
      toast.success('Saved');
      setEditField(null);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const toggle = (field, current) => save(field, !current);

  const triggerRefresh = async () => {
    if (!company.has_psa_key) { toast.error('No PSA API key configured'); return; }
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/owner/companies/${company.id}/trigger-refresh`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refresh failed');
      toast.success(`Refreshed — ${data.updatedCount || 0} updated, ${data.changesCount || 0} changes`);
    } catch (e) { toast.error(e.message); }
    finally { setRefreshing(false); }
  };

  const clearPsaKey = async () => {
    if (!confirm(`Clear PSA API key for "${company.name}"?`)) return;
    const res = await fetch(`${API_URL}/owner/companies/${company.id}/clear-psa-key`, {
      method: 'POST', headers: authHeaders(),
    });
    if (res.ok) { onUpdate({ ...company, has_psa_key: false, psa_api_key_preview: null }); toast.success('PSA key cleared'); }
    else toast.error('Failed');
  };

  const resetPassword = async (user) => {
    setResettingUser(user.id); setTempPw(null);
    try {
      const res = await fetch(`${API_URL}/owner/companies/${company.id}/users/${user.id}/reset-password`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTempPw({ name: data.user.name, email: data.user.email, password: data.tempPassword });
    } catch (e) { toast.error(e.message); }
    finally { setResettingUser(null); }
  };

  const toggleUserActive = async (user) => {
    const res = await fetch(`${API_URL}/owner/companies/${company.id}/users/${user.id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_active: !user.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      toast.success(updated.is_active ? 'User activated' : 'User deactivated');
    } else toast.error('Failed');
  };

  const EditRow = ({ label, field, value, type = 'text', options }) => {
    const isEditing = editField === field;
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-black/[0.04] last:border-0">
        <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            {options ? (
              <select className="input text-sm py-1 flex-1" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type={type} className="input text-sm py-1 flex-1" value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(field, editValue); if (e.key === 'Escape') setEditField(null); }}
                autoFocus />
            )}
            <button onClick={() => save(field, editValue)} disabled={saving} className="btn btn-primary text-xs py-1 px-3">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
            </button>
            <button onClick={() => setEditField(null)} className="btn btn-secondary text-xs py-1 px-3">Cancel</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="text-sm font-medium text-gray-900 truncate max-w-xs">{value || <span className="text-gray-400 italic">—</span>}</span>
            <button onClick={() => { setEditField(field); setEditValue(String(value ?? '')); }}
              className="p-1 rounded text-gray-300 hover:text-gray-600 transition-colors">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-backdrop absolute inset-0" />
      <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-xl h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-black/[0.06] px-6 py-4 z-10 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{company.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-400">/{company.slug}</span>
              <PlanBadge plan={company.plan} />
              {company.sam_enabled && <span className="badge badge-purple">SAM</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Users', value: company.user_count, icon: Users2 },
              { label: 'Active', value: company.active_submissions, icon: Activity },
              { label: 'Ready', value: company.ready_submissions, icon: CheckCircle },
              { label: 'Problems', value: company.problem_submissions, icon: AlertTriangle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center">
                <Icon className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                <div className="text-lg font-bold text-gray-900">{fmt(value)}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {/* Edit fields */}
          <div className="card p-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Account Details</h3>
            <EditRow label="Name" field="name" value={company.name} />
            <EditRow label="Email" field="email" value={company.email} type="email" />
            <EditRow label="Plan" field="plan" value={company.plan} options={[
              { value: 'free', label: 'Free' },
              { value: 'starter', label: 'Starter' },
              { value: 'pro', label: 'Pro' },
              { value: 'enterprise', label: 'Enterprise' },
            ]} />
          </div>

          {/* PSA / Features */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Features & PSA</h3>

            <div className="flex items-center justify-between py-2 border-b border-black/[0.04]">
              <div>
                <p className="text-sm font-medium text-gray-900">PSA API Key</p>
                <p className="text-xs text-gray-400">{company.has_psa_key ? company.psa_api_key_preview : 'Not configured'}</p>
              </div>
              <div className="flex items-center gap-2">
                {company.has_psa_key && (
                  <button onClick={clearPsaKey} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear</button>
                )}
                <button onClick={triggerRefresh} disabled={!company.has_psa_key || refreshing}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                  {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Refresh Now
                </button>
              </div>
            </div>

            {[
              { label: 'SAM AI', sublabel: 'AI grading assistant', field: 'sam_enabled', value: company.sam_enabled },
              { label: 'Auto Refresh', sublabel: 'Scheduled PSA sync', field: 'auto_refresh_enabled', value: company.auto_refresh_enabled },
              { label: 'Email Notifications', sublabel: 'Status update emails', field: 'email_notifications_enabled', value: company.email_notifications_enabled },
            ].map(({ label, sublabel, field, value }) => (
              <div key={field} className="flex items-center justify-between py-2 border-b border-black/[0.04] last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{sublabel}</p>
                </div>
                <button onClick={() => toggle(field, value)} className="transition-colors">
                  {value
                    ? <ToggleRight className="w-7 h-7 text-green-500" />
                    : <ToggleLeft className="w-7 h-7 text-gray-300" />}
                </button>
              </div>
            ))}

            <p className="text-xs text-gray-400 pt-1">
              Last refresh: {timeAgo(company.last_submission_refresh)}
              {' · '}Joined {new Date(company.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Users */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.04] flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Users</h3>
              <span className="ml-auto badge badge-gray">{users.length}</span>
            </div>
            {loadingUsers ? (
              <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
            ) : users.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No users</div>
            ) : (
              <div className="divide-y divide-black/[0.03]">
                {users.map(u => (
                  <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.is_active ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400'}`}>
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-semibold truncate ${!u.is_active ? 'line-through text-gray-400' : 'text-gray-900'}`}>{u.name}</p>
                        <span className="badge badge-gray text-[10px] py-0">{u.role}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        <CopyButton text={u.email} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => resetPassword(u)} disabled={resettingUser === u.id} title="Reset password"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                        {resettingUser === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => toggleUserActive(u)} title={u.is_active ? 'Deactivate' : 'Activate'}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5 text-green-500" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Temp password */}
          {tempPw && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm font-bold text-amber-800 mb-1">Temporary Password</p>
              <p className="text-xs text-amber-700 mb-2">{tempPw.name} · {tempPw.email}</p>
              <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 font-mono text-sm border border-amber-200">
                <span className="flex-1 select-all">{tempPw.password}</span>
                <CopyButton text={tempPw.password} />
              </div>
              <p className="text-xs text-amber-600 mt-2">Send this to the user — works immediately.</p>
              <button onClick={() => setTempPw(null)} className="mt-2 text-xs text-amber-600 hover:text-amber-800 font-medium">Dismiss</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────

const TABS = ['Overview', 'Shops', 'Announcements', 'System'];

export default function OwnerDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [platformAnalytics, setPlatformAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [blogPosts, setBlogPosts] = useState([]);
  const [showBlogComposer, setShowBlogComposer] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [blogForm, setBlogForm] = useState({ title: '', body: '', author_name: '', published: true, pinned: false });
  const [blogSaving, setBlogSaving] = useState(false);

  const [showNewsletter, setShowNewsletter] = useState(false);
  const [newsletterForm, setNewsletterForm] = useState({ subject: '', message: '', targetPlan: 'all' });
  const [sending, setSending] = useState(false);

  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [waitlist, setWaitlist] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [inviteCode, setInviteCode] = useState(null); // current active code
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteCodeSaving, setInviteCodeSaving] = useState(false);

  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showOnlineList, setShowOnlineList] = useState(false);
  const onlineRef = useRef(null);

  if (user?.role !== 'owner') return <Navigate to="/dashboard" replace />;

  const loadData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [statsRes, companiesRes, blogRes, analyticsRes, approvalsRes] = await Promise.all([
        fetch(`${API_URL}/owner/stats`, { headers: authHeaders() }),
        fetch(`${API_URL}/owner/companies`, { headers: authHeaders() }),
        fetch(`${API_URL}/blog/all`, { headers: authHeaders() }),
        fetch(`${API_URL}/owner/platform-analytics`, { headers: authHeaders() }),
        fetch(`${API_URL}/owner/pending-approvals`, { headers: authHeaders() }),
      ]);
      if (!statsRes.ok) throw new Error('Failed to load platform data');
      setStats(await statsRes.json());
      setCompanies(await companiesRes.json());
      if (blogRes.ok) setBlogPosts(await blogRes.json());
      if (analyticsRes.ok) setPlatformAnalytics(await analyticsRes.json());
      if (approvalsRes.ok) setPendingApprovals(await approvalsRes.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await fetch(`${API_URL}/owner/online`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setOnlineCount(data.count);
          setOnlineUsers(data.users || []);
        }
      } catch {}
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showOnlineList) return;
    const handler = (e) => { if (onlineRef.current && !onlineRef.current.contains(e.target)) setShowOnlineList(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOnlineList]);

  const loadHealth = async () => {
    setLoadingHealth(true);
    try {
      const [healthRes, wlRes, inviteRes, approvalsRes] = await Promise.all([
        fetch(`${API_URL}/owner/system-health`, { headers: authHeaders() }),
        fetch(`${API_URL}/owner/waitlist`, { headers: authHeaders() }),
        fetch(`${API_URL}/owner/invite-code`, { headers: authHeaders() }),
        fetch(`${API_URL}/owner/pending-approvals`, { headers: authHeaders() }),
      ]);
      if (healthRes.ok) setHealth(await healthRes.json());
      if (wlRes.ok) setWaitlist(await wlRes.json());
      if (inviteRes.ok) {
        const ic = await inviteRes.json();
        setInviteCode(ic.invite_code || null);
        setInviteCodeInput(ic.invite_code || '');
      }
      if (approvalsRes.ok) setPendingApprovals(await approvalsRes.json());
    } finally { setLoadingHealth(false); }
  };

  useEffect(() => { if (tab === 'System') loadHealth(); }, [tab]);

  // Blog
  const openNewPost = () => {
    setEditingPost(null);
    setBlogForm({ title: '', body: '', author_name: user?.name || '', published: true, pinned: false });
    setShowBlogComposer(true);
  };
  const openEditPost = (post) => {
    setEditingPost(post);
    setBlogForm({ title: post.title, body: post.body, author_name: post.author_name || '', published: post.published, pinned: post.pinned });
    setShowBlogComposer(true);
  };
  const saveBlogPost = async () => {
    if (!blogForm.title.trim() || !blogForm.body.trim()) return;
    setBlogSaving(true);
    try {
      const method = editingPost ? 'PUT' : 'POST';
      const url = editingPost ? `${API_URL}/blog/${editingPost.id}` : `${API_URL}/blog`;
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(blogForm) });
      if (!res.ok) throw new Error('Failed');
      toast.success(editingPost ? 'Post updated!' : 'Post published!');
      setShowBlogComposer(false); setEditingPost(null);
      const blogRes = await fetch(`${API_URL}/blog/all`, { headers: authHeaders() });
      if (blogRes.ok) setBlogPosts(await blogRes.json());
    } catch (e) { toast.error(e.message); }
    finally { setBlogSaving(false); }
  };
  const deleteBlogPost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    const res = await fetch(`${API_URL}/blog/${postId}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) { toast.success('Deleted'); setBlogPosts(prev => prev.filter(p => p.id !== postId)); }
  };
  const togglePostField = async (post, field) => {
    const res = await fetch(`${API_URL}/blog/${post.id}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ [field]: !post[field] }),
    });
    if (res.ok) setBlogPosts(prev => prev.map(p => p.id === post.id ? { ...p, [field]: !p[field] } : p));
  };

  // Newsletter
  const sendNewsletter = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/owner/newsletter`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(newsletterForm),
      });
      if (!res.ok) throw new Error('Failed');
      const d = await res.json();
      toast.success(`Ready to send to ${d.recipientCount} shops`);
      setShowNewsletter(false);
      setNewsletterForm({ subject: '', message: '', targetPlan: 'all' });
    } catch (e) { toast.error(e.message); }
    finally { setSending(false); }
  };

  // Companies
  const deleteCompany = async (company) => {
    if (!confirm(`Delete "${company.name}" and ALL its data? This CANNOT be undone.`)) return;
    const res = await fetch(`${API_URL}/owner/companies/${company.id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) {
      const d = await res.json();
      toast.success(d.message);
      setCompanies(prev => prev.filter(c => c.id !== company.id));
      if (selectedCompany?.id === company.id) setSelectedCompany(null);
    } else { toast.error('Failed to delete'); }
  };

  const handleCompanyUpdate = (updated) => {
    setCompanies(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    if (selectedCompany?.id === updated.id) setSelectedCompany(prev => ({ ...prev, ...updated }));
  };

  const filteredCompanies = companies.filter(c => {
    const matchesPlan = planFilter === 'all' || c.plan === planFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.slug?.toLowerCase().includes(q);
    return matchesPlan && matchesSearch;
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'rgb(var(--brand-500))' }} />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Failed to Load</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={loadData} className="btn btn-primary">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Control"
        subtitle={`${fmt(stats?.total_shops)} shops · ${fmt(stats?.total_submissions)} submissions · ${fmt(stats?.total_customers)} customers`}
        actions={
          <div className="flex items-center gap-2">
            {/* Live users online indicator */}
            <div className="relative" ref={onlineRef}>
              <button
                onClick={() => setShowOnlineList(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700"
                title="Users online now"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                {onlineCount} online
              </button>
              {showOnlineList && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Active now</span>
                    <span className="text-xs text-gray-400">last 2 min</span>
                  </div>
                  {onlineUsers.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-400 text-center">No users online</div>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {onlineUsers.map((u, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {(u.name || u.email || '?')[0].toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{u.name || u.email}</p>
                            <p className="text-xs text-gray-400 truncate">{u.company}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <button onClick={loadData} className="btn btn-secondary p-2" title="Refresh data">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowNewsletter(true)} className="btn btn-secondary flex items-center gap-2 text-sm py-2 px-4">
              <Mail className="w-4 h-4" /> Newsletter
            </button>
            <button onClick={openNewPost} className="btn btn-primary flex items-center gap-2 text-sm py-2 px-4">
              <Plus className="w-4 h-4" /> New Post
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-gray-100/80 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === 'System' && pendingApprovals.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center"
                style={{ background: '#E8543D' }}>
                {pendingApprovals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Total Shops" value={fmt(stats?.total_shops)}
              subtext={`+${stats?.new_shops_30d || 0} this month`} color="blue" variant="solid" />
            <StatCard icon={Users} label="Users" value={fmt(stats?.total_users)}
              subtext={`${fmt(stats?.total_customers)} customers`} color="brand" variant="solid" />
            <StatCard icon={Package} label="Submissions" value={fmt(stats?.total_submissions)}
              subtext={`${fmt(stats?.submissions_7d)} this week`} color="green" variant="solid" />
            <StatCard icon={Database} label="Cards Graded" value={fmt(stats?.total_cards)}
              subtext={`${fmt(stats?.submissions_30d)} subs this month`} color="orange" variant="solid" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Active Subs', value: stats?.active_submissions, icon: Activity, color: 'text-blue-500', sub: 'In-progress' },
              { label: 'Grades Ready', value: stats?.ready_submissions, icon: CheckCircle, color: 'text-green-500', sub: 'Awaiting pickup' },
              { label: 'Problems', value: stats?.problem_submissions, icon: AlertTriangle, color: 'text-red-500', sub: 'Need attention' },
              { label: 'Waitlist', value: stats?.waitlist_count, icon: Inbox, color: 'text-purple-500', sub: 'Signups pending' },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <div key={label} className="card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm font-semibold text-gray-600">{label}</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{fmt(value)}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Plan mix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
                <h3 className="font-bold text-gray-900">Plan Distribution</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Enterprise', key: 'enterprise', color: 'bg-red-400' },
                  { label: 'Pro', key: 'pro', color: 'bg-blue-400' },
                  { label: 'Starter', key: 'starter', color: 'bg-green-400' },
                  { label: 'Free', key: 'free', color: 'bg-gray-300' },
                ].map(({ label, key, color }) => {
                  const count = companies.filter(c => (c.plan || 'free') === key).length;
                  const pct = companies.length ? Math.round((count / companies.length) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{label}</span>
                        <span className="text-sm font-bold text-gray-900">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-white/20 flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
                <h3 className="font-bold text-gray-900">Recently Joined</h3>
              </div>
              <div className="divide-y divide-black/[0.03]">
                {companies.slice(0, 6).map(c => (
                  <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-brand-50/20 cursor-pointer transition-colors"
                    onClick={() => { setSelectedCompany(c); }}>
                    <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{c.name}</p>
                    </div>
                    <PlanBadge plan={c.plan} />
                    <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature adoption + Platform metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
                <h3 className="font-bold text-gray-900">Feature Adoption</h3>
                {platformAnalytics && (
                  <span className="ml-auto text-xs text-gray-400">{fmt(platformAnalytics.features?.total)} shops</span>
                )}
              </div>
              {platformAnalytics ? (
                <div className="space-y-3">
                  {[
                    { label: 'PSA Connected', value: platformAnalytics.features?.psa_connected, color: 'bg-green-400' },
                    { label: 'SAM AI Enabled', value: platformAnalytics.features?.sam_enabled, color: 'bg-purple-400' },
                    { label: 'Auto Refresh', value: platformAnalytics.features?.auto_refresh, color: 'bg-blue-400' },
                    { label: 'Email Notifications', value: platformAnalytics.features?.email_notifications, color: 'bg-orange-400' },
                  ].map(({ label, value, color }) => {
                    const total = Number(platformAnalytics.features?.total || 0);
                    const count = Number(value || 0);
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">{label}</span>
                          <span className="text-sm font-bold text-gray-900">{count} <span className="text-xs font-normal text-gray-400">({pct}%)</span></span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
                <h3 className="font-bold text-gray-900">Platform Metrics</h3>
              </div>
              {platformAnalytics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        ${Number(platformAnalytics.revenue?.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Total Revenue Tracked</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{platformAnalytics.revenue?.avg_cards_per_submission ?? '—'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Avg Cards / Submission</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Shop Growth — Last 6 Months</p>
                    {platformAnalytics.growth?.length > 0 ? (
                      <div className="flex items-end gap-2 h-16">
                        {(() => {
                          const max = Math.max(...platformAnalytics.growth.map(g => Number(g.new_shops)), 1);
                          return platformAnalytics.growth.map(g => {
                            const h = Math.max(Math.round((Number(g.new_shops) / max) * 100), 4);
                            const label = g.month?.slice(5); // MM
                            return (
                              <div key={g.month} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] font-semibold text-gray-500">{g.new_shops}</span>
                                <div className="w-full rounded-t-md" style={{ height: `${h}%`, background: 'rgb(var(--brand-400))' }} />
                                <span className="text-[10px] text-gray-400">{label}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">No growth data</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.04]">
                    <span className="text-xs text-gray-500">Largest submission</span>
                    <span className="text-sm font-bold text-gray-900">{fmt(platformAnalytics.revenue?.max_cards)} cards</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SHOPS ── */}
      {tab === 'Shops' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search shops..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
            </div>
            <div className="flex gap-1 p-1 bg-gray-100/80 rounded-xl">
              {['all', 'enterprise', 'pro', 'starter', 'free'].map(p => (
                <button key={p} onClick={() => setPlanFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${planFilter === p ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-400">{filteredCompanies.length} shops</span>
          </div>

          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Shop</th>
                    <th>Plan</th>
                    <th className="text-center">Users</th>
                    <th className="text-center">Active</th>
                    <th className="text-center">Ready</th>
                    <th className="text-center">Problems</th>
                    <th className="text-center">PSA</th>
                    <th className="text-center">SAM</th>
                    <th>Last Refresh</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map(c => (
                    <tr key={c.id} className="cursor-pointer hover:bg-brand-50/30 transition-colors" onClick={() => setSelectedCompany(c)}>
                      <td>
                        <div className="font-semibold text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[160px]">{c.email}</div>
                      </td>
                      <td><PlanBadge plan={c.plan} /></td>
                      <td className="text-center text-gray-600">{c.user_count}</td>
                      <td className="text-center">
                        <span className={`text-sm font-semibold ${Number(c.active_submissions) > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{c.active_submissions}</span>
                      </td>
                      <td className="text-center">
                        <span className={`text-sm font-semibold ${Number(c.ready_submissions) > 0 ? 'text-green-600' : 'text-gray-300'}`}>{c.ready_submissions}</span>
                      </td>
                      <td className="text-center">
                        <span className={`text-sm font-semibold ${Number(c.problem_submissions) > 0 ? 'text-red-600' : 'text-gray-300'}`}>{c.problem_submissions}</span>
                      </td>
                      <td className="text-center">
                        {c.has_psa_key ? <Wifi className="w-4 h-4 text-green-500 mx-auto" /> : <WifiOff className="w-4 h-4 text-gray-300 mx-auto" />}
                      </td>
                      <td className="text-center">
                        {c.sam_enabled ? <CheckCircle className="w-4 h-4 text-purple-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="text-xs text-gray-400">{timeAgo(c.last_submission_refresh)}</td>
                      <td className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button onClick={() => deleteCompany(c)}
                          className="p-2 rounded-xl text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete shop">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCompanies.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-12 text-gray-400">No shops match your filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ANNOUNCEMENTS ── */}
      {tab === 'Announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{blogPosts.length} posts · Shown on the public landing page</p>
            <button onClick={openNewPost} className="btn btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> New Post
            </button>
          </div>
          {blogPosts.length === 0 ? (
            <div className="card p-16 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-gray-500">No posts yet</p>
            </div>
          ) : (
            <div className="card overflow-hidden divide-y divide-black/[0.03]">
              {blogPosts.map(post => (
                <div key={post.id} className="px-6 py-4 flex items-start gap-4 hover:bg-brand-50/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate">{post.title}</h3>
                      {post.pinned && <span className="badge badge-yellow">Pinned</span>}
                      {!post.published && <span className="badge badge-gray">Draft</span>}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{post.body}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      <span className="font-medium text-gray-500">{post.author_name}</span>
                      {' · '}{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => togglePostField(post, 'pinned')} title={post.pinned ? 'Unpin' : 'Pin'}
                      className={`p-2 rounded-xl transition-colors ${post.pinned ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                      <Pin className="w-4 h-4" />
                    </button>
                    <button onClick={() => togglePostField(post, 'published')} title={post.published ? 'Unpublish' : 'Publish'}
                      className={`p-2 rounded-xl transition-colors ${post.published ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                      {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEditPost(post)} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteBlogPost(post.id)} className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SYSTEM ── */}
      {tab === 'System' && (
        <div className="space-y-6">
          {loadingHealth ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <>
              {health && (
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/20 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
                    <h2 className="text-base font-bold">PSA Refresh Health</h2>
                    <span className="ml-auto badge badge-gray">{health.companies?.length} shops</span>
                    <button onClick={loadHealth} className="btn btn-secondary text-xs py-1.5 px-3">Refresh</button>
                  </div>
                  <div className="table-container">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th>Shop</th>
                          <th className="text-center">PSA Key</th>
                          <th className="text-center">Auto Refresh</th>
                          <th className="text-center">SAM</th>
                          <th className="text-center">Active</th>
                          <th>Last Refresh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(health.companies || []).map(c => {
                          const staleMins = c.last_submission_refresh
                            ? (Date.now() - new Date(c.last_submission_refresh).getTime()) / 60000
                            : Infinity;
                          const isStale = staleMins > 240 && Number(c.active_count) > 0;
                          return (
                            <tr key={c.id} className={isStale ? 'bg-red-50/40' : ''}>
                              <td className="font-medium text-gray-900">{c.name}</td>
                              <td className="text-center">
                                {c.has_psa_key ? <Wifi className="w-4 h-4 text-green-500 mx-auto" /> : <WifiOff className="w-4 h-4 text-gray-300 mx-auto" />}
                              </td>
                              <td className="text-center">
                                {c.auto_refresh_enabled ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-gray-300 text-xs">off</span>}
                              </td>
                              <td className="text-center">
                                {c.sam_enabled ? <CheckCircle className="w-4 h-4 text-purple-500 mx-auto" /> : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              <td className="text-center text-sm font-semibold text-gray-700">{c.active_count}</td>
                              <td className={`text-xs ${isStale ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                                {timeAgo(c.last_submission_refresh)}{isStale && <span className="ml-1">(stale)</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {health?.recent_logs?.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/20 flex items-center gap-2">
                    <Activity className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
                    <h2 className="text-base font-bold">Recent Refresh Logs</h2>
                  </div>
                  <div className="divide-y divide-black/[0.03]">
                    {health.recent_logs.map((log, i) => (
                      <div key={i} className="px-6 py-3 flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{log.company_name}</p>
                          <p className="text-xs text-gray-400">{log.updated_count} updated · {log.changes_count || 0} changes</p>
                        </div>
                        <span className="text-xs text-gray-400">{timeAgo(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Admin Approvals */}
              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/20 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
                  <h2 className="text-base font-bold">Pending Approvals</h2>
                  {pendingApprovals.length > 0 && (
                    <span className="ml-auto badge badge-green">{pendingApprovals.length} pending</span>
                  )}
                </div>
                {pendingApprovals.length === 0 ? (
                  <div className="p-10 text-center text-sm text-gray-400">No pending approvals</div>
                ) : (
                  <div className="divide-y divide-black/[0.03]">
                    {pendingApprovals.map(u => (
                      <div key={u.id} className="px-6 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: 'rgba(255,129,112,0.12)', color: '#E8543D' }}>
                          {u.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: 'rgba(44,36,22,0.4)' }}>{u.company_name}</p>
                        </div>
                        <span className="text-xs text-gray-400">{timeAgo(u.created_at)}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await fetch(`${API_URL}/owner/pending-approvals/${u.id}/approve`, { method: 'POST', headers: authHeaders() });
                              setPendingApprovals(prev => prev.filter(a => a.id !== u.id));
                              toast.success(`${u.name} approved — welcome email sent`);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Reject ${u.name}? They will not be able to log in.`)) return;
                              await fetch(`${API_URL}/owner/pending-approvals/${u.id}/reject`, { method: 'POST', headers: authHeaders() });
                              setPendingApprovals(prev => prev.filter(a => a.id !== u.id));
                              toast.success('Account rejected');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/20 flex items-center gap-2">
                  <Inbox className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
                  <h2 className="text-base font-bold">Waitlist</h2>
                  <span className="ml-auto badge badge-gray">{waitlist.length}</span>
                </div>
                {waitlist.length === 0 ? (
                  <div className="p-10 text-center text-sm text-gray-400">No waitlist signups yet</div>
                ) : (
                  <div className="divide-y divide-black/[0.03]">
                    {waitlist.map(entry => (
                      <div key={entry.id} className="px-6 py-3 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{entry.email || entry.name || 'Unknown'}</p>
                          {entry.shop_name && <p className="text-xs text-gray-400">{entry.shop_name}</p>}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${entry.verified ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                          {entry.verified ? 'Verified' : 'Unverified'}
                        </span>
                        <span className="text-xs text-gray-400">{timeAgo(entry.created_at)}</span>
                        <button onClick={async () => {
                          await fetch(`${API_URL}/owner/waitlist/${entry.id}`, { method: 'DELETE', headers: authHeaders() });
                          setWaitlist(prev => prev.filter(e => e.id !== entry.id));
                          toast.success('Removed');
                        }} className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invite Code / Registration Gate */}
              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/20 flex items-center gap-2">
                  <Key className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
                  <h2 className="text-base font-bold">Registration Invite Code</h2>
                  {inviteCode ? (
                    <span className="ml-auto badge badge-green text-xs">Active</span>
                  ) : (
                    <span className="ml-auto badge badge-gray text-xs">Open (no code required)</span>
                  )}
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Set a code that shops must enter to create an account. Leave blank to allow open registration.
                  </p>
                  {inviteCode && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <span className="text-xs font-semibold text-green-700">Current code:</span>
                      <code className="text-sm font-black tracking-widest flex-1" style={{ color: '#2C2416' }}>{inviteCode}</code>
                      <CopyButton text={inviteCode} />
                    </div>
                  )}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      className="input flex-1 font-mono tracking-widest uppercase"
                      placeholder="e.g. SLAB-2026"
                      value={inviteCodeInput}
                      onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                      maxLength={32}
                    />
                    <button
                      disabled={inviteCodeSaving}
                      onClick={async () => {
                        setInviteCodeSaving(true);
                        try {
                          const res = await fetch(`${API_URL}/owner/invite-code`, {
                            method: 'POST',
                            headers: authHeaders(),
                            body: JSON.stringify({ invite_code: inviteCodeInput.trim() || null }),
                          });
                          const data = await res.json();
                          setInviteCode(data.invite_code || null);
                          setInviteCodeInput(data.invite_code || '');
                          toast.success(data.invite_code ? 'Invite code set!' : 'Code removed — registration is now open');
                        } catch { toast.error('Failed to save'); }
                        finally { setInviteCodeSaving(false); }
                      }}
                      className="btn btn-primary whitespace-nowrap"
                    >
                      {inviteCodeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Share this code with shops you want to onboard. They'll enter it on the sign-up page.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Company drawer */}
      {selectedCompany && (
        <CompanyDrawer
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onUpdate={handleCompanyUpdate}
          toast={toast}
        />
      )}

      {/* Blog composer */}
      {showBlogComposer && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="modal-glass rounded-3xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
                {editingPost ? 'Edit Post' : 'New Announcement'}
              </h3>
              <button onClick={() => setShowBlogComposer(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label>Title</label>
                <input type="text" value={blogForm.title} onChange={e => setBlogForm({ ...blogForm, title: e.target.value })}
                  placeholder="e.g. New Feature: Customer Email Notifications" className="input mt-1" />
              </div>
              <div>
                <label>Author</label>
                <input type="text" value={blogForm.author_name} onChange={e => setBlogForm({ ...blogForm, author_name: e.target.value })}
                  placeholder="e.g. SlabDash Team" className="input mt-1" />
              </div>
              <div>
                <label>Message</label>
                <textarea value={blogForm.body} onChange={e => setBlogForm({ ...blogForm, body: e.target.value })}
                  placeholder="Write your announcement..." rows={7} className="input mt-1 resize-none" />
              </div>
              <div className="flex items-center gap-6">
                {[
                  { label: 'Publish now', field: 'published' },
                  { label: 'Pin to top', field: 'pinned' },
                ].map(({ label, field }) => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer normal-case tracking-normal text-sm text-gray-700 font-medium">
                    <input type="checkbox" checked={blogForm[field]} onChange={e => setBlogForm({ ...blogForm, [field]: e.target.checked })}
                      className="w-4 h-4 rounded" style={{ accentColor: 'rgb(var(--brand-500))' }} />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveBlogPost} disabled={blogSaving || !blogForm.title.trim() || !blogForm.body.trim()}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                  {blogSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editingPost ? 'Update Post' : 'Publish Post'}
                </button>
                <button onClick={() => setShowBlogComposer(false)} className="btn btn-secondary px-6">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Newsletter */}
      {showNewsletter && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="modal-glass rounded-3xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Mail className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
                Send Newsletter
              </h3>
              <button onClick={() => setShowNewsletter(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label>Target</label>
                <select value={newsletterForm.targetPlan} onChange={e => setNewsletterForm({ ...newsletterForm, targetPlan: e.target.value })} className="input mt-1">
                  <option value="all">All Shops</option>
                  <option value="enterprise">Enterprise Only</option>
                  <option value="pro">Pro Only</option>
                  <option value="starter">Starter Only</option>
                  <option value="free">Free Plan Only</option>
                </select>
              </div>
              <div>
                <label>Subject</label>
                <input type="text" value={newsletterForm.subject} onChange={e => setNewsletterForm({ ...newsletterForm, subject: e.target.value })}
                  placeholder="Newsletter subject..." className="input mt-1" />
              </div>
              <div>
                <label>Message</label>
                <textarea value={newsletterForm.message} onChange={e => setNewsletterForm({ ...newsletterForm, message: e.target.value })}
                  placeholder="Write your newsletter message..." rows={7} className="input mt-1 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={sendNewsletter} disabled={sending || !newsletterForm.subject || !newsletterForm.message}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Mail className="w-4 h-4" /> Send Newsletter</>}
                </button>
                <button onClick={() => setShowNewsletter(false)} className="btn btn-secondary px-6">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

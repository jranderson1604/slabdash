import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Navigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import {
  Building2,
  Users,
  Package,
  Mail,
  Crown,
  Zap,
  FileText,
  Plus,
  Pin,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);

  const [showNewsletter, setShowNewsletter] = useState(false);
  const [newsletterForm, setNewsletterForm] = useState({ subject: '', message: '', targetPlan: 'all' });
  const [sending, setSending] = useState(false);

  const [blogPosts, setBlogPosts] = useState([]);
  const [showBlogComposer, setShowBlogComposer] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [blogForm, setBlogForm] = useState({ title: '', body: '', author_name: '', published: true, pinned: false });
  const [blogSaving, setBlogSaving] = useState(false);

  if (user?.role !== 'owner') return <Navigate to="/dashboard" replace />;

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('slabdash_token')}`,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, companiesRes, blogRes] = await Promise.all([
        fetch(`${API_URL}/owner/stats`, { headers: authHeaders() }),
        fetch(`${API_URL}/owner/companies`, { headers: authHeaders() }),
        fetch(`${API_URL}/blog/all`, { headers: authHeaders() }),
      ]);
      if (!statsRes.ok) throw new Error('Failed to load platform data');
      setStats(await statsRes.json());
      setCompanies(await companiesRes.json());
      if (blogRes.ok) setBlogPosts(await blogRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reloadBlogPosts = async () => {
    const res = await fetch(`${API_URL}/blog/all`, { headers: authHeaders() });
    if (res.ok) setBlogPosts(await res.json());
  };

  const sendNewsletter = async () => {
    try {
      setSending(true);
      const res = await fetch(`${API_URL}/owner/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(newsletterForm),
      });
      if (!res.ok) throw new Error('Failed to send');
      const result = await res.json();
      toast.success(`Newsletter prepared for ${result.recipientCount} shops!`);
      setShowNewsletter(false);
      setNewsletterForm({ subject: '', message: '', targetPlan: 'all' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const openNewPost = () => {
    setEditingPost(null);
    setBlogForm({ title: '', body: '', author_name: user?.name || '', published: true, pinned: false });
    setShowBlogComposer(true);
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setBlogForm({
      title: post.title,
      body: post.body,
      author_name: post.author_name || '',
      published: post.published,
      pinned: post.pinned,
    });
    setShowBlogComposer(true);
  };

  const saveBlogPost = async () => {
    if (!blogForm.title.trim() || !blogForm.body.trim()) return;
    try {
      setBlogSaving(true);
      const method = editingPost ? 'PUT' : 'POST';
      const url = editingPost ? `${API_URL}/blog/${editingPost.id}` : `${API_URL}/blog`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(blogForm),
      });
      if (!res.ok) throw new Error('Failed to save post');
      toast.success(editingPost ? 'Post updated!' : 'Post published!');
      setShowBlogComposer(false);
      setEditingPost(null);
      setBlogForm({ title: '', body: '', author_name: user?.name || '', published: true, pinned: false });
      await reloadBlogPosts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBlogSaving(false);
    }
  };

  const deleteBlogPost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      const res = await fetch(`${API_URL}/blog/${postId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Post deleted');
      setBlogPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const togglePostField = async (post, field) => {
    try {
      const res = await fetch(`${API_URL}/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ [field]: !post[field] }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setBlogPosts(prev => prev.map(p => p.id === post.id ? { ...p, [field]: !p[field] } : p));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteCompany = async (company) => {
    if (!confirm(`Delete "${company.name}" and ALL its data (users, submissions, cards, customers)? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/owner/companies/${company.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete');
      const result = await res.json();
      toast.success(result.message);
      setCompanies(prev => prev.filter(c => c.id !== company.id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const planBadge = (plan) => ({
    enterprise: 'badge badge-red',
    pro: 'badge badge-blue',
    starter: 'badge badge-green',
    free: 'badge badge-gray',
  }[plan] || 'badge badge-gray');

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'rgb(var(--brand-500))' }} />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Failed to Load Platform Data</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Control"
        subtitle="Manage all SlabDash shops"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewsletter(true)}
              className="btn btn-secondary flex items-center gap-2 text-sm py-2 px-4"
            >
              <Mail className="w-4 h-4" />
              Newsletter
            </button>
            <button
              onClick={openNewPost}
              className="btn btn-primary flex items-center gap-2 text-sm py-2 px-4"
            >
              <Plus className="w-4 h-4" />
              New Post
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Building2} label="Total Shops"
          value={stats?.total_shops || 0}
          subtext={`${stats?.new_shops_30d || 0} new this month`}
          color="blue" variant="solid"
        />
        <StatCard
          icon={Crown} label="Enterprise"
          value={stats?.enterprise_shops || 0}
          subtext="Premium clients"
          color="purple" variant="solid"
        />
        <StatCard
          icon={Zap} label="Pro Plans"
          value={stats?.pro_shops || 0}
          subtext="Active subscriptions"
          color="orange" variant="solid"
        />
        <StatCard
          icon={Package} label="Submissions"
          value={stats?.total_submissions || 0}
          subtext={`${stats?.submissions_7d || 0} this week`}
          color="green" variant="solid"
        />
        <StatCard
          icon={Users} label="Shop Users"
          value={stats?.total_users || 0}
          subtext="Active accounts"
          color="brand" variant="solid"
        />
      </div>

      {/* Client Shops Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/20 flex items-center gap-2">
          <Building2 className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
          <h2 className="text-lg font-bold">All Client Shops</h2>
          <span className="ml-auto badge badge-gray">{companies.length} shops</span>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Contact</th>
                <th>Plan</th>
                <th className="text-center">Users</th>
                <th className="text-center">Submissions</th>
                <th className="text-center">Cards</th>
                <th>Since</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {companies.map(company => (
                <tr key={company.id}>
                  <td>
                    <div className="font-semibold text-gray-900">{company.name}</div>
                    <div className="text-xs text-gray-400">/{company.slug}</div>
                  </td>
                  <td className="text-gray-500">{company.email}</td>
                  <td>
                    <span className={planBadge(company.plan)}>
                      {company.plan || 'free'}
                    </span>
                  </td>
                  <td className="text-center text-gray-500">{company.user_count}</td>
                  <td className="text-center text-gray-500">{company.submission_count}</td>
                  <td className="text-center text-gray-500">{company.card_count}</td>
                  <td className="text-gray-400 text-xs">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      onClick={() => deleteCompany(company)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete shop"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">No shops yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Announcements */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/20 flex items-center gap-2">
          <FileText className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
          <h2 className="text-lg font-bold">Landing Page Announcements</h2>
          <span className="ml-auto badge badge-gray">{blogPosts.length}</span>
        </div>
        {blogPosts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-gray-500">No announcements yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first post to share updates on the landing page.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.03]">
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
                    {' · '}
                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePostField(post, 'pinned')}
                    title={post.pinned ? 'Unpin' : 'Pin to top'}
                    className={`p-2 rounded-xl transition-colors ${post.pinned ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => togglePostField(post, 'published')}
                    title={post.published ? 'Unpublish' : 'Publish'}
                    className={`p-2 rounded-xl transition-colors ${post.published ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                  >
                    {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditPost(post)}
                    title="Edit"
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteBlogPost(post.id)}
                    title="Delete"
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcement Composer Modal */}
      {showBlogComposer && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="modal-glass rounded-3xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
                {editingPost ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <button
                onClick={() => setShowBlogComposer(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label>Title</label>
                <input
                  type="text"
                  value={blogForm.title}
                  onChange={e => setBlogForm({ ...blogForm, title: e.target.value })}
                  placeholder="e.g. New Feature: Customer Email Notifications"
                  className="input mt-1"
                />
              </div>

              <div>
                <label>Author</label>
                <input
                  type="text"
                  value={blogForm.author_name}
                  onChange={e => setBlogForm({ ...blogForm, author_name: e.target.value })}
                  placeholder="e.g. SlabDash Team"
                  className="input mt-1"
                />
              </div>

              <div>
                <label>Message</label>
                <textarea
                  value={blogForm.body}
                  onChange={e => setBlogForm({ ...blogForm, body: e.target.value })}
                  placeholder="Write your announcement here..."
                  rows={7}
                  className="input mt-1 resize-none"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer normal-case tracking-normal text-sm text-gray-700 font-medium">
                  <input
                    type="checkbox"
                    checked={blogForm.published}
                    onChange={e => setBlogForm({ ...blogForm, published: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'rgb(var(--brand-500))' }}
                  />
                  Publish now
                </label>
                <label className="flex items-center gap-2 cursor-pointer normal-case tracking-normal text-sm text-gray-700 font-medium">
                  <input
                    type="checkbox"
                    checked={blogForm.pinned}
                    onChange={e => setBlogForm({ ...blogForm, pinned: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'rgb(var(--brand-500))' }}
                  />
                  Pin to top
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveBlogPost}
                  disabled={blogSaving || !blogForm.title.trim() || !blogForm.body.trim()}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {blogSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    : editingPost ? 'Update Post' : 'Publish Post'
                  }
                </button>
                <button onClick={() => setShowBlogComposer(false)} className="btn btn-secondary px-6">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Newsletter Modal */}
      {showNewsletter && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="modal-glass rounded-3xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Mail className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
                Send Newsletter
              </h3>
              <button
                onClick={() => setShowNewsletter(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label>Target Audience</label>
                <select
                  value={newsletterForm.targetPlan}
                  onChange={e => setNewsletterForm({ ...newsletterForm, targetPlan: e.target.value })}
                  className="input mt-1"
                >
                  <option value="all">All Shops</option>
                  <option value="enterprise">Enterprise Only</option>
                  <option value="pro">Pro Only</option>
                  <option value="starter">Starter Only</option>
                  <option value="free">Free Plan Only</option>
                </select>
              </div>

              <div>
                <label>Subject</label>
                <input
                  type="text"
                  value={newsletterForm.subject}
                  onChange={e => setNewsletterForm({ ...newsletterForm, subject: e.target.value })}
                  placeholder="Newsletter subject..."
                  className="input mt-1"
                />
              </div>

              <div>
                <label>Message</label>
                <textarea
                  value={newsletterForm.message}
                  onChange={e => setNewsletterForm({ ...newsletterForm, message: e.target.value })}
                  placeholder="Write your newsletter message..."
                  rows={7}
                  className="input mt-1 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={sendNewsletter}
                  disabled={sending || !newsletterForm.subject || !newsletterForm.message}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {sending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    : <><Mail className="w-4 h-4" /> Send Newsletter</>
                  }
                </button>
                <button onClick={() => setShowNewsletter(false)} className="btn btn-secondary px-6">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

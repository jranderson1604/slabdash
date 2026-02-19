import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Navigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import {
  Building2,
  Users,
  Package,
  Mail,
  TrendingUp,
  Activity,
  Shield,
  Loader2,
  AlertCircle,
  Crown,
  Zap,
  FileText,
  Plus,
  Pin,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState(null);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [newsletterForm, setNewsletterForm] = useState({
    subject: '',
    message: '',
    targetPlan: 'all'
  });
  const [sending, setSending] = useState(false);
  const [blogPosts, setBlogPosts] = useState([]);
  const [showBlogComposer, setShowBlogComposer] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [blogForm, setBlogForm] = useState({ title: '', body: '', published: true, pinned: false });
  const [blogSaving, setBlogSaving] = useState(false);

  // Only allow owner role
  if (user?.role !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('slabdash_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, companiesRes, activityRes, blogRes] = await Promise.all([
        fetch(`${API_URL}/owner/stats`, { headers }),
        fetch(`${API_URL}/owner/companies`, { headers }),
        fetch(`${API_URL}/owner/activity?limit=15`, { headers }),
        fetch(`${API_URL}/blog/all`, { headers }),
      ]);

      if (!statsRes.ok) throw new Error('Failed to load platform data');

      setStats(await statsRes.json());
      setCompanies(await companiesRes.json());
      setActivity(await activityRes.json());
      if (blogRes.ok) setBlogPosts(await blogRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendNewsletter = async () => {
    try {
      setSending(true);
      const token = localStorage.getItem('slabdash_token');
      const response = await fetch(`${API_URL}/owner/newsletter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newsletterForm)
      });

      if (!response.ok) throw new Error('Failed to send newsletter');

      const result = await response.json();
      toast.success(`Newsletter prepared for ${result.recipientCount} shops!`);
      setShowNewsletter(false);
      setNewsletterForm({ subject: '', message: '', targetPlan: 'all' });
    } catch (err) {
      toast.error('Failed to send newsletter: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const openNewPost = () => {
    setEditingPost(null);
    setBlogForm({ title: '', body: '', published: true, pinned: false });
    setShowBlogComposer(true);
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setBlogForm({ title: post.title, body: post.body, published: post.published, pinned: post.pinned });
    setShowBlogComposer(true);
  };

  const saveBlogPost = async () => {
    if (!blogForm.title.trim() || !blogForm.body.trim()) return;
    try {
      setBlogSaving(true);
      const token = localStorage.getItem('slabdash_token');
      const method = editingPost ? 'PUT' : 'POST';
      const url = editingPost ? `${API_URL}/blog/${editingPost.id}` : `${API_URL}/blog`;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(blogForm),
      });
      if (!response.ok) throw new Error('Failed to save post');
      toast.success(editingPost ? 'Post updated!' : 'Post published!');
      setShowBlogComposer(false);
      setEditingPost(null);
      setBlogForm({ title: '', body: '', published: true, pinned: false });
      // Reload blog posts
      const blogRes = await fetch(`${API_URL}/blog/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (blogRes.ok) setBlogPosts(await blogRes.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBlogSaving(false);
    }
  };

  const deleteBlogPost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      const token = localStorage.getItem('slabdash_token');
      const response = await fetch(`${API_URL}/blog/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Post deleted');
      setBlogPosts(blogPosts.filter(p => p.id !== postId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const togglePublished = async (post) => {
    try {
      const token = localStorage.getItem('slabdash_token');
      const response = await fetch(`${API_URL}/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ published: !post.published }),
      });
      if (!response.ok) throw new Error('Failed to update');
      setBlogPosts(blogPosts.map(p => p.id === post.id ? { ...p, published: !p.published } : p));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteCompany = async (company) => {
    if (!confirm(`Delete "${company.name}" and ALL its data (users, submissions, cards, customers)? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('slabdash_token');
      const response = await fetch(`${API_URL}/owner/companies/${company.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete');
      const result = await response.json();
      toast.success(result.message);
      setCompanies(companies.filter(c => c.id !== company.id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const togglePinned = async (post) => {
    try {
      const token = localStorage.getItem('slabdash_token');
      const response = await fetch(`${API_URL}/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pinned: !post.pinned }),
      });
      if (!response.ok) throw new Error('Failed to update');
      setBlogPosts(blogPosts.map(p => p.id === post.id ? { ...p, pinned: !p.pinned } : p));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Platform Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" />
            Platform Control
          </h1>
          <p className="text-gray-600 mt-1">Manage your SlabDash shops</p>
        </div>
        <button
          onClick={() => setShowNewsletter(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Send Newsletter
        </button>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          icon={Building2}
          label="Total Shops"
          value={stats?.total_shops || 0}
          subtext={`${stats?.new_shops_30d || 0} new this month`}
          color="blue"
          variant="solid"
        />
        <StatCard
          icon={Crown}
          label="Enterprise"
          value={stats?.enterprise_shops || 0}
          subtext="Premium clients"
          color="purple"
          variant="solid"
        />
        <StatCard
          icon={Zap}
          label="Pro Plans"
          value={stats?.pro_shops || 0}
          subtext="Active subscriptions"
          color="orange"
          variant="solid"
        />
        <StatCard
          icon={Package}
          label="Total Submissions"
          value={stats?.total_submissions || 0}
          subtext={`${stats?.submissions_7d || 0} this week`}
          color="green"
          variant="solid"
        />
        <StatCard
          icon={Users}
          label="Shop Users"
          value={stats?.total_users || 0}
          subtext="Active accounts"
          color="blue"
          variant="solid"
        />
      </div>

      {/* All Shops Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            All Client Shops
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cards Tracked</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Since</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{company.name}</div>
                    <div className="text-xs text-gray-500">/{company.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{company.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      company.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                      company.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                      company.plan === 'starter' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {company.plan || 'free'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {company.user_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {company.submission_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {company.card_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button onClick={() => deleteCompany(company)} title="Delete shop"
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blog Posts Management */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Landing Page Updates
          </h2>
          <button onClick={openNewPost}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>

        {blogPosts.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-semibold">No posts yet</p>
            <p className="text-sm mt-1">Create your first update to share with shops on the landing page.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {blogPosts.map((post) => (
              <div key={post.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{post.title}</h3>
                    {post.pinned && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        Pinned
                      </span>
                    )}
                    {!post.published && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 shrink-0">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{post.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}{post.author_name}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePinned(post)} title={post.pinned ? 'Unpin' : 'Pin'}
                    className={`p-2 rounded-lg transition-colors ${post.pinned ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                    <Pin className="w-4 h-4" />
                  </button>
                  <button onClick={() => togglePublished(post)} title={post.published ? 'Unpublish' : 'Publish'}
                    className={`p-2 rounded-lg transition-colors ${post.published ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                    {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEditPost(post)} title="Edit"
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteBlogPost(post.id)} title="Delete"
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blog Post Composer Modal */}
      {showBlogComposer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-600" />
                {editingPost ? 'Edit Post' : 'New Update'}
              </h3>
              <button onClick={() => setShowBlogComposer(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={blogForm.title}
                  onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                  placeholder="e.g. New Feature: Customer Email Notifications"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea value={blogForm.body}
                  onChange={(e) => setBlogForm({ ...blogForm, body: e.target.value })}
                  placeholder="Write your update here... This will appear on the landing page for all visitors."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={blogForm.published}
                    onChange={(e) => setBlogForm({ ...blogForm, published: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Publish now</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={blogForm.pinned}
                    onChange={(e) => setBlogForm({ ...blogForm, pinned: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Pin to top</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={saveBlogPost}
                  disabled={blogSaving || !blogForm.title.trim() || !blogForm.body.trim()}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {blogSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><FileText className="w-4 h-4" /> {editingPost ? 'Update Post' : 'Publish Post'}</>
                  )}
                </button>
                <button onClick={() => setShowBlogComposer(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Newsletter Modal */}
      {showNewsletter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-purple-600" />
                Send Newsletter to Shops
              </h3>
              <button
                onClick={() => setShowNewsletter(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={newsletterForm.targetPlan}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, targetPlan: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Shops</option>
                  <option value="enterprise">Enterprise Only</option>
                  <option value="pro">Pro Only</option>
                  <option value="starter">Starter Only</option>
                  <option value="free">Free Plan Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={newsletterForm.subject}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, subject: e.target.value })}
                  placeholder="Newsletter subject..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={newsletterForm.message}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, message: e.target.value })}
                  placeholder="Write your newsletter message..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={sendNewsletter}
                  disabled={sending || !newsletterForm.subject || !newsletterForm.message}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Newsletter
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowNewsletter(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
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

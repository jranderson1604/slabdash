import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { emailTemplates } from '../api/client';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Mail,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  X,
  Copy,
  Send,
  FileText,
  Settings as SettingsIcon
} from 'lucide-react';

// Email Navigation Tabs Component
function EmailNav() {
  const location = useLocation();
  const tabs = [
    { name: 'Settings', path: '/email-settings', icon: SettingsIcon },
    { name: 'Templates', path: '/email-templates', icon: FileText },
    { name: 'Send Emails', path: '/email-sender', icon: Send },
  ];

  return (
    <div className="mb-6 flex gap-2 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
              isActive
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}

const PSA_STEPS = [
  'Arrived',
  'Order Prep',
  'Research & ID',
  'Grading',
  'Assembly',
  'QA Check 1',
  'QA Check 2',
  'Shipped'
];

const TEMPLATE_VARIABLES = [
  { var: '{{customer_name}}', desc: 'Customer\'s name' },
  { var: '{{submission_number}}', desc: 'PSA submission number' },
  { var: '{{step_name}}', desc: 'Current PSA step' },
  { var: '{{progress_percent}}', desc: 'Progress percentage' },
  { var: '{{service_level}}', desc: 'Service level (Regular, Express, etc.)' },
  { var: '{{company_name}}', desc: 'Your company name' },
  { var: '{{company_logo_url}}', desc: 'Your company logo URL' }
];

function TemplateEditorModal({ template, onClose, onSave }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    step_name: template?.step_name || '',
    subject: template?.subject || '',
    body_html: template?.body_html || '',
    body_text: template?.body_text || '',
    enabled: template?.enabled !== false
  });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleSave = async () => {
    if (!formData.step_name || !formData.subject || !formData.body_html) {
      toast.error('Please fill in step name, subject, and email body');
      return;
    }

    setSaving(true);
    try {
      if (template?.id) {
        await emailTemplates.update(template.id, formData);
      } else {
        await emailTemplates.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!template?.id) {
      toast.error('Please save the template first to preview');
      return;
    }

    try {
      const res = await emailTemplates.preview(template.id);
      setPreview(res.data);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to load preview:', error);
      toast.error('Failed to load preview');
    }
  };

  const copyVariable = (varText) => {
    navigator.clipboard.writeText(varText);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-brand-50 rounded-xl shadow-xl max-w-5xl w-full my-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {template ? 'Edit Template' : 'New Template'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Create email template for PSA step notifications
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="label">PSA Step *</label>
              <select
                value={formData.step_name}
                onChange={(e) => setFormData({ ...formData, step_name: e.target.value })}
                className="input"
                disabled={!!template}
              >
                <option value="">Select a step...</option>
                {PSA_STEPS.map((step) => (
                  <option key={step} value={step}>{step}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Email Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Your cards are now {{step_name}} - {{submission_number}}"
                className="input"
              />
            </div>

            <div>
              <label className="label">Email Body (HTML) *</label>
              <textarea
                value={formData.body_html}
                onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                className="input font-mono text-sm"
                rows={12}
                placeholder="<h2>Hi {{customer_name}},</h2><p>Your submission {{submission_number}} has progressed...</p>"
              />
            </div>

            <div>
              <label className="label">Plain Text Version (Optional)</label>
              <textarea
                value={formData.body_text}
                onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                className="input"
                rows={6}
                placeholder="Hi {{customer_name}}, Your submission {{submission_number}}..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 text-brand-600 rounded"
                />
                <span className="text-sm text-gray-700">Template enabled (send emails for this step)</span>
              </label>
            </div>
          </div>

          {/* Variables Sidebar */}
          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Available Variables</h3>
              <div className="space-y-2">
                {TEMPLATE_VARIABLES.map((v) => (
                  <div key={v.var} className="group">
                    <div className="flex items-center justify-between">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-brand-600 font-mono">
                        {v.var}
                      </code>
                      <button
                        onClick={() => copyVariable(v.var)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{v.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm">Tips</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Use HTML for formatting</li>
                <li>• Variables are case-sensitive</li>
                <li>• Test with preview before saving</li>
                <li>• Include customer name for personalization</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button
            onClick={handlePreview}
            disabled={!template?.id}
            className="btn btn-secondary gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Save Template
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && preview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-brand-50 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Email Preview</h3>
                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500">Subject:</p>
                <p className="font-semibold text-gray-900">{preview.subject}</p>
              </div>
              <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                <iframe
                  srcDoc={preview.body_html}
                  sandbox=""
                  title="Email Preview"
                  className="w-full border-0"
                  style={{ minHeight: '300px' }}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
              <button onClick={() => setShowPreview(false)} className="btn btn-secondary w-full">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmailTemplates() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [creatingDefaults, setCreatingDefaults] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await emailTemplates.list();
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleCreateDefaults = async () => {
    if (!confirm('Create default email templates for all PSA steps? (This will not overwrite existing templates)')) return;

    setCreatingDefaults(true);
    try {
      const response = await emailTemplates.createDefaults();

      if (response.data.success) {
        toast.success(`Created ${response.data.templates_created} new templates`);
        await loadTemplates();
      } else {
        toast.error('Failed to create templates: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Create defaults failed:', error);
      toast.error('Failed to create default templates: ' + (error.response?.data?.error || error.message));
    } finally {
      setCreatingDefaults(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;

    try {
      await emailTemplates.delete(id);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleSave = async () => {
    setShowEditor(false);
    await loadTemplates();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  // Calculate missing steps
  const existingSteps = templates.map(t => t.step_name);
  const missingSteps = PSA_STEPS.filter(step => !existingSteps.includes(step));

  return (
    <div className="space-y-6">
      <EmailNav />
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-8 shadow-xl">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg">EMAIL TEMPLATES</h1>
            <p className="text-white/90 text-lg font-semibold">Customize email notifications for each PSA step</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {missingSteps.length > 0 && (
              <button
                onClick={handleCreateDefaults}
                disabled={creatingDefaults}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 border-2 border-white/30 shadow-lg disabled:opacity-50"
              >
                {creatingDefaults ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Create Defaults</span>
              </button>
            )}
            <button onClick={handleNew} className="bg-white text-brand-600 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand-600" />
                <h3 className="font-semibold text-gray-900">{template.step_name}</h3>
              </div>
              {template.enabled ? (
                <CheckCircle className="w-5 h-5 text-green-500" title="Enabled" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400" title="Disabled" />
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.subject}</p>

            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => handleEdit(template)}
                className="flex-1 text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center justify-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(template.id)}
                className="flex-1 text-sm text-red-600 hover:text-red-700 font-medium flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full">
            <div className="card p-12 text-center">
              <Mail className="w-12 h-12 text-brand-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No email templates yet</h3>
              <p className="text-gray-500 mb-4">Create templates for PSA steps to start sending notifications</p>
              <button onClick={handleNew} className="btn btn-primary">
                Create First Template
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Missing Steps */}
      {templates.length > 0 && templates.length < PSA_STEPS.length && (
        <div className="card p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Missing templates:</strong> Consider creating templates for{' '}
            {PSA_STEPS.filter(step => !templates.find(t => t.step_name === step)).join(', ')}
          </p>
        </div>
      )}

      {showEditor && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setShowEditor(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

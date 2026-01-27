import { useState, useEffect } from 'react';
import { email } from '../api/client';
import {
  Mail,
  Settings,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  History
} from 'lucide-react';

const PSA_STEP_ORDER = [
  'Arrived',
  'OrderPrep',
  'ResearchAndID',
  'Grading',
  'Assembly',
  'QACheck1',
  'QACheck2',
  'Shipped'
];

function SettingsSection({ icon: Icon, title, description, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-start gap-4 text-left"
      >
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function TemplateEditor({ template, onSave, onSendTest }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [enabled, setEnabled] = useState(template.enabled);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState(null);

  const hasChanges = subject !== template.subject || body !== template.body || enabled !== template.enabled;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(template.id, { subject, body, enabled });
      setMessage({ type: 'success', text: 'Template saved!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Enter an email address' });
      return;
    }
    setSendingTest(true);
    setMessage(null);
    try {
      await onSendTest(template.id, testEmail);
      setMessage({ type: 'success', text: 'Test email sent!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to send test email' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleToggle = () => {
    setEnabled(!enabled);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className={`p-1 rounded ${enabled ? 'text-green-600' : 'text-gray-400'}`}
          >
            {enabled ? (
              <ToggleRight className="w-6 h-6" />
            ) : (
              <ToggleLeft className="w-6 h-6" />
            )}
          </button>
          <div className="text-left">
            <p className="font-medium text-gray-900">{template.step_name}</p>
            <p className="text-sm text-gray-500 truncate max-w-md">{subject || 'No subject set'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Unsaved</span>
          )}
          <span className={`text-xs px-2 py-1 rounded ${enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
          <div>
            <label className="label">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              placeholder="Email subject..."
            />
          </div>

          <div>
            <label className="label">Email Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input min-h-[200px] font-mono text-sm"
              placeholder="Email body..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Available variables: {'{{customer_name}}'}, {'{{submission_number}}'}, {'{{company_name}}'}
            </p>
          </div>

          {message && (
            <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {message.text}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="btn btn-primary gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Template
            </button>

            <div className="flex gap-2 flex-1">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@email.com"
                className="input flex-1"
              />
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !enabled}
                className="btn btn-secondary gap-2"
                title={!enabled ? 'Enable template to send test' : ''}
              >
                {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmailTemplates() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState({
    mailgun_api_key: '',
    mailgun_domain: '',
    mailgun_from_email: '',
    mailgun_from_name: '',
    has_mailgun_key: false
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [settingsMessage, setSettingsMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesRes, settingsRes] = await Promise.all([
        email.getTemplates(),
        email.getSettings()
      ]);

      // Sort templates by PSA step order
      const sortedTemplates = templatesRes.data.sort((a, b) => {
        const aIndex = PSA_STEP_ORDER.indexOf(a.step_key);
        const bIndex = PSA_STEP_ORDER.indexOf(b.step_key);
        return aIndex - bIndex;
      });

      setTemplates(sortedTemplates);
      setSettings({
        ...settingsRes.data,
        mailgun_api_key: ''
      });
    } catch (error) {
      console.error('Failed to load email data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const dataToSave = {
        mailgun_domain: settings.mailgun_domain,
        mailgun_from_email: settings.mailgun_from_email,
        mailgun_from_name: settings.mailgun_from_name
      };

      if (settings.mailgun_api_key) {
        dataToSave.mailgun_api_key = settings.mailgun_api_key;
      }

      await email.updateSettings(dataToSave);
      setSettingsMessage({ type: 'success', text: 'Settings saved!' });
      setSettings(prev => ({ ...prev, has_mailgun_key: true, mailgun_api_key: '' }));
    } catch (error) {
      setSettingsMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      await email.testConnection();
      setConnectionStatus({ success: true, message: 'Connection successful!' });
    } catch (error) {
      setConnectionStatus({ success: false, message: error.response?.data?.error || 'Connection failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveTemplate = async (id, data) => {
    await email.updateTemplate(id, data);
    // Refresh templates to get updated data
    const templatesRes = await email.getTemplates();
    const sortedTemplates = templatesRes.data.sort((a, b) => {
      const aIndex = PSA_STEP_ORDER.indexOf(a.step_key);
      const bIndex = PSA_STEP_ORDER.indexOf(b.step_key);
      return aIndex - bIndex;
    });
    setTemplates(sortedTemplates);
  };

  const handleSendTest = async (templateId, toEmail) => {
    await email.sendTest(templateId, toEmail);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <p className="text-gray-500 mt-1">Configure automated emails for PSA submission status updates</p>
      </div>

      {/* Mailgun Settings */}
      <SettingsSection
        icon={Settings}
        title="Mailgun Configuration"
        description="Connect your Mailgun account to send emails"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Mailgun API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.mailgun_api_key}
                  onChange={(e) => setSettings({ ...settings, mailgun_api_key: e.target.value })}
                  className="input pr-10"
                  placeholder={settings.has_mailgun_key ? '••••••••••••••••' : 'Enter API key'}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {settings.has_mailgun_key && (
                <p className="text-xs text-green-600 mt-1">API key is configured</p>
              )}
            </div>
            <div>
              <label className="label">Mailgun Domain</label>
              <input
                type="text"
                value={settings.mailgun_domain || ''}
                onChange={(e) => setSettings({ ...settings, mailgun_domain: e.target.value })}
                className="input"
                placeholder="mg.yourdomain.com"
              />
            </div>
            <div>
              <label className="label">From Email</label>
              <input
                type="email"
                value={settings.mailgun_from_email || ''}
                onChange={(e) => setSettings({ ...settings, mailgun_from_email: e.target.value })}
                className="input"
                placeholder="noreply@yourdomain.com"
              />
            </div>
            <div>
              <label className="label">From Name</label>
              <input
                type="text"
                value={settings.mailgun_from_name || ''}
                onChange={(e) => setSettings({ ...settings, mailgun_from_name: e.target.value })}
                className="input"
                placeholder="Your Shop Name"
              />
            </div>
          </div>

          {settingsMessage && (
            <div className={`flex items-center gap-2 text-sm ${settingsMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {settingsMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {settingsMessage.text}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="btn btn-primary gap-2"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>

            <button
              onClick={handleTestConnection}
              disabled={testingConnection || !settings.has_mailgun_key}
              className="btn btn-secondary gap-2"
            >
              {testingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Test Connection
            </button>

            {connectionStatus && (
              <span className={`flex items-center gap-2 text-sm ${connectionStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                {connectionStatus.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {connectionStatus.message}
              </span>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* Email Templates */}
      <SettingsSection
        icon={Mail}
        title="PSA Step Templates"
        description="Customize the email sent at each PSA processing step"
      >
        <div className="space-y-3">
          {templates.map((template) => (
            <TemplateEditor
              key={template.id}
              template={template}
              onSave={handleSaveTemplate}
              onSendTest={handleSendTest}
            />
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companies, emailTemplates } from '../api/client';
import { Mail, Send, CheckCircle, AlertCircle, Loader2, Save, Info, FileText, Users } from 'lucide-react';

export default function EmailSettings() {
  const [settings, setSettings] = useState({
    email_notifications_enabled: false,
    use_custom_smtp: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    company_logo_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await companies.get();
      setSettings({
        email_notifications_enabled: res.data.email_notifications_enabled || false,
        use_custom_smtp: res.data.use_custom_smtp || false,
        smtp_host: res.data.smtp_host || '',
        smtp_port: res.data.smtp_port || 587,
        smtp_secure: res.data.smtp_secure || false,
        smtp_user: res.data.smtp_user || '',
        smtp_password: '', // Don't show password
        from_email: res.data.from_email || '',
        from_name: res.data.from_name || '',
        company_logo_url: res.data.company_logo_url || ''
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only send password if it was changed
      const dataToSave = { ...settings };
      if (!settings.smtp_password) {
        delete dataToSave.smtp_password;
      }

      await companies.update(dataToSave);
      alert('Email settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      await emailTemplates.testConfig(testEmail);
      setTestResult({ success: true, message: 'Test email sent successfully! Check your inbox.' });
    } catch (error) {
      setTestResult({
        success: false,
        message: error.response?.data?.error || 'Failed to send test email'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!settings.email_notifications_enabled) {
      alert('Please enable email notifications first');
      return;
    }

    const confirmed = window.confirm(
      'This will send a status update email to all customers with active submissions. Continue?'
    );

    if (!confirmed) return;

    setSendingBulk(true);
    setBulkResult(null);

    try {
      const response = await emailTemplates.sendBulkStatusUpdate();
      setBulkResult({
        success: true,
        message: response.data.message || `Successfully sent ${response.data.emails_sent} emails!`,
        emails_sent: response.data.emails_sent,
        emails_failed: response.data.emails_failed
      });
    } catch (error) {
      setBulkResult({
        success: false,
        message: error.response?.data?.error || 'Failed to send bulk status updates'
      });
    } finally {
      setSendingBulk(false);
    }
  };

  const emailProviderPresets = {
    gmail: {
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_secure: false
    },
    outlook: {
      smtp_host: 'smtp.office365.com',
      smtp_port: 587,
      smtp_secure: false
    },
    sendgrid: {
      smtp_host: 'smtp.sendgrid.net',
      smtp_port: 587,
      smtp_secure: false
    },
    mailgun: {
      smtp_host: 'smtp.mailgun.org',
      smtp_port: 587,
      smtp_secure: false
    }
  };

  const applyPreset = (provider) => {
    setSettings({
      ...settings,
      ...emailProviderPresets[provider]
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Notifications</h1>
          <p className="text-gray-500 mt-1">Configure SMTP settings and automatic email notifications</p>
        </div>
        <Link to="/email-templates" className="btn btn-secondary gap-2">
          <FileText className="w-4 h-4" />
          Manage Templates
        </Link>
      </div>

      {/* Info Banner */}
      <div className="card bg-blue-50 border-blue-200 p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How Email Notifications Work</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Customers receive automatic updates when their submission progresses through PSA steps</li>
              <li><strong>Easy Mode:</strong> Use SlabDash email (works immediately, no setup required)</li>
              <li><strong>Pro Mode:</strong> Use your own branded email (Gmail, SendGrid, Mailgun, etc.)</li>
              <li>Customize email templates for each PSA step</li>
              <li>All linked customers in a submission will receive notifications</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Notifications
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Send automatic updates to customers when submissions progress
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.email_notifications_enabled}
              onChange={(e) => setSettings({ ...settings, email_notifications_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>
      </div>

      {/* Email Mode Selection */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Service Mode</h3>
        <p className="text-sm text-gray-500 mb-4">Choose how emails are sent to your customers</p>

        <div className="space-y-3">
          {/* SlabDash Email Option */}
          <label className={`relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-colors ${
            !settings.use_custom_smtp ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="email_mode"
              checked={!settings.use_custom_smtp}
              onChange={() => setSettings({ ...settings, use_custom_smtp: false })}
              className="mt-1 w-4 h-4 text-brand-600"
            />
            <div className="ml-3 flex-1">
              <div className="font-semibold text-gray-900">SlabDash Email (Recommended)</div>
              <p className="text-sm text-gray-600 mt-1">
                ✅ Works immediately - no setup required<br />
                ✅ Reliable delivery through SlabDash servers<br />
                ✅ Perfect for getting started quickly<br />
                📧 Emails sent from: notifications@slabdash.com
              </p>
            </div>
          </label>

          {/* Custom SMTP Option */}
          <label className={`relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-colors ${
            settings.use_custom_smtp ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="email_mode"
              checked={settings.use_custom_smtp}
              onChange={() => setSettings({ ...settings, use_custom_smtp: true })}
              className="mt-1 w-4 h-4 text-brand-600"
            />
            <div className="ml-3 flex-1">
              <div className="font-semibold text-gray-900">Custom SMTP (Advanced)</div>
              <p className="text-sm text-gray-600 mt-1">
                ✅ Professional branded emails from your domain<br />
                ✅ Full control over email delivery<br />
                ⚙️ Requires SMTP configuration (Gmail, SendGrid, etc.)<br />
                📧 Emails sent from: your-email@yourdomain.com
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Quick Presets - Only show if Custom SMTP is selected */}
      {settings.use_custom_smtp && (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Setup</h3>
        <p className="text-sm text-gray-500 mb-4">Click to auto-fill settings for popular email providers</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.keys(emailProviderPresets).map((provider) => (
            <button
              key={provider}
              onClick={() => applyPreset(provider)}
              className="btn btn-secondary text-sm capitalize"
            >
              {provider}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* SMTP Configuration - Only show if Custom SMTP is selected */}
      {settings.use_custom_smtp && (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SMTP Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">SMTP Host *</label>
            <input
              type="text"
              value={settings.smtp_host}
              onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
              placeholder="smtp.gmail.com"
              className="input"
            />
          </div>
          <div>
            <label className="label">SMTP Port *</label>
            <input
              type="number"
              value={settings.smtp_port}
              onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
              placeholder="587"
              className="input"
            />
          </div>
          <div>
            <label className="label">SMTP Username *</label>
            <input
              type="text"
              value={settings.smtp_user}
              onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
              placeholder="your-email@gmail.com"
              className="input"
            />
          </div>
          <div>
            <label className="label">SMTP Password *</label>
            <input
              type="password"
              value={settings.smtp_password}
              onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
              placeholder="Enter new password to change"
              className="input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.smtp_secure}
                onChange={(e) => setSettings({ ...settings, smtp_secure: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span className="text-sm text-gray-700">Use SSL/TLS (port 465)</span>
            </label>
          </div>
        </div>
      </div>
      )}

      {/* From Settings */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Branding</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings.use_custom_smtp && (
          <div>
            <label className="label">From Email *</label>
            <input
              type="email"
              value={settings.from_email}
              onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
              placeholder="notifications@yourshop.com"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">Customers will see emails from this address</p>
          </div>
          )}
          <div className={settings.use_custom_smtp ? '' : 'md:col-span-2'}>
            <label className="label">From Name {settings.use_custom_smtp ? '*' : '(Optional)'}</label>
            <input
              type="text"
              value={settings.from_name}
              onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
              placeholder="Your Shop Name"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              {settings.use_custom_smtp
                ? 'Display name in customer\'s inbox'
                : 'Customize the sender name (defaults to "SlabDash Notifications")'}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="label">Company Logo URL (Optional)</label>
            <input
              type="url"
              value={settings.company_logo_url}
              onChange={(e) => setSettings({ ...settings, company_logo_url: e.target.value })}
              placeholder="https://yourshop.com/logo.png"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">Used in email templates with {'{{company_logo_url}}'}</p>
          </div>
        </div>
      </div>

      {/* Test Email */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
        <p className="text-sm text-gray-500 mb-4">Send a test email to verify your settings</p>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="input flex-1"
          />
          <button
            onClick={handleTestEmail}
            disabled={testing}
            className="btn btn-secondary gap-2"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Test Email
          </button>
        </div>
        {testResult && (
          <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {testResult.message}
            </p>
          </div>
        )}
      </div>

      {/* Bulk Status Update */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Bulk Status Update
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Send all customers a comprehensive email with the current status of their submission(s)
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700">
            <strong>How it works:</strong>
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
            <li>Each customer receives ONE email listing ALL their active submissions</li>
            <li>Email includes current PSA step and progress for each submission</li>
            <li>Only customers with email addresses will receive updates</li>
            <li>All emails are logged and monitored</li>
          </ul>
        </div>
        <button
          onClick={handleBulkStatusUpdate}
          disabled={sendingBulk || !settings.email_notifications_enabled}
          className="btn btn-primary gap-2"
        >
          {sendingBulk ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Users className="w-4 h-4" />
          )}
          {sendingBulk ? 'Sending...' : 'Send Status Update to All Customers'}
        </button>
        {!settings.email_notifications_enabled && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ Email notifications must be enabled to use this feature
          </p>
        )}
        {bulkResult && (
          <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${bulkResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            {bulkResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className={`text-sm ${bulkResult.success ? 'text-green-800' : 'text-red-800'}`}>
              <p className="font-semibold">{bulkResult.message}</p>
              {bulkResult.success && bulkResult.emails_sent > 0 && (
                <p className="mt-1">
                  ✓ {bulkResult.emails_sent} email(s) sent successfully
                  {bulkResult.emails_failed > 0 && `, ${bulkResult.emails_failed} failed`}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Email Settings
        </button>
      </div>
    </div>
  );
}

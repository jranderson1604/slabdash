import { useState, useEffect } from 'react';
import { companies, psa } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Key,
  Bell,
  Palette,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { company, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPsa, setTestingPsa] = useState(false);
  const [psaStatus, setPsaStatus] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    psa_api_key: '',
    auto_refresh_enabled: true,
    auto_refresh_interval_hours: 6,
    email_notifications_enabled: true,
    primary_color: '#ef4444',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await companies.get();
      const data = res.data;
      setSettings({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
        psa_api_key: data.psa_api_key || '',
        auto_refresh_enabled: data.auto_refresh_enabled ?? true,
        auto_refresh_interval_hours: data.auto_refresh_interval_hours || 6,
        email_notifications_enabled: data.email_notifications_enabled ?? true,
        primary_color: data.primary_color || '#ef4444',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section) => {
    setSaving(true);
    try {
      await companies.update(settings);
      await refreshUser();
      alert('Settings saved!');
      // Force page reload to apply theme changes immediately
      if (section === 'branding') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPsa = async () => {
    if (!settings.psa_api_key) {
      alert('Please enter a PSA API key first');
      return;
    }

    setTestingPsa(true);
    setPsaStatus(null);
    
    // First save the API key
    try {
      await companies.update({ psa_api_key: settings.psa_api_key });
      await refreshUser();
    } catch (error) {
      setPsaStatus({ success: false, message: 'Failed to save API key' });
      setTestingPsa(false);
      return;
    }

    // Then test the connection
    try {
      const res = await psa.testConnection();
      setPsaStatus({ success: true, message: 'Connection successful!' });
    } catch (error) {
      setPsaStatus({
        success: false,
        message: error.response?.data?.error || 'Connection failed. Check your API key.',
      });
    } finally {
      setTestingPsa(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your SlabDash configuration</p>
      </div>

      {/* PSA API Settings */}
      <SettingsSection
        icon={Key}
        title="PSA API Integration"
        description="Connect your PSA account for automatic status updates"
      >
        <div className="space-y-4">
          <div>
            <label className="label">PSA API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={settings.psa_api_key}
                onChange={(e) => setSettings({ ...settings, psa_api_key: e.target.value })}
                className="input pr-20"
                placeholder="Enter your PSA API key"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Get your API key from{' '}
              <a
                href="https://www.psacard.com/myaccount/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                PSA's website
              </a>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestPsa}
              disabled={testingPsa || !settings.psa_api_key}
              className="btn btn-secondary gap-2"
            >
              {testingPsa ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Test Connection
            </button>

            {psaStatus && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  psaStatus.success ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {psaStatus.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {psaStatus.message}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Auto-refresh submissions</p>
                <p className="text-sm text-gray-500">
                  Automatically update submission statuses from PSA
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_refresh_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, auto_refresh_enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {settings.auto_refresh_enabled && (
              <div>
                <label className="label">Refresh Interval</label>
                <select
                  value={settings.auto_refresh_interval_hours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      auto_refresh_interval_hours: parseInt(e.target.value),
                    })
                  }
                  className="input w-auto"
                >
                  <option value={1}>Every hour</option>
                  <option value={3}>Every 3 hours</option>
                  <option value={6}>Every 6 hours</option>
                  <option value={12}>Every 12 hours</option>
                  <option value={24}>Once daily</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button onClick={() => handleSave('psa')} disabled={saving} className="btn btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save PSA Settings
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Shop Information */}
      <SettingsSection
        icon={SettingsIcon}
        title="Shop Information"
        description="Basic information about your card shop"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Shop Name</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Website</label>
              <input
                type="url"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="input"
                placeholder="https://"
              />
            </div>
          </div>

          <div className="pt-4">
            <button onClick={() => handleSave('shop')} disabled={saving} className="btn btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Shop Info
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        icon={Bell}
        title="Notifications"
        description="Configure how you receive updates"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Email notifications</p>
              <p className="text-sm text-gray-500">
                Receive email alerts for status changes and problems
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.email_notifications_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, email_notifications_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <div className="pt-4">
            <button onClick={() => handleSave('notifications')} disabled={saving} className="btn btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Notification Settings
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Branding */}
      <SettingsSection
        icon={Palette}
        title="Portal Branding"
        description="Customize the look of your customer portal"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="input w-32"
                placeholder="#ef4444"
              />
            </div>
          </div>

          <div className="pt-4">
            <button onClick={() => handleSave('branding')} disabled={saving} className="btn btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Branding
            </button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

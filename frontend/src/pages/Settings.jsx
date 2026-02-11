import { useState, useEffect } from 'react';
import { companies, psa, migration } from '../api/client';
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
  CreditCard,
  ExternalLink,
  Crown,
  DollarSign,
  Users,
  Database,
  Play,
  Plus,
  Trash2,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';
import axios from 'axios';

function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(255, 129, 112, 0.1)',
            border: '1px solid rgba(255, 129, 112, 0.12)',
          }}
        >
          <Icon className="w-5 h-5" style={{ color: '#E8543D' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--dark))' }}>{title}</h2>
          <p className="text-sm font-medium" style={{ color: 'rgba(44, 36, 22, 0.5)' }}>{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Settings() {
  const { company, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPsa, setTestingPsa] = useState(false);
  const [psaStatus, setPsaStatus] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [checkingMigration, setCheckingMigration] = useState(false);
  const [runningMigration, setRunningMigration] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    psa_api_key: '',
    auto_refresh_enabled: true,
    auto_refresh_interval_hours: 6,
    email_notifications_enabled: true,
    sms_notifications_enabled: false,
    push_notifications_enabled: false,
    buyback_response_hours: 24,
    csv_notification_threshold: 75,
    customer_limit: null,
    primary_color: '#ef4444',
    background_color: '#f5f5f5',
    sidebar_color: '#ffffff',
    service_level_pricing: {},
    tax_percentage: 0,
  });
  const [newServiceLevel, setNewServiceLevel] = useState('');

  useEffect(() => {
    loadSettings();
    loadSubscriptionStatus();
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      setCheckingMigration(true);
      const res = await migration.checkInvoiceStatus();
      setMigrationStatus(res.data);
    } catch (error) {
      console.error('Failed to check migration status:', error);
    } finally {
      setCheckingMigration(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('Run database migration? This will add columns for invoice generation, pickup code verification, and sport categorization.')) {
      return;
    }

    try {
      setRunningMigration(true);
      const res = await migration.runInvoiceMigration();
      setMigrationStatus({
        ...migrationStatus,
        migration_needed: false,
        checks: res.data.results?.map((r, i) => ({
          check: `Step ${i + 1}`,
          status: r,
          critical: true
        })) || []
      });
      alert('✓ Migration completed successfully!\n\n' + (res.data.results?.join('\n') || ''));
      // Refresh migration status
      await checkMigrationStatus();
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed: ' + (error.response?.data?.details || error.message));
    } finally {
      setRunningMigration(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await companies.get();
      const data = res.data;

      // Initialize with default service levels if empty
      let serviceLevelPricing = data.service_level_pricing || {};
      if (Object.keys(serviceLevelPricing).length === 0) {
        serviceLevelPricing = {
          'Value Bulk': null,
          'Vintage Bulk': null,
          'Value Plus': null,
          'Regular': null,
          'Standard': null,
          'Express': null,
          'Super Express': null,
          'Walk-Through': null,
          'Specialty': null,
          'Reholder': null,
          'Autograph Authentication': null,
          'TCG Bulk': null,
        };
      }

      setSettings({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
        psa_api_key: data.psa_api_key || '',
        auto_refresh_enabled: data.auto_refresh_enabled ?? true,
        auto_refresh_interval_hours: data.auto_refresh_interval_hours || 6,
        email_notifications_enabled: data.email_notifications_enabled ?? true,
        sms_notifications_enabled: data.sms_notifications_enabled ?? false,
        push_notifications_enabled: data.push_notifications_enabled ?? false,
        buyback_response_hours: data.buyback_response_hours || 24,
        csv_notification_threshold: data.csv_notification_threshold || 75,
        customer_limit: data.customer_limit || null,
        primary_color: data.primary_color || '#ef4444',
        background_color: data.background_color || '#f5f5f5',
        sidebar_color: data.sidebar_color || '#ffffff',
        logo_url: data.logo_url || data.company_logo_url || '',
        service_level_pricing: serviceLevelPricing,
        tax_percentage: data.tax_percentage || 0,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('slabdash_token');
      const res = await axios.get(`${API_URL}/subscriptions/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptionStatus(res.data);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const handleUpgrade = async (plan) => {
    setLoadingSubscription(true);
    try {
      const token = localStorage.getItem('slabdash_token');
      const res = await axios.post(`${API_URL}/subscriptions/create-checkout`,
        { plan },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      // Redirect to Stripe Checkout
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert('Failed to start upgrade process');
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const token = localStorage.getItem('slabdash_token');
      const res = await axios.post(`${API_URL}/subscriptions/create-portal`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );

      // Redirect to Stripe Customer Portal
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      alert('Failed to open subscription management');
    } finally {
      setLoadingSubscription(false);
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-8 shadow-xl">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg">SETTINGS</h1>
          <p className="text-white/90 text-lg font-semibold">Manage your SlabDash configuration</p>
        </div>
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

      {/* Service Level Pricing */}
      <SettingsSection
        icon={DollarSign}
        title="Service Level Pricing Presets"
        description="Set default prices for each PSA service level to speed up invoice generation"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Configure default prices for each service level. These will be available as quick-select presets when generating invoices.
          </p>

          {/* Existing Service Levels */}
          <div className="space-y-3">
            {Object.entries(settings.service_level_pricing || {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([level, price]) => (
                <div key={level} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 min-w-[180px]">{level}</span>
                      <div className="relative flex-1 max-w-xs">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={price || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettings({
                              ...settings,
                              service_level_pricing: {
                                ...settings.service_level_pricing,
                                [level]: val === '' ? null : parseFloat(val)
                              }
                            });
                          }}
                          className="input pl-8 py-2"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newPricing = { ...settings.service_level_pricing };
                      delete newPricing[level];
                      setSettings({
                        ...settings,
                        service_level_pricing: newPricing
                      });
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove service level"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>

          {/* Add New Service Level */}
          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add New Service Level</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Premium Authentication"
                value={newServiceLevel}
                onChange={(e) => setNewServiceLevel(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newServiceLevel.trim()) {
                    e.preventDefault();
                    if (!settings.service_level_pricing?.[newServiceLevel.trim()]) {
                      setSettings({
                        ...settings,
                        service_level_pricing: {
                          ...settings.service_level_pricing,
                          [newServiceLevel.trim()]: null
                        }
                      });
                      setNewServiceLevel('');
                    } else {
                      alert('This service level already exists');
                    }
                  }
                }}
                className="input flex-1"
              />
              <button
                onClick={() => {
                  if (newServiceLevel.trim()) {
                    if (!settings.service_level_pricing?.[newServiceLevel.trim()]) {
                      setSettings({
                        ...settings,
                        service_level_pricing: {
                          ...settings.service_level_pricing,
                          [newServiceLevel.trim()]: null
                        }
                      });
                      setNewServiceLevel('');
                    } else {
                      alert('This service level already exists');
                    }
                  }
                }}
                disabled={!newServiceLevel.trim()}
                className="btn btn-secondary gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Press Enter or click Add to create a new service level
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> When generating invoices, you'll see a dropdown to quickly select these preset prices instead of entering manually. You can still override with manual entry if needed.
            </p>
          </div>

          {/* Tax Percentage */}
          <div className="pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Sales Tax</h4>
            <p className="text-sm text-gray-600 mb-3">
              Set your state's sales tax percentage to automatically calculate tax on invoices.
            </p>
            <div className="max-w-xs">
              <label className="label">Tax Percentage</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                  value={settings.tax_percentage || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSettings({
                      ...settings,
                      tax_percentage: isNaN(val) ? 0 : val
                    });
                  }}
                  className="input pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Example: Enter 8.25 for 8.25% sales tax
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button onClick={() => handleSave('pricing')} disabled={saving} className="btn btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Pricing & Tax Settings
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Database Migration */}
      <SettingsSection
        icon={Database}
        title="Database Migration"
        description="Enable invoice generation, pickup codes, and sport categorization"
      >
        <div className="space-y-4">
          {checkingMigration ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking migration status...
            </div>
          ) : migrationStatus ? (
            <>
              {/* Status Summary */}
              <div className={`p-4 rounded-lg border-2 ${
                migrationStatus.migration_needed
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-start gap-3">
                  {migrationStatus.migration_needed ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${
                      migrationStatus.migration_needed ? 'text-yellow-900' : 'text-green-900'
                    }`}>
                      {migrationStatus.summary}
                    </p>
                    <p className={`text-sm mt-1 ${
                      migrationStatus.migration_needed ? 'text-yellow-700' : 'text-green-700'
                    }`}>
                      {migrationStatus.migration_needed
                        ? 'Run the migration to enable customer-specific pickup codes and invoice generation.'
                        : 'All features are enabled and working correctly!'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Feature Status:</p>
                {migrationStatus.checks?.map((check, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {check.status.includes('✓') ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className={check.status.includes('✓') ? 'text-gray-700' : 'text-gray-600'}>
                      {check.check}: {check.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={runMigration}
                  disabled={runningMigration || !migrationStatus.migration_needed}
                  className="btn btn-primary gap-2"
                >
                  {runningMigration ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Running Migration...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Migration
                    </>
                  )}
                </button>
                <button
                  onClick={checkMigrationStatus}
                  disabled={checkingMigration}
                  className="btn btn-secondary gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingMigration ? 'animate-spin' : ''}`} />
                  Refresh Status
                </button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>What this does:</strong> Adds database columns for invoice generation,
                  customer-specific pickup codes, and pickup status tracking. This is a safe operation
                  that only adds new columns - it won't modify or delete any existing data.
                </p>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">
              Unable to check migration status. Please try refreshing the page.
            </div>
          )}
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

      {/* Subscription & Billing */}
      <SettingsSection
        icon={CreditCard}
        title="Subscription & Billing"
        description="Manage your SlabDash subscription plan"
      >
        <div className="space-y-4">
          {/* Current Plan */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold text-gray-900">Current Plan</span>
              </div>
              <span className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium capitalize">
                {company?.plan || 'Free'}
              </span>
            </div>
            {subscriptionStatus?.subscription && (
              <p className="text-sm text-gray-600">
                Renews: {new Date(subscriptionStatus.subscription.current_period_end * 1000).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Upgrade Options */}
          {(!company?.plan || company.plan === 'free') && (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 hover:border-brand-500 transition-colors">
                <h4 className="font-semibold text-gray-900 mb-1">Starter</h4>
                <div className="text-2xl font-bold text-gray-900 mb-2">$29<span className="text-sm font-normal text-gray-500">/mo</span></div>
                <p className="text-xs text-gray-600 mb-3">Perfect for small shops</p>
                <button
                  onClick={() => handleUpgrade('starter')}
                  disabled={loadingSubscription}
                  className="w-full btn btn-secondary text-sm py-2"
                >
                  {loadingSubscription ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Upgrade'}
                </button>
              </div>

              <div className="border-2 border-brand-500 rounded-lg p-4 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-brand-600 text-white rounded-full text-xs font-medium">Most Popular</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Professional</h4>
                <div className="text-2xl font-bold text-gray-900 mb-2">$79<span className="text-sm font-normal text-gray-500">/mo</span></div>
                <p className="text-xs text-gray-600 mb-3">For growing businesses</p>
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={loadingSubscription}
                  className="w-full btn btn-primary text-sm py-2"
                >
                  {loadingSubscription ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Upgrade'}
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:border-brand-500 transition-colors">
                <h4 className="font-semibold text-gray-900 mb-1">Enterprise</h4>
                <div className="text-2xl font-bold text-gray-900 mb-2">$199<span className="text-sm font-normal text-gray-500">/mo</span></div>
                <p className="text-xs text-gray-600 mb-3">For large operations</p>
                <button
                  onClick={() => handleUpgrade('enterprise')}
                  disabled={loadingSubscription}
                  className="w-full btn btn-secondary text-sm py-2"
                >
                  {loadingSubscription ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Upgrade'}
                </button>
              </div>
            </div>
          )}

          {/* Manage Subscription (if active) */}
          {subscriptionStatus?.has_active_subscription && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleManageSubscription}
                disabled={loadingSubscription}
                className="btn btn-secondary gap-2"
              >
                {loadingSubscription ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Manage Subscription
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Update payment method, view invoices, or cancel subscription
              </p>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        icon={Bell}
        title="Notifications"
        description="Configure how you and your customers receive updates"
      >
        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Email notifications</p>
              <p className="text-sm text-gray-500">
                Receive email alerts for submission updates, grades ready, and problems
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

          {/* SMS Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">SMS notifications</p>
              <p className="text-sm text-gray-500">
                Send text message alerts to customers for buyback offers and urgent updates
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sms_notifications_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, sms_notifications_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Push notifications</p>
              <p className="text-sm text-gray-500">
                Send browser push notifications for real-time updates
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.push_notifications_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, push_notifications_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          {/* CSV Notification Threshold */}
          <div className="pt-4 border-t border-gray-200">
            <label className="label">CSV Ready Notification Threshold</label>
            <select
              value={settings.csv_notification_threshold}
              onChange={(e) =>
                setSettings({ ...settings, csv_notification_threshold: parseInt(e.target.value) })
              }
              className="input w-full sm:w-auto"
            >
              <option value={50}>50% progress (early alert)</option>
              <option value={60}>60% progress</option>
              <option value={70}>70% progress</option>
              <option value={75}>75% progress (recommended)</option>
              <option value={80}>80% progress</option>
              <option value={90}>90% progress (late alert)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Get notified when submission progress reaches this percentage. CSV files are typically available around 75-80% progress.
            </p>
          </div>

          <div className="pt-4">
            <button onClick={() => handleSave('notifications')} disabled={saving} className="btn btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Notification Settings
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Buyback Settings */}
      <SettingsSection
        icon={DollarSign}
        title="Buyback Offers"
        description="Configure buyback offer behavior and response times"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Customer Response Time</label>
            <select
              value={settings.buyback_response_hours}
              onChange={(e) =>
                setSettings({ ...settings, buyback_response_hours: parseInt(e.target.value) })
              }
              className="input w-full sm:w-auto"
            >
              <option value={24}>24 hours (1 day)</option>
              <option value={48}>48 hours (2 days)</option>
              <option value={72}>72 hours (3 days)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How long customers have to respond to buyback offers before they expire
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>How Buyback Works:</strong> When you make a buyback offer on a card, the customer receives a notification via email, SMS, or push (based on your settings above). They have the specified time to accept or decline before the offer expires.
            </p>
          </div>

          <div className="pt-4">
            <button onClick={() => handleSave('buyback')} disabled={saving} className="btn btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Buyback Settings
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Customer Limits */}
      {company?.plan && company.plan !== 'free' && (
        <SettingsSection
          icon={Users}
          title="Customer Limits"
          description="Manage customer account limits for your subscription tier"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Current Limit</p>
                  <p className="text-sm text-gray-500">
                    {settings.customer_limit ? `${settings.customer_limit} customers` : 'Unlimited customers'}
                  </p>
                </div>
                {company?.plan === 'enterprise' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Unlimited
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Customer limits help you manage your subscription costs. Enterprise and Badger Breaks accounts have unlimited customers.
            </p>
          </div>
        </SettingsSection>
      )}

      {/* Branding */}
      <SettingsSection
        icon={Palette}
        title="Portal Branding"
        description="Customize the look of your customer portal"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Primary Color (Buttons & Links)</label>
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
                placeholder="#8842f0"
              />
            </div>
          </div>

          <div>
            <label className="label">Background Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.background_color}
                onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={settings.background_color}
                onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                className="input w-32"
                placeholder="#f5f5f5"
              />
            </div>
          </div>

          <div>
            <label className="label">Sidebar Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.sidebar_color}
                onChange={(e) => setSettings({ ...settings, sidebar_color: e.target.value })}
                className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={settings.sidebar_color}
                onChange={(e) => setSettings({ ...settings, sidebar_color: e.target.value })}
                className="input w-32"
                placeholder="#ffffff"
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

      {/* Portal QR Code */}
      {company?.slug && (
        <PortalQRCode
          slug={company.slug}
          shopName={settings.name}
          logoUrl={settings.logo_url}
          primaryColor={settings.primary_color}
        />
      )}
    </div>
  );
}

// ============================================
// Portal QR Code — printable card with shop branding
// ============================================
function PortalQRCode({ slug, shopName, logoUrl, primaryColor }) {
  const printRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const portalUrl = `${window.location.origin}/portal?shop=${encodeURIComponent(slug)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = portalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${shopName} - Portal QR Code</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: 4in 6in; margin: 0; }
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
          }
          .card {
            width: 3.5in;
            padding: 0.4in 0.3in;
            text-align: center;
            border: 2px solid ${primaryColor || '#ef4444'};
            border-radius: 16px;
          }
          .logo { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; margin: 0 auto 12px; }
          .shop-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #111; }
          .subtitle { font-size: 11px; color: #666; margin-bottom: 16px; letter-spacing: 0.5px; text-transform: uppercase; }
          .qr-wrap { display: inline-block; padding: 12px; background: white; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 16px; }
          .scan-text { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px; }
          .url-text { font-size: 10px; color: #999; word-break: break-all; }
          .powered { font-size: 8px; color: #ccc; margin-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="" />` : ''}
          <div class="shop-name">${shopName || slug}</div>
          <div class="subtitle">Customer Portal</div>
          <div class="qr-wrap">
            ${printContent.querySelector('.qr-container').innerHTML}
          </div>
          <div class="scan-text">Scan to check your order status</div>
          <div class="url-text">${portalUrl}</div>
          <div class="powered">Powered by SlabDash</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleDownload = () => {
    const svgEl = printRef.current?.querySelector('.qr-container svg');
    if (!svgEl) return;

    // Create a canvas with the full card design
    const canvas = document.createElement('canvas');
    const scale = 3; // 3x for high-res
    const w = 400;
    const h = 550;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 16);
    ctx.fill();

    // Border
    ctx.strokeStyle = primaryColor || '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(1.5, 1.5, w - 3, h - 3, 16);
    ctx.stroke();

    // Shop name
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(shopName || slug, w / 2, 50);

    // Subtitle
    ctx.fillStyle = '#666666';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('CUSTOMER PORTAL', w / 2, 70);

    // QR code
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const qrSize = 220;
      const qrX = (w - qrSize) / 2;
      const qrY = 90;

      // QR background
      ctx.fillStyle = '#f9fafb';
      ctx.beginPath();
      ctx.roundRect(qrX - 16, qrY - 12, qrSize + 32, qrSize + 24, 12);
      ctx.fill();
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      URL.revokeObjectURL(url);

      // "Scan" text
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Scan to check your order status', w / 2, qrY + qrSize + 50);

      // URL
      ctx.fillStyle = '#999999';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(portalUrl, w / 2, qrY + qrSize + 72);

      // Powered by
      ctx.fillStyle = '#cccccc';
      ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Powered by SlabDash', w / 2, h - 20);

      // Download
      const link = document.createElement('a');
      link.download = `${slug}-portal-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  };

  return (
    <SettingsSection
      icon={QrCode}
      title="Portal QR Code"
      description="Print or share this QR code so customers can access their portal"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Preview card */}
        <div ref={printRef} className="flex-shrink-0">
          <div
            className="w-[280px] mx-auto lg:mx-0 rounded-2xl border-2 p-6 text-center bg-white"
            style={{ borderColor: primaryColor || '#ef4444' }}
          >
            {logoUrl && (
              <img src={logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover mx-auto mb-3" />
            )}
            <h3 className="text-lg font-bold text-gray-900">{shopName || slug}</h3>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-4">Customer Portal</p>
            <div className="qr-container inline-block p-3 bg-gray-50 rounded-xl border border-gray-200">
              <QRCodeSVG
                value={portalUrl}
                size={180}
                level="H"
                includeMargin={false}
                fgColor="#111111"
                bgColor="transparent"
              />
            </div>
            <p className="text-sm font-semibold text-gray-700 mt-4">Scan to check your order status</p>
            <p className="text-[9px] text-gray-400 mt-1 break-all">{portalUrl}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-1 space-y-4">
          <div>
            <label className="label">Portal Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={portalUrl}
                className="input flex-1 text-sm bg-gray-50"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={handleCopyLink}
                className="btn btn-secondary gap-2 whitespace-nowrap"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Share this link or the QR code with your customers. It takes them directly to your shop's login page.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={handlePrint} className="btn btn-primary gap-2">
              <Printer className="w-4 h-4" />
              Print Card
            </button>
            <button onClick={handleDownload} className="btn btn-secondary gap-2">
              <Download className="w-4 h-4" />
              Download PNG
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium mb-1">Tips for printing</p>
            <ul className="list-disc list-inside text-xs space-y-1 text-amber-700">
              <li>Print on cardstock for a counter display card</li>
              <li>Works great as a 4x6 card or sticker</li>
              <li>Add your logo in Shop Information above to include it on the card</li>
              <li>Customers scan the code, enter their email and password, and see their orders</li>
            </ul>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}

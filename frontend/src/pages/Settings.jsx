import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { companies, psa, migration } from '../api/client';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Settings as SettingsIcon,
  Key,
  Bell,

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
  Bot,
  Lock,
  Link2,
  Activity,
  X,
  AlertTriangle,
  Globe,
  ClipboardList,
  Filter,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';
import axios from 'axios';

const TABS = [
  { id: 'psa',           label: 'PSA & AI',       icon: Key },
  { id: 'pricing',       label: 'Pricing',         icon: DollarSign },
  { id: 'account',       label: 'Account',         icon: SettingsIcon },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
  { id: 'billing',       label: 'Billing & Portal',icon: CreditCard },
  { id: 'webhooks',      label: 'Webhooks',         icon: Link2 },
  { id: 'audit',         label: 'Audit Log',        icon: Activity },
];

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
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Settings() {
  const { company, refreshUser } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('psa');

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
    service_level_pricing: {},
    tax_percentage: 0,
  });
  const [newServiceLevel, setNewServiceLevel] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const pwMatch = pwForm.confirm.length > 0 && pwForm.next === pwForm.confirm;
  const pwMismatch = pwForm.confirm.length > 0 && pwForm.next !== pwForm.confirm;
  const pwValid = pwForm.next.length >= 8 && /[a-zA-Z]/.test(pwForm.next) && /[0-9]/.test(pwForm.next);

  // Sync tab from URL param
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TABS.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
      toast.success('Migration completed successfully!');
      await checkMigrationStatus();
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Migration failed: ' + (error.response?.data?.details || error.message));
    } finally {
      setRunningMigration(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await companies.get();
      const data = res.data;

      let serviceLevelPricing = data.service_level_pricing || {};
      if (Object.keys(serviceLevelPricing).length === 0) {
        serviceLevelPricing = {
          'Value Bulk': null, 'Vintage Bulk': null, 'Value Plus': null,
          'Regular': null, 'Standard': null, 'Express': null,
          'Super Express': null, 'Walk-Through': null, 'Specialty': null,
          'Reholder': null, 'Autograph Authentication': null, 'TCG Bulk': null,
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
        logo_url: data.logo_url || data.company_logo_url || '',
        service_level_pricing: serviceLevelPricing,
        tax_percentage: data.tax_percentage || 0,
        sam_enabled: data.sam_enabled ?? true,
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
      if (res.data.url) window.location.href = res.data.url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast.error('Failed to start upgrade process');
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
      if (res.data.url) window.location.href = res.data.url;
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      toast.error('Failed to open subscription management');
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleSave = async (section) => {
    setSaving(true);
    try {
      await companies.update(settings);
      await refreshUser();
      toast.success('Settings saved!');
      if (section === 'branding') window.location.reload();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      toast.error('All password fields are required');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (!pwValid) {
      toast.error('Password must be at least 8 characters with a letter and number');
      return;
    }
    setPwSaving(true);
    try {
      const token = localStorage.getItem('slabdash_token');
      await axios.post(`${API_URL}/auth/change-password`,
        { currentPassword: pwForm.current, newPassword: pwForm.next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Password changed successfully!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleTestPsa = async () => {
    if (!settings.psa_api_key) {
      toast.error('Please enter a PSA API key first');
      return;
    }
    setTestingPsa(true);
    setPsaStatus(null);
    try {
      await companies.update({ psa_api_key: settings.psa_api_key });
      await refreshUser();
    } catch (error) {
      setPsaStatus({ success: false, message: 'Failed to save API key' });
      setTestingPsa(false);
      return;
    }
    try {
      await psa.testConnection();
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
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg">SETTINGS</h1>
          <p className="text-white/90 text-lg font-semibold">Manage your SlabDash configuration</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.4)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all"
              style={isActive ? {
                background: 'linear-gradient(135deg, rgb(var(--brand-500)), rgb(var(--brand-600)))',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(255,107,89,0.3)',
              } : {
                color: 'var(--text-secondary)',
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── PSA & AI tab ── */}
      {activeTab === 'psa' && (
        <div className="space-y-6">
          {/* PSA API */}
          <SettingsSection icon={Key} title="PSA API Integration" description="Connect your PSA account for automatic status updates">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">PSA API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.psa_api_key}
                    onChange={(e) => setSettings({ ...settings, psa_api_key: e.target.value })}
                    className="input pr-12"
                    style={{ border: '1.5px solid #d1d5db', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08), inset 0 1px 2px rgba(0,0,0,0.04)' }}
                    placeholder="Enter your PSA API key"
                  />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors">
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Get your API key from{' '}
                  <a href="https://www.psacard.com/myaccount/api" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline font-medium">
                    PSA's website
                  </a>
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={handleTestPsa} disabled={testingPsa || !settings.psa_api_key}
                  className="btn gap-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#fff', border: '1.5px solid #d1d5db', color: '#374151', padding: '0.5rem 1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
                  {testingPsa ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Test Connection
                </button>
                {psaStatus && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${psaStatus.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {psaStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                    {psaStatus.message}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Auto-refresh submissions</p>
                    <p className="text-sm text-gray-500 mt-0.5">Automatically update submission statuses from PSA</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={settings.auto_refresh_enabled}
                      onChange={(e) => setSettings({ ...settings, auto_refresh_enabled: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
                  </label>
                </div>
                {settings.auto_refresh_enabled && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Refresh Interval</label>
                    <select value={settings.auto_refresh_interval_hours}
                      onChange={(e) => setSettings({ ...settings, auto_refresh_interval_hours: parseInt(e.target.value) })}
                      className="input w-auto" style={{ border: '1.5px solid #d1d5db', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                      <option value={1}>Every hour</option>
                      <option value={3}>Every 3 hours</option>
                      <option value={6}>Every 6 hours</option>
                      <option value={12}>Every 12 hours</option>
                      <option value={24}>Once daily</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="pt-2">
                <button onClick={() => handleSave('psa')} disabled={saving} className="btn btn-primary gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save PSA Settings
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* SAM AI */}
          <SettingsSection icon={Bot} title="SAM AI Assistant" description="Enable or disable SAM AI for your customer portal">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Enable SAM in Customer Portal</p>
                  <p className="text-sm text-gray-500">When enabled, customers can chat with SAM AI to ask questions about their submissions, cards, and grading status.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.sam_enabled ?? true}
                    onChange={(e) => setSettings({ ...settings, sam_enabled: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
                </label>
              </div>
              <div className="pt-4">
                <button onClick={() => handleSave('sam')} disabled={saving} className="btn btn-primary gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save SAM Settings
                </button>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {/* ── Pricing tab ── */}
      {activeTab === 'pricing' && (
        <SettingsSection icon={DollarSign} title="Service Level Pricing Presets" description="Set default prices for each PSA service level to speed up invoice generation">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Configure default prices for each service level. These will be available as quick-select presets when generating invoices.
            </p>
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
                          <input type="number" step="0.01" min="0" placeholder="0.00" value={price || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettings({ ...settings, service_level_pricing: { ...settings.service_level_pricing, [level]: val === '' ? null : parseFloat(val) } });
                            }}
                            className="input pl-8 py-2" />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => {
                      const newPricing = { ...settings.service_level_pricing };
                      delete newPricing[level];
                      setSettings({ ...settings, service_level_pricing: newPricing });
                    }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove service level">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add New Service Level</label>
              <div className="flex gap-2">
                <input type="text" placeholder="e.g., Premium Authentication" value={newServiceLevel}
                  onChange={(e) => setNewServiceLevel(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newServiceLevel.trim()) {
                      e.preventDefault();
                      if (!settings.service_level_pricing?.[newServiceLevel.trim()]) {
                        setSettings({ ...settings, service_level_pricing: { ...settings.service_level_pricing, [newServiceLevel.trim()]: null } });
                        setNewServiceLevel('');
                      } else {
                        toast.error('This service level already exists');
                      }
                    }
                  }}
                  className="input flex-1" />
                <button onClick={() => {
                  if (newServiceLevel.trim()) {
                    if (!settings.service_level_pricing?.[newServiceLevel.trim()]) {
                      setSettings({ ...settings, service_level_pricing: { ...settings.service_level_pricing, [newServiceLevel.trim()]: null } });
                      setNewServiceLevel('');
                    } else {
                      toast.error('This service level already exists');
                    }
                  }
                }} disabled={!newServiceLevel.trim()} className="btn btn-secondary gap-2">
                  <Plus className="w-4 h-4" />Add
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Press Enter or click Add to create a new service level</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                <strong>How it works:</strong> When generating invoices, you'll see a dropdown to quickly select these preset prices instead of entering manually. You can still override with manual entry if needed.
              </p>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Sales Tax</h4>
              <p className="text-sm text-gray-600 mb-3">Set your state's sales tax percentage to automatically calculate tax on invoices.</p>
              <div className="max-w-xs">
                <label className="label">Tax Percentage</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0" max="100" placeholder="0.00"
                    value={settings.tax_percentage || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSettings({ ...settings, tax_percentage: isNaN(val) ? 0 : val });
                    }}
                    className="input pr-10" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Example: Enter 8.25 for 8.25% sales tax</p>
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
      )}

      {/* ── Account tab ── */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Shop Info */}
          <SettingsSection icon={SettingsIcon} title="Shop Information" description="Basic information about your card shop">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Shop Name</label>
                  <input type="text" value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input type="url" value={settings.website}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    className="input" placeholder="https://" />
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

          {/* Change Password */}
          <SettingsSection icon={Lock} title="Change Password" description="Update your account password">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <input type={showPw.current ? 'text' : 'password'} value={pwForm.current}
                    onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                    className="input pr-12" placeholder="Your current password" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showPw.next ? 'text' : 'password'} value={pwForm.next}
                    onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
                    className={`input pr-12 ${pwForm.next.length > 0 && !pwValid ? 'border-red-300' : pwForm.next.length > 0 && pwValid ? 'border-green-400' : ''}`}
                    placeholder="New password" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw(s => ({ ...s, next: !s.next }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwForm.next.length > 0 && !pwValid && (
                  <p className="text-xs text-red-500 mt-1">Min 8 characters, at least one letter and one number</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input type={showPw.confirm ? 'text' : 'password'} value={pwForm.confirm}
                    onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                    className={`input pr-12 ${pwMismatch ? 'border-red-300' : pwMatch ? 'border-green-400' : ''}`}
                    placeholder="Repeat new password" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwMismatch && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
                {pwMatch && pwValid && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>
              <div className="pt-2">
                <button onClick={handleChangePassword} disabled={pwSaving || !pwForm.current || !pwValid || !pwMatch}
                  className="btn btn-primary gap-2">
                  {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Change Password
                </button>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {/* ── Notifications tab ── */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <SettingsSection icon={Bell} title="Notifications" description="Configure how you and your customers receive updates">
            <div className="space-y-6">
              {[
                { key: 'email_notifications_enabled', label: 'Email notifications', desc: 'Receive email alerts for submission updates, grades ready, and problems' },
                { key: 'sms_notifications_enabled', label: 'SMS notifications', desc: 'Send text message alerts to customers for buyback offers and urgent updates' },
                { key: 'push_notifications_enabled', label: 'Push notifications', desc: 'Send browser push notifications for real-time updates' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings[key]}
                      onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
                  </label>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200">
                <label className="label">CSV Ready Notification Threshold</label>
                <select value={settings.csv_notification_threshold}
                  onChange={(e) => setSettings({ ...settings, csv_notification_threshold: parseInt(e.target.value) })}
                  className="input w-full sm:w-auto">
                  <option value={50}>50% progress (early alert)</option>
                  <option value={60}>60% progress</option>
                  <option value={70}>70% progress</option>
                  <option value={75}>75% progress (recommended)</option>
                  <option value={80}>80% progress</option>
                  <option value={90}>90% progress (late alert)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Get notified when submission progress reaches this percentage.
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

          <SettingsSection icon={DollarSign} title="Buyback Offers" description="Configure buyback offer behavior and response times">
            <div className="space-y-4">
              <div>
                <label className="label">Customer Response Time</label>
                <select value={settings.buyback_response_hours}
                  onChange={(e) => setSettings({ ...settings, buyback_response_hours: parseInt(e.target.value) })}
                  className="input w-full sm:w-auto">
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
                  <strong>How Buyback Works:</strong> When you make a buyback offer on a card, the customer receives a notification. They have the specified time to accept or decline before the offer expires.
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
        </div>
      )}

      {/* ── Billing & Portal tab ── */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Subscription */}
          <SettingsSection icon={CreditCard} title="Subscription & Billing" description="Manage your SlabDash subscription plan">
            <div className="space-y-4">
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

              {(!company?.plan || company.plan === 'free') && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border-2 border-brand-500 rounded-lg p-4 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-brand-600 text-white rounded-full text-xs font-medium">Most Popular</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">Shop</h4>
                    <div className="text-2xl font-bold text-gray-900 mb-2">$99<span className="text-sm font-medium text-gray-500">/mo</span></div>
                    <p className="text-xs text-gray-600 mb-3">500 cards/mo &middot; 200 customers</p>
                    <button onClick={() => handleUpgrade('shop')} disabled={loadingSubscription}
                      className="w-full btn btn-primary text-sm py-2">
                      {loadingSubscription ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Upgrade'}
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-brand-500 transition-colors">
                    <h4 className="font-semibold text-gray-900 mb-1">Enterprise</h4>
                    <div className="text-2xl font-bold text-gray-900 mb-2">$249<span className="text-sm font-medium text-gray-500">/mo</span></div>
                    <p className="text-xs text-gray-600 mb-3">Unlimited &middot; Multi-location &middot; API</p>
                    <button onClick={() => handleUpgrade('enterprise')} disabled={loadingSubscription}
                      className="w-full btn btn-secondary text-sm py-2">
                      {loadingSubscription ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Upgrade'}
                    </button>
                  </div>
                </div>
              )}

              {subscriptionStatus?.has_active_subscription && (
                <div className="pt-4 border-t border-gray-200">
                  <button onClick={handleManageSubscription} disabled={loadingSubscription}
                    className="btn btn-secondary gap-2">
                    {loadingSubscription ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    Manage Subscription
                  </button>
                  <p className="text-xs text-gray-500 mt-2">Update payment method, view invoices, or cancel subscription</p>
                </div>
              )}
            </div>
          </SettingsSection>

          {/* Customer Limits — only for paid plans */}
          {company?.plan && company.plan !== 'free' && (
            <SettingsSection icon={Users} title="Customer Limits" description="Manage customer account limits for your subscription tier">
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
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Unlimited</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">Enterprise accounts have unlimited customers.</p>
              </div>
            </SettingsSection>
          )}

          {/* Portal QR Code */}
          {(company?.shop_code || company?.slug) && (
            <PortalQRCode
              shopCode={company.shop_code}
              slug={company.slug}
              shopName={settings.name}
              logoUrl={settings.logo_url}
            />
          )}

          {/* Database Migration */}
          <SettingsSection icon={Database} title="Database Migration" description="Enable invoice generation, pickup codes, and sport categorization">
            <div className="space-y-4">
              {checkingMigration ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking migration status...
                </div>
              ) : migrationStatus ? (
                <>
                  <div className={`p-4 rounded-lg border-2 ${migrationStatus.migration_needed ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-start gap-3">
                      {migrationStatus.migration_needed
                        ? <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        : <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <p className={`font-semibold ${migrationStatus.migration_needed ? 'text-yellow-900' : 'text-green-900'}`}>
                          {migrationStatus.summary}
                        </p>
                        <p className={`text-sm mt-1 ${migrationStatus.migration_needed ? 'text-yellow-700' : 'text-green-700'}`}>
                          {migrationStatus.migration_needed
                            ? 'Run the migration to enable customer-specific pickup codes and invoice generation.'
                            : 'All features are enabled and working correctly!'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Feature Status:</p>
                    {migrationStatus.checks?.map((check, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {check.status.includes('✓')
                          ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                          : <AlertCircle className="w-4 h-4 text-yellow-600" />}
                        <span className={check.status.includes('✓') ? 'text-gray-700' : 'text-gray-600'}>
                          {check.check}: {check.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={runMigration} disabled={runningMigration || !migrationStatus.migration_needed}
                      className="btn btn-primary gap-2">
                      {runningMigration ? <><Loader2 className="w-4 h-4 animate-spin" />Running Migration...</> : <><Play className="w-4 h-4" />Run Migration</>}
                    </button>
                    <button onClick={checkMigrationStatus} disabled={checkingMigration} className="btn btn-secondary gap-2">
                      <RefreshCw className={`w-4 h-4 ${checkingMigration ? 'animate-spin' : ''}`} />
                      Refresh Status
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>What this does:</strong> Adds database columns for invoice generation, customer-specific pickup codes, and pickup status tracking. This is a safe operation that only adds new columns — it won't modify or delete any existing data.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">Unable to check migration status. Please try refreshing the page.</div>
              )}
            </div>
          </SettingsSection>
        </div>
      )}

      {/* ── Webhooks tab ── */}
      {activeTab === 'webhooks' && (
        <WebhooksTab />
      )}

      {/* ── Audit Log tab ── */}
      {activeTab === 'audit' && (
        <AuditTab />
      )}
    </div>
  );
}

// ============================================
// Webhooks management
// ============================================
function WebhooksTab() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState(['*']);
  const [showForm, setShowForm] = useState(false);
  const [newSecret, setNewSecret] = useState(null);

  const EVENTS = [
    { value: '*', label: 'All events' },
    { value: 'submission.grades_ready', label: 'Grades ready' },
    { value: 'submission.shipped', label: 'Submission shipped' },
    { value: 'submission.problem', label: 'Problem order flagged' },
    { value: 'submission.step_changed', label: 'Step changed' },
    { value: 'customer.created', label: 'Customer created' },
    { value: 'card.graded', label: 'Card graded' },
  ];

  const load = async () => {
    try {
      const r = await api.get('/webhooks');
      setWebhooks(r.data.webhooks || []);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newUrl) return;
    setCreating(true);
    try {
      const r = await api.post('/webhooks', { url: newUrl, events: newEvents });
      setNewSecret(r.data.webhook.secret);
      setWebhooks(prev => [r.data.webhook, ...prev]);
      setNewUrl('');
      setNewEvents(['*']);
      setShowForm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create webhook');
    }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this webhook?')) return;
    await api.delete(`/webhooks/${id}`);
    setWebhooks(prev => prev.filter(w => w.id !== id));
  };

  const handleToggle = async (wh) => {
    await api.patch(`/webhooks/${wh.id}`, { enabled: !wh.enabled });
    setWebhooks(prev => prev.map(w => w.id === wh.id ? { ...w, enabled: !w.enabled } : w));
  };

  const handleTest = async (id) => {
    try {
      await api.post(`/webhooks/${id}/test`);
      alert('Test ping sent!');
    } catch (err) {
      alert(err.response?.data?.error || 'Test failed');
    }
  };

  return (
    <SettingsSection icon={Link2} title="Outbound Webhooks" description="POST events to your own endpoints when things happen in SlabDash">
      <div className="space-y-4">
        {newSecret && (
          <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50">
            <p className="font-bold text-green-800 mb-1">Webhook created — save your secret now</p>
            <p className="text-xs text-green-700 mb-2">This secret is shown only once. Use it to verify the <code>X-SlabDash-Signature</code> header.</p>
            <code className="text-xs font-mono bg-white px-3 py-2 rounded-lg border block break-all">{newSecret}</code>
            <button className="mt-2 text-xs text-green-700 underline" onClick={() => setNewSecret(null)}>Dismiss</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : webhooks.length === 0 && !showForm ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold mb-3">No webhooks configured</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map(wh => (
              <div key={wh.id} className="flex items-start justify-between p-4 rounded-xl"
                style={{ background: 'rgba(44,36,22,0.03)', border: '1px solid rgba(44,36,22,0.08)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wh.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <code className="text-sm font-mono truncate" style={{ color: 'rgb(var(--dark))' }}>{wh.url}</code>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(wh.events || []).map(e => (
                      <span key={e} className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(255,129,112,0.1)', color: '#C74430' }}>{e}</span>
                    ))}
                  </div>
                  {wh.last_fired_at && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      Last fired: {new Date(wh.last_fired_at).toLocaleString()}
                      {wh.last_status && ` · HTTP ${wh.last_status}`}
                      {wh.error_count > 0 && ` · ${wh.error_count} errors`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <button onClick={() => handleTest(wh.id)}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>Test</button>
                  <button onClick={() => handleToggle(wh)}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                    style={{ background: wh.enabled ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                             color: wh.enabled ? '#dc2626' : '#059669' }}>
                    {wh.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => handleDelete(wh.id)}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <div className="space-y-3 p-4 rounded-xl" style={{ background: 'rgba(44,36,22,0.03)', border: '1px solid rgba(44,36,22,0.1)' }}>
            <div>
              <label className="label">Endpoint URL</label>
              <input className="input w-full" placeholder="https://example.com/hooks/slabdash"
                value={newUrl} onChange={e => setNewUrl(e.target.value)} />
            </div>
            <div>
              <label className="label">Events</label>
              <div className="flex flex-wrap gap-2">
                {EVENTS.map(ev => (
                  <label key={ev.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={newEvents.includes(ev.value)}
                      onChange={e => {
                        if (ev.value === '*') { setNewEvents(['*']); return; }
                        setNewEvents(prev =>
                          e.target.checked
                            ? [...prev.filter(x => x !== '*'), ev.value]
                            : prev.filter(x => x !== ev.value)
                        );
                      }} />
                    {ev.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating || !newUrl} className="btn btn-primary gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="btn btn-secondary gap-2">
            <Plus className="w-4 h-4" /> Add Webhook
          </button>
        )}
      </div>
    </SettingsSection>
  );
}

// ============================================
// Audit log viewer
// ============================================
function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 30;

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const r = await api.get(`/audit?page=${p}&limit=${LIMIT}`);
      setLogs(r.data.logs || []);
      setTotal(r.data.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(page); }, [page]);

  const ACTION_COLORS = {
    created: '#10b981', updated: '#3b82f6', deleted: '#ef4444',
    exported: '#8b5cf6', sent: '#f59e0b',
  };

  const fmt = (ts) => new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <SettingsSection icon={Activity} title="Audit Log" description="History of actions performed by your team">
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm py-4" style={{ color: 'var(--text-muted)' }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No audit entries yet</p>
            <p className="text-xs mt-1">Actions like creating customers, updating submissions, and sending emails will be logged here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(44,36,22,0.08)' }}>
                    {['When', 'User', 'Action', 'Entity', 'Details'].map(h => (
                      <th key={h} className="text-left py-2 pr-3 text-xs font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(44,36,22,0.04)' }}>
                      <td className="py-2 pr-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{fmt(log.created_at)}</td>
                      <td className="py-2 pr-3 font-medium" style={{ color: 'rgb(var(--dark))' }}>{log.user_name || '—'}</td>
                      <td className="py-2 pr-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: `${ACTION_COLORS[log.action] || '#6b7280'}18`, color: ACTION_COLORS[log.action] || '#6b7280' }}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}
                      </td>
                      <td className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {log.details ? JSON.stringify(log.details).slice(0, 60) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary text-xs py-1.5">Prev</button>
                  <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="btn btn-secondary text-xs py-1.5">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SettingsSection>
  );
}

// ============================================
// Portal QR Code — printable card with shop branding
// ============================================
function PortalQRCode({ shopCode, slug, shopName, logoUrl }) {
  const printRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const portalUrl = `${window.location.origin}/portal?shop=${encodeURIComponent(shopCode || slug)}`;
  const displayCode = shopCode || slug;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
          body { display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; }
          .card { width: 3.5in; padding: 0.4in 0.3in; text-align: center; border: 2px solid #FF8170; border-radius: 16px; }
          .logo { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; margin: 0 auto 12px; }
          .shop-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #111; }
          .subtitle { font-size: 11px; color: #666; margin-bottom: 16px; letter-spacing: 0.5px; text-transform: uppercase; }
          .qr-wrap { display: inline-block; padding: 12px; background: white; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 12px; }
          .shop-code { font-size: 28px; font-weight: 800; letter-spacing: 8px; color: #111; margin-bottom: 4px; }
          .code-label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
          .scan-text { font-size: 13px; font-weight: 600; color: #333; margin-bottom: 4px; }
          .powered { font-size: 8px; color: #ccc; margin-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="" />` : ''}
          <div class="shop-name">${shopName || slug}</div>
          <div class="subtitle">Customer Portal</div>
          <div class="qr-wrap">${printContent.querySelector('.qr-container').innerHTML}</div>
          <div class="shop-code">${displayCode}</div>
          <div class="code-label">Shop Code</div>
          <div class="scan-text">Scan QR or enter code to get started</div>
          <div class="powered">Powered by SlabDash</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const handleDownload = () => {
    const svgEl = printRef.current?.querySelector('.qr-container svg');
    if (!svgEl) return;

    const canvas = document.createElement('canvas');
    const scale = 3;
    const w = 400, h = 580;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 16);
    ctx.fill();

    ctx.strokeStyle = '#FF8170';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(1.5, 1.5, w - 3, h - 3, 16);
    ctx.stroke();

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(shopName || slug, w / 2, 50);

    ctx.fillStyle = '#666666';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('CUSTOMER PORTAL', w / 2, 70);

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const qrSize = 220, qrX = (w - qrSize) / 2, qrY = 90;
      ctx.fillStyle = '#f9fafb';
      ctx.beginPath();
      ctx.roundRect(qrX - 16, qrY - 12, qrSize + 32, qrSize + 24, 12);
      ctx.fill();
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      URL.revokeObjectURL(url);

      ctx.fillStyle = '#111111';
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.letterSpacing = '8px';
      ctx.fillText(displayCode.split('').join('  '), w / 2, qrY + qrSize + 48);

      ctx.fillStyle = '#999999';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('SHOP CODE', w / 2, qrY + qrSize + 65);

      ctx.fillStyle = '#333333';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Scan QR or enter code to get started', w / 2, qrY + qrSize + 90);

      ctx.fillStyle = '#cccccc';
      ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Powered by SlabDash', w / 2, h - 20);

      const link = document.createElement('a');
      link.download = `${shopName || slug}-portal-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  };

  return (
    <SettingsSection icon={QrCode} title="Portal QR Code" description="Print or share this QR code so customers can access their portal">
      <div className="flex flex-col lg:flex-row gap-6">
        <div ref={printRef} className="flex-shrink-0">
          <div className="w-[280px] mx-auto lg:mx-0 rounded-2xl border-2 p-6 text-center bg-white"
            style={{ borderColor: '#FF8170' }}>
            {logoUrl && <img src={logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover mx-auto mb-3" />}
            <h3 className="text-lg font-bold text-gray-900">{shopName || slug}</h3>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-4">Customer Portal</p>
            <div className="qr-container inline-block p-3 bg-gray-50 rounded-xl border border-gray-200">
              <QRCodeSVG value={portalUrl} size={180} level="H" includeMargin={false} fgColor="#111111" bgColor="transparent" />
            </div>
            <p className="text-2xl font-black text-gray-900 mt-4 tracking-[6px]">{displayCode}</p>
            <p className="text-[9px] uppercase tracking-wider text-gray-500 mt-0.5 mb-2">Shop Code</p>
            <p className="text-xs font-semibold text-gray-600">Scan QR or enter code to get started</p>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {shopCode && (
            <div>
              <label className="label">Shop Code</label>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black tracking-[8px] text-gray-900 pl-1">{shopCode}</span>
                <span className="text-xs text-gray-500">Give this code to customers</span>
              </div>
            </div>
          )}
          <div>
            <label className="label">Portal Link</label>
            <div className="flex gap-2">
              <input type="text" readOnly value={portalUrl} className="input flex-1 text-sm bg-gray-50"
                onClick={(e) => e.target.select()} />
              <button onClick={handleCopyLink} className="btn btn-secondary gap-2 whitespace-nowrap">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Share this link or the QR code with your customers.</p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={handlePrint} className="btn btn-primary gap-2">
              <Printer className="w-4 h-4" />Print Card
            </button>
            <button onClick={handleDownload} className="btn btn-secondary gap-2">
              <Download className="w-4 h-4" />Download PNG
            </button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium mb-1">How it works</p>
            <ul className="list-disc list-inside text-xs space-y-1 text-amber-700">
              <li>Customer scans QR code or goes to portal and enters the 4-digit shop code</li>
              <li>They create an account with name, email, and password</li>
              <li>If you already have their email on file, their account links automatically</li>
              <li>They set a 4-digit PIN for quick access and add to their home screen</li>
            </ul>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}

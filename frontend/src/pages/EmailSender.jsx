import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { customers, submissions, emailTemplates } from '../api/client';
import {
  Mail,
  Send,
  Users,
  Package,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
  Info,
  UserCheck,
  Zap,
} from 'lucide-react';

export default function EmailSender() {
  const toast = useToast();
  const [sendMode, setSendMode] = useState('customer'); // 'customer', 'submission', 'bulk'
  const [customerList, setCustomerList] = useState([]);
  const [submissionList, setSubmissionList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [custRes, subRes] = await Promise.all([
        customers.list({}),
        submissions.list({}),
      ]);
      setCustomerList(custRes.data.customers || []);
      setSubmissionList(subRes.data.submissions || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPreviewData = () => {
    if (sendMode === 'customer') {
      const customer = customerList.find(c => c.id === parseInt(selectedCustomer));
      return {
        customer_name: customer?.name || 'Customer Name',
        customer_email: customer?.email || 'customer@example.com',
        company_name: 'SlabDash',
      };
    } else if (sendMode === 'submission') {
      const submission = submissionList.find(s => s.id === parseInt(selectedSubmission));
      return {
        customer_name: submission?.customer_name || 'Customer Name',
        submission_number: submission?.psa_submission_number || 'PSA #12345',
        current_step: submission?.current_step || 'Grading',
        progress_percent: submission?.progress_percent || 50,
        service_level: submission?.service_level || 'Regular',
        company_name: 'SlabDash',
      };
    } else {
      return {
        customer_name: 'Customer Name',
        submission_number: 'PSA #12345',
        current_step: 'Grading',
        progress_percent: 50,
        service_level: 'Regular',
        company_name: 'SlabDash',
      };
    }
  };

  const replaceVariables = (text, data) => {
    let result = text;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, data[key]);
    });
    return result;
  };

  const getPreviewContent = () => {
    const data = getPreviewData();
    return {
      subject: replaceVariables(emailSubject, data),
      body: replaceVariables(emailBody, data),
    };
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) {
      toast.error('Please enter both subject and body');
      return;
    }

    if (sendMode === 'customer' && !selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (sendMode === 'submission' && !selectedSubmission) {
      toast.error('Please select a submission');
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      let result;
      const emailData = {
        subject: emailSubject,
        body: emailBody,
      };

      if (sendMode === 'customer') {
        result = await emailTemplates.sendToCustomer(selectedCustomer, emailData);
      } else if (sendMode === 'submission') {
        result = await emailTemplates.sendToSubmission(selectedSubmission, emailData);
      } else {
        result = await emailTemplates.sendBulkCustomEmail(emailData);
      }

      setSendResult({
        success: true,
        message: result.data.message || 'Email sent successfully!',
        count: result.data.count,
      });

      // Clear form after successful send
      setEmailSubject('');
      setEmailBody('');
      setSelectedCustomer('');
      setSelectedSubmission('');
    } catch (error) {
      console.error('Failed to send email:', error);
      setSendResult({
        success: false,
        message: error.response?.data?.error || 'Failed to send email',
      });
    } finally {
      setSending(false);
    }
  };

  const getActiveCustomersCount = () => {
    const activeSubmissions = submissionList.filter(s => !s.shipped);
    const customerIds = new Set();
    activeSubmissions.forEach(s => {
      if (s.customer_id) customerIds.add(s.customer_id);
    });
    return customerIds.size;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const preview = getPreviewContent();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg flex items-center gap-3">
            <Mail className="w-10 h-10" />
            SEND EMAILS
          </h1>
          <p className="text-white/90 text-lg font-semibold">
            Send custom emails to customers, submissions, or everyone
          </p>
        </div>
      </div>

      {/* Send Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setSendMode('customer')}
          className={`p-6 rounded-xl border-2 transition-all ${
            sendMode === 'customer'
              ? 'border-brand-500 bg-brand-50 shadow-lg ring-4 ring-brand-100'
              : 'border-gray-300 hover:border-brand-300 bg-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              sendMode === 'customer' ? 'bg-brand-500' : 'bg-gray-100'
            }`}>
              <UserCheck className={`w-6 h-6 ${sendMode === 'customer' ? 'text-white' : 'text-gray-600'}`} />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Single Customer</p>
              <p className="text-sm text-gray-600">Send to one customer</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setSendMode('submission')}
          className={`p-6 rounded-xl border-2 transition-all ${
            sendMode === 'submission'
              ? 'border-blue-500 bg-blue-50 shadow-lg ring-4 ring-blue-100'
              : 'border-gray-300 hover:border-blue-300 bg-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              sendMode === 'submission' ? 'bg-blue-500' : 'bg-gray-100'
            }`}>
              <Package className={`w-6 h-6 ${sendMode === 'submission' ? 'text-white' : 'text-gray-600'}`} />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Submission</p>
              <p className="text-sm text-gray-600">Send to submission customers</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setSendMode('bulk')}
          className={`p-6 rounded-xl border-2 transition-all ${
            sendMode === 'bulk'
              ? 'border-purple-500 bg-purple-50 shadow-lg ring-4 ring-purple-100'
              : 'border-gray-300 hover:border-purple-300 bg-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              sendMode === 'bulk' ? 'bg-purple-500' : 'bg-gray-100'
            }`}>
              <Zap className={`w-6 h-6 ${sendMode === 'bulk' ? 'text-white' : 'text-gray-600'}`} />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">All Active Customers</p>
              <p className="text-sm text-gray-600">{getActiveCustomersCount()} customers</p>
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Composer */}
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Compose Email</h2>

            {/* Recipient Selection */}
            {sendMode === 'customer' && (
              <div className="mb-4">
                <label className="label">Select Customer *</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="input"
                >
                  <option value="">Choose a customer...</option>
                  {customerList.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {sendMode === 'submission' && (
              <div className="mb-4">
                <label className="label">Select Submission *</label>
                <select
                  value={selectedSubmission}
                  onChange={(e) => setSelectedSubmission(e.target.value)}
                  className="input"
                >
                  <option value="">Choose a submission...</option>
                  {submissionList.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.psa_submission_number || sub.internal_id} - {sub.customer_name || 'No customer'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {sendMode === 'bulk' && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-900">
                    <p className="font-semibold">Bulk Email</p>
                    <p className="text-purple-800">
                      This will send to all {getActiveCustomersCount()} customers with active submissions (not shipped)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Subject */}
            <div className="mb-4">
              <label className="label">Email Subject *</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Update on your submission {{submission_number}}"
                className="input"
              />
            </div>

            {/* Body */}
            <div className="mb-4">
              <label className="label">Email Body (HTML) *</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="input font-mono text-sm"
                rows={12}
                placeholder={`<h2>Hi {{customer_name}},</h2>

<p>We wanted to update you on your submission {{submission_number}}.</p>

<p>Current Status: {{current_step}}</p>
<p>Progress: {{progress_percent}}%</p>

<p>Thank you for your business!</p>

<p>- {{company_name}}</p>`}
              />
            </div>

            {/* Available Variables */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm">Available Variables</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                <code className="bg-white px-2 py-1 rounded">{'{{customer_name}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{submission_number}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{current_step}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{progress_percent}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{service_level}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{company_name}}'}</code>
              </div>
            </div>
          </div>

          {/* Send Button */}
          <div className="card p-6">
            <div className="flex gap-3">
              <button
                onClick={() => setPreviewMode(true)}
                disabled={!emailSubject || !emailBody}
                className="btn btn-secondary flex-1 gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || !emailSubject || !emailBody}
                className="btn btn-primary flex-1 gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Send Result */}
          {sendResult && (
            <div className={`card p-6 ${sendResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-3">
                {sendResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-bold ${sendResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {sendResult.success ? 'Success!' : 'Error'}
                  </p>
                  <p className={`text-sm ${sendResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {sendResult.message}
                  </p>
                  {sendResult.count && (
                    <p className="text-sm text-green-800 mt-1">
                      Sent to {sendResult.count} recipient{sendResult.count !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <div className="card p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Live Preview</h2>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              {/* Preview Subject */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Subject:</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="font-semibold text-gray-900">
                    {preview.subject || 'Your subject line will appear here'}
                  </p>
                </div>
              </div>

              {/* Preview Body */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Body:</p>
                <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {preview.body ? (
                    <div dangerouslySetInnerHTML={{ __html: preview.body }} />
                  ) : (
                    <p className="text-gray-400 italic">Your email body will appear here</p>
                  )}
                </div>
              </div>

              {/* Preview Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-900">
                  <Info className="w-3 h-3 inline mr-1" />
                  Variables shown with sample data. Actual emails will use real customer/submission data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Email Preview</h3>
                <button onClick={() => setPreviewMode(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500">Subject:</p>
                <p className="font-semibold text-gray-900 text-lg">{preview.subject}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <div dangerouslySetInnerHTML={{ __html: preview.body }} />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-between">
              <button onClick={() => setPreviewMode(false)} className="btn btn-secondary">
                Close
              </button>
              <button
                onClick={() => {
                  setPreviewMode(false);
                  handleSendEmail();
                }}
                disabled={sending}
                className="btn btn-primary gap-2"
              >
                <Send className="w-4 h-4" />
                Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

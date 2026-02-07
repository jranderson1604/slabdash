import { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  Users,
  CheckCircle2,
  Mail,
  Package,
  FileSpreadsheet,
  UserPlus,
  Send,
  DollarSign,
  Truck,
  Eye,
  Info,
  PlayCircle,
} from 'lucide-react';

/**
 * AdminWalkthrough - A children's museum style interactive tutorial
 * Shows pixel-perfect replicas of admin pages with guided walkthroughs
 */
export default function AdminWalkthrough({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [csvSize, setCsvSize] = useState(25); // 25, 50, or 100
  const [isPlaying, setIsPlaying] = useState(false);

  const tutorials = [
    {
      id: 'csv-upload',
      title: 'Upload Submissions via CSV',
      description: 'Import 25, 50, or 100 submissions from PSA',
      icon: Upload,
      color: 'blue',
    },
    {
      id: 'add-customers',
      title: 'Add Customers',
      description: 'Create and manage customer profiles',
      icon: Users,
      color: 'green',
    },
    {
      id: 'complete-order',
      title: 'Complete an Order',
      description: 'Mark submissions ready and generate invoices',
      icon: CheckCircle2,
      color: 'purple',
    },
    {
      id: 'send-emails',
      title: 'Send Emails',
      description: 'Communicate with customers about their submissions',
      icon: Mail,
      color: 'orange',
    },
  ];

  const csvSteps = [
    {
      title: 'Navigate to Import CSV',
      description: 'Click on "Import CSV" in the left sidebar',
      screenshot: 'nav',
    },
    {
      title: 'Choose File Size',
      description: 'Select whether you want to upload 25, 50, or 100 submissions',
      screenshot: 'size-select',
    },
    {
      title: 'Upload PSA CSV File',
      description: 'Drag and drop or click to upload your PSA export file',
      screenshot: 'upload',
    },
    {
      title: 'Preview Import',
      description: `Review ${csvSize} submissions, total cards, and average cards per submission`,
      screenshot: 'preview',
    },
    {
      title: 'Link Customers (Optional)',
      description: 'Optionally assign submissions to existing customers',
      screenshot: 'link-customers',
    },
    {
      title: 'Confirm Import',
      description: 'Click "Import" to add all submissions to your account',
      screenshot: 'confirm',
    },
    {
      title: 'View Results',
      description: 'See summary of created submissions and any errors',
      screenshot: 'results',
    },
  ];

  const customerSteps = [
    {
      title: 'Navigate to Customers',
      description: 'Click "Customers" in the left sidebar',
      screenshot: 'nav',
    },
    {
      title: 'Click Add Customer',
      description: 'Click the "New Customer" button in the top right',
      screenshot: 'click-new',
    },
    {
      title: 'Enter Customer Information',
      description: 'Fill in name, email, phone, and address details',
      screenshot: 'form',
    },
    {
      title: 'Enable Portal Access',
      description: 'Toggle "Allow Portal Access" to give customer online tracking',
      screenshot: 'portal-toggle',
    },
    {
      title: 'Save Customer',
      description: 'Click "Create Customer" to save the new profile',
      screenshot: 'save',
    },
    {
      title: 'Generate Portal Link',
      description: 'Click "Generate Portal Link" to create unique tracking URL',
      screenshot: 'generate-link',
    },
    {
      title: 'Share with Customer',
      description: 'Copy the link and share via email or text message',
      screenshot: 'share',
    },
  ];

  const completeOrderSteps = [
    {
      title: 'Find Completed Submission',
      description: 'Go to Submissions and find one marked "Grades Ready"',
      screenshot: 'find-submission',
    },
    {
      title: 'Open Submission Detail',
      description: 'Click on the submission number to view details',
      screenshot: 'open-detail',
    },
    {
      title: 'Verify Grades',
      description: 'Check that all cards have grades from PSA',
      screenshot: 'verify-grades',
    },
    {
      title: 'Mark Grades Ready',
      description: 'Toggle "Grades Ready" switch to enable invoice generation',
      screenshot: 'mark-ready',
    },
    {
      title: 'Preview Invoices',
      description: 'Click "Preview & Send Invoices" to see customer invoices',
      screenshot: 'preview-invoice',
    },
    {
      title: 'Review Pricing',
      description: 'Each customer sees their cards with grading fees and totals',
      screenshot: 'review-pricing',
    },
    {
      title: 'Send Invoices',
      description: 'Click "Send to All Customers" to email invoices with pickup codes',
      screenshot: 'send-invoice',
    },
    {
      title: 'Customer Pickup',
      description: 'When customer arrives, verify pickup code and mark as picked up',
      screenshot: 'pickup',
    },
    {
      title: 'Mark as Shipped',
      description: 'Once all customers picked up, mark submission as "Shipped"',
      screenshot: 'ship',
    },
  ];

  const emailSteps = [
    {
      title: 'Navigate to Email Settings',
      description: 'Click "Email" in the left sidebar',
      screenshot: 'nav',
    },
    {
      title: 'Configure SMTP (Optional)',
      description: 'Set up custom email server or use default SlabDash email',
      screenshot: 'smtp',
    },
    {
      title: 'Choose Email Type',
      description: 'Select from: Portal Link, Status Update, or Invoice',
      screenshot: 'email-type',
    },
    {
      title: 'Single Customer Email',
      description: 'Send portal link from Customer detail page',
      screenshot: 'single-email',
    },
    {
      title: 'Bulk Status Updates',
      description: 'Go to Email Templates to send updates to all customers',
      screenshot: 'bulk-update',
    },
    {
      title: 'Customize Template',
      description: 'Edit email template with variables like {{customer_name}}',
      screenshot: 'template',
    },
    {
      title: 'Test Email',
      description: 'Send test email to verify formatting and content',
      screenshot: 'test',
    },
    {
      title: 'Send to All',
      description: 'Click "Send to All Customers" to email everyone at once',
      screenshot: 'send-all',
    },
  ];

  const getCurrentSteps = () => {
    const tutorial = tutorials[currentStep];
    switch (tutorial.id) {
      case 'csv-upload':
        return csvSteps;
      case 'add-customers':
        return customerSteps;
      case 'complete-order':
        return completeOrderSteps;
      case 'send-emails':
        return emailSteps;
      default:
        return [];
    }
  };

  const [tutorialStep, setTutorialStep] = useState(0);

  const handleNext = () => {
    const steps = getCurrentSteps();
    if (tutorialStep < steps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else if (currentStep < tutorials.length - 1) {
      setCurrentStep(currentStep + 1);
      setTutorialStep(0);
    }
  };

  const handlePrev = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      const prevSteps = tutorials[currentStep - 1].id === 'csv-upload' ? csvSteps :
                        tutorials[currentStep - 1].id === 'add-customers' ? customerSteps :
                        tutorials[currentStep - 1].id === 'complete-order' ? completeOrderSteps : emailSteps;
      setTutorialStep(prevSteps.length - 1);
    }
  };

  const selectTutorial = (index) => {
    setCurrentStep(index);
    setTutorialStep(0);
    setIsPlaying(true);
  };

  const steps = getCurrentSteps();
  const step = steps[tutorialStep];
  const tutorial = tutorials[currentStep];

  // Render mock admin page based on current step
  const renderMockScreen = () => {
    switch (tutorial.id) {
      case 'csv-upload':
        return <MockCSVUpload step={step} csvSize={csvSize} />;
      case 'add-customers':
        return <MockAddCustomer step={step} />;
      case 'complete-order':
        return <MockCompleteOrder step={step} />;
      case 'send-emails':
        return <MockSendEmails step={step} />;
      default:
        return null;
    }
  };

  if (!isPlaying) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900/95 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-br from-brand-500 to-brand-700 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <PlayCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Interactive Admin Tutorial</h2>
                  <p className="text-white/90 text-sm font-semibold">Choose a walkthrough to get started</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tutorial Selection Grid */}
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {tutorials.map((tut, index) => {
                const colorClasses = {
                  blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
                  green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
                  purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
                  orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
                };

                return (
                  <button
                    key={tut.id}
                    onClick={() => selectTutorial(index)}
                    className={`bg-gradient-to-br ${colorClasses[tut.color]} p-6 rounded-xl text-left transition-all hover:scale-105 hover:shadow-xl`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <tut.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">{tut.title}</h3>
                        <p className="text-white/90 text-sm font-medium">{tut.description}</p>
                        <div className="mt-3 flex items-center gap-2 text-white/80 text-xs font-semibold">
                          <PlayCircle className="w-4 h-4" />
                          <span>
                            {tut.id === 'csv-upload' && `${csvSteps.length} steps`}
                            {tut.id === 'add-customers' && `${customerSteps.length} steps`}
                            {tut.id === 'complete-order' && `${completeOrderSteps.length} steps`}
                            {tut.id === 'send-emails' && `${emailSteps.length} steps`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CSV Size Selector */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                CSV Upload Tutorial Size:
              </label>
              <div className="flex gap-2">
                {[25, 50, 100].map((size) => (
                  <button
                    key={size}
                    onClick={() => setCsvSize(size)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      csvSize === size
                        ? 'bg-brand-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-brand-500'
                    }`}
                  >
                    {size} submissions
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">How this works:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Each tutorial shows a pixel-perfect replica of the real admin page</li>
                    <li>Click through each step to see exactly what happens</li>
                    <li>All interactions are simulated - your real data is safe</li>
                    <li>Use this to train staff or learn the system yourself</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/95 flex flex-col">
      {/* Tutorial Progress Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(false)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className={`w-10 h-10 bg-gradient-to-br from-${tutorial.color}-500 to-${tutorial.color}-600 rounded-lg flex items-center justify-center`}>
                <tutorial.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{tutorial.title}</h3>
                <p className="text-sm text-gray-600">
                  Step {tutorialStep + 1} of {steps.length}: {step.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0 && tutorialStep === 0}
                className="btn btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentStep === tutorials.length - 1 && tutorialStep === steps.length - 1}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  index <= tutorialStep ? 'bg-brand-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mock Admin Screen */}
      <div className="flex-1 overflow-auto bg-gray-100">
        <div className="max-w-7xl mx-auto p-6">
          {/* Step Description Banner */}
          <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-yellow-900">{step.title}</p>
                <p className="text-sm text-yellow-800">{step.description}</p>
              </div>
            </div>
          </div>

          {/* Rendered Mock Screen */}
          {renderMockScreen()}
        </div>
      </div>
    </div>
  );
}

// Mock CSV Upload Screen
function MockCSVUpload({ step, csvSize }) {
  const mockData = {
    totalSubmissions: csvSize,
    totalCards: csvSize * 12,
    avgCards: 12,
  };

  if (step.screenshot === 'nav') {
    return <MockSidebar highlight="Import CSV" />;
  }

  if (step.screenshot === 'size-select') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Choose Import Size</h2>
        <div className="space-y-3">
          {[25, 50, 100].map((size) => (
            <button
              key={size}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                size === csvSize
                  ? 'border-brand-500 bg-brand-50 shadow-lg ring-4 ring-brand-100'
                  : 'border-gray-300 hover:border-brand-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{size} Submissions</p>
                  <p className="text-sm text-gray-600">Approximately {size * 12} cards</p>
                </div>
                {size === csvSize && (
                  <CheckCircle2 className="w-6 h-6 text-brand-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step.screenshot === 'upload') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Upload PSA CSV File</h2>
        <div className="border-2 border-dashed border-brand-300 bg-brand-50 rounded-xl p-12 text-center hover:border-brand-500 hover:bg-brand-100 transition-all cursor-pointer">
          <Upload className="w-16 h-16 text-brand-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900 mb-2">Drop your PSA CSV file here</p>
          <p className="text-sm text-gray-600 mb-4">or click to browse</p>
          <button className="btn btn-primary">
            <FileSpreadsheet className="w-4 h-4" />
            Select File
          </button>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'preview') {
    return (
      <div className="space-y-4">
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Preview Import</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total Submissions</p>
              <p className="text-3xl font-bold text-blue-900">{mockData.totalSubmissions}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Total Cards</p>
              <p className="text-3xl font-bold text-green-900">{mockData.totalCards}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Avg Cards/Submission</p>
              <p className="text-3xl font-bold text-purple-900">{mockData.avgCards}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">PSA #</th>
                  <th className="text-left py-2">Cards</th>
                  <th className="text-left py-2">Service Level</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.min(csvSize, 5) }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 font-mono">{50000000 + i}</td>
                    <td className="py-2">{12} cards</td>
                    <td className="py-2">Regular</td>
                    <td className="py-2">
                      <span className="badge badge-yellow">Processing</span>
                    </td>
                  </tr>
                ))}
                {csvSize > 5 && (
                  <tr>
                    <td colSpan="4" className="py-2 text-center text-gray-500">
                      ... and {csvSize - 5} more submissions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'link-customers') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Link to Existing Customers (Optional)</h2>
        <p className="text-gray-600 mb-4">Associate these submissions with customers in your database</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input type="checkbox" className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">John Smith</p>
              <p className="text-sm text-gray-600">john@example.com</p>
            </div>
            <span className="text-sm text-gray-500">→ PSA #50000000</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input type="checkbox" className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-medium">Sarah Johnson</p>
              <p className="text-sm text-gray-600">sarah@example.com</p>
            </div>
            <span className="text-sm text-gray-500">→ PSA #50000001</span>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'confirm') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Ready to Import</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-900">
              <p className="font-semibold">File validated successfully</p>
              <p className="text-green-800">Ready to import {csvSize} submissions with {csvSize * 12} cards</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1">Cancel</button>
          <button className="btn btn-primary flex-1">
            <Upload className="w-4 h-4" />
            Import {csvSize} Submissions
          </button>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'results') {
    return (
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Import Complete!</h2>
          <p className="text-gray-600">Your submissions have been successfully imported</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-600 font-medium">Submissions Created</p>
            <p className="text-3xl font-bold text-green-900">{csvSize}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-600 font-medium">Cards Imported</p>
            <p className="text-3xl font-bold text-blue-900">{csvSize * 12}</p>
          </div>
        </div>
        <button className="btn btn-primary w-full">
          View Submissions
        </button>
      </div>
    );
  }

  return null;
}

// Mock Add Customer Screen
function MockAddCustomer({ step }) {
  if (step.screenshot === 'nav') {
    return <MockSidebar highlight="Customers" />;
  }

  if (step.screenshot === 'click-new') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Customers</h1>
          <button className="btn btn-primary ring-4 ring-brand-300 animate-pulse">
            <UserPlus className="w-4 h-4" />
            New Customer
          </button>
        </div>
        <div className="card p-6">
          <p className="text-gray-500 text-center py-8">Customer list...</p>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'form') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">New Customer</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              className="input"
              placeholder="John Smith"
              value="John Smith"
              readOnly
            />
          </div>
          <div>
            <label className="label">Email Address *</label>
            <input
              type="email"
              className="input"
              placeholder="john@example.com"
              value="john@example.com"
              readOnly
            />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input
              type="tel"
              className="input"
              placeholder="(555) 123-4567"
              value="(555) 123-4567"
              readOnly
            />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea
              className="input"
              rows="3"
              placeholder="123 Main St, City, State 12345"
              value="123 Main St, City, State 12345"
              readOnly
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows="2"
              placeholder="Internal notes about this customer"
              readOnly
            />
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'portal-toggle') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Portal Access</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-blue-900">Allow Portal Access</p>
              <p className="text-sm text-blue-800">Customer can track their submissions online</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked
                readOnly
              />
              <div className="w-14 h-8 bg-blue-600 rounded-full peer ring-4 ring-blue-300 animate-pulse"></div>
              <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-all peer-checked:translate-x-6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'save') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Save Customer</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-900">
              <p className="font-semibold">Customer information complete</p>
              <p className="text-green-800">Ready to create customer profile</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1">Cancel</button>
          <button className="btn btn-primary flex-1 ring-4 ring-brand-300 animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            Create Customer
          </button>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'generate-link') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Customer Portal</h2>
        <div className="space-y-4">
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
            <p className="font-bold text-brand-900 mb-2">Portal Access Enabled</p>
            <p className="text-sm text-brand-800 mb-3">
              John Smith can now track their submissions online
            </p>
            <button className="btn btn-primary w-full ring-4 ring-brand-300 animate-pulse">
              <Eye className="w-4 h-4" />
              Generate Portal Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'share') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Portal Link Generated</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-900 mb-2">Unique tracking link created</p>
              <div className="bg-white border border-green-300 rounded p-3 font-mono text-sm text-gray-700 break-all">
                https://slabdash.app/portal/abc123xyz789
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1">
            Copy Link
          </button>
          <button className="btn btn-primary flex-1">
            <Mail className="w-4 h-4" />
            Email to Customer
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Mock Complete Order Screen
function MockCompleteOrder({ step }) {
  if (step.screenshot === 'find-submission') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Submissions</h1>
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PSA #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Cards</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono">50000001</td>
                  <td>John Smith</td>
                  <td><span className="badge badge-yellow">Processing</span></td>
                  <td>12 cards</td>
                </tr>
                <tr className="bg-blue-50 ring-4 ring-blue-300">
                  <td className="font-mono font-bold">50000002</td>
                  <td className="font-bold">Sarah Johnson</td>
                  <td><span className="badge badge-blue animate-pulse">Grades Ready</span></td>
                  <td className="font-bold">15 cards</td>
                </tr>
                <tr>
                  <td className="font-mono">50000003</td>
                  <td>Mike Davis</td>
                  <td><span className="badge badge-yellow">Grading</span></td>
                  <td>8 cards</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'open-detail') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ChevronLeft className="w-5 h-5" />
          <h1 className="text-2xl font-bold">Submission #50000002</h1>
          <span className="badge badge-blue">Grades Ready</span>
        </div>
        <div className="card p-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-bold">Sarah Johnson</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cards</p>
              <p className="font-bold">15 cards</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Service Level</p>
              <p className="font-bold">Regular</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'verify-grades') {
    return (
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold">Cards & Grades</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Cert #</th>
                <th>Card</th>
                <th>Grade</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-mono">12345678</td>
                <td>2023 Topps Mike Trout</td>
                <td><span className="badge badge-green">PSA 10</span></td>
                <td>$450</td>
              </tr>
              <tr>
                <td className="font-mono">12345679</td>
                <td>2022 Panini Luka Doncic</td>
                <td><span className="badge badge-blue">PSA 9</span></td>
                <td>$200</td>
              </tr>
              <tr>
                <td className="font-mono">12345680</td>
                <td>2021 Bowman Chrome Wander Franco</td>
                <td><span className="badge badge-green">PSA 10</span></td>
                <td>$350</td>
              </tr>
              <tr>
                <td colSpan="4" className="text-center text-gray-500 py-2">
                  ... and 12 more cards
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'mark-ready') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Submission Status</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-blue-900">Grades Ready</p>
              <p className="text-sm text-blue-800">All cards have been graded by PSA</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked
                readOnly
              />
              <div className="w-14 h-8 bg-blue-600 rounded-full peer ring-4 ring-blue-300 animate-pulse"></div>
              <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-all peer-checked:translate-x-6"></div>
            </div>
          </div>
          <div className="bg-white rounded p-3 border border-blue-300">
            <p className="text-sm text-blue-900">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              Invoice generation is now enabled
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'preview-invoice') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Generate Invoices</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-600" />
            <div className="flex-1">
              <p className="font-bold text-green-900">Ready to invoice</p>
              <p className="text-sm text-green-800">1 customer • 15 cards</p>
            </div>
          </div>
        </div>
        <button className="btn btn-primary w-full ring-4 ring-brand-300 animate-pulse">
          <Eye className="w-4 h-4" />
          Preview & Send Invoices
        </button>
      </div>
    );
  }

  if (step.screenshot === 'review-pricing') {
    return (
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold">Invoice Preview - Sarah Johnson</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Grading fees (15 cards × $20)</span>
              <span className="font-bold">$300.00</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Service fee</span>
              <span className="font-bold">$15.00</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Tax (8%)</span>
              <span className="font-bold">$25.20</span>
            </div>
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">Total Due</span>
                <span className="text-2xl font-bold text-brand-600">$340.20</span>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-900">
              <Info className="w-4 h-4 inline mr-1" />
              A unique pickup code will be generated and sent via email
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'send-invoice') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Send Invoices</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-900">
              <p className="font-semibold">Ready to send</p>
              <p className="text-green-800">1 invoice will be emailed with pickup code</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1">Cancel</button>
          <button className="btn btn-primary flex-1 ring-4 ring-brand-300 animate-pulse">
            <Send className="w-4 h-4" />
            Send to All Customers
          </button>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'pickup') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Customer Pickup</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="font-bold text-blue-900 mb-2">Pickup Code Verification</p>
          <div className="bg-white border border-blue-300 rounded p-4">
            <p className="text-3xl font-mono font-bold text-center text-blue-900 mb-2">
              PICK-789ABC
            </p>
            <p className="text-sm text-center text-blue-800">Sarah Johnson</p>
          </div>
        </div>
        <div className="space-y-3">
          <button className="btn btn-primary w-full">
            <CheckCircle2 className="w-4 h-4" />
            Mark as Picked Up
          </button>
          <button className="btn btn-secondary w-full">
            View Invoice
          </button>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'ship') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Mark as Shipped</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-900">
              <p className="font-semibold">All customers picked up</p>
              <p className="text-green-800">1 customer • 15 cards delivered</p>
            </div>
          </div>
        </div>
        <button className="btn btn-primary w-full ring-4 ring-green-300 animate-pulse">
          <Truck className="w-4 h-4" />
          Mark Submission as Shipped
        </button>
      </div>
    );
  }

  return null;
}

// Mock Send Emails Screen
function MockSendEmails({ step }) {
  if (step.screenshot === 'nav') {
    return <MockSidebar highlight="Email" />;
  }

  if (step.screenshot === 'smtp') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Email Configuration</h2>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-blue-900">Use Custom SMTP</p>
                <p className="text-sm text-blue-800">Configure your own email server</p>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" readOnly />
                <div className="w-14 h-8 bg-gray-300 rounded-full peer"></div>
                <div className="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-all"></div>
              </div>
            </div>
          </div>
          <div>
            <label className="label">SMTP Host</label>
            <input
              type="text"
              className="input"
              placeholder="smtp.gmail.com"
              disabled
            />
          </div>
          <div>
            <label className="label">SMTP Port</label>
            <input
              type="text"
              className="input"
              placeholder="587"
              disabled
            />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <Info className="w-4 h-4 inline mr-1" />
              Using default SlabDash email (no-reply@slabdash.app)
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'email-type') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Email Types</h2>
        <div className="space-y-3">
          <button className="w-full p-4 bg-blue-50 border-2 border-blue-300 rounded-lg text-left hover:bg-blue-100 transition-all">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-bold text-blue-900">Portal Link</p>
                <p className="text-sm text-blue-800">Send customer their unique tracking URL</p>
              </div>
            </div>
          </button>
          <button className="w-full p-4 bg-green-50 border-2 border-green-300 rounded-lg text-left hover:bg-green-100 transition-all">
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-bold text-green-900">Status Update</p>
                <p className="text-sm text-green-800">Notify about submission progress</p>
              </div>
            </div>
          </button>
          <button className="w-full p-4 bg-purple-50 border-2 border-purple-300 rounded-lg text-left hover:bg-purple-100 transition-all">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-bold text-purple-900">Invoice</p>
                <p className="text-sm text-purple-800">Send invoice with pickup code</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'single-email') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Customer Detail - John Smith</h1>
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Portal Access</h2>
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
            <p className="font-bold text-brand-900 mb-2">Send Portal Link</p>
            <p className="text-sm text-brand-800 mb-3">
              Email John their unique tracking URL
            </p>
            <button className="btn btn-primary w-full ring-4 ring-brand-300 animate-pulse">
              <Mail className="w-4 h-4" />
              Send Portal Link via Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'bulk-update') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Bulk Status Update</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="font-bold text-green-900 mb-2">Send to All Customers</p>
            <p className="text-sm text-green-800">
              Notify all customers about their submission status
            </p>
          </div>
          <button className="btn btn-primary w-full ring-4 ring-brand-300 animate-pulse">
            <Send className="w-4 h-4" />
            Send Bulk Status Update
          </button>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'template') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Email Template Editor</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Subject Line</label>
            <input
              type="text"
              className="input"
              value="Your PSA Submission Update - {{submission_number}}"
              readOnly
            />
          </div>
          <div>
            <label className="label">Message Body</label>
            <textarea
              className="input font-mono text-sm"
              rows="8"
              value={`Hi {{customer_name}},

Your submission #{{submission_number}} has been updated!

Current Status: {{current_step}}

You can track your cards anytime at your portal:
{{portal_link}}

Questions? Just reply to this email.

Thanks,
SlabDash Team`}
              readOnly
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-900">
              <Info className="w-4 h-4 inline mr-1" />
              Available variables: {'{'}{'{'} customer_name {'}'}{'}'},  {'{'}{'{'} submission_number {'}'}{'}'},  {'{'}{'{'} current_step {'}'}{'}'},  {'{'}{'{'} portal_link {'}'}{'}'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'test') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Test Email</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Send Test To</label>
            <input
              type="email"
              className="input"
              placeholder="your@email.com"
              value="admin@slabdash.app"
              readOnly
            />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="font-bold text-yellow-900 mb-2">Preview with Sample Data</p>
            <div className="bg-white border border-yellow-300 rounded p-3 text-sm">
              <p className="font-bold mb-2">Subject: Your PSA Submission Update - 50000001</p>
              <p className="text-gray-700">
                Hi John Smith,<br/><br/>
                Your submission #50000001 has been updated!<br/><br/>
                Current Status: Grading<br/><br/>
                You can track your cards anytime...
              </p>
            </div>
          </div>
          <button className="btn btn-primary w-full ring-4 ring-yellow-300 animate-pulse">
            <Send className="w-4 h-4" />
            Send Test Email
          </button>
        </div>
      </div>
    );
  }

  if (step.screenshot === 'send-all') {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Send to All Customers</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-900">
              <p className="font-semibold">Ready to send</p>
              <p className="text-green-800">42 customers will receive status updates</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p className="text-sm text-blue-900">
            <Info className="w-4 h-4 inline mr-1" />
            Each customer receives personalized email with their specific data
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary flex-1">Cancel</button>
          <button className="btn btn-primary flex-1 ring-4 ring-brand-300 animate-pulse">
            <Send className="w-4 h-4" />
            Send to 42 Customers
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Mock Sidebar Component
function MockSidebar({ highlight }) {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Submissions', icon: Package },
    { name: 'Customers', icon: Users },
    { name: 'Cards', icon: CreditCard },
    { name: 'Import CSV', icon: Upload },
    { name: 'Buyback Offers', icon: DollarSign },
    { name: 'Email', icon: Mail },
    { name: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-[600px] bg-white rounded-lg overflow-hidden border border-gray-200">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <div className="mb-6">
          <div className="h-12 bg-brand-600 rounded flex items-center justify-center">
            <span className="text-white font-bold">SlabDash</span>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isHighlighted = item.name === highlight;
            return (
              <div
                key={item.name}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isHighlighted
                    ? 'bg-brand-600 text-white shadow-lg ring-4 ring-brand-300 animate-pulse'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-6 bg-gray-50">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChevronRight className="w-8 h-8 text-brand-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">Click "{highlight}"</p>
            <p className="text-sm text-gray-600">in the left sidebar to continue</p>
          </div>
        </div>
      </div>
    </div>
  );
}

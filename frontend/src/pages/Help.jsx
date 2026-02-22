import {
  Package,
  Users,
  CreditCard,
  DollarSign,
  Upload,
  Eye,
  CheckCircle2,
  Clock,
  Send,
  ArrowRight,
  HelpCircle,
  Info
} from 'lucide-react';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-3" style={{ color: 'rgb(var(--dark))' }}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--brand-500)), rgb(var(--brand-600)))',
            boxShadow: '0 4px 12px rgba(255, 107, 89, 0.25), inset 0 1px 0 rgba(255, 185, 160, 0.3)',
          }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        {title}
      </h2>
      <div className="space-y-4" style={{ color: 'var(--text-body)' }}>
        {children}
      </div>
    </div>
  );
}

function StepCard({ number, title, description, icon: Icon }) {
  return (
    <div className="flex gap-4 p-4 rounded-2xl"
      style={{ background: 'rgba(255, 248, 240, 0.6)', border: '1px solid rgba(0,0,0,0.03)' }}
    >
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--brand-500)), rgb(var(--brand-600)))',
            color: '#FFF8F0',
            boxShadow: '0 2px 8px rgba(255, 107, 89, 0.25)',
          }}
        >
          {number}
        </div>
      </div>
      <div className="flex-1">
        <h4 className="font-bold flex items-center gap-2 mb-1" style={{ color: 'rgb(var(--dark))' }}>
          {Icon && <Icon className="w-4 h-4" />}
          {title}
        </h4>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
    </div>
  );
}

export default function Help() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl page-header-glass p-8 mb-8">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
          style={{ background: 'rgba(255, 216, 196, 0.25)' }}
        />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"
          style={{ background: 'rgba(255, 185, 160, 0.2)' }}
        />
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 216, 196, 0.5), transparent)' }}
        />

        <div className="relative">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg flex items-center gap-3">
            <HelpCircle className="w-10 h-10" />
            HELP & INSTRUCTIONS
          </h1>
          <p className="text-lg font-semibold" style={{ color: 'rgba(255, 248, 240, 0.85)' }}>
            Everything you need to know about using SlabDash
          </p>
        </div>
      </div>

      <Section title="Getting Started" icon={Package}>
        <p>
          SlabDash is your complete PSA submission tracking platform. Track cards from the moment you send them to PSA until they return graded.
        </p>
        <p className="font-medium">Quick start in 60 seconds:</p>
        <ol className="list-decimal list-inside space-y-2 ml-4">
          <li>Create a new submission with your PSA submission number</li>
          <li>Import cards via CSV or add them manually</li>
          <li>Monitor real-time status updates from PSA</li>
          <li>Share portal links with your customers</li>
          <li>Receive cards and update final statuses</li>
        </ol>
      </Section>

      <Section title="Managing Submissions" icon={Package}>
        <p className="font-semibold">Creating a Submission:</p>
        <div className="space-y-3">
          <StepCard
            number="1"
            icon={Send}
            title="Enter PSA Details"
            description="Add your PSA submission number, service level, and date sent. This is the tracking ID PSA provides."
          />
          <StepCard
            number="2"
            icon={Upload}
            title="Import Cards"
            description="Upload PSA's CSV export or add cards manually. Each card can be assigned to a specific customer for consignment tracking."
          />
          <StepCard
            number="3"
            icon={Eye}
            title="Monitor Progress"
            description="SlabDash automatically syncs with PSA to show current status, grades when ready, and shipping updates."
          />
          <StepCard
            number="4"
            icon={CheckCircle2}
            title="Complete & Ship"
            description="When cards return, mark as shipped and your customers receive automatic portal updates."
          />
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 flex items-center gap-2">
            <Info className="w-4 h-4" />
            <strong>Pro Tip:</strong> Connect your PSA API key in Settings for automatic status updates every 6 hours.
          </p>
        </div>
      </Section>

      <Section title="Submission Stages" icon={Clock}>
        <p>PSA submissions go through several stages. Here's what each status means:</p>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h5 className="font-semibold text-yellow-900">Received by PSA</h5>
            <p className="text-sm text-yellow-800">Your submission arrived at PSA and is in queue</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <h5 className="font-semibold text-blue-900">Research & ID</h5>
            <p className="text-sm text-blue-800">PSA is verifying card details and authenticity</p>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded">
            <h5 className="font-semibold text-purple-900">Grading</h5>
            <p className="text-sm text-purple-800">Cards are being examined and graded</p>
          </div>
          <div className="p-3 bg-pink-50 border border-pink-200 rounded">
            <h5 className="font-semibold text-pink-900">Encapsulation</h5>
            <p className="text-sm text-pink-800">Cards are being sealed in protective cases</p>
          </div>
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <h5 className="font-semibold text-green-900">Quality Check</h5>
            <p className="text-sm text-green-800">Final inspection before shipping</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded">
            <h5 className="font-semibold text-gray-900">Shipped</h5>
            <p className="text-sm text-gray-800">On the way back to you with tracking</p>
          </div>
        </div>
      </Section>

      <Section title="Customer Portal" icon={Users}>
        <p>
          <strong>Give your customers 24/7 access</strong> to track their cards without calling or emailing you.
        </p>
        <p className="font-semibold mt-4">How it works:</p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 text-brand-500 mt-1 flex-shrink-0" />
            <span>Each customer gets a unique secure portal link</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 text-brand-500 mt-1 flex-shrink-0" />
            <span>They see only THEIR cards and submissions - nothing from other customers</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 text-brand-500 mt-1 flex-shrink-0" />
            <span>Real-time updates automatically sync from PSA</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 text-brand-500 mt-1 flex-shrink-0" />
            <span>Customers receive buyback offers directly in their portal</span>
          </li>
        </ul>
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-900">
            <strong>Generate portal links</strong> from the Customer detail page. Share via email or text message.
          </p>
        </div>
      </Section>

      <Section title="Buyback Offers" icon={DollarSign}>
        <p>
          Create instant buyback offers for graded cards and process payments seamlessly.
        </p>
        <p className="font-semibold mt-4">Creating an offer:</p>
        <div className="space-y-3">
          <StepCard
            number="1"
            title="Find the Card"
            description="Navigate to any graded card from Submissions or Cards view"
          />
          <StepCard
            number="2"
            title="Make Your Offer"
            description="Click 'Create Buyback Offer', enter your price and optional message"
          />
          <StepCard
            number="3"
            title="Customer Responds"
            description="They see the offer in their portal and can accept or decline with one click"
          />
          <StepCard
            number="4"
            title="Process Payment"
            description="Accepted offers automatically trigger Stripe payment processing"
          />
        </div>
        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-900 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Connect Stripe in Settings to enable automatic payment processing for buyback offers.
          </p>
        </div>
      </Section>

      <Section title="CSV Import" icon={Upload}>
        <p>
          Bulk import submissions and cards directly from PSA's CSV export file.
        </p>
        <p className="font-semibold mt-4">Steps:</p>
        <ol className="list-decimal list-inside space-y-2 ml-4">
          <li>Download your submission CSV from PSA's website</li>
          <li>Go to Import CSV in SlabDash navigation</li>
          <li>Upload the file - SlabDash auto-detects PSA format</li>
          <li>Preview your cards before importing</li>
          <li>Assign customers to individual cards if needed</li>
          <li>Import and track immediately</li>
        </ol>
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-900">
            <strong>Supported formats:</strong> PSA standard CSV export. File must include card details, cert numbers, and grades.
          </p>
        </div>
      </Section>

      <Section title="Common Questions" icon={HelpCircle}>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900">Why aren't my submission statuses updating?</h4>
            <p className="text-sm text-gray-600">
              Add your PSA API key in Settings. Without it, you'll need to manually refresh submission data. With the API key, SlabDash syncs automatically every 6 hours.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Can I track multiple customers in one submission?</h4>
            <p className="text-sm text-gray-600">
              Yes! This is perfect for consignment. When importing or adding cards, assign each card to its owner. Customers only see their own cards in the portal.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">How do customers access their portal?</h4>
            <p className="text-sm text-gray-600">
              Go to Customers, click a customer, and generate their unique portal link. Share it via email or text. The link is permanent and secure.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">What if a customer accepts a buyback but I change my mind?</h4>
            <p className="text-sm text-gray-600">
              You can cancel accepted offers before payment is processed. Go to Buyback Offers, find the offer, and change status to 'cancelled'.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Can I customize the branding?</h4>
            <p className="text-sm text-gray-600">
              Yes! In Settings, upload your shop logo and choose brand colors. These appear on your customer portal and throughout your dashboard.
            </p>
          </div>
        </div>
      </Section>

      <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl p-8 text-white text-center">
        <h3 className="text-2xl font-bold mb-2">Still have questions?</h3>
        <p className="mb-4 text-brand-100">We're here to help you get the most out of SlabDash</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:support@slabdash.app"
            className="px-6 py-3 bg-white text-brand-700 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-lg"
          >
            Email Support
          </a>
          <a
            href="#settings"
            className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white border-2 border-white/50 rounded-lg font-bold hover:bg-white/30 transition-colors"
          >
            View Settings
          </a>
        </div>
      </div>
    </div>
  );
}

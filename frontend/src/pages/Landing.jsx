import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Users,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Star,
  Shield,
  Zap,
  BarChart3,
  Smartphone,
  Bell,
  FileText,
  DollarSign,
  Lock,
  Upload,
  HelpCircle,
  X,
  PlayCircle,
  ChevronRight
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [showFAQ, setShowFAQ] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  // Add landing-page class to body to prevent bold font styling
  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => document.body.classList.remove('landing-page');
  }, []);

  const features = [
    {
      icon: Package,
      title: 'Submission Tracking',
      description: 'Monitor your PSA submissions in real-time with automatic status updates'
    },
    {
      icon: Users,
      title: 'Customer Portal',
      description: 'Customers can track their cards with unique portal links'
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Insights into your grading business with detailed reports'
    },
    {
      icon: DollarSign,
      title: 'Buyback Offers',
      description: 'Create and manage buyback offers for graded cards with Stripe integration'
    },
    {
      icon: Bell,
      title: 'Email Notifications',
      description: 'Automatic email alerts for grade updates, offers, and shipments'
    },
    {
      icon: Upload,
      title: 'CSV Import/Export',
      description: 'Bulk import customers and cards, export reports with one click'
    },
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Upload invoices, receipts, and documents for each submission'
    },
    {
      icon: Lock,
      title: 'Multi-User Access',
      description: 'Add team members with role-based permissions and access control'
    },
    {
      icon: Smartphone,
      title: 'Mobile Optimized',
      description: 'Full-featured mobile experience - manage your business on the go'
    }
  ];

  const pricing = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      period: 'month',
      description: 'Perfect for small card shops just getting started',
      features: [
        'Up to 100 cards/month',
        '5 submissions',
        '10 customers',
        'Customer portal access',
        'Email support',
        'Basic analytics'
      ],
      cta: 'Start Free Trial'
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 79,
      period: 'month',
      description: 'For growing shops with regular submissions',
      features: [
        'Up to 500 cards/month',
        'Unlimited submissions',
        'Unlimited customers',
        'Priority customer portal',
        'Priority support',
        'Advanced analytics',
        'CSV import/export',
        'Custom branding'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      period: 'month',
      description: 'For large operations and bulk submitters',
      features: [
        'Unlimited cards',
        'Unlimited submissions',
        'Unlimited customers',
        'White-label portal',
        'Dedicated support',
        'Custom integrations',
        'API access',
        'Multi-location support',
        'SLA guarantee'
      ],
      cta: 'Contact Sales'
    }
  ];

  const testimonials = [
    {
      name: 'Mike Johnson',
      business: 'Diamond Cards & Collectibles',
      image: '💎',
      quote: 'SlabDash has transformed how we manage our PSA submissions. Our customers love being able to track their cards!'
    },
    {
      name: 'Sarah Chen',
      business: 'Premier Sports Cards',
      image: '⭐',
      quote: 'The consignment tracking feature is a game-changer. We can finally manage multiple customer cards in one submission.'
    },
    {
      name: 'Alex Rodriguez',
      business: 'Vintage Vault',
      image: '🏆',
      quote: 'Best investment for our shop. The customer portal alone has saved us hours of answering "where\'s my card?" emails.'
    }
  ];

  const faqs = [
    {
      question: "How do I add a new PSA submission?",
      answer: "Click '+ New Submission' at the top of the Submissions page, enter your PSA submission number, select a service level, and add your customer. You can add cards individually or import them from a PSA CSV file."
    },
    {
      question: "Can customers track their own cards?",
      answer: "Yes! Each customer gets a unique portal link. Send them an introduction email or generate a portal link from their customer detail page. They can track all their submissions in real-time without logging in."
    },
    {
      question: "How do I import cards from PSA?",
      answer: "Download the CSV from PSA, go to your submission detail page, and click 'Import PSA CSV'. SlabDash will automatically match and update all cards with grades and cert numbers."
    },
    {
      question: "Can I send bulk email updates?",
      answer: "Absolutely! Use the 'Email All' button to send status updates to all customers at once. You can also preview emails before sending to make sure everything looks perfect."
    },
    {
      question: "How do I assign multiple customers to one submission?",
      answer: "Go to the Customers page, select multiple customers, click 'Add to Submission', and search for the submission number. This is perfect for group orders where multiple people share one PSA submission."
    },
    {
      question: "What's the difference between service levels?",
      answer: "PSA offers different service levels (Bulk, Regular, Express, etc.) with different processing times and costs. SlabDash tracks all of them and shows you expected timelines for each."
    }
  ];

  const demoSteps = [
    {
      title: "Step 1: Create Your First Submission",
      description: "Let's start by creating a new PSA submission. You'll enter the PSA submission number and service level.",
      image: "📦",
      action: "Create Submission"
    },
    {
      title: "Step 2: Add Customer Information",
      description: "Now we'll add a customer to this submission. You can add their name, email, and phone number.",
      image: "👤",
      action: "Add Customer"
    },
    {
      title: "Step 3: Import Cards from PSA",
      description: "Download your CSV from PSA and import it here. SlabDash will automatically populate all card details.",
      image: "📥",
      action: "Import CSV"
    },
    {
      title: "Step 4: Send Customer Portal Link",
      description: "Generate a unique tracking link for your customer. They can bookmark it and check their card status anytime!",
      image: "🔗",
      action: "Generate Link"
    },
    {
      title: "Step 5: Send Status Updates",
      description: "When cards are graded, send automatic email updates to all customers with progress bars and grades!",
      image: "📧",
      action: "Send Email"
    },
    {
      title: "You're All Set!",
      description: "That's how easy it is to manage PSA submissions with SlabDash. Your customers will love the transparency!",
      image: "🎉",
      action: "Start Your Free Trial"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* S logo - brand anchor in top-left */}
            <Link to="/" className="flex items-center">
              <img
                src="/images/logo-icon.png.svg"
                alt="SlabDash"
                className="h-20 w-20 sm:h-24 sm:w-24"
              />
            </Link>

            {/* Customer Quick Access Tabs */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Pricing
              </a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                FAQ
              </a>
              <button
                onClick={() => setShowDemo(true)}
                className="text-brand-600 hover:text-brand-700 font-medium transition-colors flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                Demo
              </button>
              <Link to="/portal" className="text-gray-600 hover:text-[#FF8170] font-medium transition-colors flex items-center gap-2">
                <Package className="w-4 h-4" />
                Track My Cards
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Admin Sign In
              </Link>
              <Link to="/register" className="px-4 py-2 bg-[#FF8170] hover:bg-[#ff6b59] text-white rounded-lg font-medium transition-colors shadow-md">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-brand-50/30 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 fade-in">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-50 to-brand-100 text-brand-700 rounded-full text-sm font-semibold border border-brand-200 shadow-sm">
              <Zap className="w-4 h-4" />
              Professional PSA Submission Tracking
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight">
              <span className="block text-gray-900 mb-3">Manage Your</span>
              <span className="block text-[#FF8170] text-5xl sm:text-6xl">
                PSA Submissions
              </span>
              <span className="block text-gray-900 mt-3">With Ease</span>
            </h1>
            <p className="text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-medium">
              The complete platform for card shops to track PSA submissions, manage customers, and grow your grading business.
            </p>
            <div className="flex items-center justify-center gap-5 pt-8">
              <button
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white text-lg px-10 py-4 rounded-xl font-bold transition-all flex items-center gap-3 group shadow-wix hover:shadow-wix-lg transform hover:-translate-y-1"
              >
                Start Free Trial
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="bg-white text-gray-900 border-2 border-gray-300 hover:border-brand-400 hover:bg-brand-50 text-lg px-10 py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
              >
                Sign In
              </button>
            </div>
            <p className="text-base text-gray-500 font-medium">
              14-day free trial • No credit card required • Cancel anytime
            </p>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />
            <div className="rounded-2xl border-4 border-gray-200 shadow-2xl overflow-hidden bg-white">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-block px-4 py-1 bg-white rounded text-xs text-gray-600">
                    slabdash.app/submissions
                  </div>
                </div>
              </div>
              <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">127</div>
                    <div className="text-sm text-gray-500">Active Cards</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">18</div>
                    <div className="text-sm text-gray-500">Submissions</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">45</div>
                    <div className="text-sm text-gray-500">Customers</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Recent Submissions</h3>
                    <span className="badge badge-green">8 Graded</span>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 bg-gray-200 rounded animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-wix-alt">
        <div className="container-wix">
          <div className="text-center mb-20">
            <div className="flex justify-center mb-8 scale-in">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-500 opacity-20 blur-3xl rounded-full"></div>
                <img
                  src="/images/logo-icon.png.svg"
                  alt="SlabDash"
                  className="h-32 w-32 relative drop-shadow-2xl"
                />
              </div>
            </div>
            <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              Everything You Need to Run<br />Your Grading Business
            </h2>
            <p className="text-2xl text-gray-600 max-w-3xl mx-auto font-medium">
              Built by card shop owners, for card shop owners
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-8 bg-white rounded-2xl border border-gray-100 hover:border-brand-300 shadow-wix hover:shadow-wix-lg transition-all duration-300 group transform hover:-translate-y-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-brand-200 rounded-2xl flex items-center justify-center mb-6 group-hover:from-brand-500 group-hover:to-brand-600 transition-all duration-300 shadow-md">
                  <feature.icon className="w-8 h-8 text-brand-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 text-lg leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section-wix bg-white">
        <div className="container-wix">
          <div className="text-center mb-20">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-500 opacity-20 blur-3xl rounded-full"></div>
                <img
                  src="/images/logo-icon.png.svg"
                  alt="SlabDash"
                  className="h-32 w-32 relative drop-shadow-2xl"
                />
              </div>
            </div>
            <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-2xl text-gray-600 font-medium">
              Choose the plan that's right for your business
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto pt-8">
            {pricing.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-3xl border-2 p-10 transition-all duration-300 bg-white ${
                  plan.popular
                    ? 'border-brand-500 shadow-wix-lg transform scale-105 hover:scale-110'
                    : 'border-gray-200 hover:border-brand-300 shadow-wix hover:shadow-wix-lg hover:transform hover:-translate-y-2'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-auto whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-full text-sm font-bold shadow-lg">
                      <Star className="w-4 h-4 fill-current" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-3xl font-extrabold text-gray-900 mb-3">{plan.name}</h3>
                  <p className="text-gray-600 mb-6 text-base leading-relaxed">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-6xl font-black text-gray-900">${plan.price}</span>
                    <span className="text-gray-500 text-lg font-medium">/{plan.period}</span>
                  </div>
                </div>

                <button
                  className={`w-full mb-8 py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white shadow-wix hover:shadow-wix-lg transform hover:-translate-y-1'
                      : 'bg-gray-100 hover:bg-brand-100 text-gray-900 hover:text-brand-700 shadow-md hover:shadow-lg'
                  }`}
                  onClick={() => navigate('/register')}
                >
                  {plan.cta}
                </button>

                <div className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-base">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-wix-alt">
        <div className="container-wix">
          <div className="text-center mb-20">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-500 opacity-20 blur-3xl rounded-full"></div>
                <img
                  src="/images/logo-icon.png.svg"
                  alt="SlabDash"
                  className="h-32 w-32 relative drop-shadow-2xl"
                />
              </div>
            </div>
            <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              Trusted by Card Shops<br />Nationwide
            </h2>
            <p className="text-2xl text-gray-600 font-medium">
              See what our customers are saying
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 rounded-3xl border border-gray-100 bg-white shadow-wix hover:shadow-wix-lg transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="flex items-center gap-1.5 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-8 italic text-lg leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-brand-100 to-brand-200 rounded-full flex items-center justify-center text-3xl shadow-md">
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{testimonial.name}</div>
                    <div className="text-gray-500">{testimonial.business}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section with DASHY */}
      <section id="faq" className="section-wix bg-gradient-to-b from-white to-brand-50/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <img
                  src="/images/DASHY.png"
                  alt="Dashy"
                  className="h-32 w-32 animate-bounce"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-6xl animate-bounce">💬</div>';
                  }}
                />
              </div>
            </div>
            <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
              Got Questions? DASHY Has Answers!
            </h2>
            <p className="text-xl text-gray-600 font-medium">
              Here are the most common questions about using SlabDash
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all overflow-hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">{faq.question}</h3>
                  <ChevronRight className="w-6 h-6 text-brand-500 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => setShowDemo(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
            >
              <PlayCircle className="w-6 h-6" />
              Watch Interactive Demo
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="section-wix-lg bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500 opacity-10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-500 opacity-10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-8 leading-tight text-white">
            Ready to Transform Your<br />Grading Business?
          </h2>
          <p className="text-2xl mb-12 text-gray-300 font-medium">
            Join hundreds of card shops already using SlabDash
          </p>
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={() => navigate('/register')}
              className="bg-gradient-to-r from-[#FF8170] to-[#ff6b59] hover:from-[#ff6b59] hover:to-[#FF8170] text-white px-12 py-5 rounded-xl font-black text-xl transition-all flex items-center gap-3 shadow-2xl hover:shadow-[0_20px_50px_rgba(255,129,112,0.5)] transform hover:-translate-y-1 hover:scale-105"
            >
              Start Free Trial
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
          <p className="mt-8 text-gray-400 text-lg font-medium">
            No credit card required • 14-day free trial
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-gray-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <Link to="/" className="flex items-center mb-6">
                <img
                  src="/images/logo-icon.png.svg"
                  alt="SlabDash"
                  className="h-16 w-16"
                />
                <span className="text-3xl font-black text-white ml-3">SlabDash</span>
              </Link>
              <p className="text-gray-300 text-base leading-relaxed">
                Professional PSA submission tracking for card shops and collectors.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Product</h4>
              <ul className="space-y-3 text-base text-gray-300">
                <li><a href="#features" className="hover:text-brand-400 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-brand-400 transition-colors">Pricing</a></li>
                <li><Link to="/portal" className="hover:text-brand-400 transition-colors">Customer Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Company</h4>
              <ul className="space-y-3 text-base text-gray-300">
                <li><a href="#about" className="hover:text-brand-400 transition-colors">About</a></li>
                <li><a href="#contact" className="hover:text-brand-400 transition-colors">Contact</a></li>
                <li><a href="#terms" className="hover:text-brand-400 transition-colors">Terms</a></li>
                <li><a href="#privacy" className="hover:text-brand-400 transition-colors">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Connect</h4>
              <ul className="space-y-3 text-base text-gray-300">
                <li><Link to="/login" className="hover:text-brand-400 transition-colors">Admin Login</Link></li>
                <li><Link to="/portal" className="hover:text-brand-400 transition-colors">Customer Login</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-base">&copy; 2026 SlabDash. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating DASHY - Idle Animation */}
      <div className="fixed bottom-8 right-8 z-40 group">
        <div className="relative">
          <div className="absolute inset-0 bg-brand-500 opacity-30 blur-2xl rounded-full animate-pulse"></div>
          <button
            onClick={() => setShowFAQ(true)}
            className="relative w-24 h-24 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-300"
          >
            <img
              src="/images/DASHY.png"
              alt="Dashy"
              className="w-20 h-20 animate-bounce"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="text-white text-4xl font-bold animate-bounce">💬</div>';
              }}
            />
          </button>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="absolute bottom-full mb-4 right-0 bg-white px-4 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
          <p className="text-sm font-semibold text-gray-900">Need help? Click me!</p>
        </div>
      </div>

      {/* FAQ Modal */}
      {showFAQ && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-brand-600 to-brand-700 p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src="/images/DASHY.png"
                  alt="Dashy"
                  className="w-16 h-16"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-white text-4xl">💬</div>';
                  }}
                />
                <div>
                  <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
                  <p className="text-white/90">DASHY is here to help!</p>
                </div>
              </div>
              <button
                onClick={() => setShowFAQ(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {faqs.map((faq, index) => (
                <details
                  key={index}
                  className="group bg-brand-50 rounded-xl border border-brand-200 overflow-hidden"
                >
                  <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                    <h3 className="font-bold text-gray-900">{faq.question}</h3>
                    <ChevronRight className="w-5 h-5 text-brand-500 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-4 pb-4">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                </details>
              ))}
              <div className="pt-4 text-center">
                <button
                  onClick={() => {
                    setShowFAQ(false);
                    setShowDemo(true);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  <PlayCircle className="w-5 h-5" />
                  Watch Interactive Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src="/images/DASHY.png"
                  alt="Dashy"
                  className="w-16 h-16 animate-bounce"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-white text-4xl">🎬</div>';
                  }}
                />
                <div>
                  <h2 className="text-2xl font-bold text-white">Interactive Demo Tour</h2>
                  <p className="text-white/90">Follow DASHY through a complete submission</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDemo(false);
                  setDemoStep(0);
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              {/* Demo Step */}
              <div className="text-center mb-8">
                <div className="text-8xl mb-6">{demoSteps[demoStep].image}</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">{demoSteps[demoStep].title}</h3>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  {demoSteps[demoStep].description}
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {demoSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === demoStep
                        ? 'w-12 bg-brand-600'
                        : index < demoStep
                        ? 'w-8 bg-brand-400'
                        : 'w-8 bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setDemoStep(Math.max(0, demoStep - 1))}
                  disabled={demoStep === 0}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  Previous
                </button>
                {demoStep < demoSteps.length - 1 ? (
                  <button
                    onClick={() => setDemoStep(demoStep + 1)}
                    className="px-8 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    {demoSteps[demoStep].action}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/register')}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    {demoSteps[demoStep].action}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

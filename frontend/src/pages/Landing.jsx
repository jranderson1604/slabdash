import { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Store,
  Loader2,
  AlertTriangle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Landing() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [showFAQ, setShowFAQ] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [shopCode, setShopCode] = useState('');
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState('');
  const [shopFound, setShopFound] = useState(null);
  const shopCodeRefs = [useRef(), useRef(), useRef(), useRef()];

  // Add landing-page class to body to prevent bold font styling
  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => document.body.classList.remove('landing-page');
  }, []);

  const handleShopCodeInput = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = shopCode.split('');
    newCode[index] = digit;
    const code = newCode.join('');
    setShopCode(code);
    setShopError('');
    setShopFound(null);
    if (digit && index < 3) shopCodeRefs[index + 1].current?.focus();
    if (code.length === 4 && /^\d{4}$/.test(code)) lookupShop(code);
  };

  const handleShopCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !shopCode[index] && index > 0) shopCodeRefs[index - 1].current?.focus();
  };

  const handleShopCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) { setShopCode(pasted); shopCodeRefs[3].current?.focus(); lookupShop(pasted); }
  };

  const lookupShop = async (code) => {
    setShopLoading(true); setShopError('');
    try {
      const res = await fetch(`${API_URL}/portal/auth/shop-lookup/${encodeURIComponent(code)}`);
      if (!res.ok) { setShopError('Shop not found. Check the code and try again.'); setShopLoading(false); return; }
      const data = await res.json();
      setShopFound(data);
      setTimeout(() => navigate(`/portal?shop=${encodeURIComponent(code)}`), 600);
    } catch { setShopError('Connection error. Please try again.'); }
    setShopLoading(false);
  };

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
    { title: "Add a submission", description: "Enter the PSA order number and service level — SlabDash pulls the rest automatically.", action: "Next" },
    { title: "Track real-time progress", description: "Every submission shows a live pipeline pulled from PSA. No manual updates needed.", action: "Next" },
    { title: "Your customers get a portal", description: "Each customer gets a private tracking page — they scan a QR code or click a link.", action: "Next" },
    { title: "Grades come in? Customers know.", description: "Push notifications, emails, and portal updates fire automatically when PSA updates.", action: "Next" },
    { title: "Pickup made easy", description: "Customers get a unique pickup code. Verify it in-store — done.", action: "Next" },
    { title: "Ready to try it?", description: "Start your free trial — no credit card, no commitment. See why shops love SlabDash.", action: "Start Free Trial" },
  ];

  // Mock data for demo screens
  const demoSubmissions = [
    { num: '86241907', customer: 'Marcus Rivera', cards: 18, service: 'Express', step: 'Grading', progress: 62, daysIn: 8 },
    { num: '86239214', customer: 'Jen Park', cards: 42, service: 'Regular', step: 'Research & ID', progress: 35, daysIn: 22 },
    { num: '86237801', customer: 'Tommy Chen', cards: 6, service: 'Super Express', step: 'Grades Ready', progress: 88, daysIn: 4 },
  ];

  const demoPipeline = ['Received', 'Research & ID', 'Grading', 'Assembly', 'Grades Ready'];
  const demoActiveIdx = 2; // Grading

  const DemoScreen = ({ step }) => {
    const coralGrad = 'linear-gradient(135deg, #FF8170 0%, #E8543D 100%)';
    const cream = '#FBF7F2';
    const tan = '#F5EDE4';

    // Step 0: Add a submission form
    if (step === 0) return (
      <div style={{ background: cream, borderRadius: 16, border: '1px solid rgba(44,36,22,0.08)', overflow: 'hidden' }}>
        <div style={{ background: coralGrad, padding: '20px 24px' }}>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>New Submission</p>
        </div>
        <div style={{ padding: 24 }} className="space-y-4">
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: 'rgba(44,36,22,0.5)' }}>PSA ORDER NUMBER</p>
            <div style={{ background: '#fff', border: '2px solid #FF8170', borderRadius: 12, padding: '12px 16px', fontSize: 20, fontFamily: 'monospace', fontWeight: 700, color: '#2C2416' }}>86241907</div>
          </div>
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: 'rgba(44,36,22,0.5)' }}>SERVICE LEVEL</p>
            <div className="flex gap-2">
              {['Bulk', 'Regular', 'Express'].map(s => (
                <div key={s} style={{ background: s === 'Express' ? '#FF8170' : tan, color: s === 'Express' ? '#fff' : '#2C2416', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 14 }}>{s}</div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: 'rgba(44,36,22,0.5)' }}>CUSTOMER</p>
            <div style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.1)', borderRadius: 12, padding: '12px 16px', fontWeight: 600, color: '#2C2416' }}>Marcus Rivera</div>
          </div>
          <div style={{ background: coralGrad, borderRadius: 14, padding: '14px 0', textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'default' }}>Create Submission</div>
        </div>
      </div>
    );

    // Step 1: Live pipeline
    if (step === 1) return (
      <div className="space-y-4">
        {demoSubmissions.map((sub, i) => {
          const steps = demoPipeline;
          const activeStep = sub.step === 'Grades Ready' ? 4 : sub.step === 'Grading' ? 2 : 1;
          return (
            <div key={i} style={{ background: cream, borderRadius: 16, border: '1px solid rgba(44,36,22,0.08)', padding: 20 }}>
              <div className="flex items-center justify-between mb-1">
                <p style={{ fontWeight: 800, fontSize: 16, color: '#2C2416' }}>{sub.customer}</p>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(44,36,22,0.45)', fontWeight: 600 }}>#{sub.num}</span>
              </div>
              <p className="text-xs mb-3" style={{ color: 'rgba(44,36,22,0.5)' }}>{sub.cards} cards · {sub.service} · Day {sub.daysIn}</p>
              <div className="flex items-center gap-1 mb-2">
                {steps.map((s, j) => (
                  <div key={j} className="flex-1 flex flex-col items-center">
                    <div style={{
                      width: j <= activeStep ? 28 : 20,
                      height: j <= activeStep ? 28 : 20,
                      borderRadius: '50%',
                      background: j < activeStep ? '#FF8170' : j === activeStep ? coralGrad : tan,
                      border: j === activeStep ? '3px solid rgba(255,129,112,0.3)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.3s',
                    }}>
                      {j < activeStep && <CheckCircle2 size={14} color="#fff" />}
                      {j === activeStep && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <p style={{ fontSize: 9, marginTop: 4, fontWeight: j === activeStep ? 800 : 500, color: j <= activeStep ? '#2C2416' : 'rgba(44,36,22,0.35)' }}>{s}</p>
                  </div>
                ))}
              </div>
              <div style={{ height: 6, background: tan, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${sub.progress}%`, height: '100%', background: coralGrad, borderRadius: 3, transition: 'width 1s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    );

    // Step 2: Customer portal mockup
    if (step === 2) return (
      <div style={{ background: cream, borderRadius: 16, border: '1px solid rgba(44,36,22,0.08)', overflow: 'hidden' }}>
        <div style={{ background: coralGrad, padding: '20px 24px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,248,240,0.7)', fontSize: 12, fontWeight: 700 }}>CUSTOMER PORTAL</p>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>Marcus Rivera</p>
          <p style={{ color: 'rgba(255,248,240,0.8)', fontSize: 13, fontWeight: 600, marginTop: 4 }}>1 active · 18 cards</p>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(44,36,22,0.06)', padding: 20, marginBottom: 12 }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontWeight: 800, fontSize: 15, color: '#2C2416' }}>Order #86241907</p>
              <span style={{ background: 'rgba(255,129,112,0.12)', color: '#E8543D', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>Express</span>
            </div>
            <div className="flex items-center gap-1 my-3">
              {demoPipeline.map((s, j) => (
                <div key={j} style={{ flex: 1, height: 6, borderRadius: 3, background: j <= demoActiveIdx ? '#FF8170' : tan }} />
              ))}
            </div>
            <div className="flex justify-between" style={{ fontSize: 12, color: 'rgba(44,36,22,0.55)' }}>
              <span style={{ fontWeight: 700, color: '#2C2416' }}>Grading</span>
              <span>~62% complete</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,129,112,0.06)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#E8543D' }}>Past the halfway mark!</p>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: tan, borderRadius: 12, padding: '12px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#2C2416' }}>18</p>
              <p style={{ fontSize: 10, color: 'rgba(44,36,22,0.5)', fontWeight: 600 }}>Cards</p>
            </div>
            <div style={{ flex: 1, background: tan, borderRadius: 12, padding: '12px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#2C2416' }}>8</p>
              <p style={{ fontSize: 10, color: 'rgba(44,36,22,0.5)', fontWeight: 600 }}>Days In</p>
            </div>
            <div style={{ flex: 1, background: tan, borderRadius: 12, padding: '12px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#FF8170' }}>~5d</p>
              <p style={{ fontSize: 10, color: 'rgba(44,36,22,0.5)', fontWeight: 600 }}>Est. Left</p>
            </div>
          </div>
        </div>
      </div>
    );

    // Step 3: Notifications
    if (step === 3) return (
      <div className="space-y-3">
        <div style={{ background: cream, borderRadius: 16, border: '1px solid rgba(44,36,22,0.08)', overflow: 'hidden' }}>
          <div style={{ background: coralGrad, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bell size={20} color="#fff" />
            <p style={{ color: '#fff', fontWeight: 800 }}>Automatic Notifications</p>
          </div>
          <div style={{ padding: 16 }} className="space-y-3">
            {[
              { icon: '🎯', title: 'Grades Ready!', body: 'Marcus — Your 18 cards from order #86241907 have been graded.', time: 'Just now', highlight: true },
              { icon: '📦', title: 'Step Change: Grading → Assembly', body: 'Jen Park\'s order moved to the next step.', time: '2h ago', highlight: false },
              { icon: '🚚', title: 'Shipped!', body: 'Tommy Chen — Order #86237801 has shipped. Track: 1Z999AA10.', time: 'Yesterday', highlight: false },
            ].map((n, i) => (
              <div key={i} style={{
                background: n.highlight ? 'rgba(255,129,112,0.06)' : '#fff',
                border: `1px solid ${n.highlight ? 'rgba(255,129,112,0.2)' : 'rgba(44,36,22,0.06)'}`,
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: 22 }}>{n.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p style={{ fontWeight: 800, fontSize: 14, color: '#2C2416' }}>{n.title}</p>
                      <span style={{ fontSize: 11, color: 'rgba(44,36,22,0.4)' }}>{n.time}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(44,36,22,0.6)', marginTop: 2 }}>{n.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    // Step 4: Pickup
    if (step === 4) return (
      <div style={{ background: cream, borderRadius: 16, border: '1px solid rgba(44,36,22,0.08)', overflow: 'hidden' }}>
        <div style={{ background: coralGrad, padding: '20px 24px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,248,240,0.7)', fontSize: 12, fontWeight: 700 }}>READY FOR PICKUP</p>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 22, marginTop: 4 }}>Tommy Chen</p>
        </div>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ background: tan, borderRadius: 16, padding: '28px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(44,36,22,0.4)', letterSpacing: 2, marginBottom: 8 }}>PICKUP CODE</p>
            <p style={{ fontSize: 44, fontWeight: 900, fontFamily: 'monospace', color: '#2C2416', letterSpacing: 6 }}>T4X-9KP</p>
          </div>
          <div className="flex gap-3 mb-4">
            <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid rgba(44,36,22,0.06)', padding: 14, textAlign: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#2C2416' }}>6</p>
              <p style={{ fontSize: 11, color: 'rgba(44,36,22,0.5)', fontWeight: 600 }}>Cards</p>
            </div>
            <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid rgba(44,36,22,0.06)', padding: 14, textAlign: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>$142</p>
              <p style={{ fontSize: 11, color: 'rgba(44,36,22,0.5)', fontWeight: 600 }}>Total Due</p>
            </div>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>Customer shows code at counter — you verify and hand off the slabs.</p>
          </div>
        </div>
      </div>
    );

    // Step 5: CTA
    if (step === 5) return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
        <p style={{ fontSize: 28, fontWeight: 900, color: '#2C2416', marginBottom: 8 }}>That's SlabDash.</p>
        <p style={{ fontSize: 16, color: 'rgba(44,36,22,0.55)', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
          Submissions, tracking, customer portals, notifications, pickup codes — all in one place. Your customers will love it.
        </p>
        <div className="flex justify-center gap-3">
          <div style={{ background: '#10b981', borderRadius: 14, padding: '14px 28px', color: '#fff', fontWeight: 800, fontSize: 16 }}>14-day free trial</div>
          <div style={{ background: tan, borderRadius: 14, padding: '14px 28px', color: '#2C2416', fontWeight: 700, fontSize: 16 }}>No credit card</div>
        </div>
      </div>
    );

    return null;
  };

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
              <a href="#customer-login" className="text-gray-600 hover:text-[#FF8170] font-medium transition-colors flex items-center gap-2">
                <Package className="w-4 h-4" />
                Track My Cards
              </a>
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

      {/* Customer Login Section */}
      <section id="customer-login" className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF8170] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF8170] opacity-5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

            <div className="relative z-10 grid md:grid-cols-2 gap-8 p-8 sm:p-12 items-center">
              {/* Left: Info */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FF8170]/15 text-[#FF8170] rounded-full text-xs font-bold mb-5 border border-[#FF8170]/20">
                  <Package className="w-3.5 h-3.5" />
                  Customer Portal
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
                  Track Your Cards
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed mb-6">
                  Enter your shop's 4-digit code to sign in or create your account. Track submissions, view grades, and manage your cards.
                </p>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Real-time tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Grade updates</span>
                  </div>
                </div>
              </div>

              {/* Right: Shop Code Entry */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
                  style={{ background: 'linear-gradient(135deg, #FF8170, #e8543d)', boxShadow: '0 8px 30px rgba(255, 107, 89, 0.3)' }}>
                  <Store className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Enter Shop Code</h3>
                <p className="text-xs text-gray-500 mb-6">Ask your card shop for their 4-digit code</p>

                <div className="flex gap-3 justify-center mb-4" onPaste={handleShopCodePaste}>
                  {[0, 1, 2, 3].map(i => (
                    <input
                      key={i}
                      ref={shopCodeRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={shopCode[i] || ''}
                      onChange={(e) => handleShopCodeInput(i, e.target.value)}
                      onKeyDown={(e) => handleShopCodeKeyDown(i, e)}
                      className="w-14 h-16 sm:w-16 sm:h-20 rounded-2xl text-center text-2xl sm:text-3xl font-black focus:ring-2 focus:ring-[#FF8170] transition-all"
                      style={{
                        background: shopCode[i] ? 'rgba(255, 129, 112, 0.1)' : 'rgba(255,255,255,0.06)',
                        border: `2px solid ${shopCode[i] ? 'rgba(255, 129, 112, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                        color: '#fff',
                        outline: 'none',
                      }}
                    />
                  ))}
                </div>

                {shopError && (
                  <div className="flex items-center gap-2 justify-center mb-3 text-xs font-semibold text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {shopError}
                  </div>
                )}

                {shopLoading && (
                  <div className="flex items-center gap-2 justify-center mb-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF8170]" />
                    <span className="text-sm font-semibold text-gray-400">Looking up shop...</span>
                  </div>
                )}

                {shopFound && (
                  <div className="flex items-center gap-2 justify-center mb-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-bold text-green-400">{shopFound.name}</span>
                  </div>
                )}

                <p className="text-[11px] text-gray-600 mt-4">
                  The code is on your receipt or the QR poster in-store
                </p>
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
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, #1a1a2e, #2d2b55)',
                        color: '#FF8170',
                        border: '1px solid rgba(255, 129, 112, 0.3)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 0 0 1px rgba(255, 129, 112, 0.15)',
                      }}
                    >
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

      {/* FAQ Section with SAM */}
      <section id="faq" className="section-wix bg-gradient-to-b from-white to-brand-50/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <img
                  src="/images/SAM_V2.png"
                  alt="SAM"
                  className="h-32 w-32 animate-bounce"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-6xl animate-bounce">🤖</div>';
                  }}
                />
              </div>
            </div>
            <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
              Got Questions? SAM Has Answers!
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

      {/* Floating SAM - Idle Animation */}
      <div className="fixed bottom-8 right-8 z-40 group">
        <div className="relative">
          <div className="absolute inset-0 bg-brand-500 opacity-30 blur-2xl rounded-full animate-pulse"></div>
          <button
            onClick={() => setShowFAQ(true)}
            className="relative w-24 h-24 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-300"
          >
            <img
              src="/images/SAM_V2.png"
              alt="SAM"
              className="w-20 h-20 animate-bounce"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="text-white text-4xl font-bold animate-bounce">🤖</div>';
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
                  src="/images/SAM_V2.png"
                  alt="SAM"
                  className="w-16 h-16"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-white text-4xl">🤖</div>';
                  }}
                />
                <div>
                  <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
                  <p className="text-white/90">SAM is here to help!</p>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => { setShowDemo(false); setDemoStep(0); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #FF8170 0%, #E8543D 100%)' }} className="p-5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-black text-white">{demoSteps[demoStep].title}</h2>
                <p className="text-sm font-semibold" style={{ color: 'rgba(255,248,240,0.8)' }}>{demoSteps[demoStep].description}</p>
              </div>
              <button onClick={() => { setShowDemo(false); setDemoStep(0); }} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors shrink-0 ml-3">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mock Screen */}
            <div className="flex-1 overflow-auto p-5" style={{ background: '#FAF5EF' }}>
              <DemoScreen step={demoStep} />
            </div>

            {/* Footer nav */}
            <div className="p-4 border-t flex items-center justify-between shrink-0" style={{ borderColor: 'rgba(44,36,22,0.08)', background: '#FBF7F2' }}>
              {/* Progress dots */}
              <div className="flex gap-2">
                {demoSteps.map((_, i) => (
                  <button key={i} onClick={() => setDemoStep(i)} className="p-0 border-0 bg-transparent cursor-pointer">
                    <div style={{ width: i === demoStep ? 24 : 8, height: 8, borderRadius: 4, background: i <= demoStep ? '#FF8170' : '#F0E8DE', transition: 'all 0.3s' }} />
                  </button>
                ))}
              </div>
              {/* Buttons */}
              <div className="flex items-center gap-2">
                {demoStep > 0 && (
                  <button onClick={() => setDemoStep(demoStep - 1)} className="px-4 py-2 rounded-xl font-bold text-sm transition-all" style={{ background: '#F0E8DE', color: '#2C2416' }}>
                    Back
                  </button>
                )}
                {demoStep < demoSteps.length - 1 ? (
                  <button onClick={() => setDemoStep(demoStep + 1)} className="px-5 py-2 rounded-xl font-bold text-sm text-white flex items-center gap-2 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)' }}>
                    {demoSteps[demoStep].action}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => navigate('/register')} className="px-5 py-2 rounded-xl font-bold text-sm text-white flex items-center gap-2 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    {demoSteps[demoStep].action}
                    <ArrowRight className="w-4 h-4" />
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

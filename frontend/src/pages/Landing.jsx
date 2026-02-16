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
  ChevronDown,
  Store,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Eye,
  Mail,
  QrCode,
  TrendingUp,
  Home,
  Search,
  Tag,
  MessageCircle,
  LayoutGrid
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Landing() {
  const navigate = useNavigate();
  const [showFAQ, setShowFAQ] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [shopCode, setShopCode] = useState('');
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState('');
  const [shopFound, setShopFound] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const shopCodeRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => document.body.classList.remove('landing-page');
  }, []);

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
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
      icon: Eye,
      title: 'Live PSA Tracking',
      description: 'Real-time submission status pulled directly from PSA. No manual updates, ever.',
      color: 'from-rose-500 to-orange-500'
    },
    {
      icon: QrCode,
      title: 'Customer Portal',
      description: 'Each customer gets a private tracking page. QR code or link — they always know where their cards are.',
      color: 'from-violet-500 to-purple-500'
    },
    {
      icon: Mail,
      title: 'Smart Notifications',
      description: 'Automatic emails when grades drop, status changes, or cards are ready for pickup.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: TrendingUp,
      title: 'Business Analytics',
      description: 'Revenue tracking, turnaround times, and customer insights to grow your business.',
      color: 'from-emerald-500 to-green-500'
    },
    {
      icon: DollarSign,
      title: 'Buyback Offers',
      description: 'Create instant buyback offers on graded cards with built-in Stripe payments.',
      color: 'from-amber-500 to-yellow-500'
    },
    {
      icon: Sparkles,
      title: 'SAM AI Assistant',
      description: 'Your AI-powered grading expert. Get answers, insights, and help managing your business.',
      color: 'from-pink-500 to-rose-500'
    }
  ];

  const pricing = [
    {
      id: 'shop',
      name: 'Shop',
      price: 99,
      period: 'month',
      description: 'Everything a card shop needs to manage PSA submissions and customers.',
      features: [
        'Up to 500 cards/month',
        'Up to 200 customers',
        'Unlimited submissions',
        'Customer portal',
        'SAM AI assistant',
        'Custom branding (colors & logo)',
        'Full analytics',
        'CSV import/export',
        'Email support'
      ],
      cta: 'Get Started Free',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 249,
      period: 'month',
      description: 'For multi-location operations and high-volume bulk submitters.',
      features: [
        'Unlimited cards/month',
        'Unlimited customers',
        'Everything in Shop, plus:',
        'Multi-location support',
        'White-label portal (remove SlabDash branding)',
        'API access',
        'Team roles & permissions',
        'Priority PSA refresh',
        'Priority support'
      ],
      cta: 'Get Started Free'
    }
  ];

  const testimonials = [
    {
      name: 'Mike Johnson',
      business: 'Diamond Cards & Collectibles',
      quote: 'SlabDash has transformed how we manage our PSA submissions. Our customers love being able to track their cards in real-time.',
      rating: 5
    },
    {
      name: 'Sarah Chen',
      business: 'Premier Sports Cards',
      quote: 'The consignment tracking is a game-changer. We manage multiple customer cards in one submission effortlessly.',
      rating: 5
    },
    {
      name: 'Alex Rodriguez',
      business: 'Vintage Vault',
      quote: 'Best investment for our shop. The customer portal alone has saved us hours of answering "where\'s my card?" calls.',
      rating: 5
    }
  ];

  const faqs = [
    {
      question: 'How does PSA submission tracking work?',
      answer: 'Enter your PSA submission number and SlabDash automatically pulls live status updates directly from PSA. You\'ll see every step — from received to graded — without lifting a finger.'
    },
    {
      question: 'Can my customers track their own cards?',
      answer: 'Absolutely. Each customer gets a unique portal link or QR code. They can check their card status anytime, from any device, without needing to log in or call your shop.'
    },
    {
      question: 'How do I import cards from PSA?',
      answer: 'Download the CSV from PSA\'s website, go to your submission detail page, and click "Import PSA CSV." SlabDash automatically matches and updates all cards with grades, cert numbers, and more.'
    },
    {
      question: 'Is SlabDash really free right now?',
      answer: 'Yes — we\'re in early access and everything is 100% free with no limits. When paid plans launch, early adopters will get the best deal. No credit card required to sign up.'
    },
    {
      question: 'Can I assign multiple customers to one submission?',
      answer: 'Yes. Group orders are a core feature. Assign any number of customers to a single PSA submission, and each customer only sees their own cards in the portal.'
    },
    {
      question: 'What makes SlabDash different from a spreadsheet?',
      answer: 'Automatic PSA status updates, customer-facing portals, email notifications, pickup codes, buyback offers, and an AI assistant. SlabDash replaces the spreadsheet, the texts, and the sticky notes.'
    }
  ];

  const demoSteps = [
    { title: 'Add a submission', description: 'Enter the PSA order number and service level — SlabDash pulls the rest automatically.', action: 'Next' },
    { title: 'Track real-time progress', description: 'Every submission shows a live pipeline pulled from PSA. No manual updates needed.', action: 'Next' },
    { title: 'Your customers get a portal', description: 'Each customer gets a private tracking page — they scan a QR code or click a link.', action: 'Next' },
    { title: 'Grades come in? Customers know.', description: 'Push notifications, emails, and portal updates fire automatically when PSA updates.', action: 'Next' },
    { title: 'Pickup made easy', description: 'Customers get a unique pickup code. Verify it in-store — done.', action: 'Next' },
    { title: 'Ready to try it?', description: 'SlabDash is free during early access — no credit card, no limits, no catch.', action: 'Get Started Free' },
  ];

  const demoSubmissions = [
    { num: '86241907', customer: 'Marcus Rivera', cards: 18, service: 'Express', step: 'Grading', progress: 62, daysIn: 8 },
    { num: '86239214', customer: 'Jen Park', cards: 42, service: 'Regular', step: 'Research & ID', progress: 35, daysIn: 22 },
    { num: '86237801', customer: 'Tommy Chen', cards: 6, service: 'Super Express', step: 'Grades Ready', progress: 88, daysIn: 4 },
  ];

  const demoPipeline = ['Received', 'Research & ID', 'Grading', 'Assembly', 'Grades Ready'];
  const demoActiveIdx = 2;

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'portal', label: 'Customer Portal', icon: Search },
    { id: 'features', label: 'Features', icon: LayoutGrid },
    { id: 'pricing', label: 'Pricing', icon: Tag },
    { id: 'faq', label: 'FAQ & Reviews', icon: MessageCircle },
  ];

  const DemoScreen = ({ step }) => {
    const coralGrad = 'linear-gradient(135deg, #FF8170 0%, #E8543D 100%)';
    const cream = '#FBF7F2';
    const tan = '#F5EDE4';

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
                      width: j <= activeStep ? 28 : 20, height: j <= activeStep ? 28 : 20,
                      borderRadius: '50%',
                      background: j < activeStep ? '#FF8170' : j === activeStep ? coralGrad : tan,
                      border: j === activeStep ? '3px solid rgba(255,129,112,0.3)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s',
                    }}>
                      {j < activeStep && <CheckCircle2 size={14} color="#fff" />}
                      {j === activeStep && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <p style={{ fontSize: 9, marginTop: 4, fontWeight: j === activeStep ? 800 : 500, color: j <= activeStep ? '#2C2416' : 'rgba(44,36,22,0.5)' }}>{s}</p>
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
                      <span style={{ fontSize: 11, color: 'rgba(44,36,22,0.55)' }}>{n.time}</span>
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

    if (step === 4) return (
      <div style={{ background: cream, borderRadius: 16, border: '1px solid rgba(44,36,22,0.08)', overflow: 'hidden' }}>
        <div style={{ background: coralGrad, padding: '20px 24px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,248,240,0.7)', fontSize: 12, fontWeight: 700 }}>READY FOR PICKUP</p>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 22, marginTop: 4 }}>Tommy Chen</p>
        </div>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ background: tan, borderRadius: 16, padding: '28px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(44,36,22,0.55)', letterSpacing: 2, marginBottom: 8 }}>PICKUP CODE</p>
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

    if (step === 5) return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🚀</div>
          <p style={{ fontSize: 26, fontWeight: 900, color: '#2C2416', marginBottom: 6 }}>That's SlabDash.</p>
          <p style={{ fontSize: 14, color: 'rgba(44,36,22,0.5)', maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>
            Everything you just saw — ready for your shop in minutes.
          </p>
        </div>
        <div style={{ background: cream, borderRadius: 16, border: '1px solid rgba(44,36,22,0.08)', padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', color: '#065f46', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
            <Zap size={12} /> Early Access — 100% Free
          </div>
          <p style={{ fontWeight: 800, fontSize: 16, color: '#2C2416', marginBottom: 12 }}>Everything included, no limits:</p>
          <div className="space-y-2">
            {[
              'Unlimited submissions & customers',
              'Live PSA tracking with auto-refresh',
              'Customer portal with QR codes',
              'Email & push notifications',
              'Pickup codes & invoicing',
              'SAM AI assistant',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 size={16} color="#10b981" />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#2C2416' }}>{f}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>No credit card. No time limit. Free while we're in early access — early shops get the best deal when paid plans launch.</p>
        </div>
      </div>
    );

    return null;
  };

  return (
    <div className="min-h-screen" style={{ background: '#FEFCFA' }}>
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{ background: 'rgba(254, 252, 250, 0.95)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderBottom: '1px solid rgba(44,36,22,0.06)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link to="/" className="flex items-center gap-2" onClick={() => setActiveTab('home')}>
              <img src="/images/logo-icon.png.svg" alt="SlabDash" className="h-10 w-10 sm:h-12 sm:w-12" />
              <span className="text-xl sm:text-2xl font-black" style={{ color: '#2C2416' }}>SlabDash</span>
            </Link>

            <div className="flex items-center gap-3">
              <button onClick={() => setShowDemo(true)}
                className="text-sm font-semibold transition-colors flex items-center gap-1.5 hidden sm:flex" style={{ color: '#FF8170' }}>
                <PlayCircle className="w-4 h-4" /> Demo
              </button>
              <Link to="/login" className="text-sm font-bold transition-colors" style={{ color: '#2C2416' }}>
                Admin Login
              </Link>
              <Link to="/register"
                className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', boxShadow: '0 2px 12px rgba(255,107,89,0.3)' }}>
                Get Started Free
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Tab Bar ─── */}
        <div style={{ borderTop: '1px solid rgba(44,36,22,0.04)' }}>
          <div className="max-w-6xl mx-auto px-3 sm:px-8">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 relative shrink-0"
                    style={{
                      color: isActive ? '#E8543D' : 'rgba(44,36,22,0.5)',
                      background: isActive ? 'rgba(255,129,112,0.06)' : 'transparent',
                      borderRadius: '10px 10px 0 0',
                    }}
                  >
                    <TabIcon className="w-4 h-4" />
                    {tab.label}
                    {isActive && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #FF8170, #E8543D)' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section (Home Tab) ─── */}
      {activeTab === 'home' && <><section className="relative pt-36 sm:pt-44 pb-20 sm:pb-28 px-5 sm:px-8 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #FF8170 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #E8543D 0%, transparent 70%)', filter: 'blur(60px)' }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-8"
            style={{ background: 'rgba(16,185,129,0.08)', color: '#065f46', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Free during early access — all features included
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6" style={{ color: '#2C2416' }}>
            Stop chasing PSA updates.
            <br />
            <span style={{ color: '#FF8170' }}>Start running your shop.</span>
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10" style={{ color: 'rgba(44,36,22,0.55)' }}>
            SlabDash tracks every PSA submission in real-time, keeps your customers in the loop automatically, and gives you the tools to grow your grading business.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button onClick={() => navigate('/register')}
              className="group w-full sm:w-auto px-8 py-4 text-base font-bold text-white rounded-2xl transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', boxShadow: '0 4px 24px rgba(255,107,89,0.35)' }}>
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => setShowDemo(true)}
              className="w-full sm:w-auto px-8 py-4 text-base font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              style={{ color: '#2C2416', border: '1.5px solid rgba(44,36,22,0.12)', background: 'rgba(255,255,255,0.6)' }}>
              <PlayCircle className="w-5 h-5" style={{ color: '#FF8170' }} />
              Watch Demo
            </button>
          </div>
          <p className="text-sm" style={{ color: 'rgba(44,36,22,0.5)' }}>No credit card required</p>
        </div>

        {/* Dashboard preview */}
        <div className="max-w-5xl mx-auto mt-16 sm:mt-20 relative">
          <div className="absolute -inset-4 rounded-[28px] opacity-50"
            style={{ background: 'linear-gradient(135deg, rgba(255,129,112,0.15), transparent, rgba(232,84,61,0.1))', filter: 'blur(2px)' }} />
          <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(44,36,22,0.08)', boxShadow: '0 24px 80px rgba(44,36,22,0.08), 0 8px 32px rgba(44,36,22,0.04)' }}>
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#F5F0EB', borderBottom: '1px solid rgba(44,36,22,0.06)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#FF6B59' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#FFBF2E' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#2BC840' }} />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-6 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(44,36,22,0.04)', color: 'rgba(44,36,22,0.55)' }}>
                  slabdash.app/dashboard
                </div>
              </div>
            </div>
            {/* Dashboard content */}
            <div className="p-6 sm:p-8" style={{ background: 'linear-gradient(180deg, #FBF7F2 0%, #FFF8F0 100%)' }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {[
                  { label: 'Active Cards', value: '127', color: '#2C2416' },
                  { label: 'Submissions', value: '18', color: '#2C2416' },
                  { label: 'Customers', value: '45', color: '#2C2416' },
                  { label: 'Graded', value: '89', color: '#10b981' },
                ].map((stat, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(44,36,22,0.05)' }}>
                    <p className="text-2xl sm:text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: 'rgba(44,36,22,0.55)' }}>{stat.label}</p>
                  </div>
                ))}
              </div>
              {/* Submission rows */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(44,36,22,0.05)' }}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(44,36,22,0.05)' }}>
                  <p className="text-sm font-bold" style={{ color: '#2C2416' }}>Recent Submissions</p>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', color: '#065f46' }}>8 Graded</span>
                </div>
                {demoSubmissions.map((sub, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-4" style={{ borderBottom: i < 2 ? '1px solid rgba(44,36,22,0.04)' : 'none' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white"
                      style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', flexShrink: 0 }}>
                      {sub.cards}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#2C2416' }}>{sub.customer}</p>
                      <p className="text-xs" style={{ color: 'rgba(44,36,22,0.55)' }}>#{sub.num} · {sub.service}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                      <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: 'rgba(44,36,22,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${sub.progress}%`, background: 'linear-gradient(90deg, #FF8170, #E8543D)' }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: 'rgba(44,36,22,0.55)' }}>{sub.step}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social Proof Bar ─── */}
      <section className="py-12 px-5 sm:px-8" style={{ borderTop: '1px solid rgba(44,36,22,0.04)', borderBottom: '1px solid rgba(44,36,22,0.04)' }}>
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-16">
          {[
            { value: '2,400+', label: 'Cards tracked' },
            { value: '150+', label: 'Submissions managed' },
            { value: '99.9%', label: 'Uptime' },
            { value: '< 2min', label: 'Setup time' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl sm:text-3xl font-black" style={{ color: '#2C2416' }}>{stat.value}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: 'rgba(44,36,22,0.55)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      </>}

      {/* ─── Customer Portal Tab ─── */}
      {activeTab === 'portal' && <section className="pt-36 sm:pt-44 pb-20 sm:pb-28 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden" style={{ background: '#1A1714', boxShadow: '0 32px 80px rgba(0,0,0,0.15)' }}>
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.06]"
              style={{ background: 'radial-gradient(circle, #FF8170, transparent)', filter: 'blur(40px)', transform: 'translate(30%, -40%)' }} />

            <div className="relative z-10 grid md:grid-cols-2 gap-10 p-8 sm:p-12 lg:p-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-6"
                  style={{ background: 'rgba(255,129,112,0.12)', color: '#FF8170', border: '1px solid rgba(255,129,112,0.2)' }}>
                  <Package className="w-3.5 h-3.5" />
                  Customer Portal
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
                  Track your cards
                </h2>
                <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(255,248,240,0.5)' }}>
                  Enter your shop's 4-digit code to check on your PSA submissions, view grades, and see when your cards are ready for pickup.
                </p>
                <div className="flex items-center gap-5 text-sm" style={{ color: 'rgba(255,248,240,0.35)' }}>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Real-time tracking
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Grade updates
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
                  style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', boxShadow: '0 8px 24px rgba(255,107,89,0.25)' }}>
                  <Store className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Enter Shop Code</h3>
                <p className="text-xs mb-5" style={{ color: 'rgba(255,248,240,0.35)' }}>Ask your card shop for their 4-digit code</p>

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
                      className="w-14 h-16 sm:w-16 sm:h-20 rounded-2xl text-center text-2xl sm:text-3xl font-black transition-all"
                      style={{
                        background: shopCode[i] ? 'rgba(255,129,112,0.1)' : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${shopCode[i] ? 'rgba(255,129,112,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: '#fff',
                        outline: 'none',
                      }}
                    />
                  ))}
                </div>

                {shopError && (
                  <div className="flex items-center gap-2 justify-center mb-3 text-xs font-semibold text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5" />{shopError}
                  </div>
                )}
                {shopLoading && (
                  <div className="flex items-center gap-2 justify-center mb-3">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#FF8170' }} />
                    <span className="text-sm font-semibold" style={{ color: 'rgba(255,248,240,0.5)' }}>Looking up shop...</span>
                  </div>
                )}
                {shopFound && (
                  <div className="flex items-center gap-2 justify-center mb-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-bold text-green-400">{shopFound.name}</span>
                  </div>
                )}

                <p className="text-[11px] mt-4" style={{ color: 'rgba(255,248,240,0.25)' }}>
                  The code is on your receipt or the QR poster in-store
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      }

      {/* ─── Features Tab ─── */}
      {activeTab === 'features' && <><section className="pt-36 sm:pt-44 pb-20 sm:pb-28 px-5 sm:px-8" style={{ background: '#F8F4EF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#FF8170' }}>Features</p>
            <h2 className="text-3xl sm:text-5xl font-black leading-tight mb-5" style={{ color: '#2C2416' }}>
              Everything you need to run<br className="hidden sm:block" /> your grading business
            </h2>
            <p className="text-base sm:text-lg max-w-xl mx-auto" style={{ color: 'rgba(44,36,22,0.5)' }}>
              Built by card shop owners who were tired of spreadsheets and sticky notes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div key={i} className="group rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(44,36,22,0.05)', boxShadow: '0 1px 3px rgba(44,36,22,0.03)' }}>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#2C2416' }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(44,36,22,0.5)' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20 sm:py-28 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#FF8170' }}>How It Works</p>
            <h2 className="text-3xl sm:text-5xl font-black leading-tight" style={{ color: '#2C2416' }}>
              Up and running in minutes
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              { step: '01', title: 'Add your submission', desc: 'Enter a PSA order number. SlabDash starts tracking it instantly.' },
              { step: '02', title: 'Link your customers', desc: 'Assign customers to submissions. They get their own portal link automatically.' },
              { step: '03', title: 'Relax', desc: 'Status updates, email notifications, and customer portals — all handled for you.' },
            ].map((item, i) => (
              <div key={i} className="text-center sm:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5 text-lg font-black"
                  style={{ background: 'rgba(255,129,112,0.08)', color: '#FF8170' }}>
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#2C2416' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(44,36,22,0.5)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      </>}

      {/* ─── Pricing Tab ─── */}
      {activeTab === 'pricing' && <section className="pt-36 sm:pt-44 pb-20 sm:pb-28 px-5 sm:px-8" style={{ background: '#F8F4EF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{ background: 'rgba(16,185,129,0.08)', color: '#065f46', border: '1px solid rgba(16,185,129,0.15)' }}>
              <Zap className="w-3.5 h-3.5" /> Free During Early Access
            </div>
            <h2 className="text-3xl sm:text-5xl font-black leading-tight mb-5" style={{ color: '#2C2416' }}>
              Simple, transparent pricing
            </h2>
            <p className="text-base sm:text-lg max-w-xl mx-auto" style={{ color: 'rgba(44,36,22,0.5)' }}>
              These are our planned prices — right now everything is <strong style={{ color: '#2C2416' }}>completely free</strong>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 lg:gap-6 items-start max-w-3xl mx-auto">
            {pricing.map((plan) => (
              <div key={plan.id}
                className={`relative rounded-2xl p-7 sm:p-8 transition-all duration-300 ${plan.popular ? 'md:-mt-4 md:mb-0' : ''}`}
                style={{
                  background: plan.popular
                    ? 'linear-gradient(135deg, #1A1714, #2C2416)'
                    : 'rgba(255,255,255,0.8)',
                  border: plan.popular
                    ? '1px solid rgba(255,129,112,0.3)'
                    : '1px solid rgba(44,36,22,0.06)',
                  boxShadow: plan.popular
                    ? '0 24px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,129,112,0.1)'
                    : '0 1px 3px rgba(44,36,22,0.03)',
                }}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', color: '#fff', boxShadow: '0 4px 12px rgba(255,107,89,0.4)' }}>
                      <Star className="w-3 h-3 fill-current" /> Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-black mb-2" style={{ color: plan.popular ? '#fff' : '#2C2416' }}>
                    {plan.name}
                  </h3>
                  <p className="text-sm leading-relaxed mb-5" style={{ color: plan.popular ? 'rgba(255,248,240,0.5)' : 'rgba(44,36,22,0.45)' }}>
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-black" style={{ color: plan.popular ? '#fff' : '#2C2416' }}>${plan.price}</span>
                    <span className="text-sm font-semibold" style={{ color: plan.popular ? 'rgba(255,248,240,0.5)' : 'rgba(44,36,22,0.5)' }}>/{plan.period}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all mb-6"
                  style={plan.popular
                    ? { background: 'linear-gradient(135deg, #FF8170, #E8543D)', color: '#fff', boxShadow: '0 4px 16px rgba(255,107,89,0.35)' }
                    : { background: 'rgba(44,36,22,0.04)', color: '#2C2416' }
                  }>
                  {plan.cta}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: plan.popular ? '#FF8170' : '#10b981' }} />
                      <span className="text-sm" style={{ color: plan.popular ? 'rgba(255,248,240,0.7)' : 'rgba(44,36,22,0.6)' }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Early access box */}
          <div className="max-w-2xl mx-auto mt-12 rounded-2xl p-6 sm:p-8 text-center"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(44,36,22,0.06)' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
              style={{ background: 'rgba(16,185,129,0.08)', color: '#065f46' }}>
              <Zap className="w-3 h-3" /> Early Access — 100% Free
            </div>
            <h3 className="text-lg font-black mb-2" style={{ color: '#2C2416' }}>We're in early access</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(44,36,22,0.5)' }}>
              Sign up free, use every feature with no limits. When paid plans launch, early users get the best deal.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold" style={{ color: 'rgba(44,36,22,0.5)' }}>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> No usage limits</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> All features included</span>
            </div>
          </div>
        </div>
      </section>

      }

      {/* ─── FAQ & Reviews Tab ─── */}
      {activeTab === 'faq' && <><section className="pt-36 sm:pt-44 pb-12 sm:pb-16 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#FF8170' }}>Testimonials</p>
            <h2 className="text-3xl sm:text-5xl font-black leading-tight" style={{ color: '#2C2416' }}>
              Trusted by card shops
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl p-6 sm:p-7"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(44,36,22,0.05)' }}>
                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(44,36,22,0.65)' }}>
                  "{t.quote}"
                </p>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#2C2416' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(44,36,22,0.55)' }}>{t.business}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20 sm:py-28 px-5 sm:px-8" style={{ background: '#F8F4EF' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <img src="/images/SAM_V2.png" alt="SAM" className="h-20 w-20"
                onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: '#2C2416' }}>
              Questions? SAM has answers.
            </h2>
            <p className="text-sm" style={{ color: 'rgba(44,36,22,0.45)' }}>
              Everything you need to know about SlabDash
            </p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl overflow-hidden transition-all"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(44,36,22,0.05)' }}>
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="text-sm font-bold pr-4" style={{ color: '#2C2416' }}>{faq.question}</span>
                  <ChevronDown
                    className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                    style={{ color: 'rgba(44,36,22,0.5)', transform: openFaqIndex === i ? 'rotate(180deg)' : 'rotate(0)' }}
                  />
                </button>
                <div className="overflow-hidden transition-all duration-200"
                  style={{ maxHeight: openFaqIndex === i ? '200px' : '0', opacity: openFaqIndex === i ? 1 : 0 }}>
                  <p className="px-5 pb-5 text-sm leading-relaxed" style={{ color: 'rgba(44,36,22,0.55)' }}>
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setShowDemo(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', boxShadow: '0 4px 16px rgba(255,107,89,0.3)' }}>
              <PlayCircle className="w-4 h-4" /> Watch Interactive Demo
            </button>
          </div>
        </div>
      </section>

      </>}

      {/* ─── Final CTA ─── */}
      <section className="py-24 sm:py-32 px-5 sm:px-8 relative overflow-hidden" style={{ background: '#1A1714' }}>
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #FF8170, transparent)', filter: 'blur(100px)' }} />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #E8543D, transparent)', filter: 'blur(80px)' }} />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight text-white mb-6">
            Ready to ditch the spreadsheet?
          </h2>
          <p className="text-base sm:text-lg mb-10" style={{ color: 'rgba(255,248,240,0.45)' }}>
            Join the card shops already using SlabDash to manage their PSA submissions, keep customers happy, and grow their business.
          </p>
          <button onClick={() => navigate('/register')}
            className="group px-10 py-4 text-base font-bold text-white rounded-2xl transition-all inline-flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', boxShadow: '0 4px 32px rgba(255,107,89,0.4)' }}>
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="mt-5 text-sm" style={{ color: 'rgba(255,248,240,0.25)' }}>
            Free during early access · No credit card · All features included
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 px-5 sm:px-8" style={{ background: '#141210', borderTop: '1px solid rgba(255,248,240,0.04)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-10">
            <div className="sm:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <img src="/images/logo-icon.png.svg" alt="SlabDash" className="h-8 w-8" />
                <span className="text-lg font-black text-white">SlabDash</span>
              </Link>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,248,240,0.35)' }}>
                Professional PSA submission tracking for card shops.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs" style={{ color: 'rgba(255,248,240,0.4)' }}>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link to="/portal" className="hover:text-white transition-colors">Customer Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Company</h4>
              <ul className="space-y-2.5 text-xs" style={{ color: 'rgba(255,248,240,0.4)' }}>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#terms" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#privacy" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Connect</h4>
              <ul className="space-y-2.5 text-xs" style={{ color: 'rgba(255,248,240,0.4)' }}>
                <li><Link to="/login" className="hover:text-white transition-colors">Admin Login</Link></li>
                <li><Link to="/portal" className="hover:text-white transition-colors">Customer Portal</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-6" style={{ borderTop: '1px solid rgba(255,248,240,0.06)' }}>
            <p className="text-xs text-center" style={{ color: 'rgba(255,248,240,0.25)' }}>&copy; 2026 SlabDash. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ─── Floating SAM Button ─── */}
      <div className="fixed bottom-6 right-6 z-40 group">
        <div className="relative">
          <button onClick={() => setShowFAQ(true)}
            className="relative w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)', boxShadow: '0 8px 24px rgba(255,107,89,0.3)' }}>
            <img src="/images/SAM_V2.png" alt="SAM" className="w-12 h-12"
              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-white text-2xl font-bold">?</span>'; }} />
          </button>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: '#FEFCFA' }}>
            <HelpCircle className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="absolute bottom-full mb-3 right-0 bg-white px-3 py-1.5 rounded-lg shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap"
          style={{ border: '1px solid rgba(44,36,22,0.06)' }}>
          <p className="text-xs font-semibold" style={{ color: '#2C2416' }}>Need help? Click me!</p>
        </div>
      </div>

      {/* ─── FAQ Modal ─── */}
      {showFAQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowFAQ(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 p-5 flex items-center justify-between z-10"
              style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)' }}>
              <div className="flex items-center gap-3">
                <img src="/images/SAM_V2.png" alt="SAM" className="w-12 h-12"
                  onError={(e) => { e.target.style.display = 'none'; }} />
                <div>
                  <h2 className="text-lg font-black text-white">Frequently Asked Questions</h2>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(255,248,240,0.7)' }}>SAM is here to help!</p>
                </div>
              </div>
              <button onClick={() => setShowFAQ(false)} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {faqs.map((faq, i) => (
                <details key={i} className="group rounded-xl overflow-hidden" style={{ background: '#F8F4EF', border: '1px solid rgba(44,36,22,0.06)' }}>
                  <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                    <h3 className="text-sm font-bold" style={{ color: '#2C2416' }}>{faq.question}</h3>
                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" style={{ color: '#FF8170' }} />
                  </summary>
                  <div className="px-4 pb-4">
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(44,36,22,0.6)' }}>{faq.answer}</p>
                  </div>
                </details>
              ))}
              <div className="pt-3 text-center">
                <button onClick={() => { setShowFAQ(false); setShowDemo(true); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)' }}>
                  <PlayCircle className="w-4 h-4" /> Watch Interactive Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Interactive Demo Modal ─── */}
      {showDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => { setShowDemo(false); setDemoStep(0); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 flex items-center justify-between shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)' }}>
              <div>
                <h2 className="text-lg font-black text-white">{demoSteps[demoStep].title}</h2>
                <p className="text-xs font-semibold" style={{ color: 'rgba(255,248,240,0.75)' }}>{demoSteps[demoStep].description}</p>
              </div>
              <button onClick={() => { setShowDemo(false); setDemoStep(0); }}
                className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors shrink-0 ml-3">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5" style={{ background: '#FAF5EF' }}>
              <DemoScreen step={demoStep} />
            </div>

            <div className="p-4 flex items-center justify-between shrink-0"
              style={{ borderTop: '1px solid rgba(44,36,22,0.06)', background: '#FBF7F2' }}>
              <div className="flex gap-1.5">
                {demoSteps.map((_, i) => (
                  <button key={i} onClick={() => setDemoStep(i)} className="p-0 border-0 bg-transparent cursor-pointer">
                    <div style={{ width: i === demoStep ? 20 : 6, height: 6, borderRadius: 3,
                      background: i <= demoStep ? '#FF8170' : 'rgba(44,36,22,0.08)', transition: 'all 0.3s' }} />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {demoStep > 0 && (
                  <button onClick={() => setDemoStep(demoStep - 1)}
                    className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(44,36,22,0.04)', color: '#2C2416' }}>
                    Back
                  </button>
                )}
                {demoStep < demoSteps.length - 1 ? (
                  <button onClick={() => setDemoStep(demoStep + 1)}
                    className="px-5 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #FF8170, #E8543D)' }}>
                    {demoSteps[demoStep].action} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button onClick={() => navigate('/register')}
                    className="px-5 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    {demoSteps[demoStep].action} <ArrowRight className="w-3.5 h-3.5" />
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

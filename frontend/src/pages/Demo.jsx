import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Users, CreditCard, CheckCircle2, ArrowRight, ArrowLeft,
  BarChart3, Bell, Eye, RefreshCw, Search, ChevronDown, ChevronRight,
  Mail, QrCode, TrendingUp, Zap, Star, Shield, Loader2, Clock,
  Hash, AlertCircle, FileText, DollarSign, Sparkles, X
} from 'lucide-react';

// ─── Sample Data ───────────────────────────────────────────────
const DEMO_CUSTOMERS = [
  { id: 1, name: 'Marcus Rivera', email: 'marcus@email.com', cards: 24, active: 2 },
  { id: 2, name: 'Jen Park', email: 'jen.park@email.com', cards: 42, active: 1 },
  { id: 3, name: 'Tommy Chen', email: 'tommy.c@email.com', cards: 6, active: 1 },
  { id: 4, name: 'Sarah Williams', email: 'sarah.w@email.com', cards: 15, active: 1 },
  { id: 5, name: 'Alex Kim', email: 'alex.kim@email.com', cards: 31, active: 0 },
];

const DEMO_SUBMISSIONS = [
  {
    id: 1, psa_number: '86241907', customer: 'Marcus Rivera', customerId: 1,
    cards: 18, service: 'Express', step: 'Grading', progress: 62, daysIn: 8,
    created: '2026-02-11', estimated: '2026-02-22',
    cardList: [
      { name: '2023 Topps Chrome Ohtani #1', cert: '89234561', grade: null },
      { name: '2024 Prizm Wemby Silver #280', cert: '89234562', grade: null },
      { name: '2022 Bowman Chrome Holliday #BCP-1', cert: '89234563', grade: null },
      { name: '2023 Select Trevor Lawrence #12', cert: '89234564', grade: null },
      { name: '2024 Topps Series 1 Ohtani #1', cert: '89234565', grade: null },
    ]
  },
  {
    id: 2, psa_number: '86239214', customer: 'Jen Park', customerId: 2,
    cards: 42, service: 'Regular', step: 'Research & ID', progress: 35, daysIn: 22,
    created: '2026-01-28', estimated: '2026-03-15',
    cardList: [
      { name: '1986 Fleer Michael Jordan #57', cert: '89234570', grade: null },
      { name: '2003 Topps Chrome LeBron RC #111', cert: '89234571', grade: null },
      { name: '1993 SP Foil Derek Jeter #279', cert: '89234572', grade: null },
    ]
  },
  {
    id: 3, psa_number: '86237801', customer: 'Tommy Chen', customerId: 3,
    cards: 6, service: 'Super Express', step: 'Assembly', progress: 82, daysIn: 4,
    created: '2026-02-15', estimated: '2026-02-20',
    cardList: [
      { name: '2024 Panini Prizm Caleb Williams RC', cert: '89234580', grade: 'PSA 10' },
      { name: '2024 Topps Chrome Elly De La Cruz', cert: '89234581', grade: 'PSA 9' },
      { name: '2023 Bowman Chrome Skenes RC', cert: '89234582', grade: 'PSA 10' },
      { name: '2024 Select Justin Jefferson #1', cert: '89234583', grade: 'PSA 10' },
      { name: '2024 Prizm Chet Holmgren Silver', cert: '89234584', grade: 'PSA 8' },
      { name: '2023 Topps Chrome Corbin Carroll', cert: '89234585', grade: 'PSA 9' },
    ]
  },
  {
    id: 4, psa_number: '86235500', customer: 'Sarah Williams', customerId: 4,
    cards: 15, service: 'Regular', step: 'Grades Ready', progress: 95, daysIn: 35,
    created: '2026-01-15', estimated: '2026-02-18',
    gradesReady: true, pickupCode: 'S7K-2MP',
    cardList: [
      { name: '2024 Topps Chrome Ohtani Refractor', cert: '89234590', grade: 'PSA 10' },
      { name: '2023 Bowman 1st Ethan Salas', cert: '89234591', grade: 'PSA 9' },
      { name: '2024 Prizm Caitlin Clark RC #1', cert: '89234592', grade: 'PSA 10' },
      { name: '2023 Select Tyrese Maxey Scope', cert: '89234593', grade: 'PSA 8' },
    ]
  },
  {
    id: 5, psa_number: '86233100', customer: 'Marcus Rivera', customerId: 1,
    cards: 6, service: 'Express', step: 'Received', progress: 10, daysIn: 2,
    created: '2026-02-17', estimated: '2026-03-01',
    cardList: [
      { name: '2024 Panini National Treasures Patch Auto', cert: null, grade: null },
      { name: '2023 Topps Update Ohtani ASG #US1', cert: null, grade: null },
    ]
  },
];

const PIPELINE = ['Received', 'Research & ID', 'Grading', 'Assembly', 'Grades Ready'];

const ACTIVITY_FEED = [
  { icon: '🎯', text: "Sarah Williams — Grades ready! 15 cards graded.", time: '2 hours ago', type: 'grades' },
  { icon: '📦', text: "Tommy Chen's order moved to Assembly.", time: '4 hours ago', type: 'step' },
  { icon: '🔄', text: "Auto-refresh: 5 submissions updated.", time: '6 hours ago', type: 'refresh' },
  { icon: '👤', text: "New customer: Alex Kim added.", time: 'Yesterday', type: 'customer' },
  { icon: '📧', text: "Email sent to Jen Park — step update.", time: 'Yesterday', type: 'email' },
  { icon: '🚚', text: "Order #86230100 shipped — tracking: 1Z999AA1082.", time: '2 days ago', type: 'shipped' },
];

const coralGrad = 'linear-gradient(135deg, #FF8170 0%, #E8543D 100%)';
const cream = '#FBF7F2';
const tan = '#F5EDE4';

// ─── Component ────────────────────────────────────────────────
export default function Demo() {
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard'); // dashboard | submissions | detail | portal | notifications
  const [selectedSub, setSelectedSub] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBanner, setShowBanner] = useState(true);

  const stepIndex = (step) => PIPELINE.indexOf(step);

  const filteredSubmissions = DEMO_SUBMISSIONS.filter(s =>
    !searchQuery ||
    s.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.psa_number.includes(searchQuery)
  );

  const fakeRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const openDetail = (sub) => {
    setSelectedSub(sub);
    setView('detail');
  };

  // ─── Sidebar Nav ───
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'submissions', label: 'Submissions', icon: Package },
    { id: 'portal', label: 'Customer Portal', icon: Eye },
    { id: 'notifications', label: 'Activity Feed', icon: Bell },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: cream }}>
      {/* ─── Demo Banner ─── */}
      {showBanner && (
        <div className="relative z-50 text-center py-2.5 px-4" style={{ background: coralGrad }}>
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="w-4 h-4 text-white/80 hidden sm:block" />
            <p className="text-sm font-bold text-white">
              You're exploring the SlabDash interactive demo — this is sample data
            </p>
            <Link to="/register"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              Sign Up Free <ArrowRight className="w-3 h-3" />
            </Link>
            <button onClick={() => setShowBanner(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar ─── */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r" style={{ background: '#fff', borderColor: 'rgba(44,36,22,0.06)' }}>
          <div className="p-5 flex items-center gap-2">
            <img src="/images/logo-icon.png.svg" alt="SlabDash" className="h-8 w-8" />
            <span className="text-lg font-black" style={{ color: '#2C2416' }}>SlabDash</span>
          </div>
          <div className="px-3 mb-2">
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(16,185,129,0.08)', color: '#065f46' }}>
              Demo Mode
            </div>
          </div>
          <nav className="flex-1 px-3 space-y-0.5">
            {navItems.map((item) => {
              const active = view === item.id || (view === 'detail' && item.id === 'submissions');
              return (
                <button key={item.id} onClick={() => { setView(item.id); setSelectedSub(null); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: active ? 'rgba(255,129,112,0.08)' : 'transparent',
                    color: active ? '#E8543D' : 'rgba(44,36,22,0.55)',
                  }}>
                  <item.icon className="w-4.5 h-4.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="p-4">
            <Link to="/register"
              className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: coralGrad }}>
              Get Started Free
            </Link>
          </div>
        </aside>

        {/* ─── Mobile Nav ─── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t"
          style={{ background: '#fff', borderColor: 'rgba(44,36,22,0.08)' }}>
          {navItems.map((item) => {
            const active = view === item.id || (view === 'detail' && item.id === 'submissions');
            return (
              <button key={item.id} onClick={() => { setView(item.id); setSelectedSub(null); }}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-all"
                style={{ color: active ? '#E8543D' : 'rgba(44,36,22,0.4)' }}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ─── Main Content ─── */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {/* ═══ DASHBOARD ═══ */}
          {view === 'dashboard' && (
            <div className="p-5 sm:p-8 max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black" style={{ color: '#2C2416' }}>Dashboard</h1>
                  <p className="text-sm mt-1" style={{ color: 'rgba(44,36,22,0.5)' }}>Welcome back — here's what's happening today.</p>
                </div>
                <button onClick={fakeRefresh} disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: coralGrad }}>
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh All'}
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {[
                  { label: 'Active Cards', value: '87', sub: '+6 this week', icon: CreditCard, color: '#2C2416' },
                  { label: 'Submissions', value: '5', sub: '3 in progress', icon: Package, color: '#FF8170' },
                  { label: 'Customers', value: '5', sub: '2 new this month', icon: Users, color: '#8B5CF6' },
                  { label: 'Grades Ready', value: '15', sub: 'Ready for pickup', icon: CheckCircle2, color: '#10b981' },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl p-4 sm:p-5 transition-all hover:-translate-y-0.5"
                    style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.05)', boxShadow: '0 1px 3px rgba(44,36,22,0.03)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}12` }}>
                        <s.icon className="w-4 h-4" style={{ color: s.color }} />
                      </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: 'rgba(44,36,22,0.45)' }}>{s.label}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'rgba(44,36,22,0.35)' }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Recent Submissions + Activity */}
              <div className="grid lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 rounded-2xl overflow-hidden"
                  style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.05)' }}>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(44,36,22,0.04)' }}>
                    <p className="text-sm font-bold" style={{ color: '#2C2416' }}>Recent Submissions</p>
                    <button onClick={() => setView('submissions')}
                      className="text-xs font-bold flex items-center gap-1" style={{ color: '#FF8170' }}>
                      View all <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {DEMO_SUBMISSIONS.slice(0, 4).map((sub, i) => (
                    <button key={sub.id} onClick={() => openDetail(sub)}
                      className="w-full px-5 py-3.5 flex items-center gap-4 text-left transition-colors hover:bg-[rgba(44,36,22,0.015)]"
                      style={{ borderBottom: i < 3 ? '1px solid rgba(44,36,22,0.03)' : 'none' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                        style={{ background: coralGrad }}>
                        {sub.cards}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#2C2416' }}>{sub.customer}</p>
                        <p className="text-xs" style={{ color: 'rgba(44,36,22,0.5)' }}>#{sub.psa_number} · {sub.service}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: 'rgba(44,36,22,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${sub.progress}%`, background: coralGrad }} />
                        </div>
                        <span className="text-xs font-semibold w-20 text-right" style={{ color: 'rgba(44,36,22,0.55)' }}>{sub.step}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Activity Feed */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.05)' }}>
                  <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(44,36,22,0.04)' }}>
                    <p className="text-sm font-bold" style={{ color: '#2C2416' }}>Activity</p>
                  </div>
                  <div className="p-3 space-y-0.5">
                    {ACTIVITY_FEED.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-[rgba(44,36,22,0.02)] transition-colors">
                        <span className="text-base mt-0.5">{a.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed" style={{ color: 'rgba(44,36,22,0.65)' }}>{a.text}</p>
                          <p className="text-[11px] mt-1" style={{ color: 'rgba(44,36,22,0.35)' }}>{a.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SUBMISSIONS LIST ═══ */}
          {view === 'submissions' && (
            <div className="p-5 sm:p-8 max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black" style={{ color: '#2C2416' }}>Submissions</h1>
                <button onClick={fakeRefresh} disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: coralGrad }}>
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh All'}
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(44,36,22,0.35)' }} />
                <input type="text" placeholder="Search by customer or PSA number..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                  style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.08)', color: '#2C2416' }} />
              </div>

              {/* Submission Cards */}
              <div className="space-y-3">
                {filteredSubmissions.map((sub) => {
                  const si = stepIndex(sub.step);
                  return (
                    <button key={sub.id} onClick={() => openDetail(sub)}
                      className="w-full rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5"
                      style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.05)', boxShadow: '0 1px 3px rgba(44,36,22,0.03)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white"
                            style={{ background: coralGrad }}>{sub.cards}</div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: '#2C2416' }}>{sub.customer}</p>
                            <p className="text-xs" style={{ color: 'rgba(44,36,22,0.5)' }}>#{sub.psa_number} · {sub.service} · Day {sub.daysIn}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.gradesReady && (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ background: 'rgba(16,185,129,0.08)', color: '#065f46' }}>
                              Grades Ready
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4" style={{ color: 'rgba(44,36,22,0.3)' }} />
                        </div>
                      </div>
                      {/* Pipeline */}
                      <div className="flex items-center gap-1">
                        {PIPELINE.map((step, j) => (
                          <div key={j} className="flex-1">
                            <div className="h-1.5 rounded-full" style={{
                              background: j <= si ? (j === si ? coralGrad : '#FF8170') : 'rgba(44,36,22,0.06)',
                            }} />
                            <p className="text-[9px] font-semibold mt-1.5 text-center" style={{
                              color: j === si ? '#E8543D' : j < si ? '#2C2416' : 'rgba(44,36,22,0.35)'
                            }}>{step}</p>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ SUBMISSION DETAIL ═══ */}
          {view === 'detail' && selectedSub && (
            <div className="p-5 sm:p-8 max-w-4xl mx-auto">
              <button onClick={() => setView('submissions')}
                className="flex items-center gap-2 text-sm font-semibold mb-5" style={{ color: 'rgba(44,36,22,0.5)' }}>
                <ArrowLeft className="w-4 h-4" /> Back to submissions
              </button>

              {/* Header */}
              <div className="rounded-2xl overflow-hidden mb-5"
                style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.05)' }}>
                <div className="p-6" style={{ background: coralGrad }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'rgba(255,248,240,0.6)' }}>PSA ORDER</p>
                      <p className="text-2xl font-black text-white mt-1">#{selectedSub.psa_number}</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                      {selectedSub.service}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Pipeline */}
                  <div className="flex items-center gap-2 mb-6">
                    {PIPELINE.map((step, j) => {
                      const si = stepIndex(selectedSub.step);
                      const done = j < si;
                      const active = j === si;
                      return (
                        <div key={j} className="flex-1 flex flex-col items-center">
                          <div className="flex items-center justify-center transition-all" style={{
                            width: active ? 32 : 24, height: active ? 32 : 24, borderRadius: '50%',
                            background: done ? '#FF8170' : active ? coralGrad : tan,
                            border: active ? '3px solid rgba(255,129,112,0.25)' : 'none',
                          }}>
                            {done && <CheckCircle2 size={14} color="#fff" />}
                            {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                          </div>
                          <p className="text-[10px] font-semibold mt-2" style={{
                            color: active ? '#E8543D' : done ? '#2C2416' : 'rgba(44,36,22,0.4)'
                          }}>{step}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: tan }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${selectedSub.progress}%`, background: coralGrad }} />
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Customer', value: selectedSub.customer },
                      { label: 'Cards', value: selectedSub.cards },
                      { label: 'Days In', value: selectedSub.daysIn },
                      { label: 'Progress', value: `${selectedSub.progress}%` },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl p-3 text-center" style={{ background: tan }}>
                        <p className="text-lg font-black" style={{ color: '#2C2416' }}>{item.value}</p>
                        <p className="text-[10px] font-semibold" style={{ color: 'rgba(44,36,22,0.5)' }}>{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {selectedSub.gradesReady && selectedSub.pickupCode && (
                    <div className="mt-4 rounded-xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#065f46' }}>PICKUP CODE</p>
                      <p className="text-3xl font-black font-mono" style={{ color: '#2C2416', letterSpacing: 4 }}>{selectedSub.pickupCode}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cards List */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.05)' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(44,36,22,0.04)' }}>
                  <p className="text-sm font-bold" style={{ color: '#2C2416' }}>Cards ({selectedSub.cardList.length} of {selectedSub.cards})</p>
                </div>
                {selectedSub.cardList.map((card, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center justify-between"
                    style={{ borderBottom: i < selectedSub.cardList.length - 1 ? '1px solid rgba(44,36,22,0.03)' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                        style={{ background: card.grade ? 'rgba(16,185,129,0.08)' : tan, color: card.grade ? '#065f46' : 'rgba(44,36,22,0.5)' }}>
                        {card.grade ? card.grade.replace('PSA ', '') : '—'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#2C2416' }}>{card.name}</p>
                        {card.cert && <p className="text-[11px]" style={{ color: 'rgba(44,36,22,0.4)' }}>Cert #{card.cert}</p>}
                      </div>
                    </div>
                    {card.grade && (
                      <span className="px-2 py-1 rounded-lg text-[11px] font-bold"
                        style={{
                          background: card.grade === 'PSA 10' ? 'rgba(16,185,129,0.08)' : 'rgba(255,129,112,0.08)',
                          color: card.grade === 'PSA 10' ? '#065f46' : '#E8543D',
                        }}>
                        {card.grade}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ PORTAL PREVIEW ═══ */}
          {view === 'portal' && (
            <div className="p-5 sm:p-8 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black" style={{ color: '#2C2416' }}>Customer Portal Preview</h1>
                <p className="text-sm mt-1" style={{ color: 'rgba(44,36,22,0.5)' }}>This is what your customers see when they check on their cards.</p>
              </div>

              {/* Portal Header */}
              <div className="rounded-2xl overflow-hidden mb-5" style={{ background: '#1A1714', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                <div className="p-6 text-center" style={{ background: coralGrad }}>
                  <p className="text-xs font-bold" style={{ color: 'rgba(255,248,240,0.6)' }}>CUSTOMER PORTAL</p>
                  <p className="text-2xl font-black text-white mt-1">Marcus Rivera</p>
                  <p className="text-xs mt-2" style={{ color: 'rgba(255,248,240,0.5)' }}>2 active submissions · 24 cards</p>
                </div>

                <div className="p-5 space-y-4">
                  {DEMO_SUBMISSIONS.filter(s => s.customerId === 1).map((sub) => {
                    const si = stepIndex(sub.step);
                    return (
                      <div key={sub.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-bold text-white">Order #{sub.psa_number}</p>
                            <p className="text-xs" style={{ color: 'rgba(255,248,240,0.4)' }}>{sub.cards} cards · {sub.service}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                            style={{ background: 'rgba(255,129,112,0.12)', color: '#FF8170' }}>
                            {sub.step}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {PIPELINE.map((_, j) => (
                            <div key={j} className="flex-1 h-1.5 rounded-full" style={{
                              background: j <= si ? '#FF8170' : 'rgba(255,255,255,0.08)',
                            }} />
                          ))}
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,248,240,0.5)' }}>
                            Day {sub.daysIn}
                          </span>
                          <span className="text-[11px] font-semibold" style={{ color: '#FF8170' }}>
                            {sub.progress}% complete
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pickup Code Preview */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.05)' }}>
                <div className="p-5 text-center" style={{ background: 'rgba(16,185,129,0.04)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#065f46' }}>READY FOR PICKUP</p>
                  <p className="text-lg font-black" style={{ color: '#2C2416' }}>Sarah Williams</p>
                </div>
                <div className="p-6 text-center">
                  <div className="rounded-xl p-5 mb-4" style={{ background: tan }}>
                    <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(44,36,22,0.5)' }}>PICKUP CODE</p>
                    <p className="text-4xl font-black font-mono tracking-widest" style={{ color: '#2C2416' }}>S7K-2MP</p>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(44,36,22,0.45)' }}>
                    Show this code at the counter to pick up your graded cards.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ACTIVITY / NOTIFICATIONS ═══ */}
          {view === 'notifications' && (
            <div className="p-5 sm:p-8 max-w-3xl mx-auto">
              <h1 className="text-2xl font-black mb-6" style={{ color: '#2C2416' }}>Activity Feed</h1>

              <div className="space-y-2">
                {ACTIVITY_FEED.map((a, i) => (
                  <div key={i} className="rounded-xl p-4 flex items-start gap-4 transition-all hover:-translate-y-0.5"
                    style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.05)' }}>
                    <span className="text-xl mt-0.5">{a.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: '#2C2416' }}>{a.text}</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(44,36,22,0.4)' }}>{a.time}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize"
                      style={{
                        background: a.type === 'grades' ? 'rgba(16,185,129,0.08)' :
                          a.type === 'shipped' ? 'rgba(59,130,246,0.08)' : 'rgba(255,129,112,0.08)',
                        color: a.type === 'grades' ? '#065f46' :
                          a.type === 'shipped' ? '#1d4ed8' : '#E8543D',
                      }}>
                      {a.type}
                    </span>
                  </div>
                ))}
              </div>

              {/* Email Preview */}
              <div className="mt-8 rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid rgba(44,36,22,0.05)' }}>
                <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(44,36,22,0.04)' }}>
                  <Mail className="w-4 h-4" style={{ color: '#FF8170' }} />
                  <p className="text-sm font-bold" style={{ color: '#2C2416' }}>Sample Email Notification</p>
                </div>
                <div className="p-5">
                  <div className="rounded-xl p-5" style={{ background: tan }}>
                    <p className="text-xs font-bold mb-1" style={{ color: 'rgba(44,36,22,0.4)' }}>TO: marcus@email.com</p>
                    <p className="text-xs font-bold mb-3" style={{ color: 'rgba(44,36,22,0.4)' }}>SUBJECT: Your cards are being graded!</p>
                    <div className="rounded-lg p-4" style={{ background: '#fff' }}>
                      <p className="text-sm font-bold mb-2" style={{ color: '#2C2416' }}>Hey Marcus,</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(44,36,22,0.6)' }}>
                        Great news! Your PSA submission #86241907 (18 cards, Express) has moved to <strong>Grading</strong>. We're 62% of the way there.
                      </p>
                      <p className="text-xs mt-3" style={{ color: 'rgba(44,36,22,0.4)' }}>
                        Track your cards anytime at your personal portal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─── Floating CTA ─── */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-40">
        <Link to="/register"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white shadow-lg transition-all hover:scale-105"
          style={{ background: coralGrad, boxShadow: '0 8px 24px rgba(255,107,89,0.35)' }}>
          <Zap className="w-4 h-4" />
          Start Free — It's Real
        </Link>
      </div>
    </div>
  );
}

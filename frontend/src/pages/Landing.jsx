import { useState } from 'react';
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
  Smartphone
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('pro');

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
      icon: CreditCard,
      title: 'Buyback Offers',
      description: 'Create and manage buyback offers for graded cards'
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      description: 'Access your dashboard anywhere on any device'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security for your business data'
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <img
                src="/images/logo-full.svg"
                alt="SlabDash"
                className="h-8"
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-full text-sm font-medium">
              <Zap className="w-4 h-4" />
              Professional PSA Submission Tracking
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
              Manage Your
              <span className="block bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-transparent">
                PSA Submissions
              </span>
              With Ease
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The complete platform for card shops to track PSA submissions, manage customers, and grow your grading business.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => navigate('/register')}
                className="btn btn-primary text-lg px-8 py-3 flex items-center gap-2 group"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-secondary text-lg px-8 py-3"
              >
                Sign In
              </button>
            </div>
            <p className="text-sm text-gray-500">
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Grading Business
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built by card shop owners, for card shop owners
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-lg transition-all group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-brand-500 transition-colors">
                  <feature.icon className="w-6 h-6 text-brand-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that's right for your business
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-8 ${
                  plan.popular
                    ? 'border-brand-500 shadow-xl scale-105'
                    : 'border-gray-200 hover:border-brand-300'
                } transition-all bg-white`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-4 py-1 bg-brand-500 text-white rounded-full text-sm font-medium">
                      <Star className="w-4 h-4" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-500">/{plan.period}</span>
                  </div>
                </div>

                <button
                  className={`w-full mb-6 py-3 px-6 rounded-lg font-medium transition-colors ${
                    plan.popular
                      ? 'bg-brand-500 hover:bg-brand-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                  onClick={() => navigate('/register')}
                >
                  {plan.cta}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Card Shops Nationwide
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers are saying
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-gray-200 bg-white hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-2xl">
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.business}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-brand-500 to-brand-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Ready to Transform Your Grading Business?
          </h2>
          <p className="text-xl mb-8 text-brand-50">
            Join hundreds of card shops already using SlabDash
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="bg-white text-brand-600 hover:bg-gray-50 px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-6 text-brand-100 text-sm">
            No credit card required • 14-day free trial
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link to="/" className="flex items-center mb-4">
                <img
                  src="/images/logo-icon.svg"
                  alt="SlabDash"
                  className="h-8 w-8"
                />
                <span className="text-xl font-bold text-white ml-2">SlabDash</span>
              </Link>
              <p className="text-sm">
                Professional PSA submission tracking for card shops and collectors.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link to="/portal" className="hover:text-white transition-colors">Customer Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#terms" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#privacy" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/login" className="hover:text-white transition-colors">Admin Login</Link></li>
                <li><Link to="/portal" className="hover:text-white transition-colors">Customer Login</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
            <p>&copy; 2026 SlabDash. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

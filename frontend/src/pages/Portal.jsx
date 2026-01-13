import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Package, CheckCircle2, Clock, AlertTriangle, Loader2, CreditCard, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function ProgressBar({ percent }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div className={`h-3 rounded-full transition-all ${percent >= 100 ? 'bg-green-500' : percent >= 50 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${percent}%` }}></div>
    </div>
  );
}

function StatusBadge({ submission }) {
  if (submission.shipped) return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-4 h-4" />Shipped</span>;
  if (submission.problem_order) return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><AlertTriangle className="w-4 h-4" />Needs Attention</span>;
  if (submission.grades_ready) return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"><CheckCircle2 className="w-4 h-4" />Grades Ready</span>;
  return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"><Clock className="w-4 h-4" />{submission.current_step || 'Processing'}</span>;
}

function SubmissionCard({ submission, onClick, isSelected }) {
  return (
    <div onClick={onClick} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold text-lg">{submission.psa_submission_number || submission.internal_id || 'Submission'}</p>
          <p className="text-sm text-gray-500">{submission.service_level || 'Standard'}</p>
        </div>
        <StatusBadge submission={submission} />
      </div>
      <ProgressBar percent={submission.progress_percent || 0} />
      <div className="flex justify-between mt-2 text-sm text-gray-500">
        <span>{submission.progress_percent || 0}% complete</span>
        <span>{submission.card_count || 0} cards</span>
      </div>
    </div>
  );
}

function SubmissionDetail({ submission }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">{submission.psa_submission_number || submission.internal_id}</h2>
          <p className="text-gray-500">{submission.service_level}</p>
        </div>
        <StatusBadge submission={submission} />
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="font-medium">{submission.current_step || 'Processing'}</span>
          <span className="font-bold">{submission.progress_percent || 0}%</span>
        </div>
        <ProgressBar percent={submission.progress_percent || 0} />
      </div>

      {submission.steps?.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Progress Steps</h3>
          <div className="space-y-2">
            {submission.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{i + 1}</span>}
                </div>
                <span className={step.completed ? 'text-gray-900' : 'text-gray-400'}>{step.step_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {submission.cards?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Cards ({submission.cards.length})</h3>
          <div className="space-y-2">
            {submission.cards.map((card) => (
              <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{card.description}</p>
                    {card.psa_cert_number && <p className="text-xs text-gray-500">Cert: {card.psa_cert_number}</p>}
                  </div>
                </div>
                {card.grade && <span className="text-xl font-bold text-green-600">{card.grade}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
        {submission.date_sent && <div><span className="text-gray-500">Sent:</span> <span className="font-medium">{format(new Date(submission.date_sent), 'MMM d, yyyy')}</span></div>}
        {submission.return_tracking && <div><span className="text-gray-500">Tracking:</span> <span className="font-medium">{submission.return_tracking}</span></div>}
      </div>
    </div>
  );
}

export default function Portal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) { setError('Invalid portal link'); setLoading(false); return; }
    fetch(`${API_URL}/portal/access?token=${token}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else { setData(d); if (d.submissions?.length) setSelectedSub(d.submissions[0]); }
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-red-500" /></div>;
  if (error) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="text-center"><AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" /><h1 className="text-xl font-bold mb-2">Access Error</h1><p className="text-gray-600">{error}</p></div></div>;

  const filtered = data.submissions?.filter(s => 
    !search || s.psa_submission_number?.toLowerCase().includes(search.toLowerCase()) || s.internal_id?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center"><span className="text-white font-bold">SD</span></div>
              <div>
                <h1 className="font-bold text-lg">{data.company?.name || 'Card Shop'}</h1>
                <p className="text-sm text-gray-500">Order Tracking</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">{data.customer?.name}</p>
              <p className="text-sm text-gray-500">{data.customer?.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search submissions..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12"><Package className="w-12 h-12 text-gray-300 mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">No Submissions</h2><p className="text-gray-500">You don't have any submissions yet.</p></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-700">Your Submissions ({filtered.length})</h2>
              {filtered.map(sub => (
                <SubmissionCard key={sub.id} submission={sub} onClick={() => setSelectedSub(sub)} isSelected={selectedSub?.id === sub.id} />
              ))}
            </div>
            <div className="lg:col-span-2">
              {selectedSub && <SubmissionDetail submission={selectedSub} />}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-sm text-gray-500">
        Powered by SlabDash
      </footer>
    </div>
  );
}

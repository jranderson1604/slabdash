import { useState, useEffect } from 'react';
import { analytics } from '../api/client';
import {
  BarChart2, TrendingUp, Users, Star, Package, Award,
  Clock, AlertTriangle, CheckCircle, DollarSign, Activity,
} from 'lucide-react';

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data, labelKey, valueKey, color = '#FF8170', height = 160 }) {
  if (!data?.length) return <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data</p>;
  const max = Math.max(...data.map(d => Number(d[valueKey])), 1);
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map((d, i) => {
        const pct = (Number(d[valueKey]) / max) * 100;
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1 h-full justify-end group">
            <div className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color }}>
              {d[valueKey]}
            </div>
            <div
              className="w-full rounded-t-lg transition-all"
              style={{
                height: `${Math.max(pct, 2)}%`,
                background: `linear-gradient(to top, ${color}dd, ${color}88)`,
                minHeight: 4,
              }}
            />
            <div className="text-xs font-semibold text-center leading-none"
              style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
              {d[labelKey]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Horizontal Bar ───────────────────────────────────────────────────────────
function HBar({ label, value, max, color, suffix = '' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold w-20 flex-shrink-0 truncate"
        style={{ color: 'var(--text-body)' }}>{label}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, background: 'rgba(44,36,22,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      </div>
      <span className="text-sm font-bold w-10 text-right flex-shrink-0" style={{ color }}>
        {value}{suffix}
      </span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = '#FF8170', loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}22` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      {loading
        ? <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: 'rgba(44,36,22,0.08)' }} />
        : <p className="text-3xl font-black mb-0.5" style={{ color: 'rgb(var(--dark))' }}>{value ?? '—'}</p>
      }
      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [grades, setGrades] = useState([]);
  const [months, setMonths] = useState([]);
  const [levels, setLevels] = useState([]);
  const [turnaround, setTurnaround] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, gRes, mRes, lRes, tRes, cRes] = await Promise.all([
          analytics.summary(),
          analytics.gradeDistribution(),
          analytics.monthlyTrends(),
          analytics.serviceLevels(),
          analytics.turnaround(),
          analytics.topCustomers(),
        ]);
        setSummary(sRes.data);
        setGrades(gRes.data.grades || []);
        setMonths(mRes.data.months || []);
        setLevels(lRes.data.levels || []);
        setTurnaround(tRes.data.turnaround || []);
        setTopCustomers(cRes.data.customers || []);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const s = summary?.submissions || {};
  const c = summary?.cards || {};
  const rev = summary?.revenue || {};

  // Humanise a YYYY-MM string to "Jan '25"
  const fmtMonth = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]} '${y.slice(2)}`;
  };

  const gradeColors = {
    '10': '#22c55e', '9.5': '#84cc16', '9': '#a3e635',
    '8.5': '#facc15', '8': '#fb923c', '7': '#f97316',
    '6': '#ef4444', '5': '#dc2626',
  };

  const levelColors = ['#FF8170', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

  const totalLevelCount = levels.reduce((sum, l) => sum + Number(l.count), 0);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="font-semibold" style={{ color: 'rgb(var(--dark))' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl" style={{ background: 'var(--hdr-gradient)', boxShadow: 'var(--hdr-shadow)', border: 'var(--hdr-border)' }}>
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full" style={{ background: 'var(--hdr-circle-1)' }} />
        <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full" style={{ background: 'var(--hdr-circle-2)' }} />
        <div className="relative px-6 sm:px-8 py-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--hdr-eyebrow)' }}>Insights</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight" style={{ color: 'var(--hdr-title)' }}>Analytics</h1>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--hdr-sub)' }}>Performance overview across all submissions, grades, and customers</p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Submissions" value={s.total} loading={loading} color="#FF8170" />
        <StatCard icon={Activity} label="Active" value={s.active} sub={`${s.avg_progress ?? 0}% avg progress`} loading={loading} color="#3b82f6" />
        <StatCard icon={CheckCircle} label="Completed" value={s.completed} loading={loading} color="#10b981" />
        <StatCard icon={AlertTriangle} label="Problem Orders" value={s.problem} loading={loading} color="#f59e0b" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Star} label="Total Cards" value={c.total} loading={loading} color="#8b5cf6" />
        <StatCard icon={Award} label="Graded" value={c.graded} sub={c.avg_grade ? `avg PSA ${c.avg_grade}` : undefined} loading={loading} color="#ec4899" />
        <StatCard icon={TrendingUp} label="Gem Mints (10)" value={c.gem_mint} loading={loading} color="#22c55e" />
        <StatCard icon={DollarSign} label="Total Revenue" value={rev.total_revenue ? `$${Number(rev.total_revenue).toLocaleString()}` : '$0'} sub={rev.invoiced_revenue ? `$${Number(rev.invoiced_revenue).toLocaleString()} invoiced` : undefined} loading={loading} color="#f59e0b" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatCard icon={Users} label="Total Customers" value={summary?.customers?.total} loading={loading} color="#06b6d4" />
        <StatCard icon={BarChart2} label="Grades Ready" value={s.grades_ready} loading={loading} color="#6366f1" />
      </div>

      {/* Grade Distribution + Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-black mb-4" style={{ color: 'rgb(var(--dark))' }}>Grade Distribution</h2>
          {loading
            ? <div className="h-40 animate-pulse rounded-xl" style={{ background: 'rgba(44,36,22,0.05)' }} />
            : <BarChart
                data={grades}
                labelKey="grade"
                valueKey="count"
                color="#FF8170"
                height={180}
              />
          }
          {!loading && grades.length > 0 && (
            <div className="mt-4 space-y-2">
              {grades.slice(0, 6).map(g => (
                <HBar
                  key={g.grade}
                  label={`PSA ${g.grade}`}
                  value={Number(g.count)}
                  max={Math.max(...grades.map(x => Number(x.count)))}
                  color={gradeColors[g.grade] || '#FF8170'}
                />
              ))}
            </div>
          )}
          {!loading && grades.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No graded cards yet
            </p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-black mb-4" style={{ color: 'rgb(var(--dark))' }}>Monthly Submissions (12 mo)</h2>
          {loading
            ? <div className="h-40 animate-pulse rounded-xl" style={{ background: 'rgba(44,36,22,0.05)' }} />
            : <BarChart
                data={months.map(m => ({ ...m, label: fmtMonth(m.month) }))}
                labelKey="label"
                valueKey="submissions"
                color="#3b82f6"
                height={180}
              />
          }
          {!loading && months.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No submission data yet
            </p>
          )}
        </div>
      </div>

      {/* Service Levels + Turnaround */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-black mb-4" style={{ color: 'rgb(var(--dark))' }}>Service Level Breakdown</h2>
          {loading
            ? <div className="h-32 animate-pulse rounded-xl" style={{ background: 'rgba(44,36,22,0.05)' }} />
            : levels.length === 0
            ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data</p>
            : <div className="space-y-3">
                {levels.map((l, i) => (
                  <HBar
                    key={l.service_level}
                    label={l.service_level}
                    value={Number(l.count)}
                    max={totalLevelCount}
                    color={levelColors[i % levelColors.length]}
                  />
                ))}
              </div>
          }
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-black mb-1" style={{ color: 'rgb(var(--dark))' }}>Avg Turnaround</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Days from submission date to grades ready, by service level
          </p>
          {loading
            ? <div className="h-32 animate-pulse rounded-xl" style={{ background: 'rgba(44,36,22,0.05)' }} />
            : turnaround.length === 0
            ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                No completed submissions with date data yet
              </p>
            : <div className="space-y-3">
                {turnaround.map((t, i) => (
                  <div key={t.service_level} className="flex items-center justify-between py-2 border-b last:border-0"
                    style={{ borderColor: 'rgba(44,36,22,0.06)' }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'rgb(var(--dark))' }}>{t.service_level}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t.min_days}–{t.max_days} day range · {t.count} submissions
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" style={{ color: levelColors[i % levelColors.length] }} />
                      <span className="text-lg font-black" style={{ color: levelColors[i % levelColors.length] }}>
                        {t.avg_days}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Top Customers */}
      <div className="card p-6">
        <h2 className="text-lg font-black mb-4" style={{ color: 'rgb(var(--dark))' }}>Top Customers by Card Volume</h2>
        {loading
          ? <div className="h-32 animate-pulse rounded-xl" style={{ background: 'rgba(44,36,22,0.05)' }} />
          : topCustomers.length === 0
          ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No customers with assigned cards yet
            </p>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(44,36,22,0.08)' }}>
                    {['Customer', 'Cards', 'Graded', 'Avg Grade'].map(h => (
                      <th key={h} className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((cu, i) => (
                    <tr key={cu.id} style={{ borderBottom: '1px solid rgba(44,36,22,0.05)' }}>
                      <td className="py-2.5 pr-4">
                        <p className="font-semibold" style={{ color: 'rgb(var(--dark))' }}>{cu.name}</p>
                        {cu.email && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cu.email}</p>}
                      </td>
                      <td className="py-2.5 pr-4 font-bold" style={{ color: '#FF8170' }}>{cu.card_count}</td>
                      <td className="py-2.5 pr-4" style={{ color: '#10b981', fontWeight: 600 }}>{cu.graded_count}</td>
                      <td className="py-2.5 font-bold" style={{ color: cu.avg_grade >= 9 ? '#22c55e' : cu.avg_grade >= 7 ? '#f59e0b' : '#ef4444' }}>
                        {cu.avg_grade ? `PSA ${cu.avg_grade}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  );
}

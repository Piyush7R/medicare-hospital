import { useEffect, useState, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const COLORS = ['#0a6e6e', '#e76f51', '#4361ee', '#2a9d8f', '#f0a500', '#6b21a8', '#e63946'];

function KPICard({ icon, label, value, bg, color }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#718096', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Card({ title, children, style = {} }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', ...style }}>
      {title && <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#1a202c' }}>{title}</h3>}
      {children}
    </div>
  );
}

const TABS = [
  { id: 'realtime',     label: '🔴 Real-Time'    },
  { id: 'bookings',     label: '📅 Bookings'     },
  { id: 'packages',     label: '🧪 Packages'     },
  { id: 'demographics', label: '👥 Demographics' },
  { id: 'revenue',      label: '💰 Revenue'      },
  { id: 'feedback',     label: '⭐ Feedback'     },
];

export default function AdminAnalytics() {
  const [tab, setTab]         = useState('realtime');
  const [period, setPeriod]   = useState('30');
  const [data, setData]       = useState({});
  const [loading, setLoading] = useState(true);
  const timerRef = useRef();

  const fetchAll = async (p = period) => {
    setLoading(true);
    try {
      const [b, pk, dm, r, fb, rt] = await Promise.all([
        api.get(`/admin/analytics/bookings?period=${p}`).then(r => r.data).catch(() => ({})),
        api.get('/admin/analytics/packages').then(r => r.data).catch(() => []),
        api.get('/admin/analytics/demographics').then(r => r.data).catch(() => ({})),
        api.get(`/admin/analytics/revenue?period=${p}`).then(r => r.data).catch(() => ({})),
        api.get('/admin/analytics/feedback').then(r => r.data).catch(() => ({})),
        api.get('/admin/analytics/realtime').then(r => r.data).catch(() => ({})),
      ]);
      setData({ bookings: b, packages: pk, demographics: dm, revenue: r, feedback: fb, realtime: rt });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(() => {
      api.get('/admin/analytics/realtime').then(r => setData(d => ({ ...d, realtime: r.data }))).catch(() => {});
    }, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  const { bookings = {}, packages = [], demographics = {}, revenue = {}, feedback = {}, realtime = {} } = data;

  // Prepare chart-ready data
  const dailyBookingData = (bookings.daily_bookings || []).map(d => ({
    date: new Date(d.appointment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    Bookings: d.total,
    Cancelled: d.cancelled || 0,
  }));

  const monthlyRevenueData = (revenue.monthly_revenue || []).map(m => ({
    month: m.month?.slice(5) || m.month,
    Revenue: parseFloat(m.revenue) || 0,
  }));

  const packagePieData = (bookings.package_trends || []).slice(0, 6).map(p => ({
    name: p.package_name || 'Other',
    value: p.total_bookings || 0,
  }));

  const paymentModeData = (revenue.payment_modes || []).map(m => ({
    name: m.mode?.toUpperCase() || 'CASH',
    value: m.count || 0,
    amount: parseFloat(m.total_amount) || 0,
  }));

  const peakDaysData = (bookings.peak_days || []).map(d => ({
    day: d.day_name?.slice(0, 3),
    Bookings: d.total,
  }));

  const packageBarData = (packages || []).slice(0, 8).map(p => ({
    name: p.name?.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    Revenue: parseFloat(p.revenue) || 0,
    Bookings: p.total_bookings || 0,
  }));

  const ageData = (demographics.age_groups || []).map(g => ({
    name: g.age_group,
    Patients: g.count,
  }));

  const genderPieData = (demographics.gender_stats || []).map(g => ({
    name: g.gender || 'Unknown',
    value: g.total_bookings || 0,
  }));

  const feedbackTrendData = (feedback.monthly_ratings || []).map(m => ({
    month: m.month?.slice(5) || m.month,
    Rating: parseFloat(m.avg_rating || 0).toFixed(1),
  }));

  const ratingDistData = (feedback.rating_distribution || []).map(r => ({
    stars: `${r.rating}★`,
    Count: r.count,
  }));

  return (
    <Layout>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e63946', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Admin</div>
        <h1 style={{ fontSize: 28, fontFamily: "'Playfair Display',serif", color: '#1a202c', margin: '0 0 4px' }}>📊 Analytics Dashboard</h1>
        <p style={{ color: '#718096', margin: 0, fontSize: 13 }}>Hospital-wide performance monitoring</p>
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: 6, background: 'white', padding: 5, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: tab === t.id ? '#0a6e6e' : 'transparent', color: tab === t.id ? 'white' : '#718096', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
        {['bookings','revenue'].includes(tab) && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {[['7','7d'],['30','30d'],['90','90d']].map(([v,l]) => (
              <button key={v} onClick={() => { setPeriod(v); fetchAll(v); }}
                style={{ padding: '6px 12px', border: `2px solid ${period===v?'#0a6e6e':'#e2e8f0'}`, borderRadius: 8, background: period===v?'#0a6e6e':'white', color: period===v?'white':'#718096', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p>Loading analytics...</p>
        </div>
      )}

      {/* ── REAL-TIME ── */}
      {!loading && tab === 'realtime' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 10, height: 10, background: '#e63946', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 13, color: '#718096', fontWeight: 600 }}>Live — refreshes every 30s</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            <KPICard icon="🏥" label="Checked-In Today"  value={realtime.checked_in_today || 0} bg="#fff8e8" color="#f0a500" />
            <KPICard icon="✅" label="Completed Today"   value={realtime.completed_today || 0}  bg="#eaf7ef" color="#2a9d8f" />
            <KPICard icon="⏳" label="Pending Arrival"   value={realtime.pending_today || 0}    bg="#eef3ff" color="#4361ee" />
            <KPICard icon="💰" label="Today's Revenue"  value={`₹${realtime.revenue_today || 0}`} bg="#e8f5f5" color="#0a6e6e" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Room Queue Status">
              {!(realtime.room_status?.length) ? <p style={{ color: '#a0aec0' }}>No active rooms</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={realtime.room_status.map(r => ({ name: r.name, Waiting: r.waiting || 0, Done: r.done_today || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Waiting" fill="#f0a500" radius={[4,4,0,0]} />
                    <Bar dataKey="Done"    fill="#2a9d8f" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card title="Today's Summary">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['Checked In',  realtime.checked_in_today || 0, '#f0a500'],
                  ['Completed',   realtime.completed_today || 0,  '#2a9d8f'],
                  ['Pending',     realtime.pending_today || 0,    '#4361ee'],
                ].map(([label, val, color]) => {
                  const total = (realtime.checked_in_today||0) + (realtime.pending_today||0);
                  const pct = total > 0 ? Math.round((val/total)*100) : 0;
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                        <span style={{ color: '#4a5568', fontWeight: 500 }}>{label}</span>
                        <span style={{ fontWeight: 700, color }}>{val}</span>
                      </div>
                      <div style={{ height: 8, background: '#f0f4f8', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── BOOKINGS ── */}
      {!loading && tab === 'bookings' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            <KPICard icon="📅" label="Total Bookings"    value={bookings.total_appts || 0}           bg="#eef3ff" color="#4361ee" />
            <KPICard icon="❌" label="Cancelled"         value={bookings.total_cancelled || 0}        bg="#fff5f5" color="#e63946" />
            <KPICard icon="📊" label="Cancellation Rate" value={`${bookings.cancellation_rate || 0}%`} bg="#fff8e8" color="#f0a500" />
            <KPICard icon="🧪" label="Active Packages"   value={bookings.package_trends?.length || 0} bg="#e8f5f5" color="#0a6e6e" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
            <Card title="Daily Booking Trend">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dailyBookingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Bookings" stroke="#0a6e6e" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Cancelled" stroke="#e63946" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Package Popularity">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={packagePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {packagePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Peak Booking Days">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={peakDaysData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Bookings" fill="#4361ee" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Monthly Bookings">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(bookings.monthly_bookings || []).map(m => ({ month: m.month?.slice(5), Bookings: m.total }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Bookings" fill="#0a6e6e" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}

      {/* ── PACKAGES ── */}
      {!loading && tab === 'packages' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
            <Card title="Package-wise Revenue (₹)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={packageBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => [`₹${v}`, 'Revenue']} />
                  <Bar dataKey="Revenue" fill="#6b21a8" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Bookings per Package">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={packageBarData.map(p => ({ name: p.name, value: p.Bookings }))} cx="50%" cy="50%" outerRadius={100} dataKey="value">
                    {packageBarData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card title="Package Performance Table">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Package', 'Price', 'Bookings', 'Revenue', 'Completed', 'Avg Completion'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', borderBottom: '2px solid #f0f4f8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(packages || []).map((p, i) => (
                  <tr key={i} onMouseEnter={e => e.currentTarget.style.background='#fdf8ff'} onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: '12px' }}>₹{p.price}</td>
                    <td style={{ padding: '12px' }}><span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{p.total_bookings || 0}</span></td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#1a6e3c' }}>₹{p.revenue || 0}</td>
                    <td style={{ padding: '12px' }}><span style={{ background: '#eaf7ef', color: '#2a9d8f', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{p.completed || 0}</span></td>
                    <td style={{ padding: '12px', color: '#718096' }}>{p.avg_completion_minutes ? `${Math.round(p.avg_completion_minutes)} min` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* ── DEMOGRAPHICS ── */}
      {!loading && tab === 'demographics' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
            <Card title="Age Group Distribution">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Patients" fill="#f0a500" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Gender Distribution">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={genderPieData} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {genderPieData.map((_, i) => <Cell key={i} fill={['#0a6e6e','#e76f51','#4361ee'][i % 3]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Blood Group Distribution">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(demographics.blood_groups || []).map(b => ({ name: b.blood_group, Count: b.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Count" fill="#e63946" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card title="Gender-Based Package Preferences">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={
                (() => {
                  const pkgNames = [...new Set((demographics.gender_package_trends || []).map(r => r.package_name))].slice(0, 6);
                  return pkgNames.map(pkg => {
                    const row = { pkg: pkg.length > 14 ? pkg.slice(0,14)+'…' : pkg };
                    (demographics.gender_package_trends || []).filter(r => r.package_name === pkg).forEach(r => { row[r.gender] = r.count; });
                    return row;
                  });
                })()
              }>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="pkg" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Male"   fill="#0a6e6e" radius={[4,4,0,0]} />
                <Bar dataKey="Female" fill="#e76f51" radius={[4,4,0,0]} />
                <Bar dataKey="Other"  fill="#4361ee" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* ── REVENUE ── */}
      {!loading && tab === 'revenue' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            <KPICard icon="💰" label="Total Revenue"      value={`₹${Math.round(revenue.summary?.total_revenue || 0).toLocaleString()}`} bg="#eaf7ef" color="#1a6e3c" />
            <KPICard icon="🧾" label="Total Transactions" value={revenue.summary?.total_transactions || 0} bg="#e8f5f5" color="#0a6e6e" />
            <KPICard icon="📈" label="Avg Transaction"    value={`₹${Math.round(revenue.summary?.avg_transaction || 0)}`} bg="#eef3ff" color="#4361ee" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
            <Card title="Revenue Trends (₹)">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="Revenue" stroke="#0a6e6e" strokeWidth={2.5} dot={{ r: 4, fill: '#0a6e6e' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Payment Mode Split">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={paymentModeData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                    <Cell fill="#2a9d8f" />
                    <Cell fill="#4361ee" />
                    <Cell fill="#6b21a8" />
                  </Pie>
                  <Tooltip formatter={(v, n, p) => [`${v} txns · ₹${p.payload.amount}`, p.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card title="Package-wise Revenue Contribution">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(revenue.package_revenue || []).map(p => ({ name: p.name?.length > 14 ? p.name.slice(0,14)+'…' : p.name, Revenue: parseFloat(p.revenue)||0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="Revenue" radius={[6,6,0,0]}>
                  {(revenue.package_revenue || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* ── FEEDBACK ── */}
      {!loading && tab === 'feedback' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: 'linear-gradient(135deg,#f0a500,#c47d00)', borderRadius: 16, padding: 28, textAlign: 'center', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>Average Rating</div>
              <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{parseFloat(feedback.avg_rating || 0).toFixed(1)}</div>
              <div style={{ fontSize: 24, marginTop: 8 }}>{'★'.repeat(Math.round(feedback.avg_rating || 0))}</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>{feedback.total_feedback || 0} reviews</div>
            </div>

            <Card title="Rating Distribution">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ratingDistData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stars" width={40} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="Count" fill="#f0a500" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Rating Trend Over Time">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={feedbackTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Rating" stroke="#f0a500" strokeWidth={2.5} dot={{ r: 4, fill: '#f0a500' }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Package-wise Ratings">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(feedback.package_ratings || []).map(p => ({ name: p.package_name?.length > 12 ? p.package_name.slice(0,12)+'…' : p.package_name, Rating: parseFloat(p.avg_rating||0).toFixed(1) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Rating" fill="#f0a500" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Recent reviews */}
          <Card title="Recent Patient Feedback" style={{ marginTop: 20 }}>
            {(feedback.recent_feedback || []).slice(0, 5).map(fb => (
              <div key={fb.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #f0f4f8', alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexShrink: 0 }}>
                  {fb.patient_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{fb.patient_name}</span>
                    <span style={{ color: '#f0a500', fontSize: 16 }}>{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>{fb.package_name} · {new Date(fb.appointment_date).toLocaleDateString()}</div>
                  {fb.feedback_text && <div style={{ fontSize: 13, color: '#4a5568', fontStyle: 'italic' }}>"{fb.feedback_text.slice(0, 120)}{fb.feedback_text.length > 120 ? '…' : ''}"</div>}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </Layout>
  );
}
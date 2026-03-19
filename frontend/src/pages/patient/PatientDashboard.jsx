import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function PatientDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [stats, setStats]           = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [upcomingAppts, setUpcoming] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats').then(r => r.data).catch(() => null),
      api.get('/dashboard/notifications').then(r => r.data).catch(() => []),
      api.get('/appointments/my').then(r => r.data).catch(() => []),
    ]).then(([s, n, a]) => {
      setStats(s);
      setNotifications(n.slice(0, 4));
      setUpcoming(a.filter(ap => ['booked','checked_in','in_progress'].includes(ap.status)).slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div style={{ textAlign:'center', padding:60 }}>Loading...</div></Layout>;

  return (
    <Layout>
      {/* Welcome */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Patient Portal</div>
        <h1 style={{ fontSize:28, fontFamily:"'Playfair Display',serif", color:'#1a202c', margin:'0 0 4px' }}>
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color:'#718096', margin:0, fontSize:13 }}>{new Date().toDateString()}</p>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
        {[
          { icon:'📅', label:'Total Appointments', value:stats?.total_appointments || 0,   bg:'#eef3ff', color:'#4361ee' },
          { icon:'⏳', label:'Upcoming',            value:stats?.upcoming_appointments || 0, bg:'#fff8e8', color:'#c47d00' },
          { icon:'✅', label:'Completed',           value:stats?.completed_appointments || 0, bg:'#eaf7ef', color:'#2a9d8f' },
          { icon:'📋', label:'Reports Available',   value:stats?.total_reports || 0,         bg:'#e8f5f5', color:'#0a6e6e' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#718096' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24 }}>

        {/* ── Left column ── */}
        <div>

          {/* Live track banner */}
          {upcomingAppts.some(a => ['checked_in','in_progress'].includes(a.status)) && (
            <div onClick={() => navigate('/patient/track')}
              style={{ background:'linear-gradient(135deg,#e63946,#c53030)', borderRadius:14, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:14, cursor:'pointer', boxShadow:'0 4px 14px rgba(230,57,70,0.3)' }}>
              <span style={{ width:12, height:12, background:'white', borderRadius:'50%', display:'inline-block', flexShrink:0, animation:'pulse 1.5s infinite' }} />
              <div style={{ flex:1 }}>
                <div style={{ color:'white', fontWeight:800, fontSize:15 }}>You have active tests in progress!</div>
                <div style={{ color:'rgba(255,255,255,0.85)', fontSize:12, marginTop:2 }}>Tap to see your test flow and navigate to each room →</div>
              </div>
              <span style={{ color:'white', fontSize:20 }}>📍</span>
            </div>
          )}

          {/* Upcoming appointments */}
          {upcomingAppts.length > 0 && (
            <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.05)', marginBottom:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>📅 Upcoming Appointments</h3>
                <button onClick={() => navigate('/patient/appointments')} style={{ background:'none', border:'none', color:'#0a6e6e', cursor:'pointer', fontSize:13, fontWeight:600 }}>View All →</button>
              </div>
              {upcomingAppts.map(a => (
                <div key={a.id} style={{ display:'flex', gap:14, padding:'12px 0', borderBottom:'1px solid #f0f4f8', alignItems:'center' }}>
                  <div style={{ width:48, height:52, background:a.appointment_type==='consultation'?'linear-gradient(135deg,#4361ee,#2a4dd0)':'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{ color:'white', fontSize:16, fontWeight:700, lineHeight:1 }}>{new Date(a.appointment_date).getDate()}</div>
                    <div style={{ color:'rgba(255,255,255,0.8)', fontSize:9, textTransform:'uppercase' }}>{new Date(a.appointment_date).toLocaleString('default',{month:'short'})}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{a.package_name || `Dr. ${a.doctor_name}`}</div>
                    <div style={{ fontSize:12, color:'#718096' }}>Token: <strong style={{ color:'#0a6e6e' }}>{a.token_number}</strong> · Check in by 7:00 AM</div>
                    {a.pre_requirements && (
                      <div style={{ marginTop:6, background:'#fffbf0', border:'1px solid #f0a500', borderRadius:6, padding:'4px 10px', fontSize:11, color:'#856404' }}>
                        ⚠️ {a.pre_requirements.slice(0, 80)}{a.pre_requirements.length > 80 ? '…' : ''}
                      </div>
                    )}
                  </div>
                  <span style={{ background: a.payment_confirmed?'#eaf7ef':'#fff8e8', color:a.payment_confirmed?'#2a9d8f':'#c47d00', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {a.payment_confirmed ? '✅ Paid' : '⏳ Pay at Reception'}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* ── Right column ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Check-in reminder */}
          <div style={{ background:'linear-gradient(135deg,#0a6e6e,#064444)', borderRadius:16, padding:20, color:'white' }}>
            <div style={{ fontSize:24, marginBottom:10 }}>⏰</div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Check-in Reminder</div>
            <div style={{ fontSize:12, opacity:0.85, lineHeight:1.7 }}>
              Please arrive at the hospital reception counter by <strong>7:00 AM</strong> on your appointment date. Tokens are issued on a <strong>first-come, first-served</strong> basis.
            </div>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:0.5 }}>Recent Notifications</h3>
              {notifications.map(n => (
                <div key={n.id} style={{ padding:'10px 0', borderBottom:'1px solid #f0f4f8' }}>
                  <div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>{n.title}</div>
                  <div style={{ fontSize:12, color:'#718096' }}>{n.message?.slice(0, 70)}{n.message?.length > 70 ? '…' : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
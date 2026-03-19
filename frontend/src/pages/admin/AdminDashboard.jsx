import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function AdminDashboard() {
  const [stats, setStats]       = useState(null);
  const [pending, setPending]   = useState([]);
  const [reviewing, setReviewing] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [msg, setMsg]           = useState({ text:'', type:'' });
  const navigate = useNavigate();

  const fetchAll = async () => {
    const [s, p] = await Promise.all([
      api.get('/admin/stats').then(r => r.data).catch(() => null),
      api.get('/admin/doctors/pending').then(r => r.data).catch(() => []),
    ]);
    setStats(s); setPending(p);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleReview = async (doctor_id, action) => {
    try {
      await api.post('/admin/doctors/review', { doctor_id, action, reason: rejectReason });
      setMsg({ text:`Doctor ${action==='approve'?'approved ✅':'rejected ❌'} successfully`, type:action==='approve'?'success':'error' });
      setReviewing(null); setRejectReason('');
      fetchAll();
      setTimeout(() => setMsg({ text:'', type:'' }), 4000);
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Action failed', type:'error' });
    }
  };

  return (
    <Layout>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#e63946', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Admin Panel</div>
        <h1 style={{ fontSize:30, fontFamily:"'Playfair Display',serif", color:'#1a202c', margin:'0 0 4px' }}>Hospital Overview</h1>
        <p style={{ color:'#718096', margin:0, fontSize:14 }}>{new Date().toDateString()}</p>
      </div>

      {msg.text && (
        <div style={{ background:msg.type==='success'?'#eaf7ef':'#fff5f5', border:`1.5px solid ${msg.type==='success'?'#2a9d8f':'#e63946'}`, borderRadius:10, padding:'12px 16px', marginBottom:20, color:msg.type==='success'?'#1a6e3c':'#c53030', fontWeight:600, fontSize:14 }}>
          {msg.text}
        </div>
      )}

      {/* KPI Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:28 }}>
        {[
          { icon:'👨‍⚕️', label:'Active Doctors',   value:stats?.total_doctors||0,   bg:'#e8f5f5', color:'#0a6e6e' },
          { icon:'👥', label:'Patients',           value:stats?.total_patients||0,  bg:'#eef3ff', color:'#4361ee' },
          { icon:'⏳', label:'Pending Approval',   value:stats?.pending_doctors||0, bg:'#fff8e8', color:'#c47d00', urgent:stats?.pending_doctors>0 },
          { icon:'📅', label:"Today's Appts",      value:stats?.today_appts||0,     bg:'#f3e8ff', color:'#6b21a8' },
          { icon:'💰', label:'Total Revenue',      value:`₹${stats?.total_revenue||0}`, bg:'#eaf7ef', color:'#1a6e3c' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:14, padding:'18px', position:'relative', boxShadow:s.urgent?'0 0 0 2px #f0a500':'0 2px 8px rgba(0,0,0,0.05)' }}>
            {s.urgent && <div style={{ position:'absolute', top:-5, right:-5, width:12, height:12, background:'#e63946', borderRadius:'50%', animation:'pulse 1.5s infinite' }} />}
            <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#718096' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending Doctor Approvals */}
      <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.05)', marginBottom:24, border:pending.length>0?'2px solid #f0a500':'1px solid #f0f4f8' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h3 style={{ fontSize:18, fontWeight:700, margin:'0 0 4px', color:'#1a202c' }}>
              ⏳ Pending Doctor Approvals
              {pending.length>0 && <span style={{ background:'#e63946', color:'white', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, marginLeft:10 }}>{pending.length} new</span>}
            </h3>
            <p style={{ margin:0, color:'#718096', fontSize:13 }}>New doctor registrations awaiting your review</p>
          </div>
          <button onClick={() => navigate('/admin/doctors')} style={{ padding:'8px 16px', background:'#f7fafc', border:'2px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, color:'#718096' }}>
            View All →
          </button>
        </div>

        {pending.length === 0 ? (
          <div style={{ textAlign:'center', padding:32, color:'#a0aec0' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
            <p style={{ fontSize:14, margin:0 }}>No pending approvals</p>
          </div>
        ) : pending.map(doc => (
          <div key={doc.id} style={{ border:'1.5px solid #e2e8f0', borderRadius:12, padding:18, marginBottom:12, display:'flex', gap:14, alignItems:'flex-start' }}>
            <div style={{ width:52, height:52, background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:22, flexShrink:0 }}>
              {doc.name?.[0]}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:16 }}>{doc.name}</div>
              <div style={{ color:'#718096', fontSize:13, marginTop:2 }}>{doc.email} · {doc.phone}</div>
              <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                {[['🩺',doc.specialization],['🎓',doc.qualification],['🚪',doc.room_number]].map(([icon,val]) => val && (
                  <span key={icon} style={{ background:'#f0fafa', color:'#0a6e6e', padding:'3px 10px', borderRadius:20, fontSize:12 }}>{icon} {val}</span>
                ))}
              </div>
              {reviewing === doc.id && (
                <div style={{ marginTop:12, background:'#fff5f5', border:'1.5px solid #fed7d7', borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#c53030', marginBottom:8 }}>Reason for rejection (optional):</div>
                  <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Incomplete qualification details..."
                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #fed7d7', borderRadius:8, fontFamily:'inherit', fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:10 }} />
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => handleReview(doc.id,'reject')} style={{ padding:'8px 16px', background:'#e63946', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:13 }}>Confirm Reject</button>
                    <button onClick={() => { setReviewing(null); setRejectReason(''); }} style={{ padding:'8px 16px', background:'#f7fafc', border:'1.5px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#718096' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            {reviewing !== doc.id && (
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <button onClick={() => handleReview(doc.id,'approve')} style={{ padding:'9px 18px', background:'linear-gradient(135deg,#2a9d8f,#0a6e6e)', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:13 }}>✅ Approve</button>
                <button onClick={() => setReviewing(doc.id)} style={{ padding:'9px 18px', background:'#fff5f5', color:'#e63946', border:'1.5px solid #fed7d7', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:13 }}>❌ Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { icon:'📈', label:'Analytics',       sub:'Bookings, revenue, demographics', path:'/admin/analytics', color:'#e63946', bg:'#fff5f5' },
          { icon:'👨‍⚕️', label:'Manage Doctors', sub:'View, approve, manage doctors',    path:'/admin/doctors',   color:'#0a6e6e', bg:'#e8f5f5' },
          { icon:'👥', label:'Manage Patients', sub:'View all registered patients',     path:'/admin/patients',  color:'#4361ee', bg:'#eef3ff' },
          { icon:'🧪', label:'Test Packages',   sub:'Edit prices, rooms, categories',   path:'/admin/packages',  color:'#6b21a8', bg:'#f3e8ff' },
        ].map(n => (
          <div key={n.path} onClick={() => navigate(n.path)}
            style={{ background:'white', borderRadius:14, padding:20, cursor:'pointer', border:'1.5px solid #e2e8f0', transition:'all 0.2s', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=n.color; e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.transform=''; }}>
            <div style={{ width:44, height:44, background:n.bg, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:12 }}>{n.icon}</div>
            <div style={{ fontWeight:700, fontSize:15, color:'#1a202c', marginBottom:4 }}>{n.label}</div>
            <div style={{ fontSize:12, color:'#718096' }}>{n.sub}</div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </Layout>
  );
}
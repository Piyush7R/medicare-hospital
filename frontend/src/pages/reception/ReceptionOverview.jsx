import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const statusColor = { booked:'info', checked_in:'warning', in_progress:'warning', completed:'success', cancelled:'danger' };

export default function ReceptionOverview() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const intervalRef = useRef();

  const fetchData = () => api.get('/reception/today').then(r => setData(r.data)).catch(console.error);
  useEffect(() => { fetchData(); intervalRef.current = setInterval(fetchData, 15000); return () => clearInterval(intervalRef.current); }, []);

  const filtered = (data?.appointments || []).filter(a => {
    if (filter === 'pending')   return !a.payment_confirmed && a.status === 'booked';
    if (filter === 'confirmed') return a.payment_confirmed && a.status !== 'completed';
    if (filter === 'completed') return a.status === 'completed';
    return true;
  });

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <Layout>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'32px' }}>
        <div>
          <div style={{ fontSize:'13px', fontWeight:600, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>Reception Desk</div>
          <h1 style={{ fontSize:'32px', fontFamily:"'Playfair Display',serif", color:'#1a202c', margin:0 }}>{greeting} 👋</h1>
          <p style={{ color:'#718096', marginTop:'4px', fontSize:'14px' }}>{now.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'white', padding:'8px 16px', borderRadius:'30px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', fontSize:'13px', color:'#718096' }}>
          <span style={{ width:'8px', height:'8px', background:'#2a9d8f', borderRadius:'50%', display:'inline-block', animation:'pulse 2s infinite' }} />
          Live — refreshes every 15s
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'28px' }}>
        {[
          { icon:'📅', label:'Total Today',      value:data?.stats?.total||0,     grad:'linear-gradient(135deg,#e8f5f5,#c8e6e6)', color:'#0a6e6e',  action:null },
          { icon:'⏳', label:'Awaiting Payment', value:data?.stats?.pending||0,   grad:'linear-gradient(135deg,#fff8e8,#ffe4a0)', color:'#b86e00',  action:() => navigate('/reception/payment') },
          { icon:'✅', label:'Checked In',        value:data?.stats?.confirmed||0, grad:'linear-gradient(135deg,#eaf7ef,#b8e8c8)', color:'#1a6e3c',  action:null },
          { icon:'🏁', label:'Completed',         value:data?.stats?.completed||0, grad:'linear-gradient(135deg,#eef3ff,#c8d4ff)', color:'#2945cc',  action:null },
        ].map(s => (
          <div key={s.label} onClick={s.action||undefined}
            style={{ background:s.grad, borderRadius:'16px', padding:'22px', cursor:s.action?'pointer':'default', transition:'transform 0.15s, box-shadow 0.15s', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => s.action&&(e.currentTarget.style.transform='translateY(-3px)',e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.1)')}
            onMouseLeave={e => s.action&&(e.currentTarget.style.transform='',e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.05)')}>
            <div style={{ fontSize:'28px', marginBottom:'10px' }}>{s.icon}</div>
            <div style={{ fontSize:'38px', fontWeight:800, color:s.color, lineHeight:1, marginBottom:'5px', fontFamily:"'Playfair Display',serif" }}>{s.value}</div>
            <div style={{ fontSize:'13px', color:'#4a5568', fontWeight:500 }}>{s.label}</div>
            {s.action && <div style={{ fontSize:'11px', color:s.color, fontWeight:700, marginTop:'6px', opacity:0.8 }}>Tap to manage →</div>}
          </div>
        ))}
      </div>

      {/* Quick action cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'28px' }}>
        <div onClick={() => navigate('/reception/payment')}
          style={{ background:'linear-gradient(135deg,#0a6e6e,#064444)', borderRadius:'16px', padding:'24px 28px', cursor:'pointer', transition:'all 0.2s', boxShadow:'0 4px 16px rgba(10,110,110,0.25)', display:'flex', gap:'20px', alignItems:'center' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform=''}>
          <div style={{ width:'56px', height:'56px', background:'rgba(255,255,255,0.15)', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', flexShrink:0 }}>💳</div>
          <div>
            <div style={{ color:'white', fontWeight:700, fontSize:'17px', marginBottom:'4px' }}>Payment & Check-in</div>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:'13px', lineHeight:'1.5' }}>Search token → collect cash → check patient in</div>
          </div>
          <div style={{ marginLeft:'auto', color:'rgba(255,255,255,0.4)', fontSize:'22px' }}>›</div>
        </div>
        <div onClick={() => navigate('/reception/reports')}
          style={{ background:'linear-gradient(135deg,#4361ee,#2945cc)', borderRadius:'16px', padding:'24px 28px', cursor:'pointer', transition:'all 0.2s', boxShadow:'0 4px 16px rgba(67,97,238,0.25)', display:'flex', gap:'20px', alignItems:'center' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform=''}>
          <div style={{ width:'56px', height:'56px', background:'rgba(255,255,255,0.15)', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', flexShrink:0 }}>📋</div>
          <div>
            <div style={{ color:'white', fontWeight:700, fontSize:'17px', marginBottom:'4px' }}>Upload Report</div>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:'13px', lineHeight:'1.5' }}>Search token → attach PDF → email patient</div>
          </div>
          <div style={{ marginLeft:'auto', color:'rgba(255,255,255,0.4)', fontSize:'22px' }}>›</div>
        </div>
      </div>

      {/* Appointments table */}
      <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
          <h3 style={{ fontSize:'18px', fontWeight:700, margin:0, color:'#1a202c' }}>Today's Appointments</h3>
          <div style={{ display:'flex', gap:'6px', background:'#f7fafc', padding:'4px', borderRadius:'10px' }}>
            {[{id:'all',label:'All'},{id:'pending',label:'⏳ Pending'},{id:'confirmed',label:'✅ In'},{id:'completed',label:'🏁 Done'}].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding:'6px 14px', border:'none', borderRadius:'7px', background:filter===f.id?'#0a6e6e':'transparent', color:filter===f.id?'white':'#718096', cursor:'pointer', fontSize:'12px', fontWeight:600, transition:'all 0.15s' }}>{f.label}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px', color:'#a0aec0' }}>
            <div style={{ fontSize:'44px', marginBottom:'10px' }}>🗓️</div>
            <p style={{ fontSize:'14px' }}>No appointments to show</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Time','Token','Patient','Type','Amount','Payment','Status',''].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#a0aec0', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid #f0f4f8', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom:'1px solid #f7fafc' }}
                    onMouseEnter={e => e.currentTarget.style.background='#fafcff'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={{ padding:'13px 14px', fontWeight:700, color:'#0a6e6e', fontSize:'14px' }}>{a.appointment_time?.slice(0,5)}</td>
                    <td style={{ padding:'13px 14px' }}><span style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>{a.token_number}</span></td>
                    <td style={{ padding:'13px 14px' }}>
                      <div style={{ fontWeight:600, fontSize:'14px', color:'#1a202c' }}>{a.patient_name}</div>
                      <div style={{ color:'#a0aec0', fontSize:'11px', marginTop:'1px' }}>{a.age&&`${a.age}y`}{a.gender&&` · ${a.gender}`}{a.blood_group&&` · ${a.blood_group}`}</div>
                    </td>
                    <td style={{ padding:'13px 14px' }}>
                      <span style={{ background:a.appointment_type==='consultation'?'#eef3ff':'#f0fafa', color:a.appointment_type==='consultation'?'#4361ee':'#0a6e6e', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>
                        {a.appointment_type==='consultation'?'👨‍⚕️ Consult':'🧪 Test'}
                      </span>
                    </td>
                    <td style={{ padding:'13px 14px', fontWeight:700, fontSize:'14px', color:'#1a202c' }}>₹{a.payment_amount||0}</td>
                    <td style={{ padding:'13px 14px' }}>
                      {a.payment_confirmed
                        ? <span style={{ background:'#eaf7ef', color:'#1a6e3c', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>✅ Paid</span>
                        : <span style={{ background:'#fff8e8', color:'#b86e00', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>⏳ Pending</span>}
                    </td>
                    <td style={{ padding:'13px 14px' }}><span className={`badge badge-${statusColor[a.status]}`}>{a.status.replace('_',' ')}</span></td>
                    <td style={{ padding:'13px 14px' }}>
                      {!a.payment_confirmed && a.status==='booked' && (
                        <button onClick={() => navigate('/reception/payment', { state:{ token:a.token_number } })}
                          style={{ background:'#0a6e6e', color:'white', border:'none', borderRadius:'8px', padding:'6px 14px', cursor:'pointer', fontSize:'12px', fontWeight:700, whiteSpace:'nowrap' }}>
                          Confirm →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const statusColor = { booked:'info', checked_in:'warning', in_progress:'warning', completed:'success', cancelled:'danger' };

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/appointments/my')
      .then(res => setAppointments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments.filter(a => ['booked','checked_in','in_progress'].includes(a.status));
  const past     = appointments.filter(a => ['completed','cancelled'].includes(a.status));

  if (loading) return <Layout><div style={{ textAlign:'center', padding:'60px' }}>Loading...</div></Layout>;

  return (
    <Layout>
      <div className="page-header"><h2>My Appointments</h2><p>View and manage all your bookings</p></div>

      {/* Upcoming */}
      <div className="card" style={{ marginBottom:'24px' }}>
        <h3 style={{ fontSize:'20px', marginBottom:'20px' }}>Upcoming Appointments</h3>
        {upcoming.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#718096' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>📅</div>
            <p>No upcoming appointments</p>
          </div>
        ) : upcoming.map(a => (
          <div key={a.id} style={{ border:'1.5px solid #e2e8f0', borderRadius:'14px', padding:'18px', marginBottom:'14px', background: a.payment_confirmed ? '#fafffe' : '#fffcf0' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
              <div style={{ display:'flex', gap:'14px', alignItems:'flex-start' }}>
                <div style={{ width:'52px', height:'56px', background: a.appointment_type==='consultation'?'#4361ee':'#0a6e6e', borderRadius:'10px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <div style={{ color:'white', fontSize:'20px', fontWeight:700, lineHeight:1 }}>{new Date(a.appointment_date).getDate()}</div>
                  <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'10px', textTransform:'uppercase' }}>{new Date(a.appointment_date).toLocaleString('default',{month:'short'})}</div>
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:'15px', marginBottom:'3px' }}>
                    {a.appointment_type==='consultation' ? `👨‍⚕️ Dr. ${a.doctor_name}` : a.package_name}
                  </div>
                  <div style={{ color:'#718096', fontSize:'13px' }}>🕐 {a.appointment_time?.slice(0,5)} &nbsp;|&nbsp; Token: <strong style={{ color:'#0a6e6e' }}>{a.token_number}</strong></div>
                  {(a.test_room_number || a.doctor_room) && (
                    <div style={{ color:'#0a6e6e', fontSize:'12px', fontWeight:600, marginTop:'3px' }}>🚪 {a.test_room_number || a.doctor_room}</div>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
                <span className={`badge badge-${statusColor[a.status]}`}>{a.status.replace('_',' ')}</span>
                {a.payment_confirmed
                  ? <span style={{ background:'#eaf7ef', color:'#2a9d8f', padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:700 }}>✅ Paid</span>
                  : a.payment_amount > 0
                    ? <span style={{ background:'#fffbf0', color:'#856404', padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:700 }}>⏳ Pay at Reception</span>
                    : null
                }
              </div>
            </div>

            {a.pre_requirements && (
              <div style={{ marginTop:'12px', background:'#fffbf0', border:'1px solid #f0a500', borderRadius:'8px', padding:'10px 12px', fontSize:'12px', color:'#856404' }}>
                <strong>⚠️ Pre-test:</strong> {a.pre_requirements}
              </div>
            )}

            {/* Pay at reception notice */}
            {!a.payment_confirmed && a.payment_amount > 0 && a.status === 'booked' && (
              <div style={{ marginTop:'12px', display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', background:'#fff8e8', border:'1.5px solid #f0a500', borderRadius:'10px' }}>
                <span style={{ fontSize:'22px' }}>🏥</span>
                <div>
                  <div style={{ fontWeight:700, color:'#856404', fontSize:'13px' }}>Payment Required — ₹{a.payment_amount}</div>
                  <div style={{ color:'#a07800', fontSize:'12px', marginTop:'1px' }}>Please pay at the reception counter. Show your token: <strong>{a.token_number}</strong></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Past */}
      <div className="card">
        <h3 style={{ fontSize:'20px', marginBottom:'20px' }}>Past Appointments</h3>
        {past.length === 0 ? (
          <p style={{ color:'#718096', textAlign:'center', padding:'20px' }}>No past appointments</p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Token</th><th>Type</th><th>Details</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {past.map(a => (
                <tr key={a.id}>
                  <td style={{ fontSize:'13px' }}>{new Date(a.appointment_date).toLocaleDateString()}</td>
                  <td><strong style={{ color:'#0a6e6e', fontSize:'13px' }}>{a.token_number}</strong></td>
                  <td>
                    <span style={{ background:a.appointment_type==='consultation'?'#eef3ff':'#e8f5f5', color:a.appointment_type==='consultation'?'#4361ee':'#0a6e6e', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>
                      {a.appointment_type==='consultation'?'Consult':'Test'}
                    </span>
                  </td>
                  <td style={{ fontSize:'13px' }}>{a.package_name || `Dr. ${a.doctor_name}` || a.specialization}</td>
                  <td style={{ fontSize:'13px', fontWeight:600 }}>₹{a.payment_amount||0}</td>
                  <td>{a.payment_confirmed ? <span className="badge badge-success">Paid</span> : <span className="badge badge-warning">Unpaid</span>}</td>
                  <td><span className={`badge badge-${statusColor[a.status]}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

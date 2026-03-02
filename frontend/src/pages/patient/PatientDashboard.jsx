import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const statusColor = { booked:'info', checked_in:'warning', in_progress:'warning', completed:'success', cancelled:'danger' };

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/appointments/my'), api.get('/reports/my'), api.get('/dashboard/notifications')])
      .then(([a,r,n]) => { setAppointments(a.data); setReports(r.data); setNotifications(n.data.filter(x=>!x.is_read)); })
      .catch(console.error)
      .finally(()=>setLoading(false));
  }, []);

  const upcoming = appointments.filter(a=>['booked','checked_in','in_progress'].includes(a.status));
  const nextAppt = upcoming[0];

  if (loading) return <Layout><div style={{textAlign:'center',padding:'60px'}}>Loading...</div></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <h2>Good morning, {user?.name?.split(' ')[0]} 👋</h2>
        <p>Your health overview</p>
      </div>

      {/* PRE-REQUIREMENTS ALERT for next appointment */}
      {nextAppt?.pre_requirements && (
        <div style={{ background:'linear-gradient(135deg,#fffbf0,#fff8e1)', border:'2px solid #f0a500', borderRadius:'14px', padding:'20px 24px', marginBottom:'24px', display:'flex', gap:'16px', alignItems:'flex-start' }}>
          <div style={{ fontSize:'32px', flexShrink:0 }}>⚠️</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:'#856404', fontSize:'15px', marginBottom:'4px' }}>
              Pre-Test Requirements for Your Next Appointment
            </div>
            <div style={{ color:'#856404', fontSize:'13px', lineHeight:'1.7', marginBottom:'8px' }}>
              {nextAppt.pre_requirements}
            </div>
            <div style={{ fontSize:'12px', color:'#a07800', fontWeight:600 }}>
              📅 {new Date(nextAppt.appointment_date).toDateString()} at {nextAppt.appointment_time?.slice(0,5)} — {nextAppt.package_name}
              {nextAppt.test_room_number && ` • ${nextAppt.test_room_number}`}
            </div>
          </div>
        </div>
      )}

      <div className="grid-4" style={{marginBottom:'28px'}}>
        {[
          {icon:'📅',label:'Total',value:appointments.length,bg:'#e8f5f5',color:'#0a6e6e'},
          {icon:'⏳',label:'Upcoming',value:upcoming.length,bg:'#fff8e8',color:'#f0a500'},
          {icon:'✅',label:'Completed',value:appointments.filter(a=>a.status==='completed').length,bg:'#eaf7ef',color:'#2a9d8f'},
          {icon:'📋',label:'Reports',value:reports.length,bg:'#eef3ff',color:'#4361ee'},
        ].map(s=>(
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{background:s.bg,color:s.color}}>{s.icon}</div>
            <div className="stat-info"><h3 style={{color:s.color}}>{s.value}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:'24px'}}>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
            <h3 style={{fontSize:'20px'}}>Upcoming Appointments</h3>
            <Link to="/patient/book" className="btn btn-primary btn-sm">+ Book New</Link>
          </div>
          {upcoming.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'#718096'}}>
              <div style={{fontSize:'48px',marginBottom:'12px'}}>📅</div>
              <p>No upcoming appointments</p>
              <Link to="/patient/book" className="btn btn-primary" style={{marginTop:'16px'}}>Book Appointment</Link>
            </div>
          ) : upcoming.map(a=>(
            <div key={a.id} style={{padding:'16px',background:'#f7fafc',borderRadius:'12px',border:'1px solid #e2e8f0',marginBottom:'12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom: a.pre_requirements ? '12px' : '0'}}>
                <div style={{width:'48px',height:'52px',background:a.appointment_type==='consultation'?'#4361ee':'#0a6e6e',borderRadius:'10px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <div style={{color:'white',fontSize:'18px',fontWeight:700,lineHeight:1}}>{new Date(a.appointment_date).getDate()}</div>
                  <div style={{color:'rgba(255,255,255,0.8)',fontSize:'10px',textTransform:'uppercase'}}>{new Date(a.appointment_date).toLocaleString('default',{month:'short'})}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:'14px',marginBottom:'2px'}}>
                    {a.appointment_type==='consultation' ? `👨‍⚕️ Dr. ${a.doctor_name}` : a.package_name}
                  </div>
                  <div style={{color:'#718096',fontSize:'12px'}}>🕐 {a.appointment_time?.slice(0,5)} | Token: {a.token_number}</div>
                  {(a.test_room_number || a.doctor_room) && (
                    <div style={{color:'#0a6e6e',fontSize:'12px',fontWeight:600,marginTop:'2px'}}>
                      🚪 {a.test_room_number || a.doctor_room}
                    </div>
                  )}
                </div>
                <span className={`badge badge-${statusColor[a.status]}`}>{a.status}</span>
              </div>
              {/* Pre-requirements mini badge */}
              {a.pre_requirements && (
                <div style={{background:'#fffbf0',border:'1px solid #f0a500',borderRadius:'8px',padding:'8px 10px',fontSize:'12px',color:'#856404'}}>
                  <strong>⚠️ Prep needed:</strong> {a.pre_requirements.substring(0,100)}{a.pre_requirements.length>100?'...':''}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
          <div className="card">
            <h3 style={{fontSize:'18px',marginBottom:'16px'}}>🔔 Notifications</h3>
            {notifications.length === 0 ? <p style={{color:'#718096',fontSize:'14px'}}>No new notifications</p> :
              notifications.slice(0,4).map(n=>(
                <div key={n.id} style={{padding:'10px',background:'#fffbf0',borderRadius:'8px',borderLeft:'3px solid #f0a500',marginBottom:'8px'}}>
                  <div style={{fontWeight:600,fontSize:'13px',marginBottom:'2px'}}>{n.title}</div>
                  <div style={{color:'#718096',fontSize:'12px'}}>{n.message}</div>
                </div>
              ))
            }
          </div>
          <div className="card">
            <h3 style={{fontSize:'18px',marginBottom:'16px'}}>📋 Recent Reports</h3>
            {reports.length === 0 ? <p style={{color:'#718096',fontSize:'14px'}}>No reports yet</p> :
              reports.slice(0,3).map(r=>(
                <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px',background:'#f7fafc',borderRadius:'8px',marginBottom:'8px'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:'13px'}}>{r.report_title}</div>
                    <div style={{color:'#718096',fontSize:'11px'}}>Token: {r.token_number}</div>
                  </div>
                  <div style={{color:'#718096',fontSize:'12px'}}>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              ))
            }
            <Link to="/patient/reports" style={{color:'#0a6e6e',textDecoration:'none',fontWeight:600,fontSize:'13px',display:'block',marginTop:'12px'}}>View all →</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

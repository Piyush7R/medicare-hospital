import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const statusColor = { booked:'info', checked_in:'warning', in_progress:'warning', completed:'success', cancelled:'danger' };

export default function LiveDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef(null);

  const fetchAll = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
      setLastUpdated(new Date());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading) return <Layout><div style={{ textAlign:'center', padding:'60px' }}>Loading dashboard...</div></Layout>;

  return (
    <Layout>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h2>Operational Dashboard</h2>
          <p>Your patients — {new Date().toDateString()}</p>
        </div>
        <div style={{ textAlign:'right', fontSize:'13px', color:'#718096' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', justifyContent:'flex-end' }}>
            <span style={{ width:'8px', height:'8px', background:'#2a9d8f', borderRadius:'50%', display:'inline-block', animation:'pulse 2s infinite' }} />
            Live
          </div>
          <div>Updated: {lastUpdated.toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:'24px' }}>
        {[
          { icon:'🏥', label:'In Hospital Now',    value: stats?.stats?.in_hospital ?? 0,        bg:'#fff8e8', color:'#f0a500' },
          { icon:'📅', label:"Today's Appointments", value: stats?.stats?.today_appointments ?? 0, bg:'#eef3ff', color:'#4361ee' },
          { icon:'✅', label:'Completed Today',     value: stats?.stats?.completed_today ?? 0,    bg:'#eaf7ef', color:'#2a9d8f' },
          { icon:'👥', label:'Total Patients',      value: stats?.stats?.total_patients ?? 0,     bg:'#e8f5f5', color:'#0a6e6e' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background:s.bg, color:s.color, fontSize:'24px' }}>{s.icon}</div>
            <div className="stat-info"><h3 style={{ color:s.color }}>{s.value}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginBottom:'24px' }}>
        {/* Room Occupancy */}
        <div className="card">
          <h3 style={{ fontSize:'18px', marginBottom:'16px' }}>🏥 Room Occupancy</h3>
          {stats?.room_occupancy?.length === 0 && <p style={{ color:'#718096' }}>No active rooms</p>}
          {stats?.room_occupancy?.map(room => {
            const fillPct = Math.min(((room.waiting || 0) / (room.max_capacity || 1)) * 100, 100);
            const color = fillPct > 70 ? '#e63946' : fillPct > 40 ? '#f0a500' : '#2a9d8f';
            return (
              <div key={room.id} style={{ marginBottom:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                  <div>
                    <span style={{ fontWeight:600, fontSize:'13px' }}>{room.name}</span>
                    <span style={{ color:'#718096', fontSize:'11px', marginLeft:'6px' }}>{room.test_type}</span>
                  </div>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    <span style={{ background:'#fff3cd', color:'#856404', padding:'2px 8px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{room.waiting || 0} waiting</span>
                    <span style={{ background:'#d4edda', color:'#1a6e3c', padding:'2px 8px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{room.completed || 0} done</span>
                  </div>
                </div>
                <div style={{ height:'8px', background:'#e2e8f0', borderRadius:'4px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${fillPct}%`, background:color, borderRadius:'4px', transition:'width 0.5s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Today's Status Distribution */}
        <div className="card">
          <h3 style={{ fontSize:'18px', marginBottom:'16px' }}>📊 Today's Status (Your Patients)</h3>
          {!stats?.status_distribution?.length && <p style={{ color:'#718096' }}>No appointments today</p>}
          {stats?.status_distribution?.map(s => {
            const total = stats.status_distribution.reduce((a, b) => a + parseInt(b.count), 0);
            const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
            return (
              <div key={s.status} style={{ marginBottom:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                  <span className={`badge badge-${statusColor[s.status]}`} style={{ textTransform:'capitalize' }}>{s.status}</span>
                  <span style={{ fontWeight:700, color:'#1a202c' }}>{s.count} <span style={{ color:'#718096', fontWeight:400 }}>({pct}%)</span></span>
                </div>
                <div style={{ height:'6px', background:'#e2e8f0', borderRadius:'3px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:'#0a6e6e', borderRadius:'3px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent appointments */}
      <div className="card">
        <h3 style={{ fontSize:'18px', marginBottom:'16px' }}>Recent Activity (Payment Confirmed)</h3>
        {!stats?.recent_appointments?.length ? (
          <p style={{ color:'#718096', textAlign:'center', padding:'20px' }}>No recent activity</p>
        ) : (
          <table>
            <thead><tr><th>Patient</th><th>Package</th><th>Token</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recent_appointments.map(a => (
                <tr key={a.id}>
                  <td><div style={{ fontWeight:600 }}>{a.patient_name}</div></td>
                  <td style={{ fontSize:'13px' }}>{a.package_name}</td>
                  <td><strong style={{ color:'#0a6e6e' }}>{a.token_number}</strong></td>
                  <td style={{ fontSize:'13px' }}>{new Date(a.appointment_date).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${statusColor[a.status]}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </Layout>
  );
}

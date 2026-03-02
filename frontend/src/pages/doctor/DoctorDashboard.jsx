import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const statusColor = { booked:'info', checked_in:'warning', in_progress:'warning', completed:'success', cancelled:'danger' };

export default function DoctorDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/dashboard/stats').then(res=>setStats(res.data)).catch(console.error).finally(()=>setLoading(false)); }, []);

  if (loading) return <Layout><div style={{textAlign:'center',padding:'60px'}}>Loading...</div></Layout>;

  return (
    <Layout>
      <div className="page-header"><h2>Doctor Dashboard</h2><p>Hospital operations overview — {new Date().toDateString()}</p></div>

      <div className="grid-4" style={{marginBottom:'28px'}}>
        {[
          {icon:'👥',label:'Total Patients',value:stats?.stats?.total_patients,bg:'#eef3ff',color:'#4361ee'},
          {icon:'📅',label:"Today's Appointments",value:stats?.stats?.today_appointments,bg:'#fff8e8',color:'#f0a500'},
          {icon:'⏳',label:'Pending',value:stats?.stats?.pending_appointments,bg:'#fff0f0',color:'#e63946'},
          {icon:'✅',label:'Completed Today',value:stats?.stats?.completed_today,bg:'#eaf7ef',color:'#2a9d8f'},
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{background:s.bg,color:s.color,fontSize:'24px'}}>{s.icon}</div>
            <div className="stat-info"><h3 style={{color:s.color}}>{s.value??0}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'24px'}}>
        <div className="card">
          <h3 style={{fontSize:'20px',marginBottom:'20px'}}>Recent Appointments</h3>
          <table>
            <thead><tr><th>Patient</th><th>Package</th><th>Date</th><th>Token</th><th>Status</th></tr></thead>
            <tbody>
              {stats?.recent_appointments?.map(a => (
                <tr key={a.id}>
                  <td><div style={{fontWeight:600}}>{a.patient_name}</div></td>
                  <td>{a.package_name}</td>
                  <td style={{fontSize:'13px'}}>{new Date(a.appointment_date).toLocaleDateString()}</td>
                  <td><strong style={{color:'#0a6e6e'}}>{a.token_number}</strong></td>
                  <td><span className={`badge badge-${statusColor[a.status]}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="card" style={{marginBottom:'20px'}}>
            <h3 style={{fontSize:'18px',marginBottom:'16px'}}>🏥 Test Rooms</h3>
            {stats?.rooms?.map(room => (
              <div key={room.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px',background:'#f7fafc',borderRadius:'8px',marginBottom:'8px'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:'13px',marginBottom:'2px'}}>{room.name}</div>
                  <div style={{color:'#718096',fontSize:'11px'}}>{room.test_type}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'12px',fontWeight:600,color:'#0a6e6e',marginBottom:'4px'}}>{room.current_occupancy}/{room.max_capacity}</div>
                  <div style={{width:'80px',height:'6px',background:'#e2e8f0',borderRadius:'3px',overflow:'hidden'}}>
                    <div style={{height:'100%',background:'#0a6e6e',borderRadius:'3px',width:`${(room.current_occupancy/room.max_capacity)*100}%`}} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{fontSize:'18px',marginBottom:'16px'}}>📊 Status Overview</h3>
            {stats?.status_distribution?.map(s => (
              <div key={s.status} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <span className={`badge badge-${statusColor[s.status]}`} style={{textTransform:'capitalize'}}>{s.status}</span>
                <strong>{s.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

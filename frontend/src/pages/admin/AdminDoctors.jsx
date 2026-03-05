import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const statusBadge = { approved:'success', pending:'warning', rejected:'danger' };

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [msg, setMsg] = useState({ text:'', type:'' });

  const fetchDoctors = () => {
    api.get('/admin/doctors').then(r => setDoctors(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { fetchDoctors(); }, []);

  const handleReview = async (doctor_id, action) => {
    try {
      await api.post('/admin/doctors/review', { doctor_id, action });
      setMsg({ text:`Doctor ${action}d successfully`, type: action==='approve'?'success':'error' });
      fetchDoctors();
      setTimeout(() => setMsg({ text:'', type:'' }), 3000);
    } catch (err) { setMsg({ text: err.response?.data?.message||'Failed', type:'error' }); }
  };

  const filtered = doctors.filter(d => filter === 'all' || d.approval_status === filter);

  return (
    <Layout>
      <div style={{ marginBottom:'24px' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>Admin</div>
        <h1 style={{ fontSize:'28px', fontFamily:"'Playfair Display',serif", color:'#1a202c', margin:'0 0 4px' }}>👨‍⚕️ Manage Doctors</h1>
      </div>

      {msg.text && <div style={{ background:msg.type==='success'?'#eaf7ef':'#fff5f5', border:`1.5px solid ${msg.type==='success'?'#2a9d8f':'#e63946'}`, borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', color:msg.type==='success'?'#1a6e3c':'#c53030', fontWeight:600, fontSize:'13px' }}>{msg.text}</div>}

      <div style={{ display:'flex', gap:'6px', marginBottom:'20px', background:'white', padding:'5px', borderRadius:'10px', width:'fit-content', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
        {[{id:'all',label:'All'},{id:'pending',label:'⏳ Pending'},{id:'approved',label:'✅ Approved'},{id:'rejected',label:'❌ Rejected'}].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding:'8px 16px', borderRadius:'7px', border:'none', background:filter===f.id?'#0a6e6e':'transparent', color:filter===f.id?'white':'#718096', cursor:'pointer', fontWeight:600, fontSize:'13px', transition:'all 0.15s' }}>{f.label}</button>
        ))}
      </div>

      <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
        {loading ? <div style={{ textAlign:'center', padding:'40px', color:'#a0aec0' }}>Loading...</div>
        : filtered.length === 0 ? <div style={{ textAlign:'center', padding:'40px', color:'#a0aec0' }}><div style={{ fontSize:'40px', marginBottom:'10px' }}>👨‍⚕️</div><p>No doctors found</p></div>
        : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Doctor','Specialization','Room','Qualification','Appointments','Status','Actions'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#a0aec0', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid #f0f4f8' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} style={{ borderBottom:'1px solid #f7fafc' }}
                  onMouseEnter={e => e.currentTarget.style.background='#fafcff'}
                  onMouseLeave={e => e.currentTarget.style.background=''}>
                  <td style={{ padding:'14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'38px', height:'38px', background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'15px' }}>{d.name?.[0]}</div>
                      <div><div style={{ fontWeight:600, fontSize:'14px' }}>{d.name}</div><div style={{ color:'#a0aec0', fontSize:'11px' }}>{d.email}</div></div>
                    </div>
                  </td>
                  <td style={{ padding:'14px', fontSize:'13px', color:'#4a5568' }}>{d.specialization}</td>
                  <td style={{ padding:'14px', fontSize:'13px', color:'#0a6e6e', fontWeight:600 }}>{d.room_number}</td>
                  <td style={{ padding:'14px', fontSize:'12px', color:'#718096', maxWidth:'160px' }}>{d.qualification}</td>
                  <td style={{ padding:'14px' }}><span style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{d.total_appointments} appts</span></td>
                  <td style={{ padding:'14px' }}><span className={`badge badge-${statusBadge[d.approval_status]}`}>{d.approval_status}</span></td>
                  <td style={{ padding:'14px' }}>
                    {d.approval_status === 'pending' && (
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={() => handleReview(d.id, 'approve')} style={{ padding:'5px 12px', background:'#2a9d8f', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>✅</button>
                        <button onClick={() => handleReview(d.id, 'reject')} style={{ padding:'5px 12px', background:'#e63946', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>❌</button>
                      </div>
                    )}
                    {d.approval_status === 'rejected' && (
                      <button onClick={() => handleReview(d.id, 'approve')} style={{ padding:'5px 12px', background:'#2a9d8f', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>Re-approve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

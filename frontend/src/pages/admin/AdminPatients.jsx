import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function AdminPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/patients').then(r => setPatients(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  );

  return (
    <Layout>
      <div style={{ marginBottom:'24px' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'#4361ee', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>Admin</div>
        <h1 style={{ fontSize:'28px', fontFamily:"'Playfair Display',serif", color:'#1a202c', margin:'0 0 4px' }}>👥 All Patients</h1>
      </div>
      <div style={{ marginBottom:'16px' }}>
        <input placeholder="Search by name, email or phone..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', padding:'12px 16px', border:'2px solid #e2e8f0', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', outline:'none', boxSizing:'border-box' }}
          onFocus={e=>e.target.style.borderColor='#4361ee'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
      </div>
      <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
        {loading ? <div style={{ textAlign:'center', padding:'40px', color:'#a0aec0' }}>Loading...</div> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Patient','Contact','Age / Gender','Blood Group','Address','Appointments','Registered'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#a0aec0', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid #f0f4f8' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom:'1px solid #f7fafc' }}
                  onMouseEnter={e => e.currentTarget.style.background='#fafcff'}
                  onMouseLeave={e => e.currentTarget.style.background=''}>
                  <td style={{ padding:'13px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#4361ee,#2945cc)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'14px' }}>{p.name?.[0]}</div>
                      <div style={{ fontWeight:600, fontSize:'14px' }}>{p.name}</div>
                    </div>
                  </td>
                  <td style={{ padding:'13px 14px' }}><div style={{ fontSize:'13px' }}>{p.email}</div><div style={{ fontSize:'11px', color:'#a0aec0' }}>{p.phone}</div></td>
                  <td style={{ padding:'13px 14px', fontSize:'13px' }}>{p.age ? `${p.age} yrs` : '—'} / {p.gender||'—'}</td>
                  <td style={{ padding:'13px 14px' }}>{p.blood_group ? <span style={{ background:'#fee2e2', color:'#e63946', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>{p.blood_group}</span> : '—'}</td>
                  <td style={{ padding:'13px 14px', fontSize:'12px', color:'#718096', maxWidth:'160px' }}>{p.address||'—'}</td>
                  <td style={{ padding:'13px 14px' }}><span style={{ background:'#eef3ff', color:'#4361ee', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{p.total_appointments}</span></td>
                  <td style={{ padding:'13px 14px', fontSize:'12px', color:'#a0aec0' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

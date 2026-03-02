import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function DoctorPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/dashboard/patients')
      .then(res => setPatients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) ||
    p.blood_group?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h2>My Patients</h2>
          <p>Patients assigned to you via consultations and diagnostic tests</p>
        </div>
        <div style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'8px 16px', borderRadius:'20px', fontWeight:700, fontSize:'14px' }}>
          {patients.length} patients
        </div>
      </div>

      <div style={{ marginBottom:'20px' }}>
        <input
          placeholder="Search by name, email, phone, blood group..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', padding:'12px 16px', border:'2px solid #e2e8f0', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', outline:'none', boxSizing:'border-box' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#718096' }}>Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'60px', color:'#718096' }}>
          <div style={{ fontSize:'56px', marginBottom:'16px' }}>👥</div>
          <p style={{ fontSize:'16px' }}>{search ? 'No patients match your search' : 'No patients assigned to you yet'}</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap:'24px' }}>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age / Gender</th>
                  <th>Blood Group</th>
                  <th>Contact</th>
                  <th>Services</th>
                  <th>Visits</th>
                  <th>Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} onClick={() => setSelected(p)} style={{ cursor:'pointer', background: selected?.id === p.id ? '#f0fafa' : 'white' }}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{ width:'38px', height:'38px', background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'15px', flexShrink:0 }}>
                          {p.name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:'14px' }}>{p.name}</div>
                          <div style={{ color:'#718096', fontSize:'11px' }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:'13px' }}>{p.age ? `${p.age} yrs` : '-'} / {p.gender || '-'}</td>
                    <td>
                      {p.blood_group ? (
                        <span style={{ background:'#fee2e2', color:'#e63946', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>{p.blood_group}</span>
                      ) : '-'}
                    </td>
                    <td style={{ fontSize:'13px' }}>{p.phone || '-'}</td>
                    <td style={{ fontSize:'12px', color:'#718096', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {p.services ? p.services.split(', ').slice(0,2).join(', ') : '-'}
                    </td>
                    <td>
                      <span style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>
                        {p.total_appointments} visits
                      </span>
                    </td>
                    <td style={{ fontSize:'13px', color:'#718096' }}>
                      {p.last_visit ? new Date(p.last_visit).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="card" style={{ height:'fit-content', position:'sticky', top:'24px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
                <h3 style={{ fontSize:'18px' }}>Patient Details</h3>
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#718096' }}>✕</button>
              </div>
              <div style={{ textAlign:'center', marginBottom:'20px' }}>
                <div style={{ width:'72px', height:'72px', background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'32px', margin:'0 auto 12px' }}>
                  {selected.name?.[0]}
                </div>
                <div style={{ fontWeight:700, fontSize:'20px' }}>{selected.name}</div>
                {selected.blood_group && (
                  <span style={{ background:'#fee2e2', color:'#e63946', padding:'4px 12px', borderRadius:'20px', fontSize:'13px', fontWeight:700, display:'inline-block', marginTop:'6px' }}>
                    {selected.blood_group}
                  </span>
                )}
              </div>
              {[
                ['Email',      selected.email],
                ['Phone',      selected.phone || '-'],
                ['Age',        selected.age ? `${selected.age} years` : '-'],
                ['Gender',     selected.gender || '-'],
                ['Address',    selected.address || '-'],
                ['Total Visits', selected.total_appointments],
                ['Last Visit', selected.last_visit ? new Date(selected.last_visit).toDateString() : '-'],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #f0f4f8', fontSize:'13px' }}>
                  <span style={{ color:'#718096' }}>{k}</span>
                  <strong style={{ maxWidth:'180px', textAlign:'right', wordBreak:'break-word' }}>{v}</strong>
                </div>
              ))}
              {selected.services && (
                <div style={{ marginTop:'16px' }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#718096', textTransform:'uppercase', marginBottom:'8px' }}>Services Used</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                    {[...new Set(selected.services.split(', '))].map((s,i) => (
                      <span key={i} style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:500 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

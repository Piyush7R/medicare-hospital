import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text:'', type:'' });

  useEffect(() => {
    api.get('/admin/packages').then(r => setPackages(r.data)).catch(console.error);
  }, []);

  const startEdit = (pkg) => { setEditing(pkg.id); setForm({ ...pkg }); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/packages/${editing}`, form);
      setPackages(p => p.map(pkg => pkg.id === editing ? { ...pkg, ...form } : pkg));
      setMsg({ text:'Package updated ✅', type:'success' });
      setEditing(null);
      setTimeout(() => setMsg({ text:'', type:'' }), 3000);
    } catch (err) { setMsg({ text:'Update failed', type:'error' }); }
    finally { setSaving(false); }
  };

  return (
    <Layout>
      <div style={{ marginBottom:'24px' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'#6b21a8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>Admin</div>
        <h1 style={{ fontSize:'28px', fontFamily:"'Playfair Display',serif", color:'#1a202c', margin:'0 0 4px' }}>🧪 Test Packages</h1>
        <p style={{ color:'#718096', margin:0, fontSize:'14px' }}>Edit prices, room assignments and pre-requirements</p>
      </div>

      {msg.text && <div style={{ background:msg.type==='success'?'#eaf7ef':'#fff5f5', border:`1.5px solid ${msg.type==='success'?'#2a9d8f':'#e63946'}`, borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', color:msg.type==='success'?'#1a6e3c':'#c53030', fontWeight:600, fontSize:'13px' }}>{msg.text}</div>}

      <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
        {packages.map(pkg => (
          <div key={pkg.id} style={{ background:'white', borderRadius:'14px', padding:'20px 24px', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', border:`1.5px solid ${editing===pkg.id?'#6b21a8':'#e2e8f0'}` }}>
            {editing === pkg.id ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                  <div><label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>Package Name</label>
                    <input value={form.name} onChange={e=>set('name',e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'2px solid #e2e8f0', borderRadius:'8px', fontFamily:'inherit', fontSize:'14px', outline:'none', boxSizing:'border-box' }} /></div>
                  <div><label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>Price (₹)</label>
                    <input type="number" value={form.price} onChange={e=>set('price',e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'2px solid #e2e8f0', borderRadius:'8px', fontFamily:'inherit', fontSize:'14px', outline:'none', boxSizing:'border-box' }} /></div>
                  <div><label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>Room Number</label>
                    <input value={form.room_number||''} onChange={e=>set('room_number',e.target.value)} placeholder="e.g. Room 1 - Blood Collection" style={{ width:'100%', padding:'10px 12px', border:'2px solid #e2e8f0', borderRadius:'8px', fontFamily:'inherit', fontSize:'14px', outline:'none', boxSizing:'border-box' }} /></div>
                  <div><label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>Duration (hours)</label>
                    <input type="number" value={form.duration_hours||1} onChange={e=>set('duration_hours',e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'2px solid #e2e8f0', borderRadius:'8px', fontFamily:'inherit', fontSize:'14px', outline:'none', boxSizing:'border-box' }} /></div>
                </div>
                <div><label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>Pre-requirements</label>
                  <textarea rows={3} value={form.pre_requirements||''} onChange={e=>set('pre_requirements',e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'2px solid #e2e8f0', borderRadius:'8px', fontFamily:'inherit', fontSize:'13px', outline:'none', resize:'vertical', boxSizing:'border-box' }} /></div>
                <div><label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>Description</label>
                  <textarea rows={2} value={form.description||''} onChange={e=>set('description',e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'2px solid #e2e8f0', borderRadius:'8px', fontFamily:'inherit', fontSize:'13px', outline:'none', resize:'vertical', boxSizing:'border-box' }} /></div>
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={handleSave} disabled={saving} style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6b21a8,#4c1d95)', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'14px', opacity:saving?0.7:1 }}>
                    {saving?'Saving...':'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(null)} style={{ padding:'10px 18px', background:'#f7fafc', border:'1.5px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', fontSize:'14px', color:'#718096', fontWeight:600 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'20px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:'16px', color:'#1a202c', marginBottom:'6px' }}>{pkg.name}</div>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                    <span style={{ background:'#eaf7ef', color:'#1a6e3c', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>₹{pkg.price}</span>
                    <span style={{ background:'#f0fafa', color:'#0a6e6e', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:500 }}>🚪 {pkg.room_number||'Not set'}</span>
                    {pkg.pre_requirements && <span style={{ background:'#fffbf0', color:'#856404', padding:'3px 10px', borderRadius:'20px', fontSize:'12px' }}>⚠️ Has pre-requirements</span>}
                  </div>
                  {pkg.description && <div style={{ color:'#718096', fontSize:'12px', marginTop:'6px' }}>{pkg.description}</div>}
                </div>
                <button onClick={() => startEdit(pkg)} style={{ padding:'8px 18px', background:'white', border:'2px solid #6b21a8', color:'#6b21a8', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'13px', flexShrink:0 }}>✏️ Edit</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}

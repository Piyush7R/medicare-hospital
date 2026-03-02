import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const statusColor = { booked:'info', checked_in:'warning', in_progress:'warning', completed:'success', cancelled:'danger' };

function ReportUploadPanel({ onSuccess }) {
  const [token, setToken]           = useState('');
  const [foundAppt, setFoundAppt]   = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [form, setForm]             = useState({ report_title:'', report_content:'', dispatch_date:'' });
  const [pdfFile, setPdfFile]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState({ text:'', type:'' });
  const fileRef = useRef();

  const searchToken = async () => {
    const t = token.trim().toUpperCase();
    if (!t) return setTokenError('Enter a token number');
    setTokenError(''); setFoundAppt(null); setTokenLoading(true);
    try {
      const res = await api.get(`/reception/token/${t}`);
      if (!res.data.payment_confirmed)
        return setTokenError('Payment not confirmed for this token. Confirm payment first.');
      setFoundAppt(res.data);
      setForm(f => ({ ...f, report_title: `${res.data.package_name || 'Consultation'} Report` }));
    } catch (err) {
      setTokenError(err.response?.data?.message || 'Token not found');
    } finally { setTokenLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foundAppt) return;
    setLoading(true); setMsg({ text:'', type:'' });
    try {
      const formData = new FormData();
      formData.append('token_number', token.trim().toUpperCase());
      formData.append('report_title', form.report_title);
      formData.append('report_content', form.report_content);
      formData.append('dispatch_date', form.dispatch_date);
      if (pdfFile) formData.append('pdf_file', pdfFile);

      await api.post('/reception/upload-report', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg({ text:`✅ Report uploaded for ${foundAppt.patient_name}! Email sent.`, type:'success' });
      setFoundAppt(null); setToken(''); setPdfFile(null);
      setForm({ report_title:'', report_content:'', dispatch_date:'' });
      if (fileRef.current) fileRef.current.value = '';
      onSuccess();
    } catch (err) {
      setMsg({ text:'❌ ' + (err.response?.data?.message || 'Upload failed'), type:'error' });
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
      {/* Token Search */}
      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
        <div className="card">
          <div style={{ fontSize:'12px', fontWeight:700, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'14px' }}>Step 1 — Search Token</div>
          <div style={{ display:'flex', gap:'10px', marginBottom:'10px' }}>
            <input
              value={token}
              onChange={e => setToken(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && searchToken()}
              placeholder="e.g. TKN-100001"
              style={{ flex:1, padding:'11px 14px', border:`2px solid ${tokenError?'#e63946':'#e2e8f0'}`, borderRadius:'8px', fontFamily:'inherit', fontSize:'15px', fontWeight:700, letterSpacing:'2px', outline:'none', textTransform:'uppercase' }}
            />
            <button onClick={searchToken} className="btn btn-primary" disabled={tokenLoading}>{tokenLoading?'...':'Search'}</button>
          </div>
          {tokenError && <p style={{ color:'#e63946', fontSize:'13px', margin:0 }}>❌ {tokenError}</p>}
        </div>

        {foundAppt && (
          <div className="card" style={{ border:'2px solid #2a9d8f', background:'#f0fafa' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#2a9d8f', textTransform:'uppercase', marginBottom:'12px' }}>✅ Patient Found</div>
            <div style={{ display:'flex', gap:'12px', alignItems:'center', marginBottom:'14px' }}>
              <div style={{ width:'48px', height:'48px', background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'20px' }}>
                {foundAppt.patient_name?.[0]}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:'16px' }}>{foundAppt.patient_name}</div>
                <div style={{ color:'#718096', fontSize:'12px' }}>{foundAppt.patient_email}</div>
              </div>
            </div>
            {[['Token', foundAppt.token_number], ['Package', foundAppt.package_name||'Consultation'], ['Date', new Date(foundAppt.appointment_date).toDateString()], ['Age', foundAppt.age?`${foundAppt.age} yrs`:'-'], ['Blood Group', foundAppt.blood_group||'-']].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #c8e6e6', fontSize:'13px' }}>
                <span style={{ color:'#4a5568' }}>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Form */}
      <div className="card">
        <div style={{ fontSize:'12px', fontWeight:700, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'14px' }}>Step 2 — Upload Report</div>
        {!foundAppt ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#718096' }}>
            <div style={{ fontSize:'40px', marginBottom:'10px' }}>🔍</div>
            <p>Search a token to upload a report</p>
          </div>
        ) : (
          <>
            {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom:'14px' }}>{msg.text}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Report Title</label>
                <input value={form.report_title} onChange={e => setForm(f=>({...f,report_title:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Notes / Findings <span style={{ fontWeight:400, color:'#718096', fontSize:'12px' }}>(optional if attaching PDF)</span></label>
                <textarea rows={5} value={form.report_content} onChange={e => setForm(f=>({...f,report_content:e.target.value}))} placeholder="Enter findings or leave blank if attaching PDF..." style={{ resize:'vertical' }} />
              </div>
              <div className="form-group">
                <label>Dispatch Date</label>
                <input type="date" value={form.dispatch_date} onChange={e => setForm(f=>({...f,dispatch_date:e.target.value}))} />
              </div>
              {/* PDF Upload */}
              <div className="form-group">
                <label>Attach PDF Report <span style={{ fontWeight:400, color:'#718096', fontSize:'12px' }}>(optional)</span></label>
                <div style={{ border:`2px dashed ${pdfFile?'#0a6e6e':'#e2e8f0'}`, borderRadius:'10px', padding:'14px', background:pdfFile?'#f0fafa':'white' }}>
                  <input ref={fileRef} type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0]||null)} style={{ display:'none' }} id="pdf-upload-reception" />
                  <label htmlFor="pdf-upload-reception" style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ fontSize:'28px' }}>📄</span>
                    <div>
                      {pdfFile
                        ? <><div style={{ fontWeight:600, color:'#0a6e6e', fontSize:'13px' }}>{pdfFile.name}</div><div style={{ color:'#718096', fontSize:'11px' }}>{(pdfFile.size/1024).toFixed(1)} KB</div></>
                        : <><div style={{ fontWeight:600, color:'#1a202c', fontSize:'13px' }}>Click to attach PDF</div><div style={{ color:'#718096', fontSize:'11px' }}>Max 10MB</div></>
                      }
                    </div>
                  </label>
                  {pdfFile && <button type="button" onClick={() => { setPdfFile(null); if(fileRef.current) fileRef.current.value=''; }} style={{ background:'none', border:'none', color:'#e63946', cursor:'pointer', fontSize:'12px', marginTop:'6px', padding:0 }}>✕ Remove</button>}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px' }} disabled={loading}>
                {loading ? 'Uploading...' : `📋 Upload Report & Email ${foundAppt.patient_name}`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReceptionDashboard() {
  const [data, setData]             = useState(null);
  const [reports, setReports]       = useState([]);
  const [token, setToken]           = useState('');
  const [foundAppt, setFoundAppt]   = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [msg, setMsg]               = useState({ text:'', type:'' });
  const [filter, setFilter]         = useState('all');
  const [tab, setTab]               = useState('checkin');
  const tokenInput = useRef();

  const fetchToday  = () => api.get('/reception/today').then(res => setData(res.data)).catch(console.error);
  const fetchReports = () => api.get('/reception/reports').then(res => setReports(res.data)).catch(console.error);

  useEffect(() => {
    fetchToday(); fetchReports();
    const t = setInterval(() => { fetchToday(); fetchReports(); }, 15000);
    return () => clearInterval(t);
  }, []);

  const searchToken = async () => {
    const t = token.trim().toUpperCase();
    if (!t) return setTokenError('Enter a token number');
    setTokenError(''); setFoundAppt(null); setTokenLoading(true);
    try {
      const res = await api.get(`/reception/token/${t}`);
      setFoundAppt(res.data);
    } catch (err) {
      setTokenError(err.response?.data?.message || 'Token not found');
    } finally { setTokenLoading(false); }
  };

  const handleConfirm = async () => {
    setConfirmLoading(true); setMsg({ text:'', type:'' });
    try {
      await api.post('/reception/confirm-payment', { token: foundAppt.token_number });
      setMsg({ text:`✅ Payment confirmed for ${foundAppt.patient_name}!`, type:'success' });
      setFoundAppt(null); setToken('');
      fetchToday();
      setTimeout(() => tokenInput.current?.focus(), 100);
    } catch (err) {
      setMsg({ text:'❌ ' + (err.response?.data?.message || 'Failed'), type:'error' });
    } finally { setConfirmLoading(false); }
  };

  const filtered = data?.appointments?.filter(a => {
    if (filter === 'pending')   return !a.payment_confirmed && a.status === 'booked';
    if (filter === 'confirmed') return a.payment_confirmed;
    if (filter === 'completed') return a.status === 'completed';
    return true;
  }) || [];

  return (
    <Layout>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div><h2>Reception Desk</h2><p>{new Date().toDateString()}</p></div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#718096' }}>
          <span style={{ width:'8px', height:'8px', background:'#2a9d8f', borderRadius:'50%', display:'inline-block', animation:'pulse 2s infinite' }} />
          Live — auto-refreshes every 15s
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid-4" style={{ marginBottom:'24px' }}>
          {[
            { icon:'📅', label:'Total Today',      value:data.stats.total,     bg:'#e8f5f5', color:'#0a6e6e' },
            { icon:'⏳', label:'Awaiting Payment', value:data.stats.pending,   bg:'#fff8e8', color:'#f0a500' },
            { icon:'✅', label:'Confirmed',         value:data.stats.confirmed, bg:'#eaf7ef', color:'#2a9d8f' },
            { icon:'🏁', label:'Completed',         value:data.stats.completed, bg:'#eef3ff', color:'#4361ee' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background:s.bg, color:s.color, fontSize:'24px' }}>{s.icon}</div>
              <div className="stat-info"><h3 style={{ color:s.color }}>{s.value}</h3><p>{s.label}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
        {[
          { id:'checkin', label:'💳 Payment & Check-in' },
          { id:'reports', label:'📋 Upload Report' },
          { id:'history', label:'📂 Report History' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:'10px 20px', border:`2px solid ${tab===t.id?'#0a6e6e':'#e2e8f0'}`, borderRadius:'8px', background:tab===t.id?'#0a6e6e':'white', cursor:'pointer', fontSize:'14px', fontWeight:500, color:tab===t.id?'white':'#718096', transition:'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Check-in Tab ── */}
      {tab === 'checkin' && (
        <div style={{ display:'grid', gridTemplateColumns:'420px 1fr', gap:'24px' }}>
          {/* Token Search */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div className="card">
              <div style={{ fontSize:'12px', fontWeight:700, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'16px' }}>🔍 Search by Token</div>
              <div style={{ display:'flex', gap:'10px', marginBottom:'10px' }}>
                <input ref={tokenInput} value={token} onChange={e => setToken(e.target.value.toUpperCase())} onKeyDown={e => e.key==='Enter'&&searchToken()} placeholder="e.g. TKN-100001" autoFocus
                  style={{ flex:1, padding:'12px 14px', border:`2px solid ${tokenError?'#e63946':'#e2e8f0'}`, borderRadius:'8px', fontFamily:'inherit', fontSize:'16px', fontWeight:700, letterSpacing:'2px', outline:'none', textTransform:'uppercase' }} />
                <button onClick={searchToken} className="btn btn-primary" disabled={tokenLoading}>{tokenLoading?'...':'Search'}</button>
              </div>
              {tokenError && <p style={{ color:'#e63946', fontSize:'13px', margin:0 }}>❌ {tokenError}</p>}
              {msg.text && <div style={{ marginTop:'8px', background:msg.type==='success'?'#efe':'#fee', border:`1px solid ${msg.type==='success'?'#cfc':'#fcc'}`, borderRadius:'8px', padding:'10px 12px', color:msg.type==='success'?'#2a9d8f':'#e63946', fontSize:'13px', fontWeight:500 }}>{msg.text}</div>}
            </div>

            {foundAppt && (
              <div className="card" style={{ border:`2px solid ${foundAppt.payment_confirmed?'#f0a500':'#0a6e6e'}` }}>
                {foundAppt.payment_confirmed && (
                  <div style={{ background:'#fffbf0', border:'1.5px solid #f0a500', borderRadius:'8px', padding:'10px 12px', marginBottom:'14px', fontSize:'13px', color:'#856404', fontWeight:600 }}>
                    ⚠️ Payment already confirmed for this token
                  </div>
                )}
                <div style={{ display:'flex', gap:'12px', alignItems:'center', marginBottom:'14px', paddingBottom:'14px', borderBottom:'1px solid #e2e8f0' }}>
                  <div style={{ width:'52px', height:'52px', background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'22px', flexShrink:0 }}>{foundAppt.patient_name?.[0]}</div>
                  <div><div style={{ fontWeight:700, fontSize:'17px' }}>{foundAppt.patient_name}</div><div style={{ color:'#718096', fontSize:'12px' }}>{foundAppt.patient_phone}</div></div>
                </div>
                {[['Token', foundAppt.token_number], ['Type', foundAppt.appointment_type==='consultation'?'👨‍⚕️ Consultation':'🧪 Test'], ['Package/Doctor', foundAppt.package_name||`Dr. ${foundAppt.doctor_name}`||'N/A'], ['Date', new Date(foundAppt.appointment_date).toDateString()], ['Time', foundAppt.appointment_time?.slice(0,5)], ['Amount', `₹${foundAppt.payment_amount||0}`], ['Payment', foundAppt.payment_confirmed?`✅ Confirmed`:'⏳ Pending']].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f0f4f8', fontSize:'13px' }}>
                    <span style={{ color:'#718096' }}>{k}</span><strong style={{ textTransform:'capitalize' }}>{v}</strong>
                  </div>
                ))}
                {!foundAppt.payment_confirmed && foundAppt.status !== 'cancelled' && foundAppt.status !== 'completed' && (
                  <button onClick={handleConfirm} disabled={confirmLoading} style={{ width:'100%', marginTop:'14px', padding:'13px', background:'linear-gradient(135deg,#2a9d8f,#0a6e6e)', color:'white', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:700, cursor:'pointer' }}>
                    {confirmLoading ? 'Confirming...' : '✅ Confirm Payment & Check In'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Today's List */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ fontSize:'18px' }}>Today's Appointments</h3>
              <div style={{ display:'flex', gap:'6px' }}>
                {[{id:'all',label:'All'},{id:'pending',label:'⏳ Pending'},{id:'confirmed',label:'✅ Confirmed'},{id:'completed',label:'🏁 Done'}].map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding:'5px 10px', border:`2px solid ${filter===f.id?'#0a6e6e':'#e2e8f0'}`, borderRadius:'20px', background:filter===f.id?'#0a6e6e':'white', color:filter===f.id?'white':'#718096', cursor:'pointer', fontSize:'11px', fontWeight:600 }}>{f.label}</button>
                ))}
              </div>
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#718096' }}><div style={{ fontSize:'48px', marginBottom:'12px' }}>📋</div><p>No appointments</p></div>
            ) : (
              <table>
                <thead><tr><th>Token</th><th>Patient</th><th>Type</th><th>Time</th><th>Amount</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}>
                      <td><strong style={{ color:'#0a6e6e', fontSize:'13px' }}>{a.token_number}</strong></td>
                      <td><div style={{ fontWeight:600, fontSize:'14px' }}>{a.patient_name}</div><div style={{ color:'#718096', fontSize:'11px' }}>{a.age&&`${a.age}y`}{a.gender&&` / ${a.gender}`}</div></td>
                      <td><span style={{ background:a.appointment_type==='consultation'?'#eef3ff':'#e8f5f5', color:a.appointment_type==='consultation'?'#4361ee':'#0a6e6e', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>{a.appointment_type==='consultation'?'Consult':'Test'}</span></td>
                      <td style={{ fontSize:'13px', fontWeight:600 }}>{a.appointment_time?.slice(0,5)}</td>
                      <td style={{ fontSize:'13px', fontWeight:600 }}>₹{a.payment_amount||0}</td>
                      <td>{a.payment_confirmed ? <span className="badge badge-success">Paid ✅</span> : <span className="badge badge-warning">Pending</span>}</td>
                      <td><span className={`badge badge-${statusColor[a.status]}`}>{a.status}</span></td>
                      <td>
                        {!a.payment_confirmed && a.status==='booked' && (
                          <button onClick={() => { setToken(a.token_number); api.get(`/reception/token/${a.token_number}`).then(r => setFoundAppt(r.data)).catch(console.error); }} style={{ padding:'4px 10px', background:'#0a6e6e', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>Confirm</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Upload Report Tab ── */}
      {tab === 'reports' && <ReportUploadPanel onSuccess={fetchReports} />}

      {/* ── Report History Tab ── */}
      {tab === 'history' && (
        <div className="card">
          {reports.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#718096' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>📂</div><p>No reports uploaded yet</p>
            </div>
          ) : (
            <table>
              <thead><tr><th>Token</th><th>Patient</th><th>Report</th><th>Date</th><th>PDF</th></tr></thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}>
                    <td><strong style={{ color:'#0a6e6e' }}>{r.token_number}</strong></td>
                    <td style={{ fontWeight:600 }}>{r.patient_name}</td>
                    <td>{r.report_title}</td>
                    <td style={{ fontSize:'13px' }}>{new Date(r.appointment_date).toLocaleDateString()}</td>
                    <td>{r.pdf_path ? <a href={`http://localhost:5001/uploads/${r.pdf_path}`} target="_blank" rel="noreferrer" style={{ color:'#e63946', fontWeight:600, fontSize:'13px' }}>📄 PDF</a> : <span style={{ color:'#718096', fontSize:'12px' }}>Text only</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </Layout>
  );
}

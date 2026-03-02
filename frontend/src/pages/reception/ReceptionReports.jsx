import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function ReceptionReports() {
  const [view, setView]             = useState('upload');
  const [token, setToken]           = useState('');
  const [foundAppt, setFoundAppt]   = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [searching, setSearching]   = useState(false);
  const [form, setForm]             = useState({ report_title:'', report_content:'', dispatch_date:'' });
  const [pdfFile, setPdfFile]       = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');
  const [reports, setReports]       = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const fileRef = useRef();
  const inputRef = useRef();

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);
  useEffect(() => { if (view === 'history') fetchReports(); }, [view]);

  const fetchReports = () => {
    setReportsLoading(true);
    api.get('/reception/reports').then(r => setReports(r.data)).catch(console.error).finally(() => setReportsLoading(false));
  };

  const doSearch = async () => {
    const t = token.trim().toUpperCase();
    if (!t) return setTokenError('Enter a token number');
    setTokenError(''); setFoundAppt(null); setSuccess(''); setError(''); setSearching(true);
    try {
      const res = await api.get(`/reception/token/${t}`);
      if (!res.data.payment_confirmed)
        return setTokenError('Payment not confirmed for this token. Go to Payment page first.');
      setFoundAppt(res.data);
      setForm(f => ({ ...f, report_title:`${res.data.package_name||'Consultation'} Report`, dispatch_date: new Date().toISOString().split('T')[0] }));
    } catch (err) {
      setTokenError(err.response?.data?.message || 'Token not found');
    } finally { setSearching(false); }
  };

  const doUpload = async (e) => {
    e.preventDefault();
    if (!form.report_title.trim()) return setError('Report title is required');
    setError(''); setSuccess(''); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('token_number', token.trim().toUpperCase());
      fd.append('report_title', form.report_title);
      fd.append('report_content', form.report_content);
      fd.append('dispatch_date', form.dispatch_date);
      if (pdfFile) fd.append('pdf_file', pdfFile);
      await api.post('/reception/upload-report', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      setSuccess(`Report uploaded for ${foundAppt.patient_name}! Email sent${pdfFile?' with PDF attached':''}.`);
      setFoundAppt(null); setToken('');
      setForm({ report_title:'', report_content:'', dispatch_date:'' });
      setPdfFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <Layout>
      <div style={{ marginBottom:'28px' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'#4361ee', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>Reception</div>
        <h1 style={{ fontSize:'30px', fontFamily:"'Playfair Display',serif", color:'#1a202c', margin:'0 0 4px' }}>📋 Reports</h1>
        <p style={{ color:'#718096', margin:0, fontSize:'14px' }}>Upload lab results and test reports, email them directly to patients</p>
      </div>

      {/* Toggle */}
      <div style={{ display:'inline-flex', background:'white', padding:'5px', borderRadius:'12px', gap:'4px', marginBottom:'28px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
        {[{id:'upload',label:'📤 Upload Report'},{id:'history',label:'📂 History'}].map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            style={{ padding:'10px 24px', borderRadius:'8px', border:'none', background:view===v.id?'#4361ee':'transparent', color:view===v.id?'white':'#718096', cursor:'pointer', fontWeight:600, fontSize:'14px', transition:'all 0.2s' }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Upload view ── */}
      {view === 'upload' && (
        <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:'24px', alignItems:'start' }}>

          {/* Left — Search + patient card */}
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'14px' }}>Step 1 — Patient Token</div>

              {success && (
                <div style={{ background:'#eaf7ef', border:'1.5px solid #2a9d8f', borderRadius:'10px', padding:'12px 14px', color:'#1a6e3c', fontSize:'13px', fontWeight:600, marginBottom:'14px', display:'flex', gap:'8px', alignItems:'flex-start' }}>
                  <span>✅</span> {success}
                </div>
              )}

              <div style={{ display:'flex', gap:'10px' }}>
                <input ref={inputRef} value={token} onChange={e => { setToken(e.target.value.toUpperCase()); setTokenError(''); }} onKeyDown={e => e.key==='Enter'&&doSearch()} placeholder="TKN-XXXXXX"
                  style={{ flex:1, padding:'13px 16px', border:`2.5px solid ${tokenError?'#e63946':foundAppt?'#2a9d8f':'#e2e8f0'}`, borderRadius:'10px', fontFamily:'monospace', fontSize:'16px', fontWeight:700, letterSpacing:'3px', outline:'none', color:'#1a202c', transition:'border-color 0.2s', textTransform:'uppercase' }} />
                <button onClick={doSearch} disabled={searching}
                  style={{ padding:'13px 18px', background:'linear-gradient(135deg,#4361ee,#2945cc)', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:700, fontSize:'15px', opacity:searching?0.6:1 }}>
                  {searching ? '...' : '🔍'}
                </button>
              </div>
              {tokenError && <p style={{ color:'#e63946', fontSize:'13px', margin:'8px 0 0', fontWeight:500 }}>❌ {tokenError}</p>}
            </div>

            {foundAppt && (
              <div style={{ background:'white', borderRadius:'16px', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)', border:'2px solid #2a9d8f' }}>
                <div style={{ background:'linear-gradient(135deg,#0a6e6e,#064444)', padding:'18px 20px', display:'flex', gap:'14px', alignItems:'center' }}>
                  <div style={{ width:'52px', height:'52px', background:'rgba(255,255,255,0.2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:'24px', flexShrink:0 }}>{foundAppt.patient_name?.[0]}</div>
                  <div>
                    <div style={{ color:'white', fontWeight:800, fontSize:'18px' }}>{foundAppt.patient_name}</div>
                    <div style={{ color:'rgba(255,255,255,0.7)', fontSize:'12px', marginTop:'2px' }}>{foundAppt.patient_email}</div>
                  </div>
                </div>
                <div style={{ padding:'16px 20px' }}>
                  {[['Token',foundAppt.token_number],['Package',foundAppt.package_name||'Consultation'],['Date',new Date(foundAppt.appointment_date).toDateString()],['Age',foundAppt.age?`${foundAppt.age} yrs`:'—'],['Blood',foundAppt.blood_group||'—']].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f7fafc', fontSize:'13px' }}>
                      <span style={{ color:'#a0aec0', fontWeight:600, textTransform:'uppercase', fontSize:'11px', letterSpacing:'0.5px' }}>{k}</span>
                      <strong style={{ color:'#1a202c' }}>{v}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Form */}
          <div style={{ background:'white', borderRadius:'16px', padding:'28px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'20px' }}>Step 2 — Report Details</div>

            {!foundAppt ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'#a0aec0' }}>
                <div style={{ fontSize:'56px', marginBottom:'12px', opacity:0.4 }}>📋</div>
                <p style={{ fontSize:'14px', margin:0 }}>Search a patient token to begin uploading their report</p>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ background:'#fff5f5', border:'1.5px solid #fed7d7', borderRadius:'10px', padding:'12px 16px', color:'#c53030', fontSize:'13px', fontWeight:600, marginBottom:'16px' }}>❌ {error}</div>
                )}
                <form onSubmit={doUpload} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
                  <div>
                    <label style={{ display:'block', fontWeight:700, fontSize:'12px', color:'#4a5568', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Report Title <span style={{ color:'#e63946' }}>*</span></label>
                    <input value={form.report_title} onChange={e => setForm(f=>({...f,report_title:e.target.value}))} required
                      style={{ width:'100%', padding:'13px 16px', border:'2px solid #e2e8f0', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', outline:'none', boxSizing:'border-box', transition:'border 0.2s' }}
                      onFocus={e=>e.target.style.borderColor='#4361ee'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
                  </div>

                  <div>
                    <label style={{ display:'block', fontWeight:700, fontSize:'12px', color:'#4a5568', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Findings / Notes
                      <span style={{ fontWeight:400, color:'#a0aec0', textTransform:'none', letterSpacing:0, marginLeft:'6px', fontSize:'11px' }}>optional if attaching PDF</span>
                    </label>
                    <textarea rows={7} value={form.report_content} onChange={e => setForm(f=>({...f,report_content:e.target.value}))} placeholder="Enter test results, observations, recommendations..."
                      style={{ width:'100%', padding:'13px 16px', border:'2px solid #e2e8f0', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:'1.6' }}
                      onFocus={e=>e.target.style.borderColor='#4361ee'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                    <div>
                      <label style={{ display:'block', fontWeight:700, fontSize:'12px', color:'#4a5568', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Dispatch Date</label>
                      <input type="date" value={form.dispatch_date} onChange={e => setForm(f=>({...f,dispatch_date:e.target.value}))}
                        style={{ width:'100%', padding:'13px 16px', border:'2px solid #e2e8f0', borderRadius:'10px', fontFamily:'inherit', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display:'block', fontWeight:700, fontSize:'12px', color:'#4a5568', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Attach PDF</label>
                      <input ref={fileRef} type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0]||null)} style={{ display:'none' }} id="pdf-upload" />
                      <label htmlFor="pdf-upload"
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px', border:`2px dashed ${pdfFile?'#4361ee':'#e2e8f0'}`, borderRadius:'10px', cursor:'pointer', background:pdfFile?'#f0f2ff':'white', transition:'all 0.2s', height:'48px', boxSizing:'border-box' }}>
                        <span style={{ fontSize:'20px' }}>📄</span>
                        <div style={{ fontSize:'13px', overflow:'hidden', flex:1 }}>
                          {pdfFile
                            ? <><div style={{ fontWeight:700, color:'#4361ee', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{pdfFile.name}</div><div style={{ color:'#718096', fontSize:'11px' }}>{(pdfFile.size/1024).toFixed(0)} KB</div></>
                            : <span style={{ color:'#a0aec0' }}>Click to attach</span>
                          }
                        </div>
                      </label>
                      {pdfFile && <button type="button" onClick={()=>{setPdfFile(null);if(fileRef.current)fileRef.current.value='';}} style={{ background:'none', border:'none', color:'#e63946', cursor:'pointer', fontSize:'12px', padding:'4px 0 0', fontWeight:600 }}>✕ Remove</button>}
                    </div>
                  </div>

                  <button type="submit" disabled={uploading}
                    style={{ padding:'14px', background:'linear-gradient(135deg,#4361ee,#2945cc)', color:'white', border:'none', borderRadius:'12px', fontSize:'15px', fontWeight:700, cursor:'pointer', opacity:uploading?0.7:1, transition:'all 0.2s', marginTop:'4px' }}>
                    {uploading ? 'Uploading...' : `📤 Upload & Email to ${foundAppt.patient_name}`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── History view ── */}
      {view === 'history' && (
        <div style={{ background:'white', borderRadius:'16px', padding:'28px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
          {reportsLoading ? (
            <div style={{ textAlign:'center', padding:'48px', color:'#a0aec0' }}>Loading...</div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#a0aec0' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px', opacity:0.4 }}>📂</div>
              <p style={{ fontSize:'15px', margin:0 }}>No reports uploaded yet</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Date','Token','Patient','Report Title','PDF','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#a0aec0', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid #f0f4f8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r,i) => (
                  <tr key={r.id} style={{ borderBottom:'1px solid #f7fafc' }}
                    onMouseEnter={e => e.currentTarget.style.background='#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={{ padding:'14px 16px', fontSize:'13px', color:'#718096' }}>{new Date(r.created_at||r.appointment_date).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding:'14px 16px' }}><span style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>{r.token_number}</span></td>
                    <td style={{ padding:'14px 16px', fontWeight:700, fontSize:'14px', color:'#1a202c' }}>{r.patient_name}</td>
                    <td style={{ padding:'14px 16px', fontSize:'13px', color:'#4a5568' }}>{r.report_title}</td>
                    <td style={{ padding:'14px 16px' }}>
                      {r.pdf_path
                        ? <a href={`http://localhost:5001/uploads/${r.pdf_path}`} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'#f0f2ff', color:'#4361ee', padding:'5px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:700, textDecoration:'none' }}>
                            📄 Open PDF
                          </a>
                        : <span style={{ color:'#a0aec0', fontSize:'12px' }}>Text only</span>
                      }
                    </td>
                    <td style={{ padding:'14px 16px' }}>
                      <span style={{ background:'#eaf7ef', color:'#1a6e3c', padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:700 }}>✅ Sent</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Layout>
  );
}

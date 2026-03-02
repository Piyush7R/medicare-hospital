import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function DoctorReports() {
  const [reports, setReports] = useState([]);
  const [token, setToken] = useState('');
  const [foundAppt, setFoundAppt] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [form, setForm] = useState({ report_title:'', report_content:'', dispatch_date:'' });
  const [pdfFile, setPdfFile] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('create');
  const fileRef = useRef();

  useEffect(() => { api.get('/reports/all').then(res=>setReports(res.data)); }, []);

  const searchToken = async () => {
    if (!token.trim()) return setTokenError('Please enter a token number');
    setTokenError(''); setFoundAppt(null); setTokenLoading(true);
    try {
      const res = await api.get(`/reports/token/${token.trim().toUpperCase()}`);
      setFoundAppt(res.data);
      setForm(f=>({...f, report_title:`${res.data.package_name || 'Consultation'} Report`}));
    } catch (err) {
      setTokenError(err.response?.data?.message || 'Token not found');
    } finally { setTokenLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      // Use FormData to support PDF file upload
      const formData = new FormData();
      formData.append('token_number', token.trim().toUpperCase());
      formData.append('report_title', form.report_title);
      formData.append('report_content', form.report_content);
      formData.append('dispatch_date', form.dispatch_date);
      if (pdfFile) formData.append('pdf_file', pdfFile);

      await api.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(`✅ Report created! ${foundAppt?.patient_name} has been notified by email${pdfFile ? ' with PDF attached' : ''}.`);
      setFoundAppt(null); setToken(''); setPdfFile(null);
      setForm({ report_title:'', report_content:'', dispatch_date:'' });
      if (fileRef.current) fileRef.current.value = '';
      api.get('/reports/all').then(res=>setReports(res.data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create report');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="page-header"><h2>Reports Management</h2><p>Create reports linked to patients via token — email sent automatically</p></div>

      <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
        {[{id:'create',label:'📝 Create Report'},{id:'history',label:'📋 Report History'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'10px 20px',border:`2px solid ${tab===t.id?'#0a6e6e':'#e2e8f0'}`,borderRadius:'8px',background:tab===t.id?'#0a6e6e':'white',cursor:'pointer',fontSize:'14px',fontWeight:500,color:tab===t.id?'white':'#718096',transition:'all 0.2s'}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px'}}>
          {/* Left — Token Search + Patient Card */}
          <div>
            <div className="card" style={{marginBottom:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:700,color:'#0a6e6e',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'16px'}}>
                Step 1: Enter Patient Token Number
              </div>
              <p style={{color:'#718096',fontSize:'13px',marginBottom:'16px'}}>
                The report will be automatically linked to the patient and sent to their email.
              </p>
              <div style={{display:'flex',gap:'10px'}}>
                <input
                  value={token}
                  onChange={e=>setToken(e.target.value.toUpperCase())}
                  onKeyDown={e=>e.key==='Enter'&&searchToken()}
                  placeholder="e.g. TKN-373269"
                  style={{flex:1,padding:'11px 14px',border:`2px solid ${tokenError?'#e63946':'#e2e8f0'}`,borderRadius:'8px',fontFamily:'inherit',fontSize:'15px',outline:'none',fontWeight:700,letterSpacing:'2px'}}
                />
                <button onClick={searchToken} className="btn btn-primary" disabled={tokenLoading}>
                  {tokenLoading?'...':'🔍 Search'}
                </button>
              </div>
              {tokenError && <p style={{color:'#e63946',fontSize:'13px',marginTop:'8px'}}>❌ {tokenError}</p>}
            </div>

            {foundAppt && (
              <div className="card" style={{border:'2px solid #2a9d8f',background:'#f0fafa'}}>
                <div style={{fontSize:'12px',fontWeight:700,color:'#2a9d8f',textTransform:'uppercase',marginBottom:'12px'}}>✅ Patient Found</div>
                <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'16px'}}>
                  <div style={{width:'52px',height:'52px',background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:'22px',flexShrink:0}}>
                    {foundAppt.patient_name?.[0]}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'16px'}}>{foundAppt.patient_name}</div>
                    <div style={{color:'#718096',fontSize:'13px'}}>{foundAppt.patient_email}</div>
                  </div>
                </div>
                {[['Token',foundAppt.token_number],['Package',foundAppt.package_name||'Consultation'],['Date',new Date(foundAppt.appointment_date).toDateString()],['Age',foundAppt.age?`${foundAppt.age} yrs`:'-'],['Gender',foundAppt.gender||'-'],['Blood Group',foundAppt.blood_group||'-'],['Status',foundAppt.status]].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #c8e6e6',fontSize:'13px'}}>
                    <span style={{color:'#4a5568'}}>{k}</span><strong style={{textTransform:'capitalize'}}>{v}</strong>
                  </div>
                ))}
                {foundAppt.patient_note && (
                  <div style={{marginTop:'12px',background:'#fffbf0',border:'1px solid #f0a500',borderRadius:'8px',padding:'10px'}}>
                    <div style={{fontSize:'12px',fontWeight:700,color:'#856404',marginBottom:'4px'}}>📝 Patient's Note</div>
                    <div style={{color:'#856404',fontSize:'13px'}}>{foundAppt.patient_note}</div>
                  </div>
                )}
                {foundAppt.image_path && (
                  <div style={{marginTop:'12px'}}>
                    <div style={{fontSize:'12px',fontWeight:700,color:'#718096',textTransform:'uppercase',marginBottom:'8px'}}>🖼 Patient Image</div>
                    <img src={`http://localhost:5001/uploads/${foundAppt.image_path}`} alt="patient" style={{maxWidth:'100%',borderRadius:'8px',border:'2px solid #e2e8f0'}} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right — Report Form */}
          <div className="card">
            <div style={{fontSize:'12px',fontWeight:700,color:'#0a6e6e',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'16px'}}>
              Step 2: Write Report
            </div>
            {!foundAppt ? (
              <div style={{textAlign:'center',padding:'40px',color:'#718096'}}>
                <div style={{fontSize:'48px',marginBottom:'12px'}}>🔍</div>
                <p>Search a token to start writing the report</p>
              </div>
            ) : (
              <>
                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Report Title</label>
                    <input value={form.report_title} onChange={e=>setForm(f=>({...f,report_title:e.target.value}))} placeholder="e.g. Full Body Check-Up Report" required />
                  </div>
                  <div className="form-group">
                    <label>Findings & Results</label>
                    <textarea rows={10} value={form.report_content} onChange={e=>setForm(f=>({...f,report_content:e.target.value}))} placeholder={`Findings for ${foundAppt.patient_name}:\n\nTest Results:\n-\n\nObservations:\n\nRecommendations:`} style={{resize:'vertical'}} required />
                  </div>
                  <div className="form-group">
                    <label>Dispatch Date</label>
                    <input type="date" value={form.dispatch_date} onChange={e=>setForm(f=>({...f,dispatch_date:e.target.value}))} />
                  </div>

                  {/* PDF Upload */}
                  <div className="form-group">
                    <label>Attach PDF Report (optional)</label>
                    <div style={{border:`2px dashed ${pdfFile?'#0a6e6e':'#e2e8f0'}`,borderRadius:'10px',padding:'16px',background:pdfFile?'#f0fafa':'white',transition:'all 0.2s'}}>
                      <input ref={fileRef} type="file" accept=".pdf" onChange={e=>setPdfFile(e.target.files[0]||null)} style={{display:'none'}} id="pdf-upload" />
                      <label htmlFor="pdf-upload" style={{cursor:'pointer',display:'flex',alignItems:'center',gap:'12px'}}>
                        <span style={{fontSize:'32px'}}>📄</span>
                        <div>
                          {pdfFile ? (
                            <>
                              <div style={{fontWeight:600,color:'#0a6e6e',fontSize:'14px'}}>{pdfFile.name}</div>
                              <div style={{color:'#718096',fontSize:'12px'}}>{(pdfFile.size/1024).toFixed(1)} KB — click to change</div>
                            </>
                          ) : (
                            <>
                              <div style={{fontWeight:600,color:'#1a202c',fontSize:'14px'}}>Click to attach a PDF</div>
                              <div style={{color:'#718096',fontSize:'12px'}}>Lab report, scan result, prescription — max 10MB</div>
                            </>
                          )}
                        </div>
                      </label>
                      {pdfFile && (
                        <button type="button" onClick={()=>{setPdfFile(null);if(fileRef.current)fileRef.current.value='';}} style={{background:'none',border:'none',color:'#e63946',cursor:'pointer',fontSize:'12px',marginTop:'8px',padding:0}}>
                          ✕ Remove PDF
                        </button>
                      )}
                    </div>
                    <p style={{color:'#718096',fontSize:'12px',marginTop:'6px'}}>
                      📧 The PDF will be attached to the patient's email notification automatically.
                    </p>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:'13px'}} disabled={loading}>
                    {loading ? 'Creating & Sending...' : `📋 Create Report & Email ${foundAppt.patient_name}`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          {reports.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'#718096'}}>
              <div style={{fontSize:'48px',marginBottom:'12px'}}>📋</div>
              <p>No reports created yet</p>
            </div>
          ) : (
            <table>
              <thead><tr><th>Token</th><th>Patient</th><th>Report Title</th><th>Date</th><th>PDF</th><th>Status</th></tr></thead>
              <tbody>
                {reports.map(r=>(
                  <tr key={r.id}>
                    <td><strong style={{color:'#0a6e6e'}}>{r.token_number}</strong></td>
                    <td><div style={{fontWeight:600}}>{r.patient_name}</div><div style={{color:'#718096',fontSize:'12px'}}>{r.patient_phone}</div></td>
                    <td>{r.report_title}</td>
                    <td style={{fontSize:'13px'}}>{new Date(r.appointment_date).toDateString()}</td>
                    <td>{r.pdf_path ? <a href={`http://localhost:5001/uploads/${r.pdf_path}`} target="_blank" rel="noreferrer" style={{color:'#e63946',textDecoration:'none',fontWeight:600,fontSize:'13px'}}>📄 PDF</a> : <span style={{color:'#718096',fontSize:'12px'}}>Text only</span>}</td>
                    <td><span className="badge badge-success">Sent ✉️</span></td>
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

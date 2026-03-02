import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function PatientReports() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/reports/my').then(res=>setReports(res.data)).catch(console.error).finally(()=>setLoading(false)); }, []);

  return (
    <Layout>
      <div className="page-header"><h2>My Reports</h2><p>View and download your diagnostic reports</p></div>
      {loading ? <div style={{textAlign:'center',padding:'60px'}}>Loading...</div> :
        reports.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'60px',color:'#718096'}}>
            <div style={{fontSize:'64px',marginBottom:'16px'}}>📋</div>
            <h3>No reports yet</h3>
            <p style={{marginTop:'8px'}}>Your diagnostic reports will appear here once available</p>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:selected?'1fr 1fr':'1fr',gap:'24px'}}>
            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              {reports.map(r => (
                <div key={r.id} className="card" style={{cursor:'pointer',border:selected?.id===r.id?'2px solid #0a6e6e':'1px solid #e2e8f0',transition:'all 0.2s'}} onClick={()=>setSelected(r)}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:'16px',marginBottom:'4px'}}>{r.report_title}</div>
                      <div style={{color:'#718096',fontSize:'13px'}}>🏥 {r.package_name} &nbsp;|&nbsp; 👨‍⚕️ Dr. {r.doctor_name}</div>
                      <div style={{color:'#718096',fontSize:'12px',marginTop:'4px'}}>📅 {new Date(r.appointment_date).toDateString()}</div>
                    </div>
                    <span className="badge badge-success">Available</span>
                  </div>
                </div>
              ))}
            </div>
            {selected && (
              <div className="card" style={{position:'sticky',top:'24px',height:'fit-content'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'20px'}}>
                  <h3 style={{fontSize:'20px'}}>Report Details</h3>
                  <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px'}}>✕</button>
                </div>
                {[['Report',selected.report_title],['Package',selected.package_name],['Doctor',`Dr. ${selected.doctor_name}`],['Date',new Date(selected.appointment_date).toDateString()]].map(([k,v]) => (
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #e2e8f0',fontSize:'14px'}}>
                    <span style={{color:'#718096'}}>{k}</span><strong>{v}</strong>
                  </div>
                ))}
                <div style={{marginTop:'20px'}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#718096',textTransform:'uppercase',marginBottom:'10px'}}>Report Content</div>
                  <div style={{background:'#f7fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'16px',fontSize:'14px',lineHeight:'1.8',whiteSpace:'pre-wrap',color:'#2d3748'}}>{selected.report_content}</div>
                </div>
                <button onClick={() => {
                  const content = `REPORT: ${selected.report_title}\nDate: ${selected.appointment_date}\nDoctor: Dr. ${selected.doctor_name}\n\n${selected.report_content}`;
                  const blob = new Blob([content],{type:'text/plain'});
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href=url; a.download=`report-${selected.id}.txt`; a.click();
                }} className="btn btn-primary" style={{marginTop:'20px',width:'100%',justifyContent:'center'}}>⬇ Download Report</button>
              </div>
            )}
          </div>
        )
      }
    </Layout>
  );
}

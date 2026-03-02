import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const statusColor = { booked:'info', checked_in:'warning', in_progress:'warning', completed:'success', cancelled:'danger' };

export default function DoctorAppointments() {
  const today = new Date().toISOString().split('T')[0];
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today);
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/appointments/all?date=${date}`;
      if (typeFilter !== 'all') url += `&type=${typeFilter}`;
      const res = await api.get(url);
      setAppointments(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [date, typeFilter]);

  const updateStatus = async (id, status, payment_status) => {
    setUpdating(true);
    try {
      await api.put(`/appointments/${id}/status`, { status, payment_status });
      fetchData();
      setSelected(null);
    } catch (err) { alert(err.response?.data?.message || 'Update failed'); }
    finally { setUpdating(false); }
  };

  const isToday = date === today;

  return (
    <Layout>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h2>Appointments</h2>
          <p>{isToday ? "Today's appointments" : `Appointments for ${new Date(date).toDateString()}`}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:'6px' }}>
            {[
              { id:'all',          label:'All' },
              { id:'test',         label:'🧪 Tests' },
              { id:'consultation', label:'👨‍⚕️ Consults' },
            ].map(t => (
              <button key={t.id} onClick={() => setTypeFilter(t.id)} style={{ padding:'7px 14px', border:`2px solid ${typeFilter===t.id?'#0a6e6e':'#e2e8f0'}`, borderRadius:'8px', background:typeFilter===t.id?'#0a6e6e':'white', cursor:'pointer', fontSize:'12px', fontWeight:600, color:typeFilter===t.id?'white':'#718096' }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding:'8px 12px', border:'2px solid #e2e8f0', borderRadius:'8px', fontFamily:'inherit', fontSize:'14px', outline:'none' }} />
            {!isToday && (
              <button onClick={() => setDate(today)} style={{ padding:'8px 12px', background:'#0a6e6e', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                Today
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats for today */}
      {isToday && (
        <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
          {[
            { label:'Total',       value: appointments.length,                                          color:'#0a6e6e', bg:'#e8f5f5' },
            { label:'Awaiting',    value: appointments.filter(a=>a.status==='booked').length,            color:'#718096', bg:'#f7fafc' },
            { label:'In Progress', value: appointments.filter(a=>['checked_in','in_progress'].includes(a.status)).length, color:'#f0a500', bg:'#fff8e8' },
            { label:'Completed',   value: appointments.filter(a=>a.status==='completed').length,         color:'#2a9d8f', bg:'#eaf7ef' },
          ].map(s => (
            <div key={s.label} style={{ background:s.bg, borderRadius:'10px', padding:'10px 18px', display:'flex', gap:'10px', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:'20px', color:s.color }}>{s.value}</span>
              <span style={{ fontSize:'13px', color:'#718096' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 400px':'1fr', gap:'24px' }}>
        <div className="card">
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:'#718096' }}>Loading...</div>
          ) : appointments.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#718096' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>📅</div>
              <p style={{ fontSize:'16px' }}>No appointments {isToday ? 'today' : 'on this date'}</p>
              {!isToday && <button onClick={() => setDate(today)} style={{ marginTop:'12px', padding:'8px 20px', background:'#0a6e6e', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:600 }}>Back to Today</button>}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Time</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(a => (
                  <tr key={a.id} style={{ cursor:'pointer', background: selected?.id===a.id?'#f0fafa':'white' }} onClick={() => setSelected(a)}>
                    <td><strong style={{ color:'#0a6e6e', fontSize:'13px' }}>{a.token_number}</strong></td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:'14px' }}>{a.patient_name}</div>
                      <div style={{ color:'#718096', fontSize:'11px' }}>{a.gender&&`${a.gender}, `}{a.age&&`${a.age}yrs`}{a.blood_group&&` | ${a.blood_group}`}</div>
                    </td>
                    <td>
                      <span style={{ background:a.appointment_type==='consultation'?'#eef3ff':'#e8f5f5', color:a.appointment_type==='consultation'?'#4361ee':'#0a6e6e', padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>
                        {a.appointment_type==='consultation'?'👨‍⚕️ Consult':'🧪 Test'}
                      </span>
                    </td>
                    <td style={{ fontSize:'13px' }}>
                      {a.appointment_type==='test' ? a.package_name : a.specialization}
                      {a.patient_note && <span title="Has note" style={{ color:'#f0a500', marginLeft:'6px' }}>📝</span>}
                      {a.image_path   && <span title="Has image" style={{ color:'#4361ee', marginLeft:'4px' }}>🖼</span>}
                    </td>
                    <td style={{ fontSize:'13px', fontWeight:600 }}>{a.appointment_time?.slice(0,5)}</td>
                    <td>
                      {a.payment_confirmed
                        ? <span className="badge badge-success">Paid</span>
                        : <span className="badge badge-warning">Pending</span>}
                    </td>
                    <td><span className={`badge badge-${statusColor[a.status]}`}>{a.status}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display:'flex', gap:'5px' }}>
                        {a.status==='checked_in'   && <button className="btn btn-sm" style={{ background:'#cce5ff',color:'#004085',border:'none',cursor:'pointer',borderRadius:'6px',padding:'4px 8px',fontSize:'12px',fontWeight:600 }} onClick={() => updateStatus(a.id,'in_progress',null)}>Start</button>}
                        {a.status==='in_progress'  && <button className="btn btn-sm btn-primary" style={{ fontSize:'12px',padding:'4px 8px' }} onClick={() => updateStatus(a.id,'completed','paid')}>Done</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="card" style={{ height:'fit-content', position:'sticky', top:'24px', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <h3 style={{ fontSize:'18px' }}>Details</h3>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#718096' }}>✕</button>
            </div>
            <div style={{ marginBottom:'16px', paddingBottom:'16px', borderBottom:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:'20px', fontFamily:"'Playfair Display',serif", fontWeight:700, marginBottom:'4px' }}>{selected.patient_name}</div>
              <div style={{ color:'#718096', fontSize:'13px' }}>{selected.patient_phone}</div>
              <span style={{ background:selected.appointment_type==='consultation'?'#eef3ff':'#e8f5f5', color:selected.appointment_type==='consultation'?'#4361ee':'#0a6e6e', padding:'3px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:600, display:'inline-block', marginTop:'6px' }}>
                {selected.appointment_type==='consultation'?'👨‍⚕️ Consultation':'🧪 Diagnostic Test'}
              </span>
            </div>

            {[
              ['Token',      selected.token_number],
              ['Time',       selected.appointment_time?.slice(0,5)],
              selected.appointment_type==='test'
                ? ['Package', selected.package_name]
                : ['Specialization', selected.specialization],
              ['Age',        selected.age?`${selected.age} yrs`:'-'],
              ['Gender',     selected.gender||'-'],
              ['Blood Group',selected.blood_group||'-'],
              ['Amount',     `₹${selected.payment_amount||0}`],
              ['Payment',    selected.payment_confirmed ? '✅ Confirmed' : '⏳ Pending'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #f0f4f8', fontSize:'13px' }}>
                <span style={{ color:'#718096' }}>{k}</span><strong>{v}</strong>
              </div>
            ))}

            {selected.patient_note && (
              <div style={{ marginTop:'16px', background:'#fffbf0', border:'1.5px solid #f0a500', borderRadius:'10px', padding:'14px' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#856404', textTransform:'uppercase', marginBottom:'6px' }}>📝 Patient's Note</div>
                <div style={{ color:'#856404', fontSize:'13px', lineHeight:'1.7' }}>{selected.patient_note}</div>
              </div>
            )}

            {selected.image_path && (
              <div style={{ marginTop:'16px' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#718096', textTransform:'uppercase', marginBottom:'8px' }}>🖼 Patient Image</div>
                <img src={`http://localhost:5001/uploads/${selected.image_path}`} alt="patient" style={{ width:'100%', borderRadius:'10px', border:'2px solid #e2e8f0', objectFit:'cover', maxHeight:'200px' }} />
              </div>
            )}

            {selected.notes && (
              <div style={{ marginTop:'12px', background:'#f7fafc', borderRadius:'8px', padding:'12px', fontSize:'13px', color:'#4a5568' }}>
                <strong>Notes:</strong> {selected.notes}
              </div>
            )}

            <div style={{ marginTop:'20px', display:'flex', flexDirection:'column', gap:'8px' }}>
              {selected.status==='checked_in'  && <button className="btn btn-primary" onClick={() => updateStatus(selected.id,'in_progress',null)} disabled={updating} style={{ justifyContent:'center' }}>▶ Start</button>}
              {selected.status==='in_progress' && <button className="btn btn-primary" onClick={() => updateStatus(selected.id,'completed','paid')} disabled={updating} style={{ justifyContent:'center', background:'#2a9d8f' }}>✅ Mark Complete</button>}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const SPECIALIZATIONS = ['General Medicine','Cardiology','Neurology','Orthopedics','Pediatrics','Gynecology','Dermatology','Radiology','Pathology'];

export default function BookAppointment() {
  const [bookingType, setBookingType] = useState('test'); // 'test' | 'consultation'
  const [packages, setPackages] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ test_package_id:'', appointment_date:'', appointment_time:'', notes:'', specialization:'', doctor_id:'', patient_note:'' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(() => { api.get('/dashboard/packages').then(res=>setPackages(res.data)); }, []);
  useEffect(() => { api.get('/dashboard/doctors').then(res=>setDoctors(res.data)); }, []);

  useEffect(() => {
    if (form.appointment_date) {
      const doctorId = bookingType === 'consultation' ? form.doctor_id : '';
      const url = `/appointments/slots?date=${form.appointment_date}${doctorId ? `&doctor_id=${doctorId}` : ''}`;
      api.get(url).then(res=>setSlots(res.data));
    }
  }, [form.appointment_date, form.doctor_id]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImage(ev.target.result); setImagePreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = {
        ...form,
        appointment_type: bookingType,
        doctor_id: bookingType === 'consultation' ? form.doctor_id : null,
        test_package_id: bookingType === 'test' ? form.test_package_id : null,
      };
      const res = await api.post('/appointments/book', payload);

      // Upload image if present
      if (image && res.data.appointment_id) {
        await api.post(`/appointments/${res.data.appointment_id}/upload-image`, {
          image_base64: image,
          image_name: 'patient_image.jpg'
        });
      }

      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally { setLoading(false); }
  };

  const today = new Date().toISOString().split('T')[0];
  const selectedPkg = packages.find(p => p.id === parseInt(form.test_package_id));
  const filteredDoctors = doctors.filter(d => !form.specialization || d.specialization === form.specialization);
  const selectedDoctor = doctors.find(d => d.id === parseInt(form.doctor_id));

  if (success) return (
    <Layout>
      <div style={{ maxWidth:'520px', margin:'0 auto' }}>
        <div className="card" style={{ textAlign:'center', padding:'48px' }}>
          <div style={{ fontSize:'72px', marginBottom:'20px' }}>🎉</div>
          <h2 style={{ fontSize:'28px', marginBottom:'8px' }}>
            {bookingType === 'consultation' ? 'Consultation Booked!' : 'Appointment Booked!'}
          </h2>
          <p style={{ color:'#718096', marginBottom:'28px' }}>Your appointment is confirmed.</p>
          <div style={{ background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'16px', padding:'28px', color:'white', marginBottom:'24px' }}>
            <div style={{ fontSize:'13px', opacity:0.8, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>Your Token Number</div>
            <div style={{ fontSize:'42px', fontWeight:700, letterSpacing:'4px' }}>{success.token_number}</div>
            <div style={{ fontSize:'13px', opacity:0.8, marginTop:'8px' }}>Show this at hospital check-in</div>
          </div>
          {selectedPkg?.pre_requirements && (
            <div style={{ background:'#fffbf0', border:'2px solid #f0a500', borderRadius:'12px', padding:'16px', textAlign:'left', marginBottom:'24px' }}>
              <div style={{ fontWeight:700, color:'#856404', marginBottom:'8px', fontSize:'14px' }}>⚠️ Pre-Test Requirements</div>
              <div style={{ color:'#856404', fontSize:'13px', lineHeight:'1.6' }}>{selectedPkg.pre_requirements}</div>
            </div>
          )}
          <div style={{ display:'flex', gap:'12px', justifyContent:'center' }}>
            <button onClick={()=>navigate('/patient/appointments')} className="btn btn-primary">View Appointments</button>
            <button onClick={()=>{ setSuccess(null); setForm({test_package_id:'',appointment_date:'',appointment_time:'',notes:'',specialization:'',doctor_id:'',patient_note:''}); setStep(1); }} className="btn btn-outline">Book Another</button>
          </div>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ maxWidth:'720px', margin:'0 auto' }}>
        <div className="page-header"><h2>Book Appointment</h2><p>Schedule a test or doctor consultation</p></div>

        {/* Booking Type Selector */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'24px' }}>
          {[
            { value:'test', icon:'🧪', label:'Diagnostic Tests', desc:'Blood tests, ECG, imaging, full body checkup' },
            { value:'consultation', icon:'👨‍⚕️', label:'Doctor Consultation', desc:'Meet a specialist for advice and diagnosis' }
          ].map(t => (
            <div key={t.value} onClick={()=>{ setBookingType(t.value); setStep(1); setForm({test_package_id:'',appointment_date:'',appointment_time:'',notes:'',specialization:'',doctor_id:'',patient_note:''}); }} style={{ border:`2px solid ${bookingType===t.value?'#0a6e6e':'#e2e8f0'}`, background:bookingType===t.value?'#f0fafa':'white', borderRadius:'14px', padding:'20px', cursor:'pointer', transition:'all 0.2s' }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>{t.icon}</div>
              <div style={{ fontWeight:700, fontSize:'15px', marginBottom:'4px' }}>{t.label}</div>
              <div style={{ fontSize:'13px', color:'#718096' }}>{t.desc}</div>
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* ── TEST BOOKING ── */}
          {bookingType === 'test' && <>
            {/* Step 1: Select Package */}
            <div className="card" style={{ marginBottom:'20px' }}>
              <div style={styles.stepLabel}>Step 1: Select Test Package</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {packages.filter(p=>p.category !== 'consultation').map(pkg => (
                  <div key={pkg.id} onClick={()=>set('test_package_id',String(pkg.id))} style={{ border:`2px solid ${form.test_package_id===String(pkg.id)?'#0a6e6e':'#e2e8f0'}`, background:form.test_package_id===String(pkg.id)?'#f0fafa':'white', borderRadius:'12px', padding:'16px', cursor:'pointer', transition:'all 0.2s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'15px' }}>{pkg.name}</div>
                        <div style={{ color:'#718096', fontSize:'13px', marginTop:'2px' }}>{pkg.description}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:'16px' }}>
                        <div style={{ fontWeight:700, fontSize:'18px', color:'#0a6e6e' }}>₹{pkg.price}</div>
                        <div style={{ color:'#718096', fontSize:'12px' }}>⏱ {pkg.duration_hours}h</div>
                      </div>
                    </div>
                    {/* Room Number */}
                    {pkg.room_number && (
                      <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'#e8f5f5', color:'#0a6e6e', borderRadius:'8px', padding:'4px 10px', fontSize:'13px', fontWeight:600, marginBottom:'8px' }}>
                        🚪 {pkg.room_number}
                      </div>
                    )}
                    {/* Pre-requirements HIGHLIGHTED */}
                    {pkg.pre_requirements && (
                      <div style={{ background:'#fffbf0', border:'1.5px solid #f0a500', borderRadius:'8px', padding:'10px 12px', marginTop:'8px' }}>
                        <div style={{ fontWeight:700, color:'#856404', fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' }}>⚠️ Pre-Test Requirements</div>
                        <div style={{ color:'#856404', fontSize:'13px', lineHeight:'1.6' }}>{pkg.pre_requirements}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>}

          {/* ── CONSULTATION BOOKING ── */}
          {bookingType === 'consultation' && <>
            <div className="card" style={{ marginBottom:'20px' }}>
              <div style={styles.stepLabel}>Step 1: Select Specialization & Doctor</div>
              <div className="form-group">
                <label>Specialization</label>
                <select value={form.specialization} onChange={e=>{ set('specialization',e.target.value); set('doctor_id',''); }} required>
                  <option value="">All Specializations</option>
                  {SPECIALIZATIONS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              {filteredDoctors.length === 0 ? (
                <p style={{ color:'#718096', fontSize:'14px', padding:'12px', background:'#f7fafc', borderRadius:'8px' }}>No doctors available for this specialization yet.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {filteredDoctors.map(doc => (
                    <div key={doc.id} onClick={()=>set('doctor_id',String(doc.id))} style={{ border:`2px solid ${form.doctor_id===String(doc.id)?'#0a6e6e':'#e2e8f0'}`, background:form.doctor_id===String(doc.id)?'#f0fafa':'white', borderRadius:'12px', padding:'16px', cursor:'pointer', display:'flex', alignItems:'center', gap:'16px', transition:'all 0.2s' }}>
                      <div style={{ width:'52px', height:'52px', background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'20px', flexShrink:0 }}>
                        {doc.name?.[0]}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:'15px' }}>Dr. {doc.name}</div>
                        <div style={{ color:'#0a6e6e', fontSize:'13px', fontWeight:600 }}>{doc.specialization}</div>
                        <div style={{ color:'#718096', fontSize:'12px' }}>{doc.qualification} {doc.room_number && `• ${doc.room_number}`}</div>
                      </div>
                      {form.doctor_id===String(doc.id) && <span style={{ color:'#0a6e6e', fontSize:'22px' }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Patient Note */}
            <div className="card" style={{ marginBottom:'20px' }}>
              <div style={styles.stepLabel}>Step 2: Describe Your Concern</div>
              <div className="form-group">
                <label>Your Note / Symptoms</label>
                <textarea rows={4} value={form.patient_note} onChange={e=>set('patient_note',e.target.value)} placeholder="Describe your symptoms, concerns, or reason for visit... (e.g. I've had chest pain for 3 days, gets worse with exercise)" style={{ resize:'vertical' }} />
              </div>
              {/* Image upload */}
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Upload Image (optional) — X-ray, prescription, wound photo etc.</label>
                <input type="file" accept="image/*" onChange={handleImage} style={{ padding:'8px', border:'2px dashed #e2e8f0', borderRadius:'8px', width:'100%', cursor:'pointer' }} />
                {imagePreview && (
                  <div style={{ marginTop:'12px', position:'relative', display:'inline-block' }}>
                    <img src={imagePreview} alt="preview" style={{ maxWidth:'200px', maxHeight:'200px', borderRadius:'8px', border:'2px solid #e2e8f0', objectFit:'cover' }} />
                    <button type="button" onClick={()=>{ setImage(null); setImagePreview(null); }} style={{ position:'absolute', top:'-8px', right:'-8px', background:'#e63946', color:'white', border:'none', borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer', fontSize:'14px', fontWeight:700 }}>✕</button>
                  </div>
                )}
              </div>
            </div>
          </>}

          {/* Date Selection */}
          <div className="card" style={{ marginBottom:'20px' }}>
            <div style={styles.stepLabel}>{bookingType === 'test' ? 'Step 2' : 'Step 3'}: Select Date</div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Appointment Date</label>
              <input type="date" min={today} value={form.appointment_date} onChange={e=>set('appointment_date',e.target.value)} required />
            </div>
          </div>

          {/* Time Slots */}
          {form.appointment_date && slots.length > 0 && (
            <div className="card" style={{ marginBottom:'20px' }}>
              <div style={styles.stepLabel}>{bookingType === 'test' ? 'Step 3' : 'Step 4'}: Select Time Slot</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'8px', marginBottom:'12px' }}>
                {slots.map(slot => (
                  <button key={slot.time} type="button" disabled={!slot.available} onClick={()=>set('appointment_time',slot.time)} style={{ padding:'10px 4px', border:`2px solid ${form.appointment_time===slot.time?'#0a6e6e':slot.available?'#e2e8f0':'#f5c6cb'}`, borderRadius:'8px', background:form.appointment_time===slot.time?'#0a6e6e':slot.available?'white':'#f8d7da', color:form.appointment_time===slot.time?'white':slot.available?'#1a202c':'#999', cursor:slot.available?'pointer':'not-allowed', fontSize:'13px', fontWeight:500, transition:'all 0.2s' }}>
                    {slot.time.slice(0,5)}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:'12px', color:'#718096' }}>
                <span style={{ background:'#0a6e6e', color:'white', padding:'2px 8px', borderRadius:'4px', marginRight:'8px' }}>Selected</span>
                <span style={{ background:'white', border:'1px solid #e2e8f0', padding:'2px 8px', borderRadius:'4px', marginRight:'8px' }}>Available</span>
                <span style={{ background:'#f8d7da', padding:'2px 8px', borderRadius:'4px' }}>Booked</span>
              </div>
            </div>
          )}

          {/* Summary */}
          {((bookingType==='test' && selectedPkg) || (bookingType==='consultation' && selectedDoctor)) && form.appointment_date && form.appointment_time && (
            <div className="card" style={{ marginBottom:'20px', border:'2px solid #0a6e6e', background:'#f0fafa' }}>
              <h3 style={{ color:'#0a6e6e', marginBottom:'16px', fontSize:'16px' }}>📋 Booking Summary</h3>
              {bookingType === 'test' && selectedPkg && <>
                {[['Type','Diagnostic Test'],['Package',selectedPkg.name],['Room',selectedPkg.room_number||'TBD'],['Date',new Date(form.appointment_date).toDateString()],['Time',form.appointment_time.slice(0,5)],['Amount',`₹${selectedPkg.price}`]].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #c8e6e6', fontSize:'14px' }}><span style={{color:'#4a5568'}}>{k}</span><strong>{v}</strong></div>
                ))}
                {selectedPkg.pre_requirements && (
                  <div style={{ marginTop:'12px', background:'#fffbf0', border:'1.5px solid #f0a500', borderRadius:'8px', padding:'12px' }}>
                    <div style={{ fontWeight:700, color:'#856404', fontSize:'12px', textTransform:'uppercase', marginBottom:'6px' }}>⚠️ Remember Before Your Visit</div>
                    <div style={{ color:'#856404', fontSize:'13px', lineHeight:'1.6' }}>{selectedPkg.pre_requirements}</div>
                  </div>
                )}
              </>}
              {bookingType === 'consultation' && selectedDoctor && <>
                {[['Type','Doctor Consultation'],['Doctor',`Dr. ${selectedDoctor.name}`],['Specialization',selectedDoctor.specialization],['Room',selectedDoctor.room_number||'TBD'],['Date',new Date(form.appointment_date).toDateString()],['Time',form.appointment_time.slice(0,5)],['Amount','Free / As advised']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #c8e6e6', fontSize:'14px' }}><span style={{color:'#4a5568'}}>{k}</span><strong>{v}</strong></div>
                ))}
                {imagePreview && <div style={{ marginTop:'12px' }}><div style={{ fontSize:'12px', fontWeight:700, color:'#718096', textTransform:'uppercase', marginBottom:'6px' }}>Attached Image</div><img src={imagePreview} alt="attachment" style={{ maxWidth:'120px', borderRadius:'8px', border:'2px solid #e2e8f0' }} /></div>}
              </>}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:'16px' }}
            disabled={loading || (bookingType==='test' && !form.test_package_id) || (bookingType==='consultation' && !form.doctor_id) || !form.appointment_date || !form.appointment_time}>
            {loading ? 'Booking...' : `📅 Confirm ${bookingType === 'consultation' ? 'Consultation' : 'Appointment'}`}
          </button>
        </form>
      </div>
    </Layout>
  );
}

const styles = {
  stepLabel: { fontSize:'12px', fontWeight:700, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'16px' }
};

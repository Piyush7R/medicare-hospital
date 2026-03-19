import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const SPECIALIZATIONS = ['General Medicine','Cardiology','Neurology','Orthopedics','Pediatrics','Gynecology','Dermatology','Radiology','Pathology'];

const PAYMENT_MODES = [
  { value:'cash', icon:'💵', label:'Cash',  desc:'Pay cash at counter',   color:'#2a9d8f', bg:'#eaf7ef' },
  { value:'upi',  icon:'📱', label:'UPI',   desc:'GPay, PhonePe, Paytm', color:'#4361ee', bg:'#eef3ff' },
  { value:'card', icon:'💳', label:'Card',  desc:'Debit / Credit card',   color:'#6b21a8', bg:'#f3e8ff' },
];

// ── Category config ────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key:   'premium',
    label: 'Premium',
    icon:  '👑',
    tag:   'COMPLETE CHECKUP',
    desc:  'Full body checkup — all tests included',
    color: '#b7791f',
    bg:    '#fffff0',
    border:'#d4a017',
    badge: { bg:'#fef3c7', color:'#92400e' },
  },
  {
    key:   'advanced',
    label: 'Advanced',
    icon:  '⭐',
    tag:   'MULTIPLE TESTS',
    desc:  'Multiple targeted tests in one package',
    color: '#4361ee',
    bg:    '#f0f4ff',
    border:'#4361ee',
    badge: { bg:'#e0e7ff', color:'#3730a3' },
  },
  {
    key:   'normal',
    label: 'Normal',
    icon:  '🧪',
    tag:   'SINGLE TEST',
    desc:  'Simple individual diagnostic tests',
    color: '#0a6e6e',
    bg:    '#f0fafa',
    border:'#0a6e6e',
    badge: { bg:'#e8f5f5', color:'#064444' },
  },
];

export default function BookAppointment() {
  const [bookingType, setBookingType]           = useState('test');
  const [activeCategory, setActiveCategory]     = useState('all'); // 'all' | 'premium' | 'advanced' | 'normal'
  const [packages, setPackages]                 = useState([]);
  const [doctors, setDoctors]                   = useState([]);
  const [capacity, setCapacity]                 = useState(null);
  const [preferredPayment, setPreferredPayment] = useState('cash');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [specialization, setSpecialization]     = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [patientNote, setPatientNote]           = useState('');
  const [image, setImage]                       = useState(null);
  const [imagePreview, setImagePreview]         = useState(null);
  const [appointmentDate, setAppointmentDate]   = useState('');
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState(null);
  const [loading, setLoading]                   = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api.get('/dashboard/packages').then(r => setPackages(r.data)).catch(() => {}); }, []);
  useEffect(() => { api.get('/dashboard/doctors').then(r => setDoctors(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    if (!appointmentDate) { setCapacity(null); return; }
    api.get(`/appointments/slots?date=${appointmentDate}`)
      .then(r => setCapacity(r.data))
      .catch(() => setCapacity(null));
  }, [appointmentDate]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setImage(ev.target.result); setImagePreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setSelectedPackageId(''); setSpecialization(''); setSelectedDoctorId('');
    setPatientNote(''); setImage(null); setImagePreview(null);
    setAppointmentDate(''); setCapacity(null); setPreferredPayment('cash');
    setActiveCategory('all');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/appointments/book', {
        appointment_type: bookingType,
        test_package_id: bookingType === 'test' ? selectedPackageId : null,
        doctor_id: bookingType === 'consultation' ? selectedDoctorId : null,
        specialization,
        patient_note: patientNote,
        appointment_date: appointmentDate,
        preferred_payment_mode: preferredPayment,
      });
      if (image && res.data.appointment_id) {
        await api.post(`/appointments/${res.data.appointment_id}/upload-image`, {
          image_base64: image, image_name: 'patient_image.jpg'
        });
      }
      setSuccess({ ...res.data, preferred_payment_mode: preferredPayment });
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally { setLoading(false); }
  };

  const today          = new Date().toISOString().split('T')[0];
  const selectedPkg    = packages.find(p => String(p.id) === String(selectedPackageId));
  const selectedDoctor = doctors.find(d => String(d.id) === String(selectedDoctorId));
  const filteredDoctors = doctors.filter(d => !specialization || d.specialization === specialization);
  const payMode        = PAYMENT_MODES.find(m => m.value === preferredPayment);

  // Group packages by category (default to 'normal' if no category set)
  const pkgsByCategory = (cat) =>
    packages.filter(p => p.category !== 'consultation' && (cat === 'all' || (p.category || 'normal') === cat));

  const visiblePackages = pkgsByCategory(activeCategory);

  // Count per category for the tab badges
  const catCounts = {
    all:      packages.filter(p => p.category !== 'consultation').length,
    premium:  pkgsByCategory('premium').length,
    advanced: pkgsByCategory('advanced').length,
    normal:   pkgsByCategory('normal').length,
  };

  const getCatConfig = (cat) => CATEGORIES.find(c => c.key === cat);

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────
  if (success) return (
    <Layout>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card" style={{ textAlign:'center', padding: 48 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 26, marginBottom: 8 }}>Appointment Booked!</h2>
          <p style={{ color:'#718096', marginBottom: 24 }}>Your appointment is confirmed.</p>

          <div style={{ background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius: 16, padding: 28, color:'white', marginBottom: 16 }}>
            <div style={{ fontSize: 12, opacity:0.8, marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Your Token Number</div>
            <div style={{ fontSize: 44, fontWeight:800, letterSpacing:4 }}>{success.token_number}</div>
            <div style={{ fontSize: 12, opacity:0.75, marginTop:6 }}>Show this at hospital reception</div>
          </div>

          {/* Payment preference */}
          <div style={{ background:'#eaf7ef', border:'1.5px solid #2a9d8f', borderRadius:12, padding:'12px 16px', marginBottom:12, fontSize:13, color:'#1a6e3c', display:'flex', gap:10, alignItems:'center', textAlign:'left' }}>
            <span style={{ fontSize:20 }}>{payMode?.icon}</span>
            <span>You'll pay via <strong>{payMode?.label}</strong> at the reception counter on arrival.</span>
          </div>

          {/* Check-in */}
          <div style={{ background:'#fff8e8', border:'2px solid #f0a500', borderRadius:12, padding:14, textAlign:'left', marginBottom:16 }}>
            <div style={{ fontWeight:700, color:'#856404', marginBottom:6, fontSize:13 }}>⏰ Check-in Instructions</div>
            <div style={{ color:'#856404', fontSize:12, lineHeight:1.7 }}>
              Arrive at reception by <strong>7:00 AM</strong>. Tokens are served <strong>first-come, first-served</strong>.
            </div>
          </div>

          {selectedPkg?.pre_requirements && (
            <div style={{ background:'#fffbf0', border:'2px solid #f0a500', borderRadius:12, padding:14, textAlign:'left', marginBottom:16 }}>
              <div style={{ fontWeight:700, color:'#856404', marginBottom:6, fontSize:13 }}>⚠️ Pre-Test Requirements</div>
              <div style={{ color:'#856404', fontSize:12, lineHeight:1.6 }}>{selectedPkg.pre_requirements}</div>
            </div>
          )}

          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <button onClick={() => navigate('/patient/appointments')} className="btn btn-primary">View Appointments</button>
            <button onClick={() => { setSuccess(null); resetForm(); }} className="btn btn-outline">Book Another</button>
          </div>
        </div>
      </div>
    </Layout>
  );

  // ── BOOKING FORM ─────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="page-header">
          <h2>Book Appointment</h2>
          <p>Schedule a diagnostic test or doctor consultation</p>
        </div>

        {/* Check-in notice */}
        <div style={{ background:'linear-gradient(135deg,#e8f5f5,#d0eeee)', border:'1.5px solid #0a6e6e', borderRadius:12, padding:'12px 18px', marginBottom:20, display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ fontSize:22 }}>⏰</span>
          <div style={{ fontSize:13, color:'#0a6e6e' }}>
            Up to <strong>75 appointments per day</strong>. Check in at reception by <strong>7:00 AM</strong>. Tokens served on first-come, first-served basis.
          </div>
        </div>

        {/* Booking Type Selector */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
          {[
            { value:'test',         icon:'🧪', label:'Diagnostic Test',       desc:'Blood tests, ECG, X-Ray, full body packages' },
            { value:'consultation', icon:'👨‍⚕️', label:'Doctor Consultation', desc:'Meet a specialist for advice & diagnosis' },
          ].map(t => (
            <div key={t.value} onClick={() => { setBookingType(t.value); setError(''); resetForm(); }}
              style={{ border:`2px solid ${bookingType===t.value?'#0a6e6e':'#e2e8f0'}`, background:bookingType===t.value?'#f0fafa':'white', borderRadius:14, padding:18, cursor:'pointer', transition:'all 0.2s' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{t.icon}</div>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{t.label}</div>
              <div style={{ fontSize:12, color:'#718096' }}>{t.desc}</div>
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>

          {/* ══ TEST PACKAGE SELECTION ══ */}
          {bookingType === 'test' && (
            <div className="card" style={{ marginBottom:20 }}>
              <div style={S.step}>Step 1: Select Test Package</div>

              {/* Category summary cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                {CATEGORIES.map(cat => (
                  <div key={cat.key} onClick={() => { setActiveCategory(cat.key); setSelectedPackageId(''); }}
                    style={{ border:`2px solid ${activeCategory===cat.key ? cat.border : '#e2e8f0'}`, background:activeCategory===cat.key ? cat.bg : 'white', borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'all 0.2s', position:'relative', overflow:'hidden' }}>
                    {activeCategory===cat.key && (
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:cat.border, borderRadius:'12px 12px 0 0' }} />
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ fontSize:22 }}>{cat.icon}</div>
                      <span style={{ background:cat.badge.bg, color:cat.badge.color, fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:20, textTransform:'uppercase', letterSpacing:0.5 }}>
                        {cat.tag}
                      </span>
                    </div>
                    <div style={{ fontWeight:700, fontSize:14, color: activeCategory===cat.key ? cat.color : '#1a202c', marginTop:8, marginBottom:4 }}>{cat.label}</div>
                    <div style={{ fontSize:11, color:'#718096', marginBottom:6 }}>{cat.desc}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:cat.color }}>{catCounts[cat.key]} packages</div>
                  </div>
                ))}
              </div>

              {/* Show All toggle */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <button type="button" onClick={() => { setActiveCategory('all'); setSelectedPackageId(''); }}
                  style={{ background:activeCategory==='all'?'#0a6e6e':'white', color:activeCategory==='all'?'white':'#718096', border:`1.5px solid ${activeCategory==='all'?'#0a6e6e':'#e2e8f0'}`, borderRadius:8, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  All Packages ({catCounts.all})
                </button>
                {activeCategory !== 'all' && (
                  <span style={{ fontSize:12, color:'#718096' }}>
                    Showing: <strong style={{ color:getCatConfig(activeCategory)?.color }}>{getCatConfig(activeCategory)?.label}</strong> ({catCounts[activeCategory]} packages)
                  </span>
                )}
              </div>

              {/* Package list */}
              {visiblePackages.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px', color:'#a0aec0', background:'#f7fafc', borderRadius:10 }}>
                  No {activeCategory} packages available yet.
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {visiblePackages.map(pkg => {
                    const cat   = getCatConfig(pkg.category || 'normal');
                    const isSelected = selectedPackageId === String(pkg.id);
                    return (
                      <div key={pkg.id} onClick={() => setSelectedPackageId(String(pkg.id))}
                        style={{ border:`2px solid ${isSelected ? cat?.border || '#0a6e6e' : '#e2e8f0'}`, background:isSelected ? (cat?.bg || '#f0fafa') : 'white', borderRadius:12, padding:16, cursor:'pointer', transition:'all 0.2s', position:'relative', overflow:'hidden' }}>

                        {/* Category strip */}
                        <div style={{ position:'absolute', top:0, left:0, bottom:0, width:4, background:cat?.border || '#0a6e6e', borderRadius:'12px 0 0 12px' }} />

                        <div style={{ marginLeft:10 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                            <div style={{ flex:1 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                                <span style={{ fontWeight:700, fontSize:15 }}>{pkg.name}</span>
                                <span style={{ background:cat?.badge.bg || '#e8f5f5', color:cat?.badge.color || '#064444', fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:20, textTransform:'uppercase', letterSpacing:0.5 }}>
                                  {cat?.icon} {cat?.label || 'Normal'}
                                </span>
                              </div>
                              <div style={{ color:'#718096', fontSize:12 }}>{pkg.description}</div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0, marginLeft:14 }}>
                              <div style={{ fontWeight:800, fontSize:20, color:cat?.color || '#0a6e6e' }}>₹{pkg.price}</div>
                              <div style={{ color:'#718096', fontSize:11 }}>⏱ {pkg.duration_hours}h</div>
                            </div>
                          </div>

                          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                            {pkg.room_number && (
                              <span style={{ background:'#e8f5f5', color:'#0a6e6e', borderRadius:8, padding:'3px 10px', fontSize:11, fontWeight:600 }}>🚪 {pkg.room_number}</span>
                            )}
                            {isSelected && <span style={{ background:cat?.badge.bg, color:cat?.color, borderRadius:8, padding:'3px 10px', fontSize:11, fontWeight:700 }}>✓ Selected</span>}
                          </div>

                          {pkg.pre_requirements && (
                            <div style={{ background:'#fffbf0', border:'1.5px solid #f0a500', borderRadius:8, padding:'8px 12px', marginTop:10 }}>
                              <div style={{ fontWeight:700, color:'#856404', fontSize:10, textTransform:'uppercase', marginBottom:3 }}>⚠️ Pre-Test Requirements</div>
                              <div style={{ color:'#856404', fontSize:12, lineHeight:1.6 }}>{pkg.pre_requirements}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ CONSULTATION DOCTOR SELECTION ══ */}
          {bookingType === 'consultation' && (
            <div className="card" style={{ marginBottom:20 }}>
              <div style={S.step}>Step 1: Select Doctor</div>
              <div className="form-group">
                <label>Specialization</label>
                <select value={specialization} onChange={e => { setSpecialization(e.target.value); setSelectedDoctorId(''); }}>
                  <option value="">All Specializations</option>
                  {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {filteredDoctors.length === 0 ? (
                <p style={{ color:'#718096', fontSize:14, padding:12, background:'#f7fafc', borderRadius:8 }}>No doctors available.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {filteredDoctors.map(doc => (
                    <div key={doc.id} onClick={() => setSelectedDoctorId(String(doc.id))}
                      style={{ border:`2px solid ${selectedDoctorId===String(doc.id)?'#4361ee':'#e2e8f0'}`, background:selectedDoctorId===String(doc.id)?'#f0f4ff':'white', borderRadius:12, padding:16, cursor:'pointer', display:'flex', alignItems:'center', gap:14, transition:'all 0.2s' }}>
                      <div style={{ width:46, height:46, background:'linear-gradient(135deg,#4361ee,#2a4dd0)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:18, flexShrink:0 }}>
                        {doc.name?.[0]}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>Dr. {doc.name}</div>
                        <div style={{ color:'#4361ee', fontSize:12, fontWeight:600 }}>{doc.specialization}</div>
                        <div style={{ color:'#718096', fontSize:12 }}>{doc.qualification}{doc.room_number ? ` · ${doc.room_number}` : ''}</div>
                      </div>
                      {selectedDoctorId===String(doc.id) && <span style={{ color:'#4361ee', fontSize:20 }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="form-group" style={{ marginTop:16, marginBottom:0 }}>
                <label>Your Concern / Symptoms (optional)</label>
                <textarea rows={3} value={patientNote} onChange={e => setPatientNote(e.target.value)}
                  placeholder="Describe your symptoms or reason for visit..." style={{ resize:'vertical' }} />
              </div>
            </div>
          )}

          {/* ══ DATE SELECTION ══ */}
          <div className="card" style={{ marginBottom:20 }}>
            <div style={S.step}>Step 2: Select Appointment Date</div>
            <div className="form-group" style={{ marginBottom:capacity ? 14 : 0 }}>
              <label>Appointment Date</label>
              <input type="date" min={today} value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} required />
            </div>

            {/* ── Capacity indicator — FIXED ── */}
            {capacity && (
              <div style={{ background: capacity.available ? '#f0fafa' : '#fff5f5', border:`2px solid ${capacity.available ? '#2a9d8f' : '#e63946'}`, borderRadius:12, padding:'16px 18px' }}>
                {/* Header row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontWeight:700, fontSize:14, color: capacity.available ? '#0a6e6e' : '#e63946' }}>
                    {capacity.available ? '✅ Date Available' : '❌ Fully Booked'}
                  </span>
                  <span style={{ fontSize:13, color:'#718096', fontWeight:600 }}>
                    {capacity.booked} / {capacity.total_capacity} booked
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ height:10, background:'#e2e8f0', borderRadius:5, overflow:'hidden', marginBottom:10 }}>
                  <div style={{
                    height:'100%',
                    width: capacity.total_capacity > 0 ? `${Math.round((capacity.booked / capacity.total_capacity) * 100)}%` : '0%',
                    background: capacity.remaining < 10 ? '#e63946' : capacity.remaining < 25 ? '#f0a500' : '#2a9d8f',
                    borderRadius:5,
                    transition:'width 0.5s ease',
                    minWidth: capacity.booked > 0 ? '4px' : '0'
                  }} />
                </div>

                {/* Footer info */}
                {capacity.available ? (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#2a9d8f', fontWeight:600 }}>
                      {capacity.remaining} appointment{capacity.remaining !== 1 ? 's' : ''} remaining
                    </span>
                    <span style={{ fontSize:12, color:'#0a6e6e', fontWeight:500 }}>
                      ⏰ Check in by 7:00 AM — first-come, first-served
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:'#e63946', fontWeight:600 }}>
                    All {capacity.total_capacity} slots are taken. Please choose another date.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══ BOOKING SUMMARY ══ */}
          {((bookingType==='test' && selectedPkg) || (bookingType==='consultation' && selectedDoctor)) && appointmentDate && capacity?.available && (
            <div className="card" style={{ marginBottom:20, border:'2px solid #0a6e6e', background:'#f0fafa' }}>
              <h3 style={{ color:'#0a6e6e', marginBottom:16, fontSize:16 }}>📋 Booking Summary</h3>

              {bookingType==='test' && selectedPkg && (() => {
                const cat = getCatConfig(selectedPkg.category || 'normal');
                return (
                  <>
                    {[
                      ['Type',       'Diagnostic Test'],
                      ['Category',   `${cat?.icon} ${cat?.label}`],
                      ['Package',    selectedPkg.name],
                      ['Room',       selectedPkg.room_number || 'TBD'],
                      ['Date',       new Date(appointmentDate).toDateString()],
                      ['Check-in',   '7:00 AM (first-come, first-served)'],
                      ['Pay via',    `${payMode?.icon} ${payMode?.label} (at reception)`],
                      ['Amount',     `₹${selectedPkg.price}`],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #c8e6e6', fontSize:13 }}>
                        <span style={{ color:'#4a5568' }}>{k}</span><strong>{v}</strong>
                      </div>
                    ))}
                    {selectedPkg.pre_requirements && (
                      <div style={{ marginTop:12, background:'#fffbf0', border:'1.5px solid #f0a500', borderRadius:8, padding:12 }}>
                        <div style={{ fontWeight:700, color:'#856404', fontSize:11, textTransform:'uppercase', marginBottom:6 }}>⚠️ Pre-Test Requirements</div>
                        <div style={{ color:'#856404', fontSize:12, lineHeight:1.6 }}>{selectedPkg.pre_requirements}</div>
                      </div>
                    )}
                  </>
                );
              })()}

              {bookingType==='consultation' && selectedDoctor && (
                <>
                  {[
                    ['Type',         'Doctor Consultation'],
                    ['Doctor',       `Dr. ${selectedDoctor.name}`],
                    ['Specialization', selectedDoctor.specialization],
                    ['Room',         selectedDoctor.room_number || 'TBD'],
                    ['Date',         new Date(appointmentDate).toDateString()],
                    ['Check-in',     '7:00 AM (first-come, first-served)'],
                    ['Pay via',      `${payMode?.icon} ${payMode?.label} (at reception)`],
                    ['Amount',       `₹${selectedDoctor.consultation_fee || 500}`],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #c8e6e6', fontSize:13 }}>
                      <span style={{ color:'#4a5568' }}>{k}</span><strong>{v}</strong>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center', padding:14, fontSize:15 }}
            disabled={
              loading || !appointmentDate || !capacity?.available ||
              (bookingType==='test' && !selectedPackageId) ||
              (bookingType==='consultation' && !selectedDoctorId)
            }>
            {loading ? 'Booking...' : `📅 Confirm ${bookingType==='consultation' ? 'Consultation' : 'Appointment'}`}
          </button>
        </form>
      </div>
    </Layout>
  );
}

const S = {
  step: { fontSize:11, fontWeight:700, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }
};
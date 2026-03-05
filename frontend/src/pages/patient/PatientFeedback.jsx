import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const SERVICE_AREAS = [
  { key: 'registration',  label: 'Registration Process' },
  { key: 'cleanliness',   label: 'Cleanliness & Hygiene' },
  { key: 'staff',         label: 'Staff Behaviour' },
  { key: 'wait_time',     label: 'Waiting Time' },
  { key: 'test_quality',  label: 'Test / Consultation Quality' },
];

function StarRating({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:'flex', gap:'4px' }}>
      {[1,2,3,4,5].map(star => (
        <span key={star}
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ fontSize:`${size}px`, cursor:onChange?'pointer':'default', color: star <= (hover||value) ? '#f0a500' : '#e2e8f0', transition:'color 0.1s', userSelect:'none' }}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function PatientFeedback() {
  const [completedAppts, setCompletedAppts] = useState([]);
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [serviceRatings, setServiceRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('submit');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apptRes, fbRes] = await Promise.all([
        api.get('/appointments/my'),
        api.get('/appointments/feedback/my'),
      ]);
      const completed = apptRes.data.filter(a => a.status === 'completed');
      const feedbackApptIds = fbRes.data.map(f => f.appointment_id);
      setCompletedAppts(completed.filter(a => !feedbackApptIds.includes(a.id)));
      setSubmittedFeedbacks(fbRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleServiceRating = (key, val) => setServiceRatings(r => ({ ...r, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Please give an overall rating');
    setError(''); setSubmitting(true);
    try {
      await api.post('/appointments/feedback', {
        appointment_id: selected.id,
        rating,
        feedback_text: feedbackText,
        service_ratings: serviceRatings,
      });
      setSuccess(`Thank you for your feedback on "${selected.package_name || ('Dr. ' + selected.doctor_name)}"! 🙏`);
      setSelected(null); setRating(0); setFeedbackText(''); setServiceRatings({});
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Layout><div style={{ textAlign:'center', padding:'60px' }}>Loading...</div></Layout>;

  return (
    <Layout>
      <div className="page-header"><h2>Feedback & Experience</h2><p>Share your experience to help us improve our services</p></div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
        {[
          { id:'submit',  label:'⭐ Submit Feedback' },
          { id:'history', label:'📋 My Feedback' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'10px 20px', border:`2px solid ${tab===t.id?'#0a6e6e':'#e2e8f0'}`, borderRadius:'8px', background:tab===t.id?'#0a6e6e':'white', cursor:'pointer', fontSize:'14px', fontWeight:500, color:tab===t.id?'white':'#718096', transition:'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Submit Feedback Tab ── */}
      {tab === 'submit' && (
        <>
          {success && (
            <div style={{ background:'#eaf7ef', border:'1.5px solid #2a9d8f', borderRadius:'12px', padding:'14px 18px', marginBottom:'20px', color:'#1a6e3c', fontWeight:600, fontSize:'14px' }}>
              ✅ {success}
            </div>
          )}

          {completedAppts.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'60px', color:'#718096' }}>
              <div style={{ fontSize:'64px', marginBottom:'16px' }}>⭐</div>
              <h3>No pending feedback</h3>
              <p style={{ marginTop:'8px' }}>Feedback forms appear here after your appointments are completed.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 480px' : '1fr', gap:'24px' }}>
              {/* Appointment list */}
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <h3 style={{ fontSize:'16px', fontWeight:700, color:'#1a202c', margin:'0 0 4px' }}>
                  Completed Appointments ({completedAppts.length} awaiting feedback)
                </h3>
                {completedAppts.map(a => (
                  <div key={a.id} onClick={() => { setSelected(a); setRating(0); setFeedbackText(''); setServiceRatings({}); setError(''); }}
                    style={{ background:'white', borderRadius:'14px', padding:'18px', cursor:'pointer', border:`2px solid ${selected?.id===a.id?'#0a6e6e':'#e2e8f0'}`, transition:'all 0.2s', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}
                    onMouseEnter={e => { if(selected?.id!==a.id) e.currentTarget.style.borderColor='#0a6e6e'; }}
                    onMouseLeave={e => { if(selected?.id!==a.id) e.currentTarget.style.borderColor='#e2e8f0'; }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'15px', marginBottom:'4px' }}>
                          {a.appointment_type === 'consultation' ? `👨‍⚕️ Dr. ${a.doctor_name}` : `🧪 ${a.package_name}`}
                        </div>
                        <div style={{ color:'#718096', fontSize:'13px' }}>
                          📅 {new Date(a.appointment_date).toDateString()} &nbsp;|&nbsp; Token: <strong style={{ color:'#0a6e6e' }}>{a.token_number}</strong>
                        </div>
                      </div>
                      <div style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'6px 14px', borderRadius:'20px', fontSize:'13px', fontWeight:700, flexShrink:0 }}>
                        Give Feedback →
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feedback Form */}
              {selected && (
                <div className="card" style={{ position:'sticky', top:'24px', height:'fit-content' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                    <h3 style={{ fontSize:'18px', margin:0 }}>Your Feedback</h3>
                    <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#718096' }}>✕</button>
                  </div>

                  <div style={{ background:'#f0fafa', border:'1px solid #c8e6e6', borderRadius:'10px', padding:'14px', marginBottom:'20px' }}>
                    <div style={{ fontWeight:700, fontSize:'14px' }}>
                      {selected.appointment_type === 'consultation' ? `👨‍⚕️ Dr. ${selected.doctor_name}` : `🧪 ${selected.package_name}`}
                    </div>
                    <div style={{ color:'#718096', fontSize:'12px', marginTop:'4px' }}>
                      {new Date(selected.appointment_date).toDateString()} · {selected.token_number}
                    </div>
                  </div>

                  {error && <div className="alert alert-error" style={{ marginBottom:'14px' }}>{error}</div>}

                  <form onSubmit={handleSubmit}>
                    {/* Overall Rating */}
                    <div style={{ marginBottom:'20px' }}>
                      <label style={{ display:'block', fontWeight:700, fontSize:'13px', color:'#4a5568', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        Overall Rating <span style={{ color:'#e63946' }}>*</span>
                      </label>
                      <StarRating value={rating} onChange={setRating} size={36} />
                      {rating > 0 && (
                        <div style={{ marginTop:'6px', fontSize:'13px', color:'#718096' }}>
                          {['','😞 Poor','😐 Fair','🙂 Good','😊 Very Good','🤩 Excellent'][rating]}
                        </div>
                      )}
                    </div>

                    {/* Service-wise ratings */}
                    <div style={{ marginBottom:'20px' }}>
                      <label style={{ display:'block', fontWeight:700, fontSize:'13px', color:'#4a5568', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        Rate Specific Areas
                      </label>
                      {SERVICE_AREAS.map(area => (
                        <div key={area.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                          <span style={{ fontSize:'13px', color:'#4a5568' }}>{area.label}</span>
                          <StarRating value={serviceRatings[area.key] || 0} onChange={v => handleServiceRating(area.key, v)} size={20} />
                        </div>
                      ))}
                    </div>

                    {/* Comments */}
                    <div style={{ marginBottom:'20px' }}>
                      <label style={{ display:'block', fontWeight:700, fontSize:'13px', color:'#4a5568', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        Comments / Suggestions
                      </label>
                      <textarea rows={4} value={feedbackText} onChange={e=>setFeedbackText(e.target.value)}
                        placeholder="Share your experience, what went well, what could be improved..."
                        style={{ width:'100%', padding:'12px', border:'2px solid #e2e8f0', borderRadius:'10px', fontFamily:'inherit', fontSize:'13px', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:'1.6' }} />
                    </div>

                    <button type="submit" disabled={submitting || !rating}
                      style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#0a6e6e,#064444)', color:'white', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer', opacity:(submitting||!rating)?0.6:1 }}>
                      {submitting ? 'Submitting...' : '⭐ Submit Feedback'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Feedback History Tab ── */}
      {tab === 'history' && (
        submittedFeedbacks.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'60px', color:'#718096' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>📋</div>
            <p>No feedback submitted yet</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            {submittedFeedbacks.map(fb => (
              <div key={fb.id} className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'15px' }}>{fb.package_name || 'Consultation'}</div>
                    <div style={{ color:'#718096', fontSize:'13px' }}>
                      {new Date(fb.appointment_date).toDateString()} · Token: {fb.token_number}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <StarRating value={fb.rating} size={20} />
                    <div style={{ fontSize:'12px', color:'#718096', marginTop:'4px' }}>
                      {new Date(fb.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {fb.feedback_text && (
                  <div style={{ background:'#f7fafc', borderRadius:'8px', padding:'12px', fontSize:'13px', color:'#4a5568', lineHeight:'1.7' }}>
                    "{fb.feedback_text}"
                  </div>
                )}
                {fb.service_ratings && Object.keys(JSON.parse(fb.service_ratings||'{}')).length > 0 && (
                  <div style={{ marginTop:'12px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
                    {Object.entries(JSON.parse(fb.service_ratings)).map(([k,v]) => (
                      <span key={k} style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:500 }}>
                        {SERVICE_AREAS.find(a=>a.key===k)?.label||k}: {'★'.repeat(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </Layout>
  );
}

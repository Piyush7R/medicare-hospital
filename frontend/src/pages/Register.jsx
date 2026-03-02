import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const SPECIALIZATIONS = ['General Medicine','Cardiology','Neurology','Orthopedics','Pediatrics','Gynecology','Dermatology','Radiology','Pathology'];

export default function Register() {
  const [step, setStep] = useState(1); // 1=form, 2=otp, 3=success
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({
    name:'', email:'', password:'', phone:'',
    age:'', gender:'', blood_group:'', address:'',
    specialization:'', qualification:'', room_number:''
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const navigate = useNavigate();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  // Step 1: Submit form → send OTP
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (role === 'patient' && (!form.age || !form.gender || !form.blood_group))
      return setError('Age, Gender and Blood Group are mandatory.');
    if (role === 'doctor' && (!form.specialization || !form.qualification || !form.room_number))
      return setError('Specialization, Qualification and Room Number are mandatory.');

    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: form.email, name: form.name });
      setStep(2);
      setInfo(`OTP sent to ${form.email}. Valid for 10 minutes.`);
      setResendTimer(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  // OTP input handling
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      // Handle paste
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newOtp = [...otp];
        digits.forEach((d, i) => { if (i < 6) newOtp[i] = d; });
        setOtp(newOtp);
        otpRefs.current[Math.min(digits.length, 5)]?.focus();
      });
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    const newOtp = ['', '', '', '', '', ''];
    digits.forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  // Step 2: Verify OTP → Register
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) return setError('Please enter the complete 6-digit OTP');
    setError(''); setLoading(true);
    try {
      // Verify OTP first
      await api.post('/auth/verify-otp', { email: form.email, otp: otpValue });
      // Complete registration
      await api.post('/auth/register', { ...form, role, otp: otpValue });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally { setLoading(false); }
  };

  // Resend OTP
  const handleResend = async () => {
    setError(''); setOtp(['','','','','','']); setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: form.email, name: form.name });
      setInfo('New OTP sent to your email!');
      setResendTimer(60);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally { setLoading(false); }
  };

  // ── Step 3: Success ──────────────────────────────────────────
  if (step === 3) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f0f4f8,#e2e8f0)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ background:'white', borderRadius:'20px', padding:'56px 48px', maxWidth:'480px', width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.1)' }}>
        <div style={{ width:'80px', height:'80px', background:'linear-gradient(135deg,#2a9d8f,#0a6e6e)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'40px' }}>✅</div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'28px', marginBottom:'8px', color:'#1a202c' }}>Account Created!</h2>
        <p style={{ color:'#718096', marginBottom:'8px' }}>Your email <strong>{form.email}</strong> has been verified.</p>
        <p style={{ color:'#718096', marginBottom:'28px', fontSize:'14px' }}>A welcome email has been sent to your inbox.</p>
        <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:'15px' }}>
          Continue to Login →
        </button>
      </div>
    </div>
  );

  // ── Step 2: OTP Verification ─────────────────────────────────
  if (step === 2) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f0f4f8,#e2e8f0)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ background:'white', borderRadius:'20px', padding:'48px', maxWidth:'460px', width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ width:'72px', height:'72px', background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:'32px' }}>📧</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'28px', color:'#1a202c', marginBottom:'8px' }}>Check Your Email</h2>
          <p style={{ color:'#718096', fontSize:'14px', lineHeight:'1.6' }}>
            We sent a 6-digit OTP to<br />
            <strong style={{ color:'#0a6e6e' }}>{form.email}</strong>
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {info && !error && <div className="alert alert-success">{info}</div>}

        <form onSubmit={handleOtpSubmit}>
          {/* OTP Input Boxes */}
          <div style={{ display:'flex', gap:'10px', justifyContent:'center', marginBottom:'28px' }} onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => otpRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                style={{
                  width:'52px', height:'60px', textAlign:'center', fontSize:'24px', fontWeight:700,
                  border:`2px solid ${digit ? '#0a6e6e' : '#e2e8f0'}`,
                  borderRadius:'12px', outline:'none', fontFamily:'monospace',
                  background: digit ? '#f0fafa' : 'white',
                  color:'#0a6e6e', transition:'all 0.15s',
                  boxShadow: digit ? '0 0 0 3px rgba(10,110,110,0.1)' : 'none'
                }}
              />
            ))}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:'15px', marginBottom:'16px' }} disabled={loading || otp.join('').length !== 6}>
            {loading ? 'Verifying...' : 'Verify & Create Account'}
          </button>
        </form>

        <div style={{ textAlign:'center' }}>
          {resendTimer > 0 ? (
            <p style={{ color:'#718096', fontSize:'14px' }}>
              Resend OTP in <strong style={{ color:'#0a6e6e' }}>{resendTimer}s</strong>
            </p>
          ) : (
            <button onClick={handleResend} disabled={loading} style={{ background:'none', border:'none', color:'#0a6e6e', fontWeight:600, cursor:'pointer', fontSize:'14px', textDecoration:'underline' }}>
              Resend OTP
            </button>
          )}
        </div>

        <div style={{ marginTop:'20px', textAlign:'center' }}>
          <button onClick={() => { setStep(1); setOtp(['','','','','','']); setError(''); }} style={{ background:'none', border:'none', color:'#718096', cursor:'pointer', fontSize:'13px' }}>
            ← Change email / go back
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step 1: Registration Form ─────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f0f4f8,#e2e8f0)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ background:'white', borderRadius:'16px', padding:'48px', width:'100%', maxWidth:'640px', boxShadow:'0 20px 60px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontSize:'48px', marginBottom:'12px' }}>🏥</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'32px', color:'#1a202c' }}>Create Account</h2>
          <p style={{ color:'#718096', marginTop:'6px' }}>Join MediCare Hospital</p>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'28px' }}>
          {['Fill Details', 'Verify Email', 'Done'].map((label, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'50%', background: i === 0 ? '#0a6e6e' : '#e2e8f0', color: i === 0 ? 'white' : '#718096', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700 }}>{i + 1}</div>
                <span style={{ fontSize:'13px', fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#0a6e6e' : '#718096' }}>{label}</span>
              </div>
              {i < 2 && <div style={{ width:'24px', height:'2px', background:'#e2e8f0' }} />}
            </div>
          ))}
        </div>

        {/* Role Selector */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'28px' }}>
          {[{value:'patient',label:'👤 Patient',desc:'Book tests & consultations'},{value:'doctor',label:'👨‍⚕️ Doctor',desc:'Manage patients & reports'}].map(r => (
            <div key={r.value} onClick={() => setRole(r.value)} style={{ border:`2px solid ${role===r.value?'#0a6e6e':'#e2e8f0'}`, background:role===r.value?'#f0fafa':'white', borderRadius:'12px', padding:'16px', cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}>
              <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'4px' }}>{r.label}</div>
              <div style={{ fontSize:'12px', color:'#718096' }}>{r.desc}</div>
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleFormSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Full Name <span style={{color:'#e63946'}}>*</span></label>
              <input placeholder="John Doe" value={form.name} onChange={e=>set('name',e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Phone <span style={{color:'#e63946'}}>*</span></label>
              <input placeholder="9876543210" value={form.phone} onChange={e=>set('phone',e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label>Email <span style={{color:'#e63946'}}>*</span></label>
            <input type="email" placeholder="your@email.com" value={form.email} onChange={e=>set('email',e.target.value)} required />
            <div style={{ fontSize:'12px', color:'#718096', marginTop:'4px' }}>📧 An OTP will be sent to this email for verification</div>
          </div>
          <div className="form-group">
            <label>Password <span style={{color:'#e63946'}}>*</span></label>
            <input type="password" placeholder="Minimum 6 characters" value={form.password} onChange={e=>set('password',e.target.value)} required minLength={6} />
          </div>

          {role === 'patient' && <>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'16px', paddingBottom:'8px', borderBottom:'2px solid #f0fafa' }}>Patient Details</div>
            <div className="grid-3">
              <div className="form-group">
                <label>Age <span style={{color:'#e63946'}}>*</span></label>
                <input type="number" placeholder="25" value={form.age} onChange={e=>set('age',e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Gender <span style={{color:'#e63946'}}>*</span></label>
                <select value={form.gender} onChange={e=>set('gender',e.target.value)} required>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Blood Group <span style={{color:'#e63946'}}>*</span></label>
                <select value={form.blood_group} onChange={e=>set('blood_group',e.target.value)} required>
                  <option value="">Select</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg=><option key={bg}>{bg}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Address <span style={{color:'#718096',fontSize:'11px',fontWeight:400}}>(optional)</span></label>
              <textarea rows={2} placeholder="Your address (optional)" value={form.address} onChange={e=>set('address',e.target.value)} style={{resize:'vertical'}} />
            </div>
          </>}

          {role === 'doctor' && <>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'16px', paddingBottom:'8px', borderBottom:'2px solid #f0fafa' }}>Doctor Details</div>
            <div className="grid-2">
              <div className="form-group">
                <label>Specialization <span style={{color:'#e63946'}}>*</span></label>
                <select value={form.specialization} onChange={e=>set('specialization',e.target.value)} required>
                  <option value="">Select</option>
                  {SPECIALIZATIONS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Room Number <span style={{color:'#e63946'}}>*</span></label>
                <input placeholder="e.g. Room 201" value={form.room_number} onChange={e=>set('room_number',e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label>Qualification <span style={{color:'#e63946'}}>*</span></label>
              <input placeholder="e.g. MBBS, MD" value={form.qualification} onChange={e=>set('qualification',e.target.value)} required />
            </div>
          </>}

          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:'15px', marginTop:'8px' }} disabled={loading}>
            {loading ? 'Sending OTP...' : `Send OTP to Verify Email →`}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:'24px', color:'#718096', fontSize:'14px' }}>
          Already have an account? <Link to="/login" style={{ color:'#0a6e6e', fontWeight:600, textDecoration:'none' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

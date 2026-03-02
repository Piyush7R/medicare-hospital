import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function ReceptionPayment() {
  const { state } = useLocation();
  const [token, setToken]           = useState(state?.token || '');
  const [foundAppt, setFoundAppt]   = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [searching, setSearching]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed]   = useState(false);
  const [pendingList, setPendingList] = useState([]);
  const inputRef = useRef();

  const loadPending = () =>
    api.get('/reception/today').then(r =>
      setPendingList(r.data.appointments.filter(a => !a.payment_confirmed && a.status === 'booked'))
    ).catch(console.error);

  useEffect(() => {
    loadPending();
    if (state?.token) doSearch(state.token);
    else setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const doSearch = async (t) => {
    const tk = (t || token).trim().toUpperCase();
    if (!tk) return setTokenError('Enter a token number');
    setTokenError(''); setFoundAppt(null); setConfirmed(false); setSearching(true);
    try {
      const res = await api.get(`/reception/token/${tk}`);
      setFoundAppt(res.data);
      setToken(tk);
    } catch (err) {
      setTokenError(err.response?.data?.message || 'Token not found');
    } finally { setSearching(false); }
  };

  const doConfirm = async () => {
    setConfirming(true);
    try {
      await api.post('/reception/confirm-payment', { token: foundAppt.token_number });
      setConfirmed(true);
      setFoundAppt(p => ({ ...p, payment_confirmed:true, status:'checked_in' }));
      loadPending();
    } catch (err) {
      setTokenError(err.response?.data?.message || 'Confirmation failed');
    } finally { setConfirming(false); }
  };

  const reset = () => {
    setToken(''); setFoundAppt(null); setTokenError(''); setConfirmed(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <Layout>
      <div style={{ marginBottom:'28px' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'#0a6e6e', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>Reception</div>
        <h1 style={{ fontSize:'30px', fontFamily:"'Playfair Display',serif", color:'#1a202c', margin:'0 0 4px' }}>💳 Payment & Check-in</h1>
        <p style={{ color:'#718096', margin:0, fontSize:'14px' }}>Search patient by token number to confirm cash payment and check in</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:'24px' }}>

        {/* ── Main panel ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

          {/* Token search */}
          <div style={{ background:'white', borderRadius:'16px', padding:'28px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'14px' }}>Token Number</div>
            <div style={{ display:'flex', gap:'12px' }}>
              <input
                ref={inputRef}
                value={token}
                onChange={e => { setToken(e.target.value.toUpperCase()); setTokenError(''); }}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="TKN-XXXXXX"
                style={{ flex:1, padding:'15px 20px', border:`2.5px solid ${tokenError?'#e63946':foundAppt&&!confirmed?'#2a9d8f':confirmed?'#2a9d8f':'#e2e8f0'}`, borderRadius:'12px', fontFamily:'monospace', fontSize:'20px', fontWeight:700, letterSpacing:'4px', outline:'none', color:'#1a202c', transition:'border-color 0.2s', textTransform:'uppercase' }}
              />
              <button onClick={() => doSearch()} disabled={searching}
                style={{ padding:'15px 28px', background:'linear-gradient(135deg,#0a6e6e,#064444)', color:'white', border:'none', borderRadius:'12px', cursor:'pointer', fontWeight:700, fontSize:'15px', flexShrink:0, opacity:searching?0.6:1, transition:'opacity 0.2s' }}>
                {searching ? '...' : 'Search'}
              </button>
            </div>
            {tokenError && (
              <div style={{ marginTop:'12px', display:'flex', alignItems:'center', gap:'8px', background:'#fff5f5', border:'1.5px solid #fed7d7', borderRadius:'10px', padding:'11px 14px', color:'#c53030', fontSize:'13px', fontWeight:600 }}>
                <span>❌</span> {tokenError}
              </div>
            )}
          </div>

          {/* Patient result card */}
          {foundAppt && (
            <div style={{ background:'white', borderRadius:'16px', overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', border:`2.5px solid ${confirmed?'#2a9d8f':foundAppt.payment_confirmed?'#f0a500':'#0a6e6e'}` }}>

              {/* Confirmed banner */}
              {confirmed && (
                <div style={{ background:'linear-gradient(135deg,#2a9d8f,#1a6e3c)', padding:'16px 24px', display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ fontSize:'36px' }}>✅</div>
                  <div>
                    <div style={{ color:'white', fontWeight:800, fontSize:'17px' }}>Payment Confirmed!</div>
                    <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'13px' }}>{foundAppt.patient_name} has been checked in successfully</div>
                  </div>
                </div>
              )}

              {/* Already paid warning */}
              {foundAppt.payment_confirmed && !confirmed && (
                <div style={{ background:'#fff8e8', borderBottom:'1.5px solid #f0a500', padding:'12px 24px', fontSize:'13px', color:'#856404', fontWeight:600 }}>
                  ⚠️ Payment already confirmed for this appointment
                </div>
              )}

              {/* Patient header */}
              <div style={{ padding:'24px', borderBottom:'1.5px solid #f7fafc', display:'flex', gap:'16px', alignItems:'center' }}>
                <div style={{ width:'64px', height:'64px', background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:'28px', flexShrink:0 }}>
                  {foundAppt.patient_name?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:'22px', color:'#1a202c' }}>{foundAppt.patient_name}</div>
                  <div style={{ color:'#718096', fontSize:'13px', marginTop:'2px' }}>{foundAppt.patient_phone} &nbsp;·&nbsp; {foundAppt.patient_email}</div>
                </div>
                <div style={{ marginLeft:'auto', textAlign:'right' }}>
                  <div style={{ fontSize:'28px', fontWeight:800, color:'#0a6e6e' }}>₹{foundAppt.payment_amount||0}</div>
                  <div style={{ color:'#718096', fontSize:'12px' }}>to collect</div>
                </div>
              </div>

              {/* Details grid */}
              <div style={{ padding:'24px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
                {[
                  ['Token',       foundAppt.token_number,                                                   '#0a6e6e'],
                  ['Type',        foundAppt.appointment_type==='consultation'?'Consultation':'Diagnostic',   '#1a202c'],
                  ['Package',     foundAppt.package_name||`Dr. ${foundAppt.doctor_name}`||'N/A',            '#1a202c'],
                  ['Date',        new Date(foundAppt.appointment_date).toDateString(),                        '#1a202c'],
                  ['Time',        foundAppt.appointment_time?.slice(0,5),                                    '#1a202c'],
                  ['Blood Group', foundAppt.blood_group||'—',                                                '#e63946'],
                  ['Age',         foundAppt.age?`${foundAppt.age} years`:'—',                               '#1a202c'],
                  ['Gender',      foundAppt.gender||'—',                                                     '#1a202c'],
                  ['Status',      foundAppt.status?.replace('_',' '),                                        '#718096'],
                ].map(([k,v,c]) => (
                  <div key={k} style={{ background:'#f7fafc', borderRadius:'10px', padding:'12px 14px' }}>
                    <div style={{ fontSize:'10px', color:'#a0aec0', textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:700, marginBottom:'4px' }}>{k}</div>
                    <div style={{ fontSize:'14px', fontWeight:700, color:c, textTransform:'capitalize' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ padding:'0 24px 24px', display:'flex', gap:'12px' }}>
                {!foundAppt.payment_confirmed && !confirmed && (
                  <button onClick={doConfirm} disabled={confirming}
                    style={{ flex:1, padding:'14px', background:'linear-gradient(135deg,#2a9d8f,#0a6e6e)', color:'white', border:'none', borderRadius:'12px', fontSize:'15px', fontWeight:700, cursor:'pointer', opacity:confirming?0.7:1, transition:'all 0.2s' }}>
                    {confirming ? 'Confirming...' : '✅ Confirm Cash Payment & Check In'}
                  </button>
                )}
                <button onClick={reset}
                  style={{ padding:'14px 24px', background:'#f7fafc', border:'2px solid #e2e8f0', borderRadius:'12px', color:'#718096', cursor:'pointer', fontWeight:600, fontSize:'14px', flexShrink:0 }}>
                  {confirmed ? '→ Next Patient' : 'Clear'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Pending sidebar ── */}
        <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)', height:'fit-content', position:'sticky', top:'24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'1px' }}>⏳ Pending Today</div>
            <span style={{ background:'#fff8e8', color:'#b86e00', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>{pendingList.length}</span>
          </div>

          {pendingList.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 16px', color:'#a0aec0' }}>
              <div style={{ fontSize:'36px', marginBottom:'8px' }}>🎉</div>
              <p style={{ fontSize:'13px', margin:0 }}>All payments cleared!</p>
            </div>
          ) : pendingList.map(a => (
            <div key={a.id} onClick={() => doSearch(a.token_number)}
              style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', borderRadius:'12px', cursor:'pointer', marginBottom:'8px', border:'1.5px solid transparent', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='#f0fafa'; e.currentTarget.style.borderColor='#0a6e6e'; }}
              onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.borderColor='transparent'; }}>
              <div style={{ width:'40px', height:'40px', background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'16px', flexShrink:0 }}>
                {a.patient_name?.[0]}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:'13px', color:'#1a202c', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.patient_name}</div>
                <div style={{ color:'#a0aec0', fontSize:'11px', marginTop:'1px' }}>{a.appointment_time?.slice(0,5)} · {a.package_name||'Consult'}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontWeight:800, fontSize:'13px', color:'#0a6e6e' }}>₹{a.payment_amount||0}</div>
                <div style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'1px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:700, marginTop:'2px' }}>{a.token_number}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

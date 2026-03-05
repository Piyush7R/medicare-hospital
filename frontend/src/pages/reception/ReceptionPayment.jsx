import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash',  icon: '💵', color: '#2a9d8f', bg: '#eaf7ef' },
  { value: 'upi',  label: 'UPI',   icon: '📱', color: '#4361ee', bg: '#eef3ff' },
  { value: 'card', label: 'Card',  icon: '💳', color: '#6b21a8', bg: '#f3e8ff' },
];

export default function ReceptionPayment() {
  const { state } = useLocation();
  const [token, setToken]             = useState(state?.token || '');
  const [foundAppt, setFoundAppt]     = useState(null);
  const [tokenError, setTokenError]   = useState('');
  const [searching, setSearching]     = useState(false);
  const [confirming, setConfirming]   = useState(false);
  const [confirmed, setConfirmed]     = useState(false);
  const [pendingList, setPendingList] = useState([]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const inputRef = useRef();

  const loadPending = () =>
    api.get('/reception/today')
      .then(r => setPendingList(r.data.appointments.filter(a => !a.payment_confirmed && a.status === 'booked')))
      .catch(console.error);

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
      await api.post('/reception/confirm-payment', {
        token: foundAppt.token_number,
        payment_mode: paymentMode
      });
      setConfirmed(true);
      setFoundAppt(p => ({ ...p, payment_confirmed: true, status: 'checked_in', payment_mode: paymentMode }));
      loadPending();
    } catch (err) {
      setTokenError(err.response?.data?.message || 'Confirmation failed');
    } finally { setConfirming(false); }
  };

  const reset = () => {
    setToken(''); setFoundAppt(null); setTokenError('');
    setConfirmed(false); setPaymentMode('cash');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const selectedMode = PAYMENT_MODES.find(m => m.value === paymentMode);

  return (
    <Layout>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0a6e6e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Reception</div>
        <h1 style={{ fontSize: 30, fontFamily: "'Playfair Display',serif", color: '#1a202c', margin: '0 0 4px' }}>💳 Payment & Check-in</h1>
        <p style={{ color: '#718096', margin: 0, fontSize: 14 }}>Search patient by token → select payment mode → confirm & check in</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>

        {/* ── Main Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Token Search */}
          <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Token Number</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                ref={inputRef}
                value={token}
                onChange={e => { setToken(e.target.value.toUpperCase()); setTokenError(''); }}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="TKN-XXXXXX"
                style={{ flex: 1, padding: '15px 20px', border: `2.5px solid ${tokenError ? '#e63946' : foundAppt ? '#2a9d8f' : '#e2e8f0'}`, borderRadius: 12, fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 4, outline: 'none', color: '#1a202c', textTransform: 'uppercase' }}
              />
              <button onClick={() => doSearch()} disabled={searching}
                style={{ padding: '15px 28px', background: 'linear-gradient(135deg,#0a6e6e,#064444)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 15, opacity: searching ? 0.6 : 1 }}>
                {searching ? '...' : 'Search'}
              </button>
            </div>
            {tokenError && (
              <div style={{ marginTop: 12, background: '#fff5f5', border: '1.5px solid #fed7d7', borderRadius: 10, padding: '11px 14px', color: '#c53030', fontSize: 13, fontWeight: 600 }}>
                ❌ {tokenError}
              </div>
            )}
          </div>

          {/* Patient Card */}
          {foundAppt && (
            <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: `2.5px solid ${confirmed ? '#2a9d8f' : foundAppt.payment_confirmed ? '#f0a500' : '#0a6e6e'}` }}>

              {/* Success banner */}
              {confirmed && (
                <div style={{ background: 'linear-gradient(135deg,#2a9d8f,#1a6e3c)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 36 }}>✅</div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 800, fontSize: 17 }}>Payment Confirmed!</div>
                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                      {foundAppt.patient_name} · {selectedMode?.icon} {selectedMode?.label}
                    </div>
                  </div>
                </div>
              )}

              {foundAppt.payment_confirmed && !confirmed && (
                <div style={{ background: '#fff8e8', borderBottom: '1.5px solid #f0a500', padding: '12px 24px', fontSize: 13, color: '#856404', fontWeight: 600 }}>
                  ⚠️ Payment already confirmed {foundAppt.payment_mode ? `(${foundAppt.payment_mode.toUpperCase()})` : ''}
                </div>
              )}

              {/* Patient Header */}
              <div style={{ padding: 24, borderBottom: '1.5px solid #f7fafc', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 28, flexShrink: 0 }}>
                  {foundAppt.patient_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: '#1a202c' }}>{foundAppt.patient_name}</div>
                  <div style={{ color: '#718096', fontSize: 13, marginTop: 2 }}>{foundAppt.patient_phone} · {foundAppt.patient_email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#0a6e6e' }}>₹{foundAppt.payment_amount || 0}</div>
                  <div style={{ color: '#718096', fontSize: 12 }}>to collect</div>
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  ['Token',       foundAppt.token_number,   '#0a6e6e'],
                  ['Type',        foundAppt.appointment_type === 'consultation' ? 'Consultation' : 'Diagnostic', '#1a202c'],
                  ['Package',     foundAppt.package_name || `Dr. ${foundAppt.doctor_name}` || 'N/A', '#1a202c'],
                  ['Date',        new Date(foundAppt.appointment_date).toDateString(), '#1a202c'],
                  ['Blood Group', foundAppt.blood_group || '—', '#e63946'],
                  ['Age / Gender',foundAppt.age ? `${foundAppt.age}y · ${foundAppt.gender || '—'}` : '—', '#718096'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ background: '#f7fafc', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* ══ PAYMENT MODE SELECTOR ══ */}
              {!foundAppt.payment_confirmed && !confirmed && (
                <div style={{ margin: '0 24px 20px', padding: 20, background: '#f8fafc', borderRadius: 14, border: '1.5px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a202c', marginBottom: 14 }}>
                    💳 Select Payment Mode
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                    {PAYMENT_MODES.map(mode => (
                      <div
                        key={mode.value}
                        onClick={() => setPaymentMode(mode.value)}
                        style={{
                          border: `2.5px solid ${paymentMode === mode.value ? mode.color : '#e2e8f0'}`,
                          background: paymentMode === mode.value ? mode.bg : 'white',
                          borderRadius: 12,
                          padding: '18px 12px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          transform: paymentMode === mode.value ? 'scale(1.03)' : 'scale(1)',
                        }}
                      >
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{mode.icon}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: paymentMode === mode.value ? mode.color : '#4a5568' }}>
                          {mode.label}
                        </div>
                        {paymentMode === mode.value && (
                          <div style={{ marginTop: 6, fontSize: 11, color: mode.color, fontWeight: 600 }}>✓ Selected</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ padding: '0 24px 24px', display: 'flex', gap: 12 }}>
                {!foundAppt.payment_confirmed && !confirmed && (
                  <button
                    onClick={doConfirm}
                    disabled={confirming}
                    style={{
                      flex: 1, padding: 15,
                      background: `linear-gradient(135deg,${selectedMode?.color},#064444)`,
                      color: 'white', border: 'none', borderRadius: 12,
                      fontSize: 15, fontWeight: 700, cursor: 'pointer',
                      opacity: confirming ? 0.7 : 1, transition: 'all 0.2s'
                    }}
                  >
                    {confirming
                      ? 'Confirming...'
                      : `${selectedMode?.icon} Confirm ${selectedMode?.label} & Check In`
                    }
                  </button>
                )}
                <button
                  onClick={reset}
                  style={{ padding: '14px 24px', background: '#f7fafc', border: '2px solid #e2e8f0', borderRadius: 12, color: '#718096', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                >
                  {confirmed ? '→ Next Patient' : 'Clear'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Pending Sidebar ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', height: 'fit-content', position: 'sticky', top: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: 1 }}>⏳ Pending Today</div>
            <span style={{ background: '#fff8e8', color: '#b86e00', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{pendingList.length}</span>
          </div>
          {pendingList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#a0aec0' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <p style={{ fontSize: 13, margin: 0 }}>All payments cleared!</p>
            </div>
          ) : pendingList.map(a => (
            <div key={a.id} onClick={() => doSearch(a.token_number)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, cursor: 'pointer', marginBottom: 8, border: '1.5px solid transparent', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0fafa'; e.currentTarget.style.borderColor = '#0a6e6e'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'transparent'; }}>
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#0a6e6e,#0d8c8c)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                {a.patient_name?.[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1a202c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patient_name}</div>
                <div style={{ color: '#a0aec0', fontSize: 11, marginTop: 1 }}>{a.package_name || 'Consultation'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#0a6e6e' }}>₹{a.payment_amount || 0}</div>
                <div style={{ background: '#e8f5f5', color: '#0a6e6e', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, marginTop: 2 }}>{a.token_number}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const STATUS_STYLE = {
  booked:      { bg: '#eef3ff', color: '#4361ee',  label: 'Booked'      },
  checked_in:  { bg: '#fff8e8', color: '#c47d00',  label: 'Checked In'  },
  in_progress: { bg: '#e8f5f5', color: '#0a6e6e',  label: 'In Progress' },
  completed:   { bg: '#eaf7ef', color: '#2a9d8f',  label: 'Completed'   },
  cancelled:   { bg: '#fff5f5', color: '#e63946',  label: 'Cancelled'   },
};

function Badge({ status }) {
  const s = STATUS_STYLE[status] || { bg: '#f0f4f8', color: '#718096', label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

// Helper function to get local date in YYYY-MM-DD format
const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to check if a date string is today
const isToday = (dateString) => {
  if (!dateString) return false;
  const today = getLocalDateString(new Date());
  const appointmentDate = dateString.split('T')[0];
  return appointmentDate === today;
};

export default function DoctorAppointments() {
  const [all, setAll]           = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [typeTab, setTypeTab]   = useState('all');
  const [statusTab, setStatus]  = useState('all');
  const [dateFilter, setDate]   = useState('');
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage]   = useState({ text: '', type: '' });

  const fetchAppointments = () => {
    api.get('/appointments/all')
      .then(r => { setAll(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let list = [...all];
    if (typeTab !== 'all')   list = list.filter(a => a.appointment_type === typeTab);
    if (statusTab === 'active')    list = list.filter(a => ['checked_in','in_progress','booked'].includes(a.status));
    if (statusTab === 'completed') list = list.filter(a => a.status === 'completed');
    if (statusTab === 'cancelled') list = list.filter(a => a.status === 'cancelled');
    if (dateFilter) {
      list = list.filter(a => {
        const apptDate = a.appointment_date?.split('T')[0];
        return apptDate === dateFilter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.patient_name?.toLowerCase().includes(q) ||
        a.token_number?.toLowerCase().includes(q) ||
        a.package_name?.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [all, typeTab, statusTab, dateFilter, search]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Check-in patient
  const handleCheckIn = async (appointment) => {
    if (!window.confirm(`Check in ${appointment.patient_name}?\n\nToken: ${appointment.token_number}\nPackage: ${appointment.package_name || 'Consultation'}`)) {
      return;
    }

    setActionLoading(appointment.id);
    try {
      await api.post('/queue/checkin', { appointment_id: appointment.id });
      showMessage(`✅ ${appointment.patient_name} checked in successfully!`, 'success');
      fetchAppointments();
    } catch (err) {
      showMessage(`❌ ${err.response?.data?.message || 'Check-in failed'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Complete test
  const handleCompleteTest = async (appointment) => {
    if (!window.confirm(`Mark ${appointment.patient_name}'s test as completed?\n\nToken: ${appointment.token_number}\nThis will move the patient to the next step.`)) {
      return;
    }

    setActionLoading(appointment.id);
    try {
      const res = await api.post('/queue/complete-test', { 
        appointment_id: appointment.id 
      });
      showMessage(`✅ ${res.data.message || 'Test completed successfully!'}`, 'success');
      fetchAppointments();
    } catch (err) {
      showMessage(`❌ ${err.response?.data?.message || 'Failed to complete test'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const today     = getLocalDateString(new Date());
  const todayList = all.filter(a => {
    const apptDate = a.appointment_date?.split('T')[0];
    return apptDate === today;
  });
  const testCount = all.filter(a => a.appointment_type === 'test').length;
  const consCount = all.filter(a => a.appointment_type === 'consultation').length;

  return (
    <Layout>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0a6e6e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Doctor Portal</div>
        <h1 style={{ fontSize: 26, fontFamily: "'Playfair Display',serif", color: '#1a202c', margin: '0 0 4px' }}>📅 Appointments</h1>
        <p style={{ color: '#718096', margin: 0, fontSize: 13 }}>All hospital tests + your consultations · Check-in patients & complete tests</p>
      </div>

      {/* Success/Error Messages */}
      {message.text && (
        <div style={{ 
          background: message.type === 'success' ? '#eaf7ef' : '#fff5f5', 
          border: `2px solid ${message.type === 'success' ? '#2a9d8f' : '#e63946'}`, 
          borderRadius: 12, 
          padding: '14px 18px', 
          marginBottom: 20, 
          color: message.type === 'success' ? '#1a6e3c' : '#c53030', 
          fontWeight: 600, 
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          {message.text}
        </div>
      )}

      {/* Summary cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { icon: '📋', label: 'Total',          value: all.length,      bg: '#eef3ff', color: '#4361ee' },
            { icon: '📅', label: "Today's",         value: todayList.length, bg: '#fff8e8', color: '#c47d00' },
            { icon: '🧪', label: 'Tests',           value: testCount,       bg: '#e8f5f5', color: '#0a6e6e' },
            { icon: '👨‍⚕️', label: 'My Consultations', value: consCount,    bg: '#f3e8ff', color: '#6b21a8' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'white', padding: 5, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 16, width: 'fit-content' }}>
        {[
          { id: 'all',          label: '🗂 All' },
          { id: 'test',         label: '🧪 Tests' },
          { id: 'consultation', label: '👨‍⚕️ My Consultations' },
        ].map(t => (
          <button key={t.id} onClick={() => setTypeTab(t.id)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: typeTab === t.id ? '#0a6e6e' : 'transparent', color: typeTab === t.id ? 'white' : '#718096', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search patient, token, package…"
          style={{ flex: 1, minWidth: 220, padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none' }}
        />
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDate(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', cursor: 'pointer' }}
        />
        {dateFilter && (
          <button onClick={() => setDate('')}
            style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 12, color: '#718096' }}>
            ✕ Clear date
          </button>
        )}
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'all',       label: 'All' },
            { id: 'active',    label: '⚡ Active' },
            { id: 'completed', label: '✅ Done' },
            { id: 'cancelled', label: '❌ Cancelled' },
          ].map(s => (
            <button key={s.id} onClick={() => setStatus(s.id)}
              style={{ padding: '7px 12px', border: `2px solid ${statusTab === s.id ? '#0a6e6e' : '#e2e8f0'}`, borderRadius: 8, background: statusTab === s.id ? '#0a6e6e' : 'white', color: statusTab === s.id ? 'white' : '#718096', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
          <p>Loading appointments…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 16, color: '#a0aec0' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
          <p>No appointments match your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(a => {
            const isOpen = expanded === a.id;
            const isConsult = a.appointment_type === 'consultation';
            const appointmentDateString = a.appointment_date?.split('T')[0];
            const isTodayAppt = isToday(a.appointment_date);
            const isProcessing = actionLoading === a.id;
            
            // Parse date properly
            const [year, month, day] = appointmentDateString ? appointmentDateString.split('-') : [0, 0, 0];
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

            // Determine what actions are available
            const canCheckIn = a.status === 'booked' && a.payment_confirmed && isTodayAppt;
            const canComplete = ['checked_in', 'in_progress'].includes(a.status) && isTodayAppt;

            return (
              <div key={a.id}
                style={{ background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', border: isTodayAppt ? '2px solid #0a6e6e33' : '2px solid transparent', transition: 'box-shadow 0.15s' }}>

                {/* Main row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : a.id)}>

                  {/* Date block */}
                  <div style={{ width: 50, height: 54, background: isConsult ? 'linear-gradient(135deg,#6b21a8,#4c1a7a)' : 'linear-gradient(135deg,#0a6e6e,#064444)', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ color: 'white', fontSize: 17, fontWeight: 800, lineHeight: 1 }}>{dateObj.getDate()}</div>
                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, textTransform: 'uppercase', marginTop: 2 }}>
                      {dateObj.toLocaleString('default', { month: 'short' })} {dateObj.getFullYear()}
                    </div>
                  </div>

                  {/* Type icon */}
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{isConsult ? '👨‍⚕️' : '🧪'}</div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1a202c' }}>{a.patient_name}</span>
                      {isTodayAppt && <span style={{ background: '#e63946', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>TODAY</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                      {isConsult
                        ? `Consultation${a.specialization ? ' · ' + a.specialization : ''}`
                        : `🧪 ${a.package_name || 'Test Package'}`}
                      <span style={{ marginLeft: 10, color: '#0a6e6e', fontWeight: 600 }}>#{a.token_number}</span>
                    </div>
                    {a.pre_requirements && !isConsult && (
                      <div style={{ marginTop: 5, fontSize: 11, color: '#856404', background: '#fffbf0', borderRadius: 5, padding: '2px 8px', display: 'inline-block' }}>
                        ⚠️ {a.pre_requirements.slice(0, 70)}{a.pre_requirements.length > 70 ? '…' : ''}
                      </div>
                    )}
                  </div>

                  {/* Right side - Status & Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <Badge status={a.status} />
                    <div style={{ fontSize: 11, color: a.payment_confirmed ? '#2a9d8f' : '#c47d00', fontWeight: 600 }}>
                      {a.payment_confirmed ? `✅ ₹${a.payment_amount}` : '⏳ Pending payment'}
                    </div>
                    
                    {/* Action buttons */}
                    {(canCheckIn || canComplete) && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                        {canCheckIn && (
                          <button
                            onClick={() => handleCheckIn(a)}
                            disabled={isProcessing}
                            style={{
                              padding: '5px 12px',
                              background: isProcessing ? '#a0aec0' : 'linear-gradient(135deg, #4361ee, #2945cc)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isProcessing ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {isProcessing ? '...' : '✓ Check In'}
                          </button>
                        )}
                        {canComplete && (
                          <button
                            onClick={() => handleCompleteTest(a)}
                            disabled={isProcessing}
                            style={{
                              padding: '5px 12px',
                              background: isProcessing ? '#a0aec0' : 'linear-gradient(135deg, #2a9d8f, #0a6e6e)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isProcessing ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {isProcessing ? '...' : '✅ Complete'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <span style={{ color: '#a0aec0', fontSize: 16, marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f0f4f8', padding: '14px 18px', background: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                    {[
                      ['👤 Patient',      a.patient_name],
                      ['📞 Phone',        a.patient_phone || '—'],
                      ['🩸 Blood Group',  a.blood_group || '—'],
                      ['🎂 Age / Gender', a.age ? `${a.age} yrs · ${a.gender || '—'}` : '—'],
                      ['💳 Payment',      a.payment_mode?.toUpperCase() || 'Cash'],
                      ['📅 Date',         `${dateObj.toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })}${isTodayAppt ? ' (TODAY)' : ''}`],
                      ...(isConsult
                        ? [['🏥 Specialization', a.specialization || '—']]
                        : [['🏠 Test Room', a.test_room_number || '—']]),
                      ['🔖 Token', a.token_number],
                      ['📊 Status', a.status.replace('_',' ')],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, color: '#1a202c', fontWeight: 500 }}>{val}</div>
                      </div>
                    ))}
                    {a.patient_note && (
                      <div style={{ gridColumn: '1/-1', background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', marginBottom: 3 }}>Patient Note</div>
                        <div style={{ fontSize: 13, color: '#4a5568' }}>{a.patient_note}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {!loading && (
        <div style={{ marginTop: 16, fontSize: 12, color: '#a0aec0', textAlign: 'center' }}>
          Showing {filtered.length} of {all.length} appointment{all.length !== 1 ? 's' : ''}
          {' · Auto-refreshes every 30 seconds'}
        </div>
      )}
    </Layout>
  );
}
import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const BLOOD_COLORS = { 'A+':'#e63946','A-':'#c53030','B+':'#4361ee','B-':'#2a4dd0','AB+':'#6b21a8','AB-':'#5b1a98','O+':'#0a6e6e','O-':'#064444' };
const GENDER_ICON  = { Male:'👨', Female:'👩', Other:'🧑' };

function Badge({ children, bg = '#f3e8ff', color = '#6b21a8' }) {
  return (
    <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export default function DoctorPatients() {
  const [patients, setPatients]   = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [genderFilter, setGender] = useState('all');
  const [selected, setSelected]   = useState(null);
  const [patientAppts, setAppts]  = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  useEffect(() => {
    api.get('/dashboard/patients')
      .then(r => { setPatients(r.data); setFiltered(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter whenever search / gender changes
  useEffect(() => {
    let list = patients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.blood_group?.toLowerCase().includes(q)
      );
    }
    if (genderFilter !== 'all') list = list.filter(p => p.gender === genderFilter);
    setFiltered(list);
  }, [search, genderFilter, patients]);

  // Open patient detail — fetch their appointments with this doctor
  const openPatient = async (patient) => {
    setSelected(patient);
    setAppts([]);
    setLoadingAppts(true);
    try {
      // Get all appointments filtered to this patient
      const r = await api.get(`/appointments/all`);
      const mine = r.data.filter(a => a.patient_id === patient.id || a.patient_id === patient.user_id);
      setAppts(mine);
    } catch {
      setAppts([]);
    } finally {
      setLoadingAppts(false);
    }
  };

  const statusColor = {
    booked:      { bg: '#eef3ff', color: '#4361ee' },
    checked_in:  { bg: '#fff8e8', color: '#c47d00' },
    in_progress: { bg: '#e8f5f5', color: '#0a6e6e' },
    completed:   { bg: '#eaf7ef', color: '#2a9d8f' },
    cancelled:   { bg: '#fff5f5', color: '#e63946' },
  };

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0a6e6e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Doctor Portal</div>
        <h1 style={{ fontSize: 26, fontFamily: "'Playfair Display',serif", color: '#1a202c', margin: '0 0 4px' }}>👥 My Patients</h1>
        <p style={{ color: '#718096', margin: 0, fontSize: 13 }}>Patients who have or had appointments with you</p>
      </div>

      {/* Stats strip */}
      {!loading && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Patients',    value: patients.length,                                          bg: '#eef3ff', color: '#4361ee' },
            { label: 'Male',              value: patients.filter(p => p.gender === 'Male').length,         bg: '#e8f5f5', color: '#0a6e6e' },
            { label: 'Female',            value: patients.filter(p => p.gender === 'Female').length,       bg: '#fce8f3', color: '#be185d' },
            { label: 'Visited (≥1 appt)', value: patients.filter(p => p.visited_count > 0).length,        bg: '#eaf7ef', color: '#2a9d8f' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 20px', minWidth: 130 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search name, email, phone, blood group…"
          style={{ flex: 1, minWidth: 240, padding: '10px 16px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none' }}
        />
        {['all','Male','Female','Other'].map(g => (
          <button key={g} onClick={() => setGender(g)}
            style={{ padding: '8px 16px', border: `2px solid ${genderFilter === g ? '#0a6e6e' : '#e2e8f0'}`, borderRadius: 10, background: genderFilter === g ? '#0a6e6e' : 'white', color: genderFilter === g ? 'white' : '#718096', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {g === 'all' ? 'All' : GENDER_ICON[g] + ' ' + g}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
          <p>Loading patients…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 16, color: '#a0aec0' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <p style={{ fontSize: 15 }}>{search || genderFilter !== 'all' ? 'No patients match your search.' : 'No patients found. Patients will appear here once they have an appointment with you.'}</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Patient', 'Age / Gender', 'Blood Group', 'Contact', 'Services', 'Appointments', 'Last Visit', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #f0f4f8', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}
                  style={{ borderBottom: '1px solid #f0f4f8', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  {/* Patient name + avatar */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${BLOOD_COLORS[p.blood_group] || '#0a6e6e'},#0d8c8c)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {p.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a202c' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#a0aec0' }}>{p.email}</div>
                      </div>
                    </div>
                  </td>
                  {/* Age / Gender */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 14, color: '#4a5568' }}>
                      {p.age ? `${p.age} yrs` : '—'}
                      {p.gender && <span style={{ marginLeft: 6 }}>{GENDER_ICON[p.gender]} {p.gender}</span>}
                    </div>
                  </td>
                  {/* Blood group */}
                  <td style={{ padding: '14px 16px' }}>
                    {p.blood_group
                      ? <Badge bg={BLOOD_COLORS[p.blood_group] + '22'} color={BLOOD_COLORS[p.blood_group] || '#0a6e6e'}>{p.blood_group}</Badge>
                      : <span style={{ color: '#a0aec0' }}>—</span>}
                  </td>
                  {/* Contact */}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#4a5568' }}>{p.phone || '—'}</td>
                  {/* Services */}
                  <td style={{ padding: '14px 16px', maxWidth: 200 }}>
                    <div style={{ fontSize: 12, color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={p.services}>
                      {p.services || '—'}
                    </div>
                  </td>
                  {/* Total appointments */}
                  <td style={{ padding: '14px 16px' }}>
                    <Badge bg="#eef3ff" color="#4361ee">{p.total_appointments} appt{p.total_appointments !== 1 ? 's' : ''}</Badge>
                  </td>
                  {/* Last visit */}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#718096', whiteSpace: 'nowrap' }}>
                    {p.last_visit ? new Date(p.last_visit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  {/* View button */}
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => openPatient(p)}
                      style={{ padding: '6px 14px', background: '#0a6e6e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', fontSize: 12, color: '#a0aec0', borderTop: '1px solid #f0f4f8' }}>
            Showing {filtered.length} of {patients.length} patient{patients.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* ── Patient Detail Drawer / Modal ── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ width: 520, maxWidth: '95vw', background: 'white', height: '100%', overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#0a6e6e,#064444)', padding: '28px 24px', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
                    {selected.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{selected.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{selected.email}</div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </button>
              </div>
              {/* Quick stats */}
              <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
                {[
                  [selected.age ? `${selected.age} yrs` : '—', 'Age'],
                  [selected.gender || '—', 'Gender'],
                  [selected.blood_group || '—', 'Blood'],
                  [`${selected.total_appointments}`, 'Appointments'],
                ].map(([v, l]) => (
                  <div key={l} style={{ textAlign: 'center', flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 6px' }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{v}</div>
                    <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 24, flex: 1 }}>
              {/* Patient info */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Contact Info</div>
                {[
                  ['📞', 'Phone',   selected.phone   || '—'],
                  ['📧', 'Email',   selected.email   || '—'],
                  ['🏠', 'Address', selected.address || '—'],
                ].map(([icon, label, val]) => (
                  <div key={label} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13 }}>
                    <span>{icon}</span>
                    <span style={{ color: '#718096', minWidth: 60 }}>{label}</span>
                    <span style={{ color: '#1a202c', fontWeight: 500 }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Services */}
              {selected.services && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Services Availed</div>
                  <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.7 }}>{selected.services}</div>
                </div>
              )}

              {/* Appointment history */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Appointment History</div>
                {loadingAppts ? (
                  <p style={{ color: '#a0aec0', fontSize: 13 }}>Loading appointments…</p>
                ) : patientAppts.length === 0 ? (
                  <p style={{ color: '#a0aec0', fontSize: 13 }}>No appointment records found.</p>
                ) : (
                  patientAppts.map(a => {
                    const sc = statusColor[a.status] || { bg: '#f0f4f8', color: '#718096' };
                    return (
                      <div key={a.id} style={{ border: '1.5px solid #f0f4f8', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a202c' }}>
                              {a.appointment_type === 'consultation' ? `👨‍⚕️ Consultation` : `🧪 ${a.package_name || 'Test'}`}
                            </span>
                            <span style={{ marginLeft: 8, fontSize: 11, color: '#0a6e6e', fontWeight: 700 }}>#{a.token_number}</span>
                          </div>
                          <Badge bg={sc.bg} color={sc.color}>{a.status.replace('_', ' ')}</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: '#718096' }}>
                          📅 {new Date(a.appointment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {a.payment_confirmed
                            ? <span style={{ marginLeft: 12, color: '#2a9d8f' }}>✅ Paid ₹{a.payment_amount}</span>
                            : <span style={{ marginLeft: 12, color: '#c47d00' }}>⏳ Pending payment</span>}
                        </div>
                        {a.patient_note && (
                          <div style={{ marginTop: 6, fontSize: 12, color: '#4a5568', background: '#f8fafc', borderRadius: 6, padding: '4px 10px' }}>
                            💬 {a.patient_note}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
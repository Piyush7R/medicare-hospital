import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function QueueManagement() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomQueue, setRoomQueue] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [tab, setTab] = useState('checkin');
  const [msg, setMsg] = useState('');
  const intervalRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  const fetchAll = async () => {
    try {
      const [roomsRes, statsRes, apptRes] = await Promise.all([
        api.get('/queue/rooms'),
        api.get('/queue/live-stats'),
        api.get(`/appointments/all?date=${today}`),
      ]);
      setRooms(roomsRes.data);
      setLiveStats(statsRes.data);
      // Only booked + payment confirmed + not yet checked in
      setAppointments(apptRes.data.filter(a => a.status === 'booked'));
    } catch (err) { console.error(err); }
  };

  const fetchRoomQueue = async (roomId) => {
    try {
      const res = await api.get(`/queue/room/${roomId}`);
      setRoomQueue(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (selectedRoom) fetchRoomQueue(selectedRoom);
  }, [selectedRoom]);

  const handleCompleteTest = async (patient_test_id, patientName) => {
    if (!confirm(`Mark test complete for ${patientName}?`)) return;
    try {
      const res = await api.post('/queue/complete-test', { patient_test_id });
      setMsg(res.data.allDone ? `✅ All tests done for ${patientName}!` : `✅ ${patientName} moved to next room`);
      fetchAll();
      if (selectedRoom) fetchRoomQueue(selectedRoom);
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'Error'));
    }
  };

  // Get the doctor's own room from their profile
  const [doctorRoom, setDoctorRoom] = useState(null);
  useEffect(() => {
    api.get('/auth/profile').then(res => {
      setDoctorRoom(res.data?.profile?.room_number);
    }).catch(() => {});
  }, []);

  // Filter rooms to show doctor's room first, rest after
  const myRooms = rooms.filter(r => doctorRoom && r.name?.includes(doctorRoom.replace('Room ', '')));
  const otherRooms = rooms.filter(r => !myRooms.find(m => m.id === r.id));
  const sortedRooms = [...myRooms, ...otherRooms];

  return (
    <Layout>
      <div className="page-header">
        <h2>Queue Manager</h2>
        <p>Manage patient flow — auto-refreshes every 10 seconds</p>
      </div>

      {msg && (
        <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom:'16px' }}>{msg}</div>
      )}

      {/* Live Stats */}
      {liveStats && (
        <div className="grid-4" style={{ marginBottom:'24px' }}>
          {[
            { icon:'🏥', label:'In Hospital',      value:liveStats.in_hospital,     bg:'#fff8e8', color:'#f0a500' },
            { icon:'⏳', label:'Awaiting Check-in', value:liveStats.pending_checkin, bg:'#eef3ff', color:'#4361ee' },
            { icon:'✅', label:'Completed Today',   value:liveStats.completed_today, bg:'#eaf7ef', color:'#2a9d8f' },
            { icon:'📅', label:'Total Today',       value:liveStats.total_today,     bg:'#e8f5f5', color:'#0a6e6e' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background:s.bg, color:s.color, fontSize:'24px' }}>{s.icon}</div>
              <div className="stat-info"><h3 style={{ color:s.color }}>{s.value}</h3><p>{s.label}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Room Cards — doctor's room highlighted */}
      <div className="card" style={{ marginBottom:'24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <h3 style={{ fontSize:'18px' }}>🏥 Live Room Status</h3>
          {doctorRoom && <span style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>Your room: {doctorRoom}</span>}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'12px' }}>
          {sortedRooms.map(room => {
            const isMyRoom = myRooms.find(m => m.id === room.id);
            return (
              <div
                key={room.id}
                onClick={() => { setSelectedRoom(room.id); setTab('queue'); fetchRoomQueue(room.id); }}
                style={{ border:`2px solid ${selectedRoom===room.id?'#0a6e6e':isMyRoom?'#2a9d8f':'#e2e8f0'}`, background: selectedRoom===room.id?'#f0fafa':isMyRoom?'#f0fffe':'white', borderRadius:'12px', padding:'16px', cursor:'pointer', textAlign:'center', transition:'all 0.2s', position:'relative' }}
              >
                {isMyRoom && <div style={{ position:'absolute', top:'-8px', right:'8px', background:'#0a6e6e', color:'white', fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'20px' }}>YOUR ROOM</div>}
                <div style={{ fontSize:'24px', marginBottom:'6px' }}>🚪</div>
                <div style={{ fontWeight:700, fontSize:'12px', marginBottom:'4px' }}>{room.name?.split(' - ')[0]}</div>
                <div style={{ fontSize:'10px', color:'#718096', marginBottom:'8px' }}>{room.test_type}</div>
                <div style={{ background: room.waiting_count > 0 ? '#fff3cd' : '#eaf7ef', color: room.waiting_count > 0 ? '#856404' : '#2a9d8f', borderRadius:'20px', padding:'3px 8px', fontSize:'12px', fontWeight:700 }}>
                  {room.waiting_count} waiting
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
        {[
          { id:'checkin', label:'✅ Check-in Patients' },
          { id:'queue',   label:'📋 Room Queue' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:'10px 20px', border:`2px solid ${tab===t.id?'#0a6e6e':'#e2e8f0'}`, borderRadius:'8px', background:tab===t.id?'#0a6e6e':'white', cursor:'pointer', fontSize:'14px', fontWeight:500, color:tab===t.id?'white':'#718096', transition:'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Check-in Tab */}
      {tab === 'checkin' && (
        <div className="card">
          <h3 style={{ fontSize:'18px', marginBottom:'16px' }}>Patients Ready for Check-in (Payment Confirmed)</h3>
          {appointments.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'#718096' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
              <p>No patients awaiting check-in</p>
            </div>
          ) : (
            <table>
              <thead><tr><th>Token</th><th>Patient</th><th>Package</th><th>Time</th><th>Payment</th><th>Action</th></tr></thead>
              <tbody>
                {appointments.map(a => (
                  <tr key={a.id}>
                    <td><strong style={{ color:'#0a6e6e', fontSize:'13px' }}>{a.token_number}</strong></td>
                    <td>
                      <div style={{ fontWeight:600 }}>{a.patient_name}</div>
                      <div style={{ color:'#718096', fontSize:'12px' }}>{a.gender && `${a.gender}, `}{a.age && `${a.age} yrs`}</div>
                    </td>
                    <td style={{ fontSize:'13px' }}>{a.package_name}</td>
                    <td style={{ fontSize:'13px', fontWeight:600 }}>{a.appointment_time?.slice(0,5)}</td>
                    <td>{a.payment_confirmed ? <span className="badge badge-success">Paid ✅</span> : <span className="badge badge-warning">⏳ Pending</span>}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={async () => {
                        try {
                          await api.post('/queue/checkin', { appointment_id: a.id });
                          setMsg('✅ Patient checked in!');
                          fetchAll();
                          setTimeout(() => setMsg(''), 3000);
                        } catch (err) { setMsg('❌ ' + (err.response?.data?.message || 'Error')); }
                      }}>
                        Assign Rooms
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Room Queue Tab */}
      {tab === 'queue' && (
        <div className="card">
          {!selectedRoom ? (
            <div style={{ textAlign:'center', padding:'40px', color:'#718096' }}>
              <p>Click a room above to see its queue</p>
            </div>
          ) : !roomQueue ? (
            <div style={{ textAlign:'center', padding:'40px' }}>Loading queue...</div>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                <h3 style={{ fontSize:'18px' }}>Queue — {roomQueue.room?.name}</h3>
                <span style={{ background:'#e8f5f5', color:'#0a6e6e', padding:'4px 12px', borderRadius:'20px', fontSize:'13px', fontWeight:600 }}>
                  {roomQueue.queue?.length || 0} in queue
                </span>
              </div>
              {roomQueue.queue?.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:'#718096' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>🎉</div>
                  <p>Queue is empty for this room</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {roomQueue.queue.map((q, idx) => (
                    <div key={q.id} style={{ display:'flex', alignItems:'center', gap:'16px', padding:'16px', background:idx===0?'#f0fafa':'#f7fafc', borderRadius:'12px', border:idx===0?'2px solid #0a6e6e':'1px solid #e2e8f0' }}>
                      <div style={{ width:'48px', height:'48px', background:idx===0?'#0a6e6e':'#e2e8f0', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:idx===0?'white':'#718096', fontWeight:700, fontSize:'20px', flexShrink:0 }}>
                        #{q.position}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:'15px' }}>{q.patient_name}</div>
                        <div style={{ color:'#718096', fontSize:'13px' }}>Token: {q.token_number} | {q.package_name}</div>
                        <div style={{ color:'#718096', fontSize:'12px' }}>Time: {q.appointment_time?.slice(0,5)}</div>
                      </div>
                      {idx === 0 && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleCompleteTest(q.id, q.patient_name)}>
                          ✓ Complete & Next
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Layout>
  );
}

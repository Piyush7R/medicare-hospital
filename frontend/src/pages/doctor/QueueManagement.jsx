import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function QueueManagement() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [queueData, setQueueData] = useState({ current: null, waiting: [] });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchRooms = async () => {
    try {
      const res = await api.get('/queue/rooms');
      setRooms(res.data);
      
      if (!selectedRoom && res.data.length > 0) {
        const roomWithQueue = res.data.find(r => r.waiting_count > 0 || r.in_progress_count > 0);
        setSelectedRoom(roomWithQueue?.room_id || res.data[0].room_id);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const fetchQueue = async () => {
    if (!selectedRoom) return;
    
    setLoading(true);
    try {
      const res = await api.get(`/queue/room/${selectedRoom}`);
      setQueueData(res.data);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
      setQueueData({ current: null, waiting: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedRoom]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Start service for waiting patient (move to in_progress)
  const handleStartService = async (patient) => {
    setActionLoading(patient.queue_id);
    try {
      await api.patch(`/queue/${patient.queue_id}/start`);
      showMessage(`✅ Started service for ${patient.patient_name}`, 'success');
      fetchQueue();
      fetchRooms();
    } catch (err) {
      showMessage(`❌ ${err.response?.data?.message || 'Failed to start service'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Complete current test and move to next
  const handleCompleteTest = async (patient) => {
    if (!window.confirm(`Complete test for ${patient.patient_name}?\n\nThis will move them to their next test or mark them as done.`)) {
      return;
    }

    setActionLoading(patient.queue_id);
    try {
      const res = await api.post('/queue/complete-test', {
        appointment_id: patient.appointment_id,
        patient_test_id: patient.patient_test_id,
      });
      showMessage(`✅ ${res.data.message}`, 'success');
      setTimeout(() => {
        fetchQueue();
        fetchRooms();
      }, 1000);
    } catch (err) {
      showMessage(`❌ ${err.response?.data?.message || 'Failed to complete test'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const currentRoom = rooms.find(r => r.room_id === selectedRoom);

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0a6e6e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          Live Queue
        </div>
        <h1 style={{ fontSize: 26, fontFamily: "'Playfair Display',serif", color: '#1a202c', margin: '0 0 4px' }}>
          🏥 Queue Management
        </h1>
        <p style={{ color: '#718096', margin: 0, fontSize: 13 }}>
          Manage patient flow across test rooms
        </p>
      </div>

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
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Sidebar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #0a6e6e, #064444)', padding: '16px 18px', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.9 }}>
                Select Room
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
              </div>
            </div>

            {rooms.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🏥</div>
                <div style={{ fontSize: 13 }}>No rooms configured</div>
              </div>
            ) : (
              <div style={{ padding: 8 }}>
                {rooms.map(room => (
                  <div
                    key={room.room_id}
                    onClick={() => setSelectedRoom(room.room_id)}
                    style={{
                      padding: '12px 14px',
                      margin: '4px 0',
                      borderRadius: 10,
                      background: selectedRoom === room.room_id ? '#e8f5f5' : 'transparent',
                      border: selectedRoom === room.room_id ? '2px solid #0a6e6e' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a202c' }}>
                        {room.room_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>
                        {room.test_type || 'General'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {room.in_progress_count > 0 && (
                        <div style={{ background: '#4361ee', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 8 }}>
                          {room.in_progress_count}
                        </div>
                      )}
                      {room.waiting_count > 0 && (
                        <div style={{ background: '#e63946', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 8 }}>
                          {room.waiting_count}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {!selectedRoom ? (
            <div style={{ background: 'white', borderRadius: 16, padding: 60, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
              <div style={{ fontSize: 16, color: '#a0aec0' }}>Select a room to view queue</div>
            </div>
          ) : (
            <>
              {/* Room Header */}
              <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a202c' }}>
                    {currentRoom?.room_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                    {currentRoom?.test_type || 'General Tests'}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#718096' }}>
                  Auto-refreshing every 10s
                </div>
              </div>

              {/* Current Patient */}
              {queueData.current ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    🔴 Currently In Service
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #0a6e6e, #064444)', borderRadius: 16, padding: 20, color: 'white', boxShadow: '0 4px 16px rgba(10,110,110,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>
                          {queueData.current.patient_name}
                        </div>
                        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                          {queueData.current.package_name} · Token: {queueData.current.token_number}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        IN PROGRESS
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>Age</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{queueData.current.age || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>Gender</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{queueData.current.gender || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>Blood Group</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{queueData.current.blood_group || '—'}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCompleteTest(queueData.current)}
                      disabled={actionLoading === queueData.current.queue_id}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: actionLoading === queueData.current.queue_id ? '#a0aec0' : 'white',
                        color: '#0a6e6e',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: actionLoading === queueData.current.queue_id ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.1s'
                      }}
                    >
                      {actionLoading === queueData.current.queue_id ? '⏳ Processing...' : '✅ Complete & Next'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
                  <div style={{ fontSize: 14, color: '#a0aec0' }}>No patient currently in service</div>
                </div>
              )}

              {/* Waiting Queue */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  ⏳ Waiting Queue ({queueData.waiting.length})
                </div>

                {loading ? (
                  <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
                    <div style={{ fontSize: 14, color: '#a0aec0' }}>Loading queue...</div>
                  </div>
                ) : queueData.waiting.length === 0 ? (
                  <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: 14, color: '#a0aec0' }}>No patients waiting</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {queueData.waiting.map((patient, idx) => {
                      const isFirst = idx === 0;
                      const canStart = !queueData.current && isFirst;
                      
                      return (
                        <div
                          key={patient.queue_id}
                          style={{
                            background: 'white',
                            borderRadius: 12,
                            padding: '16px 18px',
                            boxShadow: canStart ? '0 4px 16px rgba(42, 157, 143, 0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
                            border: canStart ? '2px solid #2a9d8f' : '2px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            transition: 'all 0.2s'
                          }}
                        >
                          {/* Position Badge */}
                          <div style={{ 
                            width: 44, 
                            height: 44, 
                            background: canStart ? 'linear-gradient(135deg, #2a9d8f, #0a6e6e)' : 'linear-gradient(135deg, #4361ee, #2945cc)', 
                            borderRadius: 10, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: 'white', 
                            fontWeight: 800, 
                            fontSize: 17, 
                            flexShrink: 0,
                            boxShadow: canStart ? '0 4px 12px rgba(42, 157, 143, 0.4)' : '0 2px 8px rgba(67, 97, 238, 0.3)'
                          }}>
                            #{patient.position}
                          </div>

                          {/* Patient Info */}
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>
                                {patient.patient_name}
                              </div>
                              {canStart && (
                                <span style={{ 
                                  background: '#2a9d8f', 
                                  color: 'white', 
                                  fontSize: 10, 
                                  fontWeight: 700, 
                                  padding: '2px 8px', 
                                  borderRadius: 10,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5
                                }}>
                                  NEXT
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                              {patient.package_name} · Token: {patient.token_number}
                            </div>
                          </div>

                          {/* Patient Details */}
                          <div style={{ display: 'flex', gap: 20, fontSize: 11, color: '#718096', marginRight: 12 }}>
                            <div>
                              <span style={{ opacity: 0.7 }}>Age:</span>{' '}
                              <strong style={{ color: '#1a202c' }}>{patient.age || '—'}</strong>
                            </div>
                            <div>
                              <span style={{ opacity: 0.7 }}>Gender:</span>{' '}
                              <strong style={{ color: '#1a202c' }}>{patient.gender || '—'}</strong>
                            </div>
                            <div>
                              <span style={{ opacity: 0.7 }}>Blood:</span>{' '}
                              <strong style={{ color: '#1a202c' }}>{patient.blood_group || '—'}</strong>
                            </div>
                          </div>

                          {/* Status & Action */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {!canStart ? (
                              <div style={{
                                padding: '6px 14px',
                                background: '#fff8e8',
                                border: '1.5px solid #f0a500',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#856404',
                                whiteSpace: 'nowrap'
                              }}>
                                ⏳ Waiting
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartService(patient)}
                                disabled={actionLoading === patient.queue_id}
                                style={{
                                  padding: '10px 20px',
                                  background: actionLoading === patient.queue_id 
                                    ? '#a0aec0' 
                                    : 'linear-gradient(135deg, #2a9d8f, #0a6e6e)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 10,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  cursor: actionLoading === patient.queue_id ? 'not-allowed' : 'pointer',
                                  whiteSpace: 'nowrap',
                                  boxShadow: actionLoading === patient.queue_id 
                                    ? 'none' 
                                    : '0 4px 12px rgba(42, 157, 143, 0.3)',
                                  transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                  if (!actionLoading) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 16px rgba(42, 157, 143, 0.4)';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.transform = 'translateY(0)';
                                  e.target.style.boxShadow = '0 4px 12px rgba(42, 157, 143, 0.3)';
                                }}
                              >
                                {actionLoading === patient.queue_id ? '⏳ Starting...' : '▶ Start Service'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
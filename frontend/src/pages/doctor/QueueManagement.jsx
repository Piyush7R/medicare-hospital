import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

const ROOMS = [
  { id: 3, name: 'Room 3 – ECG & Cardiac', color: '#e63946' },
  { id: 4, name: 'Room 4 – Gynaecology', color: '#f77f00' },
  { id: 5, name: 'Room 5 – Liver / Kidney', color: '#06a77d' },
  { id: 6, name: 'Room 6 – Blood Collection', color: '#4361ee' },
  { id: 7, name: 'Room 7 – Radiology', color: '#7209b7' },
  { id: 8, name: 'Room 8 – Vitals & Specialty', color: '#2a9d8f' },
];

export default function QueueManagement() {
  const [selectedRoomId, setSelectedRoomId] = useState(3);
  const [roomQueue, setRoomQueue] = useState({ room: null, queue: [] });
  const [allRooms, setAllRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRoomQueue();
    fetchAllRooms();
    const interval = setInterval(() => {
      fetchRoomQueue();
      fetchAllRooms();
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [selectedRoomId]);

  const fetchRoomQueue = async () => {
    try {
      const res = await api.get(`/queue/room/${selectedRoomId}`);
      setRoomQueue(res.data);
    } catch (err) {
      console.error('Failed to fetch room queue:', err);
    }
  };

  const fetchAllRooms = async () => {
    try {
      const res = await api.get('/queue/rooms');
      setAllRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch all rooms:', err);
    }
  };

  const handleCompleteTest = async (patient) => {
    if (!window.confirm(`Mark ${patient.patient_name}'s test as completed and move to next step?`)) {
      return;
    }

    setCompleting(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/queue/complete-test', {
        appointment_id: patient.appointment_id,
        // patient_test_id is optional - backend will find current in-progress test
      });

      if (res.data.message) {
        setSuccess(res.data.message);
      }

      // Refresh the queue
      await fetchRoomQueue();
      await fetchAllRooms();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete test');
      setTimeout(() => setError(''), 5000);
    } finally {
      setCompleting(false);
    }
  };

  const selectedRoom = ROOMS.find(r => r.id === selectedRoomId);
  const currentPatient = roomQueue.queue.find(p => p.status === 'in_progress');
  const waitingPatients = roomQueue.queue.filter(p => p.status === 'waiting');

  return (
    <Layout>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#4361ee', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
          Live Queue
        </div>
        <h1 style={{ fontSize: '30px', fontFamily: "'Playfair Display',serif", color: '#1a202c', margin: '0 0 4px' }}>
          🏥 Queue Management
        </h1>
        <p style={{ color: '#718096', margin: 0, fontSize: '14px' }}>
          Manage patient flow across test rooms
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{ 
          background: '#eaf7ef', 
          border: '2px solid #2a9d8f', 
          borderRadius: '12px', 
          padding: '14px 18px', 
          color: '#1a6e3c', 
          fontSize: '14px', 
          fontWeight: 600, 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          {success}
        </div>
      )}

      {error && (
        <div style={{ 
          background: '#fff5f5', 
          border: '2px solid #fed7d7', 
          borderRadius: '12px', 
          padding: '14px 18px', 
          color: '#c53030', 
          fontSize: '14px', 
          fontWeight: 600, 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>❌</span>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Sidebar - Room Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Room Selector */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
              Select Room
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ROOMS.map(room => {
                const roomData = allRooms.find(r => r.id === room.id);
                const waitingCount = roomData?.waiting_count || 0;
                const inProgressCount = roomData?.in_progress_count || 0;

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    style={{
                      padding: '14px 16px',
                      border: `2px solid ${selectedRoomId === room.id ? room.color : '#e2e8f0'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: selectedRoomId === room.id ? `${room.color}10` : 'white',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: '14px', 
                      color: selectedRoomId === room.id ? room.color : '#1a202c',
                      marginBottom: '6px'
                    }}>
                      {room.name}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                      <span style={{ 
                        background: '#fff8e8', 
                        color: '#b86e00', 
                        padding: '2px 8px', 
                        borderRadius: '20px', 
                        fontWeight: 600 
                      }}>
                        {waitingCount} waiting
                      </span>
                      {inProgressCount > 0 && (
                        <span style={{ 
                          background: '#f0f2ff', 
                          color: '#4361ee', 
                          padding: '2px 8px', 
                          borderRadius: '20px', 
                          fontWeight: 600 
                        }}>
                          {inProgressCount} in progress
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content - Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Room Header */}
          <div style={{ 
            background: `linear-gradient(135deg, ${selectedRoom?.color}, ${selectedRoom?.color}dd)`, 
            borderRadius: '16px', 
            padding: '24px 28px',
            color: 'white'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Currently Viewing</div>
            <h2 style={{ fontSize: '26px', margin: '0 0 8px', fontWeight: 800 }}>{selectedRoom?.name}</h2>
            <div style={{ fontSize: '14px', opacity: 0.85 }}>
              {waitingPatients.length} patients in queue
              {currentPatient && ' · 1 in progress'}
            </div>
          </div>

          {/* Current Patient (In Progress) */}
          {currentPatient && (
            <div style={{ 
              background: 'linear-gradient(135deg, #eaf7ef, #d4f4ea)', 
              borderRadius: '16px', 
              padding: '24px 28px',
              border: '3px solid #2a9d8f'
            }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 700, 
                color: '#1a6e3c', 
                textTransform: 'uppercase', 
                letterSpacing: '1px', 
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: '#2a9d8f', 
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }} />
                Currently In Service
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      background: 'linear-gradient(135deg, #2a9d8f, #0a6e6e)', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontSize: '24px', 
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {currentPatient.patient_name?.[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#1a202c', marginBottom: '2px' }}>
                        {currentPatient.patient_name}
                      </div>
                      <div style={{ color: '#718096', fontSize: '13px' }}>
                        Token: <span style={{ 
                          background: '#0a6e6e', 
                          color: 'white', 
                          padding: '2px 10px', 
                          borderRadius: '20px', 
                          fontWeight: 700,
                          fontSize: '12px'
                        }}>
                          {currentPatient.token_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    background: 'white', 
                    borderRadius: '10px', 
                    padding: '12px 16px', 
                    fontSize: '13px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px'
                  }}>
                    <div>
                      <span style={{ color: '#a0aec0', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        Package
                      </span>
                      <strong style={{ color: '#1a202c' }}>
                        {currentPatient.package_name || 'Consultation'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#a0aec0', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        Time
                      </span>
                      <strong style={{ color: '#1a202c' }}>
                        {currentPatient.appointment_time || '07:00'}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleCompleteTest(currentPatient)}
                  disabled={completing}
                  style={{
                    padding: '14px 28px',
                    background: completing ? '#a0aec0' : 'linear-gradient(135deg, #2a9d8f, #0a6e6e)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: completing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    marginLeft: '20px'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>✅</span>
                  {completing ? 'Processing...' : 'Complete & Next'}
                </button>
              </div>
            </div>
          )}

          {/* Waiting Queue */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f0f4f8'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Waiting Queue
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#1a202c', marginTop: '4px' }}>
                  {waitingPatients.length} Patient{waitingPatients.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={() => {
                  fetchRoomQueue();
                  fetchAllRooms();
                }}
                style={{
                  padding: '10px 18px',
                  background: '#f0f2ff',
                  border: '2px solid #4361ee',
                  borderRadius: '10px',
                  color: '#4361ee',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🔄</span> Refresh
              </button>
            </div>

            {waitingPatients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aec0' }}>
                <div style={{ fontSize: '56px', marginBottom: '12px', opacity: 0.3 }}>👥</div>
                <p style={{ fontSize: '15px', margin: 0 }}>No patients waiting in queue</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {waitingPatients.map((patient, index) => (
                  <div
                    key={patient.id}
                    style={{
                      padding: '16px 20px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = selectedRoom?.color;
                      e.currentTarget.style.background = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    {/* Position Badge */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: `linear-gradient(135deg, ${selectedRoom?.color}, ${selectedRoom?.color}dd)`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '18px',
                      flexShrink: 0
                    }}>
                      #{index + 1}
                    </div>

                    {/* Patient Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: '#1a202c', marginBottom: '4px' }}>
                        {patient.patient_name}
                      </div>
                      <div style={{ color: '#718096', fontSize: '13px' }}>
                        {patient.package_name || 'Consultation'} · Token: {patient.token_number}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div style={{
                      background: '#fff8e8',
                      color: '#b86e00',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      Waiting
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Layout>
  );
}
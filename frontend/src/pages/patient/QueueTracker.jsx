import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function QueueTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchQueue = async () => {
    try {
      const res = await api.get('/queue/my');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 15 seconds
    intervalRef.current = setInterval(fetchQueue, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading) return <Layout><div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div></Layout>;

  if (!data?.active) return (
    <Layout>
      <div className="page-header"><h2>Queue Tracker</h2><p>Track your real-time position in the hospital</p></div>
      <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '72px', marginBottom: '20px' }}>🏥</div>
        <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>No Active Visit Today</h3>
        <p style={{ color: '#718096' }}>Your queue tracker will activate once you check in at the hospital today.</p>
      </div>
    </Layout>
  );

  const { appointment, tests = [], currentTest, queuePosition } = data;
  const completedTests = tests.filter(t => t.status === 'completed').length;
  const totalTests = tests.length;
  const progressPct = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

  const statusStyle = {
    completed: { bg: '#eaf7ef', color: '#2a9d8f', icon: '✅' },
    in_progress: { bg: '#fff8e8', color: '#f0a500', icon: '⚡' },
    in_queue: { bg: '#e8f0ff', color: '#4361ee', icon: '⏳' },
    pending: { bg: '#f7fafc', color: '#718096', icon: '⭕' },
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>🔴 Live Queue Tracker</h2>
        <p>Auto-refreshing every 15 seconds — stay on this page to get updates</p>
      </div>

      {/* Token Card */}
      <div style={{ background: 'linear-gradient(135deg,#0a6e6e,#075252)', borderRadius: '16px', padding: '28px', color: 'white', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ opacity: 0.7, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Your Token Number</div>
          <div style={{ fontSize: '48px', fontWeight: 700, letterSpacing: '4px' }}>{appointment.token_number}</div>
          <div style={{ opacity: 0.7, marginTop: '8px' }}>{appointment.package_name}</div>
        </div>
        {queuePosition && (
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: '16px', padding: '20px 32px' }}>
            <div style={{ opacity: 0.7, fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Queue Position</div>
            <div style={{ fontSize: '52px', fontWeight: 700, lineHeight: 1 }}>#{queuePosition}</div>
            <div style={{ opacity: 0.7, fontSize: '12px', marginTop: '6px' }}>in current room</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontWeight: 600 }}>Overall Progress</span>
          <span style={{ color: '#0a6e6e', fontWeight: 700 }}>{completedTests}/{totalTests} tests completed</span>
        </div>
        <div style={{ height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,#0a6e6e,#2a9d8f)', borderRadius: '6px', transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ marginTop: '8px', fontSize: '13px', color: '#718096' }}>{Math.round(progressPct)}% complete</div>
      </div>

      {/* Test Workflow */}
      <div className="card">
        <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Your Test Journey</h3>
        <div style={{ position: 'relative' }}>
          {tests.map((test, idx) => {
            const s = statusStyle[test.status] || statusStyle.pending;
            const isActive = test.status === 'in_queue' || test.status === 'in_progress';
            return (
              <div key={test.id} style={{ display: 'flex', gap: '16px', marginBottom: idx < tests.length - 1 ? '0' : '0', position: 'relative' }}>
                {/* Line */}
                {idx < tests.length - 1 && (
                  <div style={{ position: 'absolute', left: '19px', top: '40px', width: '2px', height: '40px', background: test.status === 'completed' ? '#2a9d8f' : '#e2e8f0', zIndex: 0 }} />
                )}
                {/* Circle */}
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: s.bg, border: `2px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, zIndex: 1, boxShadow: isActive ? `0 0 0 4px ${s.bg}` : 'none', animation: isActive ? 'pulse 2s infinite' : 'none' }}>
                  {s.icon}
                </div>
                <div style={{ flex: 1, paddingBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{test.room_name}</span>
                    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{test.status.replace('_', ' ')}</span>
                    {isActive && <span style={{ background: '#e63946', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, animation: 'blink 1s infinite' }}>CURRENT</span>}
                  </div>
                  <div style={{ color: '#718096', fontSize: '13px' }}>{test.test_type}</div>
                  {test.completed_at && <div style={{ color: '#2a9d8f', fontSize: '12px', marginTop: '4px' }}>✓ Completed at {new Date(test.completed_at).toLocaleTimeString()}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </Layout>
  );
}

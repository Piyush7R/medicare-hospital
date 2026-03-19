import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';

export default function QueueTracker() {
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected]         = useState(null); // selected appointment
  const [progress, setProgress]         = useState([]);   // test steps with status
  const [loading, setLoading]           = useState(true);
  const [updating, setUpdating]         = useState(null); // step id being updated
  const [hasReport, setHasReport]       = useState(false); // whether a report is uploaded
  const intervalRef = useRef();

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments/my');
      // Include completed so patients can review their finished tests
      const active = res.data.filter(a => ['booked','checked_in','in_progress','completed'].includes(a.status));
      setAppointments(active);
      if (active.length > 0 && !selected) {
        // Prefer an active one first, fall back to most recent completed
        const preferred = active.find(a => ['checked_in','in_progress'].includes(a.status)) || active[0];
        setSelected(preferred);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchProgress = async (appt) => {
    if (!appt) return;
    try {
      const res = await api.get(`/appointments/${appt.id}/test-progress`);
      setProgress(res.data);
    } catch (err) {
      // No multi-step data — build a single-step fallback
      setProgress([{
        id: null,
        step_number: 1,
        test_name: appt.package_name || appt.appointment_type,
        room_number: appt.test_room_number || appt.doctor_room || 'Reception',
        duration_minutes: (appt.duration_hours || 1) * 60,
        pre_requirements: appt.pre_requirements || null,
        status: appt.status === 'completed' ? 'completed' : appt.payment_confirmed ? 'in_progress' : 'pending',
        started_at: null,
        completed_at: null,
      }]);
    }
  };

  const fetchReport = async (appt) => {
    if (!appt) { setHasReport(false); return; }
    try {
      const res = await api.get(`/appointments/${appt.id}/report`);
      // Tick only if an actual report file exists
      setHasReport(!!(res.data?.report_url || res.data?.file_path || res.data?.id));
    } catch {
      setHasReport(false); // 404 means no report uploaded yet
    }
  };

  useEffect(() => {
    fetchAppointments();
    intervalRef.current = setInterval(fetchAppointments, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (selected) {
      fetchProgress(selected);
      fetchReport(selected);
    }
  }, [selected]);

  const handleStepAction = async (step, action) => {
    if (!step.id) return; // fallback single-step has no DB record
    setUpdating(step.id);
    try {
      await api.post(`/appointments/test-progress/${step.id}/${action}`);
      await fetchProgress(selected);
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  // Derived stats
  const totalSteps     = progress.length;
  const completedSteps = progress.filter(s => s.status === 'completed').length;
  const progressPct    = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const currentStep    = progress.find(s => s.status === 'in_progress') || progress.find(s => s.status === 'pending');

  // Overall journey stages
  const stages = [
    { key:'registration', label:'Registration', done: selected?.payment_confirmed },
    { key:'tests',        label:'Tests',         done: completedSteps > 0 },
    { key:'completed',    label:'Completed',     done: completedSteps === totalSteps && totalSteps > 0 },
    { key:'report',       label:'Report Ready',  done: hasReport }, // only tick when report actually uploaded
  ];

  if (loading) return <Layout><div style={{ textAlign:'center', padding:60 }}>Loading...</div></Layout>;

  if (appointments.length === 0) return (
    <Layout>
      <div style={{ textAlign:'center', padding:80, color:'#718096' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>📋</div>
        <h3>No appointments yet</h3>
        <p style={{ fontSize:14 }}>Book an appointment to track your test progress here.</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ maxWidth:960, margin:'0 auto' }}>
        <div className="page-header">
          <h2>My Check-up Progress</h2>
          <p>Follow the steps below — complete each test in order</p>
        </div>

        {/* Appointment selector */}
        {appointments.length > 1 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Select Appointment</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {appointments.map(a => {
                const isComp = a.status === 'completed';
                const isSel  = selected?.id === a.id;
                return (
                  <div key={a.id} onClick={() => setSelected(a)}
                    style={{ border:`2px solid ${isSel ? '#0a6e6e' : '#e2e8f0'}`, background:isSel?'#f0fafa':'white', borderRadius:10, padding:'10px 16px', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:isComp?'#2a9d8f':a.status==='in_progress'?'#f0a500':'#4361ee', display:'inline-block', flexShrink:0 }} />
                    <span>{a.token_number} — {a.package_name || 'Consultation'}</span>
                    <span style={{ fontSize:11, color:isComp?'#2a9d8f':'#a0aec0', fontWeight:500 }}>{isComp ? '✅ Done' : a.status.replace('_',' ')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selected && (
          <>
            {/* ── OVERALL JOURNEY PROGRESS BAR ── */}
            <div style={{ background:'white', borderRadius:16, padding:'24px 32px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)', marginBottom:20 }}>
              <h3 style={{ margin:'0 0 24px', fontSize:16, fontWeight:700 }}>Check-up Progress</h3>

              <div style={{ position:'relative' }}>
                {/* Connecting line */}
                <div style={{ position:'absolute', top:20, left:'12.5%', right:'12.5%', height:3, background:'#e2e8f0', zIndex:0 }} />
                <div style={{ position:'absolute', top:20, left:'12.5%', width:`${Math.min(progressPct, 100) * 0.75}%`, height:3, background:'#0a6e6e', zIndex:1, transition:'width 0.6s ease' }} />

                {/* Stage nodes */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', position:'relative', zIndex:2 }}>
                  {stages.map((stage, i) => (
                    <div key={stage.key} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:42, height:42, borderRadius:'50%',
                        background: stage.done ? '#0a6e6e' : i === stages.findIndex(s => !s.done) ? 'white' : 'white',
                        border: `3px solid ${stage.done ? '#0a6e6e' : '#e2e8f0'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:18, boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
                        transition:'all 0.4s',
                      }}>
                        {stage.done
                          ? <span style={{ color:'white', fontSize:20 }}>✓</span>
                          : <span style={{ fontSize:16 }}>🕐</span>
                        }
                      </div>
                      <span style={{ fontSize:12, fontWeight:600, color:stage.done?'#0a6e6e':'#a0aec0', textAlign:'center' }}>{stage.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Token + overall progress */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
              <div style={{ background:'linear-gradient(135deg,#0a6e6e,#064444)', borderRadius:14, padding:'18px 22px', color:'white' }}>
                <div style={{ fontSize:12, opacity:0.8, marginBottom:4, textTransform:'uppercase', letterSpacing:1 }}>Token</div>
                <div style={{ fontSize:28, fontWeight:800, letterSpacing:3 }}>{selected.token_number}</div>
                <div style={{ fontSize:12, opacity:0.75, marginTop:4 }}>
                  {selected.package_name || 'Consultation'} · {new Date(selected.appointment_date).toDateString()}
                </div>
              </div>
              <div style={{ background:'white', borderRadius:14, padding:'18px 22px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Overall Progress</div>
                <div style={{ fontSize:28, fontWeight:800, color:'#0a6e6e', marginBottom:8 }}>{progressPct}%</div>
                <div style={{ height:8, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${progressPct}%`, background: progressPct===100?'#2a9d8f':'#0a6e6e', borderRadius:4, transition:'width 0.5s' }} />
                </div>
                <div style={{ fontSize:12, color:'#718096', marginTop:8 }}>{completedSteps} of {totalSteps} steps complete</div>
              </div>
            </div>

            {/* ── GUIDED TEST FLOW ── */}
            {totalSteps > 1 && (
              <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin:'0 0 6px', fontSize:16, fontWeight:700 }}>Guided Test Flow</h3>
                <p style={{ margin:'0 0 20px', fontSize:13, color:'#718096' }}>Complete each step in order — follow the room numbers</p>

                <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:24 }}>

                  {/* Left: Step list */}
                  <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                    {progress.map((step, idx) => {
                      const isActive    = step.status === 'in_progress';
                      const isDone      = step.status === 'completed';
                      const isNext      = !isDone && !isActive && progress.slice(0, idx).every(s => s.status === 'completed');
                      return (
                        <div key={step.id || idx} style={{ display:'flex', gap:0, position:'relative' }}>
                          {/* Connector line */}
                          {idx < progress.length - 1 && (
                            <div style={{ position:'absolute', left:19, top:44, bottom:-8, width:2, background: isDone?'#0a6e6e':'#e2e8f0', zIndex:0 }} />
                          )}

                          {/* Step icon */}
                          <div style={{ flexShrink:0, width:40, height:40, borderRadius:'50%', background: isDone?'#0a6e6e': isActive?'#2a9d8f':'white', border:`2.5px solid ${isDone?'#0a6e6e':isActive?'#2a9d8f':isNext?'#a0aec0':'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1, boxShadow:isActive?'0 0 0 4px rgba(42,157,143,0.2)':'' }}>
                            {isDone
                              ? <span style={{ color:'white', fontSize:16 }}>✓</span>
                              : isActive
                                ? <span style={{ fontSize:16 }}>▶</span>
                                : <span style={{ fontSize:12 }}>🕐</span>
                            }
                          </div>

                          {/* Step label */}
                          <div style={{ paddingLeft:10, paddingBottom:24, paddingTop:8 }}>
                            <div style={{ fontWeight:700, fontSize:13, color:isDone?'#0a6e6e':isActive?'#1a202c':'#a0aec0' }}>
                              {step.test_name}
                            </div>
                            <div style={{ fontSize:11, color:'#a0aec0', display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                              <span>📍</span> {step.room_number}
                            </div>
                            {step.pre_requirements && !isDone && (
                              <div style={{ fontSize:10, color:'#e63946', marginTop:3 }}>
                                ⚠️ {step.pre_requirements.slice(0, 30)}…
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: Step detail cards */}
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {progress.map((step, idx) => {
                      const isActive = step.status === 'in_progress';
                      const isDone   = step.status === 'completed';
                      const canStart = !isDone && !isActive && progress.slice(0, idx).every(s => s.status === 'completed');
                      const isLocked = !isDone && !isActive && !canStart;

                      return (
                        <div key={step.id || idx} style={{
                          border:`2px solid ${isActive?'#2a9d8f':isDone?'#2a9d8f':'#f0f4f8'}`,
                          borderRadius:14,
                          padding:'18px 20px',
                          background:isActive?'#f0fffe':isDone?'#f0fff8':'white',
                          opacity:isLocked?0.45:1,
                          transition:'all 0.3s',
                        }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                            <div>
                              <h4 style={{ margin:'0 0 4px', fontSize:16, fontWeight:700, color:'#1a202c' }}>
                                {step.test_name}
                              </h4>
                              <div style={{ fontSize:13, color:'#4a5568' }}>
                                Room: <strong style={{ color:'#1a202c' }}>{step.room_number}</strong>
                                {step.duration_minutes && <> · Duration: <strong>{step.duration_minutes} mins</strong></>}
                              </div>
                            </div>
                            <span style={{
                              padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700,
                              background: isDone?'#2a9d8f':isActive?'#0a6e6e':canStart?'#f0a500':'#e2e8f0',
                              color: isDone?'white':isActive?'white':canStart?'white':'#a0aec0',
                            }}>
                              {isDone ? '✅ Completed' : isActive ? '▶ In Progress' : canStart ? '⏩ Up Next' : '⏳ Pending'}
                            </span>
                          </div>

                          {step.pre_requirements && (
                            <div style={{ background: isDone?'#f0fff8':'#fff8e8', border:`1.5px solid ${isDone?'#2a9d8f':'#f0a500'}`, borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12, color:isDone?'#1a6e3c':'#856404', display:'flex', gap:8, alignItems:'flex-start' }}>
                              <span>{isDone ? 'ℹ️' : '⚠️'}</span>
                              <span>{step.pre_requirements}</span>
                            </div>
                          )}

                          {/* Action buttons */}
                          {step.id && !isDone && (
                            <div style={{ display:'flex', gap:10, marginTop:8 }}>
                              {!isActive && canStart && (
                                <button
                                  onClick={() => handleStepAction(step, 'start')}
                                  disabled={!!updating}
                                  style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', background:'linear-gradient(135deg,#0a6e6e,#064444)', color:'white', border:'none', borderRadius:9, cursor:'pointer', fontWeight:700, fontSize:13, opacity:updating?0.6:1 }}>
                                  ▶ Start Test
                                </button>
                              )}
                              {isActive && (
                                <button
                                  onClick={() => handleStepAction(step, 'complete')}
                                  disabled={!!updating}
                                  style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', background:'linear-gradient(135deg,#2a9d8f,#1a6e3c)', color:'white', border:'none', borderRadius:9, cursor:'pointer', fontWeight:700, fontSize:13, opacity:updating?0.6:1 }}>
                                  ✓ Mark Complete
                                </button>
                              )}
                            </div>
                          )}

                          {/* Completed / status footer */}
                          {isDone ? (
                            <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#eaf7ef', borderRadius:8 }}>
                              <span style={{ fontSize:16 }}>✅</span>
                              <div>
                                <div style={{ fontSize:12, fontWeight:700, color:'#1a6e3c' }}>Test Completed</div>
                                {step.completed_at && (
                                  <div style={{ fontSize:11, color:'#2a9d8f', marginTop:1 }}>
                                    at {new Date(step.completed_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop:8, fontSize:11, color:'#cbd5e0' }}>Test #{idx + 1}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All done */}
                {completedSteps === totalSteps && totalSteps > 0 && (
                  <div style={{ marginTop:20, background: hasReport ? 'linear-gradient(135deg,#2a9d8f,#0a6e6e)' : 'linear-gradient(135deg,#4361ee,#2a4dd0)', borderRadius:14, padding:'20px 24px', color:'white', textAlign:'center' }}>
                    <div style={{ fontSize:36, marginBottom:8 }}>{hasReport ? '🎉' : '⏳'}</div>
                    <div style={{ fontWeight:800, fontSize:18, marginBottom:4 }}>
                      {hasReport ? 'All Tests Done — Report Ready!' : 'All Tests Completed!'}
                    </div>
                    <div style={{ fontSize:13, opacity:0.85 }}>
                      {hasReport
                        ? 'Your report has been uploaded. Go to My Reports to view and download it.'
                        : 'Your report is being prepared. You will be notified once it is uploaded.'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Single step view (consultation or simple test) */}
            {totalSteps === 1 && (
              <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin:'0 0 16px', fontSize:16, fontWeight:700 }}>Appointment Status</h3>
                <div style={{ border:'2px solid #0a6e6e', borderRadius:14, padding:20, background:'#f0fafa' }}>
                  <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>{progress[0]?.test_name}</div>
                  <div style={{ fontSize:13, color:'#718096' }}>Room: <strong>{progress[0]?.room_number}</strong></div>
                  <div style={{ marginTop:12 }}>
                    <span style={{
                      padding:'5px 14px', borderRadius:20, fontSize:13, fontWeight:700,
                      background: progress[0]?.status==='completed'?'#eaf7ef':'#e8f5f5',
                      color: progress[0]?.status==='completed'?'#2a9d8f':'#0a6e6e',
                    }}>
                      {progress[0]?.status==='completed' ? '✅ Completed' : '⏳ In Progress'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
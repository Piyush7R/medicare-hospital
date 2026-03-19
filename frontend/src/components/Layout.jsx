import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const patientNav = [
  { path:'/patient/dashboard',    icon:'🏠', label:'Dashboard' },
  { path:'/patient/appointments', icon:'📅', label:'My Appointments' },
  { path:'/patient/book',         icon:'➕', label:'Book Appointment' },
  { path:'/patient/track',        icon:'📍', label:'Track My Tests', badge:'LIVE' },
  { path:'/patient/reports',      icon:'📋', label:'My Reports' },
  { path:'/patient/feedback',     icon:'⭐', label:'Feedback' },
  { path:'/patient/profile',      icon:'👤', label:'Profile' },
];
const doctorNav = [
  { path:'/doctor/dashboard',    icon:'📊', label:'Live Dashboard', badge:'LIVE' },
  { path:'/doctor/appointments', icon:'📅', label:'Appointments' },
  { path:'/doctor/queue',        icon:'🏥', label:'Queue Manager' },
  { path:'/doctor/patients',     icon:'👥', label:'Patients' },
  { path:'/doctor/reports',      icon:'📋', label:'Reports' },
  { path:'/doctor/profile',      icon:'👨‍⚕️', label:'Profile' },
];
const receptionNav = [
  { path:'/reception/dashboard', icon:'🖥️',  label:'Overview',          badge:'LIVE' },
  { path:'/reception/payment',   icon:'💳',  label:'Payment & Check-in' },
  { path:'/reception/reports',   icon:'📋',  label:'Upload Reports' },
  { path:'/reception/profile',   icon:'👤',  label:'Profile' },
];
const adminNav = [
  { path:'/admin/dashboard',  icon:'📊', label:'Overview' },
  { path:'/admin/analytics',  icon:'📈', label:'Analytics', badge:'NEW' },
  { path:'/admin/doctors',    icon:'👨‍⚕️', label:'Doctors' },
  { path:'/admin/patients',   icon:'👥', label:'Patients' },
  { path:'/admin/packages',   icon:'🧪', label:'Test Packages' },
  { path:'/admin/profile',    icon:'👤', label:'Profile' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getNav = () => {
    if (user?.role === 'admin')     return adminNav;
    if (user?.role === 'reception') return receptionNav;
    if (user?.role === 'doctor')    return doctorNav;
    return patientNav;
  };

  const portalLabel = {
    admin:'Admin Panel', reception:'Reception Desk', doctor:'Doctor Portal', patient:'Patient Portal'
  }[user?.role] || 'Portal';

  const sidebarColor = {
    admin:'linear-gradient(180deg,#1a1a2e 0%,#16213e 100%)',
    reception:'linear-gradient(180deg,#0a6e6e 0%,#064444 100%)',
    doctor:'linear-gradient(180deg,#0a6e6e 0%,#064444 100%)',
    patient:'linear-gradient(180deg,#0a6e6e 0%,#064444 100%)'
  }[user?.role];

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <aside style={{ width:'260px', background:sidebarColor, display:'flex', flexDirection:'column', padding:'24px 16px', position:'fixed', top:0, left:0, bottom:0, zIndex:100, overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'28px', padding:'0 8px' }}>
          <span style={{ fontSize:'32px' }}>🏥</span>
          <div>
            <div style={{ color:'white', fontFamily:"'Playfair Display',serif", fontSize:'20px', fontWeight:700 }}>MediCare</div>
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px' }}>{portalLabel}</div>
          </div>
        </div>

        <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'14px', display:'flex', alignItems:'center', gap:'12px', marginBottom:'28px' }}>
          <div style={{ width:'40px', height:'40px', background: user?.role==='admin'?'#e63946':'#f0a500', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'16px', flexShrink:0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ color:'white', fontWeight:600, fontSize:'14px' }}>{user?.name}</div>
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'12px', textTransform:'capitalize' }}>{user?.role}</div>
          </div>
        </div>

        <nav style={{ display:'flex', flexDirection:'column', gap:'4px', flex:1 }}>
          {getNav().map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderRadius:'10px', color:isActive?'white':'rgba(255,255,255,0.8)', textDecoration:'none', fontSize:'14px', fontWeight:isActive?600:500, background:isActive?'rgba(255,255,255,0.2)':'transparent', transition:'all 0.2s', justifyContent:'space-between' }}>
                <span style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <span style={{ fontSize:'18px', width:'22px', textAlign:'center' }}>{item.icon}</span>
                  {item.label}
                </span>
                {item.badge && (
                  <span style={{ background: item.badge === 'NEW' ? '#f0a500' : '#e63946', color:'white', fontSize:'9px', fontWeight:700, padding:'2px 6px', borderRadius:'20px' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <button onClick={() => { logout(); navigate('/login'); }}
          style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'rgba(255,255,255,0.8)', padding:'12px 14px', borderRadius:'10px', cursor:'pointer', fontSize:'14px', textAlign:'left', display:'flex', alignItems:'center', gap:'10px', marginTop:'16px' }}>
          🚪 Logout
        </button>
      </aside>

      <main style={{ flex:1, marginLeft:'260px', background:'#f0f4f8', minHeight:'100vh' }}>
        <div style={{ padding:'36px' }}>{children}</div>
      </main>
    </div>
  );
}
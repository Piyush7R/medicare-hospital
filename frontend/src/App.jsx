import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login    from './pages/Login';
import Register from './pages/Register';

// Patient
import PatientDashboard    from './pages/patient/PatientDashboard';
import PatientAppointments from './pages/patient/PatientAppointments';
import BookAppointment     from './pages/patient/BookAppointment';
import PatientReports      from './pages/patient/PatientReports';
import PatientFeedback     from './pages/patient/PatientFeedback';
import QueueTracker        from './pages/patient/QueueTracker';

// Doctor
import LiveDashboard       from './pages/doctor/LiveDashboard';
import DoctorAppointments  from './pages/doctor/DoctorAppointments';
import DoctorPatients      from './pages/doctor/DoctorPatients';
import DoctorReports       from './pages/doctor/DoctorReports';
import QueueManagement     from './pages/doctor/QueueManagement';

// Reception
import ReceptionOverview   from './pages/reception/ReceptionOverview';
import ReceptionPayment    from './pages/reception/ReceptionPayment';
import ReceptionReports    from './pages/reception/ReceptionReports';

// Admin
import AdminDashboard      from './pages/admin/AdminDashboard';
import AdminDoctors        from './pages/admin/AdminDoctors';
import AdminPatients       from './pages/admin/AdminPatients';
import AdminPackages       from './pages/admin/AdminPackages';
import AdminAnalytics      from './pages/admin/AdminAnalytics';

// Shared
import Profile from './pages/shared/Profile';

const getHome = (role) => {
  if (role === 'patient')   return '/patient/dashboard';
  if (role === 'reception') return '/reception/dashboard';
  if (role === 'admin')     return '/admin/dashboard';
  return '/doctor/dashboard';
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#718096' }}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={getHome(user.role)} />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  const home = user ? getHome(user.role) : '/login';
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login"    element={user ? <Navigate to={home} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={home} /> : <Register />} />

      {/* Patient */}
      <Route path="/patient/dashboard"    element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
      <Route path="/patient/appointments" element={<ProtectedRoute allowedRoles={['patient']}><PatientAppointments /></ProtectedRoute>} />
      <Route path="/patient/book"         element={<ProtectedRoute allowedRoles={['patient']}><BookAppointment /></ProtectedRoute>} />
      <Route path="/patient/reports"      element={<ProtectedRoute allowedRoles={['patient']}><PatientReports /></ProtectedRoute>} />
      <Route path="/patient/feedback"     element={<ProtectedRoute allowedRoles={['patient']}><PatientFeedback /></ProtectedRoute>} />
      <Route path="/patient/track"        element={<ProtectedRoute allowedRoles={['patient']}><QueueTracker /></ProtectedRoute>} />
      <Route path="/patient/profile"      element={<ProtectedRoute allowedRoles={['patient']}><Profile /></ProtectedRoute>} />

      {/* Doctor */}
      <Route path="/doctor/dashboard"    element={<ProtectedRoute allowedRoles={['doctor']}><LiveDashboard /></ProtectedRoute>} />
      <Route path="/doctor/appointments" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorAppointments /></ProtectedRoute>} />
      <Route path="/doctor/queue"        element={<ProtectedRoute allowedRoles={['doctor']}><QueueManagement /></ProtectedRoute>} />
      <Route path="/doctor/patients"     element={<ProtectedRoute allowedRoles={['doctor']}><DoctorPatients /></ProtectedRoute>} />
      <Route path="/doctor/reports"      element={<ProtectedRoute allowedRoles={['doctor']}><DoctorReports /></ProtectedRoute>} />
      <Route path="/doctor/profile"      element={<ProtectedRoute allowedRoles={['doctor']}><Profile /></ProtectedRoute>} />

      {/* Reception */}
      <Route path="/reception/dashboard" element={<ProtectedRoute allowedRoles={['reception','admin']}><ReceptionOverview /></ProtectedRoute>} />
      <Route path="/reception/payment"   element={<ProtectedRoute allowedRoles={['reception','admin']}><ReceptionPayment /></ProtectedRoute>} />
      <Route path="/reception/reports"   element={<ProtectedRoute allowedRoles={['reception','admin']}><ReceptionReports /></ProtectedRoute>} />
      <Route path="/reception/profile"   element={<ProtectedRoute allowedRoles={['reception','admin']}><Profile /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin/dashboard"  element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/analytics"  element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/doctors"    element={<ProtectedRoute allowedRoles={['admin']}><AdminDoctors /></ProtectedRoute>} />
      <Route path="/admin/patients"   element={<ProtectedRoute allowedRoles={['admin']}><AdminPatients /></ProtectedRoute>} />
      <Route path="/admin/packages"   element={<ProtectedRoute allowedRoles={['admin']}><AdminPackages /></ProtectedRoute>} />
      <Route path="/admin/profile"    element={<ProtectedRoute allowedRoles={['admin']}><Profile /></ProtectedRoute>} />

      {/* Fallbacks */}
      <Route path="/"  element={<Navigate to={home} />} />
      <Route path="*"  element={<Navigate to={home} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
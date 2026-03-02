import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login    from './pages/Login';
import Register from './pages/Register';

import PatientDashboard    from './pages/patient/PatientDashboard';
import PatientAppointments from './pages/patient/PatientAppointments';
import BookAppointment     from './pages/patient/BookAppointment';
import PatientReports      from './pages/patient/PatientReports';

import LiveDashboard       from './pages/doctor/LiveDashboard';
import DoctorAppointments  from './pages/doctor/DoctorAppointments';
import DoctorPatients      from './pages/doctor/DoctorPatients';
import DoctorReports       from './pages/doctor/DoctorReports';
import QueueManagement     from './pages/doctor/QueueManagement';

import ReceptionOverview   from './pages/reception/ReceptionOverview';
import ReceptionPayment    from './pages/reception/ReceptionPayment';
import ReceptionReports    from './pages/reception/ReceptionReports';

import Profile from './pages/shared/Profile';

const getHome = (role) => {
  if (role === 'patient')   return '/patient/dashboard';
  if (role === 'reception') return '/reception/dashboard';
  return '/doctor/dashboard';
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:'16px', color:'#718096' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={getHome(user.role)} />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  const home = user ? getHome(user.role) : '/login';
  return (
    <Routes>
      <Route path="/login"    element={user ? <Navigate to={home} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={home} /> : <Register />} />

      <Route path="/patient/dashboard"    element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
      <Route path="/patient/appointments" element={<ProtectedRoute allowedRoles={['patient']}><PatientAppointments /></ProtectedRoute>} />
      <Route path="/patient/book"         element={<ProtectedRoute allowedRoles={['patient']}><BookAppointment /></ProtectedRoute>} />
      <Route path="/patient/reports"      element={<ProtectedRoute allowedRoles={['patient']}><PatientReports /></ProtectedRoute>} />
      <Route path="/patient/profile"      element={<ProtectedRoute allowedRoles={['patient']}><Profile /></ProtectedRoute>} />

      <Route path="/doctor/dashboard"    element={<ProtectedRoute allowedRoles={['doctor','admin']}><LiveDashboard /></ProtectedRoute>} />
      <Route path="/doctor/appointments" element={<ProtectedRoute allowedRoles={['doctor','admin']}><DoctorAppointments /></ProtectedRoute>} />
      <Route path="/doctor/queue"        element={<ProtectedRoute allowedRoles={['doctor','admin']}><QueueManagement /></ProtectedRoute>} />
      <Route path="/doctor/patients"     element={<ProtectedRoute allowedRoles={['doctor','admin']}><DoctorPatients /></ProtectedRoute>} />
      <Route path="/doctor/reports"      element={<ProtectedRoute allowedRoles={['doctor','admin']}><DoctorReports /></ProtectedRoute>} />
      <Route path="/doctor/profile"      element={<ProtectedRoute allowedRoles={['doctor','admin']}><Profile /></ProtectedRoute>} />

      <Route path="/reception/dashboard" element={<ProtectedRoute allowedRoles={['reception','admin']}><ReceptionOverview /></ProtectedRoute>} />
      <Route path="/reception/payment"   element={<ProtectedRoute allowedRoles={['reception','admin']}><ReceptionPayment /></ProtectedRoute>} />
      <Route path="/reception/reports"   element={<ProtectedRoute allowedRoles={['reception','admin']}><ReceptionReports /></ProtectedRoute>} />
      <Route path="/reception/profile"   element={<ProtectedRoute allowedRoles={['reception','admin']}><Profile /></ProtectedRoute>} />

      <Route path="/"  element={<Navigate to={home} />} />
      <Route path="*"  element={<Navigate to={home} />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><BrowserRouter><AppRoutes /></BrowserRouter></AuthProvider>;
}

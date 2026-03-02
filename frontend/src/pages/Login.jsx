import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.token);
      navigate(res.data.user.role === 'patient' ? '/patient/dashboard' : '/doctor/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ flex: 1, background: 'linear-gradient(135deg,#0a6e6e 0%,#064444 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
        <div>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏥</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '48px', color: 'white', lineHeight: 1.1, marginBottom: '16px' }}>MediCare<br />Hospital</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', marginBottom: '40px' }}>Government Hospital Digital Management System</p>
          {['Online Appointment Booking','Digital Test Reports','Queue Management','Real-time Notifications'].map(f => (
            <div key={f} style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ background: '#f0a500', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: '480px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 50px' }}>
        <div style={{ width: '100%' }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '32px', color: '#1a202c', marginBottom: '8px' }}>Welcome Back</h2>
          <p style={{ color: '#718096', marginBottom: '32px' }}>Sign in to your account</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '24px', color: '#718096', fontSize: '14px' }}>
            Don't have an account? <Link to="/register" style={{ color: '#0a6e6e', fontWeight: 600, textDecoration: 'none' }}>Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import HoneycombEdge from '../components/HoneycombEdge.jsx';

export default function Login() {
  const { login, error } = useAuth();
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await login(pin);
    setSubmitting(false);
    if (ok) {
      const dest = location.state?.from || '/';
      navigate(dest, { replace: true });
    }
  };

  return (
    <div className="login-screen">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-card card">
        <div className="login-brand">
          <img src="/logo.jpg" alt="HighVolt AI" className="login-logo" />
        </div>
        <HoneycombEdge className="gold-drip-small" />
        <p className="login-sub">Enter your PIN to continue</p>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label htmlFor="pin">PIN</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button className="btn" type="submit" disabled={submitting || !pin}>
            {submitting ? 'Checking...' : 'Unlock'}
          </button>
        </form>
      </div>
      <div className="mountain-silhouette" aria-hidden="true">
        <div className="mountain-layer mountain-back" />
        <div className="mountain-layer mountain-front" />
      </div>
    </div>
  );
}

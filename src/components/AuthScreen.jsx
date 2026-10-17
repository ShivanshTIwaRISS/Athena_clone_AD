// src/components/AuthScreen.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';

export default function AuthScreen({ isSetup, backendOnline, onSignIn, onSetup, onRetryBackend }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (isSetup) {
      if (!form.name.trim() || !form.email.trim() || !form.password) {
        return setError('All fields are required.');
      }
      if (form.password.length < 8) {
        return setError('Password must be at least 8 characters.');
      }
      if (form.password !== form.confirmPassword) {
        return setError('Passwords do not match.');
      }
      try {
        setLoading(true);
        await onSetup({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!form.email.trim() || !form.password) {
        return setError('Email and password are required.');
      }
      try {
        setLoading(true);
        await onSignIn({ email: form.email.trim(), password: form.password });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-bg-decoration">
        <div className="auth-bg-circle auth-bg-circle-1" />
        <div className="auth-bg-circle auth-bg-circle-2" />
      </div>

      <div className="auth-card animate-scale-in">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">V</div>
          <div>
            <div className="auth-brand-name">VEYRA</div>
            <div className="auth-brand-tag">Smart Assessments. Seamless Execution.</div>
          </div>
        </div>

        {/* Backend offline warning */}
        {!backendOnline && (
          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <div>Backend server is offline. Start it with: <code>node backend/server.js</code></div>
              {onRetryBackend && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '6px', padding: '2px 8px' }} onClick={onRetryBackend}>
                  Retry Connection
                </button>
              )}
            </div>
          </div>
        )}

        <h1 className="auth-title">
          {isSetup ? 'Create Administrator Account' : 'Sign In to VEYRA'}
        </h1>
        <p className="auth-subtitle">
          {isSetup
            ? 'Set up your administrator account to start creating and managing examinations.'
            : 'Enter your credentials to access the VEYRA examination platform.'}
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSetup && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-name">
                Full Name <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                id="auth-name"
                type="text"
                className="form-input"
                placeholder="e.g. Admin User"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                disabled={loading}
                autoComplete="name"
                autoFocus
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">
              Email Address <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              placeholder="admin@veyra.app"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              disabled={loading}
              autoComplete="email"
              autoFocus={!isSetup}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              Password <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder={isSetup ? 'At least 8 characters' : 'Your password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                disabled={loading}
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            {isSetup && <p className="form-hint">Minimum 8 characters required</p>}
          </div>

          {isSetup && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-confirm">
                Confirm Password <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                id="auth-confirm"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            id="btn-auth-submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading || !backendOnline}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> {isSetup ? 'Creating Account...' : 'Signing In...'}
              </span>
            ) : (
              isSetup ? 'Create Administrator Account →' : 'Sign In →'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          VEYRA v2.0 • Local-first desktop examination platform<br />
          Your data is stored on this device only.
        </p>
      </div>
    </div>
  );
}

AuthScreen.propTypes = {
  isSetup: PropTypes.bool,
  backendOnline: PropTypes.bool,
  onSignIn: PropTypes.func.isRequired,
  onSetup: PropTypes.func.isRequired,
  onRetryBackend: PropTypes.func,
};

// src/components/AuthScreen.jsx — VEYRA Login & Sign Up Screen
import { useState } from 'react';
import { loginUser, registerUser, saveToken } from '../services/api';

/**
 * AuthScreen
 * Handles both Login and Sign Up flows, calling the provided callbacks on success.
 * Props:
 *   onAuthSuccess({ userId, name, email, token }) — called after successful auth
 *   backendOnline — bool, disables the form if backend is unreachable
 */
export default function AuthScreen({ onAuthSuccess, backendOnline }) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  // Shared form state
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);

  function switchTab(t) {
    setTab(t);
    setError(null);
    setSuccess(null);
    setName(''); setEmail(''); setPassword(''); setConfirm('');
  }

  // ── Password strength ──────────────────────────────────────────────────────
  function getStrength(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6)  score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0–5
  }

  const strength       = getStrength(password);
  const strengthLabel  = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength] || '';
  const strengthColor  = ['', '#e11d48', '#d97706', '#f59e0b', '#16a34a', '#15803d'][strength] || '#e11d48';

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      return setError('Email and password are required.');
    }
    setLoading(true); setError(null);

    try {
      const res = await loginUser(email.trim(), password);
      saveToken(res.token);
      setSuccess('Login successful! Entering platform...');
      setTimeout(() => {
        onAuthSuccess({ userId: res.user.userId, name: res.user.name, email: res.user.email, token: res.token });
      }, 600);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirm) {
      return setError('All fields are required.');
    }
    if (name.trim().length < 2) {
      return setError('Name must be at least 2 characters.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return setError('Please enter a valid email address.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (password !== confirm) {
      return setError('Passwords do not match.');
    }

    setLoading(true); setError(null);

    try {
      const res = await registerUser(name.trim(), email.trim(), password);
      saveToken(res.token);
      setSuccess('Account created! Welcome to VEYRA...');
      setTimeout(() => {
        onAuthSuccess({ userId: res.user.userId, name: res.user.name, email: res.user.email, token: res.token });
      }, 700);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isOffline = !backendOnline;

  return (
    <div className="auth-shell">
      {/* Left decorative panel */}
      <div className="auth-left-panel">
        <div className="auth-brand-block">
          <div className="auth-brand-logo">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="var(--brand-blue)" />
              <path d="M14 34L24 14L34 34" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17.5 27H30.5" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="auth-brand-name">VEYRA</div>
          <div className="auth-brand-tagline">Verified Examination &amp; Yield-based Response Assessment</div>
        </div>

        <div className="auth-feature-list">
          {[
            { icon: lockIcon, label: 'Full Lockdown Proctoring' },
            { icon: cameraIcon, label: 'Webcam &amp; Screen Monitoring' },
            { icon: timerIcon, label: '30-Minute Timed Assessments' },
            { icon: shieldIcon, label: 'Tamper-Proof Session Records' },
            { icon: chartIcon, label: 'Instant Results &amp; Analytics' },
          ].map(({ icon, label }) => (
            <div className="auth-feature-item" key={label}>
              <span className="auth-feature-icon" dangerouslySetInnerHTML={{ __html: icon }} />
              <span dangerouslySetInnerHTML={{ __html: label }} />
            </div>
          ))}
        </div>

        <div className="auth-left-footer">
          Secure · Reliable · Professional
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-right-panel">
        <div className="auth-card">
          {/* Backend offline banner */}
          {isOffline && (
            <div className="auth-offline-banner">
              <span className="auth-offline-dot" />
              Backend server is unreachable. Please start the backend and retry.
            </div>
          )}

          {/* Tab switcher */}
          <div className="auth-tab-row">
            <button
              type="button"
              className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${tab === 'signup' ? 'auth-tab--active' : ''}`}
              onClick={() => switchTab('signup')}
            >
              Create Account
            </button>
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form className="auth-form" onSubmit={handleLogin} noValidate>
              <h1 className="auth-form-title">Welcome back</h1>
              <p className="auth-form-sub">Sign in to your VEYRA candidate account</p>

              <div className="auth-field">
                <label className="auth-label" htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading || isOffline}
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="login-password">Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    className="auth-input auth-input--with-icon"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading || isOffline}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    tabIndex={-1}
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? eyeOffIcon : eyeIcon}
                  </button>
                </div>
              </div>

              {error   && <div className="auth-error-msg">{error}</div>}
              {success && <div className="auth-success-msg">{success}</div>}

              <button
                id="btn-login-submit"
                type="submit"
                className="auth-submit-btn"
                disabled={loading || isOffline}
              >
                {loading ? (
                  <span className="auth-spinner" />
                ) : (
                  <>
                    <span dangerouslySetInnerHTML={{ __html: loginIcon }} />
                    Sign In
                  </>
                )}
              </button>

              <p className="auth-switch-hint">
                Don&apos;t have an account?{' '}
                <button type="button" className="auth-link-btn" onClick={() => switchTab('signup')}>
                  Create one now
                </button>
              </p>
            </form>
          )}

          {/* ── SIGN UP FORM ── */}
          {tab === 'signup' && (
            <form className="auth-form" onSubmit={handleSignup} noValidate>
              <h1 className="auth-form-title">Create account</h1>
              <p className="auth-form-sub">Register as a new VEYRA candidate</p>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-name">Full Name</label>
                <input
                  id="signup-name"
                  type="text"
                  className="auth-input"
                  placeholder="Aditya Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={loading || isOffline}
                  autoComplete="name"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-email">Email Address</label>
                <input
                  id="signup-email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading || isOffline}
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-password">Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="signup-password"
                    type={showPass ? 'text' : 'password'}
                    className="auth-input auth-input--with-icon"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading || isOffline}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    tabIndex={-1}
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? eyeOffIcon : eyeIcon}
                  </button>
                </div>
                {/* Password strength bar */}
                {password && (
                  <div className="auth-strength-bar-wrap">
                    <div className="auth-strength-bar">
                      {[1,2,3,4,5].map(i => (
                        <div
                          key={i}
                          className="auth-strength-segment"
                          style={{ background: i <= strength ? strengthColor : 'var(--bg-card-2)' }}
                        />
                      ))}
                    </div>
                    <span className="auth-strength-label" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </span>
                  </div>
                )}
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-confirm">Confirm Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="signup-confirm"
                    type={showConf ? 'text' : 'password'}
                    className={`auth-input auth-input--with-icon${confirm && confirm !== password ? ' auth-input--error' : ''}`}
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    disabled={loading || isOffline}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    tabIndex={-1}
                    onClick={() => setShowConf(v => !v)}
                    aria-label={showConf ? 'Hide password' : 'Show password'}
                  >
                    {showConf ? eyeOffIcon : eyeIcon}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <span className="auth-field-hint auth-field-hint--error">Passwords do not match</span>
                )}
              </div>

              {error   && <div className="auth-error-msg">{error}</div>}
              {success && <div className="auth-success-msg">{success}</div>}

              <button
                id="btn-signup-submit"
                type="submit"
                className="auth-submit-btn"
                disabled={loading || isOffline}
              >
                {loading ? (
                  <span className="auth-spinner" />
                ) : (
                  <>
                    <span dangerouslySetInnerHTML={{ __html: userPlusIcon }} />
                    Create Account
                  </>
                )}
              </button>

              <p className="auth-switch-hint">
                Already have an account?{' '}
                <button type="button" className="auth-link-btn" onClick={() => switchTab('login')}>
                  Sign in instead
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inline SVG strings ─────────────────────────────────────────────────────────
const lockIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;
const cameraIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;
const timerIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const shieldIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
const chartIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
const loginIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`;
const userPlusIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`;
const eyeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const eyeOffIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

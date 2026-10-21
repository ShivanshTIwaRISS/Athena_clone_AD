// src/components/AuthScreen.jsx
// VEYRA Candidate Examination Terminal Authentication Portal
import { useState } from 'react';
import PropTypes from 'prop-types';
import { loginUser, registerUser, saveToken } from '../services/api';
import { TermsOfServiceModal, PrivacyPolicyModal } from './LegalModals';

// Crisp SVG Icons (Native, non-bloated, properly sized)
function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function AuthScreen({ onAuthSuccess, backendOnline }) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  // Form inputs
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [agreed, setAgreed]       = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);

  // Legal Modals
  const [showTos, setShowTos]         = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  function switchTab(nextTab) {
    setTab(nextTab);
    setError(null);
    setSuccess(null);
    setName('');
    setEmail('');
    setPassword('');
    setConfirm('');
    setAgreed(false);
    setShowPass(false);
    setShowConf(false);
  }

  // Password strength logic
  function getStrength(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6)  score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  const strength = getStrength(password);
  const strengthLabels = ['', 'Inadequate', 'Weak', 'Acceptable', 'Strong', 'High Security'];
  const strengthColors = ['', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#059669'];

  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      return setError('Candidate email and access password are required.');
    }
    setLoading(true);
    setError(null);

    try {
      const res = await loginUser(email.trim(), password);
      saveToken(res.token);
      setSuccess('Credentials verified. Initializing candidate workstation...');
      setTimeout(() => {
        onAuthSuccess({ userId: res.user.userId, name: res.user.name, email: res.user.email, token: res.token });
      }, 550);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify candidate credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirm) {
      return setError('All required registration fields must be completed.');
    }
    if (name.trim().length < 2) {
      return setError('Candidate full name must be at least 2 characters.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return setError('Please provide a valid institutional email address.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters in length.');
    }
    if (password !== confirm) {
      return setError('Password confirmation does not match.');
    }
    if (!agreed) {
      return setError('You must review and accept the Examination Terms and Proctoring Policy.');
    }

    setLoading(true);
    setError(null);

    try {
      const res = await registerUser(name.trim(), email.trim(), password);
      saveToken(res.token);
      setSuccess('Candidate account established. Opening assessment portal...');
      setTimeout(() => {
        onAuthSuccess({ userId: res.user.userId, name: res.user.name, email: res.user.email, token: res.token });
      }, 650);
    } catch (err) {
      setError(err.message || 'Registration could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isOffline = !backendOnline;

  return (
    <div className="auth-terminal-viewport">
      {/* Institutional Top Status Bar */}
      <header className="auth-terminal-header">
        <div className="auth-terminal-brand">
          <div className="auth-crest">V</div>
          <div className="auth-brand-text">
            <span className="auth-brand-title">VEYRA</span>
            <span className="auth-brand-subtitle">Candidate Assessment Terminal</span>
          </div>
        </div>

        <div className="auth-terminal-status-group">
          <div className={`terminal-badge ${isOffline ? 'badge-offline' : 'badge-online'}`}>
            <span className="badge-dot" />
            {isOffline ? 'SERVER DISCONNECTED' : 'PROCTORING SERVER ONLINE'}
          </div>
          <div className="terminal-badge badge-kiosk">
            KIOSK LOCKDOWN READY
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="auth-terminal-body">
        <div className="auth-console-card">
          {/* Offline Notice */}
          {isOffline && (
            <div className="auth-alert-banner alert-error" role="alert">
              <strong>Server Unavailable:</strong> Examination backend is unreachable. Verify connection and retry.
            </div>
          )}

          {/* Tab Selector */}
          <div className="auth-tab-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Candidate Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'signup'}
              className={`auth-tab-btn ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => switchTab('signup')}
            >
              New Registration
            </button>
          </div>

          {/* Skeleton state during active submission */}
          {loading && (
            <div className="auth-loading-skeleton" aria-live="polite" aria-busy="true">
              <div className="skeleton-text" style={{ width: '40%', height: 16 }} />
              <div className="skeleton-box" style={{ width: '100%', height: 38, marginBottom: 16 }} />
              <div className="skeleton-text" style={{ width: '30%', height: 16 }} />
              <div className="skeleton-box" style={{ width: '100%', height: 38, marginBottom: 16 }} />
              <div className="skeleton-box" style={{ width: '100%', height: 42, marginTop: 12 }} />
              <p className="skeleton-label">Authenticating workstation session with proctor authority...</p>
            </div>
          )}

          {/* ── SIGN IN FORM ── */}
          {!loading && tab === 'login' && (
            <form className="auth-console-form" onSubmit={handleLogin} noValidate>
              <div className="form-intro">
                <h1 className="form-heading">Candidate Sign In</h1>
                <p className="form-descriptor">Enter your authorized examination credentials to begin.</p>
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="login-email">Candidate Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="field-input"
                  placeholder="name@institution.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading || isOffline}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-field">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="login-password">Access Password</label>
                </div>
                <div className="field-input-wrapper">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    className="field-input field-input-with-button"
                    placeholder="Enter candidate password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading || isOffline}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="field-visibility-btn"
                    tabIndex={-1}
                    onClick={() => setShowPass(v => !v)}
                    title={showPass ? 'Hide password' : 'Show password'}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Demo Account Quick Note */}
              <div className="auth-demo-hint">
                <span className="demo-hint-title">Default Candidate Access:</span> candidate@veyra.io | Password123!
              </div>

              {error && <div className="auth-alert-banner alert-error" role="alert">{error}</div>}
              {success && <div className="auth-alert-banner alert-success" role="status">{success}</div>}

              <button
                id="btn-login-submit"
                type="submit"
                className="btn-auth-primary"
                disabled={loading || isOffline}
              >
                Sign In to Assessment Portal
              </button>

              <div className="auth-secondary-row">
                <span>First-time test taker?</span>{' '}
                <button type="button" className="link-button" onClick={() => switchTab('signup')}>
                  Register Candidate Profile
                </button>
              </div>
            </form>
          )}

          {/* ── REGISTRATION FORM ── */}
          {!loading && tab === 'signup' && (
            <form className="auth-console-form" onSubmit={handleSignup} noValidate>
              <div className="form-intro">
                <h1 className="form-heading">Register Candidate Account</h1>
                <p className="form-descriptor">Create an identity record for supervised assessments.</p>
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="signup-name">Candidate Full Legal Name</label>
                <input
                  id="signup-name"
                  type="text"
                  className="field-input"
                  placeholder="e.g. Shivansh Tiwari"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={loading || isOffline}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="signup-email">Institutional Email Address</label>
                <input
                  id="signup-email"
                  type="email"
                  className="field-input"
                  placeholder="name@institution.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading || isOffline}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="signup-password">Create Secure Password</label>
                <div className="field-input-wrapper">
                  <input
                    id="signup-password"
                    type={showPass ? 'text' : 'password'}
                    className="field-input field-input-with-button"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading || isOffline}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="field-visibility-btn"
                    tabIndex={-1}
                    onClick={() => setShowPass(v => !v)}
                    title={showPass ? 'Hide password' : 'Show password'}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                {password && (
                  <div className="password-security-indicator">
                    <div className="strength-track">
                      {[1, 2, 3, 4, 5].map(step => (
                        <div
                          key={step}
                          className="strength-step"
                          style={{
                            background: step <= strength ? strengthColors[strength] : 'var(--border)',
                          }}
                        />
                      ))}
                    </div>
                    <span className="strength-text" style={{ color: strengthColors[strength] }}>
                      Complexity: {strengthLabels[strength]}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="signup-confirm">Confirm Password</label>
                <div className="field-input-wrapper">
                  <input
                    id="signup-confirm"
                    type={showConf ? 'text' : 'password'}
                    className={`field-input field-input-with-button ${confirm && confirm !== password ? 'field-error' : ''}`}
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    disabled={loading || isOffline}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="field-visibility-btn"
                    tabIndex={-1}
                    onClick={() => setShowConf(v => !v)}
                    title={showConf ? 'Hide password' : 'Show password'}
                    aria-label={showConf ? 'Hide password' : 'Show password'}
                  >
                    {showConf ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <span className="field-error-message">Passwords do not match</span>
                )}
              </div>

              {/* Terms & Privacy Consent Checkbox */}
              <div className="form-field-checkbox">
                <input
                  id="auth-agreement-check"
                  type="checkbox"
                  className="checkbox-input"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  disabled={loading || isOffline}
                />
                <label htmlFor="auth-agreement-check" className="checkbox-label">
                  I agree to the{' '}
                  <button type="button" className="link-button inline-link" onClick={() => setShowTos(true)}>
                    Examination Terms of Service
                  </button>{' '}
                  and{' '}
                  <button type="button" className="link-button inline-link" onClick={() => setShowPrivacy(true)}>
                    Biometric Proctoring Policy
                  </button>.
                </label>
              </div>

              {error && <div className="auth-alert-banner alert-error" role="alert">{error}</div>}
              {success && <div className="auth-alert-banner alert-success" role="status">{success}</div>}

              <button
                id="btn-signup-submit"
                type="submit"
                className="btn-auth-primary"
                disabled={loading || isOffline || !agreed}
              >
                Create Candidate Account
              </button>

              <div className="auth-secondary-row">
                <span>Already have a candidate ID?</span>{' '}
                <button type="button" className="link-button" onClick={() => switchTab('login')}>
                  Return to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Institutional Governance Footer */}
      <footer className="auth-terminal-footer">
        <div className="footer-meta">
          <span>VEYRA Assessment Engine | v2.4 Enterprise</span>
          <span>Station Telemetry Cryptographically Signed</span>
        </div>
        <div className="footer-links">
          <button type="button" className="footer-link-btn" onClick={() => setShowTos(true)}>
            Terms of Examination
          </button>
          <span className="footer-divider">|</span>
          <button type="button" className="footer-link-btn" onClick={() => setShowPrivacy(true)}>
            Privacy &amp; Telemetry Policy
          </button>
        </div>
      </footer>

      {/* Modals */}
      <TermsOfServiceModal isOpen={showTos} onClose={() => setShowTos(false)} />
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}

AuthScreen.propTypes = {
  onAuthSuccess: PropTypes.func.isRequired,
  backendOnline: PropTypes.bool.isRequired,
};

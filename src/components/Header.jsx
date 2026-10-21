// src/components/Header.jsx
import PropTypes from 'prop-types';

const STAGE_LABELS = {
  AVAILABLE_EXAMS: 'Available Assessments',
  SETUP:           'Pre-Exam Verification',
  EXAM:            'In-Progress',
  RESULTS:         'Completed',
  HISTORY:         'Attempt History',
};

const EXAM_DURATION_SECONDS = 1800; // 30 minutes

function formatCountdown(remainingSeconds) {
  const s = Math.max(0, Math.floor(Number(remainingSeconds) || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default function Header({
  stage,
  studentName,
  userId,
  userEmail,
  sessionId,
  timer,
  backendOnline,
  onOpenRules,
  onNavigate,
  onLogout,
}) {
  const isExam = stage === 'EXAM';

  return (
    <header className="app-header">
      {/* ── Left: Brand + Stage */}
      <div className="header-left">
        <div
          className="brand-logo"
          onClick={() => !isExam && onNavigate?.('AVAILABLE_EXAMS')}
          style={{ cursor: isExam ? 'default' : 'pointer' }}
          title={isExam ? 'Exam in progress' : 'Back to Assessments'}
          role="button"
          tabIndex={isExam ? -1 : 0}
          onKeyDown={(e) => e.key === 'Enter' && !isExam && onNavigate?.('AVAILABLE_EXAMS')}
        >
          <div className="logo-icon">V</div>
          <div className="brand-text">
            <span className="brand-title">VEYRA</span>
            <span className="brand-sub">Smart Assessments. Seamless Execution.</span>
          </div>
        </div>

        {/* Stage indicator */}
        <div className="stage-pill">
          <span className={`status-dot dot-${stage.toLowerCase()}`} />
          {STAGE_LABELS[stage] ?? stage}
        </div>

        {/* Navigation tabs — hidden during active exam */}
        {!isExam && onNavigate && (
          <nav className="header-nav-tabs">
            <button
              type="button"
              className={`nav-tab-btn ${stage === 'AVAILABLE_EXAMS' || stage === 'SETUP' ? 'active' : ''}`}
              onClick={() => onNavigate('AVAILABLE_EXAMS')}
            >
              Assessments
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${stage === 'HISTORY' ? 'active' : ''}`}
              onClick={() => onNavigate('HISTORY')}
            >
              History
            </button>
          </nav>
        )}
      </div>

      {/* ── Centre: 30-Minute Live Countdown Timer during exam */}
      <div className="header-center">
        {isExam && (() => {
          const elapsed = Math.floor(Number(timer) || 0);
          const remaining = Math.max(0, EXAM_DURATION_SECONDS - elapsed);
          const isUrgent = remaining <= 300 && remaining > 0; // last 5 mins
          const isWarning = remaining <= 600 && remaining > 300; // last 10 mins
          const isExpired = remaining === 0;

          return (
            <div
              className={`timer-badge ${isUrgent || isExpired ? 'timer-urgent' : isWarning ? 'timer-warning' : ''}`}
              title={`Exam Duration: 30 minutes. ${remaining > 0 ? `${formatCountdown(remaining)} remaining` : 'Time expired'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="timer-label">Time Remaining</span>
              <span className="timer-value">
                {isExpired ? '00:00 (Time Up)' : formatCountdown(remaining)}
              </span>
            </div>
          );
        })()}
      </div>

      {/* ── Right: Status + Candidate + Rules */}
      <div className="header-right">
        {/* Backend connectivity */}
        <div
          className={`backend-status-badge ${backendOnline ? 'online' : 'offline'}`}
          title={backendOnline ? 'Backend API connected' : 'Backend offline: verify server'}
        >
          <span className="status-indicator" />
          {backendOnline ? 'API Online' : 'API Offline'}
        </div>

        {/* Candidate chip */}
        {studentName && (
          <div className="candidate-chip">
            <div className="candidate-avatar">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div className="candidate-meta">
              <span className="candidate-name">{studentName}</span>
              <span className="candidate-id" title={userEmail || userId}>
                {userEmail || userId || (sessionId ? sessionId.slice(0, 14) : 'Active')}
              </span>
            </div>
          </div>
        )}

        {/* Rules */}
        <button
          type="button"
          className="btn-header-rules"
          onClick={onOpenRules}
          title="View Exam Rules"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Rules
        </button>

        {/* Logout — hidden during active exam */}
        {!isExam && onLogout && (
          <button
            type="button"
            className="btn-header-logout"
            onClick={onLogout}
            title="Sign out of VEYRA"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}

Header.propTypes = {
  stage:        PropTypes.string.isRequired,
  studentName:  PropTypes.string,
  userId:       PropTypes.string,
  userEmail:    PropTypes.string,
  sessionId:    PropTypes.string,
  timer:        PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  backendOnline: PropTypes.bool.isRequired,
  onOpenRules:  PropTypes.func.isRequired,
  onNavigate:   PropTypes.func,
  onLogout:     PropTypes.func,
};

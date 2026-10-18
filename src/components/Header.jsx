// src/components/Header.jsx
import PropTypes from 'prop-types';

function formatTime(seconds) {
  const s = Math.floor(Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}

const STAGE_LABELS = {
  AVAILABLE_EXAMS: 'Available Assessments',
  SETUP:           'Pre-Exam Verification',
  EXAM:            'In-Progress',
  RESULTS:         'Completed',
  HISTORY:         'Attempt History',
};

export default function Header({
  stage,
  studentName,
  userId,
  sessionId,
  timer,
  backendOnline,
  onOpenRules,
  onNavigate,
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

      {/* ── Centre: Live timer during exam */}
      <div className="header-center">
        {isExam && (
          <div className="timer-badge" title="Elapsed exam time">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="timer-label">Elapsed</span>
            <span className="timer-value">{formatTime(timer)}</span>
          </div>
        )}
      </div>

      {/* ── Right: Status + Candidate + Rules */}
      <div className="header-right">
        {/* Backend connectivity */}
        <div
          className={`backend-status-badge ${backendOnline ? 'online' : 'offline'}`}
          title={backendOnline ? 'Backend API connected' : 'Backend offline — check server'}
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
              <span className="candidate-id">
                {userId || (sessionId ? sessionId.slice(0, 14) : '—')}
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
      </div>
    </header>
  );
}

Header.propTypes = {
  stage:        PropTypes.string.isRequired,
  studentName:  PropTypes.string,
  userId:       PropTypes.string,
  sessionId:    PropTypes.string,
  timer:        PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  backendOnline: PropTypes.bool.isRequired,
  onOpenRules:  PropTypes.func.isRequired,
  onNavigate:   PropTypes.func,
};

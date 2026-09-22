// src/components/Header.jsx
import PropTypes from 'prop-types';

export default function Header({
  stage,
  studentName,
  userId,
  sessionId,
  timer,
  backendOnline,
  onOpenRules,
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-logo">
          <div className="logo-icon">A</div>
          <div className="brand-text">
            <span className="brand-title">ATHENA</span>
            <span className="brand-sub">Assessment Portal</span>
          </div>
        </div>

        <div className="stage-pill">
          <span className={`status-dot dot-${stage.toLowerCase()}`}></span>
          {stage === 'SETUP' && 'Pre-Exam Verification'}
          {stage === 'EXAM' && 'Assessment In-Progress'}
          {stage === 'RESULTS' && 'Assessment Completed'}
        </div>
      </div>

      <div className="header-center">
        {stage === 'EXAM' && (
          <div className="timer-badge" title="Live Elapsed Exam Duration">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span className="timer-label">Elapsed:</span>
            <span className="timer-value">{timer || '0'}s</span>
          </div>
        )}
      </div>

      <div className="header-right">
        {/* Backend Connectivity Status */}
        <div
          className={`backend-status-badge ${backendOnline ? 'online' : 'offline'}`}
          title={backendOnline ? 'Backend API connected on port 3000' : 'Backend API is disconnected'}
        >
          <span className="status-indicator"></span>
          <span>{backendOnline ? 'API Online' : 'API Offline'}</span>
        </div>

        {/* Candidate / Session Meta */}
        {studentName && (
          <div className="candidate-chip">
            <div className="candidate-avatar">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div className="candidate-meta">
              <span className="candidate-name">{studentName}</span>
              <span className="candidate-id">{userId || (sessionId ? sessionId.slice(0, 14) : '')}</span>
            </div>
          </div>
        )}

        {/* Rules button */}
        <button
          type="button"
          className="btn-header-rules"
          onClick={onOpenRules}
          title="View Exam Rules & Guidelines"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Rules
        </button>
      </div>
    </header>
  );
}

Header.propTypes = {
  stage: PropTypes.string.isRequired,
  studentName: PropTypes.string,
  userId: PropTypes.string,
  sessionId: PropTypes.string,
  timer: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  backendOnline: PropTypes.bool.isRequired,
  onOpenRules: PropTypes.func.isRequired,
};

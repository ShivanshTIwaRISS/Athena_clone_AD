import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

function formatCountdown(remainingSeconds) {
  if (remainingSeconds <= 0) return '00:00';
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AppHeader({
  currentUser, view, backendOnline, sessionId, sessionDuration,
  onSignOut, onOpenRules, isExamActive
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(sessionDuration);

  useEffect(() => {
    setRemainingSeconds(sessionDuration);
  }, [sessionDuration, sessionId]);

  useEffect(() => {
    if (!isExamActive) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isExamActive, sessionId]);

  const countdownClass = remainingSeconds <= 60 ? 'danger' : remainingSeconds <= 300 ? 'warning' : 'normal';

  const stageLabelMap = {
    'dashboard': 'Admin Dashboard',
    'exams': 'Exam Management',
    'exam-editor': 'Exam Editor',
    'questions': 'Question Bank',
    'sessions': 'Sessions',
    'analytics': 'Analytics',
    'settings': 'Settings',
    'users': 'User Management',
    'candidate-dashboard': 'My Exams',
    'exam-setup': 'Pre-Exam Setup',
    'exam-arena': 'Examination In Progress',
    'exam-results': 'Results',
    'history': 'Attempt History',
  };

  const stageDotMap = {
    'exam-arena': 'exam',
    'exam-setup': 'setup',
    'exam-results': 'results',
    'dashboard': 'admin',
    'candidate-dashboard': 'login',
  };

  const dotClass = stageDotMap[view] || 'admin';

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-logo">
          <div className="logo-mark">V</div>
          <div className="brand-text">
            <span className="brand-title">VEYRA</span>
            <span className="brand-sub">Smart Assessments</span>
          </div>
        </div>

        <div className="stage-pill">
          <span className={`status-dot dot-${dotClass}`} />
          {stageLabelMap[view] || view}
        </div>
      </div>

      <div className="header-center">
        {isExamActive && (
          <div className={`countdown-badge ${countdownClass}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {formatCountdown(remainingSeconds)}
          </div>
        )}
      </div>

      <div className="header-right">
        <div className={`backend-status-badge ${backendOnline ? 'online' : 'offline'}`}
          title={backendOnline ? 'Backend connected' : 'Backend offline'}>
          <span className="status-indicator" />
          {backendOnline ? 'API Online' : 'Offline'}
        </div>

        {currentUser && (
          <div className="candidate-chip">
            <div className="candidate-avatar">
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
            <div className="candidate-meta">
              <span className="candidate-name">{currentUser.name}</span>
              <span className="candidate-role">{currentUser.role}</span>
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn-header-icon"
          onClick={onOpenRules}
          title="View Exam Rules"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </button>

        {currentUser && !isExamActive && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSignOut}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

AppHeader.propTypes = {
  currentUser: PropTypes.object,
  view: PropTypes.string,
  backendOnline: PropTypes.bool,
  sessionId: PropTypes.string,
  sessionDuration: PropTypes.number,
  onSignOut: PropTypes.func,
  onOpenRules: PropTypes.func,
  isExamActive: PropTypes.bool,
};

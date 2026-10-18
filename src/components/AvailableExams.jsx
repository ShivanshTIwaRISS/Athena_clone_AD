// src/components/AvailableExams.jsx
import PropTypes from 'prop-types';

export default function AvailableExams({
  questionsCount = 0,
  backendOnline,
  onSelectExam,
  onNavigate,
  onOpenRules,
}) {
  const count = questionsCount || 13;

  return (
    <div className="available-exams-container animate-fade-in">

      {/* ── Hero Banner */}
      <div className="section-hero-banner">
        <div className="hero-text-block">
          <div className="hero-eyebrow">
            <span className="live-pulse-dot" />
            Proctored Desktop Assessment
          </div>
          <h1 className="hero-title">Available Examinations</h1>
          <p className="hero-subtitle">
            Select an assessment below to begin candidate hardware verification, review
            instructions, and launch your timed exam session.
          </p>
        </div>

        <div className="hero-stats-row">
          <div className="hero-stat-card">
            <span className="stat-label">System Status</span>
            <span className={`stat-value ${backendOnline ? 'text-green' : 'text-amber'}`}>
              {backendOnline ? '✓ Online' : '⚠ Connecting…'}
            </span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-label">Question Bank</span>
            <span className="stat-value">{count} Items</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-label">Proctoring</span>
            <span className="stat-value text-blue">Webcam + Screen</span>
          </div>
        </div>
      </div>

      {/* ── Exam Card */}
      <div className="exams-grid">
        <div className="exam-selection-card">
          <div className="exam-card-badge-row">
            <span className="exam-status-tag tag-active">Available Now</span>
            <span className="exam-code-tag">CS-FINAL-2026</span>
          </div>

          <div className="exam-card-header">
            <div className="exam-icon-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h2 className="exam-title">Computer Science &amp; Systems Assessment</h2>
              <p className="exam-desc">
                Comprehensive evaluation covering Operating Systems, Process Scheduling,
                Electron Desktop Architecture, and Inter-Process Communication.
              </p>
            </div>
          </div>

          <div className="exam-spec-grid">
            <div className="spec-item">
              <span className="spec-label">Duration</span>
              <strong className="spec-value">30 Minutes</strong>
            </div>
            <div className="spec-item">
              <span className="spec-label">Questions</span>
              <strong className="spec-value">{count} MCQs</strong>
            </div>
            <div className="spec-item">
              <span className="spec-label">Passing Score</span>
              <strong className="spec-value">60%</strong>
            </div>
            <div className="spec-item">
              <span className="spec-label">Marking</span>
              <strong className="spec-value">+1 / No Negatives</strong>
            </div>
          </div>

          <div className="exam-features-list">
            {[
              ['📹', 'Webcam Snapshot Telemetry'],
              ['🖥️', 'Window Integrity Capture'],
              ['💾', 'Real-time Auto-Save'],
              ['📊', 'Instant Scorecard & Review'],
            ].map(([icon, label]) => (
              <div key={label} className="feature-pill">
                <span className="feature-icon">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="exam-card-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onOpenRules}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              View Rules
            </button>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() =>
                onSelectExam({
                  id: 'exam-cs-core',
                  title: 'Computer Science & Systems Assessment',
                  code: 'CS-FINAL-2026',
                  durationMinutes: 30,
                })
              }
              disabled={!backendOnline}
              title={!backendOnline ? 'Waiting for backend to come online…' : undefined}
            >
              {!backendOnline ? (
                <>
                  <span className="spinner" style={{ borderTopColor: 'rgba(255,255,255,0.4)' }} />
                  Connecting…
                </>
              ) : (
                <>
                  Select &amp; Proceed to Verification
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer tip */}
      <div className="exam-info-footer-card">
        <div className="info-icon-box">💡</div>
        <div className="info-text-box">
          <h4>Candidate Preparation Note</h4>
          <p>
            Ensure your webcam is connected and functional. Once you begin, the assessment
            runs in a protected environment with a synchronized countdown and automatic
            submission on expiry.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onNavigate?.('HISTORY')}
        >
          Past Attempts
        </button>
      </div>
    </div>
  );
}

AvailableExams.propTypes = {
  questionsCount: PropTypes.number,
  backendOnline:  PropTypes.bool.isRequired,
  onSelectExam:   PropTypes.func.isRequired,
  onNavigate:     PropTypes.func,
  onOpenRules:    PropTypes.func.isRequired,
};

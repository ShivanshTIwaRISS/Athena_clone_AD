// src/components/PreExamSetup.jsx
import PropTypes from 'prop-types';

export default function PreExamSetup({
  userId,
  setUserId,
  name,
  setName,
  cameraEnabled,
  videoRef,
  onGetCameraAccess,
  fullScreen,
  onEnableFullScreen,
  backendOnline,
  onCheckBackend,
  onStartExam,
  isStarting,
  errorMessage,
  onOpenRules,
}) {
  const isReadyToStart = Boolean(
    userId.trim() &&
    name.trim() &&
    cameraEnabled &&
    fullScreen &&
    backendOnline &&
    !isStarting
  );

  return (
    <div className="setup-container">
      {/* Intro Header */}
      <div className="setup-header">
        <div className="setup-badge">Step 1 of 2: Candidate Readiness</div>
        <h2>Pre-Examination Verification</h2>
        <p>Complete the candidate details and hardware checks below before beginning your proctored assessment.</p>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="alert-banner error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>Setup Notice:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Backend Status Card */}
      <div className={`system-card ${backendOnline ? 'card-success' : 'card-warning'}`}>
        <div className="card-icon-area">
          <div className={`status-icon-bubble ${backendOnline ? 'bubble-online' : 'bubble-offline'}`}>
            {backendOnline ? '⚡' : '⚠️'}
          </div>
        </div>
        <div className="card-body-area">
          <div className="card-title-row">
            <h4>Backend Server Connection</h4>
            <span className={`pill-tag ${backendOnline ? 'pill-green' : 'pill-amber'}`}>
              {backendOnline ? 'Connected (Port 3000)' : 'Not Connected'}
            </span>
          </div>
          <p className="card-desc">
            {backendOnline
              ? 'Exam backend is running and ready to handle session initialization, question delivery, and answer validation.'
              : 'Backend server is not responding at http://localhost:3000. Please ensure `node backend/server.js` or `npm start` is running.'}
          </p>
          {!backendOnline && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onCheckBackend}
            >
              🔄 Retry Connection (GET /)
            </button>
          )}
        </div>
      </div>

      {/* Candidate Profile Details Card */}
      <div className="system-card">
        <div className="card-icon-area">
          <div className="status-icon-bubble bubble-primary">👤</div>
        </div>
        <div className="card-body-area">
          <h4>Candidate Information</h4>
          <p className="card-desc">Enter your Student ID and Full Name to initiate a new tracked exam session.</p>

          <div className="input-grid">
            <div className="input-group">
              <label htmlFor="student-id-input">Candidate / Student ID *</label>
              <input
                id="student-id-input"
                type="text"
                placeholder="e.g. student-101"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isStarting}
                className="text-input"
              />
            </div>
            <div className="input-group">
              <label htmlFor="student-name-input">Candidate Full Name *</label>
              <input
                id="student-name-input"
                type="text"
                placeholder="e.g. Shivansh Tiwari"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isStarting}
                className="text-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Proctored Hardware & Environment Cards Grid */}
      <div className="requirements-grid">
        {/* Camera Check */}
        <div className={`system-card req-card ${cameraEnabled ? 'card-success' : ''}`}>
          <div className="card-icon-area">
            <div className={`status-icon-bubble ${cameraEnabled ? 'bubble-online' : 'bubble-neutral'}`}>
              📷
            </div>
          </div>
          <div className="card-body-area">
            <div className="card-title-row">
              <h4>1. Camera Configuration</h4>
              {cameraEnabled && <span className="pill-tag pill-green">Verified</span>}
            </div>
            <p className="card-desc">
              Webcam feed is required for periodic AI proctoring snapshots during the examination.
            </p>

            <div className="camera-action-box">
              <button
                type="button"
                className={`btn ${cameraEnabled ? 'btn-success' : 'btn-black'}`}
                disabled={cameraEnabled}
                onClick={onGetCameraAccess}
              >
                {cameraEnabled ? '✓ Camera Active' : 'Grant Camera Access'}
              </button>

              <div className={`camera-preview-wrapper ${cameraEnabled ? 'active' : 'idle'}`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="video-preview-element"
                />
                {!cameraEnabled && (
                  <div className="camera-placeholder">
                    <span>Camera Offline</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Check */}
        <div className={`system-card req-card ${fullScreen ? 'card-success' : ''}`}>
          <div className="card-icon-area">
            <div className={`status-icon-bubble ${fullScreen ? 'bubble-online' : 'bubble-neutral'}`}>
              🖥️
            </div>
          </div>
          <div className="card-body-area">
            <div className="card-title-row">
              <h4>2. Full Screen Mode</h4>
              {fullScreen && <span className="pill-tag pill-green">Active</span>}
            </div>
            <p className="card-desc">
              Assessment must run in full screen mode to prevent tab switching and unauthorized distractions.
            </p>

            <button
              type="button"
              className={`btn ${fullScreen ? 'btn-success' : 'btn-primary'}`}
              disabled={fullScreen}
              onClick={onEnableFullScreen}
            >
              {fullScreen ? '✓ Full Screen Enabled' : 'Enable Full Screen'}
            </button>
          </div>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="rules-strip">
        <div className="rules-strip-text">
          <span>ℹ️ Please review assessment rules before beginning. </span>
          <button type="button" className="link-button" onClick={onOpenRules}>
            View Exam Instructions & Guidelines
          </button>
        </div>
      </div>

      {/* Final Action Row */}
      <div className="setup-bottom-bar">
        <div className="checklist-status">
          <span className={userId.trim() && name.trim() ? 'check-done' : 'check-pending'}>
            {userId.trim() && name.trim() ? '✓ Profile' : '○ Candidate Info'}
          </span>
          <span className="dot-sep">•</span>
          <span className={cameraEnabled ? 'check-done' : 'check-pending'}>
            {cameraEnabled ? '✓ Camera' : '○ Camera'}
          </span>
          <span className="dot-sep">•</span>
          <span className={fullScreen ? 'check-done' : 'check-pending'}>
            {fullScreen ? '✓ Fullscreen' : '○ Fullscreen'}
          </span>
          <span className="dot-sep">•</span>
          <span className={backendOnline ? 'check-done' : 'check-pending'}>
            {backendOnline ? '✓ Backend' : '○ Backend'}
          </span>
        </div>

        <button
          type="button"
          id="btn-start-exam"
          className="btn btn-primary btn-lg"
          disabled={!isReadyToStart}
          onClick={onStartExam}
        >
          {isStarting ? (
            <span className="btn-loading">
              <span className="spinner"></span> Starting Session...
            </span>
          ) : (
            'Start Examination →'
          )}
        </button>
      </div>
    </div>
  );
}

PreExamSetup.propTypes = {
  userId: PropTypes.string.isRequired,
  setUserId: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  setName: PropTypes.func.isRequired,
  cameraEnabled: PropTypes.bool.isRequired,
  videoRef: PropTypes.shape({ current: PropTypes.any }),
  onGetCameraAccess: PropTypes.func.isRequired,
  fullScreen: PropTypes.bool.isRequired,
  onEnableFullScreen: PropTypes.func.isRequired,
  backendOnline: PropTypes.bool.isRequired,
  onCheckBackend: PropTypes.func.isRequired,
  onStartExam: PropTypes.func.isRequired,
  isStarting: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
  onOpenRules: PropTypes.func.isRequired,
};

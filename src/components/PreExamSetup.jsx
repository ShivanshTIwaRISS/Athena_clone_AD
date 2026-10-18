// src/components/PreExamSetup.jsx
import { useEffect } from 'react';
import PropTypes from 'prop-types';

export default function PreExamSetup({
  userId,
  setUserId,
  name,
  setName,
  cameraEnabled,
  mediaStream,
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
  useEffect(() => {
    if (videoRef?.current && mediaStream && videoRef.current.srcObject !== mediaStream) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => {});
    }
  }, [videoRef, mediaStream]);

  const isReadyToStart = Boolean(
    userId.trim() && name.trim() && cameraEnabled && fullScreen && backendOnline && !isStarting
  );

  const checks = [
    {
      id: 'backend',
      label: 'Backend Server',
      sub: backendOnline ? 'Connected and ready' : 'Not reachable — check server',
      pass: backendOnline,
      action: !backendOnline ? (
        <button type="button" className="btn btn-outline btn-sm" onClick={onCheckBackend}>
          Retry
        </button>
      ) : null,
    },
    {
      id: 'camera',
      label: 'Webcam Access',
      sub: cameraEnabled ? 'Feed active — proctoring ready' : 'Permission required for proctoring',
      pass: cameraEnabled,
      action: !cameraEnabled ? (
        <button type="button" className="btn btn-primary btn-sm" onClick={onGetCameraAccess}>
          Grant Access
        </button>
      ) : null,
    },
    {
      id: 'fullscreen',
      label: 'Full Screen Mode',
      sub: fullScreen ? 'Active — window integrity secured' : 'Required before exam begins',
      pass: fullScreen,
      action: !fullScreen ? (
        <button type="button" className="btn btn-primary btn-sm" onClick={onEnableFullScreen}>
          Enable
        </button>
      ) : null,
    },
    {
      id: 'identity',
      label: 'Candidate Identity',
      sub: userId.trim() && name.trim() ? `${name} · ${userId}` : 'Enter ID and name below',
      pass: Boolean(userId.trim() && name.trim()),
      action: null,
    },
  ];

  const passedCount = checks.filter((c) => c.pass).length;

  return (
    <div className="setup-container animate-fade-in">
      {/* ── Left panel: checks + identity form */}
      <div className="setup-main-panel">

        {/* Identity form */}
        <div className="setup-card">
          <div className="setup-card-title">
            <div className="setup-card-icon icon-blue">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            Candidate Information
          </div>
          <div className="identity-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="field-student-id">Student ID</label>
              <input
                id="field-student-id"
                className="form-input"
                type="text"
                placeholder="e.g. student-101"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isStarting}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="field-full-name">Full Name</label>
              <input
                id="field-full-name"
                className="form-input"
                type="text"
                placeholder="e.g. Shivansh Tiwari"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isStarting}
              />
            </div>
          </div>
        </div>

        {/* Verification checklist */}
        <div className="setup-card">
          <div className="setup-card-title">
            <div className="setup-card-icon icon-green">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            System Readiness Checklist
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              {passedCount} / {checks.length} ready
            </span>
          </div>
          <div className="verification-checklist">
            {checks.map((c) => (
              <div key={c.id} className={`check-item ${c.pass ? 'pass' : 'fail'}`}>
                <div className={`check-icon ${c.pass ? 'pass' : 'fail'}`}>
                  {c.pass ? '✓' : '○'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="check-label">{c.label}</div>
                  <div className="check-sub">{c.sub}</div>
                </div>
                {c.action && <div className="check-action">{c.action}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="alert alert-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* ── Right panel: webcam + start */}
      <div className="setup-side-panel">
        {/* Webcam preview */}
        <div className="setup-card">
          <div className="setup-card-title">
            <div className="setup-card-icon icon-amber">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            Webcam Preview
          </div>
          <div className="webcam-preview-wrap">
            {cameraEnabled ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="webcam-video"
                />
                <div className="webcam-recording-badge">
                  <span className="rec-dot" />
                  LIVE
                </div>
              </>
            ) : (
              <>
                {/* still render hidden video so ref is attached */}
                <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
                <div className="webcam-offline-state">
                  <div className="webcam-offline-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <div className="webcam-offline-text">Camera not active</div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={onGetCameraAccess}
                    style={{ marginTop: 8 }}
                  >
                    Enable Camera
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Start exam box */}
        <div className="setup-card">
          <div className="setup-card-title">
            <div className="setup-card-icon icon-green">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            Begin Assessment
          </div>
          <div className="start-exam-box">
            <button
              type="button"
              id="btn-start-exam"
              className="btn btn-success btn-xl"
              disabled={!isReadyToStart}
              onClick={onStartExam}
            >
              {isStarting ? (
                <>
                  <span className="spinner" />
                  Starting Session…
                </>
              ) : (
                <>
                  Launch Examination
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </>
              )}
            </button>

            {!isReadyToStart && !isStarting && (
              <p className="start-hint">
                Complete all {checks.length} checklist items above to enable the exam launch.
              </p>
            )}

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onOpenRules}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Read Exam Rules Before Starting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

PreExamSetup.propTypes = {
  userId:            PropTypes.string.isRequired,
  setUserId:         PropTypes.func.isRequired,
  name:              PropTypes.string.isRequired,
  setName:           PropTypes.func.isRequired,
  cameraEnabled:     PropTypes.bool.isRequired,
  mediaStream:       PropTypes.any,
  videoRef:          PropTypes.shape({ current: PropTypes.any }),
  onGetCameraAccess: PropTypes.func.isRequired,
  fullScreen:        PropTypes.bool.isRequired,
  onEnableFullScreen: PropTypes.func.isRequired,
  backendOnline:     PropTypes.bool.isRequired,
  onCheckBackend:    PropTypes.func.isRequired,
  onStartExam:       PropTypes.func.isRequired,
  isStarting:        PropTypes.bool.isRequired,
  errorMessage:      PropTypes.string,
  onOpenRules:       PropTypes.func.isRequired,
};

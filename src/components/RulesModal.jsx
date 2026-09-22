// src/components/RulesModal.jsx
import PropTypes from 'prop-types';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleTriggerNative = () => {
    if (window.athena && typeof window.athena.showRules === 'function') {
      window.athena.showRules();
    } else {
      alert(
        'Exam Rules (Native Fallback):\n' +
        '1. Stay on the exam screen.\n' +
        '2. Camera must remain enabled.\n' +
        '3. Do not leave the exam.\n' +
        '4. Do not use external assistance.\n' +
        '5. Click Exit Exam when finished.'
      );
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon">📜</div>
            <div>
              <h3>Athena Examination Rules & Guidelines</h3>
              <p className="modal-subtitle">Official Assessment Proctoring Protocol</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="rule-item">
            <div className="rule-number">1</div>
            <div className="rule-text">
              <strong>Stay on the Exam Screen:</strong> Fullscreen mode is mandatory. Switching windows, exiting fullscreen, or minimizing will trigger a proctoring violation.
            </div>
          </div>

          <div className="rule-item">
            <div className="rule-number">2</div>
            <div className="rule-text">
              <strong>Continuous Camera Proctoring:</strong> Your webcam must remain active and unobstructed. Automated snapshot captures are recorded every 5 seconds to verify candidate identity.
            </div>
          </div>

          <div className="rule-item">
            <div className="rule-number">3</div>
            <div className="rule-text">
              <strong>Single-Attempt per Question:</strong> Once an answer for an MCQ is submitted to the backend, it is locked and recorded immediately.
            </div>
          </div>

          <div className="rule-item">
            <div className="rule-number">4</div>
            <div className="rule-text">
              <strong>No External Assistance:</strong> Use of secondary devices, notes, or unauthorized aids is strictly prohibited and logged.
            </div>
          </div>

          <div className="rule-item">
            <div className="rule-number">5</div>
            <div className="rule-text">
              <strong>Final Submission:</strong> When you complete all questions, click <em>Submit Exam</em> to finalize your attempt and generate your scorecard.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleTriggerNative}
          >
            Show Native Electron Dialog
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}

RulesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

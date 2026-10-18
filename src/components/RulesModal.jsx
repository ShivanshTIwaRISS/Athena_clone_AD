// src/components/RulesModal.jsx
import PropTypes from 'prop-types';

const RULES = [
  'Stay on the exam screen at all times during the assessment.',
  'Your webcam must remain enabled and clearly visible throughout.',
  'Automated snapshots of your webcam and exam window are recorded periodically.',
  'Do not use external assistance, notes, or open unauthorized applications.',
  'Assessment duration is 30 minutes with a live countdown timer. Click "Submit Exam" when finished, or the session will auto-submit when the 30-minute limit expires.',
  'All proctoring data is stored locally and securely on this machine only.',
];

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
    >
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'rgba(59,130,246,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span className="modal-title" id="rules-modal-title">Exam Rules &amp; Proctoring Policy</span>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close rules"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="rules-list">
            {RULES.map((rule, i) => (
              <div key={i} className="rule-item">
                <div className="rule-number">{i + 1}</div>
                <p className="rule-text">{rule}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Understood, Got It
          </button>
        </div>
      </div>
    </div>
  );
}

RulesModal.propTypes = {
  isOpen:  PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

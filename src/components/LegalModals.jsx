// src/components/LegalModals.jsx
// Institutional Terms of Service and Privacy Policy for Candidate Examination Platform
import PropTypes from 'prop-types';

export function TermsOfServiceModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="tos-title">
      <div className="modal-card legal-modal-card">
        <div className="modal-header">
          <div>
            <h2 id="tos-title" className="modal-title">Candidate Terms of Examination</h2>
            <p className="modal-sub">Code of Conduct and Integrity Regulations</p>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close dialog">
            &times;
          </button>
        </div>

        <div className="modal-body legal-modal-body">
          <section className="legal-section">
            <h3>1. Academic Integrity and Examination Conduct</h3>
            <p>
              Candidates are required to adhere to the highest standards of academic honesty. Unauthorized collaboration, possession or use of external notes, consulting third-party websites, AI assistants, secondary devices, or communication tools during an active assessment is strictly prohibited.
            </p>
          </section>

          <section className="legal-section">
            <h3>2. Secure Environment and Kiosk Enforcement</h3>
            <p>
              By launching an examination on the VEYRA terminal, the candidate consents to automated kiosk lockdown. System shortcuts, multi-finger gesture navigation, window switching, and clipboard access (copy, cut, paste) are disabled to protect test confidentiality. Attempting to bypass these controls constitutes an immediate examination irregularity.
            </p>
          </section>

          <section className="legal-section">
            <h3>3. Proctoring Telemetry and Flagged Violations</h3>
            <p>
              All candidate actions, including window focus events, full-screen transitions, and termination attempts, are recorded with cryptographic timestamps. Accumulating flags or unverified force quits will trigger formal administrative review and potential score invalidation.
            </p>
          </section>

          <section className="legal-section">
            <h3>4. Disqualification and Institutional Reporting</h3>
            <p>
              The administering institution reserves the right to terminate any active assessment session immediately upon detection of severe irregularities. Audit logs and recorded evidence will be transmitted to the institution&apos;s disciplinary board.
            </p>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Acknowledge and Close
          </button>
        </div>
      </div>
    </div>
  );
}

TermsOfServiceModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export function PrivacyPolicyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="modal-card legal-modal-card">
        <div className="modal-header">
          <div>
            <h2 id="privacy-title" className="modal-title">Biometric and Proctoring Privacy Policy</h2>
            <p className="modal-sub">Data Collection, Encryption, and Retention Guidelines</p>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close dialog">
            &times;
          </button>
        </div>

        <div className="modal-body legal-modal-body">
          <section className="legal-section">
            <h3>1. Purpose of Data Collection</h3>
            <p>
              VEYRA collects proctoring evidence exclusively to ensure test integrity and verify candidate identity. Automated webcam snapshots and screen captures are captured at designated intervals during the active examination stage.
            </p>
          </section>

          <section className="legal-section">
            <h3>2. Secure Storage and Restricted Access</h3>
            <p>
              All captured snapshots and telemetry audit files are saved in isolated, non-user-accessible storage on the authorized proctor server. Snapshots are never displayed publicly or shared with unauthorized third parties.
            </p>
          </section>

          <section className="legal-section">
            <h3>3. Data Retention and Automated Purging</h3>
            <p>
              Session evidence is retained for a maximum of 90 days following examination completion for institutional review purposes, after which all media files and session records are securely and permanently purged.
            </p>
          </section>

          <section className="legal-section">
            <h3>4. Candidate Rights</h3>
            <p>
              Candidates may request a copy of their session audit logs or raise inquiries regarding proctoring flags directly through their administering institutional authority.
            </p>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Understood and Close
          </button>
        </div>
      </div>
    </div>
  );
}

PrivacyPolicyModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

// src/components/CandidateDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { listExams, getMyAttempts } from '../services/api';

export default function CandidateDashboard({ currentUser, onStartExamSetup, onNavigate }) {
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsRes, attemptsRes] = await Promise.allSettled([
        listExams(),
        getMyAttempts(),
      ]);

      if (examsRes.status === 'fulfilled') {
        const raw = examsRes.value;
        const all = Array.isArray(raw) ? raw : raw?.exams || [];
        // Only show published/active exams to candidates
        setExams(all.filter((e) => e.status === 'active' || e.published));
      }
      if (attemptsRes.status === 'fulfilled') {
        const raw = attemptsRes.value;
        setAttempts(Array.isArray(raw) ? raw : raw?.attempts || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load candidate portal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="view-container animate-fade-in">
      {/* Welcome Banner */}
      <div className="candidate-welcome-banner mb-4">
        <div className="welcome-content">
          <div className="welcome-tag">CANDIDATE PORTAL</div>
          <h1 className="welcome-title">Welcome, {currentUser?.name || 'Candidate'}</h1>
          <p className="welcome-desc">
            Review your assigned examinations, verify system integrity readiness, and track your assessment history.
          </p>
        </div>
        <div className="welcome-meta-pill">
          <span className="dot dot-exam" />
          <span>Proctored Secure Session Active</span>
        </div>
      </div>

      {error && (
        <div className="banner banner-error mb-4">
          <span className="banner-icon">⚠️</span>
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>Retry</button>
        </div>
      )}

      {/* Available Assessments Section */}
      <div className="section-header mb-3">
        <div>
          <h2 className="section-title">Available Assessments</h2>
          <p className="section-subtitle">Exams ready for you to take right now</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="card loading-card mb-4">
          <div className="spinner" />
          <p className="text-muted mt-2">Checking available assessments...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="card empty-state-card text-center p-8 mb-4">
          <div className="empty-icon-circle mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 className="font-bold text-lg mb-1">No Active Exams Assigned</h3>
          <p className="text-muted text-sm">
            Check back later or contact your assessment administrator for scheduled exam access.
          </p>
        </div>
      ) : (
        <div className="grid-2-col mb-4">
          {exams.map((exam) => {
            const examId = exam.id || exam._id;
            return (
              <div key={examId} className="card exam-card-candidate">
                <div className="card-header pb-2">
                  <div className="d-flex align-center justify-between w-100">
                    <span className="badge badge-success">Active & Ready</span>
                    {exam.code && <span className="font-mono text-xs text-muted">CODE: {exam.code}</span>}
                  </div>
                </div>

                <div className="card-body pt-0">
                  <h3 className="font-bold text-lg mb-1 text-primary">{exam.title}</h3>
                  <p className="text-muted text-sm mb-3">
                    {exam.description || 'Standard timed proctored evaluation.'}
                  </p>

                  <div className="exam-meta-grid mb-4">
                    <div className="exam-meta-item">
                      <div className="exam-meta-val">{exam.durationMinutes || 60}m</div>
                      <div className="exam-meta-key">Duration</div>
                    </div>
                    <div className="exam-meta-item">
                      <div className="exam-meta-val">{exam.questions?.length || exam.questionCount || 20}</div>
                      <div className="exam-meta-key">Questions</div>
                    </div>
                    <div className="exam-meta-item">
                      <div className="exam-meta-val">{exam.passingScore || 60}%</div>
                      <div className="exam-meta-key">Passing Mark</div>
                    </div>
                    <div className="exam-meta-item">
                      <div className="exam-meta-val text-xs text-primary font-bold">Standard</div>
                      <div className="exam-meta-key">Proctoring</div>
                    </div>
                  </div>

                  <div className="proctor-pills mb-3">
                    <span className="badge badge-neutral text-xs">📷 Webcam Snapshots</span>
                    <span className="badge badge-neutral text-xs">🖥️ Fullscreen Security</span>
                    <span className="badge badge-neutral text-xs">🔒 Anti-Tab Switch</span>
                  </div>

                  <button
                    className="btn btn-primary w-100"
                    onClick={() => onStartExamSetup(exam)}
                  >
                    Start Pre-Exam Check →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Past Attempts Section */}
      <div className="section-header mb-3">
        <div>
          <h2 className="section-title">Your Assessment History</h2>
          <p className="section-subtitle">Scores and review of completed attempts</p>
        </div>
        {attempts.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('history')}>
            View All History →
          </button>
        )}
      </div>

      {attempts.length === 0 ? (
        <div className="card p-4 text-center text-muted">
          <p className="text-sm">You haven&apos;t completed any examinations yet.</p>
        </div>
      ) : (
        <div className="attempt-list">
          {attempts.slice(0, 3).map((att) => (
            <div key={att.id || att._id || att.sessionId} className="attempt-item">
              <div className="attempt-score-ring">
                <span className="attempt-score-val">{att.score ?? att.finalScore ?? 0}%</span>
                <span className="attempt-score-label">Score</span>
              </div>
              <div className="attempt-body">
                <div className="attempt-exam-title">{att.examTitle || 'Assessment'}</div>
                <div className="attempt-meta">
                  <span>📅 {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : 'Completed'}</span>
                  <span>⏱️ Duration: {att.timeTakenMinutes || att.durationMinutes || '—'} mins</span>
                  <span>🛡️ Verified Proctor Record</span>
                </div>
              </div>
              <span className={`badge ${(att.score || att.finalScore || 0) >= (att.passingScore || 60) ? 'badge-success' : 'badge-danger'}`}>
                {(att.score || att.finalScore || 0) >= (att.passingScore || 60) ? 'Passed' : 'Needs Retake'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

CandidateDashboard.propTypes = {
  currentUser: PropTypes.object,
  onStartExamSetup: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

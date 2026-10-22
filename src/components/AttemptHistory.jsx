// src/components/AttemptHistory.jsx
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getSessions } from '../services/api';

export default function AttemptHistory({ userId, onNavigate, onReviewSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSessions(userId);
      const list = Array.isArray(data) ? data : [];
      setSessions(list.filter((s) => s.status === 'submitted' || s.submittedAt));
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div className="history-container animate-fade-in">
      {/* Header */}
      <div className="d-flex align-center justify-between mb-4">
        <div className="history-header">
          <h1 className="history-title">Assessment History</h1>
          <p className="history-sub">Your previous completed exam attempts and scores.</p>
        </div>
        <div className="d-flex gap-3">
          <button type="button" className="btn btn-outline btn-sm" onClick={fetchHistory} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onNavigate('AVAILABLE_EXAMS')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error mb-3">
          <span>{error}</span>
          <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={fetchHistory}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 14px', width: 28, height: 28, borderWidth: 3 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading your attempts…</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && sessions.length === 0 && (
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="history-empty-text">No completed attempts yet</div>
          <p className="history-empty-sub">
            Exams you complete will appear here, under ID <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{userId || 'student'}</code>.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('AVAILABLE_EXAMS')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Start an Examination
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Session list */}
      {!loading && sessions.length > 0 && (
        <div className="history-list">
          {sessions.map((s) => {
            const total     = s.totalQuestions || s.attempted || 0;
            const correct   = s.correct   || 0;
            const accuracy  = total > 0 ? Math.round((correct / total) * 100) : 0;
            const passed    = accuracy >= 60;
            const date      = s.submittedAt
              ? new Date(s.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
              : 'Completed';

            return (
              <div
                key={s.sessionId}
                className="history-card"
                onClick={() => onReviewSession?.(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onReviewSession?.(s)}
              >
                <div className={`history-card-score ${passed ? 'pass' : 'fail'}`}>
                  <span>{accuracy}%</span>
                </div>

                <div className="history-card-body">
                  <div className="history-card-title">Computer Science &amp; Systems Assessment</div>
                  <div className="history-card-meta">
                    <span>{date}</span>
                    <span className="history-meta-dot" />
                    <span>{correct}/{total} correct</span>
                    <span className="history-meta-dot" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{s.sessionId?.slice(0, 16)}…</span>
                  </div>
                </div>

                <div className="history-card-action">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={(e) => { e.stopPropagation(); onReviewSession?.(s); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    Review
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

AttemptHistory.propTypes = {
  userId:          PropTypes.string,
  onNavigate:      PropTypes.func.isRequired,
  onReviewSession: PropTypes.func,
};

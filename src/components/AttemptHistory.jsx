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
          <button type="button" className="btn btn-outline btn-sm" onClick={fetchHistory} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onNavigate('AVAILABLE_EXAMS')}>
            ← Back
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
          <div className="history-empty-icon">📋</div>
          <div className="history-empty-text">No completed attempts yet</div>
          <p className="history-empty-sub">
            Exams you complete will appear here, under ID <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{userId || 'student'}</code>.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('AVAILABLE_EXAMS')}>
            Start an Examination →
          </button>
        </div>
      )}

      {/* Session list */}
      {!loading && sessions.length > 0 && (
        <div className="history-list">
          {sessions.map((s) => {
            const attempted = s.attempted || 0;
            const correct   = s.correct   || 0;
            const accuracy  = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
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
                    <span>{correct}/{attempted} correct</span>
                    <span className="history-meta-dot" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{s.sessionId?.slice(0, 16)}…</span>
                  </div>
                </div>

                <div className="history-card-action">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={(e) => { e.stopPropagation(); onReviewSession?.(s); }}
                  >
                    Review →
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

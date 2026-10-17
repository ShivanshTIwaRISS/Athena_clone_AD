// src/components/AttemptHistory.jsx
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getAllSessions, getMyAttempts, getSessionDetails } from '../services/api';

export default function AttemptHistory({ isAdmin = false, onNavigate: _onNavigate }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin ? await getAllSessions() : await getMyAttempts();
      const list = Array.isArray(data) ? data : data?.sessions || data?.attempts || [];
      setAttempts(list);
    } catch (err) {
      setError(err.message || 'Failed to retrieve assessment history');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function openDetails(sessionId) {
    if (!sessionId) return;
    setDetailLoading(true);
    try {
      const details = await getSessionDetails(sessionId);
      setSelectedSession(details);
    } catch {
      // Fallback to the object in state
      const fallback = attempts.find((a) => (a.sessionId || a.id || a._id) === sessionId);
      setSelectedSession(fallback);
    } finally {
      setDetailLoading(false);
    }
  }

  const filtered = attempts.filter((att) => {
    const title = (att.examTitle || 'Assessment').toLowerCase();
    const candidate = (att.userName || att.candidateName || att.userId || '').toLowerCase();
    const s = search.toLowerCase();
    return title.includes(s) || candidate.includes(s);
  });

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <div className="view-eyebrow">ASSESSMENT AUDIT LOGS</div>
          <h1 className="view-title">{isAdmin ? 'Candidate Session Records' : 'My Attempt History'}</h1>
          <p className="view-subtitle">
            {isAdmin
              ? 'Complete audit trails, proctoring snapshots, submission timings, and scores.'
              : 'Review your past performance, grades, and completed assessment results.'}
          </p>
        </div>
        <div className="view-actions">
          <button className="btn btn-secondary" onClick={fetchHistory} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="banner banner-error mb-4">
          <span className="banner-icon">⚠️</span>
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={fetchHistory}>Retry</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="input search-input"
            placeholder={isAdmin ? 'Search by candidate name or exam title...' : 'Search exams...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Attempts List */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-muted">
            <div className="spinner mb-2" />
            <p>Loading session logs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <p>No assessment attempts found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Session</th>
                  {isAdmin && <th>Candidate</th>}
                  <th>Assessment</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Proctor Snaps</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((att) => {
                  const sId = att.sessionId || att.id || att._id;
                  const score = att.score ?? att.finalScore;
                  const isPass = (score ?? 0) >= (att.passingScore || 60);

                  return (
                    <tr key={sId}>
                      <td className="font-mono text-xs text-muted">
                        {String(sId).slice(0, 8)}...
                      </td>
                      {isAdmin && (
                        <td className="font-semibold text-primary">
                          {att.userName || att.candidateName || att.userId || 'Candidate'}
                        </td>
                      )}
                      <td>{att.examTitle || 'General Assessment'}</td>
                      <td>
                        {score !== undefined ? (
                          <span className={`font-bold ${isPass ? 'text-positive' : 'text-danger'}`}>
                            {score}%
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${att.status === 'submitted' ? 'badge-success' : 'badge-warning'}`}>
                          {att.status || 'submitted'}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral text-xs font-mono">
                          📷 {att.snapshotCount || att.snaps?.length || 0} / 🖥️ {att.screenSnapshotCount || 0}
                        </span>
                      </td>
                      <td className="text-muted text-xs">
                        {att.submittedAt || att.createdAt
                          ? new Date(att.submittedAt || att.createdAt).toLocaleDateString()
                          : 'Recent'}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => openDetails(sId)}
                          disabled={detailLoading}
                        >
                          View Audit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Session Audit Details</h3>
              <button className="btn-modal-close" onClick={() => setSelectedSession(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="exam-meta-grid mb-3">
                <div className="exam-meta-item">
                  <div className="exam-meta-val text-accent">
                    {selectedSession.score ?? selectedSession.finalScore ?? '—'}%
                  </div>
                  <div className="exam-meta-key">Final Score</div>
                </div>
                <div className="exam-meta-item">
                  <div className="exam-meta-val">
                    {selectedSession.snapshotCount || selectedSession.snaps?.length || 0}
                  </div>
                  <div className="exam-meta-key">Camera Snaps</div>
                </div>
                <div className="exam-meta-item">
                  <div className="exam-meta-val">
                    {selectedSession.screenSnapshotCount || 0}
                  </div>
                  <div className="exam-meta-key">Screen Snaps</div>
                </div>
                <div className="exam-meta-item">
                  <div className="exam-meta-val text-sm font-bold">
                    {selectedSession.status || 'submitted'}
                  </div>
                  <div className="exam-meta-key">Status</div>
                </div>
              </div>

              <div className="d-flex flex-col gap-2 font-mono text-xs text-muted mb-3 p-3 bg-card-2 border-radius">
                <div>Session ID: {selectedSession.sessionId || selectedSession.id}</div>
                <div>Candidate: {selectedSession.userName || selectedSession.candidateName || selectedSession.userId}</div>
                <div>Exam: {selectedSession.examTitle || 'General Assessment'}</div>
                <div>Started: {selectedSession.startTime ? new Date(selectedSession.startTime).toLocaleString() : 'N/A'}</div>
                <div>Submitted: {selectedSession.submittedAt ? new Date(selectedSession.submittedAt).toLocaleString() : 'N/A'}</div>
              </div>

              {selectedSession.answers && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Answers Recorded:</h4>
                  <div className="compact-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    {Object.entries(selectedSession.answers).map(([qId, ans]) => (
                      <div key={qId} className="compact-list-item text-xs">
                        <span>Question #{qId}</span>
                        <span className="font-bold text-accent">Selected: Option {ans + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedSession(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AttemptHistory.propTypes = {
  isAdmin: PropTypes.bool,
  onNavigate: PropTypes.func.isRequired,
};

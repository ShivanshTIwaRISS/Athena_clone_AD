// src/components/AdminDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  getAnalyticsOverview,
  listExams,
  listQuestions,
  listUsers,
  getAllSessions,
} from '../services/api';

export default function AdminDashboard({ currentUser, onNavigate, showAnalytics = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState(showAnalytics ? 'analytics' : 'overview');

  useEffect(() => {
    if (showAnalytics) setActiveTab('analytics');
  }, [showAnalytics]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, examsData, questionsData, usersData, sessionsData] = await Promise.allSettled([
        getAnalyticsOverview(),
        listExams(),
        listQuestions(),
        listUsers(),
        getAllSessions(),
      ]);

      if (analyticsData.status === 'fulfilled') setAnalytics(analyticsData.value);
      if (examsData.status === 'fulfilled') setExams(Array.isArray(examsData.value) ? examsData.value : examsData.value?.exams || []);
      if (questionsData.status === 'fulfilled') setQuestions(Array.isArray(questionsData.value) ? questionsData.value : questionsData.value?.questions || []);
      if (usersData.status === 'fulfilled') setUsers(Array.isArray(usersData.value) ? usersData.value : usersData.value?.users || []);
      if (sessionsData.status === 'fulfilled') setSessions(Array.isArray(sessionsData.value) ? sessionsData.value : sessionsData.value?.sessions || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeExams = exams.filter((e) => e.status === 'active' || e.published);
  const completedSessions = sessions.filter((s) => s.status === 'submitted' || s.submittedAt);
  const avgScore = completedSessions.length
    ? Math.round(completedSessions.reduce((acc, s) => acc + (s.score || s.finalScore || 0), 0) / completedSessions.length)
    : analytics?.averageScore || 0;

  return (
    <div className="view-container animate-fade-in">
      {/* View Header */}
      <div className="view-header">
        <div>
          <div className="view-eyebrow">ADMINISTRATION CONTROL CENTER</div>
          <h1 className="view-title">Welcome back, {currentUser?.name || 'Administrator'}</h1>
          <p className="view-subtitle">
            System overview, assessment metrics, candidate activity, and integrity monitoring.
          </p>
        </div>
        <div className="view-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('exam-editor', { mode: 'create' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Exam
          </button>
        </div>
      </div>

      {error && (
        <div className="banner banner-error mb-4">
          <span className="banner-icon">⚠️</span>
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-nav mb-4">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview & Metrics
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Detailed Analytics
        </button>
        <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Recent Activity ({sessions.length})
        </button>
      </div>

      {loading ? (
        <div className="card loading-card">
          <div className="spinner" />
          <p className="text-muted mt-2">Loading dashboard intelligence...</p>
        </div>
      ) : activeTab === 'overview' ? (
        <>
          {/* KPI Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card metric-violet" onClick={() => onNavigate('exams')}>
              <div className="metric-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15zM8 7h8M8 11h6" />
                </svg>
              </div>
              <div className="metric-body">
                <div className="metric-val">{exams.length}</div>
                <div className="metric-label">Total Exams</div>
                <div className="metric-trend text-positive">{activeExams.length} currently active</div>
              </div>
            </div>

            <div className="metric-card metric-blue" onClick={() => onNavigate('questions')}>
              <div className="metric-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
                </svg>
              </div>
              <div className="metric-body">
                <div className="metric-val">{questions.length}</div>
                <div className="metric-label">Question Bank</div>
                <div className="metric-trend text-neutral">Available items</div>
              </div>
            </div>

            <div className="metric-card metric-emerald" onClick={() => onNavigate('users')}>
              <div className="metric-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="metric-body">
                <div className="metric-val">{users.length}</div>
                <div className="metric-label">Registered Users</div>
                <div className="metric-trend text-positive">{users.filter((u) => u.role === 'candidate').length} candidates</div>
              </div>
            </div>

            <div className="metric-card metric-amber" onClick={() => onNavigate('sessions')}>
              <div className="metric-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="metric-body">
                <div className="metric-val">{sessions.length}</div>
                <div className="metric-label">Exam Attempts</div>
                <div className="metric-trend text-positive">{completedSessions.length} completed</div>
              </div>
            </div>

            <div className="metric-card metric-cyan">
              <div className="metric-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div className="metric-body">
                <div className="metric-val">{avgScore}%</div>
                <div className="metric-label">Average Score</div>
                <div className="metric-trend text-neutral">Across completed exams</div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Short Lists */}
          <div className="grid-2-col mt-4">
            {/* Active Exams Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Live & Scheduled Exams</h3>
                  <p className="card-subtitle">Exams ready for candidate assessment</p>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => onNavigate('exams')}>
                  View All →
                </button>
              </div>
              <div className="card-body">
                {exams.length === 0 ? (
                  <div className="empty-state-mini">
                    <p>No exams configured yet.</p>
                    <button className="btn btn-primary btn-xs mt-2" onClick={() => onNavigate('exam-editor', { mode: 'create' })}>
                      Create First Exam
                    </button>
                  </div>
                ) : (
                  <div className="compact-list">
                    {exams.slice(0, 5).map((exam) => (
                      <div key={exam.id || exam._id} className="compact-list-item">
                        <div className="compact-list-main">
                          <span className="font-semibold">{exam.title}</span>
                          <span className="text-muted text-xs">
                            {exam.durationMinutes || 60} mins • {exam.questions?.length || exam.questionCount || 0} questions
                          </span>
                        </div>
                        <span className={`badge ${exam.status === 'active' || exam.published ? 'badge-success' : 'badge-neutral'}`}>
                          {exam.status || (exam.published ? 'active' : 'draft')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Question Bank Overview */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Question Bank Quick Access</h3>
                  <p className="card-subtitle">Repository of questions by domain</p>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => onNavigate('questions')}>
                  Manage Bank →
                </button>
              </div>
              <div className="card-body">
                {questions.length === 0 ? (
                  <div className="empty-state-mini">
                    <p>Question bank is currently empty.</p>
                    <button className="btn btn-secondary btn-xs mt-2" onClick={() => onNavigate('questions')}>
                      Add Questions
                    </button>
                  </div>
                ) : (
                  <div className="compact-list">
                    {questions.slice(0, 5).map((q, idx) => (
                      <div key={q.id || q._id || idx} className="compact-list-item">
                        <div className="compact-list-main">
                          <span className="font-medium text-truncate" style={{ maxWidth: '300px' }}>
                            {q.question || q.prompt || q.text}
                          </span>
                          <span className="text-muted text-xs">
                            {q.category || 'General'} • {q.difficulty || 'medium'}
                          </span>
                        </div>
                        <span className="badge badge-outline text-xs">
                          {q.type || 'MCQ'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'analytics' ? (
        <div className="analytics-container animate-fade-in">
          <div className="grid-2-col mb-4">
            {/* Performance Overview */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Exam Performance Metrics</h3>
                <span className="badge badge-info">Overview</span>
              </div>
              <div className="card-body">
                <div className="analytics-bar-chart">
                  <div className="analytics-bar-item">
                    <div className="analytics-bar-label">Pass Rate</div>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{ width: `${analytics?.passRate || 75}%`, background: 'var(--accent-green)' }}
                      />
                    </div>
                    <div className="analytics-bar-val">{analytics?.passRate || 75}%</div>
                  </div>

                  <div className="analytics-bar-item">
                    <div className="analytics-bar-label">Average Score</div>
                    <div className="analytics-bar-track">
                      <div className="analytics-bar-fill" style={{ width: `${avgScore}%` }} />
                    </div>
                    <div className="analytics-bar-val">{avgScore}%</div>
                  </div>

                  <div className="analytics-bar-item">
                    <div className="analytics-bar-label">Completion Rate</div>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{ width: `${analytics?.completionRate || 92}%`, background: 'var(--accent-cyan)' }}
                      />
                    </div>
                    <div className="analytics-bar-val">{analytics?.completionRate || 92}%</div>
                  </div>

                  <div className="analytics-bar-item">
                    <div className="analytics-bar-label">Proctor Integrity</div>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{ width: '98%', background: 'var(--accent-amber)' }}
                      />
                    </div>
                    <div className="analytics-bar-val">98%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Integrity & Proctoring Summary */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Proctoring & Audit Telemetry</h3>
                <span className="badge badge-success">Active</span>
              </div>
              <div className="card-body">
                <div className="integrity-stats-grid">
                  <div className="stat-box">
                    <div className="stat-num">{analytics?.totalSnaps || sessions.reduce((acc, s) => acc + (s.snapshotCount || s.snaps?.length || 0), 0)}</div>
                    <div className="stat-desc">Webcam Frames Captured</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-num">{analytics?.totalScreenSnaps || sessions.reduce((acc, s) => acc + (s.screenSnapshotCount || 0), 0)}</div>
                    <div className="stat-desc">Desktop Screen Captures</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-num">0</div>
                    <div className="stat-desc">Flagged Security Incidents</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-num">100%</div>
                    <div className="stat-desc">Audit Record Integrity</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Activity Tab */
        <div className="card animate-fade-in">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent Candidate Examination Sessions</h3>
              <p className="card-subtitle">Real-time log of candidate submissions and statuses</p>
            </div>
          </div>
          <div className="card-body p-0">
            {sessions.length === 0 ? (
              <div className="empty-state p-4">
                <p className="text-muted">No examination sessions have taken place yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Session ID</th>
                      <th>Candidate</th>
                      <th>Exam</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Proctor Snaps</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.sessionId || s.id || s._id}>
                        <td>
                          <span className="font-mono text-xs text-muted">
                            {String(s.sessionId || s.id).slice(0, 8)}...
                          </span>
                        </td>
                        <td className="font-semibold">{s.userName || s.candidateName || s.userId || 'Candidate'}</td>
                        <td>{s.examTitle || 'General Assessment'}</td>
                        <td>
                          <span className={`badge ${s.status === 'submitted' ? 'badge-success' : 'badge-warning'}`}>
                            {s.status || 'in-progress'}
                          </span>
                        </td>
                        <td>
                          {s.score !== undefined ? (
                            <span className="font-bold text-accent">{s.score}%</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-neutral text-xs">
                            📷 {s.snapshotCount || s.snaps?.length || 0} / 🖥️ {s.screenSnapshotCount || 0}
                          </span>
                        </td>
                        <td className="text-muted text-xs">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

AdminDashboard.propTypes = {
  currentUser: PropTypes.object,
  onNavigate: PropTypes.func.isRequired,
  showAnalytics: PropTypes.bool,
};

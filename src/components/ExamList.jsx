// src/components/ExamList.jsx
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { listExams, deleteExam, duplicateExam, setExamStatus } from '../services/api';

export default function ExamList({ onNavigate: _onNavigate, onCreateExam, onEditExam }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState({});

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listExams();
      setExams(Array.isArray(data) ? data : data?.exams || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve exams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  async function handleDelete(examId, examTitle) {
    if (!window.confirm(`Are you sure you want to delete "${examTitle}"? This cannot be undone.`)) return;
    setActionLoading((prev) => ({ ...prev, [examId]: true }));
    try {
      await deleteExam(examId);
      setExams((prev) => prev.filter((e) => (e.id || e._id) !== examId));
    } catch (err) {
      alert(`Failed to delete exam: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [examId]: false }));
    }
  }

  async function handleDuplicate(examId) {
    setActionLoading((prev) => ({ ...prev, [examId]: true }));
    try {
      await duplicateExam(examId);
      await fetchExams();
    } catch (err) {
      alert(`Failed to duplicate exam: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [examId]: false }));
    }
  }

  async function handleToggleStatus(examId, currentStatus) {
    const nextStatus = currentStatus === 'active' ? 'draft' : 'active';
    setActionLoading((prev) => ({ ...prev, [examId]: true }));
    try {
      await setExamStatus(examId, nextStatus);
      setExams((prev) =>
        prev.map((e) => ((e.id || e._id) === examId ? { ...e, status: nextStatus, published: nextStatus === 'active' } : e))
      );
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [examId]: false }));
    }
  }

  const filteredExams = exams.filter((e) => {
    const titleMatch = (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
                       (e.description || '').toLowerCase().includes(search.toLowerCase());
    const statusMatch = filterStatus === 'all' || (e.status || (e.published ? 'active' : 'draft')) === filterStatus;
    return titleMatch && statusMatch;
  });

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <div className="view-eyebrow">EXAMINATION MANAGEMENT</div>
          <h1 className="view-title">Assessment Blueprints</h1>
          <p className="view-subtitle">
            Configure examination schedules, rules, question sets, proctoring rigor, and candidate access.
          </p>
        </div>
        <div className="view-actions">
          <button className="btn btn-primary" onClick={onCreateExam}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create New Exam
          </button>
        </div>
      </div>

      {error && (
        <div className="banner banner-error mb-4">
          <span className="banner-icon">⚠️</span>
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={fetchExams}>Retry</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="input search-input"
            placeholder="Search exams by title or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input select-input"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active (Published)</option>
          <option value="draft">Draft (Unpublished)</option>
          <option value="archived">Archived</option>
        </select>

        <button className="btn btn-secondary" onClick={fetchExams} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="card loading-card">
          <div className="spinner" />
          <p className="text-muted mt-2">Loading assessments...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="card empty-state-card text-center p-8">
          <div className="empty-icon-circle mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="font-bold text-lg mb-1">No Examinations Found</h3>
          <p className="text-muted text-sm mb-4">
            {search ? 'Try adjusting your search criteria.' : 'Get started by creating your first assessment.'}
          </p>
          <button className="btn btn-primary" onClick={onCreateExam}>
            Create Assessment
          </button>
        </div>
      ) : (
        <div className="exam-list">
          {filteredExams.map((exam) => {
            const id = exam.id || exam._id;
            const isPublish = exam.status === 'active' || exam.published;
            const isBusy = actionLoading[id];

            return (
              <div key={id} className="exam-list-item">
                <div className="exam-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M9 15l2 2 4-4" />
                  </svg>
                </div>

                <div className="exam-list-body">
                  <div className="d-flex align-center gap-2">
                    <h3 className="exam-list-title">{exam.title}</h3>
                    <span className={`badge ${isPublish ? 'badge-success' : 'badge-neutral'}`}>
                      {isPublish ? 'Active' : 'Draft'}
                    </span>
                    {exam.code && <span className="badge badge-outline font-mono text-xs">Code: {exam.code}</span>}
                  </div>

                  <p className="text-muted text-sm mb-2">{exam.description || 'No description provided.'}</p>

                  <div className="exam-list-meta">
                    <span className="exam-meta-tag">
                      ⏱️ {exam.durationMinutes || 60} mins
                    </span>
                    <span className="exam-meta-tag">
                      📝 {exam.questions?.length || exam.questionCount || 0} questions
                    </span>
                    <span className="exam-meta-tag">
                      🎯 Pass: {exam.passingScore || 60}%
                    </span>
                    <span className="exam-meta-tag">
                      🛡️ Rigor: {exam.proctoringRigour || exam.proctoringRigor || 'standard'}
                    </span>
                  </div>
                </div>

                <div className="exam-list-actions">
                  <button
                    className={`btn btn-xs ${isPublish ? 'btn-secondary' : 'btn-success'}`}
                    onClick={() => handleToggleStatus(id, exam.status || (isPublish ? 'active' : 'draft'))}
                    disabled={isBusy}
                  >
                    {isPublish ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => onEditExam(exam)}
                    disabled={isBusy}
                  >
                    Edit
                  </button>

                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleDuplicate(id)}
                    disabled={isBusy}
                    title="Duplicate exam"
                  >
                    📋 Copy
                  </button>

                  <button
                    className="btn btn-danger-outline btn-xs"
                    onClick={() => handleDelete(id, exam.title)}
                    disabled={isBusy}
                    title="Delete exam"
                  >
                    🗑️
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

ExamList.propTypes = {
  onNavigate: PropTypes.func.isRequired,
  onCreateExam: PropTypes.func.isRequired,
  onEditExam: PropTypes.func.isRequired,
};

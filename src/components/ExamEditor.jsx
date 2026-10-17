// src/components/ExamEditor.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createExam, updateExam, listQuestions } from '../services/api';

export default function ExamEditor({ mode = 'create', initialExam = null, onDone, onCancel }) {
  const isEdit = mode === 'edit' && Boolean(initialExam?.id || initialExam?._id);

  const [form, setForm] = useState({
    title: initialExam?.title || '',
    code: initialExam?.code || '',
    description: initialExam?.description || '',
    durationMinutes: initialExam?.durationMinutes || 45,
    passingScore: initialExam?.passingScore || 60,
    status: initialExam?.status || (initialExam?.published ? 'active' : 'draft'),
    proctoringRigour: initialExam?.proctoringRigour || initialExam?.proctoringRigor || 'standard',
    cameraRequired: initialExam?.cameraRequired !== false,
    screenCaptureRequired: initialExam?.screenCaptureRequired !== false,
    cameraIntervalSeconds: initialExam?.cameraIntervalSeconds || 10,
    screenIntervalSeconds: initialExam?.screenIntervalSeconds || 10,
    randomizeQuestions: initialExam?.randomizeQuestions || false,
    allowReview: initialExam?.allowReview !== false,
    questions: initialExam?.questions || initialExam?.questionIds || [],
  });

  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [qSearch, setQSearch] = useState('');

  useEffect(() => {
    async function loadQ() {
      setLoadingQuestions(true);
      try {
        const data = await listQuestions();
        const list = Array.isArray(data) ? data : data?.questions || [];
        setAvailableQuestions(list);
      } catch (err) {
        console.error('Failed to load questions:', err);
      } finally {
        setLoadingQuestions(false);
      }
    }
    loadQ();
  }, []);

  function handleFieldChange(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  function toggleQuestion(qId) {
    setForm((prev) => {
      const exists = prev.questions.some((q) => (typeof q === 'object' ? (q.id || q._id) === qId : q === qId));
      if (exists) {
        return {
          ...prev,
          questions: prev.questions.filter((q) => (typeof q === 'object' ? (q.id || q._id) !== qId : q !== qId)),
        };
      } else {
        const questionObj = availableQuestions.find((q) => (q.id || q._id) === qId);
        return {
          ...prev,
          questions: [...prev.questions, questionObj || qId],
        };
      }
    });
  }

  function isQuestionSelected(qId) {
    return form.questions.some((q) => (typeof q === 'object' ? (q.id || q._id) === qId : q === qId));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Please provide an assessment title.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      durationMinutes: Number(form.durationMinutes) || 45,
      passingScore: Number(form.passingScore) || 60,
      cameraIntervalSeconds: Number(form.cameraIntervalSeconds) || 10,
      screenIntervalSeconds: Number(form.screenIntervalSeconds) || 10,
      // Map questions to IDs or question objects as expected by backend
      questions: form.questions.map((q) => (typeof q === 'object' ? (q.id || q._id) : q)),
    };

    try {
      if (isEdit) {
        await updateExam(initialExam.id || initialExam._id, payload);
      } else {
        await createExam(payload);
      }
      onDone();
    } catch (err) {
      setError(err.message || 'Failed to save exam blueprint');
    } finally {
      setSaving(false);
    }
  }

  const filteredAvailableQuestions = availableQuestions.filter((q) => {
    const text = (q.question || q.prompt || q.text || '').toLowerCase();
    const cat = (q.category || '').toLowerCase();
    const s = qSearch.toLowerCase();
    return text.includes(s) || cat.includes(s);
  });

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <div className="view-eyebrow">
            {isEdit ? 'ASSESSMENT CONFIGURATION' : 'NEW ASSESSMENT BLUEPRINT'}
          </div>
          <h1 className="view-title">
            {isEdit ? `Edit: ${initialExam.title}` : 'Design New Examination'}
          </h1>
          <p className="view-subtitle">
            Define timing, security constraints, passing benchmarks, and assign questions.
          </p>
        </div>
        <div className="view-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving Blueprint...' : isEdit ? 'Save Changes' : 'Create Blueprint'}
          </button>
        </div>
      </div>

      {error && (
        <div className="banner banner-error mb-4">
          <span className="banner-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="editor-layout">
        {/* Main Left Column */}
        <div className="editor-main">
          {/* Basic Details */}
          <div className="editor-section">
            <h3 className="editor-section-title">General Specifications</h3>
            <div className="form-group mb-3">
              <label className="form-label">Exam Title *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Advanced Operating Systems Certification 2026"
                value={form.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                required
              />
            </div>

            <div className="grid-2-col mb-3">
              <div className="form-group">
                <label className="form-label">Access Code / Identifier</label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="e.g. CS401-FINAL"
                  value={form.code}
                  onChange={(e) => handleFieldChange('code', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Publication Status</label>
                <select
                  className="input select-input"
                  value={form.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                >
                  <option value="draft">Draft (Hidden from candidates)</option>
                  <option value="active">Active (Available for taking)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description & Candidate Instructions</label>
              <textarea
                className="input"
                rows="3"
                placeholder="Brief guidelines, syllabus coverage, and candidate expectations..."
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
              />
            </div>
          </div>

          {/* Question Assignment */}
          <div className="editor-section">
            <div className="d-flex align-center justify-between mb-3">
              <div>
                <h3 className="editor-section-title mb-0">
                  Assigned Question Set ({form.questions.length})
                </h3>
                <p className="text-muted text-xs">Select questions from your institution repository</p>
              </div>
              <div className="search-input-wrap" style={{ maxWidth: '240px' }}>
                <input
                  type="text"
                  className="input search-input"
                  style={{ fontSize: '12px', padding: '6px 10px 6px 28px' }}
                  placeholder="Filter available..."
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                />
              </div>
            </div>

            {loadingQuestions ? (
              <div className="text-center p-4 text-muted">Loading question library...</div>
            ) : availableQuestions.length === 0 ? (
              <div className="empty-state-mini">
                <p>No questions found in the question bank.</p>
                <p className="text-xs text-muted">You can add questions via the Question Bank menu.</p>
              </div>
            ) : (
              <div className="question-picker-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {filteredAvailableQuestions.map((q, idx) => {
                  const qId = q.id || q._id || idx;
                  const selected = isQuestionSelected(qId);
                  return (
                    <div
                      key={qId}
                      className={`question-list-item cursor-pointer ${selected ? 'border-primary' : ''}`}
                      onClick={() => toggleQuestion(qId)}
                      style={{
                        background: selected ? 'rgba(124,58,237,0.06)' : undefined,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      <div className="q-list-body">
                        <div className="q-list-text">{q.question || q.prompt || q.text}</div>
                        <div className="q-list-meta">
                          <span className="q-list-tag">{q.category || 'General'}</span>
                          <span className="q-list-tag">{q.difficulty || 'medium'}</span>
                          <span className="q-list-tag">{q.options?.length || 4} options</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Settings Panel */}
        <div className="editor-panel">
          {/* Timing & Scoring */}
          <div className="editor-section">
            <h3 className="editor-section-title">Timing & Scoring</h3>
            <div className="form-group mb-3">
              <label className="form-label">Duration (Minutes)</label>
              <input
                type="number"
                min="5"
                max="360"
                className="input"
                value={form.durationMinutes}
                onChange={(e) => handleFieldChange('durationMinutes', e.target.value)}
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Passing Benchmark (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                className="input"
                value={form.passingScore}
                onChange={(e) => handleFieldChange('passingScore', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.randomizeQuestions}
                  onChange={(e) => handleFieldChange('randomizeQuestions', e.target.checked)}
                />
                <span>Randomize Question Order</span>
              </label>
            </div>

            <div className="form-group mt-2">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.allowReview}
                  onChange={(e) => handleFieldChange('allowReview', e.target.checked)}
                />
                <span>Allow Results & Answers Review</span>
              </label>
            </div>
          </div>

          {/* Proctoring & Security */}
          <div className="editor-section">
            <h3 className="editor-section-title">Proctoring Rigor</h3>
            <div className="form-group mb-3">
              <label className="form-label">Security Protocol Level</label>
              <select
                className="input select-input"
                value={form.proctoringRigour}
                onChange={(e) => handleFieldChange('proctoringRigour', e.target.value)}
              >
                <option value="lenient">Lenient (Honor Code)</option>
                <option value="standard">Standard (Webcam + Screen)</option>
                <option value="strict">Strict (High-frequency captures)</option>
              </select>
            </div>

            <div className="form-group mb-2">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.cameraRequired}
                  onChange={(e) => handleFieldChange('cameraRequired', e.target.checked)}
                />
                <span>Candidate Webcam Snaps</span>
              </label>
            </div>

            <div className="form-group mb-3">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.screenCaptureRequired}
                  onChange={(e) => handleFieldChange('screenCaptureRequired', e.target.checked)}
                />
                <span>Desktop Screen Auditing</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label text-xs">Snap Interval (Seconds)</label>
              <input
                type="number"
                min="5"
                max="60"
                className="input"
                value={form.cameraIntervalSeconds}
                onChange={(e) => handleFieldChange('cameraIntervalSeconds', e.target.value)}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

ExamEditor.propTypes = {
  mode: PropTypes.string,
  initialExam: PropTypes.object,
  onDone: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

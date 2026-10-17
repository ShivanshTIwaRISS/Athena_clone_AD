// src/components/QuestionBank.jsx
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
} from '../services/api';

const DEFAULT_NEW_QUESTION = {
  question: '',
  category: 'General',
  difficulty: 'medium',
  type: 'mcq',
  options: ['', '', '', ''],
  correctAnswer: 0,
  explanation: '',
};

export default function QuestionBank({ onNavigate: _onNavigate }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [modalForm, setModalForm] = useState(DEFAULT_NEW_QUESTION);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listQuestions({
        search: search || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
      });
      setQuestions(Array.isArray(data) ? data : data?.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve questions');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, difficultyFilter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const categories = Array.from(new Set(questions.map((q) => q.category).filter(Boolean)));

  function openCreateModal() {
    setEditingQuestion(null);
    setModalForm(DEFAULT_NEW_QUESTION);
    setModalError(null);
    setIsModalOpen(true);
  }

  function openEditModal(q) {
    setEditingQuestion(q);
    setModalForm({
      question: q.question || q.prompt || q.text || '',
      category: q.category || 'General',
      difficulty: q.difficulty || 'medium',
      type: q.type || 'mcq',
      options: Array.isArray(q.options) && q.options.length ? q.options : ['', '', '', ''],
      correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
      explanation: q.explanation || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  }

  function handleOptionChange(index, value) {
    setModalForm((prev) => {
      const newOpts = [...prev.options];
      newOpts[index] = value;
      return { ...prev, options: newOpts };
    });
  }

  async function handleSaveQuestion(e) {
    e.preventDefault();
    if (!modalForm.question.trim()) {
      setModalError('Please enter the question prompt.');
      return;
    }
    if (modalForm.options.some((opt) => !opt.trim())) {
      setModalError('Please fill in all options.');
      return;
    }

    setModalSaving(true);
    setModalError(null);

    const payload = {
      ...modalForm,
      correctAnswer: Number(modalForm.correctAnswer),
    };

    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id || editingQuestion._id, payload);
      } else {
        await createQuestion(payload);
      }
      setIsModalOpen(false);
      fetchQuestions();
    } catch (err) {
      setModalError(err.message || 'Failed to save question');
    } finally {
      setModalSaving(false);
    }
  }

  async function handleDeleteQuestion(qId, prompt) {
    if (!window.confirm(`Delete question: "${(prompt || '').slice(0, 50)}..."?`)) return;
    try {
      await deleteQuestion(qId);
      setQuestions((prev) => prev.filter((q) => (q.id || q._id) !== qId));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  async function handleImportJson(e) {
    e.preventDefault();
    setImportLoading(true);
    try {
      const parsed = JSON.parse(importJson);
      const items = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('JSON must be an array of question objects or have a "questions" array.');
      }
      await importQuestions(items);
      setIsImportOpen(false);
      setImportJson('');
      fetchQuestions();
    } catch (err) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <div className="view-eyebrow">ASSESSMENT REPOSITORY</div>
          <h1 className="view-title">Question Bank</h1>
          <p className="view-subtitle">
            Curate, organize, and import items across diverse subjects and cognitive levels.
          </p>
        </div>
        <div className="view-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setIsImportOpen(true)}>
            📥 Import JSON
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Question
          </button>
        </div>
      </div>

      {error && (
        <div className="banner banner-error mb-4">
          <span className="banner-icon">⚠️</span>
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={fetchQuestions}>Retry</button>
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
            placeholder="Search questions by text or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input select-input"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: '150px' }}
        >
          <option value="all">All Domains</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          className="input select-input"
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          style={{ width: '140px' }}
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <button className="btn btn-secondary" onClick={fetchQuestions} disabled={loading}>
          Refresh
        </button>
      </div>

      {/* Question List */}
      {loading ? (
        <div className="card loading-card">
          <div className="spinner" />
          <p className="text-muted mt-2">Loading items...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="card empty-state-card text-center p-8">
          <h3 className="font-bold text-lg mb-1">No Questions Found</h3>
          <p className="text-muted text-sm mb-4">Add your first question or import a batch from JSON.</p>
          <button className="btn btn-primary" onClick={openCreateModal}>Create Question</button>
        </div>
      ) : (
        <div className="question-list">
          {questions.map((q, idx) => {
            const qId = q.id || q._id || idx;
            const prompt = q.question || q.prompt || q.text;
            return (
              <div key={qId} className="question-list-item">
                <div className="q-list-num">{idx + 1}</div>
                <div className="q-list-body">
                  <div className="q-list-text">{prompt}</div>
                  <div className="q-list-meta">
                    <span className="q-list-tag">📂 {q.category || 'General'}</span>
                    <span className="q-list-tag">⚡ {q.difficulty || 'medium'}</span>
                    <span className="q-list-tag">
                      {q.options?.length || 4} options • Correct: Opt {(q.correctAnswer ?? 0) + 1}
                    </span>
                  </div>
                </div>
                <div className="q-list-actions">
                  <button className="btn btn-secondary btn-xs" onClick={() => openEditModal(q)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-danger-outline btn-xs"
                    onClick={() => handleDeleteQuestion(qId, prompt)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Question Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingQuestion ? 'Edit Question' : 'Create New Assessment Item'}
              </h3>
              <button className="btn-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            {modalError && (
              <div className="banner banner-error mb-3">
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuestion}>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label className="form-label">Question Text *</label>
                  <textarea
                    className="input"
                    rows="3"
                    placeholder="Enter the complete question prompt..."
                    value={modalForm.question}
                    onChange={(e) => setModalForm({ ...modalForm, question: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-2-col mb-3">
                  <div className="form-group">
                    <label className="form-label">Category / Subject</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Operating Systems"
                      value={modalForm.category}
                      onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select
                      className="input select-input"
                      value={modalForm.difficulty}
                      onChange={(e) => setModalForm({ ...modalForm, difficulty: e.target.value })}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Options (Select radio for correct answer)</label>
                  <div className="d-flex flex-col gap-2">
                    {modalForm.options.map((opt, oIdx) => (
                      <div key={oIdx} className="d-flex align-center gap-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={Number(modalForm.correctAnswer) === oIdx}
                          onChange={() => setModalForm({ ...modalForm, correctAnswer: oIdx })}
                          style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                        />
                        <span className="font-mono text-xs text-muted" style={{ width: '20px' }}>
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <input
                          type="text"
                          className="input"
                          style={{ flex: 1 }}
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)} text...`}
                          value={opt}
                          onChange={(e) => handleOptionChange(oIdx, e.target.value)}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Explanation / Reference</label>
                  <textarea
                    className="input"
                    rows="2"
                    placeholder="Why this answer is correct (shown in review if enabled)..."
                    value={modalForm.explanation}
                    onChange={(e) => setModalForm({ ...modalForm, explanation: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalSaving}>
                  {modalSaving ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Bulk Import Assessment Items</h3>
              <button className="btn-modal-close" onClick={() => setIsImportOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleImportJson}>
              <div className="modal-body">
                <p className="text-muted text-xs mb-2">
                  Paste JSON array of questions. Format: <code>[{`{"question": "...", "options": ["..."], "correctAnswer": 0, "category": "..."}`}]</code>
                </p>
                <textarea
                  className="input font-mono text-xs"
                  rows="10"
                  placeholder="Paste JSON here..."
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsImportOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={importLoading}>
                  {importLoading ? 'Importing...' : 'Run Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

QuestionBank.propTypes = {
  onNavigate: PropTypes.func.isRequired,
};

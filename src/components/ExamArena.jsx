// src/components/ExamArena.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  getQuestionById,
  submitAnswer,
  getSessionDetails,
  submitExam,
} from '../services/api';

export default function ExamArena({
  sessionId,
  questionsList,
  videoRef,
  timer,
  snapshotCount,
  onExamSubmitted,
  onOpenRules,
}) {
  // Navigation & current question state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  // Persistent Draft/Selected Answers across all questions: { [questionId]: optionIndex }
  const [draftAnswers, setDraftAnswers] = useState({});
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // 'saving' | 'saved' | 'saved-local' | null

  // Live session state (from GET /exam/session/:sessionId)
  const [sessionData, setSessionData] = useState(null);
  const [syncingSession, setSyncingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Submit confirmation modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);

  // Filter for question palette: 'all' | 'unanswered' | 'answered'
  const [paletteFilter, setPaletteFilter] = useState('all');

  const currentQMeta = questionsList[currentQuestionIndex] || null;

  // Load question data when current question index changes (GET /exam/mcq/:id)
  useEffect(() => {
    let isMounted = true;
    const qId = currentQMeta?.id;
    if (!qId) return;

    async function fetchQuestion() {
      try {
        setLoadingQuestion(true);
        setErrorMessage(null);
        setAutoSaveStatus(null);
        const data = await getQuestionById(qId);
        if (isMounted) {
          setActiveQuestion(data);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to fetch question details');
        }
      } finally {
        if (isMounted) {
          setLoadingQuestion(false);
        }
      }
    }

    fetchQuestion();

    return () => {
      isMounted = false;
    };
  }, [currentQMeta?.id]);

  // Initial session progress load (GET /exam/session/:sessionId)
  useEffect(() => {
    let isMounted = true;
    if (!sessionId) return;

    async function fetchSession() {
      try {
        setSyncingSession(true);
        const data = await getSessionDetails(sessionId);
        if (isMounted) {
          setSessionData(data);
          // Initialize draft answers with existing session answers
          if (data.answers && Array.isArray(data.answers)) {
            const initialMap = {};
            data.answers.forEach((ans) => {
              initialMap[ans.questionId] = ans.selectedAnswer;
            });
            setDraftAnswers((prev) => ({ ...initialMap, ...prev }));
          }
        }
      } catch (err) {
        console.error('Failed to sync session progress:', err);
      } finally {
        if (isMounted) {
          setSyncingSession(false);
        }
      }
    }

    fetchSession();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  /**
   * Manual Refresh of Session Data (GET /exam/session/:sessionId)
   */
  const handleManualSync = async () => {
    if (!sessionId) return;
    try {
      setSyncingSession(true);
      const data = await getSessionDetails(sessionId);
      setSessionData(data);
    } catch (err) {
      console.error('Failed to sync session progress:', err);
    } finally {
      setSyncingSession(false);
    }
  };

  // Check if current question has recorded answer in backend
  const answeredRecord = sessionData?.answers?.find(
    (ans) => ans.questionId === currentQMeta?.id
  );

  // Active selected option is candidate's current draft choice or recorded answer
  const currentQId = currentQMeta?.id;
  const selectedOption = (currentQId !== undefined && draftAnswers[currentQId] !== undefined)
    ? draftAnswers[currentQId]
    : (answeredRecord ? answeredRecord.selectedAnswer : null);

  /**
   * Handle Option Selection with Auto-Save & Changeable Options
   * 1. Updates persistent draft answers map across questions
   * 2. Auto-saves directly to backend (updates answer if already selected)
   * 3. Candidate can change their choice anytime during the test
   */
  const handleOptionSelect = async (optIndex) => {
    if (!activeQuestion || !sessionId) return;

    const qId = activeQuestion.id;

    // 1. Immediately update draft map in frontend state for instant UI update
    setDraftAnswers((prev) => ({
      ...prev,
      [qId]: optIndex,
    }));

    // 2. Automatically save/update in backend via POST /exam/answer
    try {
      setAutoSaveStatus('saving');
      setErrorMessage(null);

      await submitAnswer(sessionId, qId, optIndex);

      setAutoSaveStatus('saved');

      // Refresh live backend session state
      const updatedSession = await getSessionDetails(sessionId);
      setSessionData(updatedSession);
    } catch (err) {
      console.warn(`Auto-save update note: ${err.message}`);
      // Stored locally in draftAnswers and will be synced at final submit
      setAutoSaveStatus('saved-local');
    }
  };

  /**
   * Handle Final Exam Submission (POST /exam/submit)
   * Flushes all current selected/drafted options to backend before finalizing
   */
  const handleFinalSubmit = async () => {
    if (!sessionId) return;
    try {
      setIsSubmittingFinal(true);
      setErrorMessage(null);

      // 1. Auto-flush all draft answers to backend ensuring latest selections are saved
      const currentAnswers = sessionData?.answers || [];
      const backendAnswerMap = new Map(currentAnswers.map((a) => [a.questionId, a.selectedAnswer]));

      for (const [qIdStr, optIdx] of Object.entries(draftAnswers)) {
        const qId = Number(qIdStr);
        if (optIdx !== null && optIdx !== undefined) {
          // If not in backend or option changed, update it
          if (backendAnswerMap.get(qId) !== optIdx) {
            try {
              await submitAnswer(sessionId, qId, optIdx);
            } catch (err) {
              console.warn(`Saving question ${qId} before submission:`, err);
            }
          }
        }
      }

      // 2. Finalize exam in backend (POST /exam/submit)
      const response = await submitExam(sessionId);
      const finalSession = await getSessionDetails(sessionId);

      onExamSubmitted({
        result: response.result,
        session: finalSession,
      });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit exam.');
      setIsSubmittingFinal(false);
      setShowSubmitModal(false);
    }
  };

  const answeredQuestionIds = new Set(
    sessionData?.answers?.map((ans) => ans.questionId) || []
  );

  // Consider a question answered if selected in draft or confirmed in backend
  const activeAnsweredOrDraftIds = new Set([
    ...answeredQuestionIds,
    ...Object.keys(draftAnswers)
      .filter((k) => draftAnswers[k] !== null && draftAnswers[k] !== undefined)
      .map(Number),
  ]);

  const filteredQuestions = questionsList.filter((q) => {
    const isAnswered = activeAnsweredOrDraftIds.has(q.id);
    if (paletteFilter === 'answered') return isAnswered;
    if (paletteFilter === 'unanswered') return !isAnswered;
    return true;
  });

  const totalCount = questionsList.length;
  const answeredCount = activeAnsweredOrDraftIds.size;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div className="exam-arena-container">
      {/* Top Telemetry & Control Bar */}
      <div className="arena-top-bar">
        <div className="telemetry-left">
          <div className="session-id-pill" title="Active Exam Session">
            <span className="pill-dot"></span>
            <span className="session-label">Session:</span>
            <code>{sessionId}</code>
          </div>
          <div className="progress-summary">
            <span>Answered: <strong>{answeredCount}</strong> of {totalCount}</span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span className="progress-pct">{progressPercent}%</span>
          </div>
        </div>

        <div className="telemetry-right">
          <button
            type="button"
            className="btn btn-outline btn-sm sync-btn"
            onClick={handleManualSync}
            disabled={syncingSession}
            title="Fetch latest session state from GET /exam/session/:sessionId"
          >
            {syncingSession ? 'Syncing...' : '🔄 Sync Progress'}
          </button>

          <button
            type="button"
            className="btn btn-danger btn-sm submit-trigger-btn"
            onClick={() => setShowSubmitModal(true)}
          >
            Finish & Submit Exam
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="alert-banner error-banner">
          <span>⚠️ {errorMessage}</span>
          <button type="button" className="close-inline" onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}

      {/* Main Layout: 3 Columns on desktop */}
      <div className="arena-main-grid">
        {/* Left Column: Question Palette Navigation */}
        <aside className="question-palette-sidebar">
          <div className="palette-header">
            <h3>Question Palette</h3>
            <span className="palette-count">{totalCount} Total</span>
          </div>

          <div className="palette-filters">
            <button
              type="button"
              className={`filter-chip ${paletteFilter === 'all' ? 'active' : ''}`}
              onClick={() => setPaletteFilter('all')}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              className={`filter-chip ${paletteFilter === 'unanswered' ? 'active' : ''}`}
              onClick={() => setPaletteFilter('unanswered')}
            >
              Unanswered ({totalCount - answeredCount})
            </button>
            <button
              type="button"
              className={`filter-chip ${paletteFilter === 'answered' ? 'active' : ''}`}
              onClick={() => setPaletteFilter('answered')}
            >
              Done ({answeredCount})
            </button>
          </div>

          <div className="palette-grid">
            {filteredQuestions.map((q) => {
              const originalIndex = questionsList.findIndex((item) => item.id === q.id);
              const isSelected = draftAnswers[q.id] !== undefined && draftAnswers[q.id] !== null;
              const isConfirmed = answeredQuestionIds.has(q.id);
              const isAnswered = isSelected || isConfirmed;
              const isCurrent = originalIndex === currentQuestionIndex;

              return (
                <button
                  key={q.id}
                  type="button"
                  className={`palette-item-btn ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : 'unanswered'}`}
                  onClick={() => setCurrentQuestionIndex(originalIndex)}
                  title={`Question ${originalIndex + 1}: ${isAnswered ? 'Answered / Selected (Click to view or change)' : 'Not Answered'}`}
                >
                  <span className="q-number">{originalIndex + 1}</span>
                  {isAnswered && <span className="check-mark">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="palette-legend">
            <div className="legend-item">
              <span className="legend-chip chip-current"></span>
              <span>Current</span>
            </div>
            <div className="legend-item">
              <span className="legend-chip chip-answered"></span>
              <span>Answered (Changeable)</span>
            </div>
            <div className="legend-item">
              <span className="legend-chip chip-unanswered"></span>
              <span>Unanswered</span>
            </div>
          </div>
        </aside>

        {/* Center Column: Question Detail & Options Workspace */}
        <main className="question-workspace">
          {loadingQuestion ? (
            <div className="workspace-loading">
              <div className="spinner"></div>
              <p>Fetching Question {currentQuestionIndex + 1} from backend...</p>
            </div>
          ) : activeQuestion ? (
            <div className="question-card">
              {/* Question Top Meta */}
              <div className="q-card-header">
                <div className="q-badge">
                  Question {currentQuestionIndex + 1} of {totalCount}
                </div>
                <div className="q-status-badge">
                  {selectedOption !== null ? (
                    <span className="tag-autosaved">
                      ⚡ Option {String.fromCharCode(65 + selectedOption)} Selected (Auto-saved)
                    </span>
                  ) : (
                    <span className="tag-open">✏️ Select an Option</span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="q-text-box">
                <h2>{activeQuestion.question}</h2>
              </div>

              {/* Multiple Choice Options (Fully Interactive & Changeable anytime) */}
              <div className="options-container">
                {activeQuestion.options?.map((optionText, optIndex) => {
                  const isSelected = selectedOption === optIndex;
                  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
                  const letter = optionLetters[optIndex] || `${optIndex + 1}`;

                  return (
                    <label
                      key={optIndex}
                      className={`option-card ${isSelected ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`question-${activeQuestion.id}-options`}
                        checked={isSelected}
                        onChange={() => handleOptionSelect(optIndex)}
                        className="option-radio-input"
                      />
                      <div className="option-letter-badge">{letter}</div>
                      <div className="option-content-text">{optionText}</div>
                      {isSelected && (
                        <div className="option-autosaved-badge">✓ Selected</div>
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Auto-save status feedback banner */}
              {autoSaveStatus === 'saving' && (
                <div className="auto-save-banner banner-saving">
                  <span className="spinner-sm"></span> Updating answer in backend...
                </div>
              )}
              {autoSaveStatus === 'saved' && (
                <div className="auto-save-banner banner-saved">
                  ✓ Answer auto-saved to backend (You can change your selection anytime).
                </div>
              )}

              {/* Action Toolbar */}
              <div className="q-action-toolbar">
                <div className="nav-actions-left">
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={currentQuestionIndex === totalCount - 1}
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                  >
                    Next →
                  </button>
                </div>

                <div className="nav-actions-right">
                  {selectedOption !== null ? (
                    <div className="autosaved-note">
                      ⚡ Answer saved • Click any option to switch answer
                    </div>
                  ) : (
                    <div className="hint-note">
                      Click any option above to select (auto-saves instantly)
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="workspace-empty">
              <p>Select a question from the palette on the left.</p>
            </div>
          )}
        </main>

        {/* Right Column: Live Proctor & Real-Time Stats */}
        <aside className="proctor-sidebar">
          {/* Live Webcam Widget */}
          <div className="proctor-card camera-proctor-card">
            <div className="proctor-card-header">
              <div className="live-rec-indicator">
                <span className="rec-dot"></span>
                <span>LIVE PROCTORING</span>
              </div>
              <span className="snapshot-tag">{snapshotCount} snaps</span>
            </div>

            <div className="proctor-video-wrap">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="proctor-feed-element"
              />
            </div>

            <div className="proctor-feed-caption">
              <span>Automated camera captures saved to <code>app/user-camera-snap/</code></span>
            </div>
          </div>

          {/* Real-time Session Metrics Card */}
          <div className="proctor-card session-telemetry-card">
            <h4>Live Session Stats</h4>
            <div className="stats-mini-grid">
              <div className="stat-box">
                <span className="stat-label">Answered</span>
                <span className="stat-val text-green">{answeredCount}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Remaining</span>
                <span className="stat-val">{totalCount - answeredCount}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Elapsed</span>
                <span className="stat-val">{timer || '0'}s</span>
              </div>
            </div>
          </div>

          {/* Quick Rules Button */}
          <div className="proctor-card rules-card">
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={onOpenRules}
            >
              📜 Review Exam Rules
            </button>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal Before Final Submission */}
      {showSubmitModal && (
        <div className="modal-backdrop" onClick={() => !isSubmittingFinal && setShowSubmitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">⚠️</div>
                <div>
                  <h3>Confirm Exam Submission</h3>
                  <p className="modal-subtitle">Ready to finalize your assessment?</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                disabled={isSubmittingFinal}
                onClick={() => setShowSubmitModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="submit-summary-box">
                <div className="summary-item">
                  <span>Total Questions:</span>
                  <strong>{totalCount}</strong>
                </div>
                <div className="summary-item">
                  <span>Answered / Selected Questions:</span>
                  <strong className="text-green">{answeredCount} (Auto-saved)</strong>
                </div>
                <div className="summary-item">
                  <span>Unanswered Questions:</span>
                  <strong className={totalCount - answeredCount > 0 ? 'text-amber' : ''}>
                    {totalCount - answeredCount}
                  </strong>
                </div>
              </div>

              {answeredCount > 0 && (
                <div className="auto-save-notice">
                  ⚡ <strong>Auto-Save Active:</strong> All your latest selected choices will be finalized and evaluated on the backend server.
                </div>
              )}

              {totalCount - answeredCount > 0 && (
                <p className="warning-callout">
                  ⚠️ You still have <strong>{totalCount - answeredCount} unanswered</strong> questions. Once submitted, the exam will be permanently closed.
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                disabled={isSubmittingFinal}
                onClick={() => setShowSubmitModal(false)}
              >
                Continue Exam
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={isSubmittingFinal}
                onClick={handleFinalSubmit}
              >
                {isSubmittingFinal ? (
                  <span className="btn-loading">
                    <span className="spinner"></span> Finalizing & Evaluating...
                  </span>
                ) : (
                  'Yes, Submit Exam'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ExamArena.propTypes = {
  sessionId: PropTypes.string.isRequired,
  questionsList: PropTypes.array.isRequired,
  videoRef: PropTypes.shape({ current: PropTypes.any }),
  timer: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  snapshotCount: PropTypes.number.isRequired,
  onExamSubmitted: PropTypes.func.isRequired,
  onOpenRules: PropTypes.func.isRequired,
};

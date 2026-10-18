// src/components/ExamArena.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  getQuestionById,
  submitAnswer,
  getSessionDetails,
  submitExam,
  logProctorFlag,
} from '../services/api';

function formatTime(seconds) {
  const s = Math.floor(Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}

const optLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

// Pseudo-random option shuffling seeded by (sessionId + questionId)
// Ensures randomized option order per candidate, while remaining stable during Back/Next navigation
function shuffleOptions(options, seedKey) {
  if (!Array.isArray(options)) return [];
  const paired = options.map((text, originalIndex) => ({ text, originalIndex }));
  let seed = 0;
  for (let i = 0; i < seedKey.length; i++) {
    seed = (seed + seedKey.charCodeAt(i) * 31) % 1000000007;
  }
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const shuffled = [...paired];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ExamArena({
  sessionId,
  questionsList,
  videoRef,
  mediaStream,
  timer,
  snapshotCount,
  screenSnapshotCount = 0,
  onExamSubmitted,
  onOpenRules,
}) {
  // Bind stream to video element
  useEffect(() => {
    if (videoRef?.current && mediaStream && videoRef.current.srcObject !== mediaStream) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => {});
    }
  }, [videoRef, mediaStream]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [loadingQ, setLoadingQ] = useState(false);

  // Mark for Review state (Set of question IDs)
  const [markedIds, setMarkedIds] = useState(new Set());

  // Proctoring Violations / Flags
  const [flags, setFlags] = useState([]);
  const [activeViolation, setActiveViolation] = useState(null);
  const lastViolationTimeRef = useRef(0);

  const [draftAnswers, setDraftAnswers] = useState({});
  const [saveStatus, setSaveStatus] = useState(null); // 'saving'|'saved'|null

  const [sessionData, setSessionData] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentMeta = questionsList[currentIndex] || null;

  // Toggle Mark for Review
  const toggleMarkForReview = (qId) => {
    if (!qId) return;
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  // Trigger and record a proctoring violation / cheating flag
  const recordViolation = useCallback(
    async (violation) => {
      const now = Date.now();
      // Debounce violations within 2 seconds
      if (now - lastViolationTimeRef.current < 2000) return;
      lastViolationTimeRef.current = now;

      const flagEntry = {
        type: violation.type || 'SUSPICIOUS_ACTIVITY',
        message: violation.message || 'Suspicious activity detected',
        timestamp: new Date().toLocaleTimeString(),
      };

      setFlags((prev) => [...prev, flagEntry]);
      setActiveViolation(flagEntry);

      if (sessionId) {
        try {
          await logProctorFlag(
            sessionId,
            flagEntry.type,
            flagEntry.message,
            { questionIndex: currentIndex + 1 }
          );
        } catch (e) {
          console.warn('[VEYRA] Failed to record flag to backend:', e.message);
        }
      }
    },
    [sessionId, currentIndex]
  );

  // Listen for browser window focus loss and page visibility changes
  useEffect(() => {
    const handleBlur = () => {
      recordViolation({
        type: 'WINDOW_BLUR',
        message: 'Window focus lost / application switch detected. Navigating away during exams is prohibited.',
      });
    };

    const handleVisibility = () => {
      if (document.hidden) {
        recordViolation({
          type: 'TAB_SWITCH',
          message: 'Exam tab was hidden or covered. All tab and application switches are flagged.',
        });
      }
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
      recordViolation({
        type: 'CLIPBOARD_RESTRICTION',
        message: 'Copying or pasting exam content to external tools/AI agents is strictly prohibited.',
      });
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);

    // Listen for Electron main process violation signals
    const bridge = window.veyra;
    let removeIpcListener = null;
    if (bridge?.registerProctorViolationListener) {
      removeIpcListener = bridge.registerProctorViolationListener((v) => {
        recordViolation(v);
      });
    }

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      if (typeof removeIpcListener === 'function') removeIpcListener();
    };
  }, [recordViolation]);

  // Fetch question on index change
  useEffect(() => {
    let alive = true;
    if (!currentMeta?.id) return;
    async function load() {
      setLoadingQ(true);
      setErrorMsg(null);
      setSaveStatus(null);
      try {
        const data = await getQuestionById(currentMeta.id);
        if (alive) setActiveQuestion(data);
      } catch (e) {
        if (alive) setErrorMsg(e.message || 'Failed to load question');
      } finally {
        if (alive) setLoadingQ(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [currentMeta?.id]);

  // Fetch initial session state
  useEffect(() => {
    let alive = true;
    if (!sessionId) return;
    async function load() {
      setSyncing(true);
      try {
        const data = await getSessionDetails(sessionId);
        if (alive) {
          setSessionData(data);
          if (data.answers?.length) {
            const map = {};
            data.answers.forEach((a) => { map[a.questionId] = a.selectedAnswer; });
            setDraftAnswers((prev) => ({ ...map, ...prev }));
          }
          if (Array.isArray(data.flags)) {
            setFlags(data.flags);
          }
        }
      } catch (e) { console.error(e); }
      finally { if (alive) setSyncing(false); }
    }
    load();
    return () => { alive = false; };
  }, [sessionId]);

  const syncSession = async () => {
    if (!sessionId) return;
    setSyncing(true);
    try {
      const data = await getSessionDetails(sessionId);
      setSessionData(data);
      if (Array.isArray(data.flags)) {
        setFlags(data.flags);
      }
    } catch (e) { console.error(e); }
    finally { setSyncing(false); }
  };

  // Derived answer state
  const backendAnswerIds = new Set(sessionData?.answers?.map((a) => a.questionId) || []);
  const draftIds = new Set(
    Object.entries(draftAnswers)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k]) => Number(k))
  );
  const answeredIds = new Set([...backendAnswerIds, ...draftIds]);
  const totalCount    = questionsList.length;
  const answeredCount = answeredIds.size;
  const markedCount   = markedIds.size;
  const progress      = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const backendRecord = sessionData?.answers?.find((a) => a.questionId === currentMeta?.id);
  const selectedOption =
    currentMeta?.id !== undefined && draftAnswers[currentMeta.id] !== undefined
      ? draftAnswers[currentMeta.id]
      : backendRecord?.selectedAnswer ?? null;

  // Randomized option shuffling for active question
  const shuffledOptions = useMemo(() => {
    if (!activeQuestion?.options || !Array.isArray(activeQuestion.options)) return [];
    const seedKey = `${sessionId || 'veyra-session'}-q-${activeQuestion.id}`;
    return shuffleOptions(activeQuestion.options, seedKey);
  }, [activeQuestion, sessionId]);

  const selectedShuffledIndex = shuffledOptions.findIndex(
    (item) => item.originalIndex === selectedOption
  );
  const selectedLetter = selectedShuffledIndex >= 0 ? optLetters[selectedShuffledIndex] : null;

  const isCurrentMarked = currentMeta?.id ? markedIds.has(currentMeta.id) : false;

  const handleSelect = async (optIdx) => {
    if (!activeQuestion || !sessionId) return;
    const qId = activeQuestion.id;
    setDraftAnswers((prev) => ({ ...prev, [qId]: optIdx }));
    try {
      setSaveStatus('saving');
      await submitAnswer(sessionId, qId, optIdx);
      setSaveStatus('saved');
      const updated = await getSessionDetails(sessionId);
      setSessionData(updated);
    } catch (e) {
      console.warn('Auto-save error:', e.message);
      setSaveStatus(null);
    }
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      // Flush pending drafts
      const backendMap = new Map((sessionData?.answers || []).map((a) => [a.questionId, a.selectedAnswer]));
      for (const [qIdStr, optIdx] of Object.entries(draftAnswers)) {
        const qId = Number(qIdStr);
        if (optIdx !== null && optIdx !== undefined && backendMap.get(qId) !== optIdx) {
          try { await submitAnswer(sessionId, qId, optIdx); } catch (e) { console.warn('Flush error:', e.message); }
        }
      }
      const response = await submitExam(sessionId);
      const finalSession = await getSessionDetails(sessionId);
      onExamSubmitted({ result: response.result, session: finalSession });
    } catch (e) {
      setErrorMsg(e.message || 'Failed to submit exam');
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="exam-arena-container">
      {/* ── Main question area */}
      <div className="exam-main-area">
        {/* Real-time Proctoring Violation Banner */}
        {activeViolation && (
          <div className="alert alert-warning animate-slide-up" style={{ borderLeft: '4px solid var(--brand-yellow)' }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>
                Proctoring Flag #{flags.length} Logged ({activeViolation.timestamp})
              </div>
              <div style={{ fontSize: 12.5, marginTop: 2 }}>{activeViolation.message}</div>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() => setActiveViolation(null)}
            >
              Acknowledge
            </button>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="alert alert-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
            <button type="button" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }} onClick={() => setErrorMsg(null)}>×</button>
          </div>
        )}

        {/* Question Card */}
        <div className="question-card">
          {/* Top bar with Question Number, Status Tag, and Mark for Review */}
          <div className="question-number-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="q-num-tag">Question {currentIndex + 1} of {totalCount}</span>
              <span className={`q-status-tag ${selectedOption !== null ? 'q-status-answered' : 'q-status-unanswered'}`}>
                {selectedOption !== null ? `✓ Option ${selectedLetter || ''} selected` : 'Not answered'}
              </span>
            </div>

            {/* Mark for Review Toggle Button */}
            <button
              type="button"
              className={`btn btn-sm ${isCurrentMarked ? 'btn-marked-active' : 'btn-outline'}`}
              onClick={() => currentMeta?.id && toggleMarkForReview(currentMeta.id)}
              title="Bookmark question to review before final submission"
            >
              {isCurrentMarked ? '★ Marked for Review' : '☆ Mark for Review'}
            </button>
          </div>

          {/* Question text / loading */}
          {loadingQ ? (
            <div style={{ padding: '30px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px', width: 24, height: 24 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading question…</p>
            </div>
          ) : activeQuestion ? (
            <>
              <p className="question-text">{activeQuestion.question}</p>
              <div className="options-list">
                {shuffledOptions.map((item, i) => {
                  const isSelected = selectedOption === item.originalIndex;
                  return (
                    <div
                      key={item.originalIndex}
                      className={`option-item ${isSelected ? 'selected' : ''} ${saveStatus === 'saving' && isSelected ? 'saving' : ''}`}
                      onClick={() => handleSelect(item.originalIndex)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleSelect(item.originalIndex)}
                      aria-pressed={isSelected}
                    >
                      <span className="option-letter">{optLetters[i] || i + 1}</span>
                      <span className="option-text">{item.text}</span>
                      {isSelected && (
                        <span className="option-check">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Auto-save feedback */}
              {saveStatus === 'saving' && (
                <div className="alert alert-info" style={{ marginTop: 12 }}>
                  <span className="spinner" style={{ width: 13, height: 13 }} />
                  <span>Saving answer…</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="alert alert-success" style={{ marginTop: 12 }}>
                  ✓ Answer auto-saved — you can change your selection at any time.
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Select a question from the palette.</p>
          )}

          {/* Navigation */}
          <div className="exam-nav-row" style={{ marginTop: 24 }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
            >
              ← Previous
            </button>
            <span className="exam-nav-center">
              {answeredCount} answered · {markedCount > 0 ? `${markedCount} marked · ` : ''}{totalCount - answeredCount} remaining
            </span>
            <button
              type="button"
              className="btn btn-outline"
              disabled={currentIndex === totalCount - 1}
              onClick={() => setCurrentIndex((p) => Math.min(totalCount - 1, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Submit trigger */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={syncSession}
            disabled={syncing}
          >
            {syncing ? 'Syncing…' : '↻ Sync'}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setShowConfirm(true)}
          >
            Submit Exam
          </button>
        </div>
      </div>

      {/* ── Sidebar */}
      <div className="exam-sidebar">
        {/* Progress */}
        <div className="sidebar-card">
          <div className="sidebar-card-title">Progress</div>
          <div className="exam-progress-bar-track">
            <div className="exam-progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-counts">
            <span>{answeredCount} answered</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Question palette */}
        <div className="sidebar-card">
          <div className="sidebar-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Question Palette</span>
            {markedCount > 0 && (
              <span className="marked-count-badge">★ {markedCount}</span>
            )}
          </div>
          <div className="question-palette">
            {questionsList.map((q, i) => {
              const isAnswered = answeredIds.has(q.id);
              const isMarked   = markedIds.has(q.id);
              const isCurrent  = i === currentIndex;

              return (
                <button
                  key={q.id}
                  type="button"
                  className={`palette-btn ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''} ${isMarked ? 'marked' : ''}`}
                  onClick={() => setCurrentIndex(i)}
                  title={`Q${i + 1}${isAnswered ? ' (Answered)' : ''}${isMarked ? ' (Marked for Review)' : ''}`}
                >
                  {i + 1}
                  {isMarked && <span className="palette-star">★</span>}
                </button>
              );
            })}
          </div>

          {/* Palette Legend */}
          <div className="palette-legend">
            <div className="legend-item"><span className="legend-dot dot-ans" /> Answered</div>
            <div className="legend-item"><span className="legend-dot dot-unans" /> Unanswered</div>
            <div className="legend-item"><span className="legend-dot dot-mrk" /> Marked for Review</div>
          </div>
        </div>

        {/* Webcam & Proctoring Telemetry */}
        <div className="sidebar-card">
          <div className="sidebar-card-title">Live Proctoring</div>
          <div className="webcam-mini-wrap">
            {mediaStream ? (
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div className="webcam-mini-placeholder">Camera offline</div>
            )}
          </div>
          <div className="proctor-stats" style={{ marginTop: 10 }}>
            <div className="proctor-stat-row">
              <span className="proctor-stat-label">Webcam photos</span>
              <span className="proctor-stat-value">{snapshotCount} saved</span>
            </div>
            <div className="proctor-stat-row">
              <span className="proctor-stat-label">Screen captures</span>
              <span className="proctor-stat-value">{screenSnapshotCount} saved</span>
            </div>
            <div className="proctor-stat-row">
              <span className="proctor-stat-label">Elapsed time</span>
              <span className="proctor-stat-value">{formatTime(timer)}</span>
            </div>
            <div className="proctor-stat-row">
              <span className="proctor-stat-label">Proctoring flags</span>
              <span className={`proctor-stat-value ${flags.length > 0 ? 'text-amber' : 'text-green'}`}>
                {flags.length === 0 ? '0 (Clean)' : `⚠️ ${flags.length} flag${flags.length > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="sidebar-card">
          <button type="button" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={onOpenRules}>
            📋 View Rules
          </button>
        </div>
      </div>

      {/* ── Submit Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => !submitting && setShowConfirm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Confirm Submission</span>
              <button type="button" className="modal-close" disabled={submitting} onClick={() => setShowConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{totalCount}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Total</div>
                </div>
                <div style={{ background: 'var(--brand-green-soft)', border: '1px solid var(--brand-green-border)', borderRadius: 'var(--r-md)', padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--brand-green-dim)' }}>{answeredCount}</div>
                  <div style={{ fontSize: 10, color: 'var(--brand-green-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Answered</div>
                </div>
                <div style={{ background: 'var(--brand-yellow-soft)', border: '1px solid var(--brand-yellow-border)', borderRadius: 'var(--r-md)', padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--brand-yellow-dim)' }}>{totalCount - answeredCount}</div>
                  <div style={{ fontSize: 10, color: 'var(--brand-yellow-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Skipped</div>
                </div>
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 'var(--r-md)', padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#7c3aed' }}>{markedCount}</div>
                  <div style={{ fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Marked</div>
                </div>
              </div>

              {markedCount > 0 && (
                <div className="alert alert-info" style={{ marginBottom: 10 }}>
                  ★ You have <strong>{markedCount} question{markedCount > 1 ? 's' : ''}</strong> marked for review.
                </div>
              )}

              {totalCount - answeredCount > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: 10 }}>
                  ⚠ You have {totalCount - answeredCount} unanswered question{totalCount - answeredCount > 1 ? 's' : ''}. Submission is permanent.
                </div>
              )}

              {flags.length > 0 && (
                <div className="alert alert-error" style={{ marginBottom: 10 }}>
                  ⚠️ {flags.length} proctoring flag{flags.length > 1 ? 's were' : ' was'} logged during this session.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ gap: 10 }}>
              <button type="button" className="btn btn-outline" disabled={submitting} onClick={() => setShowConfirm(false)}>
                Continue Exam
              </button>
              <button type="button" className="btn btn-danger" disabled={submitting} onClick={handleSubmit}>
                {submitting ? <><span className="spinner" />Submitting…</> : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ExamArena.propTypes = {
  sessionId:              PropTypes.string.isRequired,
  questionsList:          PropTypes.array.isRequired,
  videoRef:               PropTypes.shape({ current: PropTypes.any }),
  mediaStream:            PropTypes.any,
  timer:                  PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  snapshotCount:          PropTypes.number.isRequired,
  screenSnapshotCount:    PropTypes.number,
  onExamSubmitted:        PropTypes.func.isRequired,
  onOpenRules:            PropTypes.func.isRequired,
};

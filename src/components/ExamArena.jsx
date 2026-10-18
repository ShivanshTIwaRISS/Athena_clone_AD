// src/components/ExamArena.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  getQuestionById,
  submitAnswer,
  getSessionDetails,
  submitExam,
} from '../services/api';

function formatTime(seconds) {
  const s = Math.floor(Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}

export default function ExamArena({
  sessionId,
  questionsList,
  videoRef,
  mediaStream,
  timer,
  snapshotCount,
  screenSnapshotCount = 0,
  onCaptureManualSnapshot,
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

  const [draftAnswers, setDraftAnswers] = useState({});
  const [saveStatus, setSaveStatus] = useState(null); // 'saving'|'saved'|null

  const [sessionData, setSessionData] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentMeta = questionsList[currentIndex] || null;

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
  const totalCount   = questionsList.length;
  const answeredCount = answeredIds.size;
  const progress     = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const backendRecord = sessionData?.answers?.find((a) => a.questionId === currentMeta?.id);
  const selectedOption =
    currentMeta?.id !== undefined && draftAnswers[currentMeta.id] !== undefined
      ? draftAnswers[currentMeta.id]
      : backendRecord?.selectedAnswer ?? null;

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

  const optLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="exam-arena-container">
      {/* ── Main question area */}
      <div className="exam-main-area">
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
          {/* Top bar */}
          <div className="question-number-bar">
            <span className="q-num-tag">Question {currentIndex + 1} of {totalCount}</span>
            <span className={`q-status-tag ${selectedOption !== null ? 'q-status-answered' : 'q-status-unanswered'}`}>
              {selectedOption !== null ? `✓ Option ${optLetters[selectedOption]} selected` : 'Not answered'}
            </span>
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
                {activeQuestion.options?.map((text, i) => (
                  <div
                    key={i}
                    className={`option-item ${selectedOption === i ? 'selected' : ''} ${saveStatus === 'saving' && selectedOption === i ? 'saving' : ''}`}
                    onClick={() => handleSelect(i)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelect(i)}
                    aria-pressed={selectedOption === i}
                  >
                    <span className="option-letter">{optLetters[i] || i + 1}</span>
                    <span className="option-text">{text}</span>
                    {selectedOption === i && (
                      <span className="option-check">✓</span>
                    )}
                  </div>
                ))}
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
              {answeredCount} answered · {totalCount - answeredCount} remaining
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
          <div className="sidebar-card-title">Question Palette</div>
          <div className="question-palette">
            {questionsList.map((q, i) => (
              <button
                key={q.id}
                type="button"
                className={`palette-btn ${i === currentIndex ? 'current' : ''} ${answeredIds.has(q.id) ? 'answered' : ''}`}
                onClick={() => setCurrentIndex(i)}
                title={`Q${i + 1}${answeredIds.has(q.id) ? ' (answered)' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Webcam mini */}
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
              <span className="proctor-stat-label">Webcam frames</span>
              <span className="proctor-stat-value">{snapshotCount}</span>
            </div>
            <div className="proctor-stat-row">
              <span className="proctor-stat-label">Screen captures</span>
              <span className="proctor-stat-value">{screenSnapshotCount}</span>
            </div>
            <div className="proctor-stat-row">
              <span className="proctor-stat-label">Elapsed time</span>
              <span className="proctor-stat-value">{formatTime(timer)}</span>
            </div>
          </div>
          {onCaptureManualSnapshot && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={onCaptureManualSnapshot}
            >
              📸 Capture Now
            </button>
          )}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>{totalCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>Total</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--r-md)', padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--brand-green-bright)' }}>{answeredCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>Answered</div>
                </div>
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--r-md)', padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fcd34d' }}>{totalCount - answeredCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>Skipped</div>
                </div>
              </div>
              {totalCount - answeredCount > 0 && (
                <div className="alert alert-warning">
                  ⚠ You have {totalCount - answeredCount} unanswered question{totalCount - answeredCount > 1 ? 's' : ''}. Submission is permanent.
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
  onCaptureManualSnapshot: PropTypes.func,
  onExamSubmitted:        PropTypes.func.isRequired,
  onOpenRules:            PropTypes.func.isRequired,
};

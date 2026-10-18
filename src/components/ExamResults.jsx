// src/components/ExamResults.jsx — VEYRA Post-Exam Answer Key & Solution Review
import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

function formatTime(seconds) {
  const s = Math.floor(Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}

export default function ExamResults({
  resultData,
  sessionData,
  questionsList,
  timer,
  snapshotCount,
  screenSnapshotCount = 0,
  onRestart,
  onViewHistory,
}) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CORRECT' | 'WRONG' | 'SKIPPED'
  const optLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Normalize review items: prefer sessionData.review or build from sessionData.answers + questionsList
  const reviewItems = useMemo(() => {
    if (Array.isArray(sessionData?.review) && sessionData.review.length > 0) {
      return sessionData.review;
    }

    if (Array.isArray(resultData?.review) && resultData.review.length > 0) {
      return resultData.review;
    }

    // Fallback: reconstruct from questionsList and session answers
    return questionsList.map((q) => {
      const ansRec = sessionData?.answers?.find((a) => a.questionId === q.id);
      const isAttempted = ansRec !== undefined && ansRec !== null && ansRec.selectedAnswer !== null;
      const isCorrect = isAttempted ? Boolean(ansRec.isCorrect) : false;
      const selected = isAttempted ? ansRec.selectedAnswer : null;
      const correct = q.correctAnswer !== undefined ? q.correctAnswer : null;

      return {
        questionId: q.id,
        question: q.question,
        options: q.options || [],
        correctAnswer: correct,
        correctOptionText: correct !== null && q.options ? q.options[correct] : '',
        selectedAnswer: selected,
        selectedOptionText: selected !== null && q.options ? q.options[selected] : null,
        isCorrect,
        status: !isAttempted ? 'skipped' : (isCorrect ? 'correct' : 'wrong'),
        explanation: q.explanation || 'The answer is determined based on core computer science and systems architecture principles.',
        topic: q.topic || 'General',
        difficulty: q.difficulty || 'medium',
      };
    });
  }, [sessionData, resultData, questionsList]);

  // Metric counts
  const total = reviewItems.length || questionsList.length || 0;
  const correctCount = reviewItems.filter((item) => item.status === 'correct').length;
  const wrongCount = reviewItems.filter((item) => item.status === 'wrong').length;
  const skippedCount = reviewItems.filter((item) => item.status === 'skipped').length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = accuracy >= 60;

  // Filtered list
  const filteredItems = useMemo(() => {
    if (filter === 'CORRECT') return reviewItems.filter((i) => i.status === 'correct');
    if (filter === 'WRONG') return reviewItems.filter((i) => i.status === 'wrong');
    if (filter === 'SKIPPED') return reviewItems.filter((i) => i.status === 'skipped');
    return reviewItems;
  }, [reviewItems, filter]);

  const scrollToQuestion = (qId) => {
    const el = document.getElementById(`review-q-${qId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="results-container animate-fade-in">
      {/* ── 1. Top Scorecard Hero ─────────────────────────────────── */}
      <div className="results-hero">
        <div className={`result-score-ring ${passed ? 'pass' : 'fail'}`}>
          <div className="result-pct">{accuracy}%</div>
          <div className="result-pct-sub">Score</div>
        </div>

        <div className="results-verdict">
          {passed ? '🎉 Assessment Passed' : '📚 Assessment Completed'}
        </div>
        <p className="results-tagline">
          {passed
            ? 'Great job! You achieved the benchmark passing score for this evaluation.'
            : 'Assessment submitted. Review your answers below with detailed explanations.'}
        </p>

        {sessionData?.sessionId && (
          <div className="results-session-chip">
            Session: <code>{sessionData.sessionId}</code>
          </div>
        )}
      </div>

      {/* ── 2. Metric Score Cards ──────────────────────────────────── */}
      <div className="result-score-cards">
        <div className="score-card card-correct">
          <div className="score-card-icon">✓</div>
          <div className="score-card-val">{correctCount}</div>
          <div className="score-card-lbl">Correct Answers</div>
        </div>
        <div className="score-card card-wrong">
          <div className="score-card-icon">✗</div>
          <div className="score-card-val">{wrongCount}</div>
          <div className="score-card-lbl">Incorrect Answers</div>
        </div>
        <div className="score-card card-skipped">
          <div className="score-card-icon">—</div>
          <div className="score-card-val">{skippedCount}</div>
          <div className="score-card-lbl">Skipped / Unattempted</div>
        </div>
      </div>

      {/* ── 3. Candidate Meta Details ──────────────────────────────── */}
      <div className="results-meta-grid">
        <div className="meta-card">
          <span className="meta-card-label">Candidate</span>
          <span className="meta-card-value">{sessionData?.name || 'Candidate'}</span>
        </div>
        <div className="meta-card">
          <span className="meta-card-label">Student ID</span>
          <span className="meta-card-value">{sessionData?.userId || '—'}</span>
        </div>
        <div className="meta-card">
          <span className="meta-card-label">Time Elapsed</span>
          <span className="meta-card-value">{formatTime(timer)}</span>
        </div>
        <div className="meta-card">
          <span className="meta-card-label">Proctor Telemetry</span>
          <span className="meta-card-value">
            {snapshotCount} cam · {screenSnapshotCount} screen
          </span>
        </div>
        <div className="meta-card">
          <span className="meta-card-label">Proctoring Flags</span>
          <span className={`meta-card-value ${(sessionData?.flagCount || sessionData?.flags?.length) ? 'text-amber font-bold' : 'text-green font-bold'}`}>
            {(sessionData?.flagCount || sessionData?.flags?.length || 0) === 0
              ? '✓ Clean (0 Flags)'
              : `⚠️ ${sessionData?.flagCount || sessionData?.flags?.length} Flag(s)`}
          </span>
        </div>
      </div>

      {/* ── 4. Answer Key & Detailed Solution Review Section ───────── */}
      <div className="answer-key-section">
        <div className="answer-key-header">
          <div>
            <h2 className="answer-key-title">Answer Key & Detailed Solutions</h2>
            <p className="answer-key-sub">
              Compare your selected response with the verified correct answer and study the complete explanation for every question.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="answer-filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All ({total})
            </button>
            <button
              type="button"
              className={`filter-tab-btn tab-correct ${filter === 'CORRECT' ? 'active' : ''}`}
              onClick={() => setFilter('CORRECT')}
            >
              ✓ Correct ({correctCount})
            </button>
            <button
              type="button"
              className={`filter-tab-btn tab-wrong ${filter === 'WRONG' ? 'active' : ''}`}
              onClick={() => setFilter('WRONG')}
            >
              ✗ Incorrect ({wrongCount})
            </button>
            <button
              type="button"
              className={`filter-tab-btn tab-skipped ${filter === 'SKIPPED' ? 'active' : ''}`}
              onClick={() => setFilter('SKIPPED')}
            >
              — Skipped ({skippedCount})
            </button>
          </div>
        </div>

        {/* Quick jump question numbers */}
        <div className="quick-jump-bar">
          <span className="quick-jump-label">Jump to:</span>
          <div className="quick-jump-chips">
            {reviewItems.map((item, idx) => (
              <button
                key={item.questionId}
                type="button"
                className={`jump-chip jump-${item.status}`}
                onClick={() => scrollToQuestion(item.questionId)}
                title={`Question ${idx + 1}: ${item.status}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Question Solutions List */}
        <div className="questions-review-list">
          {filteredItems.map((item) => {
            const originalIndex = reviewItems.findIndex((q) => q.questionId === item.questionId);
            const qNum = originalIndex >= 0 ? originalIndex + 1 : item.questionId;
            const isCorrect = item.status === 'correct';
            const isWrong = item.status === 'wrong';
            const isSkipped = item.status === 'skipped';

            return (
              <div
                key={item.questionId}
                id={`review-q-${item.questionId}`}
                className={`question-review-card card-${item.status}`}
              >
                {/* Question Header Strip */}
                <div className="q-review-header">
                  <div className="q-review-meta">
                    <span className="q-badge-num">Question {qNum} of {total}</span>
                    {item.topic && <span className="q-badge-topic">{item.topic}</span>}
                    {item.difficulty && (
                      <span className={`q-badge-diff diff-${item.difficulty.toLowerCase()}`}>
                        {item.difficulty}
                      </span>
                    )}
                  </div>

                  <div className="q-review-status">
                    {isCorrect && (
                      <span className="status-pill pill-correct">
                        ✓ Correct &bull; +1 Mark
                      </span>
                    )}
                    {isWrong && (
                      <span className="status-pill pill-wrong">
                        ✗ Incorrect &bull; 0 Marks
                      </span>
                    )}
                    {isSkipped && (
                      <span className="status-pill pill-skipped">
                        — Unattempted &bull; 0 Marks
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Prompt */}
                <h3 className="q-review-prompt">{item.question}</h3>

                {/* Options List */}
                <div className="q-review-options">
                  {item.options.map((optText, optIdx) => {
                    const isUserChoice = item.selectedAnswer === optIdx;
                    const isCorrectAnswer = item.correctAnswer === optIdx;

                    let optStyle = 'opt-normal';
                    let badgeText = null;
                    let badgeType = '';

                    if (isUserChoice && isCorrectAnswer) {
                      optStyle = 'opt-user-correct';
                      badgeText = '✓ Your Selection (Correct)';
                      badgeType = 'badge-success';
                    } else if (isUserChoice && !isCorrectAnswer) {
                      optStyle = 'opt-user-wrong';
                      badgeText = '✗ Your Selection (Incorrect)';
                      badgeType = 'badge-danger';
                    } else if (!isUserChoice && isCorrectAnswer) {
                      optStyle = 'opt-is-correct';
                      badgeText = '✓ Correct Answer';
                      badgeType = 'badge-correct';
                    }

                    return (
                      <div key={optIdx} className={`q-review-option ${optStyle}`}>
                        <div className="opt-prefix">
                          <span className="opt-letter">{optLetters[optIdx] || optIdx + 1}</span>
                        </div>
                        <div className="opt-content">
                          <span className="opt-text">{optText}</span>
                          {badgeText && (
                            <span className={`opt-tag ${badgeType}`}>{badgeText}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Candidate Selection Summary Banner */}
                <div className="q-user-summary">
                  {isCorrect && (
                    <div className="user-ans-note note-correct">
                      <span>✓ You correctly selected <strong>Option {optLetters[item.selectedAnswer]}: {item.selectedOptionText}</strong></span>
                    </div>
                  )}
                  {isWrong && (
                    <div className="user-ans-note note-wrong">
                      <span>
                        ✗ You selected <strong>Option {optLetters[item.selectedAnswer]}: {item.selectedOptionText}</strong>.
                        The correct answer is <strong>Option {optLetters[item.correctAnswer]}: {item.correctOptionText}</strong>.
                      </span>
                    </div>
                  )}
                  {isSkipped && (
                    <div className="user-ans-note note-skipped">
                      <span>
                        — You did not answer this question.
                        The correct answer is <strong>Option {optLetters[item.correctAnswer]}: {item.correctOptionText}</strong>.
                      </span>
                    </div>
                  )}
                </div>

                {/* Explanation / Solution Box */}
                {item.explanation && (
                  <div className="q-solution-box">
                    <div className="solution-title">
                      <span className="solution-icon">💡</span>
                      <span>Explanation & Key Concept</span>
                    </div>
                    <p className="solution-text">{item.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. Bottom Navigation Actions ───────────────────────────── */}
      <div className="results-actions-bar">
        <button type="button" className="btn btn-primary btn-lg" onClick={onRestart}>
          Take Another Assessment
        </button>
        {onViewHistory && (
          <button type="button" className="btn btn-outline btn-lg" onClick={onViewHistory}>
            View Assessment History
          </button>
        )}
      </div>
    </div>
  );
}

ExamResults.propTypes = {
  resultData:          PropTypes.object,
  sessionData:         PropTypes.object,
  questionsList:       PropTypes.array.isRequired,
  timer:               PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  snapshotCount:       PropTypes.number.isRequired,
  screenSnapshotCount: PropTypes.number,
  onRestart:           PropTypes.func.isRequired,
  onViewHistory:       PropTypes.func,
};

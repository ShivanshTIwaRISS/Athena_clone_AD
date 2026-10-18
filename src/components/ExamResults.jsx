// src/components/ExamResults.jsx
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
}) {
  const attempted = resultData?.attempted ?? sessionData?.attempted ?? 0;
  const correct   = resultData?.correct   ?? sessionData?.correct   ?? 0;
  const wrong     = resultData?.wrong     ?? sessionData?.wrong     ?? 0;
  const total     = questionsList.length  || (attempted + wrong);
  const accuracy  = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed    = accuracy >= 60;
  const skipped   = total - attempted;

  const optLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="results-container animate-fade-in">

      {/* ── Hero */}
      <div className="results-hero">
        <div className={`result-score-ring ${passed ? 'pass' : 'fail'}`}>
          <div className={`result-pct ${passed ? 'pass' : 'fail'}`}>{accuracy}%</div>
          <div className="result-pct-sub">Accuracy</div>
        </div>

        <div className="results-verdict">
          {passed ? '🎉 Assessment Passed' : '📚 Assessment Not Passed'}
        </div>
        <p className="results-tagline">
          {passed
            ? 'Congratulations! Your performance meets the required benchmark.'
            : 'Don\'t give up — review your answers and try again.'}
        </p>

        {sessionData?.sessionId && (
          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Session: {sessionData.sessionId}
          </div>
        )}
      </div>

      {/* ── Score cards */}
      <div className="result-score-cards">
        <div className="score-card">
          <div className="score-card-val correct">{correct}</div>
          <div className="score-card-lbl">Correct</div>
        </div>
        <div className="score-card">
          <div className="score-card-val wrong">{wrong}</div>
          <div className="score-card-lbl">Incorrect</div>
        </div>
        <div className="score-card">
          <div className="score-card-val skipped">{skipped}</div>
          <div className="score-card-lbl">Skipped</div>
        </div>
      </div>

      {/* ── Meta bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20,
      }}>
        {[
          ['Candidate', sessionData?.name || '—'],
          ['Student ID', sessionData?.userId || '—'],
          ['Time Taken', formatTime(timer)],
          ['Proctor Snaps', `${snapshotCount} cam${screenSnapshotCount > 0 ? ` · ${screenSnapshotCount} scr` : ''}`],
        ].map(([label, value]) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Answer breakdown */}
      {questionsList.length > 0 && (
        <div className="review-table">
          <div className="review-table-header">Response Breakdown</div>
          <div className="review-row header-row">
            <span>#</span>
            <span>Question</span>
            <span>Your Answer</span>
            <span>Result</span>
          </div>
          {questionsList.map((q, idx) => {
            const rec = sessionData?.answers?.find((a) => a.questionId === q.id);
            const answered = Boolean(rec);
            const correct_ans = rec?.isCorrect;
            const selectedIdx = rec?.selectedAnswer;

            return (
              <div key={q.id} className="review-row">
                <span className="review-q-num">Q{idx + 1}</span>
                <span className="review-q-text" title={q.question}>{q.question}</span>
                <span className="review-answer">
                  {answered
                    ? `Option ${optLetters[selectedIdx] || selectedIdx + 1}`
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </span>
                <span className={`review-result ${!answered ? 'skipped' : correct_ans ? 'correct' : 'wrong'}`}>
                  {!answered ? 'Skipped' : correct_ans ? '✓ Correct' : '✗ Wrong'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Actions */}
      <div className="results-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={onRestart}>
          Take Another Assessment
        </button>
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
};

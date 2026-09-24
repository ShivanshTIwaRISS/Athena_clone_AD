// src/components/ExamResults.jsx
import PropTypes from 'prop-types';

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
  const correct = resultData?.correct ?? sessionData?.correct ?? 0;
  const wrong = resultData?.wrong ?? sessionData?.wrong ?? 0;
  const totalQuestions = questionsList.length || (attempted + wrong);

  const accuracyScore = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

  return (
    <div className="results-container">
      {/* Completion Header Banner */}
      <div className="results-hero-card">
        <div className="results-hero-icon">🏆</div>
        <h2>Examination Completed Successfully</h2>
        <p className="results-hero-sub">
          Your responses have been validated and recorded on the Athena Exam Backend.
        </p>
        <div className="session-tag-chip">
          Session ID: <code>{sessionData?.sessionId || 'N/A'}</code>
        </div>
      </div>

      {/* Candidate & Timing Meta Grid */}
      <div className="candidate-summary-bar">
        <div className="summary-col">
          <span className="col-label">Candidate Name</span>
          <strong className="col-val">{sessionData?.name || 'N/A'}</strong>
        </div>
        <div className="summary-col">
          <span className="col-label">Candidate ID</span>
          <strong className="col-val">{sessionData?.userId || 'N/A'}</strong>
        </div>
        <div className="summary-col">
          <span className="col-label">Time Taken</span>
          <strong className="col-val">{timer || '0'} seconds</strong>
        </div>
        <div className="summary-col">
          <span className="col-label">Proctor Snaps</span>
          <strong className="col-val">
            {snapshotCount} cam {screenSnapshotCount > 0 ? `+ ${screenSnapshotCount} scr` : ''}
          </strong>
        </div>
      </div>


      {/* Metric Cards Grid */}
      <div className="score-metrics-grid">
        <div className="metric-card card-total">
          <div className="metric-header">Total Questions</div>
          <div className="metric-value">{totalQuestions}</div>
          <div className="metric-desc">Available in assessment</div>
        </div>

        <div className="metric-card card-attempted">
          <div className="metric-header">Attempted</div>
          <div className="metric-value">{attempted}</div>
          <div className="metric-desc">Answers submitted to backend</div>
        </div>

        <div className="metric-card card-correct">
          <div className="metric-header">Correct Answers</div>
          <div className="metric-value text-green">{correct}</div>
          <div className="metric-desc">Validated by server logic</div>
        </div>

        <div className="metric-card card-wrong">
          <div className="metric-header">Incorrect Answers</div>
          <div className="metric-value text-red">{wrong}</div>
          <div className="metric-desc">Needs revision</div>
        </div>

        <div className="metric-card card-score">
          <div className="metric-header">Accuracy Score</div>
          <div className="metric-value text-indigo">{accuracyScore}%</div>
          <div className="metric-desc">Based on total questions</div>
        </div>
      </div>

      {/* Question by Question Response Log */}
      <div className="answers-breakdown-card">
        <div className="breakdown-header">
          <h3>Detailed Response Breakdown</h3>
          <p>Review the questions and your submitted selections recorded in the backend session.</p>
        </div>

        <div className="questions-review-list">
          {questionsList.map((q, idx) => {
            const answerRecord = sessionData?.answers?.find(
              (ans) => ans.questionId === q.id
            );
            const isAnswered = Boolean(answerRecord);
            const selectedOptIndex = answerRecord?.selectedAnswer;

            return (
              <div
                key={q.id}
                className={`review-question-item ${isAnswered ? (answerRecord?.isCorrect ? 'item-correct' : 'item-wrong') : 'item-unanswered'}`}
              >
                <div className="review-q-header">
                  <div className="review-q-num">
                    Question {idx + 1}
                  </div>
                  <div className="review-status-tag">
                    {isAnswered ? (
                      answerRecord?.isCorrect ? (
                        <span className="badge badge-success">✓ Correct (+1)</span>
                      ) : (
                        <span className="badge badge-danger">✗ Incorrect (0)</span>
                      )
                    ) : (
                      <span className="badge badge-neutral">○ Not Attempted</span>
                    )}
                  </div>
                </div>

                <div className="review-q-prompt">
                  <strong>{q.question}</strong>
                </div>

                <div className="review-options-list">
                  {q.options.map((optText, optIdx) => {
                    const isUserChoice = isAnswered && selectedOptIndex === optIdx;
                    return (
                      <div
                        key={optIdx}
                        className={`review-opt-pill ${isUserChoice ? (answerRecord?.isCorrect ? 'choice-correct' : 'choice-wrong') : ''}`}
                      >
                        <span className="opt-letter">{String.fromCharCode(65 + optIdx)}.</span>
                        <span className="opt-label">{optText}</span>
                        {isUserChoice && (
                          <span className="user-choice-indicator">
                            (Your Selection)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isAnswered && answerRecord.answeredAt && (
                  <div className="review-timestamp">
                    Timestamp: {new Date(answerRecord.answeredAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="results-actions">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onRestart}
        >
          🔄 Start Another Examination
        </button>
      </div>
    </div>
  );
}

ExamResults.propTypes = {
  resultData: PropTypes.object,
  sessionData: PropTypes.object,
  questionsList: PropTypes.array.isRequired,
  timer: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  snapshotCount: PropTypes.number.isRequired,
  screenSnapshotCount: PropTypes.number,
  onRestart: PropTypes.func.isRequired,
};

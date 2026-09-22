// src/services/api.js
/**
 * Backend API Client for Athena Exam Platform
 * Integrates all 7 Express Backend Endpoints:
 * 1. GET / - Backend Health Check
 * 2. POST /exam/start - Start Exam Session
 * 3. GET /exam/mcq - Get All Questions
 * 4. GET /exam/mcq/:id - Get Single Question by ID
 * 5. POST /exam/answer - Submit an Answer
 * 6. GET /exam/session/:sessionId - Fetch Session Progress & Status
 * 7. POST /exam/submit - Finalize and Submit Exam
 */

const API_BASE_URL = 'http://localhost:3000';

/**
 * Helper function for unified JSON fetch requests with error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Cannot connect to Exam Backend at ${API_BASE_URL}. Ensure the backend server is running.`, {
        cause: err,
      });
    }
    throw err;
  }
}

/**
 * 1. GET / - Check backend health status
 */
export async function checkBackendHealth() {
  return request('/');
}

/**
 * 2. POST /exam/start - Initialize a new exam session
 * @param {string} userId - Unique student/candidate ID
 * @param {string} name - Candidate full name
 * @returns {Promise<{message: string, sessionId: string}>}
 */
export async function startExam(userId, name) {
  return request('/exam/start', {
    method: 'POST',
    body: JSON.stringify({ userId, name }),
  });
}

/**
 * 3. GET /exam/mcq - Fetch all questions without answers (for question list/palette)
 * @returns {Promise<Array<{id: number, question: string, options: string[]}>>}
 */
export async function getAllQuestions() {
  return request('/exam/mcq');
}

/**
 * 4. GET /exam/mcq/:id - Fetch single question details by question ID
 * @param {number|string} id - Question ID
 * @returns {Promise<{id: number, question: string, options: string[]}>}
 */
export async function getQuestionById(id) {
  return request(`/exam/mcq/${id}`);
}

/**
 * 5. POST /exam/answer - Submit student answer for a question
 * @param {string} sessionId - Active exam session ID
 * @param {number} questionId - ID of question being answered
 * @param {number} selectedAnswer - Zero-based option index (0, 1, 2, 3...)
 * @returns {Promise<{message: string, isCorrect: boolean, attempted: number, correct: number, wrong: number}>}
 */
export async function submitAnswer(sessionId, questionId, selectedAnswer) {
  return request('/exam/answer', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      questionId: Number(questionId),
      selectedAnswer: Number(selectedAnswer),
    }),
  });
}

/**
 * 6. GET /exam/session/:sessionId - Fetch real-time session progress and answer history
 * @param {string} sessionId - Active exam session ID
 * @returns {Promise<{
 *   sessionId: string,
 *   userId: string,
 *   name: string,
 *   startedAt: string,
 *   submittedAt: string|null,
 *   status: string,
 *   attempted: number,
 *   correct: number,
 *   wrong: number,
 *   answers: Array<{questionId: number, selectedAnswer: number, isCorrect: boolean, answeredAt: string}>
 * }>}
 */
export async function getSessionDetails(sessionId) {
  return request(`/exam/session/${encodeURIComponent(sessionId)}`);
}

/**
 * 7. POST /exam/submit - Submit and complete the whole exam
 * @param {string} sessionId - Active exam session ID
 * @returns {Promise<{message: string, result: {attempted: number, correct: number, wrong: number}}>}
 */
export async function submitExam(sessionId) {
  return request('/exam/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

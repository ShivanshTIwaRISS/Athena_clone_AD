// src/services/api.js
/**
 * VEYRA Backend API Client
 * Smart Assessments. Seamless Execution.
 *
 * Covers all backend endpoints with consistent error handling,
 * automatic token injection, and typed responses.
 */

const API_BASE_URL = 'http://127.0.0.1:3000';

// ─── Token Management ─────────────────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem('veyra_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('veyra_token', token);
  else localStorage.removeItem('veyra_token');
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('veyra_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('veyra_user', JSON.stringify(user));
  else localStorage.removeItem('veyra_user');
}

export function clearAuth() {
  localStorage.removeItem('veyra_token');
  localStorage.removeItem('veyra_user');
}

// ─── Core Request Helper ──────────────────────────────────────────────────────
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({ message: 'Invalid JSON response' }));

    if (!response.ok) {
      const error = new Error(data?.message || `Request failed: ${response.status}`);
      error.status = response.status;
      error.data = data;
      if (response.status === 401) {
        clearAuth();
      }
      throw error;
    }
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      throw new Error(`Cannot connect to VEYRA backend at ${API_BASE_URL}. Ensure the backend server is running.`, { cause: err });
    }
    throw err;
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────
export async function checkBackendHealth() {
  return request('/');
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function firstRunSetup({ name, email, password }) {
  return request('/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function signIn({ email, password }) {
  return request('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentUser() {
  return request('/auth/me');
}

export async function registerUser({ name, email, password, role }) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
}

export async function listUsers() {
  return request('/users');
}

// ─── Exams ────────────────────────────────────────────────────────────────────
export async function listExams() {
  return request('/exams');
}

export async function getExam(id) {
  return request(`/exams/${id}`);
}

export async function createExam(data) {
  return request('/exams', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateExam(id, data) {
  return request(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function setExamStatus(id, status) {
  return request(`/exams/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
}

export async function duplicateExam(id) {
  return request(`/exams/${id}/duplicate`, { method: 'POST' });
}

export async function deleteExam(id) {
  return request(`/exams/${id}`, { method: 'DELETE' });
}

// ─── Question Bank ────────────────────────────────────────────────────────────
export async function listQuestions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.status) params.set('status', filters.status);
  if (filters.topic) params.set('topic', filters.topic);
  const qs = params.toString();
  return request(`/questions${qs ? '?' + qs : ''}`);
}

export async function getQuestion(id) {
  return request(`/questions/${id}`);
}

export async function createQuestion(data) {
  return request('/questions', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateQuestion(id, data) {
  return request(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteQuestion(id) {
  return request(`/questions/${id}`, { method: 'DELETE' });
}

export async function importQuestions(questions) {
  return request('/questions/import', { method: 'POST', body: JSON.stringify({ questions }) });
}

// ─── Exam Questions (candidate delivery) ─────────────────────────────────────
export async function getExamQuestions(examId) {
  return request(`/exam/${examId}/questions`);
}

// ─── Legacy (backward compat) ─────────────────────────────────────────────────
export async function getAllQuestions() {
  return request('/exam/mcq');
}

export async function getQuestionById(id) {
  return request(`/exam/mcq/${id}`);
}

// ─── Exam Sessions ────────────────────────────────────────────────────────────
export async function startExam(examId) {
  return request('/exam/start', {
    method: 'POST',
    body: JSON.stringify({ examId }),
  });
}

// Legacy start (no examId)
export async function startExamLegacy(userId, name) {
  void userId; void name; // userId/name now come from auth token
  return request('/exam/start', { method: 'POST', body: JSON.stringify({}) });
}

export async function submitAnswer(sessionId, questionId, selectedAnswer) {
  return request('/exam/answer', {
    method: 'POST',
    body: JSON.stringify({ sessionId, questionId: String(questionId), selectedAnswer: Number(selectedAnswer) }),
  });
}

export async function getSessionDetails(sessionId) {
  return request(`/exam/session/${encodeURIComponent(sessionId)}`);
}

export async function submitExam(sessionId) {
  return request('/exam/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

export async function recordProctoringSnap(sessionId, type) {
  return request(`/exam/session/${encodeURIComponent(sessionId)}/proctoring`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
}

// ─── Attempt History ──────────────────────────────────────────────────────────
export async function getMyAttempts() {
  return request('/attempts/mine');
}

export async function getAllSessions(examId) {
  const qs = examId ? `?examId=${examId}` : '';
  return request(`/sessions${qs}`);
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getAnalyticsOverview() {
  return request('/analytics/overview');
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getSettings() {
  return request('/settings');
}

export async function saveSettings(data) {
  return request('/settings', { method: 'PUT', body: JSON.stringify(data) });
}

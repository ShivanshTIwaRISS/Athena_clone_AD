// src/services/api.js
/**
 * VEYRA Backend API Client
 * Dynamically resolves the backend port from Electron IPC (backend-port event)
 * so the frontend always connects to the correct port whether in dev or packaged.
 */

let _resolvedPort = null;
let _portResolvers = [];

function setPort(port) {
  _resolvedPort = Number(port) || 3000;
  _portResolvers.forEach((r) => r(_resolvedPort));
  _portResolvers = [];
}

/**
 * Initialise port resolution. Must be called once from App.jsx on mount.
 * Registers IPC handlers if running inside Electron.
 */
export async function initBackendPort(defaultPort = 3000) {
  if (_resolvedPort !== null) return _resolvedPort;

  const bridge = window.veyra;
  if (bridge?.getBackendPort) {
    try {
      const port = await bridge.getBackendPort();
      if (port) {
        setPort(port);
        return port;
      }
    } catch (e) {
      console.warn('[VEYRA] getBackendPort query failed:', e);
    }
  }

  if (bridge?.registerBackendPortListener) {
    bridge.registerBackendPortListener((port) => {
      setPort(port);
    });
  } else {
    // Browser / plain dev mode: use the default
    setPort(defaultPort);
  }

  return _resolvedPort;
}

/** Returns a promise that resolves to the backend port number. */
async function getPort() {
  if (_resolvedPort !== null) return _resolvedPort;

  const bridge = window.veyra;
  if (bridge?.getBackendPort) {
    try {
      const port = await bridge.getBackendPort();
      if (port) {
        setPort(port);
        return _resolvedPort;
      }
    } catch {
      // fallback
    }
  }

  return new Promise((resolve) => {
    _portResolvers.push(resolve);
    // Safety: if port never arrives within 1.5s, fall back to 3000
    setTimeout(() => {
      if (_resolvedPort === null) {
        setPort(3000);
      }
    }, 1500);
  });
}

/**
 * Unified JSON fetch helper with error handling.
 * In Electron, delegates to window.veyra.apiRequest to run directly in Node.js,
 * completely bypassing browser CORS, PNA, and file:// protocol restrictions.
 */
async function request(endpoint, options = {}) {
  const bridge = window.veyra;
  if (bridge?.apiRequest) {
    try {
      return await bridge.apiRequest(endpoint, options);
    } catch (err) {
      console.warn(`[VEYRA] API IPC call failed for ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Fallback for standalone browser dev mode
  const port = await getPort();
  const base = `http://127.0.0.1:${port}`;
  const url = `${base}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
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
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      throw new Error(
        `Cannot connect to Exam Backend at ${base}. Ensure the backend server is running.`,
        { cause: err }
      );
    }
    throw err;
  }
}

/** 1. GET / – Health check */
export async function checkBackendHealth() {
  return request('/');
}

/** 2. POST /exam/start – Start a new session */
export async function startExam(userId, name) {
  return request('/exam/start', {
    method: 'POST',
    body: JSON.stringify({ userId, name }),
  });
}

/** 3. GET /exam/mcq – All questions (no answers) */
export async function getAllQuestions() {
  return request('/exam/mcq');
}

/** 4. GET /exam/mcq/:id – Single question */
export async function getQuestionById(id) {
  return request(`/exam/mcq/${id}`);
}

/** 5. POST /exam/answer – Submit an answer */
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

/** 6. GET /exam/session/:sessionId – Session progress */
export async function getSessionDetails(sessionId) {
  return request(`/exam/session/${encodeURIComponent(sessionId)}`);
}

/** 7. POST /exam/submit – Finalize exam */
export async function submitExam(sessionId) {
  return request('/exam/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

/** 8. GET /exam/sessions – Candidate attempt history */
export async function getSessions(userId) {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return request(`/exam/sessions${qs}`);
}

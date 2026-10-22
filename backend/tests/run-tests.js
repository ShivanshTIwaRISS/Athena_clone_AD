// backend/tests/run-tests.js
/**
 * VEYRA Candidate Examination Backend Integration Test Suite
 * Smart Assessments. Seamless Execution.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

const TEST_PORT = 3199;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// ── Isolated temp data directory so tests NEVER write to production data ─────
const REAL_DATA_DIR = path.join(__dirname, '..', 'data');
let TEST_DATA_DIR = null;

function setupTestDataDir() {
  TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'veyra-test-'));
  // Copy questions.json so the server can serve questions during tests
  fs.copyFileSync(
    path.join(REAL_DATA_DIR, 'questions.json'),
    path.join(TEST_DATA_DIR, 'questions.json')
  );
  // Seed empty sessions and users
  fs.writeFileSync(path.join(TEST_DATA_DIR, 'sessions.json'), '[]');
  fs.writeFileSync(path.join(TEST_DATA_DIR, 'users.json'), '[]');
}

function teardownTestDataDir() {
  if (TEST_DATA_DIR) {
    try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
    TEST_DATA_DIR = null;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

let serverProcess = null;
let testSessionId = null;
let sampleQuestionId = null;

function logPass(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function logFail(msg, err) {
  console.error(`  \x1b[31m✗\x1b[0m ${msg}`);
  if (err) console.error(err);
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, ok: response.ok, data };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await request('/');
      if (res.ok) return true;
    } catch {
      // wait
    }
    await sleep(250);
  }
  throw new Error('Server did not start within timeout');
}

async function runTests() {
  console.log('\n\x1b[1m\x1b[34m═══ VEYRA Candidate Examination Integration Tests ═══\x1b[0m\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      logPass(name);
      passed++;
    } catch (err) {
      logFail(name, err);
      failed++;
    }
  }

  // 1. Health check
  await test('GET / returns backend health status', async () => {
    const res = await request('/');
    if (!res.ok) throw new Error(`Status ${res.status}`);
    if (!res.data.message?.includes('running')) {
      throw new Error(`Unexpected message: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Fetch all questions for candidate
  await test('GET /exam/mcq returns candidate-safe questions (no correctAnswer field)', async () => {
    const res = await request('/exam/mcq');
    if (!res.ok) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data) || res.data.length === 0) {
      throw new Error('Expected non-empty array of questions');
    }

    // Ensure correct answers are NEVER exposed to candidate
    for (const q of res.data) {
      if (q.correctAnswer !== undefined) {
        throw new Error(`Security breach: correctAnswer exposed on question ID ${q.id}`);
      }
      if (!q.question || !Array.isArray(q.options)) {
        throw new Error(`Malformed question: ${JSON.stringify(q)}`);
      }
    }
    sampleQuestionId = res.data[0].id;
  });

  // 3. Fetch single question
  await test('GET /exam/mcq/:id returns sanitized individual question', async () => {
    const res = await request(`/exam/mcq/${sampleQuestionId}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    if (res.data.correctAnswer !== undefined) {
      throw new Error('Security breach: correctAnswer exposed');
    }
    if (res.data.id !== sampleQuestionId) {
      throw new Error(`ID mismatch: expected ${sampleQuestionId}, got ${res.data.id}`);
    }
  });

  // 4. Start Exam Session
  await test('POST /exam/start initializes candidate session', async () => {
    const res = await request('/exam/start', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'student-test-01',
        name: 'Aditya Test Candidate',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (!res.data.sessionId) throw new Error('Missing sessionId in response');
    testSessionId = res.data.sessionId;
  });

  // 5. Submit single answer
  await test('POST /exam/answer records and auto-saves candidate answer', async () => {
    const res = await request('/exam/answer', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: testSessionId,
        questionId: sampleQuestionId,
        selectedAnswer: 1,
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.attempted !== 1) {
      throw new Error(`Expected attempted count 1, got ${res.data.attempted}`);
    }
  });

  // 6. Check Session Progress
  await test('GET /exam/session/:sessionId tracks candidate progress and submitted answer', async () => {
    const res = await request(`/exam/session/${encodeURIComponent(testSessionId)}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    if (res.data.sessionId !== testSessionId) throw new Error('Session ID mismatch');
    if (res.data.status !== 'in-progress') throw new Error(`Expected in-progress status, got ${res.data.status}`);
    if (!Array.isArray(res.data.answers) || res.data.answers.length !== 1) {
      throw new Error('Expected 1 recorded answer in session');
    }
  });

  // 7. Submit Exam
  await test('POST /exam/submit completes exam and locks session', async () => {
    const res = await request('/exam/submit', {
      method: 'POST',
      body: JSON.stringify({ sessionId: testSessionId }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (!res.data.result) throw new Error('Expected result scorecard object');

    // Verify session is now locked
    const checkRes = await request(`/exam/session/${encodeURIComponent(testSessionId)}`);
    if (checkRes.data.status !== 'submitted') {
      throw new Error(`Expected submitted status, got ${checkRes.data.status}`);
    }
  });

  // 8. Attempt History
  await test('GET /exam/sessions returns candidate attempt history', async () => {
    const res = await request('/exam/sessions?userId=student-test-01');
    if (!res.ok) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data) || res.data.length === 0) {
      throw new Error('Expected session history for candidate');
    }
  });

  // 9. Auth: Register a new candidate
  let authTestToken = null;
  const testCandidateEmail = `test.candidate.${Date.now()}@veyra.io`;

  await test('POST /auth/register creates candidate account and returns JWT', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Candidate',
        email: testCandidateEmail,
        password: 'Password123!',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (!res.data.token || !res.data.user?.userId) {
      throw new Error(`Invalid registration response: ${JSON.stringify(res.data)}`);
    }
    if (res.data.user.passwordHash || res.data.user.password) {
      throw new Error('Security flaw: password or hash leaked in registration response');
    }
    authTestToken = res.data.token;
  });

  // 10. Auth: Login with valid credentials
  await test('POST /auth/login authenticates candidate and returns JWT', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testCandidateEmail,
        password: 'Password123!',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (!res.data.token || res.data.user.email !== testCandidateEmail) {
      throw new Error(`Login response missing expected fields: ${JSON.stringify(res.data)}`);
    }
    authTestToken = res.data.token;
  });

  // 11. Auth: Reject invalid credentials
  await test('POST /auth/login rejects incorrect password with 401', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testCandidateEmail,
        password: 'WrongPassword!',
      }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // 12. Auth: GET /auth/me with Bearer token
  await test('GET /auth/me returns authenticated candidate profile', async () => {
    const res = await request('/auth/me', {
      headers: {
        Authorization: `Bearer ${authTestToken}`,
      },
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.email !== testCandidateEmail) {
      throw new Error(`Profile email mismatch: expected ${testCandidateEmail}, got ${res.data.email}`);
    }
    if (res.data.password || res.data.passwordHash) {
      throw new Error('Security flaw: password leaked in /auth/me');
    }
  });

  console.log('\n\x1b[1m' + (failed === 0 ? '\x1b[32mALL TESTS PASSED!' : `\x1b[31m${failed} TESTS FAILED`) + '\x1b[0m');
  console.log(`Passed: ${passed} | Failed: ${failed}\n`);

  return failed === 0;
}

async function main() {
  setupTestDataDir();
  const serverPath = path.join(__dirname, '..', 'server.js');
  console.log(`[TEST RUNNER] Spawning backend server on port ${TEST_PORT}...`);
  console.log(`[TEST RUNNER] Using isolated temp data dir: ${TEST_DATA_DIR}`);

  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: String(TEST_PORT), DATA_DIR: TEST_DATA_DIR },
    stdio: 'inherit',
  });

  try {
    await waitForServer();
    const success = await runTests();
    process.exitCode = success ? 0 : 1;
  } catch (err) {
    console.error('[TEST RUNNER] Fatal test error:', err);
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    teardownTestDataDir();
  }
}

main();

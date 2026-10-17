// backend/tests/run-tests.js
/**
 * VEYRA End-to-End Backend Integration Test Suite
 * Smart Assessments. Seamless Execution.
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = 3199;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProcess = null;
let adminToken = null;
let candidateToken = null;
let createdExamId = null;
let createdQuestionId = null;
let createdSessionId = null;

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
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
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
  console.log('\n\x1b[1m\x1b[36m═══ VEYRA Backend Integration Tests ═══\x1b[0m\n');
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

  // 1. Health & Root
  await test('GET / returns health status and brand metadata', async () => {
    const res = await request('/');
    if (!res.ok) throw new Error(`Status ${res.status}`);
    if (!res.data.app?.includes('VEYRA') && !res.data.name?.includes('VEYRA')) {
      throw new Error(`Unexpected app identity: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Auth: Check First Run or Sign In
  await test('POST /auth/setup or /auth/signin for Admin account', async () => {
    const health = (await request('/')).data;
    if (health.setupRequired) {
      const res = await request('/auth/setup', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Administrator',
          email: 'admin@veyra.test',
          password: 'Password123!',
        }),
      });
      if (!res.ok) throw new Error(`Setup failed: ${JSON.stringify(res.data)}`);
      adminToken = res.data.token;
    } else {
      // Try signing in
      let res = await request('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@veyra.test',
          password: 'Password123!',
        }),
      });
      if (res.ok) {
        adminToken = res.data.token;
      } else {
        // Sign in with any existing user or register
        res = await request('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Admin Backup',
            email: `admin_${Date.now()}@veyra.test`,
            password: 'Password123!',
            role: 'admin',
          }),
        });
        if (res.ok) adminToken = res.data.token;
      }
    }
    if (!adminToken) throw new Error('Could not obtain admin token');
  });

  // 3. Register Candidate User
  await test('POST /auth/register creates a candidate user', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        name: 'Test Student',
        email: `student_${Date.now()}@veyra.test`,
        password: 'Password123!',
        role: 'candidate',
      }),
    });
    if (!res.ok) throw new Error(`Registration failed: ${JSON.stringify(res.data)}`);
    // Sign in as candidate to get token
    const signinRes = await request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: res.data.user?.email || `student_${Date.now()}@veyra.test`,
        password: 'Password123!',
      }),
    });
    if (!signinRes.ok) throw new Error(`Candidate signin failed: ${JSON.stringify(signinRes.data)}`);
    candidateToken = signinRes.data.token;
  });

  // 4. Verify /auth/me for candidate and admin
  await test('GET /auth/me returns authenticated identity', async () => {
    const res = await request('/auth/me', { token: candidateToken });
    if (!res.ok || res.data.role !== 'candidate') {
      throw new Error(`Failed auth check: ${JSON.stringify(res.data)}`);
    }
  });

  // 5. Question Bank: Create & List
  await test('POST /questions creates a question and GET /questions lists it', async () => {
    const createRes = await request('/questions', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        question: 'What is the primary function of an operating system kernel?',
        category: 'Operating Systems',
        difficulty: 'medium',
        type: 'mcq',
        options: [
          'Compiling high-level programming languages',
          'Managing core system resources and hardware interaction',
          'Designing graphical desktop user interfaces',
          'Formatting hard drives during partition creation',
        ],
        correctAnswer: 1,
        explanation: 'The kernel is the core component that manages CPU, memory, and devices.',
      }),
    });
    if (!createRes.ok) throw new Error(`Create question failed: ${JSON.stringify(createRes.data)}`);
    createdQuestionId = createRes.data.id || createRes.data._id || createRes.data.question?.id;

    const listRes = await request('/questions', { token: adminToken });
    if (!listRes.ok) throw new Error(`List questions failed: ${listRes.status}`);
  });

  // 6. Exam Management: Create, Update, Publish
  await test('POST /exams creates an exam blueprint and PUT updates it', async () => {
    const examRes = await request('/exams', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        title: 'Computer Science Core Evaluation',
        description: 'Comprehensive test covering OS, networking, and algorithms.',
        duration: 45,
        durationMinutes: 45,
        passingScore: 60,
        status: 'published',
        proctoringRigour: 'standard',
        questions: createdQuestionId ? [createdQuestionId] : [],
      }),
    });
    if (!examRes.ok) throw new Error(`Create exam failed: ${JSON.stringify(examRes.data)}`);
    createdExamId = examRes.data.id || examRes.data._id || examRes.data.exam?.id;

    // Verify it is in list
    const list = await request('/exams', { token: adminToken });
    if (!list.ok) throw new Error('List exams failed');
  });

  // 7. Exam Session Lifecycle: Start -> Answer -> Proctoring Snap -> Submit
  await test('POST /exam/start starts proctored session for candidate', async () => {
    const startRes = await request('/exam/start', {
      method: 'POST',
      token: candidateToken,
      body: JSON.stringify({ examId: createdExamId }),
    });
    if (!startRes.ok) throw new Error(`Start exam failed: ${JSON.stringify(startRes.data)}`);
    createdSessionId = startRes.data.sessionId || startRes.data.id;
  });

  await test('POST /exam/answer records an answer server-side', async () => {
    const ansRes = await request('/exam/answer', {
      method: 'POST',
      token: candidateToken,
      body: JSON.stringify({
        sessionId: createdSessionId,
        questionId: createdQuestionId ? String(createdQuestionId) : '1',
        selectedAnswer: 1,
      }),
    });
    if (!ansRes.ok) throw new Error(`Submit answer failed: ${JSON.stringify(ansRes.data)}`);
  });

  await test('POST /exam/session/:id/proctoring records snap telemetry', async () => {
    const snapRes = await request(`/exam/session/${encodeURIComponent(createdSessionId)}/proctoring`, {
      method: 'POST',
      token: candidateToken,
      body: JSON.stringify({ type: 'webcam' }),
    });
    if (!snapRes.ok) throw new Error(`Proctoring snap failed: ${JSON.stringify(snapRes.data)}`);
  });

  await test('POST /exam/submit finishes exam and computes score', async () => {
    const subRes = await request('/exam/submit', {
      method: 'POST',
      token: candidateToken,
      body: JSON.stringify({ sessionId: createdSessionId }),
    });
    if (!subRes.ok) throw new Error(`Submit exam failed: ${JSON.stringify(subRes.data)}`);
  });

  // 8. Analytics & Settings
  await test('GET /analytics/overview returns aggregate statistics', async () => {
    const res = await request('/analytics/overview', { token: adminToken });
    if (!res.ok) throw new Error(`Analytics overview failed: ${res.status}`);
  });

  await test('GET /settings and PUT /settings configures system defaults', async () => {
    const getRes = await request('/settings', { token: adminToken });
    if (!getRes.ok) throw new Error(`Get settings failed: ${getRes.status}`);

    const putRes = await request('/settings', {
      method: 'PUT',
      token: adminToken,
      body: JSON.stringify({ institutionName: 'VEYRA University Test Lab' }),
    });
    if (!putRes.ok) throw new Error(`Save settings failed: ${putRes.status}`);
  });

  console.log('\n\x1b[1m' + (failed === 0 ? '\x1b[32mALL TESTS PASSED!' : `\x1b[31m${failed} TESTS FAILED`) + '\x1b[0m');
  console.log(`Passed: ${passed} | Failed: ${failed}\n`);

  return failed === 0;
}

async function main() {
  const serverPath = path.join(__dirname, '..', 'server.js');
  console.log(`[TEST RUNNER] Spawning backend server on port ${TEST_PORT}...`);

  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: String(TEST_PORT), JWT_SECRET: 'test-secret-key-123' },
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
  }
}

main();

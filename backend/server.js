const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// ── JWT Secret ────────────────────────────────────────────────────────────────
// In production this should be an environment variable; for this desktop-local
// app a fixed constant is acceptable since the backend is only reachable on
// 127.0.0.1 anyway.
const JWT_SECRET = "veyra_exam_secret_2024_xk9z";
const JWT_EXPIRES_IN = "8h";

app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());

// ── File helpers ──────────────────────────────────────────────────────────────
const questionsPath = path.join(__dirname, "data", "questions.json");
const sessionsPath  = path.join(__dirname, "data", "sessions.json");
const usersPath     = path.join(__dirname, "data", "users.json");

function readQuestions() {
  try {
    const raw = fs.readFileSync(questionsPath, "utf-8").trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readSessions() {
  try {
    const raw = fs.readFileSync(sessionsPath, "utf-8").trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
}

function readUsers() {
  try {
    const raw = fs.readFileSync(usersPath, "utf-8").trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

function makeSessionId() {
  return `session-${Date.now()}`;
}

function makeUserId() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── JWT middleware ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function questionForStudent(question) {
  return {
    id: question.id,
    question: question.question,
    options: question.options,
  };
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Exam backend is running" });
});

// ═════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /auth/register
 * Body: { name, email, password }
 * Creates a new candidate account.
 */
app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName  = name.trim();

  if (trimmedName.length < 2) {
    return res.status(400).json({ message: "Name must be at least 2 characters." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  const users = readUsers();
  const existingUser = users.find((u) => u.email === trimmedEmail);
  if (existingUser) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = {
    userId: makeUserId(),
    name: trimmedName,
    email: trimmedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
    role: "candidate",
  };

  users.push(newUser);
  saveUsers(users);

  const token = jwt.sign(
    { userId: newUser.userId, name: newUser.name, email: newUser.email, role: newUser.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.status(201).json({
    message: "Account created successfully.",
    token,
    user: {
      userId: newUser.userId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    },
  });
});

/**
 * POST /auth/login
 * Body: { email, password }
 * Returns a JWT token on success.
 */
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email === trimmedEmail);

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = jwt.sign(
    { userId: user.userId, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    message: "Login successful.",
    token,
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

/**
 * GET /auth/me
 * Returns the authenticated user's profile from the JWT.
 */
app.get("/auth/me", requireAuth, (req, res) => {
  const users = readUsers();
  const user = users.find((u) => u.userId === req.user.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  res.json({
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  EXAM ROUTES (unchanged, but now auth is available if needed)
// ═════════════════════════════════════════════════════════════════════════════

// Start a new exam session
app.post("/exam/start", (req, res) => {
  const { userId, name } = req.body;

  if (!userId || !name) {
    return res.status(400).json({
      message: "userId and name are required",
    });
  }

  const sessions = readSessions();

  const questions = readQuestions();

  const session = {
    sessionId: makeSessionId(),
    userId,
    name,
    startedAt: new Date().toISOString(),
    submittedAt: null,
    status: "in-progress",
    attempted: 0,
    correct: 0,
    wrong: 0,
    totalQuestions: questions.length,
    flagCount: 0,
    flags: [],
    answers: [],
  };

  sessions.push(session);
  saveSessions(sessions);

  res.status(201).json({
    message: "Exam session started",
    sessionId: session.sessionId,
  });
});

// Get one question
app.get("/exam/mcq/:id", (req, res) => {
  const questions = readQuestions();
  const id = Number(req.params.id);

  const question = questions.find((item) => item.id === id);

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  res.json(questionForStudent(question));
});

// Get all questions without correct answers
app.get("/exam/mcq", (req, res) => {
  const questions = readQuestions();
  res.json(questions.map(questionForStudent));
});

// Submit one answer
app.post("/exam/answer", (req, res) => {
  const { sessionId, questionId, selectedAnswer } = req.body;

  if (!sessionId || questionId === undefined || selectedAnswer === undefined) {
    return res.status(400).json({
      message: "sessionId, questionId and selectedAnswer are required",
    });
  }

  const questions = readQuestions();
  const sessions = readSessions();

  const question = questions.find(
    (item) => item.id === Number(questionId)
  );

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  const session = sessions.find(
    (item) => item.sessionId === sessionId
  );

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  if (session.status !== "in-progress") {
    return res.status(400).json({ message: "Exam is already submitted" });
  }

  const existingAnswerIndex = session.answers.findIndex(
    (answer) => answer.questionId === Number(questionId)
  );

  const isCorrect = Number(selectedAnswer) === question.correctAnswer;

  if (existingAnswerIndex !== -1) {
    const prevAnswer = session.answers[existingAnswerIndex];
    if (prevAnswer.isCorrect) {
      session.correct = Math.max(0, session.correct - 1);
    } else {
      session.wrong = Math.max(0, session.wrong - 1);
    }

    session.answers[existingAnswerIndex] = {
      questionId: question.id,
      selectedAnswer: Number(selectedAnswer),
      isCorrect,
      answeredAt: new Date().toISOString(),
    };
  } else {
    session.answers.push({
      questionId: question.id,
      selectedAnswer: Number(selectedAnswer),
      isCorrect,
      answeredAt: new Date().toISOString(),
    });
    session.attempted += 1;
  }

  if (isCorrect) {
    session.correct += 1;
  } else {
    session.wrong += 1;
  }

  saveSessions(sessions);

  res.json({
    message: existingAnswerIndex !== -1 ? "Answer updated" : "Answer saved",
    isCorrect,
    attempted: session.attempted,
    correct: session.correct,
    wrong: session.wrong,
  });
});

// Record a proctoring flag / violation
app.post("/exam/flag", (req, res) => {
  const { sessionId, type, reason, details } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" });
  }

  const sessions = readSessions();
  const session = sessions.find((item) => item.sessionId === sessionId);

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  if (!Array.isArray(session.flags)) {
    session.flags = [];
  }

  const flagEntry = {
    flagId: `flag-${Date.now()}`,
    type: type || "SUSPICIOUS_ACTIVITY",
    reason: reason || "Proctoring violation detected",
    details: details || null,
    timestamp: new Date().toISOString(),
  };

  session.flags.push(flagEntry);
  session.flagCount = session.flags.length;
  saveSessions(sessions);

  res.json({
    message: "Proctoring flag logged",
    flagCount: session.flagCount,
    flag: flagEntry,
  });
});

function buildSessionReview(session) {
  const questions = readQuestions();
  return questions.map((q) => {
    const userAns = session.answers ? session.answers.find((a) => a.questionId === q.id) : null;
    const attempted = userAns !== undefined && userAns !== null && userAns.selectedAnswer !== null;
    const isCorrect = attempted ? Boolean(userAns.isCorrect) : false;
    return {
      questionId: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      correctOptionText: q.options[q.correctAnswer] || "",
      selectedAnswer: attempted ? userAns.selectedAnswer : null,
      selectedOptionText: attempted ? (q.options[userAns.selectedAnswer] || "") : null,
      isCorrect,
      status: !attempted ? "skipped" : (isCorrect ? "correct" : "wrong"),
      explanation: q.explanation || "No explanation provided.",
      topic: q.topic || "General",
      difficulty: q.difficulty || "medium",
    };
  });
}

// Get current session progress
app.get("/exam/session/:sessionId", (req, res) => {
  const sessions = readSessions();

  const session = sessions.find(
    (item) => item.sessionId === req.params.sessionId
  );

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  if (session.status === "submitted") {
    return res.json({
      ...session,
      review: buildSessionReview(session),
    });
  }

  res.json(session);
});

// Submit the whole exam
app.post("/exam/submit", (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" });
  }

  const sessions = readSessions();

  const session = sessions.find(
    (item) => item.sessionId === sessionId
  );

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  session.status = "submitted";
  session.submittedAt = new Date().toISOString();

  saveSessions(sessions);

  const review = buildSessionReview(session);

  res.json({
    message: "Exam submitted successfully",
    result: {
      attempted: session.attempted,
      correct: session.correct,
      wrong: session.wrong,
    },
    review,
  });
});

// Answer key & solution review
app.get("/exam/session/:sessionId/review", (req, res) => {
  const sessions = readSessions();
  const session = sessions.find(
    (item) => item.sessionId === req.params.sessionId
  );

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  res.json(buildSessionReview(session));
});

// Candidate session history
app.get("/exam/sessions", (req, res) => {
  const sessions = readSessions();
  const { userId } = req.query;
  if (userId) {
    return res.json(sessions.filter((s) => s.userId === userId));
  }
  res.json(sessions);
});

// ── Start server ──────────────────────────────────────────────────────────────
const HOST = "127.0.0.1";
const server = app.listen(PORT, HOST, () => {
  console.log(`Exam backend running at http://${HOST}:${PORT}`);
});

server.on("error", (err) => {
  console.error(`[VEYRA Backend Error] ${err.message}`);
  process.exit(1);
});

module.exports = { app };

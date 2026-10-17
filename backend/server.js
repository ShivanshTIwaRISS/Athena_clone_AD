/**
 * VEYRA Examination Platform - Backend API Server
 * Smart Assessments. Seamless Execution.
 *
 * Express REST API with:
 * - Authentication (bcrypt + JWT, first-run admin setup)
 * - Exam management (CRUD, publish, archive)
 * - Question bank (CRUD, import/export)
 * - Session & attempt tracking (server-authoritative timing)
 * - Server-side grading (correct answers never sent to candidate)
 * - Analytics aggregation
 * - Proctoring session metadata
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// ─── JWT: optional, graceful degradation if not installed ────────────────────
let jwt = null;
try { jwt = require("jsonwebtoken"); } catch { /* optional */ }

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || "veyra-local-secret-change-in-prod-" + process.pid;
const SALT_ROUNDS = 12;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// ─── Data File Paths ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, "data");
const usersPath = path.join(DATA_DIR, "users.json");
const examsPath = path.join(DATA_DIR, "exams.json");
const questionsPath = path.join(DATA_DIR, "questions.json");
const sessionsPath = path.join(DATA_DIR, "sessions.json");

// Ensure data dir exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Atomic JSON Helpers ──────────────────────────────────────────────────────
function readJSON(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
      return defaultVal;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`[VEYRA] Failed to read ${filePath}:`, err.message);
    return defaultVal;
  }
}

function writeJSON(filePath, data) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath); // atomic on same filesystem
}

function readUsers() { return readJSON(usersPath, []); }
function writeUsers(u) { writeJSON(usersPath, u); }
function readExams() { return readJSON(examsPath, []); }
function writeExams(e) { writeJSON(examsPath, e); }
function readQuestions() { return readJSON(questionsPath, []); }
function writeQuestions(q) { writeJSON(questionsPath, q); }
function readSessions() { return readJSON(sessionsPath, []); }
function writeSessions(s) { writeJSON(sessionsPath, s); }

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const token = authHeader.slice(7);
  if (!jwt) {
    // Fallback: simple base64 encoded userId:role
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString());
      req.user = decoded;
      return next();
    } catch {
      return res.status(401).json({ message: "Invalid token" });
    }
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token expired or invalid" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

function signToken(payload) {
  if (!jwt) {
    return Buffer.from(JSON.stringify(payload)).toString("base64");
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

// ─── Helper: Strip correct answers for candidate delivery ────────────────────
function sanitizeQuestionForCandidate(q) {
  const { correctAnswer, correctAnswers, explanation, ...safe } = q;
  void correctAnswer; void correctAnswers; void explanation;
  return safe;
}

// ─── Helper: Format timing ────────────────────────────────────────────────────
function now() { return new Date().toISOString(); }

// ─────────────────────────────────────────────────────────────────────────────
//  HEALTH
// ─────────────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  const users = readUsers();
  res.json({
    status: "ok",
    app: "VEYRA Examination Platform",
    tagline: "Smart Assessments. Seamless Execution.",
    version: "2.0.0",
    setupRequired: users.length === 0,
    timestamp: now(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: now() });
});

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────────────────────────────────────

// First-run admin setup
app.post("/auth/setup", async (req, res) => {
  const users = readUsers();
  if (users.length > 0) {
    return res.status(409).json({ message: "Admin account already exists. Please sign in." });
  }
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const admin = {
    id: uuidv4(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hash,
    role: "admin",
    createdAt: now(),
  };
  writeUsers([admin]);

  // Migrate legacy questions to enriched format
  const qs = readQuestions();
  const migrated = qs.map((q) => ({
    id: q.id || uuidv4(),
    question: q.question || "",
    type: q.type || "single-choice",
    options: q.options || [],
    correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
    marks: q.marks || 1,
    negativeMark: q.negativeMark || 0,
    difficulty: q.difficulty || "medium",
    topic: q.topic || "General",
    category: q.category || "General",
    explanation: q.explanation || "",
    status: q.status || "published",
    createdAt: q.createdAt || now(),
    updatedAt: now(),
    createdBy: admin.id,
  }));
  writeQuestions(migrated);

  // Seed a default published exam using the migrated questions
  const exams = readExams();
  if (exams.length === 0 && migrated.length > 0) {
    const seedExam = {
      id: uuidv4(),
      title: "VEYRA Demo Examination",
      description: "A demonstration examination covering Electron, IPC, and JavaScript fundamentals.",
      instructions: "Read each question carefully. You may navigate between questions freely. Your answers are auto-saved.",
      category: "Technology",
      duration: 30,
      totalMarks: migrated.length,
      passingMarks: Math.ceil(migrated.length * 0.4),
      maxAttempts: 3,
      marksPerQuestion: 1,
      negativeMarking: false,
      questionIds: migrated.map((q) => q.id),
      shuffleQuestions: false,
      shuffleOptions: false,
      allowNavigation: true,
      showResultAfterSubmit: true,
      showCorrectAnswersAfterSubmit: true,
      proctoring: { webcam: true, screen: true },
      status: "published",
      startDate: null,
      endDate: null,
      createdBy: admin.id,
      createdAt: now(),
      updatedAt: now(),
    };
    writeExams([seedExam]);
  }

  const token = signToken({ id: admin.id, role: admin.role, name: admin.name, email: admin.email });
  res.status(201).json({ message: "Admin account created", token, user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
});

// Sign in
app.post("/auth/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }
  const users = readUsers();
  const user = users.find((u) => u.email === email.trim().toLowerCase());
  if (!user) {
    await new Promise((r) => setTimeout(r, 400)); // timing-safe delay
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = signToken({ id: user.id, role: user.role, name: user.name, email: user.email });
  res.json({ message: "Signed in", token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// Get current user profile
app.get("/auth/me", verifyToken, (req, res) => {
  const users = readUsers();
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const { passwordHash, ...safe } = user;
  void passwordHash;
  res.json(safe);
});

// Register a candidate (admin only)
app.post("/auth/register", verifyToken, requireRole("admin"), async (req, res) => {
  const { name, email, password, role = "candidate" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }
  if (!["admin", "candidate"].includes(role)) {
    return res.status(400).json({ message: "role must be admin or candidate" });
  }
  const users = readUsers();
  if (users.find((u) => u.email === email.trim().toLowerCase())) {
    return res.status(409).json({ message: "Email already registered" });
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const newUser = {
    id: uuidv4(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hash,
    role,
    createdAt: now(),
    createdBy: req.user.id,
  };
  users.push(newUser);
  writeUsers(users);
  const { passwordHash: _, ...safe } = newUser;
  void _;
  res.status(201).json({ message: "User created", user: safe });
});

// List all users (admin only)
app.get("/users", verifyToken, requireRole("admin"), (req, res) => {
  const users = readUsers().map(({ passwordHash, ...u }) => { void passwordHash; return u; });
  res.json(users);
});

// ─────────────────────────────────────────────────────────────────────────────
//  EXAMS
// ─────────────────────────────────────────────────────────────────────────────

// List exams (admin: all; candidate: published only)
app.get("/exams", verifyToken, (req, res) => {
  let exams = readExams();
  if (req.user.role !== "admin") {
    exams = exams.filter((e) => e.status === "published");
  }
  // Strip question answer data
  res.json(exams.map(({ questionIds, ...e }) => ({ ...e, questionCount: (questionIds || []).length })));
});

// Get single exam
app.get("/exams/:id", verifyToken, (req, res) => {
  const exams = readExams();
  const exam = exams.find((e) => e.id === req.params.id);
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  if (req.user.role !== "admin" && exam.status !== "published") {
    return res.status(403).json({ message: "Exam not available" });
  }
  const { questionIds, ...safeExam } = exam;
  res.json({ ...safeExam, questionCount: (questionIds || []).length });
});

// Create exam (admin only)
app.post("/exams", verifyToken, requireRole("admin"), (req, res) => {
  const {
    title, description, instructions, category, duration, totalMarks,
    passingMarks, maxAttempts, marksPerQuestion, negativeMarking,
    questionIds, shuffleQuestions, shuffleOptions, allowNavigation,
    showResultAfterSubmit, showCorrectAnswersAfterSubmit, proctoring,
    startDate, endDate, status,
  } = req.body;

  const durationVal = duration || req.body.durationMinutes;
  const qIds = Array.isArray(questionIds) ? questionIds : (Array.isArray(req.body.questions) ? req.body.questions : []);

  if (!title || !durationVal) {
    return res.status(400).json({ message: "title and duration are required" });
  }

  const exam = {
    id: uuidv4(),
    title: title.trim(),
    description: description || "",
    instructions: instructions || "",
    category: category || "General",
    duration: Number(durationVal) || 30,
    durationMinutes: Number(durationVal) || 30,
    totalMarks: Number(totalMarks) || qIds.length,
    passingMarks: Number(passingMarks) || Number(req.body.passingScore) || 0,
    passingScore: Number(req.body.passingScore) || Number(passingMarks) || 60,
    maxAttempts: Number(maxAttempts) || 1,
    marksPerQuestion: Number(marksPerQuestion) || 1,
    negativeMarking: Boolean(negativeMarking),
    questionIds: qIds,
    shuffleQuestions: Boolean(shuffleQuestions || req.body.randomizeQuestions),
    shuffleOptions: Boolean(shuffleOptions),
    allowNavigation: allowNavigation !== false,
    showResultAfterSubmit: showResultAfterSubmit !== false,
    showCorrectAnswersAfterSubmit: Boolean(showCorrectAnswersAfterSubmit || req.body.allowReview),
    proctoring: proctoring || { webcam: req.body.cameraRequired !== false, screen: req.body.screenCaptureRequired !== false },
    status: status || (req.body.published ? "published" : "draft"),
    startDate: startDate || null,
    endDate: endDate || null,
    createdBy: req.user.id,
    createdAt: now(),
  };

  const exams = readExams();
  exams.push(exam);
  writeExams(exams);
  res.status(201).json({ message: "Exam created", exam });
});

// Update exam (admin only)
app.put("/exams/:id", verifyToken, requireRole("admin"), (req, res) => {
  const exams = readExams();
  const idx = exams.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Exam not found" });

  const exam = exams[idx];
  const allowedFields = [
    "title","description","instructions","category","duration","totalMarks",
    "passingMarks","maxAttempts","marksPerQuestion","negativeMarking",
    "questionIds","shuffleQuestions","shuffleOptions","allowNavigation",
    "showResultAfterSubmit","showCorrectAnswersAfterSubmit","proctoring",
    "startDate","endDate",
  ];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      exam[field] = req.body[field];
    }
  }
  exam.updatedAt = now();
  writeExams(exams);
  res.json({ message: "Exam updated", exam });
});

// Publish / unpublish / archive / duplicate
app.post("/exams/:id/status", verifyToken, requireRole("admin"), (req, res) => {
  const { status } = req.body;
  if (!["draft","published","archived"].includes(status)) {
    return res.status(400).json({ message: "status must be draft, published, or archived" });
  }
  const exams = readExams();
  const idx = exams.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Exam not found" });
  exams[idx].status = status;
  exams[idx].updatedAt = now();
  writeExams(exams);
  res.json({ message: `Exam ${status}`, exam: exams[idx] });
});

app.post("/exams/:id/duplicate", verifyToken, requireRole("admin"), (req, res) => {
  const exams = readExams();
  const src = exams.find((e) => e.id === req.params.id);
  if (!src) return res.status(404).json({ message: "Exam not found" });
  const copy = {
    ...src,
    id: uuidv4(),
    title: `${src.title} (Copy)`,
    status: "draft",
    createdBy: req.user.id,
    createdAt: now(),
    updatedAt: now(),
  };
  exams.push(copy);
  writeExams(exams);
  res.status(201).json({ message: "Exam duplicated", exam: copy });
});

// Delete exam (admin only, only if no in-progress sessions)
app.delete("/exams/:id", verifyToken, requireRole("admin"), (req, res) => {
  const sessions = readSessions();
  const active = sessions.find((s) => s.examId === req.params.id && s.status === "in-progress");
  if (active) return res.status(409).json({ message: "Cannot delete exam with active sessions" });
  const exams = readExams();
  const idx = exams.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Exam not found" });
  exams.splice(idx, 1);
  writeExams(exams);
  res.json({ message: "Exam deleted" });
});

// ─────────────────────────────────────────────────────────────────────────────
//  QUESTION BANK
// ─────────────────────────────────────────────────────────────────────────────

// List questions (admin: all; candidates never hit this)
app.get("/questions", verifyToken, requireRole("admin"), (req, res) => {
  let questions = readQuestions();
  const { search, category, difficulty, status, topic } = req.query;
  if (search) {
    const s = search.toLowerCase();
    questions = questions.filter((q) => q.question.toLowerCase().includes(s));
  }
  if (category) questions = questions.filter((q) => q.category === category);
  if (difficulty) questions = questions.filter((q) => q.difficulty === difficulty);
  if (status) questions = questions.filter((q) => q.status === status);
  if (topic) questions = questions.filter((q) => q.topic === topic);
  res.json(questions);
});

// Get single question (admin: with answer; candidate: without)
app.get("/questions/:id", verifyToken, (req, res) => {
  const questions = readQuestions();
  const q = questions.find((item) => String(item.id) === String(req.params.id));
  if (!q) return res.status(404).json({ message: "Question not found" });
  if (req.user.role !== "admin") {
    return res.json(sanitizeQuestionForCandidate(q));
  }
  res.json(q);
});

// Create question (admin only)
app.post("/questions", verifyToken, requireRole("admin"), (req, res) => {
  const { question, type, options, correctAnswer, marks, negativeMark, difficulty, topic, category, explanation } = req.body;
  if (!question || !options || correctAnswer === undefined) {
    return res.status(400).json({ message: "question, options, and correctAnswer are required" });
  }
  const questions = readQuestions();
  // Use numeric IDs for backward compatibility with old sessions
  const maxId = questions.reduce((m, q) => Math.max(m, typeof q.id === "number" ? q.id : 0), 0);
  const newQ = {
    id: maxId + 1,
    question: question.trim(),
    type: type || "single-choice",
    options: Array.isArray(options) ? options : [],
    correctAnswer: Number(correctAnswer),
    marks: Number(marks) || 1,
    negativeMark: Number(negativeMark) || 0,
    difficulty: difficulty || "medium",
    topic: topic || "General",
    category: category || "General",
    explanation: explanation || "",
    status: "published",
    createdAt: now(),
    updatedAt: now(),
    createdBy: req.user.id,
  };
  questions.push(newQ);
  writeQuestions(questions);
  res.status(201).json({ message: "Question created", question: newQ });
});

// Update question (admin only)
app.put("/questions/:id", verifyToken, requireRole("admin"), (req, res) => {
  const questions = readQuestions();
  const idx = questions.findIndex((q) => String(q.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Question not found" });
  const allowed = ["question","type","options","correctAnswer","marks","negativeMark","difficulty","topic","category","explanation","status"];
  for (const f of allowed) {
    if (req.body[f] !== undefined) questions[idx][f] = req.body[f];
  }
  questions[idx].updatedAt = now();
  writeQuestions(questions);
  res.json({ message: "Question updated", question: questions[idx] });
});

// Delete question (admin only)
app.delete("/questions/:id", verifyToken, requireRole("admin"), (req, res) => {
  const questions = readQuestions();
  const idx = questions.findIndex((q) => String(q.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Question not found" });
  questions.splice(idx, 1);
  writeQuestions(questions);
  res.json({ message: "Question deleted" });
});

// Bulk import questions (admin only)
app.post("/questions/import", verifyToken, requireRole("admin"), (req, res) => {
  const { questions: incoming } = req.body;
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({ message: "questions array is required" });
  }
  const questions = readQuestions();
  const maxId = questions.reduce((m, q) => Math.max(m, typeof q.id === "number" ? q.id : 0), 0);
  const results = { imported: 0, errors: [] };
  let idCounter = maxId + 1;

  for (let i = 0; i < incoming.length; i++) {
    const row = incoming[i];
    if (!row.question || !row.options || row.correctAnswer === undefined) {
      results.errors.push({ row: i + 1, error: "Missing required fields: question, options, correctAnswer" });
      continue;
    }
    questions.push({
      id: idCounter++,
      question: String(row.question).trim(),
      type: row.type || "single-choice",
      options: Array.isArray(row.options) ? row.options : String(row.options).split("|").map(s => s.trim()),
      correctAnswer: Number(row.correctAnswer),
      marks: Number(row.marks) || 1,
      negativeMark: Number(row.negativeMark) || 0,
      difficulty: row.difficulty || "medium",
      topic: row.topic || "General",
      category: row.category || "General",
      explanation: row.explanation || "",
      status: "published",
      createdAt: now(),
      updatedAt: now(),
      createdBy: req.user.id,
    });
    results.imported++;
  }
  writeQuestions(questions);
  res.json({ message: `Imported ${results.imported} questions`, ...results });
});

// ─────────────────────────────────────────────────────────────────────────────
//  EXAM QUESTIONS (for exam delivery - candidate safe)
// ─────────────────────────────────────────────────────────────────────────────

// Get all questions for a specific exam (candidate: no answers)
app.get("/exam/:examId/questions", verifyToken, (req, res) => {
  const exams = readExams();
  const exam = exams.find((e) => e.id === req.params.examId);
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  if (req.user.role !== "admin" && exam.status !== "published") {
    return res.status(403).json({ message: "Exam not available" });
  }
  const questions = readQuestions();
  let examQuestions = (exam.questionIds || [])
    .map((qId) => questions.find((q) => String(q.id) === String(qId)))
    .filter(Boolean);
  if (req.user.role !== "admin") {
    examQuestions = examQuestions.map(sanitizeQuestionForCandidate);
  }
  res.json(examQuestions);
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEGACY EXAM ENDPOINTS (backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/exam/mcq", verifyToken, (req, res) => {
  const questions = readQuestions();
  res.json(questions.map(sanitizeQuestionForCandidate));
});

app.get("/exam/mcq/:id", verifyToken, (req, res) => {
  const questions = readQuestions();
  const q = questions.find((item) => String(item.id) === String(req.params.id));
  if (!q) return res.status(404).json({ message: "Question not found" });
  res.json(sanitizeQuestionForCandidate(q));
});

// ─────────────────────────────────────────────────────────────────────────────
//  EXAM SESSIONS (server-authoritative timing)
// ─────────────────────────────────────────────────────────────────────────────

// Start a new exam session
app.post("/exam/start", verifyToken, (req, res) => {
  const { examId } = req.body;
  const userId = req.user.id;
  const name = req.user.name;

  const exams = readExams();
  // Support legacy (no examId) by using first published exam
  let exam = examId
    ? exams.find((e) => e.id === examId)
    : exams.find((e) => e.status === "published");

  if (!exam) return res.status(404).json({ message: "Exam not found or not available" });
  if (exam.status !== "published" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Exam is not currently available" });
  }

  // Check attempt limit
  const sessions = readSessions();
  const prevAttempts = sessions.filter(
    (s) => s.examId === exam.id && s.userId === userId && s.status === "submitted"
  );
  if (prevAttempts.length >= exam.maxAttempts && req.user.role !== "admin") {
    return res.status(409).json({
      message: `Maximum attempts (${exam.maxAttempts}) reached for this exam`,
    });
  }

  // Check for existing in-progress session for this exam
  const existing = sessions.find(
    (s) => s.examId === exam.id && s.userId === userId && s.status === "in-progress"
  );
  if (existing) {
    return res.json({
      message: "Resuming existing session",
      sessionId: existing.sessionId,
      resuming: true,
      startedAt: existing.startedAt,
      durationSeconds: exam.duration * 60,
      examTitle: exam.title,
    });
  }

  const questions = readQuestions();
  let questionIds = (exam.questionIds || []).filter((qId) =>
    questions.find((q) => String(q.id) === String(qId))
  );

  if (exam.shuffleQuestions) {
    questionIds = questionIds.sort(() => Math.random() - 0.5);
  }

  const session = {
    sessionId: `session-${Date.now()}-${uuidv4().slice(0, 8)}`,
    userId,
    name,
    examId: exam.id,
    examTitle: exam.title,
    questionIds,
    startedAt: now(),
    submittedAt: null,
    expiresAt: new Date(Date.now() + exam.duration * 60 * 1000).toISOString(),
    status: "in-progress",
    attempted: 0,
    correct: 0,
    wrong: 0,
    totalMarks: exam.totalMarks || questionIds.length * (exam.marksPerQuestion || 1),
    marksObtained: 0,
    passingMarks: exam.passingMarks || 0,
    answers: [],
    proctorSnaps: 0,
    screenSnaps: 0,
  };

  sessions.push(session);
  writeSessions(sessions);

  res.status(201).json({
    message: "Exam session started",
    sessionId: session.sessionId,
    durationSeconds: exam.duration * 60,
    examTitle: exam.title,
    questionCount: questionIds.length,
  });
});

// Submit one answer (auto-save)
app.post("/exam/answer", verifyToken, (req, res) => {
  const { sessionId, questionId, selectedAnswer } = req.body;

  if (!sessionId || questionId === undefined || selectedAnswer === undefined) {
    return res.status(400).json({ message: "sessionId, questionId and selectedAnswer are required" });
  }

  const sessions = readSessions();
  const session = sessions.find((s) => s.sessionId === sessionId);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not your session" });
  }
  if (session.status !== "in-progress") {
    return res.status(400).json({ message: "Exam is already submitted" });
  }

  // Check time expiry
  if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
    session.status = "expired";
    writeSessions(sessions);
    return res.status(400).json({ message: "Exam time has expired" });
  }

  const questions = readQuestions();
  const question = questions.find((q) => String(q.id) === String(questionId));
  if (!question) return res.status(404).json({ message: "Question not found" });

  const isCorrect = Number(selectedAnswer) === Number(question.correctAnswer);
  const marks = question.marks || 1;
  const negativeMark = question.negativeMark || 0;

  const existingIdx = session.answers.findIndex((a) => String(a.questionId) === String(questionId));

  if (existingIdx !== -1) {
    const prev = session.answers[existingIdx];
    // Revert previous marks
    if (prev.isCorrect) session.correct = Math.max(0, session.correct - 1);
    else session.wrong = Math.max(0, session.wrong - 1);
    session.marksObtained = (session.marksObtained || 0) - (prev.marksAwarded || 0);

    session.answers[existingIdx] = {
      questionId: String(questionId),
      selectedAnswer: Number(selectedAnswer),
      isCorrect,
      marksAwarded: isCorrect ? marks : -negativeMark,
      answeredAt: now(),
    };
  } else {
    session.attempted += 1;
    session.answers.push({
      questionId: String(questionId),
      selectedAnswer: Number(selectedAnswer),
      isCorrect,
      marksAwarded: isCorrect ? marks : -negativeMark,
      answeredAt: now(),
    });
  }

  if (isCorrect) session.correct += 1;
  else session.wrong += 1;

  // Recalculate marks
  session.marksObtained = session.answers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
  session.marksObtained = Math.max(0, session.marksObtained);

  writeSessions(sessions);

  res.json({
    message: existingIdx !== -1 ? "Answer updated" : "Answer saved",
    attempted: session.attempted,
    correct: session.correct,
    wrong: session.wrong,
    marksObtained: session.marksObtained,
  });
});

// Get session progress (candidate gets own; admin gets any)
app.get("/exam/session/:sessionId", verifyToken, (req, res) => {
  const sessions = readSessions();
  const session = sessions.find((s) => s.sessionId === req.params.sessionId);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not your session" });
  }

  // Check expiry and auto-submit
  if (session.status === "in-progress" && session.expiresAt && new Date() > new Date(session.expiresAt)) {
    session.status = "expired";
    session.submittedAt = session.expiresAt;
    writeSessions(sessions);
  }

  // Compute remaining time (server-controlled)
  let remainingSeconds = null;
  if (session.status === "in-progress" && session.expiresAt) {
    remainingSeconds = Math.max(0, Math.floor((new Date(session.expiresAt) - Date.now()) / 1000));
  }

  // Compute accuracy
  const accuracy = session.attempted > 0 ? Math.round((session.correct / session.attempted) * 100) : 0;

  // Exams config
  const exams = readExams();
  const exam = exams.find((e) => e.id === session.examId);

  // For candidates, hide answer correctness if result release is disabled
  let safeSession = { ...session, remainingSeconds, accuracy };
  if (req.user.role !== "admin" && exam && !exam.showResultAfterSubmit && session.status !== "in-progress") {
    const { answers, correct, wrong, marksObtained, ...rest } = safeSession;
    void answers; void correct; void wrong; void marksObtained;
    safeSession = { ...rest, message: "Results will be released by the administrator." };
  }

  res.json(safeSession);
});

// Submit exam (idempotent - second call returns existing submitted result)
app.post("/exam/submit", verifyToken, (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ message: "sessionId is required" });

  const sessions = readSessions();
  const session = sessions.find((s) => s.sessionId === sessionId);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not your session" });
  }

  if (session.status === "submitted") {
    return res.json({
      message: "Exam already submitted",
      result: {
        attempted: session.attempted,
        correct: session.correct,
        wrong: session.wrong,
        marksObtained: session.marksObtained,
        totalMarks: session.totalMarks,
        passingMarks: session.passingMarks,
        passed: session.marksObtained >= session.passingMarks,
      },
    });
  }

  session.status = "submitted";
  session.submittedAt = now();

  // Final scoring pass
  session.marksObtained = Math.max(0, session.answers.reduce((s, a) => s + (a.marksAwarded || 0), 0));
  const passed = session.marksObtained >= (session.passingMarks || 0);

  writeSessions(sessions);

  // Get exam config for result release
  const exams = readExams();
  const exam = exams.find((e) => e.id === session.examId);

  const baseResult = {
    attempted: session.attempted,
    correct: session.correct,
    wrong: session.wrong,
    marksObtained: session.marksObtained,
    totalMarks: session.totalMarks,
    passingMarks: session.passingMarks,
    passed,
    accuracy: session.attempted > 0 ? Math.round((session.correct / session.attempted) * 100) : 0,
  };

  res.json({
    message: "Exam submitted successfully",
    result: baseResult,
    showResult: !exam || exam.showResultAfterSubmit,
  });
});

// Update proctoring snap counts
app.post("/exam/session/:sessionId/proctoring", verifyToken, (req, res) => {
  const { sessionId } = req.params;
  const { type } = req.body; // 'camera' | 'screen'
  const sessions = readSessions();
  const session = sessions.find((s) => s.sessionId === sessionId);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.userId !== req.user.id) return res.status(403).json({ message: "Not your session" });
  if (type === "camera") session.proctorSnaps = (session.proctorSnaps || 0) + 1;
  if (type === "screen") session.screenSnaps = (session.screenSnaps || 0) + 1;
  writeSessions(sessions);
  res.json({ proctorSnaps: session.proctorSnaps, screenSnaps: session.screenSnaps });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ATTEMPT HISTORY
// ─────────────────────────────────────────────────────────────────────────────

// Get all attempts for current user
app.get("/attempts/mine", verifyToken, (req, res) => {
  const sessions = readSessions();
  const mine = sessions
    .filter((s) => s.userId === req.user.id)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  res.json(mine.map((s) => ({
    sessionId: s.sessionId,
    examId: s.examId,
    examTitle: s.examTitle,
    status: s.status,
    startedAt: s.startedAt,
    submittedAt: s.submittedAt,
    attempted: s.attempted,
    correct: s.correct,
    marksObtained: s.marksObtained,
    totalMarks: s.totalMarks,
    passed: s.marksObtained >= s.passingMarks,
  })));
});

// Admin: all sessions
app.get("/sessions", verifyToken, requireRole("admin"), (req, res) => {
  let sessions = readSessions();
  const { examId } = req.query;
  if (examId) sessions = sessions.filter((s) => s.examId === examId);
  sessions = sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  res.json(sessions.map((s) => {
    const { answers, ...rest } = s;
    void answers;
    return { ...rest, answerCount: (s.answers || []).length };
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
app.get("/analytics/overview", verifyToken, requireRole("admin"), (req, res) => {
  const sessions = readSessions();
  const exams = readExams();
  const questions = readQuestions();
  const users = readUsers();

  const submitted = sessions.filter((s) => s.status === "submitted");
  const inProgress = sessions.filter((s) => s.status === "in-progress");

  const totalAttempts = submitted.length;
  const avgScore = totalAttempts > 0
    ? Math.round(submitted.reduce((sum, s) => sum + ((s.marksObtained || 0) / Math.max(1, s.totalMarks || 1)) * 100, 0) / totalAttempts)
    : 0;
  const passRate = totalAttempts > 0
    ? Math.round(submitted.filter((s) => s.marksObtained >= (s.passingMarks || 0)).length / totalAttempts * 100)
    : 0;

  // Per-exam stats
  const examStats = exams.map((e) => {
    const eSubmitted = submitted.filter((s) => s.examId === e.id);
    const eAvg = eSubmitted.length > 0
      ? Math.round(eSubmitted.reduce((sum, s) => sum + ((s.marksObtained || 0) / Math.max(1, s.totalMarks || 1)) * 100, 0) / eSubmitted.length)
      : 0;
    return {
      examId: e.id,
      examTitle: e.title,
      totalAttempts: eSubmitted.length,
      avgScore: eAvg,
      passRate: eSubmitted.length > 0
        ? Math.round(eSubmitted.filter((s) => s.marksObtained >= (s.passingMarks || 0)).length / eSubmitted.length * 100)
        : 0,
    };
  });

  res.json({
    totalExams: exams.length,
    publishedExams: exams.filter((e) => e.status === "published").length,
    totalQuestions: questions.length,
    totalUsers: users.length,
    totalAttempts,
    inProgressAttempts: inProgress.length,
    avgScore,
    passRate,
    examStats,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
const settingsPath = path.join(DATA_DIR, "settings.json");
const defaultSettings = {
  appName: "VEYRA",
  theme: "dark",
  proctoring: { webcamInterval: 5000, screenInterval: 10000 },
  retention: { keepSnapsForDays: 30 },
};

app.get("/settings", verifyToken, requireRole("admin"), (req, res) => {
  res.json(readJSON(settingsPath, defaultSettings));
});

app.put("/settings", verifyToken, requireRole("admin"), (req, res) => {
  const current = readJSON(settingsPath, defaultSettings);
  const updated = { ...current, ...req.body, proctoring: { ...current.proctoring, ...(req.body.proctoring || {}) }, retention: { ...current.retention, ...(req.body.retention || {}) } };
  writeJSON(settingsPath, updated);
  res.json({ message: "Settings saved", settings: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  console.log(`[VEYRA] Backend running at http://127.0.0.1:${PORT}`);
  console.log(`[VEYRA] Smart Assessments. Seamless Execution.`);
});

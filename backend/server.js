const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

const questionsPath = path.join(__dirname, "data", "questions.json");
const sessionsPath = path.join(__dirname, "data", "sessions.json");

function readQuestions() {
  return JSON.parse(fs.readFileSync(questionsPath, "utf-8"));
}

function readSessions() {
  return JSON.parse(fs.readFileSync(sessionsPath, "utf-8"));
}

function saveSessions(sessions) {
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
}

function makeSessionId() {
  return `session-${Date.now()}`;
}

function questionForStudent(question) {
  return {
    id: question.id,
    question: question.question,
    options: question.options,
  };
}

app.get("/", (req, res) => {
  res.json({ message: "Exam backend is running" });
});

// Start a new exam session
app.post("/exam/start", (req, res) => {
  const { userId, name } = req.body;

  if (!userId || !name) {
    return res.status(400).json({
      message: "userId and name are required",
    });
  }

  const sessions = readSessions();

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
    // If updating previous answer, adjust correct/wrong counts
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

// Get current session progress (includes review if submitted)
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

// Submit the whole exam (returns result and full answer key with explanations)
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

// Dedicated answer key & solution review endpoint
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

// Get candidate session history
app.get("/exam/sessions", (req, res) => {
  const sessions = readSessions();
  const { userId } = req.query;
  if (userId) {
    return res.json(sessions.filter((s) => s.userId === userId));
  }
  res.json(sessions);
});

const HOST = "127.0.0.1";
const server = app.listen(PORT, HOST, () => {
  console.log(`Exam backend running at http://${HOST}:${PORT}`);
});

server.on("error", (err) => {
  console.error(`[VEYRA Backend Error] ${err.message}`);
  process.exit(1);
});

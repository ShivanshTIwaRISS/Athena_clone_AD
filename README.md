# VEYRA

> **Smart Assessments. Seamless Execution.**  
> A desktop-first examination, assessment, and proctoring platform.

VEYRA is an institutional desktop assessment environment engineered with **Electron**, **React**, and an authoritative **Node.js/Express** backend. It features the **Green, Blue, and White** visual identity, delivering examination integrity, synchronized proctoring, and a candidate testing arena.

---

## 🌟 Candidate Journey & Key Features

### 1. Available Examinations Portal
- Review available examinations with subject, question count, duration, passing benchmark, and proctoring rigor.
- View instructions and examination prerequisites before initiating a session.
- Seamless navigation to candidate attempt history.

### 2. Pre-Examination Verification & Readiness Checklist
- Verify candidate Student ID and Full Name.
- Live camera hardware preview and frame extraction verification.
- Audio and network connectivity health check.
- Mandatory fullscreen security agreement and exam rules review dialog.

### 3. Timed Proctored Examination Arena
- High-readability MCQ workspace with clear option selectors and responsive typography.
- Synchronized elapsed timer with warning color shifts.
- Non-linear question palette navigation with answered, unanswered, and flagged status filters.
- Real-time auto-saving on answer selection synced with the backend.
- Proctoring sidebar featuring live webcam feed, proctoring state indicator, and webcam/screen capture counters.
- Final submission confirmation modal preventing accidental submission with unanswered question warnings.
- Automatic exam submission on timer expiry.

### 4. Comprehensive Scorecard & Question Review
- Accuracy score percentage, passed / retake benchmarks, and timing summary.
- Proctoring telemetry summary (webcam and desktop screen captures).
- Permitted question-by-question review with candidate's submitted responses and server validations.

### 5. Candidate Attempt History
- View past assessment submissions, verified scores, dates, and question completion counts.

---

## 🎨 Design System: Green, Blue & White

- **Primary Accent**: Royal Blue (`#2563eb`, `#1d4ed8`, `#eff6ff`)
- **Status & Integrity**: Emerald Green (`#10b981`, `#059669`, `#ecfdf5`)
- **Neutral & Card Surfaces**: Pure White (`#ffffff`), Slate-50 (`#f8fafc`), Slate-100 (`#f1f5f9`)
- **Typography & Borders**: Deep Slate (`#0f172a`), Muted Slate (`#64748b`), Light Borders (`#e2e8f0`)

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Desktop Shell** | Electron, Node.js IPC, ContextBridge (`window.veyra` & `window.athena`) |
| **Frontend UI** | React 19, Vanilla CSS Design System, SVG icons |
| **Backend API** | Node.js, Express, RESTful session management |
| **Persistence** | File-system JSON (`backend/data/questions.json`, `backend/data/sessions.json`) |
| **Testing & Quality** | Integration test suite (`backend/tests/run-tests.js`), ESLint, Vite |

---

## 📁 Repository Structure

```text
Athena-Clone/
├── app/
│   ├── app.js                 # Electron main process (Window management, proctoring IPC, snapshot storage)
│   └── preload.js             # ContextBridge exposing secure `window.veyra` & `window.athena`
├── backend/
│   ├── data/
│   │   ├── questions.json     # Question bank (with server-side evaluation)
│   │   └── sessions.json      # Exam sessions database
│   ├── tests/
│   │   └── run-tests.js       # End-to-end candidate examination integration test suite
│   ├── server.js              # Express REST API (Health, Questions, Start, Answer, Session, Submit)
│   └── README.md              # Backend technical documentation
├── src/
│   ├── components/
│   │   ├── AvailableExams.jsx # Candidate available assessments portal
│   │   ├── AttemptHistory.jsx # Candidate attempt history and review logs
│   │   ├── ExamArena.jsx      # Active exam interface (palette, workspace, live proctoring)
│   │   ├── ExamResults.jsx    # Post-exam scorecard and detailed response review
│   │   ├── Header.jsx         # Top navbar with live timer, stage badge, and API health status
│   │   ├── PreExamSetup.jsx   # Candidate verification, webcam test & fullscreen mode
│   │   └── RulesModal.jsx     # Exam code of conduct dialog
│   ├── services/
│   │   └── api.js             # API client functions for all backend endpoints
│   ├── App.css                # Green, Blue & White component styling
│   ├── App.jsx                # Main application coordinator & stage state manager
│   ├── index.css              # Global tokens and design system variables
│   └── main.jsx               # React DOM entry point
├── package.json
└── vite.config.js
```

---

## 🚀 Running on Local Machine

### Option 1: Browser Mode (Single Command)
Runs both the backend API server (`http://127.0.0.1:3000`) and the Vite web client (`http://localhost:5173`):
```bash
npm run dev:all
```
Open **`http://localhost:5173`** in your browser.

### Option 2: Electron Desktop Mode
Launches the native Electron desktop application with webcam proctoring, fullscreen security, and local disk snapshot storage:
```bash
npm run electron:dev
```

### Option 3: Verification & Tests
```bash
# Run candidate examination integration tests
npm test

# Run ESLint check
npm run lint

# Build production bundle
npm run build
```

---

## 🔐 Security & Integrity Model

1. **Server-Authoritative Evaluation**: Question answers (`correctAnswer`) remain strictly on the backend and are never transmitted to the candidate client during an active test.
2. **Context Isolation**: The Electron renderer operates with `contextIsolation: true` and `nodeIntegration: false`, communicating exclusively via typed, allowlisted IPC channels in `preload.js`.
3. **Dual Telemetry**: Automated webcam snapshots (saved to `userData/veyra-camera-snaps/`) and native window captures (saved to `userData/veyra-screen-snaps/`) ensure audit readiness.
4. **Resilient Stream Coordination**: MediaStream tracks persist across view transitions without dropping feed connectivity.

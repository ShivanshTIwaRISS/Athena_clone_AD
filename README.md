# VEYRA — Athena Examination & Proctoring Platform

> **Smart Assessments. Seamless Execution.**  
> A production-grade desktop assessment, anti-cheat proctoring, and automated examination platform engineered with **Electron**, **React 19**, and an authoritative **Node.js/Express** backend.

---

## 🌟 Candidate Journey & Core Capabilities

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ 1. Available Exams     │ ───► │ 2. Pre-Exam Setup      │ ───► │ 3. Locked Exam Arena   │
│ • Catalog & Guidelines │      │ • Webcam Test & Agree  │      │ • Kiosk Lockdown       │
│ • Candidate Identity   │      │ • Hardware Check       │      │ • Auto-save & Proctor  │
└────────────────────────┘      └────────────────────────┘      └───────────┬────────────┘
                                                                            │
                                                                            ▼
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ 6. Attempt History     │ ◄─── │ 5. Answer Key Review   │ ◄─── │ 4. Final Submission    │
│ • Persistent Records   │      │ • Verified Solutions   │      │ • Telemetry Summary    │
│ • Timestamped Audits   │      │ • Step-by-Step Reason  │      │ • Pass / Fail Verdict  │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

### 1. Available Assessments Portal
- Browse scheduled and open assessments with subject tags, question counts, time limits, and passing benchmarks.
- Live backend API connectivity badge (`Online` / `Offline`) dynamically discovered via Electron IPC.
- Instant access to candidate examination history.

### 2. Pre-Examination Hardware Verification
- Candidate ID & Full Name validation (persisted in local storage).
- Live camera stream initialization and hardware readiness check.
- Mandatory fullscreen security agreement and exam policy guidelines modal.

### 3. Timed Examination Arena
- **Randomized Option Shuffling**: Options (A, B, C, D) are randomly permuted per question and candidate session to prevent collusion and screen-peeking, while transparently preserving 100% accurate server-authoritative evaluation.
- **🔖 Mark for Review**: Candidates can bookmark questions to revisit later. Highlighted with a distinct badge and star (`★`) in the question palette and summarized in the submission modal.
- **Non-Linear Question Palette**: Real-time status indicators for Answered (Green), Unanswered (Gray), and Marked for Review (Purple).
- **Auto-Save Resilience**: Answer selections are immediately auto-saved and synchronized to the local backend.
- **Automated Proctoring**:
  - **Camera Snapshots**: Captured automatically every 5 seconds.
  - **Screen Captures**: Captured automatically every 10 seconds.
  - **Secure Storage**: Stored privately in `proctoring_data/camera_snaps` and `proctoring_data/screen_snaps` in the project root. Snapshots are hidden from the candidate UI to prevent tampering.

### 4. Anti-Cheat Security & Lock-Down Engine
- **Kiosk Mode (`setKiosk(true)`)**: Disables macOS 3-finger swipe desktop switching, Mission Control, system Dock, and Menu Bar during the examination.
- **Screen-Saver Priority (`alwaysOnTop: 'screen-saver'`)**: Keeps the examination window on top of any external applications, AI assistants, or overlays.
- **Clipboard & Context Menu Lock**: Blocks `Cmd+C`, `Cmd+V`, and `Cmd+X` to prevent copy-pasting questions to external AI tools (ChatGPT, Claude, etc.), and disables right-click context menus.
- **Focus Loss & Tab Switch Detection**: Detects window blur, tab switching, and app switching in real time.
- **Controlled Force Quit (1 Flag Warning)**:
  - If a candidate attempts to close or quit via `Cmd+Q` / `Cmd+W` or window close, the system logs **1 Proctoring Violation Flag** against the session.
  - Displays a warning confirmation dialog: `Resume Exam` or `Force Quit Anyway`.
  - Does not trap the candidate indefinitely — if confirmed, safely stops the session and exits cleanly.

### 5. Answer Key & Step-by-Step Solutions
- **Scorecard Hero**: Overall accuracy percentage, passed/fail verdict, and timing stats.
- **Metric Breakdown**: Counts for Correct, Incorrect, and Skipped questions.
- **Answer Key Review**:
  - Displays each question with verified correct answers.
  - Shows candidate's selected choice compared side-by-side with the correct option.
  - 💡 **Explanation & Key Concept**: Comprehensive reasoning provided for every question.
  - Filter by All, Correct, Incorrect, or Skipped with instant jump-to-question chips.

---

## 🎨 Visual Identity: White, Blue, Green & Yellow Light Theme

Designed with a clean, modern, high-contrast palette:
- **Base Surfaces & Cards**: Crisp Pure White (`#ffffff`), Soft Slate (`#f8fafc`), Clean Borders (`#e2e8f0`).
- **Primary Brand & Actions**: Royal Blue (`#2563eb`, `#3b82f6`, `#eff6ff`).
- **Integrity & Correctness**: Emerald Green (`#16a34a`, `#10b981`, `#f0fdf4`).
- **Highlights & Warnings**: Amber Yellow (`#d97706`, `#f59e0b`, `#fffbeb`).
- **Marked for Review**: Royal Purple (`#7c3aed`, `#8b5cf6`, `#f5f3ff`).
- **Typography**: Deep readable Slate (`#0f172a` primary, `#334155` secondary, `#64748b` muted).

---

## 🏗️ Architecture & Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Desktop Shell** | Electron 35 | Native window management, Kiosk lockdown, IPC bridge, anti-cheat |
| **Frontend UI** | React 19 + Vite | Fast component architecture, vanilla CSS design tokens |
| **Backend API** | Node.js + Express | RESTful session management, evaluation, and flag logging |
| **Data Storage** | Local JSON Store | `backend/data/questions.json` and `backend/data/sessions.json` |
| **Proctoring Data** | File System Storage | `proctoring_data/camera_snaps/` and `proctoring_data/screen_snaps/` |
| **Quality & Tests** | Node Test Suite + ESLint | 8 end-to-end integration tests (`npm test`) and strict linting |

---

## 📁 Project Structure

```text
Athena-Clone/
├── app/
│   ├── app.js                 # Electron main process (Kiosk lockdown, IPC, snapshot capture)
│   └── preload.cjs            # Secure CommonJS ContextBridge (`window.veyra` & `window.athena`)
├── backend/
│   ├── data/
│   │   ├── questions.json     # MCQ Question bank with server-side solutions
│   │   └── sessions.json      # Exam session records and proctoring audit logs
│   ├── tests/
│   │   └── run-tests.js       # Integration test runner (8 end-to-end tests)
│   └── server.js              # Express REST API (Questions, Sessions, Flags, Review)
├── proctoring_data/           # Dedicated directory for proctoring evidence
│   ├── camera_snaps/          # Automated webcam snapshots (*-cam.jpg)
│   └── screen_snaps/          # Automated screen captures (*-screen.jpg)
├── src/
│   ├── components/
│   │   ├── AvailableExams.jsx # Portal for available assessments
│   │   ├── PreExamSetup.jsx   # Candidate verification & webcam check
│   │   ├── ExamArena.jsx      # Active exam interface (option shuffling, mark for review, flags)
│   │   ├── ExamResults.jsx    # Post-exam scorecard, answer key & solutions review
│   │   ├── AttemptHistory.jsx # Past candidate attempt logs
│   │   ├── Header.jsx         # Top navigation and status bar
│   │   └── RulesModal.jsx     # Examination rules modal
│   ├── services/
│   │   └── api.js             # Dynamic port API client with Electron IPC proxy
│   ├── App.css                # Component styling (Light Theme: White/Blue/Green/Yellow)
│   ├── App.jsx                # App shell and stage state machine
│   ├── index.css              # Global design tokens and CSS variables
│   └── main.jsx               # React DOM entry point
├── package.json
└── vite.config.js
```

---

## 🚀 Getting Started

### 1. Run as Electron Desktop App + Backend (Recommended)
This compiles the production frontend bundle, starts the backend, and opens the Electron desktop app:
```bash
npm start
```

### 2. Run in Browser Development Mode
Runs both the backend and Vite dev server concurrently:
```bash
npm run dev:all
```
Open **`http://localhost:5173`** in your browser.

### 3. Run Integration Tests
```bash
npm test
```

### 4. Run Linter
```bash
npm run lint
```

### 5. Build Production Bundle
```bash
npm run build
```

---

## 🔒 Proctoring Data & Snapshots Inspection
Automated snapshots are saved directly in the project directory for proctor audit:
- Camera photos: `proctoring_data/camera_snaps/`
- Screen captures: `proctoring_data/screen_snaps/`

These folders are intentionally separated from candidate view to maintain examination integrity.

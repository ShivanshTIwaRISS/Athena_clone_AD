# VEYRA

> **Smart Assessments. Seamless Execution.**  
> A desktop-first examination, quiz, assessment, and proctoring platform.

VEYRA is an enterprise-grade desktop assessment environment engineered with **Electron**, **React**, and an authoritative **Node.js/Express** backend. It delivers strict examination integrity, synchronized proctoring, rich administrative blueprints, and an intuitive candidate testing arena.

---

## 🌟 Key Features & Capabilities

### 🛡️ Candidate Experience & Secure Testing Arena
- **Pre-Flight Hardware Verification**: Real-time webcam check, audio readiness, network health ping, and strict fullscreen mode enforcement before entering any assessment.
- **Timed Exam Arena**: Auto-saving answers, synchronized timer countdown with audio-visual alerts, non-linear question palette navigation, answered/unanswered/flagged filters.
- **Dual Multi-Source Proctoring**: Periodic high-resolution webcam snapshots combined with native Electron desktop screen captures, streaming metadata to local audit repositories.
- **Comprehensive Result Scorecard**: Instant performance analytics, score accuracy percentage, review breakdown with explanations, and pass/retake indicators.

### ⚙️ Administrative Control Center
- **Executive Analytics Dashboard**: Key metrics (Pass rates, average scores, total tests administered, proctoring frame counts, and candidate logs).
- **Exam Blueprint Authoring**: Create, configure, duplicate, publish, and archive custom examinations with flexible timing, scoring benchmarks, question randomizers, and rigor settings.
- **Question Bank Repository**: Domain/topic-organized question bank with multiple-choice items, rich explanations, cognitive difficulty tags, and bulk JSON import.
- **Identity & Access Management**: Secure user registry for administrators, proctors, and candidate students with role-based routing.
- **Session Audit Trails**: Inspect every candidate attempt with exact timestamped answers, question durations, and proctoring snapshot telemetry.
- **Global Settings & Diagnostics**: Institution branding, proctoring cadence thresholds, and desktop hardware diagnostics.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Desktop Shell** | Electron, Node.js IPC, Native ContextBridge, Screen Capture API |
| **Frontend UI** | React 19, Vanilla CSS Design System, Lucide-style SVG icons |
| **Backend API** | Node.js, Express, bcrypt password hashing, JSON Web Tokens (JWT) |
| **Persistence** | Atomic file-system JSON storage with transactional `.tmp` write swaps |
| **Testing & Quality** | Integration test suite (`backend/tests/run-tests.js`), ESLint, Vite |

---

## 📁 Repository Structure

```text
Athena-Clone/
├── app/
│   ├── app.js                 # Electron main process (Window management, proctoring IPC, snapshot storage)
│   └── preload.js             # ContextBridge exposing secure `window.veyra` & backward-compatible APIs
├── backend/
│   ├── data/                  # Persistence data files (exams, questions, sessions, users, settings)
│   ├── tests/
│   │   └── run-tests.js       # End-to-end backend integration test suite
│   ├── server.js              # Express REST API (Auth, Exams, Questions, Proctoring, Analytics)
│   └── README.md              # Backend technical documentation
├── src/
│   ├── components/
│   │   ├── AdminDashboard.jsx    # Administrative metrics, charts, and activity log
│   │   ├── AppHeader.jsx         # Sticky navigation header with live timer and status chips
│   │   ├── AttemptHistory.jsx    # Session audit trails for admins & candidates
│   │   ├── AuthScreen.jsx        # Login & first-run administrator onboarding
│   │   ├── CandidateDashboard.jsx# Candidate portal & exam selection
│   │   ├── ExamArena.jsx         # Live examination arena with question palette
│   │   ├── ExamEditor.jsx        # Assessment blueprint designer
│   │   ├── ExamList.jsx          # Assessment management and publishing controls
│   │   ├── ExamResults.jsx       # Post-exam scorecard, answer review, and proctor summary
│   │   ├── PreExamSetup.jsx      # System readiness checklist, webcam test & consent
│   │   ├── QuestionBank.jsx      # Item bank, filters, editor, and bulk JSON import
│   │   ├── RulesModal.jsx        # Examination code of conduct modal
│   │   ├── SettingsView.jsx      # Global institution parameters & diagnostics
│   │   ├── Sidebar.jsx           # Role-aware navigation sidebar
│   │   └── UserManagement.jsx    # User account management & registration
│   ├── services/
│   │   └── api.js                # Unified API client for all backend endpoints
│   ├── App.css                   # VEYRA design system and component styling
│   ├── App.jsx                   # Root coordinator, role routing, and stage manager
│   ├── index.css                 # CSS variables, dark theme tokens, typography
│   └── main.jsx                  # React application entry point
├── package.json
└── vite.config.js
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>
cd Athena-Clone

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 3. Development Workflow

#### Run Backend & Frontend Concurrently:
```bash
npm run dev:all
```
- Backend starts at `http://127.0.0.1:3000`
- Vite frontend starts at `http://localhost:5173`

#### Run Electron Desktop Application:
```bash
npm run electron:dev
```

### 4. Running Tests & Quality Verification

#### Run Backend Integration Tests:
```bash
npm test
```
*Executes all 12 end-to-end integration tests (Auth, Question Bank, Exam Blueprints, Candidate Lifecycle, Proctoring, Analytics, and Settings).*

#### Run ESLint Checks:
```bash
npm run lint
```

#### Build Production Bundle:
```bash
npm run build
```

---

## 🔐 Security & Integrity Model

1. **Server-Authoritative Evaluation**: Question answers (`correctAnswer`) remain strictly on the backend and are never transmitted to the candidate client during an active test.
2. **Context Isolation**: The Electron renderer operates with `contextIsolation: true` and `nodeIntegration: false`, communicating exclusively via typed, allowlisted IPC channels in `preload.js`.
3. **Atomic File Storage**: All persistence updates write to atomic temporary files (`.tmp`) before renaming, eliminating file corruption risks on unexpected shutdowns.
4. **Proctoring Audit Trails**: Webcam and screen snapshots are timestamped and tagged by session ID, providing an immutable audit trail for test administrators.

---

## 📄 License
MIT License. Built for secure institutional examination and skill evaluations.

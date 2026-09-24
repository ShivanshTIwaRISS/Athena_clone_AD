# Athena Clone

Athena Clone is a proctored online examination and assessment desktop application built with **Electron**, **React**, and **Express**. It integrates real-time webcam proctoring, fullscreen security enforcement, automated snapshot captures, and a full-featured MCQ examination lifecycle powered by an Express REST API.

---

## Today's Lab Work - 2026-09-24

### Automated Proctoring Screenshot Engine & Stream Resilience Hardening
- **Automated Multi-Source Proctoring Snapshots**:
  - Implemented continuous webcam snapshots (every 5 seconds) saved to `app/user-camera-snap/`.
  - Implemented high-resolution full-window/screen proctoring capture (every 10 seconds) using Electron `webContents.capturePage()`, saved automatically to `app/user-screen-snap/`.
  - Implemented manual on-demand snapshot triggers with live visual feedback in the Exam Arena.
- **Resilient Multi-Environment Fallback Architecture**:
  - Replaced brittle `ImageCapture`-only dependencies with an HTML5 `<canvas>` 2D context rendering engine fallback that guarantees zero-failure frame extraction in standard browsers and Electron.
  - Added stream persistence across React view transitions (`SETUP` -> `EXAM` -> `RESULTS`), fixing the stream unmount issue where proctoring feeds would previously go dark upon exam entry.
  - Added browser-mode timers and snapshot interval fallbacks so proctoring functions continuously even outside Electron.
- **Dual Telemetry & Proctoring Metrics**:
  - Live webcam and screen capture counters displayed in real-time in the active examination proctor sidebar (`📹 X cam`, `🖥️ Y scr`).
  - Included proctoring capture summary on the final post-exam assessment scorecard (`ExamResults.jsx`).

---

## Yesterday's Lab Work - 2026-09-23

### Dual Proctoring Screenshot Architecture & Storage Pipeline
- **Electron IPC Screen Capture Pipeline**:
  - Engineered `capture-screen-snap` and `store-screen-snap-image-on-disk` IPC channels in `app/app.js` and `app/preload.js`.
  - Created automatic storage directory initializers for both `app/user-camera-snap/` and `app/user-screen-snap/`.
  - Configured synchronized periodic timer broadcasts for candidate timer ticks (1s), camera capture events (5s), and screen capture events (10s).
- **Stream Lifecycle & Canvas Frame Capture Engine**:
  - Designed `mediaStream` state coordinator in `src/App.jsx` to prevent MediaStream garbage collection during stage transitions.
  - Built canvas blob-to-buffer conversion utility for saving candidate photos directly to local disk storage.
  - Implemented automatic stop-proctoring cleanup upon final exam submission (`POST /exam/submit`).

---

## Previous Lab Work

### Complete Frontend & Backend Integration - 2026-09-22
- **All 7 Backend Endpoints Fully Integrated**: Connected the React frontend with the Express backend (`http://localhost:3000`) without omitting any endpoint.
- **Created Unified API Service Layer (`src/services/api.js`)**: Encapsulated all HTTP requests (`fetch` API) with structured error handling, payload formatting, and connectivity diagnostics.
- **Pre-Exam Candidate Onboarding (`src/components/PreExamSetup.jsx`)**:
  - Added candidate verification inputs for Student ID (`userId`) and Full Name (`name`).
  - Integrated `GET /` connectivity check badge with automatic health polling and manual retry button.
  - Required camera hardware verification and fullscreen enablement before enabling the **Start Examination** CTA.
  - Linked native Electron rules dialog (`window.athena.showRules()`) and an in-app interactive modal.
- **Interactive Examination Arena (`src/components/ExamArena.jsx`)**:
  - **Auto-Save on Selection**: Selecting any option automatically persists candidate's choice in state across all question switches and immediately syncs with `POST /exam/answer`.
  - **Final Submission Auto-Flush**: When clicking *Submit Exam*, all selected/drafted options are automatically validated and submitted to the backend before calling `POST /exam/submit`.
  - **Question Navigation Palette (`GET /exam/mcq`)**: Displays all assessment questions with status tags (Current, Answered / Auto-saved, Unanswered) and quick filter tabs.
  - **Dynamic Question Loader (`GET /exam/mcq/:id`)**: Fetches specific question data on demand when switching questions or clicking palette chips.
  - **Single-Attempt Answer Submission (`POST /exam/answer`)**: Submits chosen MCQ option to backend, locks answered questions per backend rules, and provides instant confirmation.
  - **Live Session Progress Telemetry (`GET /exam/session/:sessionId`)**: Synchronizes live score, attempted count, remaining questions, and answered records with a dedicated "Sync Progress" trigger.
  - **Final Submission Confirmation Modal (`POST /exam/submit`)**: Displays auto-saved question counts, warns user about unanswered questions, completes the exam session, and transitions to results.
- **Comprehensive Scorecard & Result Review (`src/components/ExamResults.jsx`)**:
  - Displays summary metrics: Total Questions, Attempted, Correct, Wrong, and Accuracy Percentage.
  - Full Question-by-Question Response Audit fetched from `GET /exam/session/:sessionId` with submitted choices and timestamps.
  - Provides a **Start Another Examination** workflow to reset and take new tests cleanly.

### Backend Lab Work - 2026-09-21
- Added Express backend in `backend/` on port `3000` with `cors` and JSON middleware.
- Built JSON persistence using `backend/data/questions.json` and `backend/data/sessions.json`.
- Implemented secure answer verification where `correctAnswer` is kept strictly on server.

### Proctoring Foundation Lab Work - 2026-09-20
- Added Electron IPC listeners for main-process timer ticks and periodic camera snapshot events.
- Used browser `ImageCapture` API to take camera snapshots every 5 seconds.
- Implemented `storeCameraSnapImageOnDisk` to save JPG files in `app/user-camera-snap/`.
- Added native Electron contest rules dialog via `dialog.showMessageBox`.

---

## Project Structure

```text
Athena-Clone/
├── app/
│   ├── app.js                 # Electron main process (Window management, IPC timers, snapshot storage)
│   └── preload.js             # Secure contextBridge exposing window.athena API
├── backend/
│   ├── data/
│   │   ├── questions.json     # Question bank (with server-side correctAnswer)
│   │   └── sessions.json      # Exam sessions database
│   ├── package.json           # Backend Express configuration
│   ├── server.js              # Express REST API (7 endpoints)
│   └── README.md              # Backend documentation
├── src/
│   ├── components/
│   │   ├── ExamArena.jsx      # Active exam interface (palette, question workspace, live proctoring)
│   │   ├── ExamResults.jsx    # Post-exam scorecard and detailed response audit breakdown
│   │   ├── Header.jsx         # Top navbar with live timer, session badge, and API health status
│   │   ├── PreExamSetup.jsx   # Candidate ID/Name setup, camera verification, fullscreen mode
│   │   └── RulesModal.jsx     # Exam instructions dialog with native Electron trigger
│   ├── services/
│   │   └── api.js             # API client functions for all 7 backend endpoints
│   ├── App.css                # Polished, responsive component styles
│   ├── App.jsx                # Main application coordinator & stage state manager
│   ├── index.css              # Global tokens and design system
│   └── main.jsx               # React DOM entry point
├── package.json
└── README.md
```

---

## Quick Start Guide

### 1. Install Dependencies

Root application:
```bash
npm install
```

Backend server:
```bash
cd backend
npm install
cd ..
```

---

### 2. Start the Backend Server

```bash
cd backend
npm start
```
*The backend starts at `http://localhost:3000`.*

---

### 3. Start the Frontend & Electron Desktop App

In **Terminal 1** (Vite development server):
```bash
npm run dev
```

In **Terminal 2** (Electron Desktop window):
```bash
npm run electron
```

---

## Build & Quality Commands

```bash
npm run lint       # Run ESLint validation
npm run build      # Compile production Vite bundle
npm run preview    # Preview built application
```

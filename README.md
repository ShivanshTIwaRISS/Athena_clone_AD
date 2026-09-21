# Athena Clone

Athena Clone is a desktop Electron application for a proctored quiz or test flow. The current screen prepares a user before a test by requesting camera access and fullscreen permission. The **Start Test** action becomes available after both permissions are granted.

When the test starts, the Electron main process sends elapsed-time updates to the React renderer through a secure preload bridge. It also requests a camera snapshot every five seconds. The current version is a foundation for the wider quiz and contest experience; it does not yet include quiz questions, answer submission, or result tracking.

## Today's Lab Work

- Added preload IPC listeners for timer ticks and periodic camera-shot requests
- Captured camera frames with the browser `ImageCapture` API
- Sent captured image data to Electron and saved JPG snapshots in `app/user-camera-snap`
- Created the snapshot directory automatically before writing files
- Added native Electron contest rules in a message dialog
- Added a browser alert for comparing native and Chromium rule dialogs
- Changed the timer display from a countdown to elapsed seconds.

## Backend Lab Work - 2026-09-21

- Added an Express backend in `backend/` for the exam flow
- Added `cors` middleware so the Electron/React client can call the API
- Added JSON request parsing with Express
- Added `questions.json` as the question source and `sessions.json` for local session persistence
- Added session creation, question delivery, answer checking, progress tracking, and exam submission
- Kept `correctAnswer` out of question responses so answers are checked only by the backend
- Installed backend dependencies with `npm install` and verified the server runs on port `3000`

### Backend Setup

```bash
cd backend
npm install
npm start
```

The backend starts at `http://localhost:3000`.

### Backend API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Check that the backend is running |
| `POST` | `/exam/start` | Create a session using `userId` and `name`; returns `sessionId` |
| `GET` | `/exam/mcq` | Return all questions without `correctAnswer` |
| `GET` | `/exam/mcq/:id` | Return one question without `correctAnswer` |
| `POST` | `/exam/answer` | Check and save an answer using `sessionId`, `questionId`, and `selectedAnswer` |
| `GET` | `/exam/session/:sessionId` | Return the current session progress and answer history |
| `POST` | `/exam/submit` | Mark a session as submitted and return attempted, correct, and wrong totals |

Answer indexes are zero-based: `0` is the first option, `1` is the second option, and so on. The backend prevents duplicate answers and rejects answers after a session has been submitted.

## Current Features

- Electron desktop window with a React renderer
- Camera permission request and live camera preview
- Fullscreen permission flow
- Permission-gated **Start Test** button
- Elapsed timer controlled by the Electron main process
- Automatic camera snapshots every five seconds while the test is running
- Camera snapshots saved locally as JPG files
- Native Electron contest-rules dialog
- Vite development server with hot reload

## Project Structure

```text
app/
	app.js       Electron main process
	preload.js   Secure IPC bridge exposed as window.athena
src/
	App.jsx      Test preparation screen
	App.css      Component styles
	index.css    Global styles
```

## Requirements

- Node.js 22 or newer
- npm
- Camera permission for the test preparation flow

## Setup

```bash
npm install
```

If the default npm registry times out, use:

```bash
npm install --registry=https://registry.npmjs.org/
```

## Run The Electron App

The Electron window loads the Vite server, so start both processes in separate terminal windows.

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run electron
```

## Other Commands

```bash
npm run build   # Create a production Vite build
npm run lint    # Run ESLint
npm run preview # Preview the Vite build in a browser
```

The React page expects `window.athena`, which is provided by Electron's preload script. Use the Electron command for the complete application; opening the Vite page directly in a browser will not provide the timer IPC bridge.

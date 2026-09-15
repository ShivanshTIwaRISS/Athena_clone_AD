# Athena Clone

Athena Clone is a desktop Electron application for a proctored quiz or test flow. The current screen prepares a user before a test by requesting camera access and fullscreen permission. The **Start Test** action becomes available after both permissions are granted.

When the test starts, the Electron main process starts a ten-second countdown and sends remaining-time updates to the React renderer through a secure preload bridge. The app automatically closes when the countdown reaches zero. The user can also close it with the **Quit App** button. The current version is a foundation for the wider quiz and contest experience; it does not yet include quiz questions, answer submission, or result tracking.

## Current Features

- Electron desktop window with a React renderer
- Camera permission request and live camera preview
- Fullscreen permission flow
- Permission-gated **Start Test** button
- Ten-second remaining timer controlled by the Electron main process
- Automatic app shutdown when the timer expires
- Manual **Quit App** action
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

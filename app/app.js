/**
 * VEYRA Examination Platform - Electron Main Process
 * Smart Assessments. Seamless Execution.
 */
import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, screen } from "electron";
import { Buffer } from "node:buffer";
import path from "path";
import fs from "fs";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import { createServer } from "net";

const execAsync = promisify(exec);

let electronWindow = null;
let backendProcess = null;
let activeBackendPort = 3000;
let startTimestamp = null;
let timerInterval = null;
let cameraInterval = null;
let screenInterval = null;
let isShuttingDown = false;

// ─── Path Helpers ─────────────────────────────────────────────────────────────
const projectRoot = path.resolve(import.meta.dirname, "..");

function getCameraSnapDir() {
  const baseDir = path.join(projectRoot, "proctoring_data", "camera_snaps");
  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

function getScreenSnapDir() {
  const baseDir = path.join(projectRoot, "proctoring_data", "screen_snaps");
  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

// ─── Port Availability ────────────────────────────────────────────────────────
function testHostPort(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function isPortFree(port) {
  const freeLocal = await testHostPort(port, "127.0.0.1");
  if (!freeLocal) return false;
  return testHostPort(port, "0.0.0.0");
}

async function findFreePort(preferred = 3000) {
  for (let p = preferred; p < preferred + 30; p++) {
    if (await isPortFree(p)) return p;
  }
  return preferred;
}

async function waitForBackendReady(port, retries = 25) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

// ─── Backend Spawn ────────────────────────────────────────────────────────────
async function startBackend() {
  const port = await findFreePort(3000);
  activeBackendPort = port;
  const backendDir = app.isPackaged
    ? path.join(process.resourcesPath, "backend")
    : path.join(import.meta.dirname, "../backend");

  const serverPath = path.join(backendDir, "server.js");
  if (!fs.existsSync(serverPath)) {
    console.warn("[VEYRA] Backend server.js not found at:", serverPath);
    return port;
  }

  backendProcess = spawn("node", [serverPath], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(port) },
    stdio: "pipe",
  });

  backendProcess.stdout?.on("data", (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[VEYRA Backend] ${msg}`);
  });

  backendProcess.stderr?.on("data", (d) => {
    const msg = d.toString().trim();
    if (msg) console.error(`[VEYRA Backend ERR] ${msg}`);
  });

  backendProcess.on("exit", (code) => {
    if (!isShuttingDown) {
      console.error(`[VEYRA] Backend exited unexpectedly (code ${code})`);
    }
  });

  const ready = await waitForBackendReady(port);
  console.log(`[VEYRA] Backend readiness on http://127.0.0.1:${port}: ${ready ? "READY" : "FAILED"}`);
  return port;
}

function stopBackend() {
  isShuttingDown = true;
  if (backendProcess && !backendProcess.killed) {
    try {
      backendProcess.kill("SIGTERM");
    } catch {
      // ignore
    }
    backendProcess = null;
  }
}

// ─── Window Creation ──────────────────────────────────────────────────────────
function createWindow(port = 3000) {
  electronWindow = new BrowserWindow({
    height: 900,
    width: 1400,
    minWidth: 1100,
    minHeight: 700,
    title: "VEYRA – Smart Assessments. Seamless Execution.",
    backgroundColor: "#f8fafc",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      devTools: !app.isPackaged,
      preload: path.join(import.meta.dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for preload to import Node modules
      webSecurity: false,
    },
  });

  // Forward renderer console to main terminal
  electronWindow.webContents.on("console-message", (_event, level, message) => {
    console.log(`[RENDERER] ${message}`);
  });

  // Prevent navigation to external URLs
  electronWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://127.0.0.1") && !url.startsWith("file://")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Prevent new windows
  electronWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // Proctoring: Detect when window loses focus (Tab switch, gesture swipe, other app activation)
  electronWindow.on("blur", () => {
    if (isExamLockdown && !electronWindow?.isDestroyed()) {
      electronWindow.webContents.send("proctor-violation", {
        type: "WINDOW_BLUR",
        message: "Exam window lost focus. Switching windows or using other applications is flagged as a violation.",
      });
    }
  });

  // Proctoring: Issue 1 flag warning on quit/close attempt and confirm force quit
  electronWindow.on("close", async (event) => {
    if (isExamLockdown && !isShuttingDown) {
      event.preventDefault();
      await promptForceQuitWarning();
    }
  });

  const isDevMode = !app.isPackaged && (process.argv.includes("--dev") || process.env.NODE_ENV === "development");
  const indexPath = path.join(import.meta.dirname, "../dist/index.html");
  if (isDevMode) {
    electronWindow.loadURL("http://localhost:5173");
  } else if (app.isPackaged || fs.existsSync(indexPath)) {
    electronWindow.loadFile(indexPath);
  } else {
    electronWindow.loadURL("http://localhost:5173");
  }

  // Send backend port to renderer
  electronWindow.webContents.once("did-finish-load", () => {
    if (!electronWindow?.isDestroyed()) {
      electronWindow.webContents.send("backend-port", port);
    }
  });
}

// ─── Prohibited Application Enforcement ──────────────────────────────────────
const PROHIBITED_APPS = [
  "Google Chrome",
  "Brave Browser",
  "Safari",
  "Arc",
  "Microsoft Edge",
  "Firefox",
  "Opera",
  "WhatsApp",
  "Telegram",
  "Discord",
  "Slack",
  "ChatGPT",
  "Claude",
  "Zoom",
  "Microsoft Teams",
  "Skype",
  "Code",
  "Cursor",
  "Sublime Text",
  "Notes",
  "TextEdit",
  "Terminal",
  "iTerm2",
  "TeamViewer",
  "AnyDesk",
];

async function getRunningProhibitedApps() {
  if (process.platform === "darwin") {
    try {
      const script = `tell application "System Events" to get name of every process where background only is false`;
      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const running = stdout.split(",").map((s) => s.trim());
      return running.filter((name) =>
        PROHIBITED_APPS.some((p) => p.toLowerCase() === name.toLowerCase())
      );
    } catch {
      return [];
    }
  }
  return [];
}

async function closeProhibitedApps() {
  if (process.platform === "darwin") {
    try {
      const script = `
tell application "System Events"
  set runningApps to name of every process where background only is false
end tell
repeat with appName in runningApps
  set aName to appName as text
  if aName is not "Finder" and aName is not "Electron" and aName is not "VEYRA" and aName is not "loginwindow" then
    try
      tell application aName to quit
    end try
  end if
end repeat
`;
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// ─── Screen Capture (Full Physical Desktop Screen) ───────────────────────────
async function captureAndSaveScreen() {
  if (!electronWindow || electronWindow.isDestroyed()) return null;
  const fileName = `${Date.now()}-screen.jpg`;
  const dir = getScreenSnapDir();
  const filePath = path.join(dir, fileName);

  try {
    // 1. On macOS, use native screencapture -x to capture the entire physical retina display
    // This captures the entire desktop screen (all split views, side-by-side apps, secondary windows)
    if (process.platform === "darwin") {
      await execAsync(`/usr/sbin/screencapture -x -t jpg "${filePath}"`);
      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
        if (!electronWindow.isDestroyed()) {
          electronWindow.webContents.send("screen-snap-saved", { fileName, timestamp: Date.now() });
        }
        return filePath;
      }
    }

    // 2. Fallback to capturePage
    const image = await electronWindow.webContents.capturePage();
    const buffer = image.toJPEG(80);
    fs.writeFileSync(filePath, buffer);
    if (!electronWindow.isDestroyed()) {
      electronWindow.webContents.send("screen-snap-saved", { fileName, timestamp: Date.now() });
    }
    return filePath;
  } catch (err) {
    console.error("[VEYRA] Screen capture error:", err.message);
    try {
      const fallback = await electronWindow.webContents.capturePage();
      fs.writeFileSync(filePath, fallback.toJPEG(80));
      return filePath;
    } catch {
      return null;
    }
  }
}

// ─── IPC Handlers & State ────────────────────────────────────────────────────
let isExamLockdown = false;
let splitScreenInterval = null;
let appMonitorInterval = null;

// ─── Display & Split Screen Integrity Enforcement ─────────────────────────────
function checkAndEnforceDisplayIntegrity() {
  if (!isExamLockdown || !electronWindow || electronWindow.isDestroyed()) return;

  const display = screen.getPrimaryDisplay();
  const bounds = electronWindow.getBounds();
  const isKiosk = electronWindow.isKiosk();
  const isFullScreen = electronWindow.isFullScreen();

  // Detect if window is resized, tiled, or put into split screen
  const isTiledOrSplit =
    bounds.width < display.bounds.width * 0.96 ||
    bounds.height < display.bounds.height * 0.92 ||
    (!isKiosk && !isFullScreen);

  if (isTiledOrSplit) {
    console.warn(
      `[VEYRA PROCTOR] Split screen/tiling violation! Bounds: ${bounds.width}x${bounds.height}, Display: ${display.bounds.width}x${display.bounds.height}`
    );

    // Instantly notify renderer to log a violation flag and show warning modal
    electronWindow.webContents.send("proctor-violation", {
      type: "SPLIT_SCREEN_DETECTED",
      message: "Split screen, tiling, or window resizing detected. The examination window must occupy the entire display.",
      details: {
        windowBounds: `${bounds.width}x${bounds.height}`,
        displayBounds: `${display.bounds.width}x${display.bounds.height}`,
      },
    });

    // Re-enforce full screen and kiosk immediately
    try {
      electronWindow.setBounds(display.bounds);
      electronWindow.setFullScreen(true);
      electronWindow.setKiosk(true);
      electronWindow.setAlwaysOnTop(true, "screen-saver");
      electronWindow.focus();
    } catch (err) {
      console.warn("[VEYRA] Re-enforcing kiosk bounds:", err.message);
    }
  }
}

// ─── Proctoring Lockdown & Anti-Cheat Handlers ────────────────────────────────
function enableWindowProtection() {
  if (!electronWindow || electronWindow.isDestroyed()) return;

  isExamLockdown = true;

  // 1. Force Kiosk mode & Fullscreen over entire primary display
  const display = screen.getPrimaryDisplay();
  try {
    electronWindow.setBounds(display.bounds);
    electronWindow.setFullScreen(true);
    electronWindow.setKiosk(true);
    electronWindow.setAlwaysOnTop(true, "screen-saver");
    electronWindow.setFullScreenable(false);
  } catch (err) {
    console.warn("[VEYRA] Kiosk mode error:", err.message);
  }

  // 2. Disable Right-click context menu
  electronWindow.webContents.on("context-menu", preventContextMenu);

  // 3. Intercept & Block Cheat Shortcuts
  electronWindow.webContents.on("before-input-event", handleLockdownKeyInput);

  // 4. Split Screen & Window Resize listeners
  electronWindow.on("resize", checkAndEnforceDisplayIntegrity);
  electronWindow.on("move", checkAndEnforceDisplayIntegrity);
  electronWindow.on("leave-full-screen", checkAndEnforceDisplayIntegrity);
  electronWindow.on("leave-kiosk", checkAndEnforceDisplayIntegrity);

  // 5. Active background display integrity monitor (every 2s)
  if (splitScreenInterval) clearInterval(splitScreenInterval);
  splitScreenInterval = setInterval(checkAndEnforceDisplayIntegrity, 2000);

  // 6. Active background application monitor (checks for newly opened cheating apps every 3.5s)
  if (appMonitorInterval) clearInterval(appMonitorInterval);
  appMonitorInterval = setInterval(async () => {
    if (!isExamLockdown || !electronWindow || electronWindow.isDestroyed()) return;
    const running = await getRunningProhibitedApps();
    if (running.length > 0) {
      electronWindow.webContents.send("proctor-violation", {
        type: "PROHIBITED_APP_ACTIVE",
        message: `Prohibited background application active: ${running.join(", ")}. External applications are forbidden during examination.`,
        details: { detectedApps: running },
      });
      try {
        electronWindow.setAlwaysOnTop(true, "screen-saver");
        electronWindow.focus();
      } catch {
        // ignore
      }
    }
  }, 3500);
}

function disableWindowProtection() {
  if (!electronWindow || electronWindow.isDestroyed()) return;

  isExamLockdown = false;

  if (splitScreenInterval) {
    clearInterval(splitScreenInterval);
    splitScreenInterval = null;
  }

  if (appMonitorInterval) {
    clearInterval(appMonitorInterval);
    appMonitorInterval = null;
  }

  electronWindow.removeListener("resize", checkAndEnforceDisplayIntegrity);
  electronWindow.removeListener("move", checkAndEnforceDisplayIntegrity);
  electronWindow.removeListener("leave-full-screen", checkAndEnforceDisplayIntegrity);
  electronWindow.removeListener("leave-kiosk", checkAndEnforceDisplayIntegrity);

  try {
    electronWindow.setKiosk(false);
    electronWindow.setAlwaysOnTop(false);
    electronWindow.setFullScreenable(true);
  } catch (err) {
    console.warn("[VEYRA] Exit kiosk error:", err.message);
  }

  electronWindow.webContents.removeListener("context-menu", preventContextMenu);
  electronWindow.webContents.removeListener("before-input-event", handleLockdownKeyInput);
}

function preventContextMenu(e) {
  if (isExamLockdown) e.preventDefault();
}

let isPromptingQuit = false;

async function promptForceQuitWarning() {
  if (isPromptingQuit) return;
  isPromptingQuit = true;

  // 1. Issue 1 flag warning immediately to renderer
  if (electronWindow && !electronWindow.isDestroyed()) {
    electronWindow.webContents.send("proctor-violation", {
      type: "FORCE_QUIT_WARNING",
      message: "⚠️ 1 Proctoring Violation Flag recorded: Force Quit / Exit attempted.",
    });
  }

  // 2. Show confirmation dialog with 1 flag warning
  const result = await dialog.showMessageBox(electronWindow, {
    type: "warning",
    title: "⚠️ Proctoring Warning: Quit Attempt",
    message: "1 Proctoring Flag has been logged against your examination.",
    detail:
      "You attempted to close or force-quit during an active exam.\n\n" +
      "If you choose 'Force Quit Anyway', your exam session will be terminated and marked as interrupted.\n\n" +
      "Would you like to resume your exam, or force quit anyway?",
    buttons: ["Resume Exam", "Force Quit Anyway"],
    defaultId: 0,
    cancelId: 0,
  });

  isPromptingQuit = false;

  if (result.response === 1) {
    // User explicitly confirmed Force Quit
    isShuttingDown = true;
    disableWindowProtection();
    stopBackend();
    app.exit(0);
  }
}

function handleLockdownKeyInput(event, input) {
  if (!isExamLockdown) return;

  const isCmdOrCtrl = input.control || input.meta;
  const key = input.key?.toLowerCase();

  // Block Copy, Cut, Paste (prevent pasting into AI agents or copying questions)
  if (isCmdOrCtrl && (key === "c" || key === "v" || key === "x")) {
    event.preventDefault();
    electronWindow?.webContents.send("proctor-violation", {
      type: "CLIPBOARD_ATTEMPT",
      message: "Clipboard access (Copy/Cut/Paste) is disabled during the exam.",
    });
    return;
  }

  // Block App Switch / Task Switch (Cmd+Tab, Alt+Tab)
  if ((input.alt || input.meta) && input.key === "Tab") {
    event.preventDefault();
    electronWindow?.webContents.send("proctor-violation", {
      type: "APP_SWITCH_ATTEMPT",
      message: "Application switching is blocked by proctoring policies.",
    });
    return;
  }

  // Handle Quit / Close shortcuts (Cmd+Q, Cmd+W) -> prompt with 1 flag warning
  if (isCmdOrCtrl && (key === "q" || key === "w")) {
    event.preventDefault();
    promptForceQuitWarning();
    return;
  }

  // Block Hide / Minimize (Cmd+H, Cmd+M)
  if (isCmdOrCtrl && (key === "h" || key === "m")) {
    event.preventDefault();
    electronWindow?.webContents.send("proctor-violation", {
      type: "WINDOW_MINIMIZE_ATTEMPT",
      message: "Minimizing or hiding the exam window is prohibited during active proctoring.",
    });
    return;
  }

  // Block DevTools / Reload / Fullscreen toggle (F11, F12, Cmd+R, Cmd+Opt+I)
  if (
    input.key === "F11" ||
    input.key === "F12" ||
    (isCmdOrCtrl && key === "r") ||
    (isCmdOrCtrl && input.alt && key === "i")
  ) {
    event.preventDefault();
  }
}

ipcMain.handle("enter-exam-lockdown", () => {
  enableWindowProtection();
  return { locked: true };
});

ipcMain.handle("exit-exam-lockdown", () => {
  disableWindowProtection();
  return { locked: false };
});

// Prohibited apps management
ipcMain.handle("get-running-prohibited-apps", async () => {
  return await getRunningProhibitedApps();
});

ipcMain.handle("close-prohibited-apps", async () => {
  return await closeProhibitedApps();
});

// Open snapshot folders in Finder/Explorer
ipcMain.handle("open-snaps-folder", async (_event, type = "all") => {
  const camDir = getCameraSnapDir();
  const scrDir = getScreenSnapDir();

  try {
    if (type === "camera") {
      await shell.openPath(camDir);
    } else if (type === "screen") {
      await shell.openPath(scrDir);
    } else {
      await shell.openPath(camDir);
      await shell.openPath(scrDir);
    }
    return { success: true, camDir, scrDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("start-proctoring", (_event, opts = {}) => {
  startTimestamp = Date.now();
  const camInterval = opts.webcamInterval || 5000;
  const scrInterval = opts.screenInterval || 10000;

  enableWindowProtection();

  if (timerInterval) clearInterval(timerInterval);
  if (cameraInterval) clearInterval(cameraInterval);
  if (screenInterval) clearInterval(screenInterval);

  timerInterval = setInterval(() => {
    if (electronWindow && !electronWindow.isDestroyed()) {
      electronWindow.webContents.send("timer", (Date.now() - startTimestamp) / 1000);
    }
  }, 1000);

  cameraInterval = setInterval(() => {
    if (electronWindow && !electronWindow.isDestroyed()) {
      electronWindow.webContents.send("camera-shot");
    }
  }, camInterval);

  screenInterval = setInterval(() => {
    captureAndSaveScreen();
  }, scrInterval);

  // Immediate first snap
  setTimeout(() => captureAndSaveScreen(), 800);
  return { started: true, camInterval, scrInterval };
});

ipcMain.handle("stop-proctoring", () => {
  disableWindowProtection();

  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (cameraInterval) { clearInterval(cameraInterval); cameraInterval = null; }
  if (screenInterval) { clearInterval(screenInterval); screenInterval = null; }
  startTimestamp = null;
  return { stopped: true };
});

// Store camera snapshot from renderer
ipcMain.handle("store-camera-snap-image-on-disk", (_event, data) => {
  try {
    if (!data || data.byteLength > 2 * 1024 * 1024) {
      return { success: false, error: "Invalid or oversized image data" };
    }
    const dir = getCameraSnapDir();
    const filePath = path.join(dir, `${Date.now()}-cam.jpg`);
    fs.writeFileSync(filePath, Buffer.from(data));
    return { success: true, filePath };
  } catch (err) {
    console.error("[VEYRA] Camera snap store failed:", err.message);
    return { success: false, error: err.message };
  }
});

// Store screen snapshot from renderer
ipcMain.handle("store-screen-snap-image-on-disk", (_event, data) => {
  try {
    if (!data || data.byteLength > 5 * 1024 * 1024) {
      return { success: false, error: "Invalid or oversized image data" };
    }
    const dir = getScreenSnapDir();
    const filePath = path.join(dir, `${Date.now()}-screen.jpg`);
    fs.writeFileSync(filePath, Buffer.from(data));
    return { success: true, filePath };
  } catch (err) {
    console.error("[VEYRA] Screen snap store failed:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("capture-screen-snap", async () => {
  const savedPath = await captureAndSaveScreen();
  return { success: Boolean(savedPath), path: savedPath };
});

// Get snap counts
ipcMain.handle("get-snap-dirs", () => {
  return {
    cameraDir: getCameraSnapDir(),
    screenDir: getScreenSnapDir(),
  };
});

// Get snap file counts
ipcMain.handle("get-snap-counts", () => {
  try {
    const camDir = getCameraSnapDir();
    const scrDir = getScreenSnapDir();
    const cam = fs.readdirSync(camDir).filter((f) => f.endsWith(".jpg")).length;
    const scr = fs.readdirSync(scrDir).filter((f) => f.endsWith(".jpg")).length;
    return { camera: cam, screen: scr };
  } catch {
    return { camera: 0, screen: 0 };
  }
});

// Theme
ipcMain.handle("set-theme", (_event, theme) => {
  nativeTheme.themeSource = theme === "light" ? "light" : "dark";
  return { theme: nativeTheme.shouldUseDarkColors ? "dark" : "light" };
});

ipcMain.handle("get-theme", () => {
  return { theme: nativeTheme.shouldUseDarkColors ? "dark" : "light" };
});

// Backend Port
ipcMain.handle("get-backend-port", () => activeBackendPort);

// Secure API Proxy to local backend (bypasses all browser CORS & file:// protocol restrictions)
ipcMain.handle("api-request", async (_event, { endpoint, options = {} }) => {
  const url = `http://127.0.0.1:${activeBackendPort}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body
        ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body))
        : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data?.message || `Request failed with status ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    console.error(`[VEYRA API IPC] Error at ${endpoint}:`, err.message);
    throw err;
  }
});

// App info
ipcMain.handle("get-app-info", () => ({
  name: "VEYRA",
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
  isPackaged: app.isPackaged,
  userData: app.getPath("userData"),
}));

// Rules dialog
ipcMain.on("show-rules", () => {
  if (!electronWindow || electronWindow.isDestroyed()) return;
  dialog.showMessageBox(electronWindow, {
    type: "info",
    title: "VEYRA – Examination Rules",
    message: "Exam Rules & Proctoring Policies",
    detail:
      "1. Stay on the exam screen at all times.\n" +
      "2. Webcam must remain enabled and visible throughout.\n" +
      "3. Automated snapshots of your webcam and exam window are recorded.\n" +
      "4. Do not use external assistance or open unauthorized applications.\n" +
      "5. Click Submit Exam when finished or when time expires.\n" +
      "6. All proctoring data is stored locally on this machine.",
  });
});

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const port = await startBackend();
  getCameraSnapDir();
  getScreenSnapDir();
  createWindow(port);
});

app.on("window-all-closed", () => {
  isShuttingDown = true;
  if (timerInterval) clearInterval(timerInterval);
  if (cameraInterval) clearInterval(cameraInterval);
  if (screenInterval) clearInterval(screenInterval);
  stopBackend();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  isShuttingDown = true;
  stopBackend();
});
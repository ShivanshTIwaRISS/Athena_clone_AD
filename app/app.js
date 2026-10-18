/**
 * VEYRA Examination Platform - Electron Main Process
 * Smart Assessments. Seamless Execution.
 */
import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme } from "electron";
import { Buffer } from "node:buffer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { createServer } from "net";

let electronWindow = null;
let backendProcess = null;
let activeBackendPort = 3000;
let startTimestamp = null;
let timerInterval = null;
let cameraInterval = null;
let screenInterval = null;
let isShuttingDown = false;

// ─── Path Helpers ─────────────────────────────────────────────────────────────
function getCameraSnapDir() {
  const baseDir = path.join(app.getPath("userData"), "veyra-camera-snaps");
  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

function getScreenSnapDir() {
  const baseDir = path.join(app.getPath("userData"), "veyra-screen-snaps");
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
    backgroundColor: "#0d1117",
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

// ─── Screen Capture ───────────────────────────────────────────────────────────
async function captureAndSaveScreen() {
  if (!electronWindow || electronWindow.isDestroyed()) return null;
  try {
    const image = await electronWindow.webContents.capturePage();
    const buffer = image.toJPEG(80);
    const fileName = `${Date.now()}-screen.jpg`;
    const dir = getScreenSnapDir();
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, buffer);
    if (!electronWindow.isDestroyed()) {
      electronWindow.webContents.send("screen-snap-saved", { fileName, timestamp: Date.now() });
    }
    return filePath;
  } catch (err) {
    console.error("[VEYRA] Screen capture failed:", err.message);
    return null;
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle("start-proctoring", (_event, opts = {}) => {
  startTimestamp = Date.now();
  const camInterval = opts.webcamInterval || 5000;
  const scrInterval = opts.screenInterval || 10000;

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

// Legacy alias
ipcMain.handle("start-timer", () => {
  startTimestamp = Date.now();
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
  }, 5000);
  screenInterval = setInterval(() => { captureAndSaveScreen(); }, 10000);
  setTimeout(() => captureAndSaveScreen(), 1000);
  return true;
});

ipcMain.handle("stop-proctoring", () => {
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
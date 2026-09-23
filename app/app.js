import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { Buffer } from "node:buffer";
import path from "path";
import fs from "fs";

let electronWindow = null;
let startTimestamp = null;
let timerInterval = null;
let cameraInterval = null;
let screenInterval = null;

const cameraSnapDir = path.join(import.meta.dirname, "user-camera-snap");
const screenSnapDir = path.join(import.meta.dirname, "user-screen-snap");

// Ensure snapshot storage directories exist
fs.mkdirSync(cameraSnapDir, { recursive: true });
fs.mkdirSync(screenSnapDir, { recursive: true });

function createWindow() {
    electronWindow = new BrowserWindow({
        height: 1000,
        width: 1200,
        webPreferences: {
            devTools: true,
            preload: path.join(import.meta.dirname, 'preload.js')
        }
    });

    electronWindow.loadURL('http://localhost:5173');
}

/**
 * Capture full electron window/screen snapshot
 */
async function captureAndSaveScreen() {
    if (!electronWindow || electronWindow.isDestroyed()) return null;
    try {
        const image = await electronWindow.webContents.capturePage();
        const buffer = image.toJPEG(85);
        const fileName = `${Date.now()}-screen.jpg`;
        const filePath = path.join(screenSnapDir, fileName);
        fs.writeFileSync(filePath, buffer);
        if (!electronWindow.isDestroyed()) {
            electronWindow.webContents.send('screen-snap-saved', {
                fileName,
                timestamp: Date.now()
            });
        }
        return filePath;
    } catch (err) {
        console.error("Failed to capture screen snapshot:", err);
        return null;
    }
}

ipcMain.handle('start-timer', () => {
    startTimestamp = Date.now();

    if (timerInterval) clearInterval(timerInterval);
    if (cameraInterval) clearInterval(cameraInterval);
    if (screenInterval) clearInterval(screenInterval);

    // Send Timer Tick every 1s
    timerInterval = setInterval(() => {
        if (electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.webContents.send('timer', (Date.now() - startTimestamp) / 1000);
        }
    }, 1000);

    // Request user's camera snap every 5s
    cameraInterval = setInterval(() => {
        if (electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.webContents.send('camera-shot');
        }
    }, 5000);

    // Capture screen snapshot every 10s during proctoring
    screenInterval = setInterval(() => {
        captureAndSaveScreen();
    }, 10000);

    // Also take an immediate screen snapshot on exam start
    setTimeout(() => {
        captureAndSaveScreen();
    }, 1000);

    return true;
});

ipcMain.handle('stop-proctoring', () => {
    if (timerInterval) clearInterval(timerInterval);
    if (cameraInterval) clearInterval(cameraInterval);
    if (screenInterval) clearInterval(screenInterval);
    return true;
});

// Store camera snapshot sent by renderer
ipcMain.handle('store-camera-snap-image-on-disk', (_event, data) => {
    try {
        fs.mkdirSync(cameraSnapDir, { recursive: true });
        const filePath = path.join(cameraSnapDir, `${Date.now()}-cam.jpg`);
        fs.writeFileSync(filePath, Buffer.from(data));
        return { success: true, filePath };
    } catch (err) {
        console.error("Failed to store camera snapshot on disk:", err);
        return { success: false, error: err.message };
    }
});

// Store screen snapshot sent by renderer
ipcMain.handle('store-screen-snap-image-on-disk', (_event, data) => {
    try {
        fs.mkdirSync(screenSnapDir, { recursive: true });
        const filePath = path.join(screenSnapDir, `${Date.now()}-screen.jpg`);
        fs.writeFileSync(filePath, Buffer.from(data));
        return { success: true, filePath };
    } catch (err) {
        console.error("Failed to store screen snapshot on disk:", err);
        return { success: false, error: err.message };
    }
});

// Explicit screen snapshot capture trigger
ipcMain.handle('capture-screen-snap', async () => {
    const savedPath = await captureAndSaveScreen();
    return { success: Boolean(savedPath), path: savedPath };
});

ipcMain.on("show-rules", () => {
    if (!electronWindow || electronWindow.isDestroyed()) return;
    dialog.showMessageBox(electronWindow, {
        type: "info",
        title: "Athena Exam Rules",
        message: "Exam Rules & Proctoring Policies",
        detail:
            "1. Stay on the exam screen at all times.\n" +
            "2. Camera and screen proctoring must remain enabled.\n" +
            "3. Automated snapshots of camera and exam window are recorded.\n" +
            "4. Do not use external assistance or open unauthorized tabs.\n" +
            "5. Click Submit Exam when finished."
    });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
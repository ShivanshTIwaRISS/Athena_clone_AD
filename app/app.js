import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";

let window = null;
let timerInterval = null;
const TEST_DURATION_SECONDS = 10;

function createWindow() {
    window = new BrowserWindow({
        height: 1000,
        width: 1000,
        webPreferences: {
            devTools: true,
            preload: path.join(import.meta.dirname, 'preload.js')
        }
    })

    window.loadURL('http://localhost:5173')
}

ipcMain.handle('start-timer', () => {
    if (timerInterval) {
        return;
    }

    const endTimestamp = Date.now() + TEST_DURATION_SECONDS * 1000;
    window.webContents.send('timer', TEST_DURATION_SECONDS);

    timerInterval = setInterval(() => {
        const remainingSeconds = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
        window.webContents.send('timer', remainingSeconds);

        if (remainingSeconds === 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            app.quit();
        }
    }, 1000);
})

ipcMain.handle('quit-app', () => {
    app.quit();
});

app.whenReady().then(createWindow);
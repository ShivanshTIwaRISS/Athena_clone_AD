/* global require */
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("athena", {
    registerListenerForTimerTickFromMain: (callback) => {
        const fn = (event, ...message) => {
            callback(message[0]);
        }

        ipcRenderer.on('timer', fn);

        return () => {
            ipcRenderer.removeListener('timer', fn);
        }
    },
    startTimerOnMain: () => ipcRenderer.invoke('start-timer'),
    quitApp: () => ipcRenderer.invoke('quit-app')
})